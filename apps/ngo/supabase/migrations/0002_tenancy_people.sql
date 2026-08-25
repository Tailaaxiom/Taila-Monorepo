-- 0002_tenancy_people.sql
-- The tenancy and identity spine. Every other table hangs off these.
--
-- Deliberate differences from the legacy schema:
--   * employees.auth_user_id  — a real FK to auth.users. The legacy app had no
--     such link and matched identity by code at sign-in. RLS has nothing to key
--     on without this, so it is the single most important column here.
--   * organizations.modules is a real jsonb array, not a stringified one.
--   * organizations.kind and sm_config are dropped (kind was dead code read
--     only by an uncalled function; sm_config belongs to the social sector).
--   * employee_code is unique per org and enforced, not by convention.

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id                   text primary key,
  name                 text not null,

  -- Free text, resolved to a sector key by getSectorKey(). Kept as text rather
  -- than an enum because the resolver matches on substrings of what the org
  -- calls itself, and that list changes without a migration.
  sector               text not null default 'Development and Advocacy',

  acct_type            text not null default 'org'
                         check (acct_type in ('org', 'project')),
  country              text not null default 'Nigeria',
  active               boolean not null default true,

  -- Explicit module override. NULL means fall through to SECTOR_MODULES for
  -- the resolved sector key, which is the normal case.
  modules              jsonb
                         check (modules is null or jsonb_typeof(modules) = 'array'),

  -- Headline currency. Foreign amounts are held alongside, never converted.
  base_currency        text not null default 'NGN',

  -- Org-level configuration carried over from legacy. All optional.
  hubs                 jsonb,
  field_labels         jsonb,
  custom_activity_types jsonb,
  custom_statuses      jsonb,
  custom_templates     jsonb,
  dash_tiles           jsonb,
  org_panels           jsonb,
  reporting_schedule   text,
  metric_field         text,
  metric_label         text,
  staff_limit          integer,
  group_id             text,
  client_name          text,

  starts_on            date,
  ends_on              date,
  subscription_start   date,
  subscription_end     date,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger organizations_touch
  before update on public.organizations
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------

create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  org_id        text not null references public.organizations(id) on delete cascade,

  -- The human identifier. Referenced by code, not id, everywhere in the app:
  -- task assignees, activity actors, payroll rows. Not a secret — it is
  -- visible on every task — which is exactly why it must never be a credential.
  employee_code text not null,

  full_name     text not null,

  role          text not null
                  check (role in ('leadership','hod','staff','finance','hr','admin','donor')),

  department    text,
  job_title     text,
  job_role      text,
  hub           text,
  email         text,
  phone         text,

  active        boolean not null default true,

  -- Nav additions on top of the primary role. extra_roles merges whole role
  -- menus; extra_pages grants individual page ids. Both filtered through the
  -- module gate afterwards, so neither can unlock a page the org lacks.
  extra_roles   text[] not null default '{}',
  extra_pages   text[] not null default '{}',

  extra_fields  jsonb,
  can_schedule  boolean not null default false,
  hourly_rate   numeric(12,2),

  -- --- identity ---------------------------------------------------------
  -- The link the legacy system never had.
  auth_user_id  uuid unique references auth.users(id) on delete set null,

  -- Which sign-in surface this person uses.
  --   'code'  — org id + employee code + password (field staff, shared devices)
  --   'email' — real email + password (desk roles, donors)
  -- Explicit rather than inferred from role, so a field-based HOD or an
  -- office-based staffer is a data change, not a code change.
  login_mode    text not null default 'code'
                  check (login_mode in ('code','email')),

  password_set_at timestamptz,
  last_login      timestamptz,

  terms_accepted_at      timestamptz,
  terms_accepted_version text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint employees_code_unique_per_org unique (org_id, employee_code),

  -- An email-mode account is unusable without an email address.
  constraint employees_email_required_for_email_login
    check (login_mode <> 'email' or email is not null)
);

create index employees_org_idx        on public.employees (org_id);
create index employees_org_role_idx   on public.employees (org_id, role);
create index employees_org_dept_idx   on public.employees (org_id, department);
create unique index employees_auth_user_idx
  on public.employees (auth_user_id) where auth_user_id is not null;

create trigger employees_touch
  before update on public.employees
  for each row execute function app.touch_updated_at();

create trigger employees_freeze_org
  before update on public.employees
  for each row execute function app.freeze_org_id();

comment on column public.employees.employee_code is
  'Public identifier, not a secret. Never derive credentials from this.';

-- ---------------------------------------------------------------------------
-- org_branding
-- ---------------------------------------------------------------------------

create table public.org_branding (
  org_id        text primary key references public.organizations(id) on delete cascade,
  logo_url      text,
  primary_color text,
  letterhead_url text,
  signature_url text,
  invoice_template_url text,
  receipt_template_url text,
  updated_at    timestamptz not null default now()
);

create trigger org_branding_touch
  before update on public.org_branding
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- employee_setup_tokens
-- ---------------------------------------------------------------------------
-- First-login credential handover. An administrator issues a token; the person
-- redeems it once, choosing their own password, and an auth user is created and
-- linked at that moment.
--
-- Only the SHA-256 hash is stored. The plaintext is shown to the issuing
-- administrator once and is not recoverable afterwards. Losing it means issuing
-- a new token, which is also the password-reset path for code-mode accounts
-- (they have no reachable email address to reset through).
--
-- This table has RLS enabled and ZERO policies in 0003, deliberately: it is
-- reachable only by the service role, from server code. See LEARNINGS.md —
-- zero-policy RLS is normally an accident, here it is the point.

create table public.employee_setup_tokens (
  id           uuid primary key default gen_random_uuid(),
  org_id       text not null references public.organizations(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,

  token_hash   text not null,
  expires_at   timestamptz not null,

  attempts     integer not null default 0,
  consumed_at  timestamptz,

  issued_by    uuid references public.employees(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index employee_setup_tokens_employee_idx
  on public.employee_setup_tokens (employee_id) where consumed_at is null;

-- One live token per person: issuing a new one must invalidate the old.
create unique index employee_setup_tokens_one_live
  on public.employee_setup_tokens (employee_id) where consumed_at is null;

-- 0004_funders_and_donor_read.sql
--
-- First NGO-specific domain, plus the minimum set of tables the donor portal
-- reads (handover PDF section 4). This is the strictest RLS case in the app:
-- an external, non-employee party who must see almost nothing.
--
-- Every SELECT policy on an operational table below excludes the donor
-- explicitly via app.is_staff_of(org_id), which is false for a donor by
-- definition. A table added later without its own donor clause therefore
-- fails closed for donors, not open — same principle as app.is_staff_of()'s
-- own comment in 0003.

-- ---------------------------------------------------------------------------
-- funders
-- ---------------------------------------------------------------------------
-- Leadership and finance only, per the handover: the Funders page is reached
-- by those two roles and nowhere else. A donor sees the *results* of funding
-- (fund_lines, activities) but never the list of who else funds the org.

create table public.funders (
  id                text primary key default ('fnd_' || replace(gen_random_uuid()::text, '-', '')),
  org_id            text not null references public.organizations(id) on delete cascade,
  funder_name       text not null,
  amount            numeric(14,2) not null,
  contribution_date date,
  project_ref       text,
  source_type       text,
  currency          text not null default 'NGN',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index funders_org_idx on public.funders (org_id);

create trigger funders_touch
  before update on public.funders
  for each row execute function app.touch_updated_at();

create trigger funders_freeze_org
  before update on public.funders
  for each row execute function app.freeze_org_id();

alter table public.funders enable row level security;
alter table public.funders force row level security;

create policy funders_read_by_finance
  on public.funders for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'));

create policy funders_write_by_finance
  on public.funders for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'));

-- ---------------------------------------------------------------------------
-- fund_lines
-- ---------------------------------------------------------------------------
-- The budget-line ledger. Donor gets read access here — this is
-- p-donor-funds, Fund Utilization. The handover describes it as "allocated
-- against disbursed" for the org as a whole, not filtered to a donor's own
-- contributions, so the donor policy is intentionally org-wide rather than
-- matched against donor_codes. Revisit if a donor should only see the lines
-- their own funding touches.

create table public.fund_lines (
  id                text primary key default ('fln_' || replace(gen_random_uuid()::text, '-', '')),
  org_id            text not null references public.organizations(id) on delete cascade,
  budget_line       text not null,
  allocated         numeric(14,2) not null default 0,
  disbursed         numeric(14,2) not null default 0,
  donor_codes       text[] not null default '{}',
  currency          text not null default 'NGN',
  period            text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint fund_lines_disbursed_not_negative check (disbursed >= 0),
  constraint fund_lines_disbursed_within_allocated check (disbursed <= allocated)
);

create index fund_lines_org_idx on public.fund_lines (org_id);

create trigger fund_lines_touch
  before update on public.fund_lines
  for each row execute function app.touch_updated_at();

create trigger fund_lines_freeze_org
  before update on public.fund_lines
  for each row execute function app.freeze_org_id();

alter table public.fund_lines enable row level security;
alter table public.fund_lines force row level security;

create policy fund_lines_read_by_finance
  on public.fund_lines for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'));

create policy fund_lines_read_by_donor
  on public.fund_lines for select
  to authenticated
  using (org_id = app.org_id() and app.is_donor());

create policy fund_lines_write_by_finance
  on public.fund_lines for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership','finance','admin'));

-- ---------------------------------------------------------------------------
-- activities
-- ---------------------------------------------------------------------------
-- Minimal shape: enough for Impact and Reach (internal) and the donor's
-- Impact Report. Expand when that page is actually built rather than
-- speculatively now.

create table public.activities (
  id                bigint generated always as identity primary key,
  org_id            text not null references public.organizations(id) on delete cascade,
  title             text not null,
  activity_type     text,
  activity_date     date,
  location          text,
  beneficiaries     integer,
  impact_score      numeric,
  programme_id      bigint,
  created_by_code   text,
  created_at        timestamptz not null default now()
);

create index activities_org_idx on public.activities (org_id);
create index activities_org_impact_idx on public.activities (org_id, impact_score desc);

create trigger activities_freeze_org
  before update on public.activities
  for each row execute function app.freeze_org_id();

alter table public.activities enable row level security;
alter table public.activities force row level security;

-- Donor and staff both read activities — same rows, no filtering — because
-- the handover has no separate "shared" concept for activities the way it
-- does for media below. If that turns out to over-expose internal notes,
-- split a donor-safe view rather than loosening this policy.
create policy activities_read_org
  on public.activities for select
  to authenticated
  using (org_id = app.org_id());

create policy activities_write_by_staff
  on public.activities for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

-- ---------------------------------------------------------------------------
-- programmes
-- ---------------------------------------------------------------------------

create table public.programmes (
  id                bigint generated always as identity primary key,
  org_id            text not null references public.organizations(id) on delete cascade,
  name              text not null,
  status            text,
  created_at        timestamptz not null default now()
);

alter table public.activities
  add constraint activities_programme_fk
  foreign key (programme_id) references public.programmes(id) on delete set null;

create index programmes_org_idx on public.programmes (org_id);

create trigger programmes_freeze_org
  before update on public.programmes
  for each row execute function app.freeze_org_id();

alter table public.programmes enable row level security;
alter table public.programmes force row level security;

create policy programmes_read_org
  on public.programmes for select
  to authenticated
  using (org_id = app.org_id());  -- donor included: needed for Impact Report

create policy programmes_write_by_staff
  on public.programmes for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

-- ---------------------------------------------------------------------------
-- media
-- ---------------------------------------------------------------------------
-- Departure from the legacy schema: adds donor_visible. Legacy `media` has no
-- sharing flag at all, so it's unclear whether the legacy donor Media Library
-- was ever really scoped. This is deliberately stricter than legacy by
-- default — opt-in, not opt-out.

create table public.media (
  id                bigint generated always as identity primary key,
  org_id            text not null references public.organizations(id) on delete cascade,
  activity_id       bigint references public.activities(id) on delete set null,
  caption           text,
  file_path         text not null,
  file_type         text,
  department        text,
  donor_visible     boolean not null default false,
  uploaded_by_code  text,
  uploaded_by_name  text,
  created_at        timestamptz not null default now()
);

create index media_org_idx on public.media (org_id);
create index media_org_donor_visible_idx on public.media (org_id) where donor_visible;

create trigger media_freeze_org
  before update on public.media
  for each row execute function app.freeze_org_id();

alter table public.media enable row level security;
alter table public.media force row level security;

create policy media_read_by_staff
  on public.media for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy media_read_by_donor
  on public.media for select
  to authenticated
  using (org_id = app.org_id() and app.is_donor() and donor_visible);

create policy media_write_by_staff
  on public.media for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

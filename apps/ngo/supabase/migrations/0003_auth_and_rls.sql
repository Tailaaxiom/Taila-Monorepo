-- 0003_auth_and_rls.sql
-- The auth context helpers every policy is built on, and RLS for the tables
-- created in 0002.
--
-- Why SECURITY DEFINER: these functions read public.employees, and the RLS
-- policy ON employees calls them. A normal function would recurse infinitely.
-- SECURITY DEFINER runs as the function owner and bypasses RLS, breaking the
-- cycle. This is the standard Supabase pattern, and it is why the search_path
-- is pinned on every one of them — an unpinned search_path on a SECURITY
-- DEFINER function is a privilege escalation vector.
--
-- Why STABLE: the planner may then evaluate each once per statement instead of
-- once per row. Without it, a select over 5,000 tasks runs 5,000 lookups.

-- ---------------------------------------------------------------------------
-- Auth context accessors
-- ---------------------------------------------------------------------------

create or replace function app.org_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.org_id from public.employees e
  where e.auth_user_id = auth.uid() and e.active
  limit 1
$$;

create or replace function app.employee_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.id from public.employees e
  where e.auth_user_id = auth.uid() and e.active
  limit 1
$$;

create or replace function app.employee_code()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.employee_code from public.employees e
  where e.auth_user_id = auth.uid() and e.active
  limit 1
$$;

create or replace function app.role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.role from public.employees e
  where e.auth_user_id = auth.uid() and e.active
  limit 1
$$;

create or replace function app.department()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.department from public.employees e
  where e.auth_user_id = auth.uid() and e.active
  limit 1
$$;

-- Mirrors the legacy axIsReviewer() (index.html line 16936). Governs milestone
-- verification, monitor editing, and task stage changes. Keep the two in step.
create or replace function app.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app.role() in ('leadership','hod','admin'), false)
$$;

-- A donor is an external party holding an employees row. Every operational
-- policy denies them explicitly rather than relying on them simply not being
-- granted anything — a table added later without a donor clause should fail
-- closed, not open.
create or replace function app.is_donor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(app.role() = 'donor', false)
$$;

-- True when the caller is a fully established member of the given org and is
-- not a donor. The default guard for operational tables.
create or replace function app.is_staff_of(target_org text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_org is not null
     and target_org = app.org_id()
     and not app.is_donor()
$$;

grant execute on function
  app.org_id(), app.employee_id(), app.employee_code(), app.role(),
  app.department(), app.is_reviewer(), app.is_donor(), app.is_staff_of(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

-- Everyone signed in, donors included, can read their own org: the donor
-- portal shows the organization's name.
create policy organizations_read_own
  on public.organizations for select
  to authenticated
  using (id = app.org_id());

create policy organizations_update_by_leadership
  on public.organizations for update
  to authenticated
  using (id = app.org_id() and app.role() in ('leadership','admin'))
  with check (id = app.org_id() and app.role() in ('leadership','admin'));

-- No insert or delete policy: organizations are created by the service role
-- during provisioning, never by a signed-in client.

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------

alter table public.employees enable row level security;
alter table public.employees force row level security;

-- Donors get no directory access at all. Staff see colleagues because the app
-- needs names for assignees, feeds and messages.
create policy employees_read_org
  on public.employees for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy employees_manage_by_hr
  on public.employees for insert
  to authenticated
  with check (
    app.is_staff_of(org_id)
    and app.role() in ('leadership','hr','admin')
  );

create policy employees_update_by_hr
  on public.employees for update
  to authenticated
  using (
    app.is_staff_of(org_id)
    and app.role() in ('leadership','hr','admin')
  )
  with check (
    app.is_staff_of(org_id)
    and app.role() in ('leadership','hr','admin')
  );

-- Deactivate rather than delete: employee_code is referenced by historical
-- tasks, activities and payroll rows that must not lose their actor.
-- No delete policy is granted to anyone.

-- ---------------------------------------------------------------------------
-- org_branding
-- ---------------------------------------------------------------------------

alter table public.org_branding enable row level security;
alter table public.org_branding force row level security;

-- Donors included: branding is what makes the donor portal look like the
-- organization rather than like Taila.
create policy org_branding_read_own
  on public.org_branding for select
  to authenticated
  using (org_id = app.org_id());

create policy org_branding_write_by_leadership
  on public.org_branding for all
  to authenticated
  using (org_id = app.org_id() and app.role() in ('leadership','admin'))
  with check (org_id = app.org_id() and app.role() in ('leadership','admin'));

-- ---------------------------------------------------------------------------
-- employee_setup_tokens
-- ---------------------------------------------------------------------------
-- RLS on, zero policies, on purpose. No authenticated client may read, write,
-- or probe this table under any role. It is reachable only by the service role
-- from server-side code, which bypasses RLS.
--
-- If a token were readable by a colleague, it would be a working credential for
-- someone else's account — the exact failure of the legacy scheme.

alter table public.employee_setup_tokens enable row level security;
alter table public.employee_setup_tokens force row level security;

comment on table public.employee_setup_tokens is
  'Service role only. RLS enabled with zero policies deliberately; see 0002.';

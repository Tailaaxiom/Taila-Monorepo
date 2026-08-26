-- 0011_activity_events.sql
--
-- The one genuinely new piece of infrastructure in the HOD workspace batch
-- (Dept Feed, Access Log). Deliberately shaped generically, not narrowly for
-- either of those two pages: per the handover, this same table is meant to
-- become the backbone for Timeline (p-lead-timeline, leadership) and the
-- staff Team Feed (p-staff-feed) later — both still unbuilt, out of scope
-- for this pass, but a reason to keep this table role/page-agnostic now
-- rather than needing a second, incompatible activity table when those are
-- built.
--
-- department is nullable — an org-wide event (e.g. something leadership
-- does) has no department; a department-scoped event does. Pages filter on
-- it at query time, the same v1 pattern already used for tasks.dept and
-- media.department, not a new idea.
--
-- summary is a precomputed, human-readable line ("Ngozi Eze submitted a
-- report for Q3 2026") rather than something reconstructed at render time
-- from event_type/entity_type — matches the denormalization already used
-- for messages.sender_name and media.uploaded_by_name, for the same reason:
-- cheap to read, and doesn't require a join back to employees (which a
-- donor couldn't do anyway, though donors are not expected to read this
-- table at all — see the RLS policy below).
--
-- user_code/user_name/role, not actor_code/actor_name: found mid-build, not
-- assumed from the start. packages/core/src/kpi/sessions.ts — pure logic
-- ported wholesale in the original monorepo restructure (see
-- docs/EXECUTION.md, 2026-08-18), unused and invisible to apps/ngo's own
-- tsc ever since because nothing imported it — already imports an
-- `ActivityEvent` type from this exact module path and builds work
-- sessions out of 'login'/'logout' events keyed by user_code/user_name/role.
-- That only surfaced by running packages/core's OWN standalone tsconfig
-- (apps/ngo's tsc never reaches a file nothing imports). Renamed to match
-- that pre-existing, real consumer instead of colliding with it under
-- different field names — one table now genuinely serves three consumers:
-- this batch's Access Log/Dept Feed, the later Timeline/staff Team Feed
-- the handover names, and KPI session-building.
create table public.activity_events (
  id            text primary key default ('evt_' || replace(gen_random_uuid()::text, '-', '')),
  org_id        text not null references public.organizations(id) on delete cascade,
  department    text,
  user_code     text,
  user_name     text,
  role          text,
  event_type    text not null,
  entity_type   text,
  entity_id     text,
  summary       text not null,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index activity_events_org_idx on public.activity_events (org_id);
create index activity_events_org_dept_idx on public.activity_events (org_id, department);
create index activity_events_org_created_idx on public.activity_events (org_id, created_at desc);

alter table public.activity_events enable row level security;
alter table public.activity_events force row level security;

-- v1 scope, same trade-off already made and documented for
-- tasks/projects/appointments/summary_reports: any non-donor org member can
-- read and write any event in the org, not filtered to "my department" at
-- the RLS layer yet — pages filter to employee.department in the query
-- itself, the same pattern already used by staff/dashboard's tasks query.
-- No update or delete policy: like messages, an event is immutable once
-- logged — there is no "edit the audit log" feature.
create policy activity_events_read_by_staff
  on public.activity_events for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy activity_events_insert_by_staff
  on public.activity_events for insert
  to authenticated
  with check (app.is_staff_of(org_id));

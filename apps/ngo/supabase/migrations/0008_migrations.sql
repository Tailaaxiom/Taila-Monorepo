-- 0008_appointments.sql
--
-- Scheduling (handover section 2/7). Reachable by finance, HOD, HR,
-- leadership, and staff — checked directly against the real gating output
-- (getNavItems()), not assumed from the handover's prose, which says
-- "shared by every role including donors" but the actual NAVMAP entry for
-- donor has no p-appointments at all. Code is ground truth here.
--
-- attendees is free-text employee_codes, not a foreign key — same pattern
-- as tasks.assignee (0005), matching the handover's own looseness about
-- who an appointment is "for."

create table public.appointments (
  id            text primary key default ('apt_' || replace(gen_random_uuid()::text, '-', '')),
  org_id        text not null references public.organizations(id) on delete cascade,
  title         text not null,
  description   text,
  location      text,
  start_time    timestamptz not null,
  end_time      timestamptz,
  attendees     text[] not null default '{}',
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index appointments_org_idx on public.appointments (org_id);
create index appointments_org_start_idx on public.appointments (org_id, start_time);

create trigger appointments_touch
  before update on public.appointments
  for each row execute function app.touch_updated_at();

create trigger appointments_freeze_org
  before update on public.appointments
  for each row execute function app.freeze_org_id();

alter table public.appointments enable row level security;
alter table public.appointments force row level security;

-- v1 scope, same trade-off already made and documented for tasks/projects
-- (0005): any non-donor org member can read and write any appointment in
-- the org. A real "who is this actually for" model (only attendees and the
-- creator can see it) needs per-row filtering against the attendees array —
-- not implemented here, tracked in docs/EXECUTION.md alongside the same
-- gap on tasks, not silently narrower or silently left unstated.
create policy appointments_read_by_staff
  on public.appointments for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy appointments_write_by_staff
  on public.appointments for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));
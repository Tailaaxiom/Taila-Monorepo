-- 0010_summary_reports.sql
--
-- Compose Report (p-compose) is described in the handover as "the shared
-- entry point" for the reporting chain: staff and HODs submit period
-- reports, those roll up into what leadership reads. This table is that
-- chain's backbone. This migration builds Compose Report itself — the
-- write side. Submit Report and Summary Reports (the read/roll-up views)
-- are separate, still-unbuilt pages that will read this same table later.

create table public.summary_reports (
  id            text primary key default ('rpt_' || replace(gen_random_uuid()::text, '-', '')),
  org_id        text not null references public.organizations(id) on delete cascade,
  author_code   text,
  author_name   text,
  department    text,
  period        text not null,
  content       text not null,
  status        text not null default 'submitted' check (status in ('draft', 'submitted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index summary_reports_org_idx on public.summary_reports (org_id);
create index summary_reports_org_created_idx on public.summary_reports (org_id, created_at desc);

create trigger summary_reports_touch
  before update on public.summary_reports
  for each row execute function app.touch_updated_at();

create trigger summary_reports_freeze_org
  before update on public.summary_reports
  for each row execute function app.freeze_org_id();

alter table public.summary_reports enable row level security;
alter table public.summary_reports force row level security;

-- v1 scope, same trade-off already made and documented for
-- tasks/projects/appointments: any non-donor org member can read and write
-- any report in the org, not filtered to "my department's roll-up" yet.
-- The handover's real model (staff submit up to HOD, HOD's roll up to
-- leadership) needs a real reporting hierarchy to filter against — not
-- implemented here, tracked in docs/EXECUTION.md alongside the same gap
-- already logged for tasks and projects, not silently narrower or wider
-- than it looks.
create policy summary_reports_read_by_staff
  on public.summary_reports for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy summary_reports_write_by_staff
  on public.summary_reports for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));
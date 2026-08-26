-- 0014_performance_reviews.sql
--
-- Backs HR Overview (p-hr-dashboard, read-only) and Performance Reviews
-- (p-hr-reviews, read+write) — the two genuinely new pages in the HR
-- workspace batch. packages/core/src/types/performance-review.ts already
-- existed as a dead ported type file (like approval.ts and
-- activity-event.ts before it) carrying no column shape of its own, so
-- this table is designed fresh from the handover's own description
-- ("review records per employee"), not ported from a legacy shape.
--
-- employee_code/employee_name and reviewer_code/reviewer_name are
-- denormalized free-text pairs, same convention as summary_reports'
-- author_code/author_name and media's uploaded_by_code/uploaded_by_name —
-- not foreign keys, matching how every person-reference in this schema
-- works (tasks.assignee, appointments.attendees, messages.sender_code).

create table public.performance_reviews (
  id                text primary key default ('rev_' || replace(gen_random_uuid()::text, '-', '')),
  org_id            text not null references public.organizations(id) on delete cascade,
  employee_code     text not null,
  employee_name     text,
  reviewer_code     text,
  reviewer_name     text,
  period            text not null,
  rating            numeric(3,1),
  strengths         text,
  areas_for_growth  text,
  notes             text,
  status            text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index performance_reviews_org_idx on public.performance_reviews (org_id);
create index performance_reviews_org_employee_idx on public.performance_reviews (org_id, employee_code);

create trigger performance_reviews_touch
  before update on public.performance_reviews
  for each row execute function app.touch_updated_at();

create trigger performance_reviews_freeze_org
  before update on public.performance_reviews
  for each row execute function app.freeze_org_id();

alter table public.performance_reviews enable row level security;
alter table public.performance_reviews force row level security;

-- Deliberate deviation from the org-wide v1 RLS shape used for every other
-- table this project (tasks, appointments, summary_reports,
-- activity_events, approvals — any non-donor staff member reads/writes any
-- row). Performance reviews are personal and sensitive, and the handover
-- scopes this page to HR specifically, not shared with HOD or staff the
-- way tasks/projects/media are. Restricted to the same role set that
-- already governs writes to employees itself
-- (employees_update_by_hr, 0003, confirmed leadership/hr/admin) — same
-- shape already used for income/expenses/funders (0004/0005), just a
-- different three roles.
--
-- Whether an employee should eventually read their own review is a real
-- open question the handover doesn't answer. Not built here — see
-- docs/EXECUTION.md.
create policy performance_reviews_read_by_hr
  on public.performance_reviews for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'hr', 'admin'));

create policy performance_reviews_write_by_hr
  on public.performance_reviews for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'hr', 'admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership', 'hr', 'admin'));

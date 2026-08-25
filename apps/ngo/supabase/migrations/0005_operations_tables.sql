-- 0005_operations_tables.sql
--
-- The shared operational core (handover section 7): tasks, projects with
-- sequential milestones, and the money-in/money-out ledger. Sized to what
-- the six carried-over pages actually read (checked against the real page
-- code, not the full legacy manufacturing schema those pages' TypeScript
-- types were generated from) — not every legacy column, just the ones with
-- a real reader. Add columns when a page actually needs them.

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
-- assignee is deliberately a free-text field that can hold either an
-- employee_code or a department name — see handover section 2: "assignee
-- (an employee_code or a department)". Not a foreign key on purpose.
--
-- deliverables_json / deliverables_done / proof_required are stored as
-- plain text (JSON array string / JSON array string / comma-separated
-- string respectively) because that's exactly the shape
-- packages/core/src/types/task.ts's parseTask() already expects — ported
-- to match the existing, reviewed parser rather than inventing a new one.

create table public.tasks (
  id                 text primary key default ('tsk_' || replace(gen_random_uuid()::text, '-', '')),
  org_id             text not null references public.organizations(id) on delete cascade,
  title              text not null,
  label              text,
  descr              text,
  assignee           text,
  dept               text,
  status             text not null default 'in_progress'
                       check (status in ('in_progress', 'done', 'blocked')),
  priority           text default 'normal',
  due                timestamptz,
  deliverables_json  text,
  deliverables_done  text,
  proof_required     text,
  geofence_label     text,
  geofence_lat       numeric,
  geofence_lng       numeric,
  geofence_m         integer,
  blocked            boolean not null default false,
  blocked_at         timestamptz,
  blocked_reason     text,
  project_id         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index tasks_org_idx on public.tasks (org_id);
create index tasks_org_assignee_idx on public.tasks (org_id, assignee);
create index tasks_org_dept_idx on public.tasks (org_id, dept);

create trigger tasks_touch
  before update on public.tasks
  for each row execute function app.touch_updated_at();

create trigger tasks_freeze_org
  before update on public.tasks
  for each row execute function app.freeze_org_id();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

-- v1 scope: any non-donor org member can read and write any task in the
-- org. The handover's real rule ("leadership sees and assigns across the
-- org; HOD within their department; staff only their own") needs per-row
-- assignee/department filtering — a real refinement, not implemented here.
-- Tracked in docs/EXECUTION.md rather than silently narrowed or silently
-- left unstated.
create policy tasks_read_by_staff
  on public.tasks for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy tasks_write_by_staff
  on public.tasks for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id                 bigint generated always as identity primary key,
  org_id             text not null references public.organizations(id) on delete cascade,
  name               text not null,
  description        text,
  kind               text not null default 'project' check (kind in ('project', 'campaign')),
  status             text default 'active',
  budget             numeric(14,2),
  location           text,
  target_count       integer,
  unit               text,
  ref_code           text,
  completed_at       timestamptz,
  created_at         timestamptz not null default now()
);

create index projects_org_idx on public.projects (org_id);

create trigger projects_freeze_org
  before update on public.projects
  for each row execute function app.freeze_org_id();

alter table public.projects enable row level security;
alter table public.projects force row level security;

create policy projects_read_by_staff
  on public.projects for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy projects_write_by_staff
  on public.projects for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

-- ---------------------------------------------------------------------------
-- project_milestones
-- ---------------------------------------------------------------------------
-- project_id is TEXT here, deliberately, even though projects.id above is a
-- bigint. This mirrors an existing, already-documented decision in
-- packages/core/src/types/project-milestone.ts ("kept as a string ... until
-- this is normalized in the Phase 4 schema cleanup") — continuity with a
-- call already made in the type layer, not a new inconsistency introduced
-- here. Always compare with String(project.id) in application code.

create table public.project_milestones (
  id                 text primary key default ('ms_' || replace(gen_random_uuid()::text, '-', '')),
  org_id             text not null references public.organizations(id) on delete cascade,
  project_id         text not null,
  title              text not null,
  seq                integer not null,
  status             text not null default 'active'
                       check (status in ('active', 'submitted', 'verified')),
  due_date           date,
  target_value       numeric,
  target_unit        text,
  actual_value       numeric,
  submitted_at       timestamptz,
  verified_at        timestamptz,
  verified_by        text,
  proof_note         text,
  created_at         timestamptz not null default now()
);

create index project_milestones_org_idx on public.project_milestones (org_id);
create index project_milestones_project_idx on public.project_milestones (org_id, project_id);

create trigger project_milestones_freeze_org
  before update on public.project_milestones
  for each row execute function app.freeze_org_id();

alter table public.project_milestones enable row level security;
alter table public.project_milestones force row level security;

create policy project_milestones_read_by_staff
  on public.project_milestones for select
  to authenticated
  using (app.is_staff_of(org_id));

-- Verification specifically should really be reviewer-gated
-- (app.is_reviewer(), already defined in 0003, mirrors legacy
-- axIsReviewer()) rather than open to any staff member — not enforced at
-- the RLS layer yet because that needs a column-level or trigger-based
-- check (a plain role-based UPDATE policy can't distinguish "changing
-- status to verified" from "editing the due date"). Tracked as a real gap,
-- not silently decided either way.
create policy project_milestones_write_by_staff
  on public.project_milestones for all
  to authenticated
  using (app.is_staff_of(org_id))
  with check (app.is_staff_of(org_id));

-- ---------------------------------------------------------------------------
-- income
-- ---------------------------------------------------------------------------

create table public.income (
  id                 text primary key default ('inc_' || replace(gen_random_uuid()::text, '-', '')),
  org_id             text not null references public.organizations(id) on delete cascade,
  amount             numeric(14,2) not null,
  currency           text not null default 'NGN',
  source             text,
  payer_name         text,
  payer_type         text,
  payer_contact      text,
  period             text,
  invoice_id         text,
  invoice_no         text,
  receipt_no         text,
  project_ref        text,
  note               text,
  created_at         timestamptz not null default now()
);

create index income_org_idx on public.income (org_id);

create trigger income_freeze_org
  before update on public.income
  for each row execute function app.freeze_org_id();

alter table public.income enable row level security;
alter table public.income force row level security;

-- Money tables: leadership/finance/admin only, matching Funders and
-- Fund Management (0004) — not general staff, not donor.
create policy income_read_by_finance
  on public.income for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));

create policy income_write_by_finance
  on public.income for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------

create table public.expenses (
  id                 text primary key default ('exp_' || replace(gen_random_uuid()::text, '-', '')),
  org_id             text not null references public.organizations(id) on delete cascade,
  amount             numeric(14,2) not null,
  category           text,
  description        text,
  method             text,
  budget_id          text,
  created_by         text,
  recurring          boolean not null default false,
  source             text,
  note               text,
  spent_on           date,
  created_at         timestamptz not null default now()
);

create index expenses_org_idx on public.expenses (org_id);

create trigger expenses_freeze_org
  before update on public.expenses
  for each row execute function app.freeze_org_id();

alter table public.expenses enable row level security;
alter table public.expenses force row level security;

create policy expenses_read_by_finance
  on public.expenses for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));

create policy expenses_write_by_finance
  on public.expenses for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));
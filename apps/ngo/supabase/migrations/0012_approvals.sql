-- 0012_approvals.sql
--
-- Minimal approvals infrastructure, built to support Requests (p-hod-requests)
-- and nothing beyond it in this pass. Deliberate scope decision, stated
-- plainly rather than built halfway without saying so: this migration adds
-- the table and lets a person submit a request and see its own status.
-- It does NOT build a review/approve UI — that's the leadership Approvals
-- page (p-lead-approvals / p-lead-approvals "Disbursement Queue" for
-- finance), which doesn't exist yet either and is out of scope here, same
-- as Compose Report shipped the write side of summary_reports and left
-- Team Summaries/Submit Report for later. There is no update policy below
-- for exactly this reason: nobody can move a request out of 'pending' yet,
-- tracked as an open gap in docs/EXECUTION.md, not silently decided.
--
-- Shape follows the ported (but previously unbacked) legacy type at
-- packages/core/src/types/approval.ts and the schema trap already recorded
-- in docs/LEARNINGS.md: req_items is a JSON-encoded array in a plain text
-- column, not jsonb, matching approvals.req_items exactly as documented —
-- continuity with a call already made in the type layer, not a new
-- inconsistency.

create table public.approvals (
  id             text primary key default ('apr_' || replace(gen_random_uuid()::text, '-', '')),
  org_id         text not null references public.organizations(id) on delete cascade,
  requester_code text not null,
  requester_name text,
  department     text,
  request_type   text not null,
  req_items      text,
  note           text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  reviewed_by    text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index approvals_org_idx on public.approvals (org_id);
create index approvals_org_requester_idx on public.approvals (org_id, requester_code);

create trigger approvals_touch
  before update on public.approvals
  for each row execute function app.touch_updated_at();

create trigger approvals_freeze_org
  before update on public.approvals
  for each row execute function app.freeze_org_id();

alter table public.approvals enable row level security;
alter table public.approvals force row level security;

-- Read: org-wide for any non-donor staff, same v1 trade-off already made
-- for tasks/projects/appointments/summary_reports — not filtered to "my
-- own requests" only, so that a future Approvals reviewer page can read
-- directly against this table without a new policy. Insert: requester
-- identity is asserted by the database, not trusted from the client, same
-- pattern as messages.sender_code — nobody can file a request as someone
-- else.
create policy approvals_read_by_staff
  on public.approvals for select
  to authenticated
  using (app.is_staff_of(org_id));

create policy approvals_insert_by_requester
  on public.approvals for insert
  to authenticated
  with check (app.is_staff_of(org_id) and requester_code = app.employee_code());

-- No update or delete policy: there is no review flow in this pass, so
-- nothing can move a request out of 'pending' yet — a real, stated gap,
-- not an oversight. See docs/EXECUTION.md.

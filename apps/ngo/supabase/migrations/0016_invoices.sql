-- 0016_invoices.sql
--
-- Genuinely new table, unlike most of this batch. packages/core/src/types/
-- invoice.ts already existed as a dead ported type file expecting an
-- `invoices` table — same situation approval.ts and performance-review.ts
-- were in before their tables existed (see docs/EXECUTION.md, 0012 and
-- 0014). Matched its expected shape rather than redesigning: `items` is a
-- JSON-encoded array in a plain text column, not jsonb, matching the same
-- schema trap already recorded for approvals.req_items/tasks.deliverables_json
-- (see docs/LEARNINGS.md) — continuity with a call already made in the
-- type layer, not a new inconsistency.
--
-- income.invoice_id/income.invoice_no (0005) have existed since the very
-- first operations-tables migration, unused by any page until now — this
-- table and the /leadership/invoices page are what finally exercise them.
--
-- Real discovery mid-build, not assumed going in: packages/core/src/
-- finance/invoice-matching.ts (ported in the original monorepo restructure,
-- 2026-08-18, sitting unused ever since — same category kpi/sessions.ts
-- turned out to be in the HOD session, 2026-08-26) already calls
-- `invoice.amount` in isInvoiceSettled(). Column named `amount` here,
-- not `total`, to match that pre-existing dormant consumer rather than
-- leaving it permanently broken — same resolution already used once for
-- activity_events' actor_code/actor_name -> user_code/user_name. See
-- docs/LEARNINGS.md.
--
-- Scope, decided and stated rather than built halfway silently:
--   - VAT at 7.5% (the handover's own figure) is computed from the line
--     items and stored on the row at creation time (subtotal, vat_amount,
--     amount) — deterministic math, no reason to defer or recompute live.
--   - Marking an invoice paid is real, built now: the client sets
--     status='paid' + paid_at, and inserts a matching `income` row
--     (invoice_id/invoice_no linked, amount = total) — this is the actual
--     "marking an invoice paid records income" behavior the handover
--     describes, not a stub.
--   - Deferred, not built: editing an invoice's line items after creation
--     (add-only, same pattern already used for fund lines, appointments,
--     etc. — see docs/EXECUTION.md's open-gaps list), PDF export or
--     emailing an invoice to a client, multi-currency.

create table public.invoices (
  id           text primary key default ('inv_' || replace(gen_random_uuid()::text, '-', '')),
  org_id       text not null references public.organizations(id) on delete cascade,
  invoice_no   text not null,
  client_name  text,
  issue_date   date,
  due_date     date,
  items        text,
  subtotal     numeric(14,2) not null default 0,
  vat_amount   numeric(14,2) not null default 0,
  amount       numeric(14,2) not null default 0, -- grand total incl. VAT; named to match invoice-matching.ts's pre-existing isInvoiceSettled(invoice.amount)
  status       text not null default 'draft'
                 check (status in ('draft', 'sent', 'paid')),
  paid_at      timestamptz,
  note         text,
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index invoices_org_idx on public.invoices (org_id);

create trigger invoices_touch
  before update on public.invoices
  for each row execute function app.touch_updated_at();

create trigger invoices_freeze_org
  before update on public.invoices
  for each row execute function app.freeze_org_id();

alter table public.invoices enable row level security;
alter table public.invoices force row level security;

-- Money tables: leadership/finance/admin only, same set as income,
-- expenses, and funders (0004/0005) — not general staff, not donor.
create policy invoices_read_by_finance
  on public.invoices for select
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));

create policy invoices_write_by_finance
  on public.invoices for all
  to authenticated
  using (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'))
  with check (app.is_staff_of(org_id) and app.role() in ('leadership', 'finance', 'admin'));

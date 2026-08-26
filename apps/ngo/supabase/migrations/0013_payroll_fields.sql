-- 0013_payroll_fields.sql
--
-- Payroll (p-hod-payroll / p-lead-payroll) needs a salary structure to
-- compute PAYE against — employees only carries hourly_rate today, which
-- is the wrong shape for the Nigeria Tax Act computation documented in
-- docs/LEARNINGS.md ("Payroll is fully built, not deferred" — a real,
-- already-audited port, not something to re-derive).
--
-- Deliberately added as columns on employees rather than a new payroll
-- table: this is current salary structure, per-employee state, the same
-- kind of thing hourly_rate already is — not a transactional ledger. There
-- is no payroll RUN history in this v1 (no "payslip for March 2026" row
-- that persists once computed) — PAYE is computed on read from whatever
-- the columns hold at the time, the same trade-off already made for
-- fund_lines.disbursed being manually tracked rather than derived from a
-- real expense-booking table. A real payroll-run table (with a period,
-- computed once, and immutable afterward) is a genuine future need if this
-- ever has to answer "what did we pay in June," not built here — tracked
-- as an open gap in docs/EXECUTION.md, not silently decided.

alter table public.employees
  add column basic_salary       numeric(12,2),
  add column housing_allowance  numeric(12,2),
  add column transport_allowance numeric(12,2),
  add column other_allowances   numeric(12,2),
  add column annual_rent        numeric(12,2),
  add column nhf_opt_in         boolean not null default false;

comment on column public.employees.basic_salary is
  'Annual basic salary (NGN). Null means no salary structure recorded yet.';
comment on column public.employees.annual_rent is
  'Annual rent paid, used for the 20%-capped-at-500,000 rent relief band in computePAYE().';

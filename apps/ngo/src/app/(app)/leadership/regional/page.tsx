// apps/ngo/src/app/(app)/leadership/regional/page.tsx
//
// Regional — breaks down by employees.hub (a real column, 0002) rather
// than department. Checked what else has a hub column before deciding
// scope: nothing does. tasks has dept/assignee, income/expenses have no
// employee or hub reference at all (income.payer_name/payer_type are
// external payers, not staff; expenses.created_by is a free-text name,
// not an employee_code). So:
//   - Employee headcount by hub: direct, real.
//   - Tasks by hub: joined through tasks.assignee -> employees.employee_code
//     -> hub, a best-effort join since assignee is free text, not a
//     foreign key (same caveat as every other assignee-based grouping in
//     this project) — stated on the page, not hidden.
//   - Money (income/expenses) by hub: NOT built. There is no way to
//     attribute a row in either table to a hub today — a real gap, not
//     quietly faked by grouping everything into "Unspecified."
//
// Whether this page shows anything meaningful depends on real employee
// data (has anyone actually been given a hub?) that isn't inspectable
// from this sandbox — no live Supabase credentials here. If hub is
// universally null, the page correctly shows one "Unspecified" bucket
// with everyone in it, which is a real, honest state, not a bug.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipRegionalClient } from './LeadershipRegionalClient';

export default async function LeadershipRegionalPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Regional is available to leadership and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const [employeesRes, tasksRes] = await Promise.all([
    supabase.from('employees').select('employee_code, full_name, hub, active'),
    supabase.from('tasks').select('id, title, assignee, status'),
  ]);

  if (employeesRes.error || tasksRes.error) {
    return <PlainMessage title="Could not load regional data">{employeesRes.error?.message ?? tasksRes.error?.message}</PlainMessage>;
  }

  const hubByCode = new Map<string, string | null>();
  for (const e of employeesRes.data ?? []) hubByCode.set(e.employee_code, e.hub);

  return (
    <LeadershipRegionalClient
      employees={employeesRes.data ?? []}
      tasks={(tasksRes.data ?? []).map((t) => ({
        ...t,
        hub: t.assignee ? (hubByCode.get(t.assignee) ?? null) : null,
      }))}
    />
  );
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

// apps/ngo/src/app/(app)/leadership/budget/page.tsx
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipBudgetClient } from './LeadershipBudgetClient';

export default async function LeadershipBudgetPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  // income/expenses RLS is leadership/finance/admin only (0005) — this
  // check exists so a role that's genuinely blocked sees a clear message
  // instead of a page that's silently empty, same reasoning as Funders and
  // Fund Management.
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Budget & Spend is available to leadership, finance, and admin accounts.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [incomeRes, expensesRes] = await Promise.all([
    supabase.from('income').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('spent_on', { ascending: false }),
  ]);

  if (incomeRes.error || expensesRes.error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load budget data</h1>
        <p>{incomeRes.error?.message ?? expensesRes.error?.message}</p>
      </div>
    );
  }

  return (
    <LeadershipBudgetClient
      orgId={employee.org_id}
      employeeName={employee.full_name}
      initialIncome={incomeRes.data ?? []}
      initialExpenses={expensesRes.data ?? []}
    />
  );
}
// apps/ngo/src/app/(app)/leadership/spend/page.tsx
//
// Read-only comparison view over income and expenses (0005), both already
// read on leadership/budget. Matches the handover's own description of
// this page as read-only — no write form here, adding either still
// happens on Budget & Spend. No charting library exists in this project
// and docs/INTERFACE.md is still on hold, so the comparison is numeric
// (share-of-total breakdowns), not a chart.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseIncome } from '@taila/core/types/income';
import { parseExpense } from '@taila/core/types/expense';
import { LeadershipSpendClient } from './LeadershipSpendClient';

export default async function LeadershipSpendPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Spend vs Income is available to leadership, finance, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const [incomeRes, expensesRes] = await Promise.all([
    supabase.from('income').select('*').order('created_at', { ascending: false }),
    supabase.from('expenses').select('*').order('spent_on', { ascending: false }),
  ]);

  if (incomeRes.error || expensesRes.error) {
    return <PlainMessage title="Could not load spend data">{incomeRes.error?.message ?? expensesRes.error?.message}</PlainMessage>;
  }

  return (
    <LeadershipSpendClient
      income={(incomeRes.data ?? []).map(parseIncome)}
      expenses={(expensesRes.data ?? []).map(parseExpense)}
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

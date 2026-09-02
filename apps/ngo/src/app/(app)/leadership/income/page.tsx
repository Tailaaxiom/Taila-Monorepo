// apps/ngo/src/app/(app)/leadership/income/page.tsx
//
// Checked leadership/budget first: it already reads and summarizes
// `income` (0005) with an add-income form. This page is deliberately NOT a
// second write form over the same table — that would be two divergent
// paths writing the same rows, exactly the kind of drift this project
// avoids elsewhere (see docs/EXECUTION.md on database.types.ts drift for
// the general shape of why that's a real risk, not just tidiness).
// Instead this is the fuller read: every column Budget & Spend's summary
// list doesn't show (payer_type, payer_contact, invoice_no/invoice_id —
// the link into the new /leadership/invoices page, receipt_no,
// project_ref), plus a totals-by-payer-type breakdown. Adding income still
// happens on Budget & Spend or by marking an invoice paid — both write
// through the same table, this page only reads it.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseIncome } from '@taila/core/types/income';
import { LeadershipIncomeClient } from './LeadershipIncomeClient';

export default async function LeadershipIncomePage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Income is available to leadership, finance, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('income')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load income">{error.message}</PlainMessage>;
  }

  return <LeadershipIncomeClient items={(data ?? []).map(parseIncome)} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

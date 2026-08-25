// apps/ngo/src/app/(app)/leadership/funds/page.tsx
//
// Real data, same pattern as Funders and Staff Management. One addition:
// the handover (section 2) says a fund line is "optionally tagged to the
// donors that supply them" — donor_codes on fund_lines — so this page also
// loads the funders list to populate that tagging, rather than leaving it
// as a free-text field disconnected from the Funders page.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { FundLinesClient, type FundLineItem, type FunderOption } from './FundLinesClient';

export default async function FundManagementPage() {
  const currentEmployee = await getCurrentEmployee();

  if (!currentEmployee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(currentEmployee.role)) {
    return (
      <PlainMessage title="Not permitted">
        Fund Management is available to leadership, finance, and admin accounts.
      </PlainMessage>
    );
  }

  const supabase = await createClient();

  const [{ data: fundLines, error: fundLinesError }, { data: funders, error: fundersError }] =
    await Promise.all([
      supabase
        .from('fund_lines')
        .select('id, budget_line, allocated, disbursed, currency, period, donor_codes, notes, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('funders').select('id, funder_name').order('funder_name'),
    ]);

  if (fundLinesError) {
    return <PlainMessage title="Could not load fund lines">{fundLinesError.message}</PlainMessage>;
  }
  if (fundersError) {
    return <PlainMessage title="Could not load funders">{fundersError.message}</PlainMessage>;
  }

  return (
    <FundLinesClient
      orgId={currentEmployee.org_id}
      initialFundLines={(fundLines ?? []) as FundLineItem[]}
      funders={(funders ?? []) as FunderOption[]}
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
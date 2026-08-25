// apps/ngo/src/app/(app)/donor/funds/page.tsx
//
// fund_lines_read_by_donor (0004) has existed since the Funders/Fund
// Management pass but never had a page exercise it — leadership/finance
// have their own richer view at /leadership/funds. This is the donor's:
// allocated against disbursed, org-wide, no funder names (a donor sees the
// results of funding, not the list of who else funds the org — see
// docs/EXECUTION.md on the Funders page for why that split exists).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { DonorFundsClient, type FundLineItem } from './DonorFundsClient';

export default async function DonorFundsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role !== 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Fund Utilization is the donor portal's own view.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fund_lines')
    .select('id, budget_line, allocated, disbursed, currency, period')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load fund utilization</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return <DonorFundsClient fundLines={(data ?? []) as FundLineItem[]} />;
}
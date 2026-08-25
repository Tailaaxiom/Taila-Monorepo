// apps/ngo/src/app/leadership/funders/page.tsx
//
// Real data end to end: the funders table (supabase/migrations/0004) has no
// sample-data equivalent anywhere in the app — this page reads and writes it
// directly. Same pattern as /leadership/staff: real session, not the preview
// switcher. See docs/EXECUTION.md.
//
// RLS restricts funders to leadership/finance/admin (funders_read_by_finance /
// funders_write_by_finance in 0004) — a different role combination than
// Staff Management's leadership/hr/admin, so this is a genuinely separate
// proof that RLS is enforcing per-role access, not just per-org.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { FundersClient, type FunderListItem } from './FundersClient';

export default async function FundersPage() {
  const currentEmployee = await getCurrentEmployee();

  if (!currentEmployee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(currentEmployee.role)) {
    return (
      <PlainMessage title="Not permitted">
        Funders is available to leadership, finance, and admin accounts.
      </PlainMessage>
    );
  }

  const supabase = await createClient();
  const { data: funders, error } = await supabase
    .from('funders')
    .select('id, funder_name, amount, currency, contribution_date, project_ref, source_type, notes, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load funders">{error.message}</PlainMessage>;
  }

  return (
    <FundersClient
      orgId={currentEmployee.org_id}
      initialFunders={(funders ?? []) as FunderListItem[]}
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
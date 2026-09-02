// apps/ngo/src/app/(app)/leadership/invoices/page.tsx
//
// Genuinely new table (0016) — see that migration's own comment for the
// full reasoning: matches packages/core/src/types/invoice.ts's pre-existing
// expected shape (items as JSON-encoded text), and the `amount` column is
// named to match invoice-matching.ts's pre-existing, previously-dormant
// isInvoiceSettled(invoice.amount) rather than colliding with it under a
// different name.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseInvoice } from '@taila/core/types/invoice';
import { LeadershipInvoicesClient } from './LeadershipInvoicesClient';

export default async function LeadershipInvoicesPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Invoices is available to leadership, finance, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load invoices">{error.message}</PlainMessage>;
  }

  return (
    <LeadershipInvoicesClient
      orgId={employee.org_id}
      employeeName={employee.full_name}
      initialInvoices={(data ?? []).map(parseInvoice)}
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

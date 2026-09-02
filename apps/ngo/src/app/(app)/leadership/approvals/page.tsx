// apps/ngo/src/app/(app)/leadership/approvals/page.tsx
//
// Approvals / Disbursement Queue — the real review UI for the approvals
// table (0012), which HOD's and staff's Requests pages have both been
// writing into with no way to move a request out of 'pending'. 0015 added
// the UPDATE policy this page needs; this is what finally uses it.
//
// Single route serves both p-lead-approvals ("Approvals" for leadership)
// and the same id under finance's nav ("Disbursement Queue") — same
// pattern as every other page in this app reachable by more than one role
// through one page id, just one implementation, sidebar label differs by
// NAVMAP entry, not by anything this page does.
//
// Org-wide, not filtered to any one department — matches
// approvals_read_by_staff's own org-wide read (0012's own comment: "not
// filtered to 'my own requests' only, so that a future Approvals reviewer
// page can read directly against this table without a new policy").

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseApproval } from '@taila/core/types/approval';
import { LeadershipApprovalsClient } from './LeadershipApprovalsClient';

export default async function LeadershipApprovalsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Approvals is available to leadership, finance, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load requests">{error.message}</PlainMessage>;
  }

  return (
    <LeadershipApprovalsClient
      reviewerName={employee.full_name}
      initialRequests={(data ?? []).map(parseApproval)}
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

// apps/ngo/src/app/(app)/staff/requests/page.tsx
//
// Requests — staff-scoped sibling of /hod/requests, same approvals table
// (0012), same scope: submit a request and see the status of your own,
// nothing more. No leadership review/approve UI in this pass, same stated
// gap as HOD's version (see that page's own comment).
//
// Role check here (staff/admin) is a page-level UX nicety, not the real
// boundary — approvals_insert_by_requester (0012) already ties the insert
// to app.employee_code() = requester_code regardless of what this check
// does, and approvals_read_by_staff permits any non-donor org member to
// read. Blocking other roles here just keeps each workspace's own version
// of this page for its own nav, matching the HOD/HR convention.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseApproval } from '@taila/core/types/approval';
import { StaffRequestsClient } from './StaffRequestsClient';

export default async function StaffRequestsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Requests is available to staff and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('requester_code', employee.employee_code)
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load your requests">{error.message}</PlainMessage>;
  }

  return (
    <StaffRequestsClient
      orgId={employee.org_id}
      department={employee.department}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
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

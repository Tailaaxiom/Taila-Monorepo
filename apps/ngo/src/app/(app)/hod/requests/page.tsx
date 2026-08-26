// apps/ngo/src/app/(app)/hod/requests/page.tsx
//
// Requests — minimal approvals infrastructure (0012), scoped deliberately:
// submit a request and see the status of your own, nothing more. There is
// no leadership review/approve UI in this pass (p-lead-approvals doesn't
// exist yet either) — see 0012's own comment for why that's a stated
// scope decision, not something built halfway silently.
//
// Unlike the other HOD pages in this batch, this page isn't department-
// filtered — it shows the signed-in HOD's own requests (requester_code =
// employee_code), which is what "my requests" means here, not "my
// department's requests." No department gate, for the same reason.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseApproval } from '@taila/core/types/approval';
import { HodRequestsClient } from './HodRequestsClient';

export default async function HodRequestsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Requests is available to HOD and admin accounts.</PlainMessage>;
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
    <HodRequestsClient
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

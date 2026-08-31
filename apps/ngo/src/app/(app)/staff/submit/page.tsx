// apps/ngo/src/app/(app)/staff/submit/page.tsx
//
// Submit Report — staff-scoped sibling of /hod/submit, same summary_reports
// table (0010), same shape: department is fixed from the signed-in
// session rather than free text, and this page only shows the signed-in
// employee's own department's recent submissions, not every report in the
// org. Distinct page id from the cross-cutting Compose Report (p-compose,
// still reachable by staff too), not a replacement for it — same reasoning
// already stated on HOD's version.
//
// Also inserts into activity_events (0011) on submit, same best-effort
// write HOD's version does, so Team Feed has real content immediately
// rather than sitting empty.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffSubmitClient, type SummaryReportItem } from './StaffSubmitClient';

export default async function StaffSubmitPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Submit Report is available to staff and admin accounts.</PlainMessage>;
  }
  if (!employee.department) {
    return (
      <PlainMessage title="No department assigned">
        Your account has no department set — ask an admin to set one on your employee record
        before this page has anything to show.
      </PlainMessage>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_reports')
    .select('id, author_name, department, period, content, status, created_at')
    .eq('department', employee.department)
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load reports">{error.message}</PlainMessage>;
  }

  return (
    <StaffSubmitClient
      orgId={employee.org_id}
      department={employee.department}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      employeeRole={employee.role}
      initialItems={(data ?? []) as SummaryReportItem[]}
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

// apps/ngo/src/app/(app)/hod/submit/page.tsx
//
// Submit Report — a focused, department-scoped write form onto the same
// summary_reports table (0010) the cross-cutting Compose Report already
// writes. Distinct page id (p-hod-submit vs p-compose) and distinct
// framing: department is fixed to the HOD's own rather than free text, and
// this page only shows the HOD's own department's recent submissions, not
// every report in the org. Compose Report remains the general-purpose
// version reachable by every non-donor role; this one is not a replacement
// for it, it is the HOD-specific shortcut the handover names separately.
//
// Also inserts into activity_events (0011) on submit — one of the two
// write paths in this batch that gives Dept Feed and Access Log real
// content, per the batch's own design note.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodSubmitClient, type SummaryReportItem } from './HodSubmitClient';

export default async function HodSubmitPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Submit Report is available to HOD and admin accounts.</PlainMessage>;
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
    <HodSubmitClient
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

// apps/ngo/src/app/(app)/leadership/summaries/page.tsx
//
// Summary Reports (leadership) — the third and last of three distinct
// scopes on summary_reports (0010). Staff's version (/staff/summary)
// filters to author_code = employee.employee_code (their own reports).
// HOD's version (/hod/summaries) filters to department = employee.department
// (their team's). This one has NO filter at all — every report in the
// org, the actual roll-up leadership is supposed to see. Stated as
// explicitly as the staff-vs-HOD distinction was stated last session,
// since it's the same shape of mistake to make by habit (copying a
// filter from the nearest-looking page rather than checking what this
// page's own scope is actually supposed to be).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipSummariesClient, type SummaryReportItem } from './LeadershipSummariesClient';

export default async function LeadershipSummariesPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Summary Reports is available to leadership and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_reports')
    .select('id, author_name, department, period, content, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load reports">{error.message}</PlainMessage>;
  }

  return <LeadershipSummariesClient items={(data ?? []) as SummaryReportItem[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

// apps/ngo/src/app/(app)/staff/summary/page.tsx
//
// Summary Reports — the one page in this batch that is NOT a
// department-filtered sibling of its HOD equivalent. HOD's Team Summaries
// (/hod/summaries) shows every report from the HOD's department — a
// roll-up view for someone who leads that department. This page is a
// single staff member reading their own submission history: filtered to
// author_code = employee.employee_code, not department. Easy to get wrong
// by copying HOD's department filter out of habit — the task brief called
// this out explicitly, and it's worth the same explicitness here: this is
// "my reports," not "my department's reports."
//
// Read-only, same as HOD's version — writing happens on Submit Report
// (/staff/submit) or the cross-cutting Compose Report (/compose).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffSummaryClient, type SummaryReportItem } from './StaffSummaryClient';

export default async function StaffSummaryPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Summary Reports is available to staff and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('summary_reports')
    .select('id, author_name, department, period, content, status, created_at')
    .eq('author_code', employee.employee_code)
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load your reports">{error.message}</PlainMessage>;
  }

  return <StaffSummaryClient items={(data ?? []) as SummaryReportItem[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

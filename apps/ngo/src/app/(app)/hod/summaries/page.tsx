// apps/ngo/src/app/(app)/hod/summaries/page.tsx
//
// Team Summaries — the read/roll-up half of the reporting chain Compose
// Report (0010) started (see that page's own comment: "Submit Report and
// Summary Reports ... are separate, still-unbuilt pages that will read this
// same table"). Reads summary_reports (0010), filtered to
// department = employee.department. No new schema, read-only — writing
// happens on Submit Report (/hod/submit) or the cross-cutting Compose
// Report (/compose).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodSummariesClient, type SummaryReportItem } from './HodSummariesClient';

export default async function HodSummariesPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Team Summaries is available to HOD and admin accounts.</PlainMessage>;
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

  return <HodSummariesClient department={employee.department} items={(data ?? []) as SummaryReportItem[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

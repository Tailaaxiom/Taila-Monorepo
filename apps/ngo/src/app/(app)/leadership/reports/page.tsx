// apps/ngo/src/app/(app)/leadership/reports/page.tsx
//
// Reports & Charts — same constraint already applied to Spend vs Income:
// no charting library exists in this project and docs/INTERFACE.md is
// still on hold, so this is numeric/tabular summaries, not literal
// charts — not reaching for a charting dependency to make the page name
// literally true.
//
// Deliberately a cross-domain roll-up, not a repeat of any single
// existing page: tasks by status, project milestone health, money net
// (income - expenses, not the full breakdown Income/Spend vs Income
// already own), requests by status, media counts. Every number here is
// a summary of a table another page already reads in full detail —
// this page is the one-screen overview across all of them, not a new
// way of reading any single one.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseProjectMilestone } from '@taila/core/types/project-milestone';
import { LeadershipReportsClient } from './LeadershipReportsClient';

export default async function LeadershipReportsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Reports & Charts is available to leadership and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const [tasksRes, incomeRes, expensesRes, approvalsRes, mediaRes, projectRes] = await Promise.all([
    supabase.from('tasks').select('status'),
    supabase.from('income').select('amount'),
    supabase.from('expenses').select('amount'),
    supabase.from('approvals').select('status'),
    supabase.from('media').select('id, donor_visible'),
    supabase.from('projects').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError =
    tasksRes.error ?? incomeRes.error ?? expensesRes.error ?? approvalsRes.error ?? mediaRes.error ?? projectRes.error;
  if (firstError) {
    return <PlainMessage title="Could not load reports">{firstError.message}</PlainMessage>;
  }

  let milestoneStats = { total: 0, verified: 0 };
  if (projectRes.data) {
    const { data: milestoneRows } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', String(projectRes.data.id)); // see docs/LEARNINGS.md — project_id is text on purpose
    const milestones = (milestoneRows ?? []).map(parseProjectMilestone);
    milestoneStats = { total: milestones.length, verified: milestones.filter((m) => m.status === 'verified').length };
  }

  return (
    <LeadershipReportsClient
      tasks={tasksRes.data ?? []}
      totalIncome={(incomeRes.data ?? []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)}
      totalExpenses={(expensesRes.data ?? []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)}
      approvals={approvalsRes.data ?? []}
      mediaTotal={(mediaRes.data ?? []).length}
      mediaDonorVisible={(mediaRes.data ?? []).filter((m) => m.donor_visible).length}
      milestoneStats={milestoneStats}
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

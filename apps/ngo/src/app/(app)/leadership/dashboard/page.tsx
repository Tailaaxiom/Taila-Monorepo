// apps/ngo/src/app/(app)/leadership/dashboard/page.tsx
//
// The most-composed page in the app: tasks, income, expenses, and the org's
// most recent project with its milestones, all real (0004/0005). v1 scope:
// the original design assumed a single project ("mockProject" singular) —
// this queries the most recently created one rather than redesigning the
// page for multiple projects, which is a real future page change, not
// something to expand into here. See docs/EXECUTION.md.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { parseProject } from '@taila/core/types/project';
import { parseProjectMilestone } from '@taila/core/types/project-milestone';
import { LeadershipDashboardClient } from './LeadershipDashboardClient';

export default async function LeadershipDashboardPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();

  const [tasksRes, incomeRes, expensesRes, projectRes] = await Promise.all([
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
    supabase.from('income').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (tasksRes.error || incomeRes.error || expensesRes.error || projectRes.error) {
    const message =
      tasksRes.error?.message ?? incomeRes.error?.message ?? expensesRes.error?.message ?? projectRes.error?.message;
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load the dashboard</h1>
        <p>{message}</p>
      </div>
    );
  }

  let milestones: ReturnType<typeof parseProjectMilestone>[] = [];
  if (projectRes.data) {
    const { data: milestoneRows } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', String(projectRes.data.id)) // see docs/LEARNINGS.md — project_id is text on purpose
      .order('seq', { ascending: true });
    milestones = (milestoneRows ?? []).map(parseProjectMilestone);
  }

  return (
    <LeadershipDashboardClient
      tasks={(tasksRes.data ?? []).map(parseTask)}
      income={incomeRes.data ?? []}
      expenses={expensesRes.data ?? []}
      project={projectRes.data ? parseProject(projectRes.data) : null}
      milestones={milestones}
    />
  );
}
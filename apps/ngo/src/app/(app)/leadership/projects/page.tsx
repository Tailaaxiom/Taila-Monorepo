// apps/ngo/src/app/(app)/leadership/projects/page.tsx
import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseProject } from '@taila/core/types/project';
import { parseProjectMilestone } from '@taila/core/types/project-milestone';
import { LeadershipProjectsClient } from './LeadershipProjectsClient';

export default async function LeadershipProjectsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;

  const supabase = await createClient();

  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (projectError) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load the project</h1>
        <p>{projectError.message}</p>
      </div>
    );
  }

  if (!projectRow) {
    return <LeadershipProjectsClient orgId={employee.org_id} project={null} initialMilestones={[]} />;
  }

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', String(projectRow.id)) // see docs/LEARNINGS.md — project_id is text on purpose
    .order('seq', { ascending: true });

  if (milestoneError) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load milestones</h1>
        <p>{milestoneError.message}</p>
      </div>
    );
  }

  return (
    <LeadershipProjectsClient
      orgId={employee.org_id}
      project={parseProject(projectRow)}
      initialMilestones={(milestoneRows ?? []).map(parseProjectMilestone)}
    />
  );
}
// apps/ngo/src/app/(app)/hod/projects/page.tsx
//
// Deliberately identical in scope to leadership/projects, not
// department-filtered — same tables (projects, project_milestones, 0005),
// same "most recent project" v1 assumption. Unlike tasks/media/summaries,
// projects has no department column, and the handover's own v1 scope is
// already a single-project assumption org-wide (see leadership/projects'
// own comment and docs/EXECUTION.md) — there is nothing to filter by
// department yet with only one project ever in view. Stated explicitly
// rather than silently narrower or wider than it looks: if/when
// multi-project support lands, this is the page that would need a real
// department (or project-owner) column to scope against.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseProject } from '@taila/core/types/project';
import { parseProjectMilestone } from '@taila/core/types/project-milestone';
import { HodProjectsClient } from './HodProjectsClient';

export default async function HodProjectsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Projects is available to HOD and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();

  const { data: projectRow, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (projectError) {
    return <PlainMessage title="Could not load the project">{projectError.message}</PlainMessage>;
  }

  if (!projectRow) {
    return <HodProjectsClient orgId={employee.org_id} project={null} initialMilestones={[]} />;
  }

  const { data: milestoneRows, error: milestoneError } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', String(projectRow.id)) // see docs/LEARNINGS.md — project_id is text on purpose
    .order('seq', { ascending: true });

  if (milestoneError) {
    return <PlainMessage title="Could not load milestones">{milestoneError.message}</PlainMessage>;
  }

  return (
    <HodProjectsClient
      orgId={employee.org_id}
      project={parseProject(projectRow)}
      initialMilestones={(milestoneRows ?? []).map(parseProjectMilestone)}
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

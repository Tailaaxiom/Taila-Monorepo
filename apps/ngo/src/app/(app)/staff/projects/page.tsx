// apps/ngo/src/app/(app)/staff/projects/page.tsx
//
// Same tables and same "most recent project" v1 assumption as
// leadership/projects and hod/projects (0005) — see those pages' own
// comments for why there's nothing to filter by department yet.
//
// Deliberately READ-ONLY for staff, unlike HOD's version (which kept
// leadership's create-project/create-milestone forms). projects_write_by_staff
// and project_milestones_write_by_staff (0005) permit any non-donor staff
// member to write, so RLS does not require this restriction — but handing
// every staff account the ability to create or edit the org's one active
// project by default is a materially bigger permission than a department
// head having it, and the page-level check is exactly where this project
// already draws that kind of line (a UX nicety on top of already-permissive
// RLS, per this batch's own framing). If staff write access to projects is
// ever wanted, that should be a deliberate widening decision, not something
// this page defaults into by copying HOD's precedent without reconsidering
// it for a much larger population of accounts.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseProject } from '@taila/core/types/project';
import { parseProjectMilestone } from '@taila/core/types/project-milestone';
import { StaffProjectsClient } from './StaffProjectsClient';

export default async function StaffProjectsPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Projects is available to staff and admin accounts.</PlainMessage>;
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
    return <StaffProjectsClient project={null} milestones={[]} />;
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
    <StaffProjectsClient
      project={parseProject(projectRow)}
      milestones={(milestoneRows ?? []).map(parseProjectMilestone)}
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

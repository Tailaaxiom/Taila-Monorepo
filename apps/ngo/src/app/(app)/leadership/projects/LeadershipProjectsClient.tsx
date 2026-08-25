// apps/ngo/src/app/(app)/leadership/projects/LeadershipProjectsClient.tsx
'use client';

// Deliberately plain, same reasoning as Funders and Staff Management.
// See docs/INTERFACE.md, on hold.
//
// The page only ever displays the org's single MOST RECENT project (see
// page.tsx's own comment) — creating a new project here means it becomes
// that project on the next load. router.refresh() re-runs the server
// component so this happens immediately rather than needing a manual
// reload, without this file needing to duplicate that "most recent"
// selection logic itself.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@taila/core/types/project';
import { parseProjectMilestone, type ProjectMilestone } from '@taila/core/types/project-milestone';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { milestoneHealth, isMilestoneLocked } from '@taila/core/projects/milestones';

export function LeadershipProjectsClient({
  orgId,
  project,
  initialMilestones,
}: {
  orgId: string;
  project: Project | null;
  initialMilestones: ProjectMilestone[];
}) {
  usePageTitle('Project Monitor');
  const router = useRouter();

  const [milestones, setMilestones] = useState(initialMilestones);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [creatingProject, setCreatingProject] = useState(false);
  const [creatingMilestone, setCreatingMilestone] = useState(false);

  async function handleCreateProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProjectError(null);
    setCreatingProject(true);

    const form = new FormData(e.currentTarget);
    const budgetRaw = form.get('budget') as string;
    const targetRaw = form.get('target_count') as string;

    const supabase = createClient();
    const { error } = await supabase.from('projects').insert({
      org_id: orgId,
      name: form.get('name') as string,
      description: (form.get('description') as string) || null,
      location: (form.get('location') as string) || null,
      budget: budgetRaw ? Number(budgetRaw) : null,
      target_count: targetRaw ? Number(targetRaw) : null,
      unit: (form.get('unit') as string) || null,
      ref_code: (form.get('ref_code') as string) || null,
    });

    setCreatingProject(false);

    if (error) {
      setProjectError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  async function handleAddMilestone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!project) return;
    setMilestoneError(null);
    setCreatingMilestone(true);

    const form = new FormData(e.currentTarget);
    const targetRaw = form.get('target_value') as string;

    const supabase = createClient();
    const { error } = await supabase.from('project_milestones').insert({
      org_id: orgId,
      project_id: String(project.id), // text, matches project_id's deliberate type — see docs/LEARNINGS.md
      title: form.get('title') as string,
      seq: milestones.length + 1,
      target_value: targetRaw ? Number(targetRaw) : null,
      target_unit: (form.get('target_unit') as string) || null,
      due_date: (form.get('due_date') as string) || null,
    });

    setCreatingMilestone(false);

    if (error) {
      setMilestoneError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', String(project.id))
      .order('seq', { ascending: true });
    if (data) setMilestones(data.map(parseProjectMilestone));
  }

  if (!project) {
    return (
      <Card title="Create a project">
        <form
          onSubmit={handleCreateProject}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Name
            <input name="name" required style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <input name="description" style={{ width: '100%' }} />
          </label>
          <label>
            Location
            <input name="location" />
          </label>
          <label>
            Reference code
            <input name="ref_code" placeholder="e.g. PRJ-0001" />
          </label>
          <label>
            Budget (NGN)
            <input name="budget" type="number" min="0" step="0.01" />
          </label>
          <label>
            Target count
            <input name="target_count" type="number" min="0" />
          </label>
          <label>
            Unit
            <input name="unit" placeholder="e.g. wards" />
          </label>

          {projectError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{projectError}</p>}

          <button type="submit" disabled={creatingProject} style={{ gridColumn: '1 / -1' }}>
            {creatingProject ? 'Creating…' : 'Create project'}
          </button>
        </form>
      </Card>
    );
  }

  const health = milestoneHealth(milestones);

  return (
    <div className="space-y-3">
      <Card title={project.name} subtitle={project.location ?? undefined}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatTile label="Progress" value={`${health.progressPct}%`} tone="gold" />
          <StatTile label="On time rate" value={`${health.onTimeRate}%`} tone="blue" />
          <StatTile label="Status" value={health.atRisk ? 'At risk' : 'On track'} tone={health.atRisk ? 'red' : 'green'} />
        </div>

        {milestones.length === 0 ? (
          <p className="text-[0.72rem] text-muted">No milestones recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {milestones.map((m, i) => {
              const locked = isMilestoneLocked(milestones, i);
              const label = locked && m.status === 'active' ? 'locked' : m.status;
              const variant = m.status === 'verified' ? 'green' : m.status === 'submitted' ? 'gold' : locked ? 'muted' : 'blue';
              return (
                <li key={m.id} className="py-2 border-b border-border last:border-none">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.72rem] text-white">{i + 1}. {m.title}</span>
                    <Badge variant={variant}>{label}</Badge>
                  </div>
                  {m.due_date && <div className="text-[0.6rem] text-muted mt-1">Due {m.due_date}</div>}
                  {m.proof_note && <div className="text-[0.6rem] text-muted2 mt-1">{m.proof_note}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card title="Add milestone">
        <form
          onSubmit={handleAddMilestone}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Title
            <input name="title" required style={{ width: '100%' }} />
          </label>
          <label>
            Target value
            <input name="target_value" type="number" min="0" step="0.01" />
          </label>
          <label>
            Target unit
            <input name="target_unit" placeholder="e.g. boreholes" />
          </label>
          <label>
            Due date
            <input name="due_date" type="date" />
          </label>

          {milestoneError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{milestoneError}</p>}

          <button type="submit" disabled={creatingMilestone} style={{ gridColumn: '1 / -1' }}>
            {creatingMilestone ? 'Adding…' : 'Add milestone'}
          </button>
        </form>
      </Card>
    </div>
  );
}
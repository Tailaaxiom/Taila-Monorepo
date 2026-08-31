'use client';

// Read-only trimmed-down sibling of HodProjectsClient/LeadershipProjectsClient
// — same StatTile/milestone-health display, no create-project or
// add-milestone forms. See page.tsx's comment for why staff's version is
// read-only rather than a third copy of the write forms.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Project } from '@taila/core/types/project';
import type { ProjectMilestone } from '@taila/core/types/project-milestone';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { milestoneHealth, isMilestoneLocked } from '@taila/core/projects/milestones';

export function StaffProjectsClient({
  project,
  milestones,
}: {
  project: Project | null;
  milestones: ProjectMilestone[];
}) {
  usePageTitle('Projects');

  if (!project) {
    return (
      <Card title="Projects">
        <p className="text-[0.72rem] text-muted py-2">No project has been created yet.</p>
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
    </div>
  );
}

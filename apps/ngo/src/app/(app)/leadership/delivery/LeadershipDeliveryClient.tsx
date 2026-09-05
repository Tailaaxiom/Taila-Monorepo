'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';

export function LeadershipDeliveryClient({ tasks }: { tasks: Task[] }) {
  usePageTitle('Delivery Tracker');

  const withProof = tasks.filter((t) => t.proofRequired.length > 0);
  const fullyDelivered = withProof.filter(
    (t) => t.deliverables.length > 0 && t.deliverables.every((d) => t.deliverablesDone.includes(d)),
  );
  const partial = withProof.filter((t) => !fullyDelivered.includes(t) && t.deliverablesDone.length > 0);
  const notStarted = withProof.filter((t) => t.deliverablesDone.length === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Tasks with deliverables" value={`${withProof.length}`} tone="blue" />
        <StatTile label="Fully delivered" value={`${fullyDelivered.length}`} tone="green" />
        <StatTile label="Partial" value={`${partial.length}`} tone="gold" />
        <StatTile label="Not started" value={`${notStarted.length}`} tone="red" />
      </div>

      <Card title="Delivery Tracker" subtitle={`${withProof.length} tasks with deliverables committed, org-wide`}>
        {withProof.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No tasks with deliverables recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {withProof.map((t) => {
              const doneCount = t.deliverables.filter((d) => t.deliverablesDone.includes(d)).length;
              const complete = t.deliverables.length > 0 && doneCount === t.deliverables.length;
              return (
                <li key={t.id} className="py-2 border-b border-border last:border-none">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="text-[0.72rem] text-white">{t.title}</div>
                      <div className="text-[0.6rem] text-muted2 mt-0.5">
                        {[t.assignee, t.dept].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Badge variant={complete ? 'green' : doneCount > 0 ? 'gold' : 'red'}>
                      {doneCount}/{t.deliverables.length} delivered
                    </Badge>
                  </div>
                  {t.deliverables.length > 0 && (
                    <ul className="text-[0.68rem] text-muted2 mt-1 list-disc pl-4">
                      {t.deliverables.map((d, i) => (
                        <li key={i} className={t.deliverablesDone.includes(d) ? 'line-through' : ''}>{d}</li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

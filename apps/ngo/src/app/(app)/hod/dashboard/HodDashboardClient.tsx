'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { statusBadge } from '@taila/core/tasks/status';

export function HodDashboardClient({ department, tasks }: { department: string; tasks: Task[] }) {
  usePageTitle('Dept Dashboard');

  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.56rem] tracking-[0.2em] uppercase text-gold mb-1">Department</div>
        <div className="font-display text-[1.8rem] font-light text-white">{department}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Tasks done" value={done} tone="green" />
        <StatTile label="In progress" value={inProgress} tone="gold" />
        <StatTile label="Blocked" value={blocked} tone="red" />
      </div>

      <Card title="Recent tasks" subtitle={`${tasks.length} in ${department}`}>
        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-[0.72rem] text-muted py-2">No tasks recorded for this department yet.</p>
          )}
          {tasks.map((task) => {
            const badge = statusBadge(task.status);
            return (
              <div key={task.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <span className="text-[0.72rem] text-white">{task.title}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

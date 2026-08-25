// apps/ngo/src/app/(app)/staff/dashboard/StaffDashboardClient.tsx
'use client';

import Link from 'next/link';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { useCurrentUser } from '@taila/core/context/current-user';
import type { Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { statusBadge } from '@taila/core/tasks/status';

export function StaffDashboardClient({ tasks }: { tasks: Task[] }) {
  usePageTitle('My Dashboard');
  const { employee } = useCurrentUser();

  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.56rem] tracking-[0.2em] uppercase text-gold mb-1">Welcome back</div>
        <div className="font-display text-[1.8rem] font-light text-white">{employee.full_name}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Tasks done" value={done} tone="green" />
        <StatTile label="In progress" value={inProgress} tone="gold" />
        <StatTile label="Blocked" value={blocked} tone="red" />
      </div>

      <Card title="Recent tasks">
        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-[0.72rem] text-muted py-2">No tasks assigned yet.</p>
          )}
          {tasks.map((task) => {
            const badge = statusBadge(task.status);
            return (
              <Link key={task.id} href={`/staff/tasks/${task.id}`} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <span className="text-[0.72rem] text-white">{task.title}</span>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
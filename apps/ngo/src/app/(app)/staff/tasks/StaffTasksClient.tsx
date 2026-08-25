// apps/ngo/src/app/(app)/staff/tasks/StaffTasksClient.tsx
'use client';

import Link from 'next/link';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Task } from '@taila/core/types/task';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { statusBadge } from '@taila/core/tasks/status';

export function StaffTasksClient({ tasks }: { tasks: Task[] }) {
  usePageTitle('My Tasks');

  if (tasks.length === 0) {
    return <p className="text-[0.72rem] text-muted">No tasks assigned yet.</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const badge = statusBadge(task.status);
        const doneCount = task.deliverablesDone.length;
        const totalCount = task.deliverables.length;

        return (
          <Link key={task.id} href={`/staff/tasks/${task.id}`}>
            <Card>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-[0.76rem] font-medium text-white">{task.title}</div>
                  {task.label && <div className="text-[0.6rem] text-muted mt-[0.1rem]">{task.label}</div>}
                  {totalCount > 0 && (
                    <div className="text-[0.6rem] text-muted2 mt-[0.35rem]">
                      {doneCount} of {totalCount} deliverables done
                    </div>
                  )}
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
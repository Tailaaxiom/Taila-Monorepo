'use client';

// Read-only. See page.tsx's comment for exactly what is and isn't
// attributable to a hub in the current schema.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';

interface RegionalEmployee {
  employee_code: string;
  full_name: string;
  hub: string | null;
  active: boolean;
}

interface RegionalTask {
  id: string;
  title: string;
  assignee: string | null;
  status: string;
  hub: string | null;
}

function bucketBy<T>(items: T[], hubFn: (item: T) => string | null) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = hubFn(item) || 'Unspecified';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

export function LeadershipRegionalClient({ employees, tasks }: { employees: RegionalEmployee[]; tasks: RegionalTask[] }) {
  usePageTitle('Regional');

  const employeesByHub = bucketBy(employees.filter((e) => e.active), (e) => e.hub);
  const tasksByHub = bucketBy(tasks, (t) => t.hub);
  const anyHubSet = employees.some((e) => e.hub);

  return (
    <div className="space-y-4">
      {!anyHubSet && (
        <Card title="No hub data set">
          <p className="text-[0.72rem] text-muted py-2">
            No active employee currently has a hub assigned. This isn&apos;t a page bug — the
            column exists and is read correctly, there&apos;s simply nothing to break down by yet.
          </p>
        </Card>
      )}

      <Card title="Employees by hub" subtitle={`${employees.filter((e) => e.active).length} active employees`}>
        <ul className="space-y-1">
          {employeesByHub.map(([hub, list]) => (
            <li key={hub} className="flex justify-between text-[0.72rem] py-1">
              <span className="text-white">{hub}</span>
              <span className="text-muted2">{list.length}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Tasks by hub" subtitle="Joined via task.assignee -> employee.hub — best-effort, not a foreign key">
        {tasks.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No tasks recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {tasksByHub.map(([hub, list]) => (
              <li key={hub} className="flex justify-between text-[0.72rem] py-1">
                <span className="text-white">{hub}</span>
                <span className="text-muted2">{list.length}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Money by hub">
        <p className="text-[0.72rem] text-muted py-2">
          Not built. Neither <code>income</code> nor <code>expenses</code> has any employee or
          hub reference in the current schema — there is no reliable way to attribute a money row
          to a hub, so this isn&apos;t shown rather than faked into a single &ldquo;Unspecified&rdquo;
          bucket.
        </p>
      </Card>
    </div>
  );
}

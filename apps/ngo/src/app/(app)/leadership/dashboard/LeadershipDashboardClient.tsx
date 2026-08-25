// apps/ngo/src/app/(app)/leadership/dashboard/LeadershipDashboardClient.tsx
'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { useCurrentUser } from '@taila/core/context/current-user';
import type { Task } from '@taila/core/types/task';
import type { Income } from '@taila/core/types/income';
import type { Expense } from '@taila/core/types/expense';
import type { Project } from '@taila/core/types/project';
import type { ProjectMilestone } from '@taila/core/types/project-milestone';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { statusBadge } from '@taila/core/tasks/status';
import { milestoneHealth, isMilestoneLocked } from '@taila/core/projects/milestones';

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

export function LeadershipDashboardClient({
  tasks,
  income,
  expenses,
  project,
  milestones,
}: {
  tasks: Task[];
  income: Income[];
  expenses: Expense[];
  project: Project | null;
  milestones: ProjectMilestone[];
}) {
  usePageTitle('Organization Dashboard');
  const { org } = useCurrentUser();

  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;

  const totalIncome = income.reduce((sum, i) => sum + (Number(i.amount) ?? 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) ?? 0), 0);
  const netPosition = totalIncome - totalExpense;

  const health = milestoneHealth(milestones);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.56rem] tracking-[0.2em] uppercase text-gold mb-1">{org.name}</div>
        <div className="font-display text-[1.8rem] font-light text-white">Organization Dashboard</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Tasks done" value={doneTasks} tone="green" />
        <StatTile label="In progress" value={inProgressTasks} tone="gold" />
        <StatTile label="Blocked" value={blockedTasks} tone="red" />
        <StatTile label="Net position" value={formatNaira(netPosition)} tone={netPosition >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Card title="Money in and out" subtitle="This period">
          <div className="flex justify-between text-[0.72rem] py-2 border-b border-border">
            <span className="text-muted2">Income</span>
            <span className="text-green">{formatNaira(totalIncome)}</span>
          </div>
          <div className="flex justify-between text-[0.72rem] py-2">
            <span className="text-muted2">Expenses</span>
            <span className="text-red">{formatNaira(totalExpense)}</span>
          </div>
        </Card>

        {project ? (
          <Card title={project.name} subtitle="Project health">
            <div className="flex justify-between text-[0.72rem] py-2 border-b border-border">
              <span className="text-muted2">Progress</span>
              <span className="text-white">{health.progressPct}% · {health.done} of {health.total} signed off</span>
            </div>
            <div className="flex justify-between text-[0.72rem] py-2 border-b border-border">
              <span className="text-muted2">On time rate</span>
              <span className="text-white">{health.onTimeRate}%</span>
            </div>
            <div className="flex justify-between text-[0.72rem] py-2">
              <span className="text-muted2">Status</span>
              <Badge variant={health.atRisk ? 'red' : 'green'}>{health.atRisk ? `At risk · ${health.overdueCount} overdue` : 'On track'}</Badge>
            </div>
          </Card>
        ) : (
          <Card title="No project yet" subtitle="Project health">
            <p className="text-[0.72rem] text-muted">Create a project to see health here.</p>
          </Card>
        )}
      </div>

      {project && (
        <Card title={`${project.name} — milestones`}>
          {milestones.length === 0 ? (
            <p className="text-[0.72rem] text-muted">No milestones recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {milestones.map((m, i) => {
                const locked = isMilestoneLocked(milestones, i);
                const label = locked && m.status === 'active' ? 'locked' : m.status;
                const variant = m.status === 'verified' ? 'green' : m.status === 'submitted' ? 'gold' : locked ? 'muted' : 'blue';
                return (
                  <li key={m.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                    <span className="text-[0.72rem] text-white">{i + 1}. {m.title}</span>
                    <Badge variant={variant}>{label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <Card title="Recent task activity">
        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-[0.72rem] text-muted py-2">No tasks yet.</p>}
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
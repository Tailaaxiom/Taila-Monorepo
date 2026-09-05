'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { StatTile } from '@taila/core/components/ui/StatTile';

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

function countBy<T extends { status: string }>(items: T[]) {
  const map = new Map<string, number>();
  for (const item of items) map.set(item.status, (map.get(item.status) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function LeadershipReportsClient({
  tasks,
  totalIncome,
  totalExpenses,
  approvals,
  mediaTotal,
  mediaDonorVisible,
  milestoneStats,
}: {
  tasks: { status: string }[];
  totalIncome: number;
  totalExpenses: number;
  approvals: { status: string }[];
  mediaTotal: number;
  mediaDonorVisible: number;
  milestoneStats: { total: number; verified: number };
}) {
  usePageTitle('Reports & Charts');

  const tasksByStatus = countBy(tasks);
  const approvalsByStatus = countBy(approvals);
  const net = totalIncome - totalExpenses;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Tasks" value={`${tasks.length}`} tone="blue" />
        <StatTile label="Net income" value={formatNaira(net)} tone={net >= 0 ? 'green' : 'red'} />
        <StatTile
          label="Milestones verified"
          value={milestoneStats.total > 0 ? `${milestoneStats.verified}/${milestoneStats.total}` : '—'}
          tone="gold"
        />
        <StatTile label="Media files" value={`${mediaTotal}`} tone="blue" />
      </div>

      <Card title="Tasks by status">
        {tasksByStatus.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No tasks recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {tasksByStatus.map(([status, count]) => (
              <li key={status} className="flex justify-between text-[0.72rem] py-1">
                <span className="text-white capitalize">{status}</span>
                <span className="text-muted2">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Requests by status" subtitle="See Approvals for the review queue itself">
        {approvalsByStatus.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No requests filed yet.</p>
        ) : (
          <ul className="space-y-1">
            {approvalsByStatus.map(([status, count]) => (
              <li key={status} className="flex justify-between text-[0.72rem] py-1">
                <span className="text-white capitalize">{status}</span>
                <span className="text-muted2">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Money" subtitle="Net summary only — see Income / Spend vs Income for the full breakdown">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Income" value={formatNaira(totalIncome)} tone="green" />
          <StatTile label="Expenses" value={formatNaira(totalExpenses)} tone="red" />
          <StatTile label="Net" value={formatNaira(net)} tone={net >= 0 ? 'gold' : 'red'} />
        </div>
      </Card>

      <Card title="Media">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Total files" value={`${mediaTotal}`} tone="blue" />
          <StatTile label="Shared with donors" value={`${mediaDonorVisible}`} tone="gold" />
        </div>
      </Card>
    </div>
  );
}

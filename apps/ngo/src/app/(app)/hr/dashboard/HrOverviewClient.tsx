'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';

export interface HrEmployee {
  id: string;
  full_name: string;
  department: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

export interface HrReview {
  id: string;
  employee_code: string;
  period: string;
  status: string;
  rating: number | null;
  created_at: string;
}

export function HrOverviewClient({ employees, reviews }: { employees: HrEmployee[]; reviews: HrReview[] }) {
  usePageTitle('HR Overview');

  const active = employees.filter((e) => e.active);
  const headcount = active.length;

  const byDept = new Map<string, number>();
  active.forEach((e) => {
    const dept = e.department ?? 'Unassigned';
    byDept.set(dept, (byDept.get(dept) ?? 0) + 1);
  });
  const deptSpread = [...byDept.entries()].sort((a, b) => b[1] - a[1]);

  const reviewedCodes = new Set(reviews.map((r) => r.employee_code));
  const submitted = reviews.filter((r) => r.status === 'submitted').length;
  const draft = reviews.filter((r) => r.status === 'draft').length;

  const recentJoiners = employees.slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Headcount" value={headcount} tone="gold" />
        <StatTile label="Departments" value={deptSpread.length} tone="blue" />
        <StatTile label="Reviews submitted" value={submitted} tone="green" />
        <StatTile label="Reviews in draft" value={draft} tone="purple" />
      </div>

      <Card title="Department spread">
        {deptSpread.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No active employees recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {deptSpread.map(([dept, count]) => (
              <li key={dept} className="flex justify-between items-center py-1">
                <span className="text-[0.72rem] text-white">{dept}</span>
                <span className="text-[0.72rem] text-muted2">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Review status" subtitle={`${reviewedCodes.size} of ${headcount} employees have at least one review on record`}>
        {reviews.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No reviews recorded yet — see Performance Reviews.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.slice(0, 8).map((r) => (
              <li key={r.id} className="flex justify-between items-center py-1">
                <span className="text-[0.72rem] text-white">{r.employee_code} · {r.period}</span>
                <Badge variant={r.status === 'submitted' ? 'green' : 'muted'}>{r.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Recent joiners">
        {recentJoiners.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No employees recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentJoiners.map((e) => (
              <li key={e.id} className="flex justify-between items-center py-1">
                <span className="text-[0.72rem] text-white">{e.full_name}</span>
                <span className="text-[0.6rem] text-muted">{e.department ?? '—'} · {new Date(e.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

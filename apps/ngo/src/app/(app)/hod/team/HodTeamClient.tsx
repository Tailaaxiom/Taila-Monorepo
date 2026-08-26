'use client';

// Deliberately plain, same reasoning as every other functional page this
// project. See docs/INTERFACE.md, on hold.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface TeamMember {
  id: string;
  employee_code: string;
  full_name: string;
  role: string;
  job_title: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
}

export function HodTeamClient({ department, members }: { department: string; members: TeamMember[] }) {
  usePageTitle('My Team');

  return (
    <div className="space-y-4">
      <Card title="My Team" subtitle={`${members.length} in ${department}`}>
        {members.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No one else is recorded in this department yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Name</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Code</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Title</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{m.full_name}</td>
                  <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{m.employee_code}</td>
                  <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{m.job_title ?? '—'}</td>
                  <td className="py-[0.68rem] border-b border-border/60">
                    <Badge variant={m.active ? 'green' : 'muted'}>{m.active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

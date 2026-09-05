'use client';

// Same body shape as HodSummariesClient/StaffSummaryClient — org-wide, no
// department or author filter, see page.tsx's own comment.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface SummaryReportItem {
  id: string;
  author_name: string | null;
  department: string | null;
  period: string;
  content: string;
  status: string;
  created_at: string;
}

export function LeadershipSummariesClient({ items }: { items: SummaryReportItem[] }) {
  usePageTitle('Summary Reports');

  return (
    <div className="space-y-4">
      <Card title="Summary Reports" subtitle={`${items.length} reports, org-wide`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No reports submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{r.author_name ?? 'Unknown'} · {r.period}</div>
                    <div className="text-[0.6rem] text-muted2 mt-0.5">{r.department ?? 'No department'}</div>
                  </div>
                  <Badge variant={r.status === 'submitted' ? 'green' : 'muted'}>{r.status}</Badge>
                </div>
                <p className="text-[0.68rem] text-muted2 mt-2 whitespace-pre-wrap">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

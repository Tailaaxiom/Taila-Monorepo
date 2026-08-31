'use client';

// Same body shape as HodSummariesClient, but there's no department prop —
// see page.tsx's comment: this list is already scoped to "my reports," not
// a department, so the card just shows the count.

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

export function StaffSummaryClient({ items }: { items: SummaryReportItem[] }) {
  usePageTitle('Summary Reports');

  return (
    <div className="space-y-4">
      <Card title="My Summary Reports" subtitle={`${items.length} submitted`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            You haven&apos;t submitted a report yet — see Submit Report.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div className="text-[0.72rem] text-white">{r.period}</div>
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

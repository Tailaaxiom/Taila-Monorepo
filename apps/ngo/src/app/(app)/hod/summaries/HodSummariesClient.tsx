'use client';

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

export function HodSummariesClient({ department, items }: { department: string; items: SummaryReportItem[] }) {
  usePageTitle('Team Summaries');

  return (
    <div className="space-y-4">
      <Card title="Team Summaries" subtitle={`${items.length} reports from ${department}`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            No reports submitted for this department yet — see Submit Report.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{r.author_name ?? 'Unknown'} · {r.period}</div>
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

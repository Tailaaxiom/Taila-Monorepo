'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface TimelineItem {
  id: string;
  at: string;
  headline: string;
  detail: string | null;
  actor: string | null;
}

export function LeadershipTimelineClient({ items }: { items: TimelineItem[] }) {
  usePageTitle('Timeline');

  return (
    <div className="space-y-4">
      <Card title="Timeline" subtitle={`${items.length} entries — activity events and logged activities, merged`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div className="text-[0.72rem] text-white">{item.headline}</div>
                  {item.detail && <Badge variant="blue">{item.detail}</Badge>}
                </div>
                <div className="text-[0.6rem] text-muted mt-1">
                  {item.actor ? `${item.actor} · ` : ''}{new Date(item.at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

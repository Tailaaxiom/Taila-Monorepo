'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export function HodFeedClient({ department, events }: { department: string; events: ActivityEvent[] }) {
  usePageTitle('Dept Feed');

  return (
    <div className="space-y-4">
      <Card title="Dept Feed" subtitle={`Recent activity in ${department}`}>
        {events.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            Nothing recorded yet — creating a task or submitting a report will show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="py-2 border-b border-border last:border-none">
                <div className="text-[0.72rem] text-white">{ev.summary}</div>
                {ev.user_name && <div className="text-[0.6rem] text-muted2 mt-0.5">{ev.user_name}</div>}
                <div className="text-[0.6rem] text-muted mt-1">{new Date(ev.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

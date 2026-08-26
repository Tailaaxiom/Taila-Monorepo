'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export function HodAccessClient({ department, events }: { department: string; events: ActivityEvent[] }) {
  usePageTitle('Access Log');

  return (
    <div className="space-y-4">
      <Card title="Access Log" subtitle={`${events.length} events in ${department}`}>
        {events.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No events logged for this department yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">When</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Actor</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Event</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{ev.user_name ?? '—'}</td>
                  <td className="py-[0.68rem] border-b border-border/60"><Badge variant="blue">{ev.event_type}</Badge></td>
                  <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{ev.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

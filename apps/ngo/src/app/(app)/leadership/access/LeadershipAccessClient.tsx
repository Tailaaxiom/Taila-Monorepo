'use client';

// Deliberately plain, same reasoning as every other functional page this
// project. See docs/INTERFACE.md, on hold.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { buildSessions } from '@taila/core/kpi/sessions';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export function LeadershipAccessClient({ events }: { events: ActivityEvent[] }) {
  usePageTitle('Access Log');

  const sessions = buildSessions(events);

  return (
    <div className="space-y-4">
      <Card
        title="Worked hours"
        subtitle={sessions.length === 0 ? 'No login/logout events exist yet' : `${sessions.length} sessions`}
      >
        {sessions.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            Computed from paired &lsquo;login&rsquo;/&lsquo;logout&rsquo; events in activity_events —
            nothing in the app writes either event yet, so this is empty by construction, not a
            bug. The moment a real login/logout write path exists, this section starts showing
            real sessions with no further changes needed here.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s, i) => (
              <li key={i} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div className="text-[0.72rem] text-white">{s.name}</div>
                  <span className="text-[0.72rem] text-muted2">{s.hours.toFixed(1)}h{s.capped ? ' (capped)' : ''}</span>
                </div>
                <div className="text-[0.6rem] text-muted mt-1">
                  {s.day} · {s.start.toLocaleTimeString()}–{s.end.toLocaleTimeString()}
                  {s.unclosed ? ' · unclosed' : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Access Log" subtitle={`${events.length} events, org-wide`}>
        {events.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No events logged yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">When</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Actor</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Department</th>
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
                  <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{ev.department ?? '—'}</td>
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

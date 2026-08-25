// apps/ngo/src/app/(app)/appointments/AppointmentsClient.tsx
'use client';

// Deliberately plain, same reasoning as every other functional page this
// session. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';

export interface AppointmentItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  attendees: string[];
  created_by: string | null;
}

function formatWhen(start: string, end: string | null) {
  const s = new Date(start);
  const startStr = s.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  if (!end) return startStr;
  const e = new Date(end);
  const endStr = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${startStr} – ${endStr}`;
}

export function AppointmentsClient({
  orgId,
  employeeName,
  initialItems,
}: {
  orgId: string;
  employeeName: string;
  initialItems: AppointmentItem[];
}) {
  usePageTitle('Appointments');

  const [items, setItems] = useState(initialItems);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('appointments')
      .select('id, title, description, location, start_time, end_time, attendees, created_by')
      .order('start_time', { ascending: true });
    if (data) setItems(data as AppointmentItem[]);
  }

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const startRaw = form.get('start_time') as string;
    const endRaw = form.get('end_time') as string;
    const attendeesRaw = (form.get('attendees') as string) ?? '';
    const attendees = attendeesRaw.split(',').map((s) => s.trim()).filter(Boolean);

    if (!startRaw) {
      setFormError('Start time is required.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('appointments').insert({
      org_id: orgId,
      title: form.get('title') as string,
      description: (form.get('description') as string) || null,
      location: (form.get('location') as string) || null,
      start_time: new Date(startRaw).toISOString(),
      end_time: endRaw ? new Date(endRaw).toISOString() : null,
      attendees,
      created_by: employeeName,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  const now = Date.now();
  const upcoming = items.filter((i) => new Date(i.start_time).getTime() >= now);
  const past = items.filter((i) => new Date(i.start_time).getTime() < now);

  return (
    <div className="space-y-4">
      <Card title="Schedule an appointment">
        <form
          onSubmit={handleAdd}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Title
            <input name="title" required style={{ width: '100%' }} />
          </label>
          <label>
            Starts
            <input name="start_time" type="datetime-local" required />
          </label>
          <label>
            Ends
            <input name="end_time" type="datetime-local" />
          </label>
          <label>
            Location
            <input name="location" />
          </label>
          <label>
            Attendees (comma-separated codes)
            <input name="attendees" placeholder="KDI-1001, KDI-1043" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Notes
            <input name="description" style={{ width: '100%' }} />
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </form>
      </Card>

      <Card title="Upcoming" subtitle={`${upcoming.length}`}>
        {upcoming.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((a) => (
              <li key={a.id} className="py-2 border-b border-border last:border-none">
                <div className="text-[0.72rem] text-white">{a.title}</div>
                <div className="text-[0.6rem] text-muted mt-1">
                  {formatWhen(a.start_time, a.end_time)}
                  {a.location && ` · ${a.location}`}
                  {a.attendees.length > 0 && ` · ${a.attendees.join(', ')}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {past.length > 0 && (
        <Card title="Past" subtitle={`${past.length}`}>
          <ul className="space-y-2">
            {past.map((a) => (
              <li key={a.id} className="py-2 border-b border-border last:border-none opacity-60">
                <div className="text-[0.72rem] text-white">{a.title}</div>
                <div className="text-[0.6rem] text-muted mt-1">{formatWhen(a.start_time, a.end_time)}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
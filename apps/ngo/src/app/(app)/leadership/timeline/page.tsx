// apps/ngo/src/app/(app)/leadership/timeline/page.tsx
//
// Timeline — per the handover, "a chronological narrative of the
// organization's activity over time, composed read across
// activity_events and activities" — deliberately not a second Access Log
// under a different name. Reads both tables and merges them into one
// sorted feed rather than picking one.
//
// activity_events RLS (activity_events_read_by_staff, 0011) is
// is_staff_of(org_id) — excludes donors. activities RLS
// (activities_read_org, 0004) is a plain org_id match with no role
// restriction at all — even donors can read it (it backs the donor
// Impact Report). Reading both together here is still safe: the server
// client is scoped to whichever leadership/admin account is signed in,
// RLS enforces each table's own rule independently of what this page
// combines them into.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipTimelineClient, type TimelineItem } from './LeadershipTimelineClient';

export default async function LeadershipTimelinePage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Timeline is available to leadership and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const [eventsRes, activitiesRes] = await Promise.all([
    supabase.from('activity_events').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  if (eventsRes.error || activitiesRes.error) {
    return <PlainMessage title="Could not load the timeline">{eventsRes.error?.message ?? activitiesRes.error?.message}</PlainMessage>;
  }

  const items: TimelineItem[] = [
    ...(eventsRes.data ?? []).map((ev) => ({
      id: `event-${ev.id}`,
      at: ev.created_at,
      headline: ev.summary,
      detail: ev.event_type,
      actor: ev.user_name,
    })),
    ...(activitiesRes.data ?? []).map((a) => ({
      id: `activity-${a.id}`,
      at: a.created_at,
      headline: a.title,
      detail: [a.activity_type, a.location].filter(Boolean).join(' · ') || null,
      actor: a.created_by_code,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return <LeadershipTimelineClient items={items} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

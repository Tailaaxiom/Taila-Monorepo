// apps/ngo/src/app/(app)/hod/feed/page.tsx
//
// Dept Feed — reads activity_events (0011), filtered to
// department = employee.department. Deliberately wired to the same new
// table as Access Log (/hod/access) rather than an ad-hoc aggregation of
// tasks/media/summaries: both pages are being built in this same batch, so
// there's a real write source already (Tasks and Submit Report both log
// here — see their own comments) rather than the "genuinely new table with
// nothing populating it yet" gap this project has hit before. Per the
// handover, this table is also meant to become the backbone for Timeline
// (leadership) and the staff Team Feed later — both out of scope for this
// pass, but the reason activity_events was shaped generically rather than
// narrowly for Access Log alone.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodFeedClient } from './HodFeedClient';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export default async function HodFeedPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Dept Feed is available to HOD and admin accounts.</PlainMessage>;
  }
  if (!employee.department) {
    return (
      <PlainMessage title="No department assigned">
        Your account has no department set — ask an admin to set one on your employee record
        before this page has anything to show.
      </PlainMessage>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('department', employee.department)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return <PlainMessage title="Could not load the feed">{error.message}</PlainMessage>;
  }

  return <HodFeedClient department={employee.department} events={(data ?? []) as ActivityEvent[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

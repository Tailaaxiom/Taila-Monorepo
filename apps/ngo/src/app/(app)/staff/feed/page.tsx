// apps/ngo/src/app/(app)/staff/feed/page.tsx
//
// Team Feed — reads activity_events (0011), filtered to
// department = employee.department. The name says "team," not "mine" —
// this is the department's feed, seen from a staff member's seat, not a
// personal activity log, same table and same filter HOD's Dept Feed
// (/hod/feed) already reads, just this workspace's own framing of it.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffFeedClient } from './StaffFeedClient';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export default async function StaffFeedPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Team Feed is available to staff and admin accounts.</PlainMessage>;
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

  return <StaffFeedClient department={employee.department} events={(data ?? []) as ActivityEvent[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

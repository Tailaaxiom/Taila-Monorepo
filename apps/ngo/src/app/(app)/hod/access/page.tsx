// apps/ngo/src/app/(app)/hod/access/page.tsx
//
// Access Log — the genuinely new piece of infrastructure in this batch:
// activity_events (0011) didn't exist before this pass. Same table and
// same department filter as Dept Feed (/hod/feed); different framing
// (a chronological audit-style table rather than a casual feed list) since
// the handover names them as two distinct pages, not because the
// underlying data differs.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodAccessClient } from './HodAccessClient';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export default async function HodAccessPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Access Log is available to HOD and admin accounts.</PlainMessage>;
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
    .limit(200);

  if (error) {
    return <PlainMessage title="Could not load the access log">{error.message}</PlainMessage>;
  }

  return <HodAccessClient department={employee.department} events={(data ?? []) as ActivityEvent[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

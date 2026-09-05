// apps/ngo/src/app/(app)/leadership/access/page.tsx
//
// Access Log — org-wide sibling of /hod/access (same activity_events
// table, 0011, no department filter). Reachable by leadership, hr, and
// admin (checked against the real NAVMAP — hr's own nav genuinely carries
// p-lead-access, labeled "Access Logs" there).
//
// The handover ties this page to computing worked hours from
// sign-in/sign-out pairs. packages/core/src/kpi/sessions.ts's
// buildSessions() already does exactly this, ported wholesale in the
// original monorepo restructure (2026-08-18) and sitting unused ever
// since — this is the first page to actually call it. Checked first,
// not assumed: grepped every `event_type:` write in the app (HOD Tasks'
// 'task_created', HOD/staff Submit Report's 'report_submitted') — nothing
// anywhere writes 'login'/'logout' events. buildSessions() is wired in for
// real, but it will legitimately return an empty list right now. Said so
// plainly on the page itself rather than presenting an empty "Worked
// Hours" section as if it just has no data today.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipAccessClient } from './LeadershipAccessClient';
import type { ActivityEvent } from '@taila/core/types/activity-event';

export default async function LeadershipAccessPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'hr', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Access Log is available to leadership, hr, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return <PlainMessage title="Could not load the access log">{error.message}</PlainMessage>;
  }

  return <LeadershipAccessClient events={(data ?? []) as ActivityEvent[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

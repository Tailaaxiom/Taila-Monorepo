// apps/ngo/src/app/(app)/leadership/delivery/page.tsx
//
// Delivery Tracker — reads tasks (0005) and their proof fields
// (deliverables_json/deliverables_done/proof_required, already decoded by
// parseTask into deliverables/deliverablesDone/proofRequired), org-wide,
// read-only: what's been delivered against what was committed, per the
// handover's own framing. Reachable by leadership, hr, and admin (checked
// against the real NAVMAP — hr's own nav genuinely carries
// p-lead-delivery).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { parseTask } from '@taila/core/types/task';
import { LeadershipDeliveryClient } from './LeadershipDeliveryClient';

export default async function LeadershipDeliveryPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'hr', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Delivery Tracker is available to leadership, hr, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load tasks">{error.message}</PlainMessage>;
  }

  return <LeadershipDeliveryClient tasks={(data ?? []).map(parseTask)} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

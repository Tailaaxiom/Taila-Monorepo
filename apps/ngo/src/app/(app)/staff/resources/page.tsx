// apps/ngo/src/app/(app)/staff/resources/page.tsx
//
// Resources — the handover describes this as reading both media and
// templates. `templates` has no table and no migration; it's still on the
// leadership-specialized backlog (p-lead-templates is coming-soon for
// every role that reaches it). Building a templates table as a side effect
// of this page would be scope creep for this batch — deferred plainly,
// not silently dropped. This page reads media only.
//
// Deliberately org-wide, not department-filtered like Media Library
// (/staff/media). Framed as a shared reference library ("resources
// available to the org"), not "my department's uploads" — the two pages
// answer different questions even though they read the same table:
// Media Library is where a department's own staff add and manage their
// department's files; Resources is where anyone goes to find what the org
// already has. Read-only for exactly that reason — uploading still belongs
// on Media Library, not duplicated here.
//
// media_read_by_staff (0004) already permits any non-donor org member to
// read every row org-wide, so this query needs no new RLS and no
// department filter to be correct — it's the same table Media Library
// reads, just without the .eq('department', ...) clause.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffResourcesClient, type MediaItem } from './StaffResourcesClient';

export default async function StaffResourcesPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Resources is available to staff and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('media')
    .select('id, caption, file_path, file_type, department, uploaded_by_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load resources">{error.message}</PlainMessage>;
  }

  return <StaffResourcesClient items={(data ?? []) as MediaItem[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

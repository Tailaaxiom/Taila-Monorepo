// apps/ngo/src/app/(app)/leadership/media/page.tsx
//
// The staff-facing side of media (0004/0007) — upload, caption, and choose
// whether a donor gets to see it. Gated to "not donor" rather than a
// specific role list, since that's exactly what media_write_by_staff (0004)
// and the storage policies (0007) already allow — narrower here would just
// be a page-level restriction with no matching table-level reason for it.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipMediaClient, type MediaItem } from './LeadershipMediaClient';

export default async function LeadershipMediaPage() {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (employee.role === 'donor') {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Use the donor Media Library instead — this is the staff upload view.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('media')
    .select('id, caption, file_path, file_type, department, donor_visible, uploaded_by_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div style={{ fontFamily: 'sans-serif' }}>
        <h1>Could not load media</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <LeadershipMediaClient
      orgId={employee.org_id}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      initialItems={(data ?? []) as MediaItem[]}
    />
  );
}
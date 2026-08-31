// apps/ngo/src/app/(app)/staff/media/page.tsx
//
// Department-scoped sibling of hod/media — same media table (0004/0007),
// filtered to department = employee.department, with its own upload form
// (department pre-filled and not editable). No new schema.
//
// Read AND write, deliberately matching HOD's version rather than making
// this read-only. media_write_by_staff (0004) already permits any
// non-donor staff member to upload — RLS draws no distinction between a
// department head and a regular staff member here. Making Staff's version
// read-only would create a confusing asymmetry (a department head can add
// department media, a staff member in the same department can't) that RLS
// doesn't ask for and the handover doesn't call for either. Resources
// (/staff/resources), by contrast, is deliberately read-only — see that
// page's own comment for why the two pages make different calls.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffMediaClient, type MediaItem } from './StaffMediaClient';

export default async function StaffMediaPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['staff', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Media Library is available to staff and admin accounts.</PlainMessage>;
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
    .from('media')
    .select('id, caption, file_path, file_type, department, donor_visible, uploaded_by_name, created_at')
    .eq('department', employee.department)
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load media">{error.message}</PlainMessage>;
  }

  return (
    <StaffMediaClient
      orgId={employee.org_id}
      department={employee.department}
      employeeCode={employee.employee_code}
      employeeName={employee.full_name}
      initialItems={(data ?? []) as MediaItem[]}
    />
  );
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

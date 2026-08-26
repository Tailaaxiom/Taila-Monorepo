// apps/ngo/src/app/(app)/hod/media/page.tsx
//
// Department-scoped sibling of leadership/media — same media table
// (0004/0007), filtered to department = employee.department, with its own
// upload form (department pre-filled and not editable). No new schema.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodMediaClient, type MediaItem } from './HodMediaClient';

export default async function HodMediaPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Media Library is available to HOD and admin accounts.</PlainMessage>;
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
    <HodMediaClient
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

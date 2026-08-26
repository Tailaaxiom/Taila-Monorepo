// apps/ngo/src/app/(app)/hod/team/page.tsx
//
// Department-scoped sibling of leadership/staff (Staff Management) — same
// underlying employees table, filtered to the signed-in HOD's own
// employee.department instead of the whole org, and read-only: adding
// staff and issuing setup tokens stays HR/leadership/admin's job on the
// existing page, not duplicated here.
//
// Gated to hod/admin, not the broader leadership/hr/admin list Staff
// Management uses — this page's whole point is "my department," which
// only means something for an hod account (admin included as the usual
// break-glass access, same as every other role-gated page this project).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodTeamClient, type TeamMember } from './HodTeamClient';

export default async function HodTeamPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return (
      <PlainMessage title="Not permitted">My Team is available to HOD and admin accounts.</PlainMessage>
    );
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
    .from('employees')
    .select('id, employee_code, full_name, role, job_title, email, active, created_at')
    .eq('department', employee.department)
    .order('full_name', { ascending: true });

  if (error) {
    return <PlainMessage title="Could not load your team">{error.message}</PlainMessage>;
  }

  return <HodTeamClient department={employee.department} members={(data ?? []) as TeamMember[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

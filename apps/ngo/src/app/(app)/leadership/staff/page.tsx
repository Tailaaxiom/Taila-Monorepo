// apps/ngo/src/app/leadership/staff/page.tsx
//
// The first page in the app driven by the REAL signed-in session instead of
// the preview switcher. Everything else still renders through
// usePreviewUser() (see docs/EXECUTION.md) — the sidebar chrome around this
// page may say "Previewing: Ngozi Eze" while the table below correctly shows
// whichever real leadership/HR/admin account is actually signed in. That's
// the known gap of not having migrated every page off fixtures yet, not a
// new bug. This page has to be real: it writes rows and issues real setup
// tokens against real RLS, so a fixture identity would be actively wrong
// here, not just cosmetically inconsistent.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { StaffManagementClient, type EmployeeListItem } from './StaffManagementClient';

export default async function StaffManagementPage() {
  const currentEmployee = await getCurrentEmployee();

  if (!currentEmployee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'hr', 'admin'].includes(currentEmployee.role)) {
    return (
      <PlainMessage title="Not permitted">
        Staff Management is available to leadership, HR, and admin accounts.
      </PlainMessage>
    );
  }

  // RLS-scoped: employees_read_org already restricts this to the caller's
  // own org (app.is_staff_of(org_id)), so no explicit org_id filter is
  // needed here — but see docs/LEARNINGS.md if that ever feels surprising.
  //
  // Now also selects the six salary-structure columns added in
  // 0013_payroll_fields.sql for the HOD Payroll page. This is the first
  // and only place they can be edited — previously SQL-only, which meant
  // Payroll couldn't be exercised through the app at all. No new migration
  // needed: employees_update_by_hr (0003) already covers leadership/hr/
  // admin writes to this exact table.
  const supabase = await createClient();
  const { data: employees, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, full_name, role, department, email, login_mode, active, auth_user_id, created_at, basic_salary, housing_allowance, transport_allowance, other_allowances, annual_rent, nhf_opt_in',
    )
    .order('created_at', { ascending: false });

  if (error) {
    return <PlainMessage title="Could not load employees">{error.message}</PlainMessage>;
  }

  return (
    <StaffManagementClient
      orgId={currentEmployee.org_id}
      initialEmployees={(employees ?? []) as EmployeeListItem[]}
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
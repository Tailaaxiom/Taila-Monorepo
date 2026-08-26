// apps/ngo/src/app/(app)/hod/payroll/page.tsx
//
// Payroll — reads employees.{basic_salary,housing_allowance,
// transport_allowance,other_allowances,annual_rent,nhf_opt_in} (0013) for
// the HOD's own department and runs the ported computePAYE()
// (packages/core/src/finance/payroll.ts) against each. Computed on read,
// not persisted — see 0013's own comment on why there's no payroll-run
// history in this v1.
//
// Deliberately read-only: employees_update_by_hr (0003) restricts writes
// to the employees table to leadership/hr/admin, not hod — compensation
// data staying outside a department head's write access is the correct
// RLS boundary, not an oversight, so this page doesn't attempt an edit
// form that would just fail. Setting salary structure is an HR/leadership/
// admin action (via SQL for now, no UI anywhere yet) — a real, stated gap,
// not built here.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { HodPayrollClient, type PayrollEmployee } from './HodPayrollClient';

export default async function HodPayrollPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['hod', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Payroll is available to HOD and admin accounts.</PlainMessage>;
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
    .select(
      'id, employee_code, full_name, basic_salary, housing_allowance, transport_allowance, other_allowances, annual_rent, nhf_opt_in',
    )
    .eq('department', employee.department)
    .order('full_name', { ascending: true });

  if (error) {
    return <PlainMessage title="Could not load payroll">{error.message}</PlainMessage>;
  }

  return <HodPayrollClient department={employee.department} employees={(data ?? []) as PayrollEmployee[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

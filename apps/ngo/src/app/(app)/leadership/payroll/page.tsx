// apps/ngo/src/app/(app)/leadership/payroll/page.tsx
//
// Checked /hod/payroll first: same employees.{basic_salary,
// housing_allowance,transport_allowance,other_allowances,annual_rent,
// nhf_opt_in} columns (0013), same ported computePAYE() engine
// (packages/core/src/finance/payroll.ts), computed on read, not
// persisted — same "no payroll-run history" v1 trade-off already logged
// for HOD's version. This page is the org-wide version: every employee,
// not one department (drops HOD's .eq('department', ...) filter and
// department-assigned requirement).
//
// Also deliberately read-only, but for a DIFFERENT reason than HOD's
// version. HOD is read-only because employees_manage_by_hr (0003)
// excludes hod from writing employees — a real RLS boundary. Leadership
// is NOT excluded (employees_manage_by_hr includes leadership), so RLS
// alone doesn't require this page to be read-only. The reason to keep it
// read-only anyway: Staff Management (2026-08-26) already owns editing
// salary structure org-wide for leadership/hr/admin. A second edit form
// here would recreate the exact "two paths write the same row" problem
// this project avoids elsewhere (see leadership/income's own comment for
// the same reasoning applied to a different table).

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';
import { LeadershipPayrollClient, type PayrollEmployee } from './LeadershipPayrollClient';

export default async function LeadershipPayrollPage() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return <PlainMessage title="Not signed in">Sign in to view this page.</PlainMessage>;
  }
  if (!['leadership', 'finance', 'admin'].includes(employee.role)) {
    return <PlainMessage title="Not permitted">Payroll is available to leadership, finance, and admin accounts.</PlainMessage>;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, employee_code, full_name, department, basic_salary, housing_allowance, transport_allowance, other_allowances, annual_rent, nhf_opt_in',
    )
    .order('full_name', { ascending: true });

  if (error) {
    return <PlainMessage title="Could not load payroll">{error.message}</PlainMessage>;
  }

  return <LeadershipPayrollClient employees={(data ?? []) as PayrollEmployee[]} />;
}

function PlainMessage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}

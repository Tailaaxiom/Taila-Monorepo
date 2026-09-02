'use client';

// Deliberately identical structure to HodPayrollClient, org-wide instead of
// department-filtered — see page.tsx's comment for why this stays
// read-only anyway. Adds a Department column HOD's version doesn't need
// (every row there is already the same department) and an org-wide total
// net payroll figure.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';
import { computePAYE } from '@taila/core/finance/payroll';

export interface PayrollEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string | null;
  basic_salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  annual_rent: number | null;
  nhf_opt_in: boolean;
}

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export function LeadershipPayrollClient({ employees }: { employees: PayrollEmployee[] }) {
  usePageTitle('Payroll');

  const computed = employees.map((emp) => ({
    emp,
    result:
      emp.basic_salary == null
        ? null
        : computePAYE({
            basicAnnual: emp.basic_salary ?? 0,
            housingAnnual: emp.housing_allowance ?? 0,
            transportAnnual: emp.transport_allowance ?? 0,
            otherAnnual: emp.other_allowances ?? 0,
            annualRent: emp.annual_rent ?? 0,
            nhfOptIn: emp.nhf_opt_in,
          }),
  }));

  const totalNetMonthly = computed.reduce((sum, c) => sum + (c.result?.netMonthly ?? 0), 0);
  const withStructure = computed.filter((c) => c.result !== null).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Employees" value={`${employees.length}`} tone="blue" />
        <StatTile label="With salary structure" value={`${withStructure}`} tone="gold" />
        <StatTile label="Total net / mo" value={naira.format(totalNetMonthly)} tone="green" />
      </div>

      <Card title="Payroll" subtitle="Org-wide — computed from current salary structure, not persisted per period">
        {employees.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No employees recorded yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Name</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Department</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Gross / mo</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">PAYE / mo</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Net / mo</th>
              </tr>
            </thead>
            <tbody>
              {computed.map(({ emp, result }) => {
                if (!result) {
                  return (
                    <tr key={emp.id}>
                      <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{emp.full_name}</td>
                      <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{emp.department ?? '—'}</td>
                      <td className="py-[0.68rem] border-b border-border/60" colSpan={3}>
                        <Badge variant="muted">No salary structure set</Badge>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={emp.id}>
                    <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{emp.full_name}</td>
                    <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">{emp.department ?? '—'}</td>
                    <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">
                      {naira.format(result.grossAnnual / 12)}
                    </td>
                    <td className="py-[0.68rem] text-[0.71rem] text-muted2 border-b border-border/60">
                      {naira.format(result.totalTaxMonthly)}
                    </td>
                    <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">
                      {naira.format(result.netMonthly)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { computePAYE } from '@taila/core/finance/payroll';

export interface PayrollEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  basic_salary: number | null;
  housing_allowance: number | null;
  transport_allowance: number | null;
  other_allowances: number | null;
  annual_rent: number | null;
  nhf_opt_in: boolean;
}

const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });

export function HodPayrollClient({ department, employees }: { department: string; employees: PayrollEmployee[] }) {
  usePageTitle('Payroll');

  return (
    <div className="space-y-4">
      <Card title="Payroll" subtitle={`${employees.length} in ${department} — computed from current salary structure`}>
        {employees.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No one recorded in this department yet.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Name</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Gross / mo</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">PAYE / mo</th>
                <th className="text-[0.54rem] tracking-[0.14em] uppercase text-muted pb-2 border-b border-border">Net / mo</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                if (emp.basic_salary == null) {
                  return (
                    <tr key={emp.id}>
                      <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{emp.full_name}</td>
                      <td className="py-[0.68rem] border-b border-border/60" colSpan={3}>
                        <Badge variant="muted">No salary structure set</Badge>
                      </td>
                    </tr>
                  );
                }

                const result = computePAYE({
                  basicAnnual: emp.basic_salary ?? 0,
                  housingAnnual: emp.housing_allowance ?? 0,
                  transportAnnual: emp.transport_allowance ?? 0,
                  otherAnnual: emp.other_allowances ?? 0,
                  annualRent: emp.annual_rent ?? 0,
                  nhfOptIn: emp.nhf_opt_in,
                });

                return (
                  <tr key={emp.id}>
                    <td className="py-[0.68rem] text-[0.71rem] text-white border-b border-border/60">{emp.full_name}</td>
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

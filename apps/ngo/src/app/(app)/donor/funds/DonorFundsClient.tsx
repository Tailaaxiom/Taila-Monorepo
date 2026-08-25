// apps/ngo/src/app/(app)/donor/funds/DonorFundsClient.tsx
'use client';

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';
import { StatTile } from '@taila/core/components/ui/StatTile';

export interface FundLineItem {
  id: string;
  budget_line: string;
  allocated: number;
  disbursed: number;
  currency: string;
  period: string | null;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG')}`;
}

export function DonorFundsClient({ fundLines }: { fundLines: FundLineItem[] }) {
  usePageTitle('Fund Utilization');

  const totalAllocated = fundLines.reduce((sum, f) => sum + Number(f.allocated), 0);
  const totalDisbursed = fundLines.reduce((sum, f) => sum + Number(f.disbursed), 0);
  const utilizationPct = totalAllocated > 0 ? Math.round((totalDisbursed / totalAllocated) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="font-display text-[1.8rem] font-light text-white">Fund Utilization</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Allocated" value={formatAmount(totalAllocated, 'NGN')} tone="blue" />
        <StatTile label="Disbursed" value={formatAmount(totalDisbursed, 'NGN')} tone="gold" />
        <StatTile label="Utilization" value={`${utilizationPct}%`} tone="green" />
      </div>

      <Card title="By budget line">
        {fundLines.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No fund lines recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {fundLines.map((line) => {
              const remaining = Number(line.allocated) - Number(line.disbursed);
              return (
                <li key={line.id} className="py-2 border-b border-border last:border-none">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.72rem] text-white">
                      {line.budget_line}
                      {line.period && <span className="text-[0.6rem] text-muted ml-2">{line.period}</span>}
                    </span>
                    <span className="text-[0.7rem] text-white">
                      {formatAmount(Number(line.disbursed), line.currency)} / {formatAmount(Number(line.allocated), line.currency)}
                    </span>
                  </div>
                  <div className="text-[0.6rem] text-muted mt-1">
                    {formatAmount(remaining, line.currency)} remaining
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
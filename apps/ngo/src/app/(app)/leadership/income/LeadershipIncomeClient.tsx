'use client';

// Read-only. See page.tsx's comment for why this doesn't duplicate Budget
// & Spend's add-income form.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Income } from '@taila/core/types/income';
import { Card } from '@taila/core/components/ui/Card';
import { StatTile } from '@taila/core/components/ui/StatTile';

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

export function LeadershipIncomeClient({ items }: { items: Income[] }) {
  usePageTitle('Income');

  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const byPayerType = new Map<string, number>();
  for (const i of items) {
    const key = i.payer_type || 'Unspecified';
    byPayerType.set(key, (byPayerType.get(key) ?? 0) + (Number(i.amount) || 0));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total income" value={formatNaira(total)} tone="green" />
        <StatTile label="Entries" value={`${items.length}`} tone="blue" />
      </div>

      {byPayerType.size > 0 && (
        <Card title="By payer type">
          <ul className="space-y-1">
            {[...byPayerType.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([type, amount]) => (
                <li key={type} className="flex justify-between text-[0.72rem] py-1">
                  <span className="text-white capitalize">{type}</span>
                  <span className="text-muted2">
                    {formatNaira(amount)} · {total > 0 ? Math.round((amount / total) * 100) : 0}%
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card title="All income" subtitle={`${items.length} entries — add new income on Budget & Spend`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No income recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{i.payer_name ?? 'Unknown payer'}</div>
                    <div className="text-[0.6rem] text-muted2 mt-0.5">
                      {[i.payer_type, i.source, i.period].filter(Boolean).join(' · ')}
                    </div>
                    {(i.invoice_no || i.receipt_no) && (
                      <div className="text-[0.6rem] text-muted mt-0.5">
                        {i.invoice_no ? `Invoice ${i.invoice_no}` : ''}{i.receipt_no ? ` · Receipt ${i.receipt_no}` : ''}
                      </div>
                    )}
                    {i.note && <div className="text-[0.6rem] text-muted mt-0.5">{i.note}</div>}
                  </div>
                  <span className="text-[0.72rem] text-green">{formatNaira(Number(i.amount) || 0)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

'use client';

// Read-only, per the handover's own description of this page. See
// page.tsx's comment for why this is numeric breakdowns rather than a
// chart.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import type { Income } from '@taila/core/types/income';
import type { Expense } from '@taila/core/types/expense';
import { Card } from '@taila/core/components/ui/Card';
import { StatTile } from '@taila/core/components/ui/StatTile';

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

function bucketBy<T>(items: T[], keyFn: (item: T) => string, amountFn: (item: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || 'Unspecified';
    map.set(key, (map.get(key) ?? 0) + (amountFn(item) || 0));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function LeadershipSpendClient({ income, expenses }: { income: Income[]; expenses: Expense[] }) {
  usePageTitle('Spend vs Income');

  const totalIncome = income.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const net = totalIncome - totalExpense;
  const spendRate = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  const incomeBySource = bucketBy(income, (i) => i.source ?? '', (i) => Number(i.amount));
  const expensesByCategory = bucketBy(expenses, (e) => e.category ?? '', (e) => Number(e.amount));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Income" value={formatNaira(totalIncome)} tone="green" />
        <StatTile label="Expenses" value={formatNaira(totalExpense)} tone="red" />
        <StatTile label="Net" value={formatNaira(net)} tone={net >= 0 ? 'gold' : 'red'} />
        <StatTile label="Spend rate" value={`${spendRate}%`} tone={spendRate > 100 ? 'red' : 'blue'} />
      </div>

      <Card title="Income by source" subtitle={`${income.length} entries`}>
        {incomeBySource.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No income recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {incomeBySource.map(([source, amount]) => (
              <li key={source} className="flex justify-between text-[0.72rem] py-1">
                <span className="text-white">{source}</span>
                <span className="text-muted2">
                  {formatNaira(amount)} · {totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Expenses by category" subtitle={`${expenses.length} entries`}>
        {expensesByCategory.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No expenses recorded yet.</p>
        ) : (
          <ul className="space-y-1">
            {expensesByCategory.map(([category, amount]) => (
              <li key={category} className="flex justify-between text-[0.72rem] py-1">
                <span className="text-white">{category}</span>
                <span className="text-muted2">
                  {formatNaira(amount)} · {totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

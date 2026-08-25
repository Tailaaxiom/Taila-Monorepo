// apps/ngo/src/app/(app)/leadership/budget/LeadershipBudgetClient.tsx
'use client';

// Deliberately plain, same reasoning as Funders and Staff Management.
// See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import type { Income } from '@taila/core/types/income';
import type { Expense } from '@taila/core/types/expense';
import { Card } from '@taila/core/components/ui/Card';
import { StatTile } from '@taila/core/components/ui/StatTile';

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

export function LeadershipBudgetClient({
  orgId,
  employeeName,
  initialIncome,
  initialExpenses,
}: {
  orgId: string;
  employeeName: string;
  initialIncome: Income[];
  initialExpenses: Expense[];
}) {
  usePageTitle('Budget & Spend');

  const [income, setIncome] = useState(initialIncome);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [addingIncome, setAddingIncome] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);

  const totalIncome = income.reduce((sum, i) => sum + (Number(i.amount) ?? 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) ?? 0), 0);

  async function handleAddIncome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIncomeError(null);
    setAddingIncome(true);

    const form = new FormData(e.currentTarget);
    const amount = Number(form.get('amount'));
    if (!amount || amount <= 0) {
      setAddingIncome(false);
      setIncomeError('Amount must be greater than zero.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('income').insert({
      org_id: orgId,
      amount,
      currency: (form.get('currency') as string) || 'NGN',
      source: (form.get('source') as string) || null,
      payer_name: (form.get('payer_name') as string) || null,
      payer_type: (form.get('payer_type') as string) || null,
      period: (form.get('period') as string) || null,
      project_ref: (form.get('project_ref') as string) || null,
      note: (form.get('note') as string) || null,
    });

    setAddingIncome(false);

    if (error) {
      setIncomeError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    const { data } = await supabase.from('income').select('*').order('created_at', { ascending: false });
    if (data) setIncome(data);
  }

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExpenseError(null);
    setAddingExpense(true);

    const form = new FormData(e.currentTarget);
    const amount = Number(form.get('amount'));
    if (!amount || amount <= 0) {
      setAddingExpense(false);
      setExpenseError('Amount must be greater than zero.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('expenses').insert({
      org_id: orgId,
      amount,
      category: (form.get('category') as string) || null,
      description: (form.get('description') as string) || null,
      method: (form.get('method') as string) || null,
      spent_on: (form.get('spent_on') as string) || null,
      note: (form.get('note') as string) || null,
      created_by: employeeName,
    });

    setAddingExpense(false);

    if (error) {
      setExpenseError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    const { data } = await supabase.from('expenses').select('*').order('spent_on', { ascending: false });
    if (data) setExpenses(data);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Income" value={formatNaira(totalIncome)} tone="green" />
        <StatTile label="Expenses" value={formatNaira(totalExpense)} tone="red" />
        <StatTile label="Net" value={formatNaira(totalIncome - totalExpense)} tone={totalIncome >= totalExpense ? 'gold' : 'red'} />
      </div>

      <Card title="Add income">
        <form
          onSubmit={handleAddIncome}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, fontFamily: 'sans-serif' }}
        >
          <label>
            Amount
            <input name="amount" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Currency
            <input name="currency" defaultValue="NGN" />
          </label>
          <label>
            Payer name
            <input name="payer_name" />
          </label>
          <label>
            Payer type
            <input name="payer_type" placeholder="organization, individual…" />
          </label>
          <label>
            Source
            <input name="source" placeholder="Grant disbursement…" />
          </label>
          <label>
            Period
            <input name="period" placeholder="e.g. Q3 2026" />
          </label>
          <label>
            Project reference
            <input name="project_ref" placeholder="e.g. PRJ-0001" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Note
            <input name="note" style={{ width: '100%' }} />
          </label>

          {incomeError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{incomeError}</p>}

          <button type="submit" disabled={addingIncome} style={{ gridColumn: '1 / -1' }}>
            {addingIncome ? 'Adding…' : 'Add income'}
          </button>
        </form>
      </Card>

      <Card title="Income">
        {income.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No income recorded yet.</p>
        ) : (
          income.map((i) => (
            <div key={i.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
              <div>
                <div className="text-[0.72rem] text-white">{i.payer_name}</div>
                <div className="text-[0.6rem] text-muted">{i.source} · {i.invoice_no}</div>
              </div>
              <span className="text-[0.72rem] text-green">{formatNaira(Number(i.amount) ?? 0)}</span>
            </div>
          ))
        )}
      </Card>

      <Card title="Add expense">
        <form
          onSubmit={handleAddExpense}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Description
            <input name="description" required style={{ width: '100%' }} />
          </label>
          <label>
            Amount
            <input name="amount" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Category
            <input name="category" placeholder="Field supplies, Transport…" />
          </label>
          <label>
            Date spent
            <input name="spent_on" type="date" />
          </label>
          <label>
            Method
            <input name="method" placeholder="transfer, cash…" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Note
            <input name="note" style={{ width: '100%' }} />
          </label>

          {expenseError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{expenseError}</p>}

          <button type="submit" disabled={addingExpense} style={{ gridColumn: '1 / -1' }}>
            {addingExpense ? 'Adding…' : 'Add expense'}
          </button>
        </form>
      </Card>

      <Card title="Expenses">
        {expenses.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No expenses recorded yet.</p>
        ) : (
          expenses.map((e) => (
            <div key={e.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
              <div>
                <div className="text-[0.72rem] text-white">{e.description}</div>
                <div className="text-[0.6rem] text-muted">{e.category} · {e.spent_on}</div>
              </div>
              <span className="text-[0.72rem] text-red">{formatNaira(Number(e.amount) ?? 0)}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
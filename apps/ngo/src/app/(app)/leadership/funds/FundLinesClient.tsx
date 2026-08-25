// apps/ngo/src/app/(app)/leadership/funds/FundLinesClient.tsx
'use client';

// Deliberately plain, same reasoning as Funders and Staff Management.
// See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';

export interface FundLineItem {
  id: string;
  budget_line: string;
  allocated: number;
  disbursed: number;
  currency: string;
  period: string | null;
  donor_codes: string[];
  notes: string | null;
  created_at: string;
}

export interface FunderOption {
  id: string;
  funder_name: string;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG')}`;
}

export function FundLinesClient({
  orgId,
  initialFundLines,
  funders,
}: {
  orgId: string;
  initialFundLines: FundLineItem[];
  funders: FunderOption[];
}) {
  usePageTitle('Fund Management');

  const [fundLines, setFundLines] = useState(initialFundLines);
  const [selectedFunders, setSelectedFunders] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const funderNameById = Object.fromEntries(funders.map((f) => [f.id, f.funder_name]));

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('fund_lines')
      .select('id, budget_line, allocated, disbursed, currency, period, donor_codes, notes, created_at')
      .order('created_at', { ascending: false });
    if (data) setFundLines(data as FundLineItem[]);
  }

  function toggleFunder(id: string) {
    setSelectedFunders((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  async function handleAddFundLine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const allocated = Number(form.get('allocated'));
    const disbursedRaw = form.get('disbursed') as string;
    const disbursed = disbursedRaw ? Number(disbursedRaw) : 0;

    if (!allocated || Number.isNaN(allocated) || allocated <= 0) {
      setFormError('Allocated amount must be greater than zero.');
      return;
    }
    if (Number.isNaN(disbursed) || disbursed < 0) {
      setFormError('Disbursed amount cannot be negative.');
      return;
    }
    // Client-side check for a fast error message — the database enforces
    // this too (fund_lines_disbursed_within_allocated, 0004), so this can
    // never actually be bypassed, only caught earlier.
    if (disbursed > allocated) {
      setFormError('Disbursed cannot exceed allocated.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('fund_lines').insert({
      org_id: orgId,
      budget_line: form.get('budget_line') as string,
      allocated,
      disbursed,
      currency: (form.get('currency') as string) || 'NGN',
      period: (form.get('period') as string) || null,
      donor_codes: selectedFunders,
      notes: (form.get('notes') as string) || null,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    setSelectedFunders([]);
    await refreshList();
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this fund line?')) return;
    setRemovingId(id);
    const supabase = createClient();
    const { error } = await supabase.from('fund_lines').delete().eq('id', id);
    setRemovingId(null);

    if (error) {
      alert(`Could not remove: ${error.message}`);
      return;
    }
    await refreshList();
  }

  return (
    <div style={{ maxWidth: 820, fontFamily: 'sans-serif' }}>
      <h1>Fund Management</h1>
      <p style={{ fontSize: 13, color: '#666' }}>
        Budget lines and how much of each has been disbursed. Disbursed is entered manually for
        now — there is no expense-booking table yet to drive it automatically. See
        docs/EXECUTION.md.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16 }}>Add fund line</h2>
        <form
          onSubmit={handleAddFundLine}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560 }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Budget line
            <input name="budget_line" required style={{ width: '100%' }} />
          </label>
          <label>
            Allocated
            <input name="allocated" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Disbursed so far
            <input name="disbursed" type="number" min="0" step="0.01" placeholder="0" />
          </label>
          <label>
            Currency
            <input name="currency" defaultValue="NGN" />
          </label>
          <label>
            Period
            <input name="period" placeholder="e.g. Q3 2026" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Notes
            <input name="notes" style={{ width: '100%' }} />
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ marginBottom: 4 }}>Supplied by (optional)</p>
            {funders.length === 0 ? (
              <p style={{ fontSize: 12, color: '#888' }}>
                No funders recorded yet — add one on the Funders page first if you want to tag this line.
              </p>
            ) : (
              funders.map((f) => (
                <label key={f.id} style={{ display: 'inline-block', marginRight: 16, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={selectedFunders.includes(f.id)}
                    onChange={() => toggleFunder(f.id)}
                  />{' '}
                  {f.funder_name}
                </label>
              ))
            )}
          </div>

          {formError && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>
          )}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Adding…' : 'Add fund line'}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>All fund lines</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Budget line</th>
              <th>Allocated</th>
              <th>Disbursed</th>
              <th>Remaining</th>
              <th>Supplied by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {fundLines.map((line) => {
              const remaining = Number(line.allocated) - Number(line.disbursed);
              const donorNames = line.donor_codes
                .map((id) => funderNameById[id])
                .filter(Boolean);
              return (
                <tr key={line.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>
                    {line.budget_line}
                    {line.period && <div style={{ fontSize: 11, color: '#888' }}>{line.period}</div>}
                  </td>
                  <td>{formatAmount(Number(line.allocated), line.currency)}</td>
                  <td>{formatAmount(Number(line.disbursed), line.currency)}</td>
                  <td style={{ color: remaining > 0 ? 'green' : '#888' }}>
                    {formatAmount(remaining, line.currency)}
                  </td>
                  <td>{donorNames.length > 0 ? donorNames.join(', ') : '—'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRemove(line.id)}
                      disabled={removingId === line.id}
                    >
                      {removingId === line.id ? 'Removing…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {fundLines.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: '#888', paddingTop: 12 }}>
                  No fund lines recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
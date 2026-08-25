// apps/ngo/src/app/leadership/funders/FundersClient.tsx
'use client';

// Deliberately plain, same reasoning as Staff Management and /sign-in: a
// functional screen to prove the backend, not a designed page. See
// docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';

export interface FunderListItem {
  id: string;
  funder_name: string;
  amount: number;
  currency: string;
  contribution_date: string | null;
  project_ref: string | null;
  source_type: string | null;
  notes: string | null;
  created_at: string;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG')}`;
}

export function FundersClient({
  orgId,
  initialFunders,
}: {
  orgId: string;
  initialFunders: FunderListItem[];
}) {
  usePageTitle('Funders');

  const [funders, setFunders] = useState(initialFunders);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('funders')
      .select('id, funder_name, amount, currency, contribution_date, project_ref, source_type, notes, created_at')
      .order('created_at', { ascending: false });
    if (data) setFunders(data as FunderListItem[]);
  }

  async function handleAddFunder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const amountRaw = form.get('amount') as string;
    const amount = Number(amountRaw);

    if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
      setSubmitting(false);
      setFormError('Enter a valid amount greater than zero.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from('funders').insert({
      org_id: orgId,
      funder_name: form.get('funder_name') as string,
      amount,
      currency: (form.get('currency') as string) || 'NGN',
      contribution_date: (form.get('contribution_date') as string) || null,
      project_ref: (form.get('project_ref') as string) || null,
      source_type: (form.get('source_type') as string) || null,
      notes: (form.get('notes') as string) || null,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this funder? This does not affect any fund lines already tied to it.')) {
      return;
    }
    setRemovingId(id);
    const supabase = createClient();
    const { error } = await supabase.from('funders').delete().eq('id', id);
    setRemovingId(null);

    if (error) {
      alert(`Could not remove: ${error.message}`);
      return;
    }
    await refreshList();
  }

  const totalContributed = funders.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div style={{ maxWidth: 760, fontFamily: 'sans-serif' }}>
      <h1>Funders</h1>
      <p style={{ fontSize: 13, color: '#666' }}>
        {funders.length} funder{funders.length === 1 ? '' : 's'} · total recorded contributions{' '}
        {formatAmount(totalContributed, 'NGN')}
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16 }}>Add funder</h2>
        <form
          onSubmit={handleAddFunder}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 520 }}
        >
          <label>
            Funder name
            <input name="funder_name" required />
          </label>
          <label>
            Amount
            <input name="amount" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Currency
            <input name="currency" defaultValue="NGN" />
          </label>
          <label>
            Contribution date
            <input name="contribution_date" type="date" />
          </label>
          <label>
            Source type
            <input name="source_type" placeholder="institutional, individual, grant…" />
          </label>
          <label>
            Project reference
            <input name="project_ref" placeholder="e.g. PRJ-0001" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Notes
            <input name="notes" style={{ width: '100%' }} />
          </label>

          {formError && (
            <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>
          )}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Adding…' : 'Add funder'}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 16 }}>All funders</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
              <th>Name</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Source</th>
              <th>Project</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {funders.map((f) => (
              <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                <td>{f.funder_name}</td>
                <td>{formatAmount(f.amount, f.currency)}</td>
                <td>{f.contribution_date ?? '—'}</td>
                <td>{f.source_type ?? '—'}</td>
                <td>{f.project_ref ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => handleRemove(f.id)}
                    disabled={removingId === f.id}
                  >
                    {removingId === f.id ? 'Removing…' : 'Remove'}
                  </button>
                </td>
              </tr>
            ))}
            {funders.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: '#888', paddingTop: 12 }}>
                  No funders recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
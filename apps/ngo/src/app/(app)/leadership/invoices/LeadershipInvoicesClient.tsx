'use client';

// Deliberately plain, same reasoning as every other functional page this
// project. See docs/INTERFACE.md, on hold.
//
// Scope, per 0016's own comment: create (line items -> auto-computed
// subtotal/VAT/total), list, mark sent/paid. Marking paid also writes the
// linked income row — the actual "marking an invoice paid records income"
// behavior the handover describes, built now rather than stubbed.
// Deliberately add-only: no edit form for an invoice's line items after
// creation, same pattern already used for fund lines and appointments.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { parseInvoice, type Invoice, type InvoiceLineItem } from '@taila/core/types/invoice';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

const VAT_RATE = 0.075;

const STATUS_VARIANT: Record<string, 'green' | 'gold' | 'blue' | 'muted'> = {
  draft: 'muted',
  sent: 'gold',
  paid: 'green',
};

function formatNaira(n: number) {
  return 'NGN ' + Math.round(n).toLocaleString('en-NG');
}

// Each line: "description | qty | rate", one per line — pipe-separated so
// a comma in the description doesn't break parsing.
function parseLineItems(raw: string): InvoiceLineItem[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [desc, qtyRaw, rateRaw] = line.split('|').map((s) => s.trim());
      const qty = Number(qtyRaw) || 0;
      const rate = Number(rateRaw) || 0;
      return { desc: desc || 'Item', qty, rate, amount: qty * rate };
    });
}

export function LeadershipInvoicesClient({
  orgId,
  employeeName,
  initialInvoices,
}: {
  orgId: string;
  employeeName: string;
  initialInvoices: Invoice[];
}) {
  usePageTitle('Invoices');

  const [invoices, setInvoices] = useState(initialInvoices);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (data) setInvoices(data.map(parseInvoice));
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const items = parseLineItems((form.get('items') as string) ?? '');
    if (items.length === 0) {
      setFormError('Add at least one line item.');
      return;
    }

    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const vatAmount = subtotal * VAT_RATE;
    const amount = subtotal + vatAmount;

    setCreating(true);
    const supabase = createClient();
    const { error } = await supabase.from('invoices').insert({
      org_id: orgId,
      invoice_no: form.get('invoice_no') as string,
      client_name: (form.get('client_name') as string) || null,
      issue_date: (form.get('issue_date') as string) || null,
      due_date: (form.get('due_date') as string) || null,
      items: JSON.stringify(items),
      subtotal,
      vat_amount: vatAmount,
      amount,
      note: (form.get('note') as string) || null,
      created_by: employeeName,
    });

    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  async function handleMarkSent(invoice: Invoice) {
    setActionError(null);
    setActingId(invoice.id);
    const supabase = createClient();
    const { error } = await supabase.from('invoices').update({ status: 'sent' }).eq('id', invoice.id);
    setActingId(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    await refreshList();
  }

  async function handleMarkPaid(invoice: Invoice) {
    setActionError(null);
    setActingId(invoice.id);
    const supabase = createClient();

    const { error: invoiceErr } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id);

    if (invoiceErr) {
      setActingId(null);
      setActionError(invoiceErr.message);
      return;
    }

    // The actual point of this table per the handover: marking an invoice
    // paid records income. Best-effort in the sense that the invoice
    // status change above already succeeded and is the primary write; if
    // this second insert fails, the invoice is correctly marked paid but
    // the income entry needs adding by hand on Budget & Spend — surfaced
    // to the user rather than silently swallowed.
    const { error: incomeErr } = await supabase.from('income').insert({
      org_id: orgId,
      amount: invoice.amount,
      currency: 'NGN',
      source: 'Invoice payment',
      payer_name: invoice.client_name,
      invoice_id: invoice.id,
      invoice_no: invoice.invoice_no,
      note: `Invoice ${invoice.invoice_no} marked paid`,
    });

    setActingId(null);

    if (incomeErr) {
      setActionError(`Invoice marked paid, but the income entry could not be recorded: ${incomeErr.message}. Add it by hand on Budget & Spend.`);
    }

    await refreshList();
  }

  return (
    <div className="space-y-4">
      <Card title="New invoice">
        <form
          onSubmit={handleCreate}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label>
            Invoice number
            <input name="invoice_no" placeholder="e.g. INV-2026-0031" required />
          </label>
          <label>
            Client name
            <input name="client_name" />
          </label>
          <label>
            Issue date
            <input name="issue_date" type="date" />
          </label>
          <label>
            Due date
            <input name="due_date" type="date" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Line items — one per line, as <code>description | qty | rate</code>
            <textarea name="items" rows={4} placeholder="Consulting services | 10 | 25000" style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Note
            <input name="note" style={{ width: '100%' }} />
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <p className="text-[0.6rem] text-muted" style={{ gridColumn: '1 / -1' }}>
            VAT ({VAT_RATE * 100}%) is computed automatically from the line items and added to the total.
          </p>

          <button type="submit" disabled={creating} style={{ gridColumn: '1 / -1' }}>
            {creating ? 'Creating…' : 'Create invoice'}
          </button>
        </form>
      </Card>

      <Card title="Invoices" subtitle={`${invoices.length}`}>
        {actionError && <p style={{ color: 'crimson' }}>{actionError}</p>}
        {invoices.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No invoices created yet.</p>
        ) : (
          <ul className="space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{inv.invoice_no}</div>
                    <div className="text-[0.6rem] text-muted2 mt-0.5">
                      {[inv.client_name, inv.due_date ? `due ${inv.due_date}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.72rem] text-white">{formatNaira(inv.amount)}</div>
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'muted'}>{inv.status}</Badge>
                  </div>
                </div>
                <div className="text-[0.6rem] text-muted mt-1">
                  Subtotal {formatNaira(inv.subtotal)} + VAT {formatNaira(inv.vat_amount)}
                </div>
                {inv.status !== 'paid' && (
                  <div className="flex gap-2 mt-2">
                    {inv.status === 'draft' && (
                      <button type="button" onClick={() => handleMarkSent(inv)} disabled={actingId === inv.id}>
                        {actingId === inv.id ? '…' : 'Mark sent'}
                      </button>
                    )}
                    <button type="button" onClick={() => handleMarkPaid(inv)} disabled={actingId === inv.id}>
                      {actingId === inv.id ? '…' : 'Mark paid'}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

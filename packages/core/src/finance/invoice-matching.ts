// src/lib/finance/invoice-matching.ts
// Faithful port of axIncomeSettle's resolution order (index.html ~25062-25121).
// The legacy version resolves this from a single free-text prompt; the
// rebuild should expose it as a real search input, but the match order
// itself is exactly this, unchanged.
import type { Invoice } from '../types/invoice';

export function findMatchingInvoice(query: string, openInvoices: Invoice[]): Invoice | null {
  const raw = query.trim();
  const q = raw.toLowerCase();
  if (!q) return null;

  // 1. Exact invoice number.
  let match = openInvoices.find((i) => (i.invoice_no ?? '').toLowerCase() === q);
  if (match) return match;

  // 2. The numeric part — "31" or "0031" finds INV-2026-0031.
  const digits = raw.replace(/\D/g, '');
  if (digits) {
    match = openInvoices.find((i) => {
      const d = (i.invoice_no ?? '').replace(/\D/g, '');
      return d === digits || d.replace(/^0+/, '') === digits.replace(/^0+/, '');
    });
    if (match) return match;
  }

  // 3. Partial invoice number.
  match = openInvoices.find((i) => (i.invoice_no ?? '').toLowerCase().includes(q));
  if (match) return match;

  // 4. Client name.
  match = openInvoices.find((i) => (i.client_name ?? '').toLowerCase().includes(q));
  if (match) return match;

  return null;
  // Note: the legacy code has a 5th fallback — a bare 1-2 digit number
  // resolves to a position in the numbered list it just showed in the
  // prompt(). That only makes sense tied to a specific rendered list, so
  // it belongs in the search UI component later, not in this pure function.
}

export function isInvoiceSettled(invoice: Invoice, paidAmount: number): boolean {
  return paidAmount >= (invoice.amount ?? 0) - 0.01;
}
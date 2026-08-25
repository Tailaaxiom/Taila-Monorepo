// src/lib/types/invoice.ts
import { Database } from './database.types';

export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

export interface InvoiceLineItem {
  desc: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice extends Omit<InvoiceRow, 'items'> {
  items: InvoiceLineItem[];
}

export function parseInvoice(row: InvoiceRow): Invoice {
  let items: InvoiceLineItem[] = [];
  try {
    const parsed = JSON.parse(row.items ?? '[]');
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }
  return { ...row, items };
}
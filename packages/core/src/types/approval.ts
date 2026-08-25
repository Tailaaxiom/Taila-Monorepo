// src/lib/types/approval.ts
import { Database } from './database.types';

export type ApprovalRow = Database['public']['Tables']['approvals']['Row'];

export interface ApprovalRequestedItem {
  desc?: string;
  qty?: number;
  [key: string]: unknown; // shape varies by request type (mfg stock, purchase, etc.)
}

export interface Approval extends Omit<ApprovalRow, 'req_items'> {
  reqItems: ApprovalRequestedItem[];
}

export function parseApproval(row: ApprovalRow): Approval {
  let reqItems: ApprovalRequestedItem[] = [];
  try {
    const parsed = JSON.parse(row.req_items ?? '[]');
    if (Array.isArray(parsed)) reqItems = parsed;
  } catch {
    reqItems = [];
  }
  return { ...row, reqItems };
}
'use client';

// Deliberately identical body to HodRequestsClient — same approvals table,
// same "submit and see your own status only" scope. Kept as its own file
// rather than imported cross-route, matching how every other near-identical
// pair of pages in this project owns its client component (see
// HodProjectsClient's own comment for the same call). Only real difference:
// usePageTitle('Requests') to match this page's own NAVMAP label (shared
// with HOD's, since both pages are literally named "Requests").

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { parseApproval, type Approval } from '@taila/core/types/approval';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

const REQUEST_TYPES = ['leave', 'expense', 'supply', 'other'] as const;

const STATUS_VARIANT: Record<string, 'green' | 'gold' | 'red' | 'muted'> = {
  approved: 'green',
  pending: 'gold',
  rejected: 'red',
};

export function StaffRequestsClient({
  orgId,
  department,
  employeeCode,
  employeeName,
  initialRequests,
}: {
  orgId: string;
  department: string | null;
  employeeCode: string;
  employeeName: string;
  initialRequests: Approval[];
}) {
  usePageTitle('Requests');

  const [requests, setRequests] = useState(initialRequests);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('requester_code', employeeCode)
      .order('created_at', { ascending: false });
    if (data) setRequests(data.map(parseApproval));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const itemsRaw = (form.get('items') as string) ?? '';
    const items = itemsRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((desc) => ({ desc }));

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('approvals').insert({
      org_id: orgId,
      requester_code: employeeCode,
      requester_name: employeeName,
      department,
      request_type: form.get('request_type') as string,
      req_items: items.length > 0 ? JSON.stringify(items) : null,
      note: (form.get('note') as string) || null,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  return (
    <div className="space-y-4">
      <Card title="New request">
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Type
            <select name="request_type" defaultValue="leave">
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Items (one per line)
            <textarea name="items" rows={3} placeholder="e.g. 3 days annual leave, 12–14 Sep" style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Note
            <textarea name="note" rows={2} style={{ width: '100%' }} />
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </Card>

      <Card title="My requests" subtitle={`${requests.length}`}>
        {requests.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            No requests submitted yet. There is no review page to act on these yet — a real,
            stated gap, not a bug (see docs/EXECUTION.md).
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div className="text-[0.72rem] text-white capitalize">{r.request_type}</div>
                  <Badge variant={STATUS_VARIANT[r.status] ?? 'muted'}>{r.status}</Badge>
                </div>
                {r.reqItems.length > 0 && (
                  <ul className="text-[0.68rem] text-muted2 mt-1 list-disc pl-4">
                    {r.reqItems.map((item, i) => (
                      <li key={i}>{item.desc ?? JSON.stringify(item)}</li>
                    ))}
                  </ul>
                )}
                {r.note && <p className="text-[0.68rem] text-muted2 mt-1">{r.note}</p>}
                <div className="text-[0.6rem] text-muted mt-1">{new Date(r.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

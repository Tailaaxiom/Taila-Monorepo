'use client';

// Deliberately plain, same reasoning as every other functional page this
// project. See docs/INTERFACE.md, on hold.
//
// reviewed_by stores the reviewer's full name, not a code — see 0015's own
// comment: approvals has no paired reviewed_by_name column, and
// expenses.created_by (a name, not a code) is the closer precedent than
// requester_code/requester_name.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { parseApproval, type Approval } from '@taila/core/types/approval';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

const STATUS_VARIANT: Record<string, 'green' | 'gold' | 'red' | 'muted'> = {
  approved: 'green',
  pending: 'gold',
  rejected: 'red',
};

export function LeadershipApprovalsClient({
  reviewerName,
  initialRequests,
}: {
  reviewerName: string;
  initialRequests: Approval[];
}) {
  usePageTitle('Approvals');

  const [requests, setRequests] = useState(initialRequests);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase.from('approvals').select('*').order('created_at', { ascending: false });
    if (data) setRequests(data.map(parseApproval));
  }

  async function handleDecide(id: string, status: 'approved' | 'rejected') {
    setActionError(null);
    setDecidingId(id);

    const supabase = createClient();
    const { error } = await supabase
      .from('approvals')
      .update({ status, reviewed_by: reviewerName, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    setDecidingId(null);

    if (error) {
      setActionError(error.message);
      return;
    }

    await refreshList();
  }

  return (
    <div className="space-y-4">
      <Card title="Pending" subtitle={`${pending.length} awaiting review`}>
        {actionError && <p style={{ color: 'crimson' }}>{actionError}</p>}
        {pending.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing waiting on a decision.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white capitalize">{r.request_type}</div>
                    <div className="text-[0.6rem] text-muted2 mt-0.5">
                      {r.requester_name ?? r.requester_code}{r.department ? ` · ${r.department}` : ''}
                    </div>
                  </div>
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
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => handleDecide(r.id, 'approved')} disabled={decidingId === r.id}>
                    {decidingId === r.id ? '…' : 'Approve'}
                  </button>
                  <button type="button" onClick={() => handleDecide(r.id, 'rejected')} disabled={decidingId === r.id}>
                    {decidingId === r.id ? '…' : 'Reject'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Reviewed" subtitle={`${reviewed.length}`}>
        {reviewed.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No decisions made yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviewed.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white capitalize">{r.request_type}</div>
                    <div className="text-[0.6rem] text-muted2 mt-0.5">
                      {r.requester_name ?? r.requester_code}{r.department ? ` · ${r.department}` : ''}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[r.status] ?? 'muted'}>{r.status}</Badge>
                </div>
                <div className="text-[0.6rem] text-muted mt-1">
                  {r.reviewed_by ? `by ${r.reviewed_by}` : ''}{r.reviewed_at ? ` · ${new Date(r.reviewed_at).toLocaleString()}` : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

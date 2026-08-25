// apps/ngo/src/app/(app)/messages/MessagesClient.tsx
'use client';

// Deliberately plain, same reasoning as every other functional page this
// session. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';

export interface MessageItem {
  id: string;
  sender_code: string;
  sender_name: string;
  recipient_code: string;
  body: string;
  created_at: string;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function MessagesClient({
  orgId,
  employeeCode,
  employeeName,
  initialItems,
}: {
  orgId: string;
  employeeCode: string;
  employeeName: string;
  initialItems: MessageItem[];
}) {
  usePageTitle('Messages');

  const [items, setItems] = useState(initialItems);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('id, sender_code, sender_name, recipient_code, body, created_at')
      .order('created_at', { ascending: false });
    if (data) setItems(data as MessageItem[]);
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const recipientCode = ((form.get('recipient_code') as string) ?? '').trim();
    const body = ((form.get('body') as string) ?? '').trim();

    if (!recipientCode || !body) {
      setFormError('Recipient code and message are both required.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('messages').insert({
      org_id: orgId,
      sender_code: employeeCode,
      sender_name: employeeName,
      recipient_code: recipientCode,
      body,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    (e.target as HTMLFormElement).reset();
    await refreshList();
  }

  const inbox = items.filter((m) => m.recipient_code === employeeCode);
  const sent = items.filter((m) => m.sender_code === employeeCode);

  return (
    <div className="space-y-4">
      <Card title="Send a message">
        <form
          onSubmit={handleSend}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label>
            To (employee code)
            <input name="recipient_code" placeholder="KDI-1001" required style={{ width: '100%' }} />
          </label>
          <div />
          <label style={{ gridColumn: '1 / -1' }}>
            Message
            <textarea name="body" required rows={3} style={{ width: '100%' }} />
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </form>
      </Card>

      <Card title="Inbox" subtitle={`${inbox.length}`}>
        {inbox.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing received yet.</p>
        ) : (
          <ul className="space-y-2">
            {inbox.map((m) => (
              <li key={m.id} className="py-2 border-b border-border last:border-none">
                <div className="text-[0.72rem] text-white">{m.body}</div>
                <div className="text-[0.6rem] text-muted mt-1">
                  From {m.sender_name} ({m.sender_code}) · {formatWhen(m.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Sent" subtitle={`${sent.length}`}>
        {sent.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {sent.map((m) => (
              <li key={m.id} className="py-2 border-b border-border last:border-none opacity-80">
                <div className="text-[0.72rem] text-white">{m.body}</div>
                <div className="text-[0.6rem] text-muted mt-1">
                  To {m.recipient_code} · {formatWhen(m.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

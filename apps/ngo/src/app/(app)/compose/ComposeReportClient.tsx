// apps/ngo/src/app/(app)/compose/ComposeReportClient.tsx
'use client';

// Deliberately plain, same reasoning as every other functional page this
// session. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface SummaryReportItem {
  id: string;
  author_name: string | null;
  department: string | null;
  period: string;
  content: string;
  status: string;
  created_at: string;
}

export function ComposeReportClient({
  orgId,
  employeeCode,
  employeeName,
  department,
  initialItems,
}: {
  orgId: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  initialItems: SummaryReportItem[];
}) {
  usePageTitle('Compose Report');

  const [items, setItems] = useState(initialItems);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('summary_reports')
      .select('id, author_name, department, period, content, status, created_at')
      .order('created_at', { ascending: false });
    if (data) setItems(data as SummaryReportItem[]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const period = (form.get('period') as string)?.trim();
    const content = (form.get('content') as string)?.trim();

    if (!period || !content) {
      setFormError('Period and content are both required.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('summary_reports').insert({
      org_id: orgId,
      author_code: employeeCode,
      author_name: employeeName,
      department,
      period,
      content,
      status: 'submitted',
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
      <Card title="Compose">
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            Period
            <input name="period" placeholder="e.g. August 2026" required style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Report
            <textarea name="content" rows={6} required style={{ width: '100%' }} />
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Submitting…' : 'Submit report'}
          </button>
        </form>
      </Card>

      <Card title="Recent reports" subtitle={`${items.length}`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{r.author_name ?? 'Unknown'} · {r.period}</div>
                    <div className="text-[0.6rem] text-muted mt-1">{r.department ?? '—'}</div>
                  </div>
                  <Badge variant={r.status === 'submitted' ? 'green' : 'muted'}>{r.status}</Badge>
                </div>
                <p className="text-[0.68rem] text-muted2 mt-2 whitespace-pre-wrap">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
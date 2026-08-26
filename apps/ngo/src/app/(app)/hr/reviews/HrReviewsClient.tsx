'use client';

// Deliberately plain, same reasoning as every other functional page this
// project. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface ReviewItem {
  id: string;
  employee_code: string;
  employee_name: string | null;
  reviewer_code: string | null;
  reviewer_name: string | null;
  period: string;
  rating: number | null;
  strengths: string | null;
  areas_for_growth: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export function HrReviewsClient({
  orgId,
  reviewerCode,
  reviewerName,
  initialReviews,
}: {
  orgId: string;
  reviewerCode: string;
  reviewerName: string;
  initialReviews: ReviewItem[];
}) {
  usePageTitle('Performance Reviews');

  const [reviews, setReviews] = useState(initialReviews);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('performance_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setReviews(data as ReviewItem[]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const form = new FormData(e.currentTarget);
    const employeeCode = (form.get('employee_code') as string)?.trim();
    const period = (form.get('period') as string)?.trim();
    const ratingRaw = form.get('rating') as string;

    if (!employeeCode || !period) {
      setFormError('Employee code and period are both required.');
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('performance_reviews').insert({
      org_id: orgId,
      employee_code: employeeCode,
      employee_name: (form.get('employee_name') as string) || null,
      reviewer_code: reviewerCode,
      reviewer_name: reviewerName,
      period,
      rating: ratingRaw ? Number(ratingRaw) : null,
      strengths: (form.get('strengths') as string) || null,
      areas_for_growth: (form.get('areas_for_growth') as string) || null,
      notes: (form.get('notes') as string) || null,
      status: (form.get('status') as string) || 'draft',
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
      <Card title="New review">
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label>
            Employee code
            <input name="employee_code" placeholder="e.g. KDI-1043" required />
          </label>
          <label>
            Employee name
            <input name="employee_name" />
          </label>
          <label>
            Period
            <input name="period" placeholder="e.g. H2 2026" required />
          </label>
          <label>
            Rating (1–5)
            <input name="rating" type="number" min="1" max="5" step="0.1" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Strengths
            <textarea name="strengths" rows={2} style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Areas for growth
            <textarea name="areas_for_growth" rows={2} style={{ width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Notes
            <textarea name="notes" rows={2} style={{ width: '100%' }} />
          </label>
          <label>
            Status
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </label>

          {formError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{formError}</p>}

          <button type="submit" disabled={submitting} style={{ gridColumn: '1 / -1' }}>
            {submitting ? 'Saving…' : 'Save review'}
          </button>
        </form>
      </Card>

      <Card title="All reviews" subtitle={`${reviews.length}`}>
        {reviews.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No reviews recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">
                      {r.employee_name ?? r.employee_code} · {r.period}
                      {r.rating != null && <span className="text-muted2"> · {r.rating}/5</span>}
                    </div>
                    <div className="text-[0.6rem] text-muted mt-1">
                      Reviewed by {r.reviewer_name ?? r.reviewer_code ?? '—'}
                    </div>
                  </div>
                  <Badge variant={r.status === 'submitted' ? 'green' : 'muted'}>{r.status}</Badge>
                </div>
                {r.strengths && <p className="text-[0.68rem] text-muted2 mt-2"><strong>Strengths:</strong> {r.strengths}</p>}
                {r.areas_for_growth && <p className="text-[0.68rem] text-muted2 mt-1"><strong>Areas for growth:</strong> {r.areas_for_growth}</p>}
                {r.notes && <p className="text-[0.68rem] text-muted2 mt-1">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

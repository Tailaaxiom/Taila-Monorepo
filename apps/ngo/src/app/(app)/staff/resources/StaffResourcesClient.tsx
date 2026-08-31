'use client';

// Read-only view over media, org-wide — see page.tsx's comment for why
// this is scoped differently from Media Library. No upload form, no
// donor_visible toggle (that's Media Library's/leadership's job); the only
// interaction here is generating a signed URL to view a file, same pattern
// already used on the donor Media Library and hod/leadership media pages.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';

export interface MediaItem {
  id: number;
  caption: string | null;
  file_path: string;
  file_type: string | null;
  department: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export function StaffResourcesClient({ items }: { items: MediaItem[] }) {
  usePageTitle('Resources');

  const [viewingId, setViewingId] = useState<number | null>(null);

  async function handleView(item: MediaItem) {
    setViewingId(item.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage.from('media').createSignedUrl(item.file_path, 60);
    setViewingId(null);

    if (error || !data) {
      alert(`Could not open this file: ${error?.message ?? 'unknown error'}`);
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  return (
    <div className="space-y-4">
      <Card title="Resources" subtitle={`${items.length} files across the org`}>
        <p className="text-[0.68rem] text-muted2 mb-3">
          Shared reference library — every department&apos;s media, read-only here. Templates are
          not yet part of this page (no table exists for them yet — a separate, still-open gap,
          see docs/EXECUTION.md).
        </p>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <div>
                  <div className="text-[0.72rem] text-white">{item.caption ?? 'Untitled'}</div>
                  <div className="text-[0.6rem] text-muted mt-1">
                    {[item.department, item.file_type, item.uploaded_by_name].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button type="button" onClick={() => handleView(item)} disabled={viewingId === item.id}>
                  {viewingId === item.id ? 'Opening…' : 'View'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

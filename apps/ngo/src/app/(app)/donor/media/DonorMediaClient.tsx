// apps/ngo/src/app/(app)/donor/media/DonorMediaClient.tsx
'use client';

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';

export interface MediaItem {
  id: number;
  caption: string | null;
  file_path: string;
  file_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export function DonorMediaClient({ items }: { items: MediaItem[] }) {
  usePageTitle('Media Library');
  const [viewingId, setViewingId] = useState<number | null>(null);

  async function handleView(item: MediaItem) {
    setViewingId(item.id);
    const supabase = createClient();
    // Exercises media_storage_select_by_donor (0007) directly — this only
    // succeeds if a media row with this exact path, this org, and
    // donor_visible = true exists. Anyone else's file, or one not shared,
    // fails here even with a guessed or leaked path.
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
      <div className="font-display text-[1.8rem] font-light text-white">Media Library</div>

      <Card title="Shared with you">
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">
            Nothing has been shared yet. The organization chooses what appears here.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <div>
                  <div className="text-[0.72rem] text-white">{item.caption ?? 'Untitled'}</div>
                  <div className="text-[0.6rem] text-muted mt-1">
                    {[item.file_type, item.uploaded_by_name].filter(Boolean).join(' · ')}
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
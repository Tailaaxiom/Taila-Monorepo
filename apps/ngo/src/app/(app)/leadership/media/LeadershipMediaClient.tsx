// apps/ngo/src/app/(app)/leadership/media/LeadershipMediaClient.tsx
'use client';

// Deliberately plain, same reasoning as every other functional page this
// session. See docs/INTERFACE.md, on hold.

import { useState } from 'react';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';

export interface MediaItem {
  id: number;
  caption: string | null;
  file_path: string;
  file_type: string | null;
  department: string | null;
  donor_visible: boolean;
  uploaded_by_name: string | null;
  created_at: string;
}

export function LeadershipMediaClient({
  orgId,
  employeeCode,
  employeeName,
  initialItems,
}: {
  orgId: string;
  employeeCode: string;
  employeeName: string;
  initialItems: MediaItem[];
}) {
  usePageTitle('Media Library');

  const [items, setItems] = useState(initialItems);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function refreshList() {
    const supabase = createClient();
    const { data } = await supabase
      .from('media')
      .select('id, caption, file_path, file_type, department, donor_visible, uploaded_by_name, created_at')
      .order('created_at', { ascending: false });
    if (data) setItems(data as MediaItem[]);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('file') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setUploadError('Choose a file first.');
      return;
    }

    setUploading(true);
    const supabase = createClient();

    // Path starts with org_id — the storage RLS policies (0007) key off
    // this exact prefix via storage.foldername(name)[1]. Getting this wrong
    // means the upload fails at the storage layer even if the media table
    // insert below would have succeeded.
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${orgId}/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadErr } = await supabase.storage.from('media').upload(path, file);
    if (uploadErr) {
      setUploading(false);
      setUploadError(`Upload failed: ${uploadErr.message}`);
      return;
    }

    const form2 = new FormData(form);
    const { error: insertErr } = await supabase.from('media').insert({
      org_id: orgId,
      caption: (form2.get('caption') as string) || null,
      file_path: path,
      file_type: file.type || null,
      department: (form2.get('department') as string) || null,
      donor_visible: form2.get('donor_visible') === 'on',
      uploaded_by_code: employeeCode,
      uploaded_by_name: employeeName,
    });

    setUploading(false);

    if (insertErr) {
      // The file is now in storage but has no media row — an orphan, not
      // reachable by anyone since no row means no signed URL will ever be
      // requested for it, but also not cleaned up automatically. A real
      // gap; noted in docs/EXECUTION.md rather than silently left unstated.
      setUploadError(`File uploaded but could not be recorded: ${insertErr.message}`);
      return;
    }

    form.reset();
    await refreshList();
  }

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

  async function handleToggleVisible(item: MediaItem) {
    setTogglingId(item.id);
    const supabase = createClient();
    const { error } = await supabase
      .from('media')
      .update({ donor_visible: !item.donor_visible })
      .eq('id', item.id);
    setTogglingId(null);

    if (error) {
      alert(`Could not change visibility: ${error.message}`);
      return;
    }
    await refreshList();
  }

  return (
    <div className="space-y-4">
      <Card title="Upload">
        <form
          onSubmit={handleUpload}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 560, fontFamily: 'sans-serif' }}
        >
          <label style={{ gridColumn: '1 / -1' }}>
            File
            <input name="file" type="file" required style={{ display: 'block', width: '100%' }} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Caption
            <input name="caption" style={{ width: '100%' }} />
          </label>
          <label>
            Department
            <input name="department" placeholder="e.g. Field Operations" />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18 }}>
            <input name="donor_visible" type="checkbox" />
            Share with donors
          </label>

          {uploadError && <p style={{ color: 'crimson', gridColumn: '1 / -1' }}>{uploadError}</p>}

          <button type="submit" disabled={uploading} style={{ gridColumn: '1 / -1' }}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </Card>

      <Card title="All media" subtitle={`${items.length} files`}>
        {items.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">Nothing uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <div>
                  <div className="text-[0.72rem] text-white">{item.caption ?? 'Untitled'}</div>
                  <div className="text-[0.6rem] text-muted mt-1">
                    {[item.file_type, item.department, item.uploaded_by_name].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.donor_visible ? 'green' : 'muted'}>
                    {item.donor_visible ? 'Shared with donors' : 'Internal only'}
                  </Badge>
                  <button type="button" onClick={() => handleToggleVisible(item)} disabled={togglingId === item.id}>
                    {togglingId === item.id ? '…' : item.donor_visible ? 'Unshare' : 'Share'}
                  </button>
                  <button type="button" onClick={() => handleView(item)} disabled={viewingId === item.id}>
                    {viewingId === item.id ? 'Opening…' : 'View'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { Card } from '@taila/core/components/ui/Card';

function ComingSoonContent() {
  const params = useSearchParams();
  const pageId = params.get('page') ?? 'this page';
  usePageTitle('Not built yet');

  return (
    <Card>
      <p className="text-[0.8rem] text-white mb-1">This page hasn&apos;t been rebuilt yet.</p>
      <p className="text-[0.68rem] text-muted">
        <span className="text-gold-light">{pageId}</span> is still on the legacy roadmap for a later phase.
      </p>
    </Card>
  );
}

export default function ComingSoonPage() {
  // useSearchParams needs a Suspense boundary in the App Router, or Next.js
  // will fail static generation for this page.
  return (
    <Suspense fallback={null}>
      <ComingSoonContent />
    </Suspense>
  );
}
// apps/ngo/src/app/(app)/donor/impact/DonorImpactClient.tsx
'use client';

// Deliberately plain, same reasoning as every other functional page this
// session. See docs/INTERFACE.md, on hold. Read-only: no form on this page,
// by design — a donor should never be able to write here regardless of what
// RLS would separately allow a staff account to do.

import { usePageTitle } from '@taila/core/components/shell/AppShell';
import { useCurrentUser } from '@taila/core/context/current-user';
import { Card } from '@taila/core/components/ui/Card';
import { Badge } from '@taila/core/components/ui/Badge';
import { StatTile } from '@taila/core/components/ui/StatTile';

export interface ActivityItem {
  id: number;
  title: string;
  activity_type: string | null;
  activity_date: string | null;
  location: string | null;
  beneficiaries: number | null;
  impact_score: number | null;
}

export interface ProgrammeItem {
  id: number;
  name: string;
  status: string | null;
}

export function DonorImpactClient({
  activities,
  programmes,
}: {
  activities: ActivityItem[];
  programmes: ProgrammeItem[];
}) {
  usePageTitle('Impact Report');
  const { org } = useCurrentUser();

  const totalBeneficiaries = activities.reduce((sum, a) => sum + (a.beneficiaries ?? 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.56rem] tracking-[0.2em] uppercase text-gold mb-1">{org.name}</div>
        <div className="font-display text-[1.8rem] font-light text-white">Impact Report</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile label="Activities" value={activities.length} tone="gold" />
        <StatTile label="Beneficiaries reached" value={totalBeneficiaries} tone="green" />
        <StatTile label="Programmes" value={programmes.length} tone="blue" />
      </div>

      <Card title="Programmes">
        {programmes.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No programmes recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {programmes.map((p) => (
              <li key={p.id} className="flex justify-between items-center py-2 border-b border-border last:border-none">
                <span className="text-[0.72rem] text-white">{p.name}</span>
                <Badge variant={p.status === 'active' ? 'green' : 'muted'}>{p.status ?? 'unspecified'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Activities" subtitle="Ordered by impact">
        {activities.length === 0 ? (
          <p className="text-[0.72rem] text-muted py-2">No activities recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="py-2 border-b border-border last:border-none">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-[0.72rem] text-white">{a.title}</div>
                    <div className="text-[0.6rem] text-muted mt-1">
                      {[a.activity_type, a.location, a.activity_date].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {a.beneficiaries != null && (
                    <span className="text-[0.7rem] text-green whitespace-nowrap">{a.beneficiaries} reached</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
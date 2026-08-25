import { Database } from './database.types';

export type TaskRow = Database['public']['Tables']['tasks']['Row'];

// `budget` and a bare `deliverables` column both used to be destructured
// here defensively, back when TaskRow came from the legacy manufacturing
// schema and had far more columns than the real tasks table (0005) ever
// created. Neither exists in the real schema — `budget` was already found
// to be dead in the original legacy audit (see docs/LEARNINGS.md), and
// deliverables only ever existed as deliverables_json. Removed once real
// types (regenerated against the live project) made the mismatch a
// compile error instead of something silently tolerated.
export interface Task
  extends Omit<
    TaskRow,
    'deliverables_json' | 'deliverables_done' | 'proof_required' |
    'geofence_label' | 'geofence_lat' | 'geofence_lng' | 'geofence_m'
  > {
  deliverables: string[];
  deliverablesDone: string[];
  proofRequired: string[];
  geofenceLabel: string | null;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadiusM: number | null;
}

export function parseTask(row: TaskRow): Task {
  const { geofence_label, geofence_lat, geofence_lng, geofence_m, ...rest } = row;
  return {
    ...rest,
    deliverables: safeJsonArray(row.deliverables_json),
    deliverablesDone: safeJsonArray(row.deliverables_done),
    proofRequired: (row.proof_required ?? '').split(',').filter(Boolean),
    geofenceLabel: geofence_label,
    geofenceLat: geofence_lat,
    geofenceLng: geofence_lng,
    geofenceRadiusM: geofence_m,
  };
}

function safeJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
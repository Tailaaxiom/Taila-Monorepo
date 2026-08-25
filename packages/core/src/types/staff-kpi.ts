// src/lib/types/staff-kpi.ts
import { Database } from './database.types';

export type StaffKpiRow = Database['public']['Tables']['staff_kpis']['Row'];

export type KpiMetric = 'tasks_done' | 'activities' | 'hours' | 'ontime' | 'tasks_assigned' | 'beneficiaries';
export type KpiCadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface StaffKpi extends Omit<StaffKpiRow, 'metric' | 'cadence'> {
  metric: KpiMetric | null;
  cadence: KpiCadence | null;
}

export function parseStaffKpi(row: StaffKpiRow): StaffKpi {
  return { ...row, metric: row.metric as KpiMetric | null, cadence: row.cadence as KpiCadence | null };
}
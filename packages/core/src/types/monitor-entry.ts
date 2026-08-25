// src/lib/types/monitor-entry.ts
import { Database } from './database.types';
export type MonitorEntryRow = Database['public']['Tables']['monitor_entries']['Row'];
export type MonitorEntry = MonitorEntryRow;
export function parseMonitorEntry(row: MonitorEntryRow): MonitorEntry { return row; }
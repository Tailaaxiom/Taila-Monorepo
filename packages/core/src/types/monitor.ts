// src/lib/types/monitor.ts
import { Database } from './database.types';
export type MonitorRow = Database['public']['Tables']['monitors']['Row'];
export type Monitor = MonitorRow;
export function parseMonitor(row: MonitorRow): Monitor { return row; }
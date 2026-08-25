// src/lib/monitoring/aggregate.ts
// Faithful port of the board aggregation (index.html ~28228).
import type { MonitorEntry } from '../types/monitor-entry';

export interface MonitorAggregate {
  total: number;
  count: number;
  recent: MonitorEntry[]; // most recent 3
}

export function aggregateMonitorEntries(entries: MonitorEntry[]): Record<string, MonitorAggregate> {
  const agg: Record<string, MonitorAggregate> = {};
  entries.forEach((e) => {
    const k = e.monitor_id ?? 'unknown';
    if (!agg[k]) agg[k] = { total: 0, count: 0, recent: [] };
    agg[k].total += Number(e.value) || 0;
    agg[k].count++;
    if (agg[k].recent.length < 3) agg[k].recent.push(e);
  });
  return agg;
}
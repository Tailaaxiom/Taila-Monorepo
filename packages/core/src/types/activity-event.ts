// src/lib/types/activity-event.ts
import { Database } from './database.types';
export type ActivityEventRow = Database['public']['Tables']['activity_events']['Row'];
export type ActivityEvent = ActivityEventRow;
export function parseActivityEvent(row: ActivityEventRow): ActivityEvent { return row; }
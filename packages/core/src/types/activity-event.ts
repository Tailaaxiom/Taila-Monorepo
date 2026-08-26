import { Database } from './database.types';

export type ActivityEventRow = Database['public']['Tables']['activity_events']['Row'];

export type ActivityEvent = ActivityEventRow; // metadata stays Json — native, no decode step needed

export function parseActivityEvent(row: ActivityEventRow): ActivityEvent {
  return row;
}

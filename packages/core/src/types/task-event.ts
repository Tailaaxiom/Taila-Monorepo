// src/lib/types/task-event.ts
import { Database } from './database.types';
export type TaskEventRow = Database['public']['Tables']['task_events']['Row'];
export type TaskEvent = TaskEventRow;
export function parseTaskEvent(row: TaskEventRow): TaskEvent { return row; }
// src/lib/types/task-stop.ts
import { Database } from './database.types';
export type TaskStopRow = Database['public']['Tables']['task_stops']['Row'];
export type TaskStop = TaskStopRow;
export function parseTaskStop(row: TaskStopRow): TaskStop { return row; }
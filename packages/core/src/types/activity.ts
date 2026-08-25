// src/lib/types/activity.ts
import { Database } from './database.types';
export type ActivityRow = Database['public']['Tables']['activities']['Row'];
export type Activity = ActivityRow;
export function parseActivity(row: ActivityRow): Activity { return row; }
// custom_data / extra_fields are native jsonb (Json), not JSON-in-text like
// deliverables_json or org.modules — no decode step needed here. Worth a
// spot-check against real usage once a page actually reads these two
// fields, in case that assumption doesn't hold under closer inspection.
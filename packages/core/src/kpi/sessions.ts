// src/lib/kpi/sessions.ts
import type { ActivityEvent } from '../types/activity-event';

export const MAX_SESSION_HOURS = 12; // nobody is at a desk longer than this in one sitting

export interface WorkSession {
  code: string;
  name: string;
  role: string | null;
  start: Date;
  end: Date;
  hours: number;
  unclosed: boolean;
  capped: boolean;
  day: string;
}

interface OpenSession {
  at: Date;
  name: string;
  role: string | null;
}

export function buildSessions(events: ActivityEvent[]): WorkSession[] {
  const byUser: Record<string, ActivityEvent[]> = {};

  [...events]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((e) => {
      const k = e.user_code || e.user_name || 'unknown';
      (byUser[k] ??= []).push(e);
    });

  const out: WorkSession[] = [];

  const mk = (o: OpenSession, end: Date, unclosed: boolean, code: string): WorkSession => {
    let hours = (end.getTime() - o.at.getTime()) / 3_600_000;
    let capped = false;
    if (hours > MAX_SESSION_HOURS) { hours = MAX_SESSION_HOURS; capped = true; }
    if (hours < 0) hours = 0;
    return { code, name: o.name, role: o.role, start: o.at, end, hours, unclosed, capped, day: o.at.toISOString().slice(0, 10) };
  };

  Object.entries(byUser).forEach(([k, list]) => {
    let open: OpenSession | null = null;
    let lastSeen: Date | null = null;

    list.forEach((e) => {
      const at = new Date(e.created_at);
      if (e.event_type === 'login') {
        if (open) {
          const stillOpen = open; // freeze the narrowed type here
          out.push(mk(stillOpen, lastSeen ?? stillOpen.at, true, k));
        }
        open = { at, name: e.user_name || k, role: e.role };
        lastSeen = at;
      } else {
        lastSeen = at;
        if (e.event_type === 'logout' && open) {
          const stillOpen = open;
          out.push(mk(stillOpen, at, false, k));
          open = null;
        }
      }
    });

    if (open) {
      const stillOpen: OpenSession = open; // same fix, applies to the same variable after the loop
      out.push(mk(stillOpen, lastSeen ?? stillOpen.at, true, k));
    }
  });

  return out.sort((a, b) => b.start.getTime() - a.start.getTime());
}
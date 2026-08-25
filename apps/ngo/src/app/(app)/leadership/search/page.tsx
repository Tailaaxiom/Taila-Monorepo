// apps/ngo/src/app/(app)/leadership/search/page.tsx
//
// Deliberately NOT split into a server page + client component, unlike
// every other page this session. The only interaction here is typing a
// term and submitting — a native <form method="GET"> handles that with a
// plain URL parameter, no client-side state needed. Reach for the split
// when there's real interactivity (a write, a toggle, live refetching);
// don't reproduce it out of habit when a page doesn't call for it.
//
// Global search across the tenant's records (handover section 2). No new
// table — reads directly across six existing ones. Each query is subject to
// that table's own RLS exactly as it would be anywhere else: a search run
// by HOD or HR will silently return zero funders results, for instance,
// because funders_read_by_finance (0004) already excludes those roles —
// RLS does the filtering here, not this page's own logic.

import { createClient, getCurrentEmployee } from '@/lib/supabase/server';

// ILIKE treats % and _ as wildcards — escape them so a search for "50%"
// doesn't behave like a wildcard match on "50" followed by anything.
function escapeLike(term: string) {
  return term.replace(/[%_]/g, (c) => `\\${c}`);
}

const RESULT_LIMIT = 8;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const employee = await getCurrentEmployee();
  if (!employee) return null;
  if (!['leadership', 'hr', 'hod'].includes(employee.role)) {
    return (
      <div style={{ maxWidth: 480, fontFamily: 'sans-serif' }}>
        <h1>Not permitted</h1>
        <p>Search is available to leadership, HR, and HOD accounts.</p>
      </div>
    );
  }

  const { q } = await searchParams;
  const term = q?.trim();

  let results: { section: string; rows: { label: string; sub?: string }[] }[] = [];

  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    const supabase = await createClient();

    const [tasks, projects, employees, funders, activities, media] = await Promise.all([
      supabase.from('tasks').select('title, dept, status').ilike('title', pattern).limit(RESULT_LIMIT),
      supabase.from('projects').select('name, location, status').ilike('name', pattern).limit(RESULT_LIMIT),
      supabase.from('employees').select('full_name, employee_code, role').ilike('full_name', pattern).limit(RESULT_LIMIT),
      supabase.from('funders').select('funder_name, source_type').ilike('funder_name', pattern).limit(RESULT_LIMIT),
      supabase.from('activities').select('title, location, activity_date').ilike('title', pattern).limit(RESULT_LIMIT),
      supabase.from('media').select('caption, file_type').ilike('caption', pattern).limit(RESULT_LIMIT),
    ]);

    results = [
      { section: 'Tasks', rows: (tasks.data ?? []).map((t) => ({ label: t.title, sub: [t.dept, t.status].filter(Boolean).join(' · ') })) },
      { section: 'Projects', rows: (projects.data ?? []).map((p) => ({ label: p.name, sub: [p.location, p.status].filter(Boolean).join(' · ') })) },
      { section: 'People', rows: (employees.data ?? []).map((e) => ({ label: e.full_name, sub: [e.employee_code, e.role].filter(Boolean).join(' · ') })) },
      { section: 'Funders', rows: (funders.data ?? []).map((f) => ({ label: f.funder_name, sub: f.source_type ?? undefined })) },
      { section: 'Activities', rows: (activities.data ?? []).map((a) => ({ label: a.title, sub: [a.location, a.activity_date].filter(Boolean).join(' · ') })) },
      { section: 'Media', rows: (media.data ?? []).map((m) => ({ label: m.caption ?? 'Untitled', sub: m.file_type ?? undefined })) },
    ].filter((s) => s.rows.length > 0);
  }

  return (
    <div style={{ maxWidth: 640, fontFamily: 'sans-serif' }}>
      <h1>Search</h1>

      <form method="GET" style={{ marginBottom: 24 }}>
        <input
          name="q"
          defaultValue={term ?? ''}
          placeholder="Search tasks, projects, people, funders, activities, media…"
          autoFocus
          style={{ width: '100%', padding: '0.5rem', fontSize: 14 }}
        />
      </form>

      {!term && <p style={{ color: '#888' }}>Type something and press Enter.</p>}

      {term && results.length === 0 && (
        <p style={{ color: '#888' }}>No results for "{term}".</p>
      )}

      {results.map(({ section, rows }) => (
        <div key={section} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>
            {section}
          </h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {rows.map((r, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ fontSize: 14 }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: 12, color: '#888' }}>{r.sub}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
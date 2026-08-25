# CLAUDE.md

Read this first. Then read `docs/EXECUTION.md`, `docs/LEARNINGS.md`, and
`docs/INTERFACE.md` before starting any nontrivial task — they hold the
actual history and hard-won rules this file only summarizes. **Append to
EXECUTION.md and LEARNINGS.md as you work**, not just at the end — that's
the whole point of the convention.

## What this is

A monorepo. `packages/core` is a shared, sector-neutral toolbox (types,
Supabase RLS-aware helpers, gating logic, UI primitives). `apps/ngo` is one
sector app built on it — the only one that exists so far. More sector apps
may be added later as siblings of `apps/ngo`, reusing `packages/core`.

```
packages/core/src/
  types/        generated + hand-written types, one parseX() per table shape
  gating/       NAVMAP, SECTOR_MODULES, resolver.ts, page-routes.ts
  context/      current-user.tsx — generic, NO default data, see below
  components/   ui/ (Card, Badge, StatTile), shell/ (AppShell, Sidebar, TopBar)
  projects/, finance/, tasks/, kpi/, monitoring/   ported pure business logic

apps/ngo/src/
  app/(auth)/     sign-in, activate — must render with NO session
  app/(app)/      everything else — layout.tsx requires a real session
  lib/supabase/   client.ts (browser), server.ts (server components/routes),
                  admin.ts (service role, narrow, server-only)
  lib/auth/       identity.ts, setup-tokens.ts, RealCurrentUserProvider.tsx
  lib/fixtures/   NGO-specific sample/test data — NOT in packages/core, see below

supabase/migrations/   0001-0009 so far, run in order, SQL Editor, one at a time
docs/                  EXECUTION.md, LEARNINGS.md, INTERFACE.md
```

## Commands

```bash
npm install                    # root, installs all workspaces
cd apps/ngo
npx tsc --noEmit                # typecheck — run this before every build
npm run build                   # full production build
```

Both must be clean before considering any change done. `next build` in this
repo requires network access to fetch Google Fonts — if that's unavailable
in a sandbox, the build fails at font-fetching only; that's environment, not
a code bug, and everything else can still be checked with `tsc --noEmit`.

**The Supabase CLI is already installed and linked to the real project**
(`npx supabase login` / `npx supabase link` were run once, during setup).
If you have shell access, you likely don't need the manual round-trip this
project used for a while — write the migration, then try
`npx supabase db push` to apply it directly, and
`npx supabase gen types typescript --linked > packages/core/src/types/database.types.ts`
to regenerate types yourself, rather than asking the person to paste
things into the Supabase dashboard's SQL Editor by hand. Confirm both
commands actually work in your environment before relying on them — if
they don't (no network path to supabase.co, no saved credentials), fall
back to: write the migration file, ask the person to run it in the SQL
Editor, and either wait for a real regeneration or add a clearly-labeled
PROVISIONAL stub to unblock local typechecking in the meantime — see the
`appointments` history in EXECUTION.md for exactly what that looked like
and how it was later replaced wholesale by the real thing.

## Rules that are not optional

- **`packages/core` never contains fixture, sample, or default data.**
  Not a sample org name, not a placeholder employee, not a default color.
  This caused a real, confusing bug once (manufacturing-pilot data leaking
  into the NGO app's sidebar — see LEARNINGS.md) and the fix was structural:
  `context/current-user.tsx` has zero default value and throws if used
  without a provider. Every app supplies its own values. If you're about to
  add anything concrete to core, stop — it belongs in the consuming app's
  `lib/fixtures/` instead.
- **Every Supabase-backed page follows the server-page + client-component
  split.** `page.tsx` is an async server component: call
  `getCurrentEmployee()` from `lib/supabase/server.ts`, role-check if the
  page is restricted, query with the RLS-scoped server client, pass parsed
  data as props to a `'use client'` sibling that handles interactivity and
  writes through the browser client. See `leadership/funders/` for the
  reference example. Don't invent a new pattern.
- **RLS is the real security boundary, not page-level role checks.** Every
  table in `supabase/migrations/` has `force row level security` and
  policies keyed off `app.org_id()`, `app.role()`, `app.is_staff_of()`,
  `app.is_donor()`, `app.is_reviewer()` (defined in `0003_auth_and_rls.sql`).
  A page's own role check is a UX nicety for a clear message — never the
  only thing standing between a role and data it shouldn't see.
- **If a Tailwind class used inside `packages/core` visibly does nothing**,
  check `apps/ngo/src/app/globals.css`'s `@source` directive before
  suspecting the component. Tailwind doesn't automatically scan a sibling
  monorepo package; this bit us once for real (see LEARNINGS.md).
- **`docs/INTERFACE.md` is on hold.** The user has explicitly deferred
  visual/color design work until the legacy screenshots are reviewed and a
  scheme is chosen. Don't restyle anything as a side effect of an unrelated
  task. Functional pages built in the meantime (Funders, Staff Management,
  the create forms) are deliberately plain — that's intentional, not
  unfinished.
- **`packages/core/src/types/database.types.ts` reflects the real schema.**
  Regenerated against the live project on 2026-08-19 (see EXECUTION.md) and
  the `Database` generic is wired into all three Supabase clients
  (`client.ts`, `server.ts`, `admin.ts`) — real compile-time type checking
  on every query in the app now. If you add a new migration, regenerate
  this file the same way (`supabase gen types typescript --linked`) so it
  doesn't go stale again — don't let code and schema drift apart silently.
  **If adding a type generic somewhere makes a wall of unrelated code fail
  with `Property X does not exist on type never`**, don't assume the type
  is wrong — check `@supabase/ssr`'s version first. That exact symptom was
  a real, version-specific bug here (see LEARNINGS.md); the type was fine,
  the wrapper library forwarding it wasn't.
  **Every new migration needs a type regeneration before `tsc --noEmit`
  will pass clean.** A new table exists in `supabase/migrations/` the
  moment the file is written, but the *real* generated types don't know
  about it until someone runs the migration against the live project and
  regenerates. If you write a migration and code against a new table in
  the same pass, either wait for the user to run + regenerate, or add a
  clearly-labeled PROVISIONAL stub to `database.types.ts` (match an
  existing structurally similar table's exact format) so local
  verification isn't blocked — see `appointments` for the pattern. Never
  leave a provisional stub in place after the real regeneration comes
  back; it should be replaced wholesale, not merged alongside.

## Auth model

Two login modes on `employees.login_mode`: `'code'` (org ID + employee code
+ a password set at activation — for field staff on shared devices) and
`'email'` (standard email + password — desk roles, donors). Account creation
never hands out a usable credential directly: an admin creates the employee
row, issues a one-time setup token (`lib/auth/setup-tokens.ts`, hashed at
rest, rate-limited, single live token per employee), and the person redeems
it at `/activate` to set their own password. See `LEARNINGS.md` for exactly
why the legacy scheme (`password = 'axm:' + employee_code`) couldn't be
ported — it's a real, specific vulnerability, not a style preference.

## Known open gaps (see EXECUTION.md for full detail on each)

- Donor portal not built yet — RLS proves the curated read is possible
  (`fund_lines`, `activities`, `programmes`, `media`), no pages exist.
- Task/project write access is org-wide for any non-donor staff member —
  the handover's real rule (leadership org-wide, HOD within department,
  staff only their own) needs per-row filtering, not implemented.
- Milestone verification isn't reviewer-gated at the RLS layer —
  `app.is_reviewer()` exists and is unused on `project_milestones`.
- Single-project assumption on the two project-related pages — querying
  "most recent project" rather than supporting multiple.
- Task submission (`staff/tasks/[id]`) is still local-only React state, not
  a real write — this was true before the tables existed and still is.
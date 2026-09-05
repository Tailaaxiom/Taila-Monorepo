# EXECUTION

Timestamped log of what was actually done, in order. Append only — never
rewrite history, never delete an entry. If something was done and later
reversed, log the reversal as its own entry.

Format: `## YYYY-MM-DD — short title`, then what was done, then the state it
left the repo in. Enough that a new session can resume without asking.

---

## 2026-08-18 — Legacy audit

Read the legacy `index.html` (28,281 lines, vanilla JS + Supabase) and the
generated `database.types.ts` (79 tables) to verify the two handover documents
before building on them. Four claims in those documents were wrong; all four
are recorded in LEARNINGS.md.

Confirmed correct in the handover: the five gating registries, `SECTOR_MODULES`
including the seven NGO modules, the donor role as an `employees` row, the
storytelling engine as templating over `activities` with no table of its own.

No code changed in this step.

## 2026-08-18 — Monorepo restructure

Turned the flat `taila-axiom-v2` Next.js app into npm workspaces + Turborepo.

- Root: `package.json` (workspaces `apps/*`, `packages/*`), `turbo.json`,
  `tsconfig.base.json`, `.gitignore`.
- Created `packages/core` and moved 54 files into it from `src/lib` and
  `src/components`: 26 hand-checked types plus generated `database.types.ts`,
  the five gating registries plus `resolver.ts` and `page-routes.ts`,
  `projects/milestones`, `finance/invoice-matching`, `kpi/sessions`,
  `monitoring/aggregate`, `tasks/status`, `components/ui` (Card, Badge,
  StatTile), `components/shell` (AppShell, Sidebar, TopBar).
- Rewrote every `@/lib/*` and `@/components/*` alias inside core to relative
  paths so the package is self-contained (16 files touched).
- Converted `database.types.ts` from UTF-16 to UTF-8.
- `packages/core` exposes subpath exports mapping onto the source tree
  (`@taila/core/gating/resolver`, `@taila/core/components/ui/Card`).

`apps/manufacturing` was NOT created. The pilot app's pages were carried into
`apps/ngo` instead, since the manufacturing app had no `src` worth preserving
separately. Revisit if manufacturing is picked back up.

## 2026-08-18 — apps/ngo scaffolded

- Copied the App Router tree from the pilot; rewrote imports to `@taila/core/*`.
- `next.config.ts`: added `transpilePackages: ['@taila/core']` — required
  because core ships TypeScript source, not a build output.
- Added `@supabase/supabase-js` and `@supabase/ssr` to dependencies. Installed
  but not yet used; no client is wired.
- `src/lib/fixtures/ngo.ts`: NGO fixture org and four employees (staff,
  leadership, finance, donor). Sector is the free-text string
  `'Development and Advocacy'` and `modules` is `null`, deliberately, so
  `getSectorKey()` and `orgModuleSet()` both execute for real rather than being
  bypassed by hardcoded values.
- `src/lib/fixtures/preview-context.tsx`: app-local preview-user switcher over
  those four fixtures. Stands in for auth. Delete when real auth lands.

Verified:
- `tsc --noEmit` clean.
- `next build` clean, 10 routes.
- Gating output matches the handover tables exactly: modules resolve to
  `payroll, funders, multicurrency, livemap, offline, story, orgsuite`;
  leadership 34 pages, finance 13, staff 12, donor 4; no page from the
  production / property / hospitality / social / inventory / margins modules
  reaches an NGO role.

## 2026-08-18 — Documentation convention adopted

Added `docs/EXECUTION.md`, `docs/LEARNINGS.md`, `docs/INTERFACE.md`.

## 2026-08-18 — Auth, RLS, and Funders

Chosen sign-in model (confirmed with the user): two login surfaces per
`employees.login_mode`.
- `'code'` — org ID + employee code + a password the person sets themselves
  at activation. For field staff on shared devices.
- `'email'` — real email + password. For desk roles and donors.

Neither derives a password from a public identifier — see LEARNINGS.md on why
the legacy scheme couldn't be ported.

**Migrations** (`supabase/migrations/`), run in order against a fresh project:
- `0001_foundation.sql` — private `app` schema (RLS helpers live here, not in
  `public`), `app.touch_updated_at()`, `app.freeze_org_id()` (blocks any
  UPDATE that changes `org_id`, at the table level, independent of policies).
- `0002_tenancy_people.sql` — `organizations`, `employees` (with
  `auth_user_id`, `login_mode`), `org_branding`, `employee_setup_tokens`
  (RLS on, zero policies — service-role only, by design).
- `0003_auth_and_rls.sql` — `app.org_id()`, `app.role()`, `app.is_reviewer()`,
  `app.is_donor()`, `app.is_staff_of()` and RLS for the 0002 tables. All
  `SECURITY DEFINER`, all `search_path` pinned, all tables `FORCE ROW LEVEL
  SECURITY`.
- `0004_funders_and_donor_read.sql` — `funders`, `fund_lines`, `activities`,
  `programmes`, `media` (adds `donor_visible`, not in the legacy schema — see
  LEARNINGS.md). First domain proving the donor's curated read.

**Auth flow** (`apps/ngo/src/lib/auth/`, `src/lib/supabase/`):
- `identity.ts` — `codeLoginEmail()` (deterministic synthetic address,
  identical on client and server), `validatePassword()` (length-first,
  rejects the employee code/org ID as substrings).
- `setup-tokens.ts` — `issueSetupToken()` / `redeemSetupToken()`. Tokens are
  hashed (SHA-256) at rest, compared in constant time, rate-limited to 8
  attempts, one live token per employee, 72-hour expiry.
- `supabase/client.ts` (browser), `supabase/server.ts` (server components,
  exports `getCurrentEmployee()`), `supabase/admin.ts` (service role,
  `server-only`, narrow named functions only — see the file's own comment for
  the three legitimate uses).
- `middleware.ts` — session refresh, redirects unauthenticated traffic to
  `/sign-in` except `PUBLIC_PATHS`.
- Routes: `POST /api/auth/activate` (redeem token, unauthenticated by
  necessity), `POST /api/auth/issue-setup-token` (leadership/hr/admin only,
  role checked server-side via `getCurrentEmployee()`, never trusted from the
  client).
- Pages: `/sign-in`, `/activate`. Deliberately unstyled — functional test
  screens, not designed pages. `docs/INTERFACE.md` is on hold per the user.

**Fixed during this pass:** `packages/core/src/types/employee.ts`'s
`parseEmployee()` assumed the legacy shape of `extra_roles`/`extra_pages`
(comma-string / jsonb). The new schema stores both as native `text[]`. Patched
to accept either shape until `database.types.ts` is regenerated (see Open,
below).

Verified: `tsc --noEmit` clean, `next build` clean — 13 routes including the
two new auth pages and two new API routes. Caught and fixed one real bug in
this pass: `useSearchParams()` on `/sign-in` needed a `Suspense` boundary or
the build fails at static prerendering.

### Anomaly worth recording

Before finishing this pass, `apps/ngo/src/lib/supabase/server.ts`,
`admin.ts`, and part of `client.ts` were already present and correct on disk,
along with three migration files, `middleware.ts`, and the activate route —
none of which had been written via a tool call in the visible session at that
point. Content was reviewed in full, found correct and consistent with the
design already agreed with the user, and adopted rather than discarded. Flagged
to the user directly. Most likely explanation: sandbox/container reuse between
sessions. Worth this app's operator confirming with Anthropic if it recurs,
since generic project code is a low-stakes case of whatever caused it, but
the same mechanism with different content would not be.

---

## 2026-08-18 — Removed leftover manufacturing fixture data from core

Found via a screenshot: after signing in, the sidebar showed "Northbridge
Processing Ltd" / "Amara Chukwu" and manufacturing nav items (The floor,
Production runs, Machines) instead of NGO content — even though the preview
switcher correctly said "Ngozi Eze". Root cause: `Sidebar.tsx` and
`TopBar.tsx`, both in `packages/core`, imported their own hardcoded
`usePreviewUser()` from `core/fixtures/preview-context.tsx` (a leftover from
the manufacturing pilot, with its own default org/employee) — a completely
separate React Context object from the one `apps/ngo`'s own preview
switcher populated. The switcher UI was working; the components reading it
were listening to the wrong context entirely.

Fixed properly rather than patched:
- Added `packages/core/src/context/current-user.tsx` — a generic
  `CurrentUserProvider` / `useCurrentUser()` with **zero default data**. core
  now cannot leak sector-specific content again by construction: there is
  nothing left in it to leak.
- `Sidebar.tsx` and `TopBar.tsx` now import `useCurrentUser` from this new
  module instead of a fixture file.
- **Deleted `packages/core/src/fixtures/` entirely** — `organization.ts`,
  `employee.ts`, `task.ts`, `project.ts`, `finance.ts`,
  `preview-context.tsx`. All of it was manufacturing-pilot sample data
  (task titles like "Safety check, Machine 4", a project called "New
  Warehouse Extension"), which had no business in a sector-neutral package
  regardless of the context bug.
- Added `apps/ngo/src/lib/fixtures/sample-data.ts` — NGO-flavored
  replacement sample data (a Kano WASH programme, field-operations tasks,
  grant income from fictional funders). Uses the same `parseTask` /
  `parseProject` / etc. parsers from `packages/core/src/types`, which are
  behavior, not data, and correctly stayed in core.
- Rewrote `apps/ngo/src/lib/fixtures/preview-context.tsx` to wrap core's
  `CurrentUserProvider` with the NGO fixtures, instead of defining its own
  separate, parallel context.
- Updated `packages/core/package.json` exports: added `./context/*`,
  removed the now-dead `./fixtures/preview-context` entry.
- Updated all seven carried-over pages (`staff/dashboard`, `staff/tasks`,
  `staff/tasks/[id]`, `leadership/dashboard`, `leadership/tasks`,
  `leadership/projects`, `leadership/budget`) to import `useCurrentUser`
  from core and the sample data from `apps/ngo`'s own fixtures file.

This was a genuine architecture bug, not styling — `packages/core` is
supposed to be sector-neutral by design (see the monorepo explanation given
to the user), and it wasn't. It is now: `grep -r` for fixture data in
`packages/core` returns nothing.

Verified: `tsc --noEmit` clean, `next build` clean, 13 routes, no regressions.

**Not addressed, and worth being clear about:** this fixes what data
appears, not what it looks like. The visual shell (colors, layout, card
style) is untouched and still deferred per the user's explicit hold on
`docs/INTERFACE.md` until the legacy screenshots are reviewed.

## 2026-08-18 — Fixed a real React error on /staff/dashboard

User hit, in the browser console, on the first real click-through of a
carried-over page: "Cannot update a component (`AppShell`) while rendering a
different component (`StaffDashboardPage`)." Traced to `usePageTitle()` in
`packages/core/src/components/shell/AppShell.tsx`, which called AppShell's
`setTitle` from inside a `useState` lazy initializer — that function runs
during the calling page's render, not after mount, despite the comment
claiming otherwise. See LEARNINGS.md for the general lesson.

Fixed: moved the call into `useEffect`. Every page using `usePageTitle` was
affected, not just the one that surfaced it — same fix covers all of them.

The data itself (task statuses: in progress / blocked / done) rendered
correctly in the same screenshot that showed the error — confirms the
NGO sample data plumbing from EXECUTION's previous entry is genuinely
working. The visual misalignment in that screenshot is a CSS layout issue,
left alone per the user's hold on `docs/INTERFACE.md`.

Verified: `tsc --noEmit` clean, `next build` clean, 13 routes.

## 2026-08-18 — Staff Management page (real auth, first non-fixture page)

Built the screen this was missing: leadership/HR/admin could add an
employee row via SQL, but issuing a setup token required calling
`POST /api/auth/issue-setup-token` by hand. Now there's a real page:
`/leadership/staff` — directory, add-employee form, and an "Issue setup
token" button per unactivated employee, showing the token once with its
expiry.

Wired into the existing page catalog rather than invented as a new route:
`p-lead-staff` and `p-lead-add-staff` both now resolve to `/leadership/staff`
in `page-routes.ts` (previously fell through to `/coming-soon`). One screen
covers both, matching how the handover already describes them as tightly
coupled.

**This is the first page in the app running on the real signed-in session
instead of the preview switcher.** `page.tsx` is a server component calling
`getCurrentEmployee()` (real `auth.uid()` via RLS) and querying `employees`
directly — no fixture involved. Deliberate: this page issues real tokens
against real RLS, so a fixture identity would be actively wrong here, not
just cosmetically inconsistent. Every other page still renders through
`usePreviewUser()`, so the sidebar chrome and this page's content can
legitimately disagree about "who's using the app" until the rest of the app
migrates off fixtures too — not a bug, the known tracked gap.

Employee creation goes straight through the RLS-scoped browser client
(`employees_insert_admin` policy already permits leadership/hr/admin) rather
than a dedicated API route — no server-side logic beyond what RLS already
enforces, so no route was needed.

Verified: `tsc --noEmit` clean, `next build` clean, 14 routes.
`/leadership/staff` correctly marked dynamic (ƒ), since it reads the session
on every request.

## 2026-08-18 — Fixed the real cause of "missing" form fields

What looked like missing employee-code/role/login-mode fields on
`/leadership/staff` (previous entry) was actually every field in `apps/ngo`
sitting on real, unstyled ground: Tailwind wasn't generating CSS for classes
used only inside `packages/core`, since it's a sibling package outside
`apps/ngo`'s own directory and Tailwind v4's automatic scanning doesn't
reliably cross that boundary. The class `md:ml-[240px]` in `AppShell.tsx` —
the one that pushes page content clear of the fixed sidebar — compiled to
nothing. Confirmed via `Pesticide` (renders every element's box outline):
the fields weren't hidden, they were rendering at `x: 0`, underneath the
opaque sidebar.

Fixed with an `@source` directive in `apps/ngo/src/app/globals.css` pointing
at `../../../../packages/core/src` — the documented Tailwind v4 mechanism for
scanning outside the app's own folder. See LEARNINGS.md for the general
lesson; this will recur for any new class added to `packages/core` if this
line is ever removed.

Verified properly this time, not just assumed: built the app and grepped the
actual compiled CSS output (`.next/static/chunks/*.css`) for the class.
Confirmed present: `.md\:ml-\[240px\]{margin-left:240px}`. `tsc --noEmit`
and `next build` both clean.

## 2026-08-19 — Funders page: first page on genuinely live data

Built `/leadership/funders` — the first page in the app with no sample-data
fallback anywhere behind it. Every other data-bearing page (dashboard, tasks,
budget) still reads from `apps/ngo/src/lib/fixtures/sample-data.ts`, because
tasks/projects/income/expenses have no migration yet. `funders` does
(`supabase/migrations/0004`), so this page reads and writes it directly.

Same pattern as Staff Management: server component (`page.tsx`) calls
`getCurrentEmployee()` for the real session and role-checks before rendering;
client component (`FundersClient.tsx`) handles the add form and remove
action through the RLS-scoped browser client, no dedicated API route needed
since `funders_write_by_finance` (0004) already enforces who can write.

Deliberately a different role check than Staff Management —
leadership/finance/admin here, vs leadership/hr/admin there — so this is a
second, distinct proof that RLS enforces per-role access correctly, not a
repeat of the first one.

Wired into the existing catalog: `p-lead-funders` now resolves to
`/leadership/funders` in `page-routes.ts` (previously fell through to
`/coming-soon`).

Verified: `tsc --noEmit` clean, `next build` clean, 15 routes.
`/leadership/funders` correctly marked dynamic (ƒ).

**Not yet tested against real data** — no funder has actually been added
through the UI yet. That's the natural next check: add one, confirm it
persists and reappears on refresh, confirm a non-finance/leadership account
(e.g. the field-staff account from the activation-flow test) genuinely
cannot see this page or its data.

## 2026-08-19 — Retiring the preview switcher

User caught this live: the sidebar showed "Tunde Bakare," a fictional
fixture account, while genuinely signed in as a real leadership account —
because Sidebar/TopBar and every carried-over page (dashboard, tasks,
budget) were still reading `usePreviewUser()`/`useCurrentUser()` from
`apps/ngo/src/lib/fixtures/preview-context.tsx`, the fake switcher built
before real auth existed. Only Staff Management and Funders had been wired
to the real session. This was a documented, tracked gap (see prior
EXECUTION entries), but seeing it live on a page with nothing real to
compete with it made it look like the whole sign-in system was fake — a
fair read from the outside, even though RLS and the real writes were never
affected by it.

**Retired properly, not patched.** Restructured routing with Next.js route
groups so the requirement "must be signed in" applies at the layout level,
not per-page:

- `src/app/(auth)/` — `sign-in/`, `activate/`. Must render without a
  session; this is the whole point of these two pages.
- `src/app/(app)/` — everything else: `page.tsx` (home), `coming-soon`,
  `leadership/*`, `staff/*`. New `(app)/layout.tsx` wraps children in
  `RealCurrentUserProvider` (new,
  `apps/ngo/src/lib/auth/RealCurrentUserProvider.tsx`) then `AppShell`.
- `RealCurrentUserProvider` is a server component: calls
  `getCurrentEmployee()` for the real session, redirects to `/sign-in` if
  there isn't one, fetches the matching `organizations` row, parses both
  with core's `parseEmployee`/`parseOrganization`, and hands them to core's
  `CurrentUserProvider` — the exact same context Sidebar, TopBar, and every
  page already read via `useCurrentUser()`. **No page needed to change.**
  That's the payoff of having built the generic context this way originally
  rather than importing the fixture switcher directly.
- Root `layout.tsx` reduced to html/body/fonts only — no `AppShell`, no
  provider, no auth check. Those only make sense for the `(app)` group.
- Deleted `apps/ngo/src/lib/fixtures/preview-context.tsx` and `ngo.ts`
  entirely. Nothing references them anymore; confirmed via repo-wide grep.

**Consequence, stated plainly since it changes the dev workflow**: testing a
different role now means actually signing in as a real account of that
role — created via Staff Management, activated via the real token flow —
not a one-click dropdown swap. Slower, but it's the only version of this
that's actually true. `sample-data.ts` (tasks/projects/income/expenses) is
unaffected and still fixture-driven, since those tables still have no
migration — that's a separate, still-open gap, not this one.

Verified: `tsc --noEmit` clean, `next build` clean. Every route under
`(app)` now correctly shows as dynamic (ƒ) rather than statically
prerendered — direct confirmation each one reads the real session per
request rather than baking fixture data in at build time. `(auth)` routes
remain static, correctly unaffected.

**Known minor inefficiency, not a bug**: Staff Management's and Funders'
own `page.tsx` files still call `getCurrentEmployee()` a second time for
their own role check, on top of the one `RealCurrentUserProvider` already
did. Two DB round-trips instead of one. Worth collapsing later; not urgent.

## 2026-08-19 — Fund Management page

Built `/leadership/funds` — the other half of Funders. Same real-data
pattern (`fund_lines` table, migration 0004), same role check
(leadership/finance/admin), same server page + client component split.

One addition over the Funders page: the handover (section 2) describes a
fund line as "optionally tagged to the donors that supply them" — the
`donor_codes` column. Rather than leave that as a disconnected free-text
field, the page fetches the real funders list alongside fund lines and
renders it as checkboxes, storing selected funder ids into `donor_codes`.
The table then resolves those ids back to funder names for display. This is
the first place in the app where two real tables are read together and
cross-referenced, not just one table in isolation.

`disbursed` is a plain editable number for now, checked client-side against
`allocated` before submit and enforced for real by the database
(`fund_lines_disbursed_within_allocated`, 0004) — there's no expense-booking
table yet to derive it automatically, matching the handover's own
description of how disbursed should eventually be drawn up by real spend.
Said so explicitly in the page copy, not left implicit.

Wired into the catalog: `p-lead-funds` now resolves to `/leadership/funds`
(previously `/coming-soon`).

Verified: `tsc --noEmit` clean, `next build` clean, 16 routes.
`/leadership/funds` correctly dynamic (ƒ).

## 2026-08-19 — Tasks, projects, and money tables: last six pages off fixtures

The last fixture-driven pages in the app. Added migration
`0005_operations_tables.sql`: `tasks`, `projects`, `project_milestones`,
`income`, `expenses` — sized to what the six pages actually read (checked
against the real page code first, not assumed from the legacy manufacturing
schema those TypeScript types were generated from). `apps/ngo/src/lib/fixtures/sample-data.ts`
deleted entirely; nothing references it anymore, confirmed by repo-wide grep.

Converted all six pages to the server-page + client-component split, same
pattern as Staff Management/Funders/Fund Management:

- `staff/dashboard`, `staff/tasks` — tasks filtered to the signed-in
  employee, by `employee_code` OR their `department` (matching the
  handover's own definition of `assignee`, section 2).
- `staff/tasks/[id]` — first real dynamic-route server page in the app;
  Next 16 passes `params` as a `Promise`, awaited before use. The
  interactive checklist/proof/submit UI is unchanged and still local-only —
  that was already true before this pass (the original page's own comment
  called it a stand-in for a later phase), only the *task itself* is now
  real, not the submission.
- `leadership/dashboard` — the most composed page: four real queries in
  parallel (tasks, income, expenses, most-recent project + its milestones).
- `leadership/tasks`, `leadership/budget` — straightforward org-wide reads.
- `leadership/projects` — most-recent project + milestones. v1 scope,
  stated plainly in the page: the original design assumed exactly one
  project; querying the most recent one preserves that rather than
  redesigning for multiple projects, which is a real future page change,
  not something to expand into here.

`tasks`/`projects`/`project_milestones` RLS: any non-donor org member can
read and write, for now. The handover's real rule (leadership org-wide, HOD
within department, staff only their own) needs per-row filtering that isn't
built yet — stated explicitly in the migration's own comments, not silently
narrowed or left unstated. `income`/`expenses` RLS matches Funders/Fund
Management: leadership/finance/admin only.

`project_milestones.project_id` is `text` against a `bigint` `projects.id`
— deliberately continuing a decision already made in
`packages/core/src/types/project-milestone.ts` ("kept as a string ... until
the Phase 4 schema cleanup"), not a new inconsistency introduced here.

Verified: `tsc --noEmit` clean, `next build` clean, 16 routes — every route
under `(app)` now dynamic, confirming every one of them reads real data per
request.

**Genuinely open now, not a redirect for scope reasons**: milestone
verification isn't reviewer-gated at the RLS layer (`app.is_reviewer()`
exists and is unused here — a plain role-check UPDATE policy can't tell
"changing status to verified" apart from "editing the due date"). Real
per-assignee/department task visibility. Multi-project support on the two
project-related pages.

## 2026-08-19 — Create forms: tasks, projects, milestones, income, expenses

Closed the last gap from the previous pass: the six pages read real data
but nothing could write it except SQL. Added create forms following the
exact pattern proven on Funders and Fund Management (insert via the
RLS-scoped browser client, refetch, no dedicated API route needed since RLS
already enforces who can write).

- **Task Manager** (`leadership/tasks`) — add-task form: title, assignee
  (employee code, free text — matches the handover's own definition, not a
  foreign key), department, priority, due date, deliverables (one per line,
  stored as the JSON array `parseTask` already expects), proof-required
  checkboxes. Geofence fields deliberately excluded — no map picker exists
  yet, stated in the file's own comment.
- **Project Monitor** (`leadership/projects`) — two forms. Create-project
  form replaces the "no project yet" empty state. Add-milestone form appears
  once a project exists, `seq` computed client-side as
  `milestones.length + 1`. Creating a project calls `router.refresh()`
  rather than duplicating the server page's "most recent project" query
  logic client-side — the server component just re-runs and the new project
  becomes what's shown, since it's now the most recent one.
- **Budget & Spend** (`leadership/budget`) — two forms, income and
  expenses. Page-level role check added here too (leadership/finance/admin)
  — this page didn't have one before this pass, unlike Funders and Fund
  Management; closed the inconsistency while already touching the file.

All three server `page.tsx` files gained a `getCurrentEmployee()` call they
didn't need before (read-only pages don't need `org_id`; writing does) —
same "known minor redundancy" already logged for Staff Management and
Funders, not a new one.

Verified: `tsc --noEmit` clean, `next build` clean, 16 routes, no
regressions on the read side.

**Not yet tested against real writes** — no task, project, milestone,
income, or expense has actually been created through these forms yet.
Natural next check: add one of each, confirm it persists on refresh, and
confirm the dashboard/budget pages' totals update to include it.

## 2026-08-19 — CLAUDE.md

Added the promised root `CLAUDE.md`. Unlike `docs/*.md`, this file is
auto-read by Claude Code at session start without being asked — so it's
kept short and points to `docs/EXECUTION.md`/`LEARNINGS.md`/`INTERFACE.md`
for real detail rather than duplicating this file's history in miniature.
Covers: repo shape, build commands, the five rules that have each already
caused a real bug when broken once (core must never hold fixture data, the
server-page + client-component split, RLS as the real boundary not page
checks, the Tailwind `@source` trap, INTERFACE.md's hold), the auth model
in three sentences, and a short list of genuinely open gaps rather than a
false "everything's done" impression.

Written now specifically because the condition for writing it (auth model
settled) is true as of this session — said explicitly when the three-file
convention was first set up, and holding to that.

## 2026-08-19 — Donor portal

Built the last untested RLS case: `/donor/impact`, `/donor/funds`,
`/donor/media`. Messaging (`p-messages`, the fourth item in the donor's
nav) is out of scope — no `messages` table or page exists anywhere in the
app yet, not donor-specific.

- **Impact Report** — activities + programmes. Both already readable by any
  org member under existing RLS (`activities_read_org`,
  `programmes_read_org`, 0004) with no donor-specific policy — the page
  itself is gated to the donor role, since this route is the donor's own
  framing of the data (handover: a distinct page id from the not-yet-built
  staff "Impact and Reach" page), not because the data needs it.
- **Fund Utilization** — the first real exercise of
  `fund_lines_read_by_donor` (0004), which has existed since the
  Funders/Fund Management pass but never had a page use it until now.
  Deliberately simpler than `/leadership/funds`: allocated vs disbursed
  only, no funder names, no write form — a donor sees results, not the
  donor list.
- **Media Library — the actual strictest RLS case in the app.**
  `media_read_by_donor` requires org match AND `donor_visible = true`,
  opt-in by design (0004 already noted the legacy schema had no sharing
  flag at all). The page's own query deliberately has no
  `.eq('donor_visible', true)` filter — left out on purpose, so the query
  is a direct test of the RLS policy doing the filtering, not the
  application code doing it redundantly.

**Honest gap, not a bug**: there is no upload UI anywhere in the app yet, so
no `media` row can be created except via SQL. This page will show its empty
state until one exists. That's also the natural verification step: insert
one row with `donor_visible = true` and one with it left `false`, confirm
the donor sees only the first, confirm a staff account signed in and
visiting the same route sees neither (media_read_by_staff explicitly
excludes donor's visibility rule and vice versa).

Wired: `p-donor-impact`, `p-donor-funds`, `p-donor-media` in
`page-routes.ts` (previously all three fell through to `/coming-soon`).
Also added `donor: '/donor/impact'` to `ROLE_HOME` — previously missing,
meaning a donor clicking "Home" fell through too.

Verified: `tsc --noEmit` clean, `next build` clean, 19 routes, all three
new pages correctly dynamic.

## 2026-08-19 — Real bug: donors could sign in but never reach a page

Reported as "login seems to work but it just refreshes the form." Root
cause was real and specific, not a UI issue: `employees_read_org` (0003)
blocks donors from the `employees` table by design, but that also blocked a
donor from reading their OWN row — which `getCurrentEmployee()` needs for
every single page. A donor's password checked out and a real Supabase
session was created; the very next step, looking up who they are, silently
returned nothing because RLS was hiding it even from them. The app
correctly treated that as "not signed in" and redirected to `/sign-in` —
indistinguishable, from outside, from a broken login. See LEARNINGS.md for
the general lesson (a role denied a table can still need to read its own
row in it).

Fixed with a new migration, `0006_employees_self_read.sql` — a real
Supabase migration, not a code change, since the broken policy was already
live. Additive: adds `using (auth_user_id = auth.uid())` as a second SELECT
policy on `employees`. RLS SELECT policies OR together, so this doesn't
loosen the directory restriction at all — a donor still can't browse
anyone else's row, only their own became readable.

**Action for the user**: run `0006_employees_self_read.sql` in the SQL
Editor, then retry the donor sign-in — no code change needed, no rebuild
required, this is a pure database fix.

## 2026-08-19 — Real file storage: media upload flow

First real files in the app — every table so far has been plain Postgres
rows. `media` (0004) has existed since the donor portal pass but
`file_path` pointed at nothing; no upload path existed anywhere.

Added `0007_media_storage.sql`: a private Supabase Storage bucket (`media`,
not public — a public bucket would make every file readable by URL alone,
bypassing org scoping and the donor_visible opt-in entirely) with its own
RLS on `storage.objects`, separate from and mirroring the table policies —
storage RLS doesn't automatically inherit from a table's RLS, it needs its
own policies even when the access rule is conceptually the same. Path
convention: every object starts with `{org_id}/...`, checked via
`storage.foldername(name)[1] = app.org_id()`. Donor read access re-checks
`donor_visible = true` via an `exists` subquery against `media` — the same
opt-in rule enforced a second time, at the layer that actually serves
bytes, not just the layer that lists rows.

Built `/leadership/media` (`p-lead-media`, previously falling through to
`/coming-soon`): real upload via `supabase.storage.from('media').upload()`,
then a `media` row insert, a donor-visibility checkbox at upload time, and
a toggle to flip it after the fact without re-uploading. Gated to "not
donor" rather than a specific role list — matches `media_write_by_staff`
(0004) and the new storage policies exactly, not narrower than what the
tables already allow.

Updated the donor Media Library to match: added a "View" button that
generates a signed URL on click and opens it — the first real exercise of
`media_storage_select_by_donor`, not just the table-level policy. Removed
the now-stale comment in that page claiming no upload UI exists.

Files are read via short-lived (60 second) signed URLs generated on demand,
not stored or cached — regenerated fresh every time someone clicks View.

Verified: `tsc --noEmit` clean, `next build` clean, 20 routes.

**Real gaps, stated plainly**: no delete/replace capability for an
uploaded file. If the `media` table insert fails after a successful
storage upload, the file is orphaned — uploaded but unlinked, not cleaned
up automatically. Neither addressed here.

## 2026-08-19 — Real database types wired in, closing a long-deferred gap

The user ran `supabase gen types typescript --linked` against the real,
live project and uploaded the result. Verified before wiring anything in:
14 tables, exactly matching the seven migrations, nothing stray, nothing
missing. File was UTF-16 with CRLF line endings (same PowerShell-redirect
issue as the original legacy file) — converted to UTF-8/LF before
installing at `packages/core/src/types/database.types.ts`.

Added the `Database` generic to all three Supabase clients (`client.ts`,
`server.ts`, `admin.ts`) — previously deliberately untyped, per the
standing rule in CLAUDE.md not to do this speculatively before the schema
was verifiable. That condition is now met.

**Found and fixed a real, unrelated bug in the process**: wiring in the
generic initially produced a wall of `never`-typed errors across nearly
every query in the app. Isolated to `@supabase/ssr` being pinned at
`0.5.2`, several versions behind `@supabase/supabase-js`/`postgrest-js`
(both `2.112.3`) — too old to correctly forward the generic. Bumped to
`^0.12.4`. See LEARNINGS.md for the diagnostic pattern (a generic
collapsing everything to `never`, rather than a few fields being wrong,
means suspect the library version before the type).

After that fix, exactly two genuine schema mismatches remained, both in
`packages/core/src/types/task.ts`: `parseTask` destructured `budget` and a
bare `deliverables` column, neither of which the real `tasks` table
(0005) has — `budget` was already known dead from the original legacy
audit, and `deliverables` only ever existed as `deliverables_json`.
Removed both from the type and the parser.

Also completed the promised cleanup in `employee.ts`: the legacy
comma-string/jsonb-string fallback for `extra_roles`/`extra_pages` is gone
now that real types confirm both are native `text[]` columns — direct
pass-through instead of defensive parsing.

Verified: `tsc --noEmit` clean, `next build` clean, 20 routes, zero
regressions.

**CLAUDE.md and this file's own prior entries about stale types are now
outdated** — updated CLAUDE.md accordingly; this entry supersedes those.

## 2026-08-19 — Backlog reckoning, and Search (first of the cross-cutting pages)

The user pushed back, fairly: recent "what's next" proposals had all been
reactive to whatever was just built (Funders led to Fund Management led to
the donor portal led to Media), and never stepped back to check the full
page catalog against what actually exists. A first attempt to produce that
list was itself wrong — it dumped the raw navmap, which includes every
sector the platform ever supported (manufacturing, hospitality, real
estate, social, platform admin), none of which are reachable in the NGO
app at all. Corrected by running the real gating resolver
(`getNavItems()`) against NGO fixtures for every role and cross-referencing
against `page-routes.ts`, the same check already used earlier to verify
the gating logic itself. Real count: **14 pages built, 45 genuinely
NGO-relevant pages still coming-soon** (not 91). Grouped by theme
(cross-cutting, money, HOD workspace entirely unbuilt, HR workspace
entirely unbuilt, staff partial, leadership-specialized) and handed to the
user directly rather than folded into another proposal.

Agreed order: Search, Appointments, Messages, then the rest of
cross-cutting, then HOD workspace, then everything else.

**Built Search** (`p-search`, reaches hod/hr/leadership — wired at
`/leadership/search`, previously `/coming-soon`). No new table — reads
directly across tasks, projects, employees, funders, activities, media.
Each query is subject to that table's own existing RLS exactly as
elsewhere: an HR or HOD search silently returns zero funders results
without any special-casing in this page's code, since
`funders_read_by_finance` (0004) already excludes those roles — RLS does
the filtering, not application logic.

**Deliberately not split into server page + client component**, unlike
every other page this session — the only interaction is a native
`<form method="GET">` submitting a `?q=` parameter, no client state
needed. Worth noting as a real judgment call, not an oversight: reach for
the split when a page has genuine interactivity (a write, a toggle,
refetching), not by habit.

ILIKE wildcard characters (`%`, `_`) are escaped in the search term before
querying, so a literal search for e.g. "50%" doesn't behave like an
unintended wildcard match.

Verified: `tsc --noEmit` clean, `next build` clean, 21 routes.

## 2026-08-19 — Appointments, and a new rule for adding tables going forward

Second cross-cutting page, per the agreed order (Search, Appointments,
Messages, then the rest). `p-appointments` reaches finance, HOD, HR,
leadership, and staff — confirmed against the real gating output, not the
handover's prose (which says "shared by every role including donors," but
the actual NAVMAP entry for donor has no `p-appointments` in it at all).

New top-level route, `/appointments` — deliberately not nested under
`/leadership/` like recent pages, since staff and HR reach this too and
shouldn't need a URL implying otherwise. Same v1 scope trade-off already
made for tasks/projects (0005): any non-donor org member can read and
write any appointment, not filtered to attendees yet — stated in the
migration's own comment, not silently narrower than it looks.

**Surfaced a real process gap, not a bug**: adding `0008_appointments.sql`
broke `tsc --noEmit` immediately, because the real, typed Supabase clients
(wired in earlier this session) correctly know `appointments` doesn't
exist — the migration file exists, but nobody has run it against the live
project yet, so the real generated types have never seen this table. This
is the new reality of having real types: schema changes now require a
regeneration step before the build can verify clean, every time, not just
once.

Handled by hand-adding a stub to `database.types.ts` matching the real
`supabase gen types` conventions exactly (built by comparing against
`fund_lines`, a structurally similar existing table) — clearly marked
PROVISIONAL in its own comment, not passed off as generated. This unblocks
local verification without a round trip, but it is not the real thing.

**Action for the user, same two steps as before, now routine**: run
`0008_appointments.sql` in the SQL Editor, then regenerate
`database.types.ts` for real (`supabase gen types typescript --linked`)
and send it over — the provisional stub should be replaced wholesale by
the real file, not left alongside it.

Verified: `tsc --noEmit` clean, `next build` clean, 22 routes.

## 2026-08-19 — Real types confirmed for appointments, provisional stub retired

User regenerated database.types.ts for real after running 0008. Verified
before swapping anything in: 15 tables now (was 14), appointments present.
Compared the real generated appointments Row shape against the
hand-written PROVISIONAL stub from the previous entry — exact match, field
for field. Installed the real file, replacing the stub wholesale as
intended rather than merging.

Verified: tsc --noEmit clean, next build clean. No code changes needed —
this was purely a types swap, confirming the stub's job (unblock local
verification without being mistaken for the real thing) worked as
intended.

## 2026-08-25 — Messages (p-messages)

Built the last cross-cutting page from the agreed backlog order (Search,
Appointments, **Messages**, then the rest). Reachable by every NGO role,
donor included — confirmed against the real gating output
(`getNavItems()`/`NAVMAP`), not assumed: `NAVMAP.donor` genuinely carries
`p-messages`, unlike `p-appointments`, which does not.

**Real design decision, not just wiring**: unlike every other table added
this project (tasks, appointments — both explicitly org-wide v1 scope,
gap tracked for later), messages are scoped to the two participants from
the start. A private message readable by every colleague would defeat the
point of the feature, so this isn't a deferred narrowing, it's the correct
rule immediately. `0009_messages.sql`:

- `recipient_code` is free-text `employee_code`, same pattern as
  `tasks.assignee` (0005) and `appointments.attendees` (0008) — not a
  foreign key.
- `sender_code`/`sender_name` is a denormalized pair, same shape as
  `media.uploaded_by_code`/`uploaded_by_name` (0007). This one matters more
  than it did there: `employees_read_org` (0003) denies donors any
  directory read, so a donor receiving a message from staff has no other
  way to learn who sent it — denormalizing at insert time sidesteps that
  entirely rather than requiring a new RLS carve-out.
- `refs` (nullable `jsonb`) exists per `packages/core/src/types/message.ts`'s
  pre-existing `MessageRef` (a "this is about task/project/funder X" tag,
  ported from the original monorepo restructure but never backed by a real
  table until now) — not populated by this v1's UI. No picker exists yet,
  same trade-off already stated for tasks' geofence fields.
- No `updated_at`, no touch/freeze triggers, no update/delete policy:
  messages are immutable once sent. No edit/unsend/read-receipt feature
  exists.
- RLS: `messages_read_participant` (`org_id = app.org_id() and (sender_code
  = app.employee_code() or recipient_code = app.employee_code())`) and
  `messages_insert_by_participant` (same org check, plus `sender_code =
  app.employee_code()` — sender identity is asserted by the database, not
  trusted from the client, so nobody can send as someone else).
  `org_id = app.org_id()` rather than `app.is_staff_of(org_id)` is
  deliberate — the latter excludes donors, and a donor here is meant to be
  a full participant, exactly like anyone else with an active `employees`
  row (0003's own description of what a donor is).

Built `/messages` (`p-messages`, previously falling through to
`/coming-soon`) — top-level route, not nested under `/leadership/`, same
reasoning as `/appointments`: reached by every role, not just
leadership-adjacent ones. No page-level role check — every NGO role in
`NAVMAP` carries `p-messages`, so anyone with a session is a valid
participant. Server page + client component split, same pattern as every
other page this project: compose form (recipient code, body) plus an
Inbox/Sent split (received vs. sent, rather than upcoming/past like
Appointments — the more natural split for a message list).

**Also fixed in passing, not the main point of this pass**:
`packages/core/src/types/database.types.ts` was still genuinely UTF-16LE
with CRLF line endings on disk, despite this file's own 2026-08-19 entry
("Real database types wired in") and `docs/LEARNINGS.md` both stating it
had been converted to UTF-8. `tsc`/`next build` never caught this because
both decode a BOM correctly regardless of source encoding — it only
surfaced because a previous review pass ran `file` on it directly. `file`
misdetected the picture originally described to the user as "already
UTF-8 with just a stray BOM"; that was wrong, it was real UTF-16LE.
Converted for real this time (`iconv -f UTF-16LE -t UTF-8`, BOM and `\r`
stripped), verified by line count and `file` afterwards, before adding the
`messages` stub below it.

**Following the routine established for appointments (2026-08-19)**: no
Supabase credentials are available in this session (`supabase login` was
run once, on a different machine/session — `npx supabase db push` here
fails with `LegacyPlatformAuthRequiredError`), so `0009_messages.sql` is
written and reviewed but not yet run against the live project. Added a
PROVISIONAL stub for the `messages` table to `database.types.ts`, built by
comparing against `appointments` (a structurally similar real table) and
clearly commented as such, to unblock local verification.

**Action for the user, same two steps as appointments**: run
`0009_messages.sql` in the SQL Editor, then regenerate
`database.types.ts` for real (`supabase gen types typescript --linked`)
— the provisional stub should be replaced wholesale, not merged alongside.

Verified: `tsc --noEmit` clean, `next build` clean (26 routes, `/messages`
correctly dynamic), `eslint` clean on the new files.

**Not yet tested against real data** — no message has actually been sent
through the UI yet (no live project to send it to). Natural next check
once the migration is run: two accounts of different roles (including one
donor), confirm each sees only their own sent/received messages and not
each other's unrelated conversations.

## 2026-08-25 — Real messages migration run, and recovered a merge that emptied database.types.ts

The user ran `0009_messages.sql` against the live project and pushed a
"env.example and types repull" commit directly to this branch (also fixed
`apps/ngo/.env.example`, previously a 0-byte file, filling in the three
required vars — but with a typo, `PABASE_SERVICE_ROLE_KEY` instead of
`SUPABASE_SERVICE_ROLE_KEY`, fixed in this pass). Their regenerated
`database.types.ts` had the real `messages` table, matching the PROVISIONAL
stub field-for-field — same confirmation step already used once for
appointments.

**Found a real, live bug on this branch before it could bite anyone**: a
GitHub-UI merge commit already present on the remote branch
(`19fac67`, "Merge branch 'main' into claude/repo-review-c292wz") had
reduced `database.types.ts` to a completely empty file — not a conflict,
not a bad merge of content, an empty file, silently committed. Confirmed
by extracting the blob directly (`git show 19fac67:...`); merging that
state into the local branch reproduced it immediately. Every Supabase
client in the app is typed against `Database` from this file, so this
would have broken the build for anyone who pulled the branch as it stood.

Root cause is almost certainly the recurring one already in
docs/LEARNINGS.md: `database.types.ts` is UTF-16LE with CRLF (the
generator's Windows-side output, per the "types repull" commit — same
issue flagged again just one session after the previous "fixed for real
this time" entry above, so evidently it keeps regenerating this way and
needs re-checking every time, not just once). A UTF-16 file reads as
mostly binary to a line-based diff/merge; GitHub's web merge UI has no way
to merge two binary versions and appears to have resolved the conflict by
picking neither side's content.

**Fixed by recovering the real content, not by re-deriving it**: pulled
the real regenerated blob from the "types repull" commit directly
(`git show 812dbed:packages/core/src/types/database.types.ts`), converted
UTF-16LE → UTF-8, stripped the BOM and `\r`, verified line count and
`file` output, and installed that as the real `database.types.ts` —
same conversion done earlier this session for the same file, now needed
a second time because the merge undid it. `tsc --noEmit` and `next build`
both clean afterward, `/messages` still correctly dynamic among 26 routes.

**Practical rule worth stating plainly for next time this file is
regenerated**: after any merge or rebase that touches
`database.types.ts`, check that the file is non-empty and UTF-8 before
trusting the merge succeeded — a green `tsc`/`next build` on a stale
cached version would not have caught this, only actually looking at the
file's current byte count would have.

## 2026-08-25 — Compose Report, last of the cross-cutting pages

Built `/compose` (`p-compose` — finance, HOD, HR, leadership, staff; not
donor). New table, `0010_summary_reports.sql`: the backbone of the
reporting chain the handover describes (staff/HOD submit, leadership reads
the roll-up) — this page is the write side only. Submit Report and
Summary Reports, the read/roll-up views, remain separate and unbuilt;
they'll read this same table.

Same v1 scope trade-off already made and stated plainly for
tasks/projects/appointments: any non-donor org member can read and write
any report, not filtered to a real reporting hierarchy yet — the
migration's own comment says so rather than leaving it implicit.

Hit the now-familiar new-table wall immediately: `tsc --noEmit` failed
because the real types don't know about `summary_reports` until the
migration is run and regenerated. Added a PROVISIONAL stub to
`database.types.ts`, matching the established format, clearly labeled,
alphabetically placed after `projects`.

Verified: `tsc --noEmit` clean, `next build` clean, 23 routes in this
sandbox specifically — this sandbox never received the actual `messages`
page files Claude Code wrote (only the docs describing them), so this
count is one lower than the real repo's true total. Not a discrepancy to
chase, just an artifact of what files were actually shared this round.

**Action for the user, same routine as appointments and messages**: run
`0010_summary_reports.sql`, regenerate `database.types.ts` for real, send
it over — the stub gets replaced wholesale, not merged alongside.

This closes out the cross-cutting round (Search, Appointments, Messages,
Compose Report). Next per the agreed order: HOD workspace, entirely
unbuilt — 11 pages. HR after that, 2 pages.

## 2026-08-25 — Real types confirmed for summary_reports, second stub retired

User regenerated database.types.ts after running 0010. 17 tables now (was
15 at last confirmation — messages had also landed in between). Compared
the real summary_reports Row shape against the PROVISIONAL stub from the
previous entry — exact match, field for field, same as the appointments
confirmation before it. Installed the real file wholesale.

Verified: tsc --noEmit clean, next build clean. No code changes needed.

## 2026-08-26 — HOD workspace (11 pages)

Built the entire HOD workspace per the agreed order (HOD after the
cross-cutting round, HR after that). Checked the real gating output first,
not the handover's prose: `NAVMAP.hod` carries 11 `p-hod-*` page ids that
were NGO-reachable and still `/coming-soon` — `p-hod-dashboard`,
`p-hod-team`, `p-hod-tasks`, `p-hod-summaries`, `p-hod-submit`,
`p-hod-feed`, `p-hod-access`, `p-hod-payroll`, `p-hod-projects`,
`p-hod-requests`, `p-hod-media` — matching the task's own count exactly.
The rest of `NAVMAP.hod` (`p-mf-*`, `p-sm-*`, `p-re-*`) is module-gated to
sectors the NGO app never resolves to, already correctly hidden; `p-search`/
`p-messages`/`p-appointments`/`p-compose`/`p-lead-templates` are shared
pages already built or out of scope. None of the 11 `p-hod-*` ids appear in
any other role's `NAVMAP` entry — reachable only by `hod` (plus `extra_roles`/
`extra_pages`, the general per-employee grant mechanism, unused by default).
All 11 gated to `hod`/`admin` at the page level, RLS as the real boundary
underneath as always.

New top-level route group `/hod/*`, mirroring `/leadership/*` and
`/staff/*`.

**Reused existing tables, department-filtered, no new schema** (7 pages):
- **My Team** (`/hod/team`) — `employees`, filtered to
  `department = employee.department`. Read-only; adding staff and issuing
  setup tokens stays Staff Management's job.
- **Dept Dashboard** (`/hod/dashboard`) — `tasks`, `dept`-filtered, same
  stat-tile shape as `staff/dashboard`.
- **Tasks** (`/hod/tasks`) — `tasks`, `dept`-filtered read + write form
  (department fixed, not free text like leadership's org-wide version).
- **Media Library** (`/hod/media`) — `media`, `department`-filtered
  read + upload form, same pattern as `leadership/media`.
- **Team Summaries** (`/hod/summaries`) — `summary_reports`,
  `department`-filtered, read-only roll-up.
- **Submit Report** (`/hod/submit`) — `summary_reports`, write form with
  department fixed to the HOD's own. Distinct page id from the
  cross-cutting Compose Report (`p-compose`, still reachable by hod too),
  not a replacement for it — the handover names both separately.
- **Projects** (`/hod/projects`) — `projects` + `project_milestones`,
  deliberately **not** department-filtered: the table has no department
  column, and the existing single-project v1 assumption (leadership's own
  page already only shows the most recent project org-wide) leaves nothing
  to filter by department yet. Stated explicitly rather than silently
  narrower than it looks — a real future need if multi-project support
  ever lands. Client component intentionally duplicates
  `LeadershipProjectsClient` rather than cross-importing it, matching how
  every other near-identical pair of pages in this project (e.g.
  `staff/dashboard` vs `staff/tasks`) each own their client component.

**New infrastructure** (migrations `0011`–`0013`):

- **`0011_activity_events.sql`** — backs Access Log (`/hod/access`) and
  Dept Feed (`/hod/feed`), both reading the same table, dept-filtered, with
  different framing (audit-style table vs. casual feed list) since the
  handover names them as separate pages, not because the data differs.
  Both Tasks and Submit Report insert into it (best-effort, after their own
  primary write succeeds), so the table has real content immediately
  rather than sitting empty until something else populates it later — the
  user's own call when asked whether Dept Feed should read this table or
  aggregate existing tables instead. Per the handover this table is also
  meant to become the backbone for Timeline (leadership) and the staff
  Team Feed later — both out of scope here, the reason it was shaped
  generically rather than narrowly for Access Log alone.

  **Real discovery mid-build, not assumed going in**: running
  `packages/core`'s own standalone `tsconfig.json` (not just `apps/ngo`'s,
  which never reaches a file nothing imports) surfaced
  `packages/core/src/kpi/sessions.ts` — pure logic ported wholesale in the
  original monorepo restructure (2026-08-18), sitting completely unused and
  invisible until now — already importing an `ActivityEvent` type from this
  exact module path and building work sessions out of `'login'`/`'logout'`
  events keyed by `user_code`/`user_name`/`role`. The table was designed
  with `actor_code`/`actor_name` first; renamed to `user_code`/`user_name`
  and added a `role` column to match this pre-existing real consumer
  instead of colliding with it under different field names. One table now
  genuinely serves three consumers instead of two, found instead of guessed.
  The type file wrapping the table (`types/activity-event.ts`) turned out
  to be pre-existing too, not new — overwritten without reading it first,
  functionally identical afterward but a real process slip; see
  docs/LEARNINGS.md for the full correction and the practical rule that
  came out of it.

- **`0012_approvals.sql`** — minimal, stated scope: Requests
  (`/hod/requests`) lets a person submit a request and see their own
  status. No leadership review/approve UI in this pass (`p-lead-approvals`
  doesn't exist either) — no update policy on the table for exactly that
  reason, not built halfway silently. Shape follows the ported-but-
  previously-unbacked `packages/core/src/types/approval.ts` (now finally
  wired to a real table) and the schema trap already in
  docs/LEARNINGS.md: `req_items` is JSON-encoded text, not `jsonb`.

- **`0013_payroll_fields.sql`** — `ALTER TABLE employees` adding
  `basic_salary`, `housing_allowance`, `transport_allowance`,
  `other_allowances`, `annual_rent`, `nhf_opt_in`. Columns on `employees`
  rather than a new `payroll` table: this is current salary structure
  (per-employee state, same kind of thing `hourly_rate` already is), not a
  transactional ledger — there's no payroll *run* history in this v1, PAYE
  is computed on read from whatever the columns currently hold, same
  trade-off already made for `fund_lines.disbursed`. Payroll
  (`/hod/payroll`) is deliberately **read-only**: `employees_update_by_hr`
  (0003) correctly excludes `hod` from writing to `employees` — a
  department head not being able to edit compensation data without HR is
  the right RLS boundary, not a page that should route around it with an
  edit form. Setting salary structure is SQL-only for now, a real stated
  gap.

  `packages/core/src/finance/payroll.ts` — direct port of the legacy
  `computePAYE()` per docs/LEARNINGS.md's "Payroll is fully built, not
  deferred" entry: band widths (not thresholds), 8% pension, optional 2.5%
  NHF, rent relief at 20% capped at 500,000. Not re-derived.

Same routine as appointments/messages/summary_reports before it: no
Supabase credentials in this session (`npx supabase db push` still fails
with `LegacyPlatformAuthRequiredError`), so all three migrations are
written and reviewed but not run. PROVISIONAL stubs added to
`database.types.ts` for `activity_events`, `approvals`, and the six new
`employees` columns, matching the established format and clearly labeled.
**Action for the user**: run `0011_activity_events.sql`,
`0012_approvals.sql`, `0013_payroll_fields.sql` in that order, then
regenerate `database.types.ts` for real and send it over — the stubs get
replaced wholesale, not merged alongside.

**Also found, not fixed, flagged here rather than silently left**:
`apps/ngo/src/app/(app)/leadership/staff/dashboard/` and
`leadership/staff/tasks/` are byte-identical duplicates of
`staff/dashboard/` and `staff/tasks/` — confirmed via `diff`, zero output.
Nothing in the codebase links to `/leadership/staff/dashboard` or
`/leadership/staff/tasks` (`page-routes.ts` only ever pointed
`p-staff-dashboard`/`p-staff-tasks` at the top-level `/staff/*` routes), so
these are dead, unreferenced routes that still build and would still
render if visited directly. Left alone rather than deleted without being
asked — worth the user's call on whether to remove them.

`database.types.ts` was, again, genuinely UTF-16LE with CRLF on disk
(confirmed via `file`, not assumed) — the third time this exact recurrence
has been caught in this project. Converted to UTF-8/LF before any edits,
same as the last two times. See docs/LEARNINGS.md — this is evidently a
standing property of the regeneration workflow, not something that stays
fixed once corrected.

**New verification step worth keeping going forward**: `packages/core` has
its own `tsconfig.json` (`npx tsc -p packages/core/tsconfig.json --noEmit`)
that checks every file in the package, not just what `apps/ngo` happens to
import. `apps/ngo`'s own `tsc --noEmit` — the check this project has run
before every build so far — cannot see a file nothing imports, which is
exactly how `kpi/sessions.ts`'s pre-existing expectations stayed invisible
until this pass. Running both from now on, not just `apps/ngo`'s, costs
little and would have caught this collision immediately instead of mid-build.

Verified: `tsc --noEmit` clean in both `apps/ngo` and `packages/core`
(the latter still carries pre-existing, unrelated errors in dead ported
type files — `app-user.ts`, `invoice.ts`, `monitor.ts`, `monitor-entry.ts`,
`org-targets.ts`, `performance-review.ts`, `platform-staff.ts`,
`staff-kpi.ts`, `staff-target.ts`, `task-event.ts`, `task-stop.ts`,
`compute.ts` — confirmed pre-existing via `git stash`, not introduced this
pass, not fixed here since none of them are in scope). `next build` clean,
37 routes, all 11 new `/hod/*` routes correctly dynamic (ƒ). `eslint`
clean on every new file.

**Not yet tested against real data** — no live Supabase project in this
session, so no task/report/media/request has actually been created through
these pages yet, and Dept Feed/Access Log have no rows to show until
someone does. Natural next check once the migrations are run: sign in as
an `hod` account with a department set, create a task and submit a report
through the new pages, confirm both show up in Dept Feed and Access Log,
and confirm a second `hod` account in a different department sees none of
it.

Also added `hod: '/hod/dashboard'` to `ROLE_HOME` in `page-routes.ts` —
previously missing, same gap already fixed once for `donor`
(2026-08-19, "Donor portal") — an hod account clicking Home fell through
to `/coming-soon` until now.

This closes the HOD workspace. Next per the agreed order: HR, 2 pages.

## 2026-08-26 — HR workspace (2 pages), and the salary-structure gap that was the real point

**Re-ran the actual resolver script this time, not a hand count.** The
previous entry's "28 of 59" was wrong — verified by writing and running a
real script (`getNavItems()` against the same NGO fixture used since
2026-08-18, every role, cross-referenced against `routeForPage()`), not
estimated: the real number going into this session was **29 of 59 built**.
Full per-role output, captured before any code changed this session:

```
staff:      12 nav items,  5 built,  7 coming-soon
hod:        16 nav items, 15 built,  1 coming-soon  (p-lead-templates)
leadership: 34 nav items, 13 built, 21 coming-soon
donor:       4 nav items,  4 built,  0 coming-soon
finance:    13 nav items,  7 built,  6 coming-soon
admin:      11 nav items,  0 built, 11 coming-soon
hr:         10 nav items,  6 built,  4 coming-soon  (p-hr-dashboard,
             p-hr-reviews, p-lead-delivery, p-lead-access coming-soon)

TOTALS: 69 unique page ids reachable by some role, 29 built, 40 coming-soon
```

The historical "59 unique NGO pages" denominator excludes `admin`'s 10
platform-admin-only ids (`p-admin-*`; `p-lead-templates` is shared so
doesn't add a new one) — `69 − 10 = 59`, and since none of admin's ids are
built, the correction is exact: **29 of 59, not 28**. The script itself
isn't committed anywhere (run from the scratchpad, not part of the repo) —
worth reconstructing again next time rather than trusting either number by
eye, per the standing rule.

Cross-referenced `NAVMAP.hr` against `page-routes.ts` the same way: most
of what `hr` reaches was already built and shared (`p-lead-staff`,
`p-lead-add-staff`, `p-search`, `p-messages`, `p-appointments`,
`p-compose`) — only `p-hr-dashboard` (HR Overview) and `p-hr-reviews`
(Performance Reviews) were genuinely new, matching the task brief exactly.

**Built first, before either new page — the actual reason this batch
exists**: salary-structure editing on Staff Management
(`leadership/staff/`). The six columns `0013_payroll_fields.sql` added for
HOD Payroll (`basic_salary`, `housing_allowance`, `transport_allowance`,
`other_allowances`, `annual_rent`, `nhf_opt_in`) had no UI anywhere —
SQL-only, meaning Payroll could never be exercised through the app.
Verified the real policy name first rather than assuming it (the task
brief specifically flagged that `employees_update_by_hr` had gone
unverified in the HOD session's own summary): confirmed at
`0003_auth_and_rls.sql:169`, real, scoped to `leadership/hr/admin` on both
`USING` and `WITH CHECK`. That's an exact match for the six new columns'
needs, so **no new migration** — `page.tsx`'s select and
`StaffManagementClient.tsx` were extended with an inline per-row "Edit
salary" form (collapsible, one row per employee) that writes through the
same RLS-scoped update the page already used for other employee edits.

**Real bug hit and fixed in the process, worth its own note**: writing the
extended `.select(...)` call as a string built with `+` concatenation
(`'a, b, c, ' + 'd, e, f'`) broke Supabase's compile-time column-type
inference — `apps/ngo`'s `tsc` failed with `Conversion of type
'GenericStringError[]' to type 'EmployeeListItem[]' may be a mistake`.
Fixed by writing the select list as a single string literal instead.
See docs/LEARNINGS.md for the general lesson — this is exactly the kind of
thing worth a real entry, not a promised one.

**New table** — `0014_performance_reviews.sql`. No handover or ported-type
guidance on its shape existed (`packages/core/src/types/performance-review.ts`
was a dead stub with zero columns, unlike `approval.ts`, which at least had
`req_items`'s shape to go on) — designed fresh from the task brief's own
description ("review records per employee"): `employee_code`/
`employee_name` and `reviewer_code`/`reviewer_name` denormalized pairs
(matching `summary_reports.author_code`/`author_name`), `period`, `rating
numeric(3,1)`, `strengths`/`areas_for_growth`/`notes` free text, `status`
(`draft`/`submitted`, same enum shape as `summary_reports.status`).

**RLS deliberately breaks from the org-wide v1 shape used for every other
table this project** (tasks, appointments, summary_reports,
activity_events, approvals — any non-donor staff reads/writes any row).
Performance reviews are personal and sensitive, and the handover scopes
this page to HR specifically. Both `select` and the write policy restrict
to `app.is_staff_of(org_id) and app.role() in ('leadership','hr','admin')`
— the same role set as `employees_update_by_hr`, and the same *shape* of
restriction already used once before for `income`/`expenses`/`funders`
(just a different three roles: `leadership/finance/admin` there). Whether
an employee should eventually read their own review is a real open
question the handover doesn't answer — not built, stated as a gap, not
silently decided either way.

No Supabase credentials in this session (`npx supabase projects list`
still fails with `LegacyPlatformAuthRequiredError`), same as every new
table before it — `0014_performance_reviews.sql` is written and reviewed
but not run. PROVISIONAL stub added to `database.types.ts`, built by
comparing against `summary_reports` (structurally closest real table),
clearly labeled. **Action for the user**: run
`0014_performance_reviews.sql`, regenerate `database.types.ts` for real,
send it over — the stub gets replaced wholesale, not merged alongside.
`database.types.ts` was genuinely UTF-8 already at the start of this
session (checked with `file` before touching it, not assumed) — the
UTF-16LE recurrence did not happen a fourth time this pass.

**Pages**:
- **HR Overview** (`/hr/dashboard`) — read-only: headcount, department
  spread (active employees grouped by department), review status (counts
  by `draft`/`submitted`, most recent 8), recent joiners (5 most recently
  created). Reads `employees` (org-wide read, `employees_read_org`) and
  `performance_reviews` (HR-restricted, matching this page's own role
  gate). Split into server page + presentational client component even
  though there's zero interactivity — same call already made for HOD's
  Team Summaries: the standing rule is the split itself, not "only when
  there's a form."
- **Performance Reviews** (`/hr/reviews`) — read + write: create-review
  form (employee code, period, rating 1–5, strengths, areas for growth,
  notes, draft/submitted) plus a list of all reviews. Reviewer identity
  (`reviewer_code`/`reviewer_name`) comes from the signed-in session, not
  a form field — same "asserted by the server, not trusted from the
  client" spirit as every other denormalized-actor table, though RLS here
  doesn't yet enforce reviewer_code = app.employee_code() the way
  messages.sender_code does; any HR/leadership/admin account can write a
  review as if authored by any other HR account. Not tightened here since
  the handover doesn't call for per-reviewer attribution to be
  security-enforced, just noted as a real gap rather than assumed covered.

Also added `hr: '/hr/dashboard'` to `ROLE_HOME` in `page-routes.ts` — same
gap already fixed twice before (`donor`, then `hod`) — an hr account
clicking Home fell through to `/coming-soon` until now.

Verified: `tsc --noEmit` clean in both `apps/ngo` and `packages/core`'s
own standalone tsconfig (16 pre-existing, unrelated errors in dead
ported-type files, confirmed identical to the HOD session's own confirmed
baseline — no new ones, no `performance-review.ts` error now that its
table exists). `next build` clean, 39 routes, both `/hr/*` routes and the
unchanged `/leadership/staff` route all correctly dynamic (ƒ). `eslint`
clean on every new and changed file.

**Re-ran the resolver script one more time after building**, same
methodology: **31 of 59 unique NGO pages built, 28 still coming-soon.**
`hr` itself: 8 of 10 nav items built — only `p-lead-delivery` and
`p-lead-access` remain, both shared leadership-facing pages out of scope
for this batch (already tracked as open gaps elsewhere).

**Not yet tested against real data** — no live Supabase project in this
session, so no salary structure, review, or anything else has actually
been saved through these forms yet. Natural next check once
`0014_performance_reviews.sql` is run: set a salary structure on an
employee through the new Staff Management form, confirm the HOD Payroll
page (`/hod/payroll`) picks it up and computes a real PAYE breakdown
instead of showing "No salary structure set"; create a review through
`/hr/reviews`, confirm it shows up on `/hr/dashboard`'s review-status
card; confirm a `staff`/`hod` account cannot reach `/hr/reviews` or query
`performance_reviews` directly.

This closes the agreed backlog order (cross-cutting → HOD → HR). 28
NGO-relevant pages remain coming-soon, all leadership-specialized or
platform-admin at this point — no other entirely-unbuilt workspace is
left.

## 2026-08-31 — Staff workspace (7 pages), closes out the last entirely-unbuilt-page batch

Built the remaining seven `p-staff-*` pages: Team Feed, Media Library,
Projects, Requests, Resources, Submit Report, Summary Reports. Staff already
had Dashboard and Tasks; this closes the workspace to 12/12.

**Ran the real resolver script first, not a hand count** — same
`getNavItems()`/`NAVMAP`/`routeForPage()` methodology used every session
since 2026-08-18, fixture unchanged (sector `'Development and Advocacy'`,
`modules: null`). Baseline going in matched the HR session's own closing
number exactly: **31/59 built, staff 5/12**. Re-run after this batch:
**staff 12/12, org total 38/59 built, 21 still coming-soon** — every
remaining id is leadership-specialized (`p-lead-*`) or two cross-sector ids
(`p-pm-projects`, `p-mon-board`) that never resolve true for this NGO org
anyway. No workspace is even partially unbuilt anymore; what's left is all
inside `leadership`'s own 34-item nav.

**No new migrations, confirmed before writing anything** — every table this
batch touches (`approvals`, `summary_reports`, `activity_events`, `media`,
`projects`/`project_milestones`) already has real, non-PROVISIONAL rows in
`database.types.ts`, and RLS on all five is already `app.is_staff_of(org_id)`
(any non-donor org member reads/writes), the same v1 trade-off used
everywhere else in this project. `database.types.ts` was, again, genuinely
UTF-16LE with CRLF on disk at the start of this session — the **fourth**
recurrence — confirmed via `file`, converted the same way as every prior
time before touching anything (`iconv -f UTF-16LE -t UTF-8`, BOM and `\r`
stripped; the diff against git is a pure binary/encoding change, zero
content difference — verified with `git diff --stat`).

**Pages, all server-page + client-component split, all gated at the page
level to `['staff','admin']`** (a UX nicety on top of already-permissive
RLS, matching the HOD/HR convention rather than the older, ungated
`staff/dashboard`/`staff/tasks` precedent — stated in each file's own
comment, not left to imply the check is doing more than it is):

- **Requests** (`/staff/requests`) — near-verbatim port of
  `HodRequestsClient`: submit against `approvals`, see only your own status
  (`requester_code = employee_code`). No review UI, same open gap already
  logged for HOD's version.
- **Submit Report** (`/staff/submit`) — near-verbatim port of
  `HodSubmitClient`: writes `summary_reports` with department fixed from
  the session, same best-effort `activity_events` write after so Team Feed
  has real content immediately.
- **Summary Reports** (`/staff/summary`) — the one page in this batch that
  is *not* a department-filtered HOD sibling. Filtered to
  `author_code = employee.employee_code` — a staff member's own submission
  history, not their department's. Called out explicitly per the task
  brief's own warning that this is easy to get wrong by copying HOD's
  department filter out of habit.
- **Team Feed** (`/staff/feed`) — near-verbatim port of `HodFeedClient`:
  `activity_events`, department-filtered. The name says "team," not
  "mine" — the department's feed from a staff seat, same table Access Log/
  Dept Feed already read.
- **Media Library** (`/staff/media`) — near-verbatim port of
  `HodMediaClient`: **read and upload**, department-scoped. Decided
  against read-only: `media_write_by_staff` (0004) already permits any
  non-donor staff member to upload, and making staff's version read-only
  would create an asymmetry RLS doesn't ask for (a department head can add
  department media, a regular staff member in the same department
  couldn't).
- **Resources** (`/staff/resources`) — new client, reads `media` **only**,
  templates half stated as deferred (no table, no migration, still on the
  leadership-specialized backlog — `p-lead-templates` itself is
  coming-soon for every role that reaches it). Deliberately **org-wide,
  read-only**, distinct scope from Media Library on purpose: framed as a
  shared reference library ("what the org already has") rather than "my
  department's uploads." `media_read_by_staff` (0004) already permits
  org-wide read for any non-donor member, so this needed no RLS change,
  just the query dropping the `.eq('department', ...)` clause Media
  Library keeps.
- **Projects** (`/staff/projects`) — same `projects`/`project_milestones`
  tables and single-most-recent-project v1 assumption as leadership's and
  HOD's versions. **Read-only for staff**, unlike HOD (which kept
  leadership's write forms) — the one genuine judgment call in this batch
  flagged rather than decided silently. `projects_write_by_staff` (0005)
  would permit staff to write, but handing every staff account (a much
  larger population than department heads) the ability to create/edit the
  org's one active project by default is a bigger permission to hand out
  than RLS strictly requires. Stated as a deliberate default, not a
  limitation of what's possible — widening this later is a real, explicit
  choice if the org wants it.

Verified: `tsc --noEmit` clean in `apps/ngo`; `npx tsc -p
packages/core/tsconfig.json --noEmit` clean except the same 11
pre-existing, unrelated dead-ported-type-file errors already logged
(`app-user.ts`, `compute.ts`, `invoice.ts`, `monitor.ts`,
`monitor-entry.ts`, `org-targets.ts`, `platform-staff.ts`, `staff-kpi.ts`,
`staff-target.ts`, `task-event.ts`, `task-stop.ts` — confirmed via
`git status` that none of these files were touched this session, not
re-verified with `git stash` since nothing in the working tree touches
them). `next build` clean, 46 routes, all 7 new `/staff/*` routes correctly
dynamic (ƒ). `eslint` clean on every new file.

**Not yet tested against real data** — no live Supabase session available
in this sandbox, so no request/report/media/project has actually been
created through these seven pages yet. Natural next check once a real
account exists: sign in as `staff` with a department set, submit a report
and a request, upload a file to Media Library, confirm all four show up in
the right places (Team Feed picks up the report's activity_events row,
Summary Reports shows only that account's own report and not a
colleague's, Media Library shows the upload department-scoped, Resources
shows it org-wide); confirm Projects renders read-only (no create form
visible) even for a `staff` account; confirm a `donor` account cannot reach
any `/staff/*` route directly by URL (page-level check should block it,
RLS would also block the underlying reads/writes even if it didn't).

## 2026-09-02 — Correction: p-mon-board and p-pm-projects were never dead ends

Before building anything this session, the task brief flagged that two
EXECUTION.md entries disagree with each other about `p-mon-board` and
`p-pm-projects`: the 2026-08-19 "Backlog reckoning" entry treated the full
coming-soon count as reachable-but-unbuilt for leadership; this session's
own two 2026-08-31 entries (the dated entry and its "Open at end of
session" summary, both now above/removed respectively — see below)
asserted both ids "never resolve true for this NGO org ... dead ends for
gating reasons, excluded from the denominator entirely."

**Checked mechanically rather than picking one, per the task's own
instruction**: ran `getNavItems('leadership', org, emp)` directly against
the unchanged NGO fixture and inspected the real output. Both ids **are**
present. Traced why: neither `p-mon-board` nor `p-pm-projects` has an
entry in `FEATURE_NAV` at all, and `navItemAllowed()` returns `true`
unconditionally when a page id has no `FEATURE_NAV` entry (`if (!mod)
return true;`) — there is no module gate on either id, full stop. They are
genuinely reachable, coming-soon leadership pages, not dead ends.

**The 2026-08-31 claim was wrong.** Per docs/LEARNINGS.md's own
append-only-correction convention (never silently edit a wrong claim away,
say plainly it was wrong), this is that correction. The original
2026-08-31 dated entry further up this file is left untouched, as
EXECUTION.md's own append-only rule requires — this entry is the
correction, not a rewrite of that one. The "Open at end of session"
section that also carried the wrong claim was, by contrast, always the
mutable, rewritten-every-time-it's-touched status snapshot its own text
said it was — it has been replaced outright by the fresh version at the
end of this file, which does not repeat the error. CLAUDE.md's "Known open
gaps" section (same kind of mutable summary, not a log) is corrected
below, in this session's own update to it.

**Practical consequence**: the resolver's real denominator has always
been the full 59-id count including these two — nothing about counts
reported in earlier sessions (29/59, 31/59, 38/59, all before this
correction) was actually wrong, since none of those counts excluded
`p-mon-board`/`p-pm-projects` from the coming-soon side either; only this
session's own prose characterization of *why* they were coming-soon was
wrong, not any arithmetic. Confirmed by re-deriving the leadership
coming-soon list fresh this session (below) and finding both ids present
in it, consistent with every prior session's raw count.

## 2026-09-02 — Approvals (review UI) and the Money pages (5 pages)

Built the five remaining money-related pages: Approvals / Disbursement
Queue, Income, Spend vs Income, Invoices, and leadership's own Payroll.
Closes `p-lead-approvals`, `p-lead-income`, `p-lead-invoices`,
`p-lead-spend`, `p-lead-payroll`.

**Ran the real resolver script first, not a hand count** — same
methodology as every session since 2026-08-18, same unchanged NGO fixture.
Baseline going in matched the staff-workspace session's real closing
number: **38/59 built**. Re-run after this batch: **43/59 built, 16 still
coming-soon** — every remaining id is inside `leadership`'s own nav or the
two cross-sector ids addressed in the correction entry above.

**Two new migrations, both genuinely needed, checked first rather than
assumed**:

- **`0015_approvals_review.sql`** — `0012` shipped deliberately with no
  UPDATE policy ("nothing can move a request out of 'pending' yet ... a
  real, stated gap, not an oversight"). Adds one UPDATE policy restricted
  to `leadership/finance/admin`, matching the role set that already
  governs income/expenses/funders. Same limitation already accepted for
  `project_milestones_write_by_staff` (0005) stated again here: a plain
  role-based UPDATE policy can't distinguish "approve/reject this" from
  "edit any other column" — not solved with a trigger, stated plainly.
  `reviewed_by` stores the reviewer's full name (not a code) — `approvals`
  has no paired `reviewed_by_name` column, so `expenses.created_by`
  (already a name, not a code, per 0005) is the closer precedent than
  `requester_code`/`requester_name`.
- **`0016_invoices.sql`** — the one genuinely new table this batch.
  Matched `packages/core/src/types/invoice.ts`'s pre-existing expected
  shape (`items` as JSON-encoded text, same trap already recorded for
  `req_items`/`deliverables_json`) rather than redesigning it, same
  continuity `0012`/`0014` each called out explicitly when they did this.

**Real discovery mid-build, not assumed going in — same category as
`kpi/sessions.ts` in the HOD session (2026-08-26)**: verifying
`invoice.ts`'s type against `packages/core`'s own tsconfig surfaced
`packages/core/src/finance/invoice-matching.ts`, ported wholesale in the
original monorepo restructure (2026-08-18) and sitting completely unused
until now, already calling `invoice.amount` in `isInvoiceSettled()`. The
table was going to be named with a `total` column (matching the
handover's own wording, "VAT computed into the total") until this was
found — renamed to `amount` instead, to match the pre-existing dormant
consumer rather than leaving it permanently broken, same resolution
already used once for `activity_events`' `actor_code`/`actor_name` →
`user_code`/`user_name`. Grepped for every other importer of
`types/invoice` first (only the one file) before deciding this was safe to
do without missing another expectation elsewhere. See docs/LEARNINGS.md.

**Scope, decided and stated rather than built halfway silently**: VAT at
7.5% (the handover's own figure) is computed from line items and stored at
creation time — deterministic math, no reason to defer. Marking an invoice
paid is real, not a stub: it sets `status='paid'` + `paid_at` AND inserts
a matching `income` row (`invoice_id`/`invoice_no` linked, `amount` =
invoice total) — the actual "marking an invoice paid records income"
behavior the handover describes. This is also the first real use of
`income.invoice_id`/`income.invoice_no` (0005), present since the very
first operations-tables migration and unused by any page until now.
**Deferred, stated plainly**: editing an invoice's line items after
creation (add-only, same pattern as fund lines/appointments), PDF export
or emailing an invoice, multi-currency.

**Pages, all gated `['leadership','finance','admin']`** — checked against
the resolver output above, this is exactly who reaches each id, and
matches income/expenses/funders' existing RLS role set:

- **Approvals** (`/leadership/approvals`) — the real functional
  gap-closer, not just another read-only page. Org-wide (matches
  `approvals_read_by_staff`'s own org-wide read), two sections: Pending
  (approve/reject) and Reviewed (history). Single route serves both
  `p-lead-approvals` labels ("Approvals" for leadership, "Disbursement
  Queue" for finance) — same pattern as every other page in this app
  reachable by more than one role through one id.
  **Verified, not assumed, that HOD's and staff's existing Requests pages
  need zero changes**: both `HodRequestsClient`/`StaffRequestsClient` and
  their server pages already query `approvals` with `select('*')` and no
  status filter, and both already render `Badge variant={STATUS_VARIANT[
  r.status] ?? 'muted'}`. An approval/rejection made here is picked up
  correctly by both existing pages on their next server render — confirmed
  by reading their actual query code, not assumed from the schema. One
  precision worth stating: this is a fresh server-render picking up the
  new row, not a live push — a tab already open on `/hod/requests` won't
  update until it navigates or reloads. Not a gap to fix (no page in this
  project has live updates), just not "immediately," worth being exact
  about.
- **Income** (`/leadership/income`) — checked `/leadership/budget` first:
  it already reads and summarizes `income` with a write form. Deliberately
  **not** a second write form over the same table (two divergent paths to
  write the same rows is exactly the kind of drift this project has hit
  before with `database.types.ts`, at a different layer). Instead a fuller
  read: every column Budget & Spend's list doesn't show (`payer_type`,
  `payer_contact`, the `invoice_no`/`invoice_id` link into the new
  Invoices page, `receipt_no`, `project_ref`), plus a by-payer-type
  breakdown. Points back to Budget & Spend for adding entries.
- **Spend vs Income** (`/leadership/spend`) — read-only per the handover's
  own description, over the same `income`/`expenses` Budget & Spend
  already reads. Income-by-source and expenses-by-category breakdowns with
  share-of-total, not a chart — no charting library exists in this
  project and `docs/INTERFACE.md` is still on hold.
- **Invoices** (`/leadership/invoices`) — create (line items parsed from
  `description | qty | rate` lines → auto-computed `subtotal`/
  `vat_amount`/`amount`), list, mark sent/paid. Marking paid also writes
  the linked `income` row (best-effort in the sense that the invoice
  status write is primary and already succeeded; a failed income insert is
  surfaced to the user rather than silently swallowed, not treated as
  fully best-effort the way the activity_events writes elsewhere in this
  project are).
- **Payroll — leadership** (`/leadership/payroll`) — checked `/hod/payroll`
  first: same six salary columns (0013), same ported `computePAYE()`, same
  "no run history" v1 trade-off. This version is **org-wide** (drops HOD's
  department filter and requirement) and adds a Department column plus an
  org-wide total-net-payroll stat tile HOD's single-department view didn't
  need. **Deliberately read-only, but for a different reason than HOD's
  version**: HOD is read-only because `employees_manage_by_hr` (0003)
  excludes `hod` from writing `employees` — a real RLS boundary. Leadership
  is *not* excluded — RLS alone doesn't require this page to be read-only.
  Kept read-only anyway because Staff Management (2026-08-26 session)
  already owns editing salary structure org-wide for
  leadership/hr/admin — a second edit form here would recreate the exact
  "two paths write the same row" problem this project avoids elsewhere.
  Stated explicitly rather than silently copying HOD's read-only precedent
  without reconsidering whether the same reasoning actually applied.

No Supabase credentials in this session (`npx supabase projects list`
fails with `LegacyPlatformAuthRequiredError`, same as every session so
far) — both migrations are written and reviewed but not run. A
PROVISIONAL stub was added for `invoices` only (`0015` adds no new
columns, purely an RLS policy — invisible to generated types, no stub
needed), built by comparing against `income`'s real shape, clearly
labeled. **Action for the user**: run `0015_approvals_review.sql` then
`0016_invoices.sql` in that order, then regenerate `database.types.ts` for
real and send it over — the `invoices` stub gets replaced wholesale, not
merged alongside.

`database.types.ts` was already genuinely UTF-8 at the start of this
session (checked with `file` before touching it) — did not recur a fifth
time this pass.

Verified: `tsc --noEmit` clean in `apps/ngo`; `npx tsc -p
packages/core/tsconfig.json --noEmit` clean except the same 11
pre-existing, unrelated dead-ported-type-file errors already logged
(confirmed via `git status` that none of those 11 files are touched this
session) — notably `invoice.ts` and `invoice-matching.ts` are now clean,
dropping off that list for the first time since it was first logged.
`next build` clean, 51 routes, all 5 new `/leadership/*` routes correctly
dynamic (ƒ). `eslint` clean on every new file.

**Not yet tested against real data** — no live Supabase session available
in this sandbox, so no approval decision, invoice, or anything else has
actually been made/created through these five pages yet. Natural next
check once the migrations are run: file a request through `/hod/requests`
or `/staff/requests`, approve it on `/leadership/approvals`, reload the
originating page and confirm the badge changed; create an invoice, mark it
paid, confirm a matching row appears on `/leadership/income` and the
Budget & Spend totals include it; confirm a `staff`/`hod`/`hr` account
cannot reach any of the five new routes directly by URL.

## 2026-09-05 — p-pm-projects routing, and six leadership read-only pages

Two things this pass, per the task brief: settle whether `p-pm-projects`
needed its own new page, then build the six remaining read-only leadership
pages that don't need one.

**`p-pm-projects` — checked mechanically, not assumed.** Confirmed:
appears exactly once across the entire gating catalog (only in
`NAVMAP.leadership`), has zero `FEATURE_NAV` entry (same as `p-mon-board`),
and `MODULE_CATALOG` has no `'pm'` key at all — the only module labeled
"Project Management" is `'social'` (a completely different, gated nav
cluster: `p-sm-who`/`p-sm-posts`/`p-sm-setup`/`p-sm-roster`), so the `pm`
prefix doesn't tie into that system either; it's coincidental. Unlike
`p-mon-board` (which has a real, still-dormant
`packages/core/src/monitoring/aggregate.ts` waiting for it — a genuine
distinct future page), there is no separate ported business-logic module
anywhere in `packages/core` for "pm" — the only projects logic that exists
(`projects/milestones.ts`) is the exact module already powering
`p-lead-projects`/`p-hod-projects`/`p-staff-projects`.

**Honest limit on this determination**: the original handover PDF/
markdown that grounded the earlier `p-lead-staff`/`p-lead-add-staff` call
(explicitly cited as "tightly coupled" per that document, back on
2026-08-18) is not available in this session — not in the repo, not in
this session's uploads. This determination is mechanical only, not a
re-confirmation against the handover text the task asked for. Routed
`p-pm-projects` → `/leadership/projects` in `page-routes.ts` (same
route-table shape as `p-lead-staff`/`p-lead-add-staff` → `/leadership/staff`)
on that mechanical basis, reversible in one line if the user's own copy of
the handover says otherwise.

**Fresh resolver baseline, not inherited from the last session's number**:
**43/59 built** going in (matched the Approvals+Money session's own
closing count exactly, confirming no drift between sessions). Re-run after
this batch: **50 of 59 unique NGO pages built, 9 still `/coming-soon`**.
`hr`'s workspace is now fully built too (10/10 — `p-lead-delivery` and
`p-lead-access` were its last two). Remaining 9:
`p-lead-analytics`, `p-lead-command`, `p-lead-customize`,
`p-lead-formbuilder`, `p-lead-settings`, `p-lead-story`, `p-lead-targets`,
`p-lead-templates`, `p-mon-board` — matches the task's own "not in this
batch" list (Org Settings, Customize, Monitoring, Targets & Tasks as
separate future prompts; Live Command Map/Storytelling Engine/Form
Builder deferred for their own focused pass) plus `p-lead-analytics`
(Impact and Reach), not mentioned either way in this batch's brief, left
untouched.

**No new migrations** — every table this batch reads
(`activity_events`, `activities`, `tasks`, `employees`, `income`,
`expenses`, `approvals`, `media`, `projects`/`project_milestones`,
`summary_reports`) already exists with tested RLS. All six pages gated
per the real `NAVMAP` reach, checked with a script rather than assumed:
`p-lead-timeline`/`p-lead-regional`/`p-lead-reports`/`p-lead-summaries`
are leadership-only (`['leadership','admin']`);
`p-lead-access`/`p-lead-delivery` are also genuinely reachable by `hr`
(`['leadership','hr','admin']`) — confirmed by grepping `hr`'s actual
`NAVMAP` array, not by pattern-matching from HOD's role set.

**Pages**:

- **Timeline** (`/leadership/timeline`) — merges `activity_events` and
  `activities` into one sorted feed, matching the handover's own framing
  ("composed read across activity_events and activities") rather than
  building a second Access Log under a different name. `activities` RLS
  (`activities_read_org`, 0004) is a plain org-match with no role
  restriction at all (even donors can read it, since it also backs the
  donor Impact Report) — reading it alongside the donor-excluded
  `activity_events` here is still safe, since RLS enforces each table
  independently of what the page combines them into.
- **Access Log** (`/leadership/access`) — org-wide sibling of
  `/hod/access`. **Real finding, checked not assumed**: grepped every
  `event_type:` write in the app — only `'report_submitted'` (HOD/staff
  Submit Report) and `'task_created'` (HOD Tasks) exist; nothing writes
  `'login'`/`'logout'`. `kpi/sessions.ts`'s `buildSessions()` — ported
  wholesale on 2026-08-18, dormant ever since, previously surfaced only as
  a schema-collision risk during the HOD session — is wired in for real
  here, the first genuine use. It will legitimately return an empty list
  right now; the page says so explicitly rather than presenting a
  "Worked Hours" section that looks like it just has no data today.
- **Delivery Tracker** (`/leadership/delivery`) — `tasks`, org-wide,
  read-only, using `parseTask`'s already-decoded
  `deliverables`/`deliverablesDone`/`proofRequired`.
- **Regional** (`/leadership/regional`) — `employees.hub` is the only
  hub-bearing column anywhere in the schema. Employee headcount by hub:
  direct. Tasks by hub: joined via `tasks.assignee` →
  `employees.employee_code` → `hub`, stated on the page as a best-effort
  join since `assignee` is free text, not a foreign key. Money
  (`income`/`expenses`) by hub: **not built** — neither table has any
  employee or hub reference at all, so there's no reliable way to
  attribute a row to a hub; said so on the page rather than dumping
  everything into a fake "Unspecified" bucket. No live Supabase
  credentials in this sandbox, so whether the page shows anything
  meaningful depends on real employee data this session can't inspect —
  noted, not assumed either way.
- **Reports & Charts** (`/leadership/reports`) — numeric/tabular
  cross-domain roll-up (tasks by status, project milestone verification,
  money net, requests by status, media counts), no charting library, same
  constraint already applied to Spend vs Income. Every number here
  summarizes a table another page already reads in full detail — this
  page doesn't introduce a second way of reading any single one.
- **Summary Reports — leadership** (`/leadership/summaries`) — the third
  and last of three distinct scopes on `summary_reports`. Staff's version
  filters to `author_code`, HOD's to `department`. This one has **no
  filter at all** — every report in the org. Stated as explicitly as the
  staff-vs-HOD distinction was stated in the staff-workspace session,
  since it's the identical shape of mistake to make by copying the
  nearest-looking page's filter out of habit.

`database.types.ts` was, again, genuinely UTF-16LE with CRLF at the start
of this session — the **fifth** recurrence (confirmed via `file`, not
assumed; the "types" commit that landed the real regenerated `invoices`
table after the previous session also brought this back). Converted the
same way as every prior time before touching anything. See
docs/LEARNINGS.md.

Verified: `tsc --noEmit` clean in `apps/ngo`; `npx tsc -p
packages/core/tsconfig.json --noEmit` clean except the same 11
pre-existing, unrelated dead-ported-type-file errors already logged
(confirmed via `git status` that none of those files are touched this
session). `next build` clean, 57 routes, all 6 new `/leadership/*` routes
correctly dynamic (ƒ). `eslint` clean on every new file.

**Not yet tested against real data** — no live Supabase session in this
sandbox, so whether Timeline/Access Log/Delivery Tracker/Regional show
anything beyond their empty states depends entirely on what's already in
the live project. Natural next checks once real data exists: confirm
Timeline interleaves both tables correctly by timestamp rather than
grouping them; confirm Access Log's worked-hours section starts producing
real sessions the moment any future feature writes a `login`/`logout`
event pair, with zero code changes needed here; confirm Regional's
employee-by-hub breakdown reflects real hub assignments once any exist.

## Open at end of this session (2026-09-05, p-pm-projects + six leadership read-only pages)

**Convention note, and a real correction to the convention's own track
record**: the previous version of this section (dated 2026-09-02) claimed
to have been "relocated here to the true end of the file... a structural
slip, fixed here, not left for the next session to trip over." Checked
this session via `git show HEAD:docs/EXECUTION.md | tail`, before writing
anything: that claim was false. The section was still sitting *before*
the 2026-09-02 dated entry describing that session's own work, exactly
the same slip as the session before it, just re-asserted as fixed without
actually being fixed. Removed from its stale position and this fresh copy
placed at the file's real last line — confirmed with `tail`/`wc -l`
immediately after, not assumed. If this recurs a third time, the pattern
itself (not just the content) is the thing to fix — possibly by not
narrating the relocation in prose at all and just trusting the tool to
put text where the edit says to put it.

**Authoritative source for "what pages are missing"**: not this list — run
the real gating resolver against every role and cross-reference
`page-routes.ts` (script not committed anywhere in the repo; rewrite it
from `getNavItems()`/`NAVMAP`/`routeForPage()` and the NGO fixture
described in the 2026-08-18 entry). As of this session: **50 of 59 unique
NGO pages built, 9 still `/coming-soon`** — all nine inside `leadership`'s
own nav: `p-lead-analytics`, `p-lead-command`, `p-lead-customize`,
`p-lead-formbuilder`, `p-lead-settings`, `p-lead-story`, `p-lead-targets`,
`p-lead-templates`, `p-mon-board`. Staff, HOD, HR are all fully built;
finance has only `p-lead-analytics` left.

**Genuinely still open, checked against the real current state, not
copied from an old list**:

- Task/project write access is org-wide for any non-donor staff member —
  the handover's real rule (leadership org-wide, HOD within department,
  staff only their own) needs per-row filtering, not implemented.
  Unchanged this session.
- Milestone verification isn't reviewer-gated at the RLS layer —
  `app.is_reviewer()` exists (0003) and is unused on `project_milestones`.
- Single-project assumption on the project-related pages — querying "most
  recent project" rather than supporting multiple. Unchanged.
- Task submission (`staff/tasks/[id]`) is still local-only React state,
  not a real write.
- No UI for editing/deleting an appointment, a fund line, or an invoice
  once created — add-only throughout this project.
- `database.types.ts` regenerated as UTF-16LE with CRLF a **fifth** time,
  found and converted at the start of this session (see LEARNINGS.md) —
  still no automated guard. Worth a `postinstall`/`predev` normalization
  script at this point rather than continuing to catch it by hand every
  session.
- Messages has no read-receipt, edit, or unsend — immutable by design,
  not a bug.
- Requests has a real review flow (`/leadership/approvals`) — closed as of
  the previous session, unchanged (still working) this one.
- Payroll (`/hod/payroll`, `/leadership/payroll`) has no run history —
  PAYE computed fresh on every read, unchanged.
- `activity_events` (0011) has three write paths (HOD Tasks, HOD/staff
  Submit Report) — **Timeline and Access Log now both read it (this
  session)**, but neither writes to it; still nothing produces
  `login`/`logout` events, so `buildSessions()`'s worked-hours output on
  the new Access Log page is empty by construction. The first real
  candidate to close this would be the auth flow itself
  (`middleware.ts`/sign-in) writing a `login` event and some kind of
  explicit sign-out writing `logout` — neither exists today.
- `performance_reviews` (0014) write access isn't attributed at the RLS
  layer — unchanged, not this batch's table.
- Two dead, unreferenced duplicate routes exist:
  `leadership/staff/dashboard/` and `leadership/staff/tasks/` — still not
  removed, still flagged for the user to decide.
- `docs/INTERFACE.md` still on hold.
- Resources (`/staff/resources`) reads media only — templates half still
  deferred, no table.
- Invoices (`/leadership/invoices`) is add-only; marking the same invoice
  paid twice isn't guarded against. Both unchanged this session.
- `approvals_update_by_finance` (0015) is a plain role check, can't
  distinguish "approve/reject" from "edit any other column." Unchanged.
- **New, from this session**: `p-pm-projects` now routes to
  `/leadership/projects`, same page as `p-lead-projects` — a mechanical
  determination (no `FEATURE_NAV` gate, no distinct dormant business-logic
  module for it anywhere in `packages/core`), **not a re-confirmation
  against the original handover text**, which isn't available in this
  session. Worth the user's own sign-off against their copy of the
  handover if they have one, since this is the one call in this batch made
  without the same evidence standard the rest of the project holds itself
  to.
- **New, from this session**: Regional (`/leadership/regional`) has no
  way to attribute `income`/`expenses` rows to a hub — neither table has
  any employee or hub reference. Stated on the page itself, not silently
  narrower than it looks.
- **New, from this session**: whether Timeline, Access Log, Delivery
  Tracker, or Regional show anything beyond their empty states depends
  entirely on real data in the live project (login/logout events, hub
  assignments, deliverables/proof on real tasks) that this sandbox has no
  credentials to inspect. Not yet tested against real data for exactly
  that reason.
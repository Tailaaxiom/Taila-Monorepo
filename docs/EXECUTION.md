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

## Open at end of this session

- **No Supabase project exists yet.** Migrations are written and reviewed but
  never run. `.env.example` documents the three vars needed; nothing works
  end to end until a project exists and `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set in
  `.env.local`.
- **`database.types.ts` is stale.** It reflects the legacy 79-table schema,
  not the new migrations. Both Supabase clients are currently untyped rather
  than pinned to the wrong `Database` generic — deliberate, to avoid a wall of
  false errors, but real type safety is missing until this is regenerated.
  Once the project exists and migrations run:
  `supabase gen types typescript --linked > packages/core/src/types/database.types.ts`,
  then add the `<Database>` generic back to both clients, then remove the
  legacy-shape branches in `employee.ts`'s `parseStringArray()`.
- No pages read real data yet — all six existing pages still read fixtures.
  Wiring one page (staff dashboard is simplest) to a real Supabase query, once
  the project exists, is the natural next check that RLS is actually correct
  rather than just plausible.
- No UI exists for issuing a setup token beyond the raw API route — an admin
  currently needs to call `POST /api/auth/issue-setup-token` directly.
- Pages carried over: staff dashboard, staff tasks (list + detail), leadership
  dashboard, task manager, project monitor, budget. Everything else in the nav
  falls through to `/coming-soon`.
- `docs/INTERFACE.md` on hold — color scheme to be decided against the legacy
  screenshots before any real UI work.
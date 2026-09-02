# LEARNINGS

Things that cost time to discover, so they cost nobody time again. Traps in the
legacy system, corrections to the handover documents, and environment
behaviours that are not obvious from the code.

Append only. If a learning turns out to be wrong, add a correction below it
rather than editing it away — the wrong version is why someone believed it.

---

## Handover documents are unreliable on these four points

Both `Axiom-NGO-Sector-Handover.pdf` and `taila-axiom-ngo-context.md` were
written from partial reads of the legacy file. Verified against source and live
schema on 2026-08-18:

### 1. `targets` is not a general target system

The PDF describes named targets with a measure, goal value, owner and period.
The live table is:

```
org_id, activities, beneficiaries, field_visits, media_outputs,
trainings, reporting_period, updated_at
```

No `id` column. One row per org. The columns are hardcoded NGO metrics. So
"Targets & Tasks" (`p-lead-targets`) is a fixed scorecard with six numbers, not
a CRUD screen. Convenient for the NGO app, useless for any other sector — this
is the schema quirk the markdown flagged, and it is real.

`staff_targets` and `target_logs` are separate tables and may be the flexible
per-person structure; not yet inspected.

### 2. `axIsReviewer()` exists

The markdown says its definition was never located and assumed sign-off was
therefore unrestricted in production. It is at legacy line 16936:

```js
function axIsReviewer(){
  var r = (S.emp && S.emp.role) || '';
  return r === 'leadership' || r === 'hod' || r === 'admin';
}
```

Three call sites depend on it: `axMsCanVerify()` (milestone verification),
`axMonCanEdit()` (monitor editing), and the task stage gate. Permissions are
real. Reproduce this rule; do not treat sign-off as open.

### 3. Payroll is fully built, not deferred

Both documents call payroll unbuilt or deferred. `computePAYE` /
`computePayroll` at legacy line 8281 implement the Nigeria Tax Act schedule
correctly:

- Band **widths** (not thresholds): first 800,000 at 0%, next 2,200,000 at 15%,
  next 9,000,000 at 18%, next 13,000,000 at 21%, next 25,000,000 at 23%,
  remainder at 25%. The loop consumes `Math.min(rem, width)` per band — read it
  as widths or the maths comes out wrong.
- Pension 8% of (basic + housing + transport), annualised.
- NHF optional, 2.5% of basic.
- Rent relief: 20% of annual rent, capped at 500,000.
- Chargeable = gross annual − pension − NHF − rent relief.

This is a port, not a rebuild. Do not research tax law to redo it.

### 4. Legacy auth derives passwords from the employee code

The documents say there is no auth link and identity is matched by code/email.
Partly true, and it misses the important half — Supabase Auth *is* used, with
synthetic credentials:

```js
synthEmail(orgId, code) => `${orgId}.${code}@tailaaxiom.com`
derivedPwd(code)        => 'axm:' + code   // padded to 8 chars
```

Employee codes are not secret. They are the assignee field on every task and
appear throughout the UI. Any signed-in user can derive any colleague's
credentials, including leadership's. With RLS enforced against that session,
auth is the entire security boundary and it is guessable.

**Not ported.** The legacy app has zero users, so nobody is exposed, but the
live deployment has this today.

Replaced with `login_mode` per employee (`'code'` or `'email'`) and a
setup-token activation flow — see EXECUTION.md, 2026-08-18 "Auth, RLS, and
Funders". The important property the new scheme has and the old one didn't:
the thing that gates account creation (the setup token) is never the same
value as the thing used to look someone up (the employee code).

---

## Schema traps

- **`project_milestones.project_id` is `text`, storing the string form of
  `projects.id`, which is a numeric auto-increment.** No FK constraint. Always
  compare with `String(project.id)`. Normalise in the new database.
- **Several columns are JSON-encoded strings in plain text columns**, not
  `jsonb`: `tasks.deliverables_json`, `invoices.items`, `approvals.req_items`.
- **`organizations.modules` is `jsonb` but written via `JSON.stringify()`**, so
  it holds a JSON *string*, not a native array. Reading requires a defensive
  parse: try `JSON.parse`, fall back to `.split(',')`, fall back to `null`.
  Handled in `parseOrganization()`.
- **`organizations.kind` is dead.** Set at org creation, read only by
  `axIsProject()`, which is never called. `acct_type` is the real signal.
- **RLS is inconsistent in the legacy database.** Some tables have none; a few
  have RLS on with zero policies, which silently blocks all writes and surfaces
  as "Your role does not have permission to save this". Tenancy is enforced in
  application code only. The new NGO project must not inherit this.

## Legacy code traps

- **Functions are chain-wrapped, not refactored.** `getSectorKey` was wrapped
  three times via successive `window.getSectorKey = function(){...}`
  reassignments; the final wrapper falls through to an earlier buggy one for
  cases its own regex misses. The rebuild ported a clean single-pass version
  deliberately. **If you grep the legacy file for a function, check for later
  reassignments of the same name before trusting the first hit.**
- **Three mutually inconsistent definitions of project-client modules** exist:
  `SECTOR_MODULES.project`, the dead `AX_PROJECT_MODULES`, and a hardcoded
  return inside `orgModuleSet()` — the last one wins because it short-circuits.
  Expect this kind of drift elsewhere.

## Environment and tooling

- **`database.types.ts` was UTF-16.** Anything reading it with a UTF-8 assumption
  fails on byte 0. Converted to UTF-8 in the monorepo. If you regenerate it with
  `supabase gen types`, check the encoding on Windows.
- **`packages/core` ships TypeScript source, not a build output.** Every
  consuming app must list it in `transpilePackages` or the build fails at import.
- **Core must not use the `@/` alias internally.** Next resolves `paths` from
  the *app's* tsconfig, not the package's, so alias imports inside core break at
  build time. All internal imports in core are relative, and must stay that way.
- Google Fonts must be reachable at build time (`next/font/google` fetches DM
  Sans, Cormorant Garamond, Bebas Neue). Offline or firewalled builds fail here
  and the error looks unrelated to the network.
- **`useSearchParams()` inside a page component fails static prerendering
  unless wrapped in `<Suspense>`.** The build error only appears at `next
  build`, not `next dev` or `tsc`. If a page reads query params, wrap its body
  in a small child component and `<Suspense>` around it in the default export.
- **Generated Supabase types go stale the moment the schema changes out from
  under them.** `database.types.ts` was generated from the legacy 79-table
  schema; the NGO app's own migrations (`supabase/migrations/`) define a
  different, smaller schema. Until it's regenerated against the real project,
  do not add the `Database` generic to a Supabase client — it will type-check
  against tables and columns that no longer exist, which is worse than no
  types, because it looks safe and isn't. Regenerate with
  `supabase gen types typescript --linked` immediately after the first
  migration run, not deferred.
- **A table's array-shaped columns can silently change representation
  across a schema rewrite.** `employees.extra_roles` was a comma-separated
  string in legacy, is a native `text[]` in the new schema. The parsing code
  in `packages/core` didn't know that until it was checked by hand — the
  compiler won't catch it while `database.types.ts` is stale, per above.

- **Correction to the entry above ("`database.types.ts` was UTF-16... Converted
  to UTF-8 in the monorepo"): that conversion did not stick, or was never
  actually committed.** Found 2026-08-25, a session after it was declared done:
  the file on disk was genuinely UTF-16LE with CRLF line endings, not UTF-8.
  Nobody noticed for a full session because `tsc`/`next build` both decode a
  BOM correctly regardless of source encoding, so the wrong encoding was
  functionally invisible to every check this project runs. It was only caught
  because a repo-review pass ran `file` on it directly — and even then, the
  first read of that output was dismissed as a false positive (the reviewer
  compared against an already-`iconv`-converted temp copy and concluded the
  original was fine, backwards). **The general lesson: "converted" is a claim
  about a past action, not a property of the current file — if a past entry
  asserts an encoding/format fix and the file is easy to check, check the file,
  don't trust the log.** `file <path>` is the fast check; don't reason about it
  by proxy from a copy you already fixed. Re-converted for real this time
  (`iconv -f UTF-16LE -t UTF-8`, `\r` and BOM stripped), verified by line count
  and `file` afterwards, in the same pass that added the `messages` table stub
  (see docs/EXECUTION.md, 2026-08-25).


## packages/core must contain zero fixture or sample data

Found the hard way: `Sidebar.tsx` and `TopBar.tsx` in core each imported
their own `usePreviewUser()` from a fixture file that also lived in core,
left over from the manufacturing pilot app core was extracted from. Every
app built afterward (starting with NGO) got manufacturing sample data
bleeding through the shared shell components, regardless of what fixture
data the app itself supplied — because core's components were reading
core's own separate context object, not the app's.

The general rule, not just the specific fix: **core exports behavior and
types. It never exports data.** Not sample org names, not a default
employee, not a "just for testing" task list. The moment core contains a
concrete value (a name, a task title, a color chosen for one org), the
first thing that goes wrong is exactly what happened here — one app's
placeholder becomes every app's placeholder, silently, because nothing
forces it to be overridden.

Concretely: if a `packages/core` file needs to expose a context, a hook, or
a component that depends on "who is using the app," the context/provider
pair goes in core with **no default value** (`createContext<T | null>(null)`,
and a hook that throws if used without a provider above it — see
`context/current-user.tsx`). The app supplies the actual value. If core
ever needs a default for a story, a test, or a preview, that default lives
in the *app*, never in core, even if it means the same shape of file exists
in every app's `lib/fixtures/`. That's fine — it's supposed to be
sector-specific, so it's supposed to differ per app.


## useState's lazy initializer runs during render, not after mount

`AppShell.tsx`'s `usePageTitle()` called another component's setState
(`setTitle`, owned by `AppShell`) from inside `useState(() => setTitle(title))`,
on the theory that the initializer function only runs once "on mount." It
does only run once — but it runs during the calling component's render,
before mount, which is a different thing. Calling one component's setState
while a different component is mid-render is something React explicitly
disallows: "Cannot update a component (`AppShell`) while rendering a
different component (`StaffDashboardPage`)."

Anything of the shape "run this once, as a side effect, when a component
first renders" belongs in `useEffect`, not in a `useState` initializer —
even though the initializer really does only run once. "Runs once" is not
the same guarantee as "runs safely outside render." Fixed by moving the call
into `useEffect(() => { setTitle(title); }, [title, setTitle])`.


## Tailwind doesn't automatically scan a sibling monorepo package

`packages/core` sits outside `apps/ngo`'s own folder — a sibling, not a
subdirectory. Tailwind v4's automatic content scanning didn't reliably reach
across that boundary, so some classes used only inside `packages/core`
(`AppShell.tsx`'s `md:ml-[240px]`, the content offset that keeps page content
from sitting underneath the fixed sidebar) never got compiled into real CSS
at all. Not overridden, not clipped — the rule simply didn't exist in the
stylesheet. The class name sat in the JSX doing nothing.

This was hard to diagnose because it doesn't look like a missing-CSS problem
from the browser: the affected elements render, have the right text, respond
to clicks — they're just positioned as if the class weren't there, because it
effectively isn't. The `Pesticide` extension (outlines every element's actual
box) is what exposed it: the "missing" employee-code and role fields were
never missing, they were rendering at `x: 0`, genuinely underneath the opaque
fixed sidebar, because the div that was supposed to push them right by 240px
had no real margin-left rule behind its class name.

**Fixed at the root, not per-page**: added an explicit `@source` directive in
`apps/ngo/src/app/globals.css` pointing at `packages/core/src`. This is the
documented Tailwind v4 mechanism for telling it to scan a directory its
automatic detection won't reach on its own. Verified by grepping the actual
compiled `.next/static/chunks/*.css` output for the class, not just assuming
the fix worked — `.md\:ml-\[240px\]{margin-left:240px}` is now genuinely
present.

**Consequence if this regresses**: any *new* Tailwind class added inside
`packages/core` — in a future component, not just `AppShell`/`Sidebar` — is
exposed to the exact same failure mode unless `@source` keeps including that
directory. If a class in core visibly "does nothing," check this line before
suspecting the component's own logic.


## A role can be blocked from a table and still need to read its own row in it

`employees_read_org` (0003) restricts the `employees` table to
`app.is_staff_of(org_id)`, which is `false` for a donor by design — donors
were never meant to browse the staff directory. That rule is correct. What
wasn't checked: `is_staff_of()` is false for a donor regardless of *whose*
row is being read, including their own. `getCurrentEmployee()` — the
function every single page depends on to know who's signed in — reads
exactly that row. So the donor role could authenticate correctly (real
password, real Supabase session) and then be immediately bounced back to
`/sign-in`, because the app's own "who is this" lookup returned nothing —
not because the login failed, but because RLS hid the one row that lookup
needed, from the person it belonged to.

From the outside this looked exactly like a broken sign-in form. It took
directly testing the donor role to find it — nothing about the code review
or the build would have caught it, since `tsc` and `next build` have no way
to know an RLS policy quietly excludes the person trying to use the app
from reading their own identity.

**The general lesson**: whenever a role is denied a table for a legitimate
reason ("X shouldn't see the directory," "Y shouldn't see other people's
records"), check separately whether that role still needs to read *its own*
row in that same table for some other part of the app to function —
especially `employees`, since almost everything keys off "who is the
current user" first. The fix is additive, not a loosening of the original
rule: a second policy, `using (auth_user_id = auth.uid())`, OR'd in
alongside the restrictive one. RLS SELECT policies combine with OR, so
adding "you can always read your own row" doesn't reopen the directory —
it only adds "is this row mine" as a second path to visibility, unrelated
to the first.

**Practical takeaway for testing new roles**: passing a login test is not
the same as passing an RLS test. Confirm the person can actually reach and
render at least one real page after signing in — not just that the sign-in
form accepts their password.


## An outdated @supabase/ssr silently collapses query results to never

Wiring the real `Database` generic into both Supabase clients (once real
types existed to wire in) produced a wall of errors: `Property X does not
exist on type never` on almost every query in the app — not a handful of
genuine schema mismatches, but nearly every single call site. That pattern
specifically — everything becoming `never` rather than a few fields being
wrong — is the signature of a generic failing to resolve at all, not of
real type mismatches.

Root cause: `@supabase/ssr` was pinned at `0.5.2`, several minor versions
behind `@supabase/supabase-js`/`@supabase/postgrest-js` (both at
`2.112.3`). `createBrowserClient<Database>`/`createServerClient<Database>`
from that old `ssr` version could not correctly forward the generic to the
newer client internals — confirmed by isolating it directly: the exact same
`Database` generic passed to raw `@supabase/supabase-js`'s own
`createClient<Database>()` worked perfectly, while `@supabase/ssr`'s
wrapper collapsed to `never`. The type itself was never the problem.

**Diagnostic pattern worth remembering**: if adding a generic type parameter
to something makes *everything* using it fail the same way (not a handful
of genuinely-wrong field accesses, but a wall of `never`), suspect a
version mismatch in the generic-consuming library before suspecting the
type. Isolate by testing the same generic against the most direct/low-level
API available (here, raw `supabase-js` instead of the `ssr` wrapper) — if
that works and only the higher-level wrapper fails, the wrapper is the
problem, not the type or your code.

Fixed by bumping `@supabase/ssr` to current (`^0.12.4`) in
`apps/ngo/package.json`. Once genuine version mismatches were ruled out, the
remaining real errors (two, not dozens) were exactly the schema differences
worth finding — see the `task.ts` entry above.


## A GitHub-UI merge of a UTF-16 file can silently produce an empty file, not a conflict

`database.types.ts` regenerates as UTF-16LE with CRLF every time
`supabase gen types` is run on the machine that produced it (see the
correction entry above — this recurred one session after being "fixed for
real," so treat it as a standing property of that workflow, not a one-off).
A line-based diff/merge tool sees a file like that as mostly binary. On
2026-08-25, a merge commit made through GitHub's web UI
(`19fac67`, "Merge branch 'main' into claude/repo-review-c292wz") resolved
a change to this file by reducing it to a **completely empty file** —
zero bytes, not conflict markers, not one side's content, not a diff
error. Nothing about the merge UI flagged this as a conflict; it looked
like a normal, successful merge in the PR history.

This is dangerous specifically because it doesn't fail loudly. Every
Supabase client in the app carries the `Database` generic from this exact
file, so an empty file breaks the build completely — but nobody sees that
until they actually run `tsc`/`next build` against the merged tree. A
stale local `node_modules`/`.next` cache, or simply not rebuilding after
pulling, would hide it further.

**Practical rule**: after any merge or rebase touches `database.types.ts`
(or any other UTF-16/binary-ish generated file), check its byte count is
sane and its encoding is still what's expected — `wc -l` and `file
<path>` are both fast — before trusting that the merge "took." Don't infer
success from the merge commit having no conflict markers; a binary-ish
file merging "cleanly" is exactly the case where that inference is wrong.
Recovered by pulling the known-good blob directly from the commit that
introduced the real content (`git show <sha>:<path>`), not by
re-requesting a fresh regeneration — the correct bytes already existed in
history, they'd just been dropped by the merge, not lost.


## database.types.ts's UTF-16LE recurrence, a third time (2026-08-26)

Found genuinely UTF-16LE with CRLF again at the start of the HOD workspace
session — the third time this has been caught (first "fixed for real" on
2026-08-19, recurred and was fixed again on 2026-08-25, now a third time).
`file <path>` confirmed it directly, not inferred. Converted the same way
as both previous times (`iconv -f UTF-16LE -t UTF-8`, BOM and `\r`
stripped, verified by `file` and `wc -l` afterward) before making any
edits to the file.

**The pattern is now the lesson, not any single fix**: this is not a
one-off mistake that gets "fixed for real" and stays fixed — it is a
standing property of however `supabase gen types` gets run and committed
on the machine that produces it (almost certainly Windows, per the earlier
entries). Every session that touches `database.types.ts` — reading it,
editing it, or just before trusting a build result that depends on it —
should run `file` on it first and convert if needed, as routine, not as a
one-time cleanup. Relying on "it was converted last session" has been
wrong twice now.


## A pre-existing, unused file in packages/core can already be committed to a schema nobody told you about

Adding `0011_activity_events.sql` and its type file went smoothly through
`apps/ngo`'s own `tsc --noEmit` and `next build` — both came back clean.
Only running `packages/core`'s own standalone `npx tsc -p
packages/core/tsconfig.json --noEmit` (which type-checks every file in the
package, not just the ones `apps/ngo` actually imports) surfaced
`packages/core/src/kpi/sessions.ts` failing with missing-property errors
against the exact new type just added.

That file — `buildSessions()`, computing work sessions from login/logout
events — was ported wholesale into `packages/core` during the original
monorepo restructure (2026-08-18) alongside `tasks/status`,
`projects/milestones`, and `finance/invoice-matching`, and has been
sitting completely unused ever since: nothing in `apps/ngo` imports it, so
`apps/ngo`'s own `tsc` never traverses into it and never could have caught
anything wrong with it. It already contained `import type { ActivityEvent
} from '../types/activity-event'` and already expected that type to carry
`user_code`, `user_name`, and `role` fields for building
`'login'`/`'logout'` sessions.

**Correction, caught by `git status` after the fact, not assumed
correctly the first time**: this entry originally claimed the
`../types/activity-event` module "didn't exist until this session created
it." That's wrong. `packages/core/src/types/activity-event.ts` was
already tracked in git, part of the initial commit — one more of a whole
family of dormant ported type files (alongside `task-event.ts`,
`task-stop.ts`, `staff-kpi.ts`, `staff-target.ts`, `org-targets.ts`,
`monitor.ts`, `monitor-entry.ts`, `performance-review.ts`,
`platform-staff.ts`, `app-user.ts`, `invoice.ts` — all still broken today,
still waiting on real tables) shipped from day one against legacy tables
that had no migration yet, the same category `approval.ts` turned out to
be before this session gave it a real table too. This session's own Write
call overwrote that pre-existing file without reading it first — against
this project's own stated tool discipline — and only `git status` showing
it as modified (`M`) rather than new (`??`) surfaced the mistake. Checked
the diff afterward: functionally identical, just reformatted (blank lines,
an expanded function body, one added comment), so nothing was lost this
time — but that was luck from writing the same obvious shape twice, not a
property of the process. **The corrected story**: the table
(`activity_events`) was genuinely new and freshly designed this session;
the *type file* wrapping it was not, and neither was `kpi/sessions.ts`'s
expectation of what columns it would carry. By coincidence of naming, a
table this session was about to design from scratch had already been
committed to, twice over, by dormant legacy code nobody mentioned.
**Practical rule**: before writing a new file into `packages/core/src`,
check whether it already exists — a stale assumption that a path is free
is exactly how a real pre-existing file gets silently clobbered.

Reconciled by renaming the new table's columns
(`actor_code`/`actor_name` → `user_code`/`user_name`, plus a new `role`
column) to match what the pre-existing consumer already expected, rather
than leaving two different shapes fighting over the same table name or
quietly shipping a table that would keep `kpi/sessions.ts` permanently
broken.

**The general lesson**: `apps/ngo`'s `tsc --noEmit` being clean is not
proof that everything in `packages/core` is fine — it only proves what
`apps/ngo` actually reaches. A file with zero importers can sit broken (or,
as here, sit correct-but-unsatisfied) indefinitely without any check in
this project's normal workflow ever looking at it. When adding a new type
or table to `packages/core`, especially one whose name might plausibly
already be expected by ported-but-unwired legacy logic, run
`packages/core`'s own tsconfig too — it costs one extra command and would
have caught this immediately instead of via a coincidental grep.


## Concatenating a Supabase .select() string with `+` silently breaks its return type

Extending Staff Management's employee query to also fetch the six new
salary columns (2026-08-26, HR workspace session), the natural-looking
edit was to build the longer select list as two string literals joined
with `+`:

```ts
.select(
  'id, employee_code, full_name, ..., created_at, ' +
    'basic_salary, housing_allowance, ..., nhf_opt_in',
)
```

`apps/ngo`'s `tsc --noEmit` failed immediately, but not with a missing- or
wrong-column error — with `Conversion of type 'GenericStringError[]' to
type 'EmployeeListItem[]' may be a mistake because neither type
sufficiently overlaps with the other`. The column names were all correct;
every one of them is a real column on `employees`.

**Root cause**: the typed Supabase client (`@supabase/postgrest-js`, via
the `Database` generic) infers a query's return row shape by parsing the
literal string type of the argument passed to `.select()` at compile
time — it reads the actual characters of the string literal to figure out
which columns come back. That only works when TypeScript can see the
argument as a specific string literal type. `'a, b' + 'c, d'` does
type-check as a value, but its *type* widens to the general `string`, not
the two literals concatenated — a well-known TypeScript behavior (`+` on
two string literals produces `string`, not a new literal, unless the
whole expression is a single template literal or a single literal). With
the argument typed as plain `string`, postgrest-js's select-string parser
has nothing to parse and falls back to its own `GenericStringError` error
type, which is what actually showed up in the query result — a type
carrying no real columns at all.

**Fixed by writing the same list as one literal string** instead of two
concatenated pieces — a long line, but one whose type-checker sees the
exact select list, not `string`. A template literal (`` `a, b, ${x}` ``)
would have the same problem for anything but a fully static string, since
interpolation also widens to `string` unless every interpolated piece is
itself a literal.

**The general lesson**: with this project's typed Supabase client, a
`.select(...)` argument must be authored as a single string literal, not
built by concatenation, a helper function, or anything else that could
widen its type to plain `string` — doing so doesn't just lose autocomplete,
it silently collapses the entire query's return type to an error type that
still type-checks as assignable-with-a-cast, producing exactly the
confusing "may be a mistake" cast error seen here rather than an obviously
related one. If a select list needs to be long, break it across lines
inside one literal (as this fix does) rather than joining separate
literals.


## database.types.ts's UTF-16LE recurrence, a fourth time (2026-08-31)

Found genuinely UTF-16LE with CRLF a fourth time, at the start of the
staff-workspace session — first "fixed for real" 2026-08-19, recurred
2026-08-25, recurred again 2026-08-26, now a fourth time. `file <path>`
confirmed it directly, as always; converted the same way as every prior
time (`iconv -f UTF-16LE -t UTF-8`, BOM and `\r` stripped) before touching
the file. Verified this time that the conversion was pure encoding, no
content drift: `git diff --stat` on the committed file showed a binary
diff (`Bin 81382 -> 39364 bytes`, the size drop being exactly what
UTF-16→UTF-8 halving plus CRLF→LF stripping predicts) with no textual
diff at all — the fix touched bytes, not content.

Four occurrences is no longer "a recurring bug worth flagging," it's a
standing property of whatever machine and process regenerates this file,
confirmed independently four separate sessions in a row with the exact
same fix working every time. The practical rule from the last three
entries already covers what to check and how to fix it; the addition
worth making explicit now is that this has never once required more than
`file` + `iconv`, so there's no reason to escalate it into anything more
involved than routine — but "genuinely UTF-8 already, checked with `file`"
(true for exactly one of these four sessions, the HR one) shouldn't be
read as the recurrence having stopped. Treat every session touching this
file as needing its own check, permanently, until an automated
`postinstall`/`predev` normalization step exists (still not built, tracked
in EXECUTION.md's open-gaps list).


## Another pre-existing dormant file in packages/core expected a table before it existed — invoice-matching.ts

Same category as `kpi/sessions.ts` in the HOD session (2026-08-26), found
the same way: building `0016_invoices.sql` and giving `invoices` a real
table, `packages/core`'s own standalone tsconfig (not `apps/ngo`'s, which
never reaches a file nothing imports) surfaced
`packages/core/src/finance/invoice-matching.ts` — ported wholesale in the
original monorepo restructure (2026-08-18), sitting completely unused
until this session, already calling `invoice.amount` inside
`isInvoiceSettled(invoice: Invoice, paidAmount: number)`.

The column was about to be named `total` (the handover's own word: "VAT
computed into the total"). Grepped for every importer of
`types/invoice` first — exactly one, `invoice-matching.ts` — then renamed
the column to `amount` to match it, rather than either leaving the dormant
file permanently broken or blindly trusting the handover's wording over a
real, already-committed consumer.

**The general lesson, now confirmed a second time, not a one-off**: adding
a real table for a page id that has a pre-ported `packages/core/src/types/
*.ts` file waiting on it (this project has several — `approval.ts` and
`performance-review.ts` before their tables existed, now `invoice.ts`) is
not just a matter of matching that type file's own expected shape.
Anything else in `packages/core` that already imports from that type file
is a second source of truth for what the schema needs to look like, and it
won't surface in `apps/ngo`'s own `tsc --noEmit` at all — only
`packages/core`'s standalone tsconfig reaches it. **Practical rule,
sharpened from the kpi/sessions.ts entry**: before finalizing a new
table's column names against a dormant type file, grep
`packages/core/src` for every other importer of that same type file, not
just the type file itself — a naming choice that looks free (the handover
said "total," nothing said otherwise) can already be constrained by code
nobody mentioned, exactly like it was here.
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
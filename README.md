# Taila Axiom — monorepo

Sector apps built on one shared package. `apps/manufacturing` was the pilot;
`apps/ngo` is the first app built on the extracted core.

```
packages/core     shared: types, gating, business logic, UI primitives, shell
apps/ngo          NGO sector app
```

## Commands

```bash
npm install          # root, installs all workspaces
npm run dev          # turbo, all apps
npm run build
npm run typecheck
```

Or per app: `cd apps/ngo && npm run dev`.

## packages/core

Consumed as TypeScript source, not a build output — apps must list it in
`transpilePackages` (see `apps/ngo/next.config.ts`). Subpath imports map
directly onto the source tree:

```ts
import { getNavItems } from '@taila/core/gating/resolver';
import { Card } from '@taila/core/components/ui/Card';
import type { Employee } from '@taila/core/types/employee';
```

Contents: `types/` (26 hand-checked types + generated `database.types.ts`),
`gating/` (the five registries + resolver), `projects/milestones`,
`finance/invoice-matching`, `kpi/sessions`, `monitoring/aggregate`,
`tasks/status`, `components/ui`, `components/shell`.

Sector-specific fixtures do **not** live here. `apps/ngo/src/lib/fixtures/`
holds the NGO org and employees.

## How the NGO app resolves its sector

The fixture org's sector is the free-text string `'Development and Advocacy'`,
not the key `'ngo'` — so `getSectorKey()` runs for real on every render, and
`organizations.modules` is left `null` so `orgModuleSet()` falls through to
`SECTOR_MODULES.ngo`. Nothing is hardcoded. Verified output:

- modules: `payroll, funders, multicurrency, livemap, offline, story, orgsuite`
- leadership 34 pages, finance 13, staff 12, donor 4
- no production / property / hospitality / social / inventory / margins pages

## Corrections to the handover documents

Found by reading the legacy source and the live schema. Both handover docs are
wrong on these points:

1. **`targets` is not a general target system.** Live schema is
   `org_id, activities, beneficiaries, field_visits, media_outputs, trainings,
   reporting_period` — no `id`, one row per org, hardcoded to NGO metrics.
   "Targets & Tasks" is a fixed scorecard, not a CRUD page.
2. **`axIsReviewer()` exists** (legacy line 16936):
   `role === 'leadership' || 'hod' || 'admin'`. Milestone sign-off, monitor
   editing and task stage changes are restricted in production, not open.
3. **Payroll is fully implemented** (legacy line 8281). Real Nigeria Tax Act
   bands, 20% rent relief capped at NGN 500,000, 8% pension, optional 2.5% NHF.
   Port it; do not rebuild it.
4. **Legacy auth derives passwords from the employee code**
   (`derivedPwd = 'axm:' + code`) against synthetic
   `orgid.code@tailaaxiom.com` addresses. Employee codes are visible across the
   app, so any account is derivable from any other. **Not ported.** The NGO app
   needs a real sign-in model before it holds real data.

## Current state

Skeleton only. Pages carried over from the pilot: staff dashboard, staff tasks
(list + detail), leadership dashboard, task manager, project monitor, budget.
Everything else in the nav falls through to `/coming-soon`.

Auth is stubbed by a preview-user switcher
(`apps/ngo/src/lib/fixtures/preview-context.tsx`). Delete that file when real
auth lands. There is no Supabase client wired yet — `@supabase/supabase-js`
and `@supabase/ssr` are installed but unused.

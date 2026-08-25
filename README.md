# Taila Axiom — monorepo

An operations platform for organizations, built one sector at a time.
`packages/core` is a shared, sector-neutral toolbox; `apps/ngo` is the
first real app built on it, for NGOs — auth, RLS, and real Supabase data
all the way through, not a prototype.

```
packages/core     shared: types, gating, business logic, UI primitives, shell
apps/ngo          NGO sector app — real auth, RLS, and live data
supabase/         migrations, run in order against the live project
docs/             build history, hard-won lessons, design decisions
```

**Start with [`CLAUDE.md`](./CLAUDE.md)** at the repo root — it's the
actual technical entry point: build commands, architecture, the rules that
have each already caused a real bug when broken once, the auth model, and
an honest list of what's genuinely still unfinished. This README is a
human-facing overview; CLAUDE.md and `docs/` are where the real detail and
the current state live, kept there specifically so they don't drift out of
sync the way a hand-maintained top-level README tends to.

## Commands

```bash
npm install          # root, installs all workspaces
npm run dev           # turbo, all apps
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

**Contains no fixture, sample, or default data of any kind** — that's a
hard rule, not a style preference, after it caused a real bug once (see
`docs/LEARNINGS.md`). Sector-specific sample data lives in each consuming
app's own `lib/fixtures/`.

## Where things actually are

- `docs/EXECUTION.md` — a timestamped build log. What was done, in order,
  including the real bugs found and how they were fixed.
- `docs/LEARNINGS.md` — traps and lessons that cost real time once, written
  down so they don't cost time again.
- `docs/INTERFACE.md` — design decisions. Currently on hold; visual/color
  design work is deliberately deferred until reviewed against the legacy
  app's screenshots.
- `supabase/migrations/` — run in order, one at a time, against the live
  Supabase project. Each one is commented with *why*, not just *what*.
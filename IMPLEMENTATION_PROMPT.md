# Implementation Prompt for SkillHive

## Context
You are an implementation agent for **SkillHive** — a developer productivity platform with the philosophy: *"The interface should adapt to the work. The work should never adapt to the interface."*

You have been given:
1. **SKILLHIVE_PHILOSOPHY.md** — The founding principles and architecture
2. **SKILLHIVE_MASTER_PLAN.md** — The master implementation sequence
3. **AGENTS.md** — Your constitution as an implementation agent
4. **Project files** — Existing code in `/Users/rohansharma/Documents/skillhiive/`

---

## Your Task

You are to implement **Week 1-2: Monorepo Foundation** (Phase 1 of the Master Plan).

### Current State
- `/Users/rohansharma/Documents/skillhiive/web/` — Existing Web app (Vite + React 19 + Tailwind)
- `/Users/rohansharma/Documents/skillhiive/mobile/` — Existing Mobile app (Expo 58 + React Native)
- `/Users/rohansharma/Documents/skillhiive/` — Project root (where you'll create monorepo)

### Your Task: Week 1-2 Monorepo Foundation

#### Day 1-2: Monorepo Setup
1. Create monorepo root at `/Users/rohansharma/Documents/skillhiive/` (already exists)
2. Create `turbo.json`, `pnpm-workspace.yaml`, root `package.json`
3. Move existing `web/` and `mobile/` into `apps/web/` and `apps/mobile/`
4. Create `packages/` directory structure

#### Day 2-3: Extract Shared Packages
Extract from Web (`apps/web/src/`):
1. **`packages/contracts`** — Zod schemas from Web types
2. **`packages/brand`** — Design tokens from `src/theme/`
3. **`packages/client`** — Supabase + LiveKit clients from `src/lib/`

#### Day 3-4: Update Imports
1. Web: Update all imports to use `@skillhiive/*` packages
2. Mobile: Update all imports to use `@skillhiive/*` packages
3. Configure TypeScript path aliases

#### Day 4-5: CI/CD + Verification
1. GitHub Actions workflow for typecheck, build, test, contract tests
2. Verify both apps build, typecheck, tests pass
3. Gate review: Both apps build + typecheck + tests pass

---

## Deliverables

### 1. Monorepo Root Files
```
/Users/rohansharma/Documents/skillhiive/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .gitignore
└── .github/workflows/
    ├── verify.yml
    └── build.yml
```

### 2. Package Structure
```
/Users/rohansharma/Documents/skillhiive/packages/
├── contracts/
│   ├── src/api/room.ts
│   ├── src/api/user.ts
│   ├── src/api/team.ts
│   ├── src/api/sync.ts
│   ├── src/api/cue.ts
│   ├── src/api/orchestration.ts
│   ├── src/zod.ts
│   └── index.ts
├── brand/
│   ├── src/tokens/colors.ts
│   ├── src/tokens/spacing.ts
│   ├── src/tokens/radii.ts
│   ├── src/tokens/typography.ts
│   ├── src/tokens/shadows.ts
│   ├── src/tokens/motion.ts
│   ├── src/tokens/breakpoints.ts
│   ├── src/tokens/zIndex.ts
│   ├── src/web/cssVariables.ts
│   ├── src/web/tailwind.ts
│   ├── src/native/styleSheet.ts
│   ├── src/native/colorScheme.ts
│   ├── src/hooks/useTokens.ts
│   ├── src/hooks/useTokens.native.ts
│   └── index.ts
├── client/
│   ├── src/supabase/client.ts
│   ├── src/supabase/queries.ts
│   ├── src/supabase/mutations.ts
│   ├── src/supabase/realtime.ts
│   ├── src/livekit/client.ts
│   ├── src/livekit/token.ts
│   ├── src/livekit/room.ts
│   ├── src/api/client.ts
│   ├── src/api/endpoints.ts
│   └── index.ts
├── core/ (empty for now — Week 2)
├── ui/ (empty for now — Week 2)
├── native/ (empty for now — Week 2)
└── i18n/ (empty for now — Week 2)
```

---

## Success Criteria (Gate 1)

You must verify and confirm:

```bash
# From monorepo root
cd /Users/rohansharma/Documents/skillhiive

# 1. Typecheck passes
bun run typecheck

# 2. Lint passes
bun run lint

# 3. Tests pass
bun run test

# 4. Build passes
bun run build

# 5. Contract tests pass
bun run test:contracts

# 5. Web app builds
cd apps/web && bun run build

# 6. Mobile app builds
cd apps/mobile && bun run build

# 7. Both apps typecheck
cd apps/web && bun run typecheck
cd apps/mobile && bun run typecheck
```

**All must pass.** If any fail, you must fix before declaring Gate 1 passed.

---

## Constraints

1. **Do not modify** Web or Mobile app logic — only imports and configuration
2. **Extract exactly** what's needed from Web for the three packages
3. **Preserve all existing functionality** — no behavioral changes
4. **Use Bun** as runtime (not Node)
3. **Use pnpm** as package manager
4. **Use Turborepo** for build orchestration
4. **Use Zod** for all schemas in contracts

---

## Reference Files (Already Created)

- `/Users/rohansharma/Documents/SKILLHIVE_PHILOSOPHY.md`
- `/Users/rohansharma/Documents/SKILLHIVE_MASTER_PLAN.md`
- `/Users/rohansharma/Documents/AGENTS.md`

Read these first to understand the philosophy and standards.

---

## Your First Action

Start by examining the existing Web and Mobile codebases to understand what needs to be extracted, then create the monorepo structure.

**Begin with:** `ls -la /Users/rohansharma/Documents/skillhiive/web/src` and `ls -la /Users/rohansharma/Documents/skillhiive/mobile/src`

**Report back when Gate 1 is passed.**
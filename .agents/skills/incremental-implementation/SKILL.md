---
name: incremental-implementation
description: Delivers changes incrementally. Use when implementing any feature or change that touches more than one file. Use when you're about to write a large amount of code at once, or when a task feels too big to land in one step.
---

# Incremental Implementation

## Overview

Build in thin vertical slices — implement one piece, test it, verify it, then expand. Avoid implementing an entire feature in one pass. Each increment should leave the system in a working, testable state. This is the execution discipline that makes large features manageable.

## When to Use

- Implementing any multi-file change
- Building a new feature from a task breakdown
- Refactoring existing code
- Any time you're tempted to write more than ~100 lines before testing

**When NOT to use:** Single-file, single-function changes where the scope is already minimal.

## The Increment Cycle

```
┌──────────────────────────────────────┐
│                                      │
│   Implement ──→ Test ──→ Verify ──┐  │
│       ▲                           │  │
│       └───── Commit ◄─────────────┘  │
│              │                       │
│              ▼                       │
│          Next slice                  │
│                                      │
└──────────────────────────────────────┘
```

For each slice:

1. **Implement** the smallest complete piece of functionality
2. **Test** — run the test suite (or write a test if none exists)
3. **Verify** — confirm the slice works as expected (tests pass, build succeeds, manual check)
4. **Commit** -- save your progress with a descriptive message (see `git-workflow-and-versioning` for atomic commit guidance)
5. **Move to the next slice** — carry forward, don't restart

## Slicing Strategies

### Vertical Slices (Preferred)

Build one complete path through the stack:

```
Slice 1: Create a task (DB + API + basic UI)
    → Tests pass, user can create a task via the UI

Slice 2: List tasks (query + API + UI)
    → Tests pass, user can see their tasks

Slice 3: Edit a task (update + API + UI)
    → Tests pass, user can modify tasks

Slice 4: Delete a task (delete + API + UI + confirmation)
    → Tests pass, full CRUD complete
```

Each slice delivers working end-to-end functionality.

### Contract-First Slicing

When backend and frontend need to develop in parallel:

```
Slice 0: Define the API contract (types, interfaces, OpenAPI spec)
Slice 1a: Implement backend against the contract + API tests
Slice 1b: Implement frontend against mock data matching the contract
Slice 2: Integrate and test end-to-end
```

### Risk-First Slicing

Tackle the riskiest or most uncertain piece first:

```
Slice 1: Prove the WebSocket connection works (highest risk)
Slice 2: Build real-time task updates on the proven connection
Slice 3: Add offline support and reconnection
```

If Slice 1 fails, you discover it before investing in Slices 2 and 3.

## Implementation Rules

### Rule 0: Simplicity First

Before writing any code, ask: "What is the simplest thing that could work?"

After writing code, review it against these checks:
- Can this be done in fewer lines?
- Are these abstractions earning their complexity?
- Would a staff engineer look at this and say "why didn't you just..."?
- Am I building for hypothetical future requirements, or the current task?

```
SIMPLICITY CHECK:
✗ Generic EventBus with middleware pipeline for one notification
✓ Simple function call

✗ Abstract factory pattern for two similar components
✓ Two straightforward components with shared utilities

✗ Config-driven form builder for three forms
✓ Three form components
```

Three similar lines of code is better than a premature abstraction. Implement the naive, obviously-correct version first. Optimize only after correctness is proven with tests.

### Rule 0.5: Scope Discipline

Touch only what the task requires.

Do NOT:
- "Clean up" code adjacent to your change
- Refactor imports in files you're not modifying
- Remove comments you don't fully understand
- Add features not in the spec because they "seem useful"
- Modernize syntax in files you're only reading

If you notice something worth improving outside your task scope, note it — don't fix it:

```
NOTICED BUT NOT TOUCHING:
- src/utils/format.ts has an unused import (unrelated to this task)
- The auth middleware could use better error messages (separate task)
→ Want me to create tasks for these?
```

### Rule 1: One Thing at a Time

Each increment changes one logical thing. Don't mix concerns:

**Bad:** One commit that adds a new component, refactors an existing one, and updates the build config.

**Good:** Three separate commits — one for each change.

### Rule 2: Keep It Compilable

After each increment, the project must build and existing tests must pass. Don't leave the codebase in a broken state between slices.

### Rule 3: Feature Flags for Incomplete Features

If a feature isn't ready for users but you need to merge increments:

```typescript
// Feature flag for work-in-progress
const ENABLE_TASK_SHARING = process.env.FEATURE_TASK_SHARING === 'true';

if (ENABLE_TASK_SHARING) {
  // New sharing UI
}
```

This lets you merge small increments to the main branch without exposing incomplete work.

### Rule 4: Safe Defaults

New code should default to safe, conservative behavior:

```typescript
// Safe: disabled by default, opt-in
export function createTask(data: TaskInput, options?: { notify?: boolean }) {
  const shouldNotify = options?.notify ?? false;
  // ...
}
```

### Rule 5: Rollback-Friendly

Each increment should be independently revertable:

- Additive changes (new files, new functions) are easy to revert
- Modifications to existing code should be minimal and focused
- Database migrations should have corresponding rollback migrations
- Avoid deleting something in one commit and replacing it in the same commit — separate them

## Working with Agents

When directing an agent to implement incrementally:

```
"Let's implement Task 3 from the plan.

Start with just the database schema change and the API endpoint.
Don't touch the UI yet — we'll do that in the next increment.

After implementing, run `npm test` and `npm run build` to verify
nothing is broken."
```

Be explicit about what's in scope and what's NOT in scope for each increment.

## User-Driven Slice Cadence (this project)

When the user hands you a multi-slice plan and says "implement one by one,
report, ask for a smoke test, then commit, push at the end", follow this
exact cadence — it is the user's stated preference, not a default:

1. **Cleanliness first.** Before the first slice, check `git status`.
   If dirty, commit the in-progress baseline (descriptive message) so each
   planned slice lands as its own commit. Don't mix baseline work into
   slice 1.
2. **Per slice:** implement → run the relevant verification (build,
   `tsc --noEmit`, `pnpm test:unit`, `node scripts/check-no-jsdom.cjs` as
   the change warrants) → **report what you did in a short table** (file /
   change / why) → **ask whether a smoke test is needed** (e.g. `pnpm dev`
   at the URL) → **commit that slice with a descriptive message** → then
   **stop and wait for the user's command to proceed**. Do not auto-advance
   to the next slice.
3. **Push only at the end.** `git push` happens once, after the user has
   approved all slices — never per slice, never mid-plan.
4. **Warnings are in scope.** "Resolve all issues, even warnings" means:
   fix TS/lint warnings (unused vars, deprecated options, missing module
   declarations), not just errors. But keep each fix scoped to what was
   reported — pre-existing, codebase-wide warnings (e.g. intentional
   `react-hooks/exhaustive-deps`, unrelated unused imports) are out of
   scope unless the user points at them; note them and offer a separate
   cleanup pass rather than silently broadening the commit.

This cadence overrides the skill's default "move to the next slice"
autonomy: here the user drives progression. Report + wait each time.

## Classifying stray work before committing (this project)

When the user asks you to "check the stash / decide gitignore or commit as
chore" mid-plan, classify each leftover item by intent, not by file type:

1. **Session-local noise** — `nul` device files (0-byte artifacts from a stray
   `> nul` redirect), `AppData\Local\Temp\next-panic-*.log` copies, one-off
   repro dumps. → **delete + `.gitignore`**, never commit.
2. **Generalizable troubleshooting notes** — root-cause write-ups that a future
   session on the same machine/project would hit again (e.g. the Windows
   Turbopack symlink-privilege panic, the stale `.next/dev/lock` after a killed
   dev server). → write under `docs/` or
   `.agents/skills/<skill>/references/<topic>.md`, then commit as `chore:`.
3. **Skill captures** — edits to `.agents/skills/<name>/SKILL.md` and
   `references/*.md` that encode a durable lesson (slice cadence, known bugs,
   provider quirks). → commit as `chore:` so the next session inherits them.
   If a skill was loaded this session and turned out wrong or outdated, patch it
   here rather than leaving it stale.
4. **Documentation updates** — `README.md`, `CONTRIBUTING.md`, `docs/setup.md`
   and similar. → commit as `docs:` when the plan explicitly includes a
   documentation task (e.g. Task 11).
5. **Real code/test/config additions** that started as exploration and landed as
   a reusable artifact (feature flags, unit tests, config tweaks). → commit with
   the conventional type that matches the change (`chore:`, `fix:`, `feat:`,
   `test:`, `perf:`, `ci:`, `refactor:`, `ui:`, `accessibility:`).

**Rule of thumb:** a `.md` that is only session scratch is not "documentation";
a small `src/lib/*.ts` that encodes a reusable pattern is code even when tiny.
When unsure, ask before committing — don't silently commit session-local noise.

### Pitfall — typed flag helpers and `null` in tests

If the flag helper's signature is `isEnabled(feature: string): boolean`, passing
`null` in a test under `strictNullChecks` is a **type error (TS2345)**, not a
runtime edge case worth exercising through the typed API. Prefer:

- test the real contract: empty string, whitespace, missing env var, exact
  `"true"` vs other values;
- if you want to assert "undefined-like" behavior, either use the untyped escape
  hatch only where genuinely needed, or widen the signature to `string | undefined`
  **if that is the actual intended contract** — decide once and keep prod + tests
  consistent.

Deciding "null is not a valid feature name" and removing the test is usually the
cleaner path than widening the signature to accept `null`.

## Increment Checklist

After each increment, verify:

- [ ] The change does one thing and does it completely
- [ ] All existing tests still pass (`npm test`)
- [ ] The build succeeds (`npm run build`)
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] The new functionality works as expected
- [ ] The change is committed with a descriptive message

**Note:** Run each verification command after a change that could affect it. After a successful run, don't repeat the same command unless the code has changed since — re-running on unchanged code adds no information.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll test it all at the end" | Bugs compound. A bug in Slice 1 makes Slices 2-5 wrong. Test each slice. |
| "It's faster to do it all at once" | It *feels* faster until something breaks and you can't find which of 500 changed lines caused it. |
| "These changes are too small to commit separately" | Small commits are free. Large commits hide bugs and make rollbacks painful. |
| "I'll add the feature flag later" | If the feature isn't complete, it shouldn't be user-visible. Add the flag now. |
| "This refactor is small enough to include" | Refactors mixed with features make both harder to review and debug. Separate them. |
| "Let me run the build command again just to be sure" | After a successful run, repeating the same command adds nothing unless the code has changed since. Run it again after subsequent edits, not as reassurance. |

## Red Flags

- More than 100 lines of code written without running tests
- Multiple unrelated changes in a single increment
- "Let me just quickly add this too" scope expansion
- Skipping the test/verify step to move faster
- Build or tests broken between increments
- Large uncommitted changes accumulating
- Building abstractions before the third use case demands it
- Touching files outside the task scope "while I'm here"
- Creating new utility files for one-time operations
- Running the same build/test command twice in a row without any intervening code change

## Verification

After completing all increments for a task:

- [ ] Each increment was individually tested and committed
- [ ] The full test suite passes
- [ ] The build is clean
- [ ] The feature works end-to-end as specified
- [ ] No uncommitted changes remain

## See Also

Per-increment verification is the local check. Before declaring a task done, apply the project-wide Definition of Done as the final gate, the standing bar every increment clears regardless of the task. See `references/definition-of-done.md`.

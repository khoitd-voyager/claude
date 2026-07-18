---
description: Review + test a shipped change as a lead/senior/TA — clean code, maintainability, readability, test coverage — then close
---

# Review-Ship

Independent quality gate that runs AFTER `/ship` has implemented + committed the tasks.
Play the role of a **lead engineer / senior / TA reviewing the PR**: is the code clean, easy to
maintain, easy for the next person to read, and are the tests actually covering the behavior?

> **Workflow:** `/create` → `/ship` (implement + commit) → **`/review-ship`** (test + review + close)
>
> This command was split out of `/ship` on purpose: keep the implementation context and the
> review context separate so neither one overflows and drifts.
>
> **MINIMAL DIFF (required — per `.claude/CLAUDE.md`):** any fix you apply here changes only the
> exact line(s) that must change, byte-for-byte identical except for the tokens being changed. Do
> NOT reflow/split/join lines, do NOT add `;`, do NOT change quote style, do NOT run any formatter.

## Load Skills

Read and follow, in this order:

1. `.claude/skills/senior-mode/SKILL.md` — review with the senior/TA lens (blast radius, guard-first, edge cases).
2. `.claude/skills/code-review-and-quality/SKILL.md` — correctness / regression / maintainability checklist.
3. `.claude/skills/verification-before-completion/SKILL.md` — evidence before any "passes" claim.

## Phase 0: Scope the Diff

```bash
BASE_SHA=$(git rev-parse origin/main 2>/dev/null || git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)
git diff --stat $BASE_SHA...HEAD
```

- Read `.claude/artifacts/$(cat .claude/artifacts/.active)/spec.md` (if present) for the intended goal.
- **Review ONLY the changed lines in this diff** — per `.claude/CLAUDE.md`, do NOT review unrelated files or pre-existing logic.

## Phase 1: Test / Verify

Per `.claude/CLAUDE.md`, treat build/lint/typecheck as **user-run gates — do NOT auto-run** `npm run build` / `npm run lint` / `yarn build` / `yarn test` / `lint:fix`.

**Backend (`be/*`) — BE Test Loop (mandatory):**

1. Run the spec that covers the test cases in `.claude/artifacts/[tag]/[name]/`:
   `npm run test .../src/services/<file>.spec.ts`
2. All cases PASS → done. Any case FAILS → fix code (minimal diff) → re-run. Max 3 loops.
   Still failing after 3 → STOP, report to user, do not push on.
3. After all cases pass → **delete the temporary `.spec.ts`** (do not commit it).

**Frontend (`BEXMP-*`):** confirm by reproduction of the changed flow — do not auto-run build/lint.

## Phase 2: Lead / Senior / TA Code Review

Review the diff as if you were the reviewer who has to maintain this after the author leaves.
Report findings grouped by severity (Critical / Important / Minor). For each: `file:line`, what's
wrong, and the minimal fix.

### 2A. Clean & maintainable
- **Readable for the next person:** clear names, no cryptic one-letters, no dead/commented-out code, no leftover `console.log`/debug.
- **No needless complexity:** could this be simpler? Over-abstraction, premature generalization, duplicated logic that should be one helper.
- **Consistency:** matches the existing pattern in the repo (name the file the pattern came from). No new abstraction when one already exists. No drive-by refactor outside scope.
- **Small functions, single responsibility:** a function doing 4 things → flag it.
- **Comments** explain *why*, not *what*; English only (per `.claude/CLAUDE.md`).

### 2B. Guard-first / correctness (per `.claude/CLAUDE.md`)
- **GUARD-FIRST:** cheap in-memory guards (type/enum/null/empty) → filter + early return → expensive work (DB/API/service) LAST.
- Any DB/API call running for a result that gets discarded? → move below the guard.
- An error thrown for a case that should be a silent no-op `return`? → that is a **bug**, flag it.
- Edge cases: null / undefined / empty array / empty string / 0; double-submit / retry; external failure / partial write / timeout; money rounding / negative.
- N+1 queries, query-in-loop, missing transaction, missing permission/ownership check on a route.
- Backward compatible for data already in the DB and clients already deployed?

### 2C. Test coverage
- Do the tests actually assert the behavior, or do they just assert mocks? (see `testing-anti-patterns`)
- Is every acceptance criterion from `spec.md` covered by a case? Every branch / guard / error path?
- Any case listed in `.claude/artifacts/[tag]/[name]/` that has no matching test? → flag as a gap.

### UI Quality Gate (only if UI files changed)

```bash
git diff --name-only $BASE_SHA...HEAD -- '*.tsx' '*.jsx' '*.css' '*.scss' '*.sass' '*.less' '*.html' '*.mdx'
```

If any changed, also check: one primary action per view; empty/loading/error/success states;
retry/undo/confirm on destructive actions; form labels + validation + error association; semantic
HTML, keyboard path, visible focus, reduced motion; component-family consistency.

## Phase 3: Apply Fixes

| Severity  | Action                                                                          |
| --------- | ------------------------------------------------------------------------------- |
| Critical  | Fix inline (minimal diff) → re-run Phase 1 test → commit the fix                 |
| Important | Fix inline (minimal diff) → commit the fix                                       |
| Minor     | Note in `.claude/artifacts/$(cat .claude/artifacts/.active)/progress.md` for a later cleanup pass |

If a Critical finding needs an architectural decision → STOP → present options to the user, don't guess.

## Phase 4: Close

Ask the user before closing — use the `AskUserQuestion` tool:

- **Header:** Close
- **Question:** "Tests pass, review clean. Mark plan as complete?"
- **Options:**
  - "Yes, mark complete (Recommended)" — all checks passed
  - "No, keep working" — needs more work

If confirmed: mark tasks complete in `.claude/artifacts/todo.md`, append a summary to
`.claude/artifacts/$(cat .claude/artifacts/.active)/progress.md`, and record significant learnings to memory.

## Output

Report:

1. **Test results** — BE spec: [pass/fail per case]; FE: [reproduced flow]; `.spec.ts` deleted: [yes/no].
2. **Review findings** — Critical [N] / Important [N] / Minor [N], each with `file:line` + fix.
3. **Fixes applied** — inline fixes + commit hashes; deferred Minor items.
4. **Test coverage** — acceptance criteria covered vs gaps.
5. **Verdict** — [ship / needs work].
6. **Next steps** — ask the user if they want a PR created (never push without confirmation).

## Related Commands

| Need                    | Command          |
| ----------------------- | ---------------- |
| Implement a plan        | `/ship`          |
| Create a feature spec   | `/create`        |
| Resolve PR comments     | `/resolve-comments` |

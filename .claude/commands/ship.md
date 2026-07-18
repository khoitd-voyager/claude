---
description: Ship a plan - implement specs and commit per task (test + review live in /review-ship)
---

# Ship

Execute spec tasks, verify each task passes its own gate, commit per task. Test + review + close are handled separately by `/review-ship`.

> **Workflow:** `/create` → **`/ship`** (implement + commit) → `/review-ship` (test + review + close) → `/qa`
>
> Test and review were intentionally split into `/review-ship` to keep the implementation context and the review context separate so neither overflows and drifts.
>
> **MINIMAL DIFF (required — per `.claude/CLAUDE.md`):** change only the exact line(s) that must change, byte-for-byte identical except for the tokens being changed. Do NOT reflow/split/join lines, do NOT add `;`, do NOT change quote style, do NOT run any formatter/lint fixer.

## Load Skills

Read `.claude/skills/verification-before-completion/SKILL.md` and follow it.

## Before You Ship

- **Be certain**: Only mark a task done if it passes its own per-task verification
- **Don't skip gates**: Verify each task — but per `.claude/CLAUDE.md` do NOT auto-run `build`/`lint`/`typecheck`; use the BE test runner (`npm run test .../*.spec.ts`) for `be/*` and reproduction for FE
- **Commit per task**: Per-task commits required, don't hand off without git history
- **Hand off, don't close**: This command stops after implementation + commit. Test, full review, and closing the plan happen in `/review-ship` — do NOT close the plan here

## Available Tools

| Tool                     | Use When                                      |
| ------------------------ | --------------------------------------------- |
| Read / Grep / Glob       | Finding patterns in codebase, prior art       |
| `Explore` subagent       | Broad fan-out searches across many files/dirs |
| `WebSearch` / `WebFetch` | External research, best practices             |
| `code-navigation` skill  | Finding symbol definitions, references        |
| `srcwalk` skill          | Finding code patterns                         |
| `Agent` tool             | Spawning subagents for parallel execution     |

## Phase 1: Guards

### Memory Search

Search memory for: failed approaches to avoid repeating.

### Plan Validation

Verify:

- `.claude/artifacts/$(cat .claude/artifacts/.active)/spec.md` exists (if not, tell user to run `/create` first)

Check what artifacts exist:

Read `.claude/artifacts/$(cat .claude/artifacts/.active)/` to check what artifacts exist (spec.md, plan.md, etc.).

### Workspace Setup

Set up the workspace: create branch, install deps if needed.

## Phase 2: Route to Execution

### Complexity Detection

Before routing, analyze the plan complexity:

**Direct execution** (use existing logic):
- Plan has <5 tasks
- Tasks have dependencies (not fully independent)
- Tasks require sequential execution
- User explicitly requests sequential execution

**Workflow execution** (invoke `batch-implement`):
- Plan has ≥5 independent tasks
- Tasks have no file conflicts
- Tasks can run in parallel
- User wants maximum parallelism

### Decision Logic

1. **Parse the plan** from `.claude/artifacts/$(cat .claude/artifacts/.active)/plan.md` or `prd.json`
2. **Count independent tasks** (tasks with no dependencies)
3. **Check for file conflicts** (do any tasks edit the same files?)
4. **Route accordingly:**
   - <5 tasks OR has dependencies OR has file conflicts → Direct execution (see "Direct Execution" below)
   - ≥5 independent tasks AND no file conflicts → Invoke `batch-implement` workflow (see "Workflow Execution" below)

### Workflow Execution (Parallel Implementation)

If complexity is detected as parallel:

1. **Read the workflow:** `.opencode/workflows/batch-implement.md`
2. **Execute all phases** (spawn subagents via the `Agent` tool):
   - Phase 1: Spawn 1 `general-purpose` subagent (review-focused) to review the plan for task independence
   - Phase 2: Spawn multiple `general-purpose` subagents (1 per task, dynamic count)
   - Phase 3: Spawn multiple `general-purpose` subagents (review-focused) to verify implementations
   - Phase 4: Spawn 1 `general-purpose` subagent to merge results
3. **Replace placeholders:**
   - `{plan}` → the implementation plan
   - `{phase_N_output}` → actual output from completed phases
4. **Aggregate results** between phases
5. **Continue to Phase 4: Verification** (skip Phase 3 below)

**Announce:** "This plan has [N] independent tasks. Invoking batch-implement workflow for parallel execution."

### Direct Execution

If complexity is simple or tasks have dependencies, use the existing execution logic below.

| Artifact exists in `.claude/artifacts/$(cat .claude/artifacts/.active)/` | Action                                                   |
| --------------- | -------------------------------------------------------- |
| `plan.md`       | Parse plan header + dependency graph, execute wave-by-wave |
| `prd.json`      | Proceed to PRD task loop below                             |
| Only `spec.md`  | Convert spec to `prd.json`, then proceed                    |

## Phase 3: Wave-Based Execution

If `plan.md` exists with dependency graph:

1. **Parse waves** from dependency graph section
2. **Execute wave-by-wave:**
   - Single-task wave → execute directly (no subagent overhead)
   - Multi-task wave → dispatch parallel `Agent` subagents (`subagent_type: "general-purpose"`), one per task
3. **Review after each wave** — run verification gates, report, wait for feedback
4. **Continue** until all waves complete

**Parallel safety:** Only tasks within same wave run in parallel. Tasks must NOT share files. Tasks in Wave N+1 wait for Wave N.

### Phase 3A: PRD Task Loop (Sequential Fallback)

For each task (wave-based or sequential fallback):

1. **Read** the task description, verification steps, and affected files
2. **Read** the affected files before editing
3. **Implement** the changes — stay within the task's `files` list
4. **Handle Deviations:** Apply deviation rules 1-4 as discovered
5. **Checkpoint Protocol:** If task has `checkpoint:*`, stop and request user input
6. **Verify** — run each verification step from the task
7. **If verification fails**, fix and retry (max 2 attempts per task)
8. **Commit** — per-task commit (see below)
9. **Mark** `passes: true` in `.claude/artifacts/$(cat .claude/artifacts/.active)/prd.json`
10. **Append** progress to `.claude/artifacts/$(cat .claude/artifacts/.active)/progress.md`

### Checkpoint Protocol

When task has `checkpoint:*` type:

| Type                      | Action                                                     |
| ------------------------- | ---------------------------------------------------------- |
| `checkpoint:human-verify` | Execute automation first, then pause for user verification |
| `checkpoint:decision`     | Present options, wait for selection                        |
| `checkpoint:human-action` | Request specific action with verification command          |

**Automation-first:** If verification CAN be automated, MUST automate it before requesting human check.

**Checkpoint return format:**

```markdown
## CHECKPOINT REACHED

**Type:** [human-verify | decision | human-action]
**Progress:** X/Y tasks complete

### Completed

| Task | Commit | Status |
| ---- | ------ | ------ |
| [N]  | [hash] | [[x]/[ ]]  |

### Current Task

**Task:** [name]
**Blocked by:** [specific blocker]

### Awaiting

[What user needs to do/provide]
```

### TDD Execution Flow

When task specifies TDD:

**RED Phase:**

1. Create test file with failing test
2. Run test → MUST fail
3. Commit: `test: add failing test for [feature]`

**GREEN Phase:**

1. Write minimal code to make test pass
2. Run test → MUST pass
3. Commit: `feat: implement [feature]`

**REFACTOR Phase:** (if needed)

1. Clean up code
2. Run tests → MUST still pass
3. Commit if changes: `refactor: clean up [feature]`

### Task Commit Protocol

After each task completes (verification passed):

1. **Check modified files:** `git status --short`
2. **Stage individually** (NEVER `git add .`):
   ```bash
   git add src/specific/file.ts
   git add tests/file.test.ts
   ```
3. **Commit with type prefix:**

   ```bash
   git commit -m "feat: [task description]

   - [key change 1]
   - [key change 2]"
   ```

4. **Record hash** in progress log

**Commit types:**
| Type | Use For |
|------|---------|
| `feat` | New feature, endpoint, component |
| `fix` | Bug fix, error correction |
| `test` | Test-only changes (TDD RED phase) |
| `refactor` | Code cleanup, no behavior change |
| `chore` | Config, tooling, dependencies |

### Stop Conditions

- Verification fails 2x on same task → stop, report blocker
- Blocked by unfinished dependency → stop, report which one
- Modifying files outside task scope → stop, ask user
- Rule 4 deviation encountered → stop, present options

## Phase 4: Per-Task Gate (light)

This command only proves each task individually, so `/review-ship` starts from a green base:

- Per `.claude/CLAUDE.md`, do NOT auto-run `npm run build` / `npm run lint` / `yarn build` / `yarn test` / `lint:fix` — those are user-run gates.
- For `be/*`: run the task's own `Verify:` / spec cases via the BE test runner (`npm run test .../*.spec.ts`) as part of the task loop above.
- For FE: confirm the changed flow by reproduction.

Do NOT run the full parallel review, goal-backward verification, or close the plan here — those live in `/review-ship`.

## Phase 5: Hand Off to /review-ship

When all tasks are implemented and committed, STOP and hand off:

1. Print the implementation summary (see Output below).
2. Tell the user: **"Implementation done and committed. Run `/review-ship` to test, review (lead/senior/TA), and close."**
3. Do NOT close the plan, do NOT create a PR — `/review-ship` owns those steps.

## Output

Report:

1. **Execution Summary:**
   - Tasks completed/total
   - Waves executed (if plan.md with waves)
   - Deviations applied (Rules 1-3)
   - Checkpoints encountered (human-verify/decision/human-action)
   - Commits made

2. **PRD Task Results:**
   - Each task status ([x] pass, [ ] fail, [PAUSE] checkpoint)
   - Files modified per task
   - Commit hashes

3. **Per-Task Gate Results:**
   - Test (BE spec runner, per task): [pass/fail]
   - Build / Lint / Typecheck: [user-run — not auto-run per `.claude/CLAUDE.md`]

4. **Next Step:**
   - **Run `/review-ship`** to test, review (lead/senior/TA), and close — do NOT close or open a PR here

## Related Commands

| Need                    | Command            |
| ----------------------- | ------------------ |
| Test + review + close   | `/review-ship`     |
| Create feature          | `/create`          |
| Investigate a bug       | `/hotfix`          |
| Fix a triaged bug       | `/fix-bugs <slug>` |

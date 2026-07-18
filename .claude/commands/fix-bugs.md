---
description: Fix a triaged bug from a /hotfix report — implement the fix, verify, review, close
argument-hint: "<slug> (folder under .claude/artifacts-hotfix)"
---

# Fix Bugs: $ARGUMENTS

Fix a bug that has **already been investigated** by `/hotfix`. The input is the report `.claude/artifacts-hotfix/<slug>/hotfix.md` (root cause + proposed fix). Your job: **implement the fix** per the report → verify → review → report results.

> **Workflow:** `/hotfix <bug>` → (user reads + verifies via the UI) → **`/fix-bugs <slug>`**
>
> **Golden rule:** Only fix the confirmed root cause in `hotfix.md`. Do NOT expand scope, do NOT refactor along the way.
>
> **MINIMAL DIFF (required — per `.claude/CLAUDE.md`):** change only the exact line(s) that must change, byte-for-byte identical except for the tokens being changed. Do NOT reflow/split/join lines, do NOT add `;`, do NOT change quote style, do NOT run any formatter/lint fixer.

## Step 0 — Load the skills that help you (DO THIS FIRST)

The project ships a skill library at `.claude/skills/<name>/SKILL.md`. **Before anything else, Read the relevant skill files and follow them.** Load only what fits this fix — do not load everything.

**Always relevant to `/fix-bugs`:**

- `structured-edit` — precise, minimal-diff edits (matches the repo's hard rule)
- `verification-before-completion` — don't claim done before the gates pass
- `root-cause-tracing` — stick to the true root cause in the report, don't patch surface symptoms

**Load as the situation demands:**

- `debugging-and-error-recovery` — if you need to reproduce the bug to confirm before/after the fix
- `test-driven-development` — if writing a red test first to lock in correct behavior
- `incremental-implementation` — if the fix touches multiple points, break it into steps
- `core-data-expert` / `supabase-postgres-best-practices` — if data/queries are involved
- `react-best-practices` / `frontend-design` — if fixing the storefront/admin UI
- `security-and-hardening` — if the bug involves auth/leak/exploit

Browse `.claude/skills/` if a more specific skill fits the fix.

## Step 1 — Read the hotfix report (the input)

1. Determine the slug from `$ARGUMENTS`. If empty → ask the user which slug (list the folders under `.claude/artifacts-hotfix/`).
2. **Read** `.claude/artifacts-hotfix/<slug>/hotfix.md`. If the file doesn't exist → stop, tell the user to run `/hotfix` first.
3. Extract from the report:
   - **Root cause** + the relevant `file:line`.
   - **Proposed fix**: which file to change, what to change, scope.
   - **Reproduction** steps (to verify afterward).
   - **Risk & impact** (where a regression could occur).
4. If the report lacks a root cause or hasn't been confirmed by the user → stop and ask the user (don't guess and patch blindly).

## Step 2 — Confirm scope before editing

- **Read** the files you'll touch (per `file:line` in the report) BEFORE editing.
- Lock in the list of files + lines you'll change. Keep it within the scope the report describes.
- If you discover the true root cause differs from the report → **stop, tell the user**, and propose updating `hotfix.md` (go back to `/hotfix`). Do not fix outside scope on your own.

## Step 3 — Implement the fix (MINIMAL DIFF)

- Use Edit/Write. Change only the exact line(s) that must change.
- Strictly follow `.claude/CLAUDE.md`:
  - Don't add `;`, don't reflow/split/join lines, don't change quotes/indentation/trailing commas.
  - `new_string` is byte-for-byte identical to `old_string` except for the tokens being changed.
  - Don't touch generated/build artifacts, don't change unnecessary imports.
- If the bug spans multiple points, fix each one and keep the diff minimal at every point.

## Step 4 — BE Test Loop (required if touching `be/*`)

Apply the **"BE Task — Test Loop"** section in `.claude/CLAUDE.md`:

- After coding you MUST run the tests matching the test cases (if listed in the report / `.claude/artifacts-hotfix/<slug>/`).
- Write a temporary `.spec.ts` to verify if needed.
- Run tests via the test runner: `npm run test .../src/services/*.spec.ts` (NO GUI / external tools).
- **All PASS** → go to Step 5, and **DELETE** the temporary `.spec.ts` (do not leave it in the repo).
- **≥ 1 FAIL** → fix the code and re-run. Repeat **at most 3 times**. After 3 attempts still failing → **stop, tell the user**, do not proceed on your own. Keep the `.spec.ts` while it's still failing to keep fixing.

> If not touching `be/*` (FE storefront/admin only): skip the backend test runner; confirm the fix by reproducing per Step 1.3 (still don't auto-run build/lint/typecheck — see Guardrails).

## Step 5 — Verify (confirm the bug is gone)

- Follow the [Verification Protocol](.claude/skills/verification-before-completion/references/VERIFICATION_PROTOCOL.md).
- Re-run the **reproduction steps** in `hotfix.md`: the bug NO longer appears.
- Check the regression points the report warned about under "Risk & impact".
- ⚠️ **Do not auto-run** `npm run build` / `npm run lint` / `yarn build` / `yarn test` / `lint:fix` (per `.claude/CLAUDE.md`). Only run the test runner per Step 4 when permitted.

## Step 6 — Review (only the fix diff)

- Review **only the changes** in this fix's PR/diff (per `.claude/CLAUDE.md`: don't review unrelated files/logic).
- Self-check:
  - Does the fix address the real root cause, not just mask the symptom?
  - Is the diff minimal, with no stray reflow/formatting?
  - No secrets leaked, no `.env` read?
  - Any regression per the report's warnings?
- If you find a serious issue requiring an architectural decision → stop, present options to the user.

## Step 7 — Record results & close

1. Append a **"Fix applied"** section to the end of `.claude/artifacts-hotfix/<slug>/hotfix.md` (or create `.claude/artifacts-hotfix/<slug>/fix.md`) with:
   - **Files changed** + a summary of the change (minimal diff).
   - **Test results**: PASS/FAIL per test case (if there was a BE test).
   - **How verified**: reproduced again and the bug is gone.
   - **Regression notes** (if any).
2. **Report to the user** a summary: what was fixed, where, and how it was tested/verified.
3. **Ask the user before closing / creating a commit / PR** (use `AskUserQuestion`) — don't commit/push without approval.

## Guardrails

- **Never** read `.env` or any `.env.*` with real secrets — only `.env.template`.
- **MINIMAL DIFF** always — no formatter, no reflow, no semicolons, no quote changes.
- **Do not** run `npm run build` / `npm run lint` / `yarn build` / `yarn test` / `lint:fix` or similar build/test/lint commands. Only run the test runner for `.spec.ts` per Step 4.
- **Do not** expand scope beyond the confirmed root cause in `hotfix.md`.
- **Do not** deploy/rollback/toggle production flags — that's the user's job.
- Don't touch generated/build artifacts. Run checks from the changed package, not the repo root.

## Related Commands

| Need                        | Command            |
| --------------------------- | ------------------ |
| Investigate bug + report     | `/hotfix <bug>`    |
| Fix bug from the report      | `/fix-bugs <slug>` |
| Ship a spec (feature work)   | `/ship`            |

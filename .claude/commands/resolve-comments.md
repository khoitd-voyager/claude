---
description: Fetch a lead's PR review comments (read-only) → fix code LOCALLY per minimal-diff → draft replies for the user to post manually
argument-hint: "<PR number, or a GitHub PR URL — leave empty to detect from current branch>"
---

# Resolve Lead Comments: $ARGUMENTS

Pull the **unresolved review comments** on a GitHub PR, understand what the lead is asking, then **fix the code locally** following this repo's strict minimal-diff rules. Finish by giving the user a clear map of *comment → what changed* plus **draft replies they can copy-paste** onto GitHub themselves.

> **Golden rules for this command**
>
> 1. **READ-only on GitHub.** You may run `gh` to *read* the PR and its comments. You **MUST NOT** write to GitHub: no replies, no `resolve`, no review, no commit, no push, no PR edits. The user does all GitHub interaction manually.
> 2. **LOCAL edits only.** Change files in the working tree. **Never** `git commit`, `git push`, `git add`, or run any git write command.
> 3. **MINIMAL DIFF is law.** Obey `.claude/CLAUDE.md` to the letter — touch only the exact line(s) required, no reflow, no semicolons, no quote-style changes, no formatters. Re-read that file's Minimal Diff Policy before editing.
> 4. **Understand before you touch.** If a comment is ambiguous or you cannot see how to satisfy it safely, do NOT guess — list it under "Needs clarification" and move on.

## Step 0 — Load the skills that help you

Read and follow the relevant `.claude/skills/<name>/SKILL.md` before editing. Load only what fits the comments you actually see:

- `senior-mode` — MANDATORY, load FIRST. Apply it to **must-fix** comments only (skip for nits): its **Blast radius** + **Design check** + **Edge cases** sections drive the Step 3 `Plan` column. Its `ASK` items are exactly the **clarify** type — they go to "Needs clarification", never to a guessed edit. Do NOT run its full Analysis block per nit; that fights this command's minimal-diff scope.
- `code-review-and-quality` — to interpret what the lead is really asking for
- `react-best-practices` / `frontend-design` — comments on `BEXMP-storefront` or `BEXMP-admin`
- `debugging-and-error-recovery` / `root-cause-tracing` — comments pointing at a bug
- `security-and-hardening` — comments about auth, secrets, validation
- `verification-before-completion` — before you claim any comment is resolved

## Step 1 — Resolve the PR

- If `$ARGUMENTS` is a number or a PR URL, use it directly.
- If empty, detect the PR for the current branch: `gh pr view --json number,headRefName,url`. If none is found, STOP and ask the user for a PR number.
- Confirm the repo is a git repo with a GitHub remote first (`gh repo view`). If not, STOP and tell the user this command needs a GitHub PR.

## Step 2 — Fetch the review comments (READ-only)

Pull **all review threads with their resolved state** via the GraphQL API (REST does not expose `isResolved`):

```bash
gh api graphql -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) {
          nodes {
            isResolved
            isOutdated
            path
            line
            comments(first:20) {
              nodes { author { login } body diffHunk createdAt url }
            }
          }
        }
      }
    }
  }' -f owner=<OWNER> -f repo=<REPO> -F pr=<PR>
```

Also grab top-level PR review bodies (`gh pr view <PR> --json reviews,comments`) in case the lead left instructions there rather than inline.

Then filter:

- **Keep** threads where `isResolved == false`.
- Focus on comments authored by the **lead / reviewer**, not your own past replies.
- Note `isOutdated: true` threads separately — the code may have already moved.

## Step 3 — Triage & show the user (before editing)

Group the open comments into a short table and print it **before** you start changing code:

| # | File:line | Lead's ask (summary) | Type | Plan |
|---|-----------|----------------------|------|------|
| 1 | `path:line` | … | must-fix / nit / question / clarify | one-line intended change |

Types:
- **must-fix** — a real code change is required.
- **nit** — trivial (naming, formatting-adjacent) — still respect minimal-diff.
- **question** — lead is asking, not requesting a change → answer in the draft reply, no code edit.
- **clarify** — ambiguous / risky → do NOT edit, escalate to the user.

## Step 4 — Fix locally, one comment at a time

For each **must-fix** / **nit**:

1. Read the target file and the surrounding context.
2. Make the **smallest possible** edit that satisfies the comment. Re-read `.claude/CLAUDE.md` — no reflow, no `;`, no quote flips, no import reordering, no whole-file rewrites.
3. If the change touches a backend service under `be/*`, you will verify it in Step 5 — don't run tests yet, just make the edit.
4. Do not fix things the lead did not mention. No drive-by refactors.

## Step 5 — Verify (test loop, like `/ship`)

After all edits are made, verify the changes actually work — do **not** claim a comment resolved without evidence. Follow `.claude/skills/verification-before-completion/SKILL.md`.

> ⚠️ **Per `.claude/CLAUDE.md`**: do NOT auto-run `npm run build` / `npm run lint` / `yarn build` / `yarn test` / `lint:fix`. Those are user-run gates.

**Backend (`be/*`) — BE Test Loop (mandatory):**

1. For each changed `be/*` service, run the matching spec via the test runner only:
   `npm run test .../src/services/<file>.spec.ts`
   (throwaway `.spec.ts` + a temp jest config with `moduleNameMapper` for the `be/*` path aliases — see the memory note on this).
2. **PASS all cases → that comment is DONE.**
3. **FAIL ≥ 1 case → fix the code and re-run.** Loop **max 3 times**. Still failing after 3 → STOP, report to the user, do not push further.
4. **Cleanup:** once a spec passes, **DELETE the `.spec.ts`** — never leave it behind. (Keep it only while still failing, to iterate.)

**Frontend (`BEXMP-storefront` / `BEXMP-admin`):** confirm by reproduction / reading the changed path (no build/lint run). State clearly what you checked.

## Step 6 — Report back (the deliverable)

Produce a single summary for the user containing:

1. **Changed files** — `path:line` for every edit, with the comment # it answers.
2. **Test results** — for each `be/*` change, the spec that ran and its PASS/FAIL (confirm the `.spec.ts` was deleted). For FE, what you reproduced/checked.
3. **Draft replies** — one copy-paste-ready reply per resolved comment, e.g.
   > **Comment #1 (`path:line`)** — reply: `Done — fixed in <describe change>. Please re-check.`
4. **Needs clarification** — comments you deliberately did NOT act on, with the question to ask the lead.
5. **Reminder line**: *"Local edits only — nothing committed, pushed, or posted to GitHub. Review the diff, then commit/push and paste the replies yourself."*

Do NOT run any git write command and do NOT touch GitHub. Stop here.

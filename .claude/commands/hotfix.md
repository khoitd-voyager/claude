---
description: Triage a production bug and write a root-cause report — NO code changes
argument-hint: "<bug description / error / ticket>"
---

# Hotfix: $ARGUMENTS

Investigate a **production bug** safely: assess severity → propose how to stop the bleeding → find the root cause → **write a report** for the user to read and verify. This command **does NOT change code** — the actual fix is done later by `/fix-bugs <slug>`.

> **Golden rule:** Stabilize for users FIRST, understand SECOND. Never guess the cause without evidence.
>
> **Ends at the report:** The output of `/hotfix` is a single file `.claude/artifacts-hotfix/<slug>/hotfix.md`. Once you find the root cause → write the report → STOP. No coding, no fixing.
>
> **Workflow:** **`/hotfix`** → (user reads + verifies via the UI) → `/fix-bugs <slug>`

## Step 0 — Load the skills that help you (DO THIS FIRST)

The project ships a skill library at `.claude/skills/<name>/SKILL.md`. **Before anything else, Read the relevant skill files and follow them.** Load only what fits this bug — do not load everything.

**Always relevant to `/hotfix`:**

- `senior-mode` — MANDATORY, load FIRST: senior/TA analysis pass. Drives Step 1 triage and the **Blast radius** / **Edge cases** sections of the report; its `ASK` items are the questions to put to the user before claiming a root cause.
- `debugging-and-error-recovery` — systematic debugging loop (reproduce → isolate → diagnose)
- `root-cause-tracing` — trace a symptom back to its true origin, not the first suspicious line

**Load as the situation demands:**

- `git-workflow-and-versioning` — inspect commit history / recent deploy diff to narrow the blast radius
- `security-and-hardening` — if the bug leaks data, bypasses auth, or is exploitable
- `core-data-expert` / `supabase-postgres-best-practices` — if data corruption or a bad query is involved
- `react-best-practices` / `frontend-design` — if the bug is in the storefront/admin UI

Browse `.claude/skills/` if a more specific skill fits the symptom.

## Step 0.5 — Choose the reproduction mode

Before triaging, ask the user how they want the bug reproduced (or read it from `$ARGUMENTS` if they passed `--browser` / `--static`):

- **`static`** (default) — investigate from logs, code, and evidence only. No browser. Use when the bug is backend/data, or the user just wants the analysis.
- **`chrome-devtools`** — actually **drive Chrome** to reproduce the bug on the running site (best for UI / storefront / admin bugs). If chosen, also load `browser-testing-with-devtools` + `chrome-devtools` and see Step 3. You'll need a base URL and, if the flow needs login, a **test account** from the user (never read `.env`).

Pick `chrome-devtools` when the symptom is visual / interaction-based and you can point the browser at a safe environment; otherwise `static`.

## Step 1 — Triage: how bad is it?

Answer before touching anything:

| Question | Why it matters |
| --- | --- |
| Who / how many users are affected? | Sets severity (P0 vs. minor) |
| Which feature? (payments, auth, orders…) | Money/security flows = P0 |
| Is data being lost, corrupted, or leaked? | Data + security = highest priority |
| Is it spreading, or contained? | Decides rollback vs. targeted fix |
| When did it start? | Correlate with the last deploy / config change |

Classify: **P0 (fire)** → immediately state a stop-the-bleeding recommendation in Step 2. Lower severity → note it and move to Step 3.

## Step 2 — Stop the bleeding (recommendation — P0)

For P0, recommend returning users to a stable state **before** understanding the root cause:

- **Rollback** to the last known-good release, or
- **Disable the feature flag** / toggle off the broken path, or
- Block the failing traffic / put up a safe fallback.

This is only a **recommendation** — do not roll back / toggle flags / deploy to production yourself. Remind the user to communicate with the team + open an incident, and record the timeline, logs, and error messages.

## Step 3 — Reproduce & find the root cause

- Collect evidence: **logs, stack trace, the exact failing request, timestamp, recent deploy/config diff**.
- Reproduce in a safe environment (local / staging) — do not experiment on production.
- **If mode = `chrome-devtools`:** drive Chrome through the exact user steps until the symptom appears — capture screenshot(s), console errors, and failing/4xx/5xx network requests as the evidence below. Save screenshots under `.claude/artifacts-hotfix/<slug>/`. Local/staging only; never run money-moving/destructive actions against production.
- Trace the symptom to its **true origin** (use `root-cause-tracing`). Don't stop at the first line that throws.
- State the root cause in one sentence.

## Step 4 — Write the report (final output — STOP here)

Once you have the root cause, **do NOT change code**. Write a Markdown report for the user to read and verify via the UI:

- Pick a short slug for the bug (kebab-case) and create the file: `.claude/artifacts-hotfix/<slug>/hotfix.md`.
- Minimum report contents:
  - **Symptom**: what the user sees, which feature, severity (P0/…).
  - **Reproduction**: the exact UI steps / request the user can retry themselves.
  - **Root cause**: the underlying cause, pointing to the relevant `file:line`.
  - **Evidence**: logs / stack trace / request / deploy diff that led to the conclusion. In `chrome-devtools` mode, include the captured screenshot filenames + console errors + failing requests.
  - **Proposed fix**: which file to change, what to change, scope (minimal diff), whether tests/rollback are needed.
  - **Risk & impact**: where a regression could occur.
- After writing the file: **report the path to the user and STOP.** Wait for the user to read it + run the UI to confirm the cause is correct.
- If the user says the cause is **wrong** → go back to Step 3, investigate further, and update the same `hotfix.md`.
- Once the user confirms it's correct → run `/fix-bugs <slug>` to implement the fix (separate command).

## Guardrails

- **Never** read `.env` or any `.env.*` with real secrets — only `.env.template`.
- **Do not** edit source code — `/hotfix` only investigates and writes a report.
- **Do not** deploy, rollback, or toggle production flags on your own — surface the recommendation and let the user execute.

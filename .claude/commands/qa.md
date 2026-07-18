---
description: Independent QA pass on one or more shipped slugs — black-box test from the spec, hunt bugs, write a bug report (NOT dev unit-testing)
argument-hint: "[slug ...]"
---

# QA: $ARGUMENTS

Act as a **real-world tester (QA)**, independent from the developer. You did NOT write this code. Your job is to verify the product does what the **user** needs — and to actively try to break it — using the spec as the source of truth, not the implementation.

> **Workflow:** `/create` → `/ship` -> `/reivew-ship` → **`/qa`**
>
> **How this differs from `/ship`:** `/ship` is the developer unit-testing their own code (white-box, `*.spec.ts`, `Verify:` commands). `/qa` is black-box: you test from the PRD/user story, cover negative/boundary/regression cases, and produce a **bug report with reproduction steps** — the things a dev testing their own work systematically misses.
>
> **MINIMAL DIFF (per `.claude/CLAUDE.md`):** if you touch any source to add a temp spec, change only what's needed; never reflow/split/join lines, no `;`, no quote-style changes, no formatters. Temp `*.spec.ts` files are throwaway — delete them once green (see Phase 3).

## The QA Mindset (read first)

- **Independent:** Build your test scenarios from `spec.md` / `test-cases.md` / user story **before** reading implementation. Do not let the code tell you what "correct" is — the spec does.
- **Adversarial:** Assume it's broken until proven otherwise. Empty input, wrong type, negative/huge numbers, missing permission, double-submit, wrong order state, refund twice, expired session, unicode/emoji, very long strings, back-button mid-flow.
- **User-first:** A task that "passes its unit tests" but is confusing, mis-localized, or breaks a neighboring feature is still a FAIL.
- **Evidence-based:** Every bug needs concrete reproduction steps + expected vs actual. No repro = not a report yet.

## Phase 1: Load Target(s)

`$ARGUMENTS` may be **zero, one, or many** slugs (space-separated) — a big feature is often split into several sub-task slugs.

1. Resolve the slug list:
   - If `$ARGUMENTS` has one or more slugs → use all of them, in the given order.
   - If empty → use the single active slug (`cat .claude/artifacts/.active`).
2. For **each** slug (each identifier is a `<tag>/<slug>` path), read from `.claude/artifacts/<tag>/<slug>/`: `spec.md` (required), `test-cases.md` (if present), `prd.json`, `progress.md`.
   - If a slug has no folder or no `spec.md` → report it as **skipped (not shipped)** and continue with the rest; if *none* are valid, stop and tell the user to run `/create` + `/ship` first.
3. For each valid slug, determine its layer(s): **BE** (`be/*`), **FE** (`BEXMP-storefront` / `BEXMP-admin`), or **Both**.
4. **Treat the slug set as ONE feature under test.** Note where slugs overlap — shared services, shared files, or a flow that spans several slugs (e.g. one slug creates an order, another refunds it). These seams are the highest-risk area and get dedicated cross-slug scenarios in Phase 2.
5. **Choose the FE test mode** (ask the user, or read `--browser` / `--static` from `$ARGUMENTS`):
   - **`static`** (default) — verify FE statically + emit a manual checklist for the human (Phase 3 FE, static path).
   - **`chrome-devtools`** — actually **drive Chrome** to run the FE scenarios yourself (best for real E2E: click through the flow, assert on-screen). If chosen, load `browser-testing-with-devtools` + `chrome-devtools`; you'll need a base URL and a **test account** from the user (never read `.env`). BE scenarios still run as specs regardless of mode.

## Phase 2: Design Test Charter (spec-first, no code yet)

From the spec + user story only, enumerate scenarios grouped by technique. Write them to `.claude/artifacts/<tag>/<slug>/qa-charter.md`:

- **Happy path** — the main user journeys stated in the spec.
- **Boundary** — min/max, empty, first/last, off-by-one, zero, limits.
- **Negative / invalid** — bad input, wrong type, missing required, malformed payload.
- **Permission / security** — unauthenticated, wrong role, accessing another user's resource.
- **State / flow** — wrong order/auction/disposal state, out-of-order steps, retries, double actions (e.g. pay twice, refund twice).
- **Regression** — nearby existing features that share files/services with this change: did they break? List them explicitly.
- **Cross-slug integration (when >1 slug)** — scenarios that chain slugs together end-to-end (output of slug A feeds slug B), and conflicts where two slugs touch the same file/service/state. This is the seam that per-slug `/ship` testing never covered — give it the most attention.
- **Localization (FE only)** — every user-facing string present in all required languages (storefront: `en/jp/cn/tw`; admin: `en/ja`). A missing/untranslated key = a bug.

Each scenario: `ID | Slug(s) | Precondition | Steps | Expected result | Technique`.

**Where to write the charter:** if a single slug → `.claude/artifacts/<tag>/<slug>/qa-charter.md`. If multiple slugs → write a combined charter to the **first** slug's folder and note at the top which slugs it covers.

## Phase 3: Execute

### BE (`be/*`) — automated integration specs

- Write a **temporary** `*.spec.ts` that exercises the **full service flow** for the scenarios above (not just one function) — include the negative/boundary/state cases, not only happy path.
- Run ONLY via the allowed runner: `npm run test .../src/services/<file>.spec.ts`. Do NOT run `build`/`lint`/`yarn test`, do NOT drive any GUI or external tool (per `.claude/CLAUDE.md` BE Test Loop).
- Loop: FAIL ≥1 case → file a bug (Phase 4) → the fix belongs to the dev, but if it's a clear defect you may fix minimally and re-run. **Max 3 iterations**; still failing → stop and report.
- **PASS all → DELETE the temp `*.spec.ts`** (do not leave it, do not commit it). FAIL → keep it so the dev can reproduce.

> Note: `be/*` specs need a throwaway jest config with `moduleNameMapper` for path aliases — see memory `be-jest-alias-temp-config`. That config is temporary too; remove it when done.

### FE (storefront / admin)

Follow the mode chosen in Phase 1:

**Static mode (default) — manual checklist for the human**

- Emit a **numbered manual test checklist** the user can click through, one line per step with the exact expected result.
- Where you CAN verify statically, do so and record evidence: localization keys exist in every language file, the component is actually wired (import + used), handler is not a no-op stub, empty/loading/error states exist.
- Mark each FE scenario as `[auto-verified]`, `[needs-human]`, or `[FAIL]`.

**chrome-devtools mode — drive the browser yourself**

- **Open a REAL, VISIBLE Chrome window — NOT headless** so the user can watch the scenarios run. Launch it headed: `const browser = await chromium.launch({ headless: false, slowMo: 800, channel: 'chrome' })` (use `channel: 'chrome'`, `slowMo` ~600–900ms so each action is visible; fall back to bundled chromium only if the `chrome` channel is missing).
- Boot the app locally (or use the URL the user gave), then walk each FE scenario in Chrome: navigate, click, type, and assert the on-screen result against the spec.
- Capture evidence per scenario: screenshot, console errors, failing/4xx/5xx requests. Save screenshots under the charter folder.
- Mark each FE scenario `[auto-verified]` (passed in-browser), `[needs-human]` (couldn't safely drive it — e.g. needs real payment), or `[FAIL]` (repro'd a bug → Phase 4).
- Local/staging only; never run money-moving/destructive flows against production, and never read `.env` (ask the user for a test account).

## Phase 4: Bug Report

Write findings to `qa-report.md` in the same folder as the charter (single slug → its folder; multiple → the first slug's folder). One entry per bug:

```markdown
### BUG-001 — <short title>
- **Severity:** Critical | Major | Minor
- **Slug(s):** <which sub-task(s) — or "cross-slug" if it only breaks when combined>
- **Scenario:** <charter ID>
- **Reproduction:**
  1. <step>
  2. <step>
- **Expected:** <what the spec says should happen>
- **Actual:** <what happened>
- **Evidence:** <spec run output / file:line / missing i18n key>
- **Status:** Open
```

**Severity guide:** Critical = data loss / money wrong / flow blocked / security; Major = feature wrong but has a workaround; Minor = cosmetic, copy, non-blocking.

## Phase 5: Verdict

Report to the user:

1. **Per-slug verdict:** a table `slug | layer | ✅ PASS / ❌ FAIL / ⏭ skipped` — one row per slug so you see exactly which sub-task is red.
2. **Overall verdict:** ✅ PASS (shippable) or ❌ FAIL (return to dev) — FAIL if **any** slug or any cross-slug scenario has an Open Critical/Major.
3. **Coverage:** scenarios run / total, by technique (happy / boundary / negative / permission / state / regression / **cross-slug** / i18n).
4. **BE:** spec cases pass/fail per slug; confirm temp specs + temp jest config deleted (on full pass).
5. **FE:** manual checklist location + count of `[needs-human]` steps the user must click.
6. **Bugs:** counts by severity, with the top Critical/Major inline; flag which are **cross-slug** (only break when combined).
7. **Next step:** if FAIL → `/fix-bugs <slug>` on the specific red slug(s), or hand the bug list to the dev; if PASS → clear to close/PR.

Record significant QA learnings (recurring defect patterns) to memory.

## Related Commands

| Need                     | Command            |
| ------------------------ | ------------------ |
| Create spec              | `/create`          |
| Implement (dev)          | `/ship`            |
| Fix a bug QA found       | `/fix-bugs <slug>` |
| Investigate a prod bug   | `/hotfix`          |
| Drive Chrome for a flow  | `/repro`           |

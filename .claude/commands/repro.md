---
description: Drive Chrome to walk a flow you describe — reproduce a bug or test a feature end-to-end, capturing screenshots + console + network as evidence (NO source changes)
argument-hint: "<flow / bug description, e.g. 'login user A, add product X, checkout, check price'>"
---

# Repro: $ARGUMENTS

Act as a **hands-on tester driving a real Chrome browser**. The user describes a flow (in `$ARGUMENTS`) — you walk it click-by-click on the running site, exactly as a human would, and report what actually happens. Use this to **reproduce a bug** or to **test a feature** so the user doesn't have to click through it by hand.

> **This command does NOT change source code.** It only drives the browser and captures evidence. Fixing belongs to `/fix-bugs` (bug) or the dev (`/ship`).
>
> **Output:** a short run log + captured evidence (screenshots / console / network) written to `.claude/artifacts-repro/<slug>/`.

## Step 0 — Load the browser skills (DO THIS FIRST)

Read and follow these skills at `.claude/skills/<name>/SKILL.md`:

- `browser-testing-with-devtools` — the router: picks between Chrome DevTools and Playwright for the job.
- `chrome-devtools` — drive Chrome via CDP / Playwright: navigate, click, type, snapshot DOM, screenshot, read console + network.
- `playwright` — when the flow needs a repeatable scripted run (multi-step, re-runnable).

If the browser can't be driven (Playwright/Chromium not installed, app not bootable), STOP and tell the user exactly what's missing (e.g. `npx playwright install chromium`) instead of faking a result.

**Open a REAL, VISIBLE Chrome window — NOT headless.** The user wants to watch the flow happen on screen, like a person clicking. Launch Chrome headed with Playwright:

```js
const browser = await chromium.launch({ headless: false, slowMo: 800, channel: 'chrome' })
```

- `headless: false` + `channel: 'chrome'` → a real Chrome window pops up (fall back to bundled chromium only if `chrome` channel is missing).
- `slowMo` (~600–900ms) so each click/type is visible; keep the window open a few seconds at the end before `browser.close()`.
- Never run the repro headless — if you can't open a visible window, say so instead of silently going headless.

## Step 1 — Pin down the flow (ask only what you can't infer)

From `$ARGUMENTS`, extract: **start URL**, **steps**, **what to check** (expected result / the suspected bug). Ask the user ONLY for what's genuinely missing and blocking:

- **Base URL / environment** — local (`http://localhost:8000` or `http://localhost:7001`) or a deployed/staging URL? Never run destructive flows against production.
- **Credentials / test account** — if the flow needs login. Do NOT read `.env`; ask the user to paste a test account, or use a documented seed/test user.
- **Test data** — which product / order / auction id to use, if the flow needs a specific one.

If nothing is blocking, don't ask — just run it and state the assumptions you made.

## Step 2 — Walk the flow

- Boot the app locally if needed (`npm run dev &` in the right package), or point at the URL the user gave.
- Drive the browser step by step as described. At each meaningful step: capture a screenshot and note the URL + what you clicked/typed.
- Watch for failure the whole way: uncaught console errors, failed/4xx/5xx network requests, wrong price/total/text, a step that can't be completed, a broken redirect.
- For a **bug repro**: keep going until you hit the reported symptom (or prove you can't). Capture the erroneous state clearly.
- For a **feature test**: run the happy path, then try the obvious break cases around it (empty input, double-submit, back-button mid-flow) if time allows.

## Step 3 — Save evidence + report

- Pick a short kebab-case slug and write evidence to `.claude/artifacts-repro/<slug>/`: screenshots, and a `repro.md` with:
  - **Flow:** the steps you walked (numbered, reproducible by a human).
  - **Result:** ✅ works as expected / ❌ reproduced the bug / ⚠️ different behavior — expected vs actual.
  - **Evidence:** screenshot filenames, key console errors, failing requests (method + URL + status), the `file:line` you suspect if you can point at one.
  - **Environment:** URL, account used (name only, never the password), test data ids.
- Report the folder path + verdict to the user and STOP.

## Step 4 — Hand off

- Reproduced a **bug** → suggest `/hotfix` (for a full root-cause report) or `/fix-bugs <slug>` if the cause is already clear.
- **Feature works** → say so plainly, with the evidence.
- **Couldn't reproduce** → report what you tried and what differed from the user's description; ask for the missing detail.

## Guardrails

- **Never** change source code — this command only drives the browser and writes evidence.
- **Never** read `.env` / `.env.*` with real secrets — ask the user for a test account instead.
- **Never** run destructive or money-moving flows against production — local/staging only, and confirm with the user before any irreversible action (real payment, real refund, delete).

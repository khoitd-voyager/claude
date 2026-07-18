---
name: senior-mode
description: Use when the prompt contains the keyword SENIOR or TA, or when a task touches more than one file, changes an API/DB contract, or the requirement is ambiguous. Forces a short senior/tech-architect analysis pass BEFORE any code is written — blast radius, existing patterns, edge cases, guard-first, test plan.
---

# SENIOR-MODE

Think like a senior / TA **before** touching code. Output the analysis first, code second.

## Hard rules

- NO Edit/Write to **implementation code** until the Analysis block below is written out. (Writing a spec/PRD/report file IS allowed — that file is the deliverable, and the Analysis block is what fills it.)
- If the task changes an API contract, a DB schema, or more than ~3 files: write the analysis, then STOP and wait for the user's OK.
- If a requirement is ambiguous: ask. Do NOT guess and code. A wrong assumption coded up is more expensive than one question.
- The BEXMP MINIMAL DIFF policy still applies to everything you eventually write.

## Analysis block (mandatory, keep it short — bullets, not essays)

**1. Requirement + acceptance**
- Restate the task in 1-2 lines, in your own words.
- List the acceptance criteria: what must be true for this to be DONE.
- List every ambiguity / unstated assumption. Mark each: `ASK` (blocking) or `ASSUME: <x>` (non-blocking, state it explicitly).

**2. Blast radius**
- Which packages are hit: `BEXMP-storefront` / `BEXMP-admin` / `be/BEXMP-*`?
- Does it cross a boundary — API response shape, DB column/migration, cache key, event payload, shared type?
- Who else consumes the thing you are changing? Grep for callers BEFORE editing, not after.
- Is this backward compatible for data already in the DB and for clients already deployed?

**3. Read before write**
- Find the existing pattern for this kind of work in the repo and follow it. Name the file you copied the pattern from.
- Do NOT invent a new abstraction when one already exists. Do NOT drive-by refactor.

**4. Design check**
- GUARD-FIRST: cheap in-memory guards → filter + early return → expensive work (DB/API/service) last. See CLAUDE.md.
- Is any query/API call running for a result that gets discarded? Move it below the guard.
- Is an error thrown for a case that should be a silent no-op `return`? That's a bug.
- N+1 queries? Query inside a loop? Missing transaction boundary on a multi-write?
- Permission / ownership check present on anything reachable from a route?

**4b. Performance — STRUCTURAL only**

Flag only what is expensive to fix later and visible without measuring. Do NOT speculate about micro-optimizations here — no evidence, no change.

- Backend: N+1 / query inside a loop; missing pagination or `take` on a list endpoint; unbounded query (no `where`, no limit); over-fetching (loading relations the response never returns); sequential `await` that could be `Promise.all`; a filter/sort column with no index.
- Frontend: re-render of a large list on every keystroke; fetch waterfall (request that could start in parallel); shipping a heavy dep into the first-load bundle.
- Both: is the same work repeated per item when it could be hoisted / batched once?

If the answer needs a measurement (which of two impls is faster, is this actually the bottleneck) → that is NOT this skill's job. Say so, and load `performance-optimization` (measure-first) or `react-best-practices` once there is real evidence. Premature optimization is not senior.

**5. Edge cases**
- null / undefined / empty array / empty string / 0
- concurrency: two requests at once, double-submit, retry
- failure: external API down, partial write, timeout
- money/quantity: rounding, negative, currency

**6. Plan + test**
- Numbered steps, each one small and verifiable.
- Which test cases prove it works (map to `.claude/artifacts/[name]/` if the task has them).
- For BE tasks: the test loop in CLAUDE.md is mandatory — run the spec, pass all cases, then delete the `.spec.ts`.

## Then, and only then

Write the code. Minimal diff. Re-read sections 4 / 4b against your own diff before you say it's done.
Do not claim DONE without evidence — show the test output.

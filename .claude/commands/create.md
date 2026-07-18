---
description: Create a specification with PRD, tasks, and workspace setup
argument-hint: "<tag> <description>"
---

# Create: $ARGUMENTS

Create a specification (PRD), set up workspace, and define executable tasks — ready for `/ship`.

> **Workflow:** **`/create`** → (user reads + verifies via the UI) → `/ship` → `/qa`

## Parse Arguments

| Argument        | Default       | Description                               |
| --------------- | ------------- | ----------------------------------------- |
| `<tag>`         | ask if absent | Index/group tag for the feature (e.g. JIRA ticket / shared task code) |
| `<description>` | required      | What to build/fix (quoted string)         |

## Determine Input Type

| Input Type  | Detection            | Action                        |
| ----------- | -------------------- | ----------------------------- |
| Quoted text | `"description here"` | Create PRD from description   |
| Short form  | Simple string        | Ask for more detail if needed |

## Before You Create

- **Be certain**: Only create specs you're confident have clear scope
- **Don't over-spec**: If the description is vague, ask clarifying questions first
- **Check duplicates**: Always check for existing work
- **No implementation**: This command creates specs and workspace — don't write implementation code
- **Verify PRD**: Before saving, verify all sections are filled (no placeholders)
- **Flag uncertainty**: Use `[NEEDS CLARIFICATION]` markers for unknowns — never guess silently

## Available Tools

| Tool                       | Use When                                          |
| -------------------------- | ------------------------------------------------- |
| Read / Grep / Glob         | Finding patterns in codebase, affected files      |
| `Explore` subagent         | Broad fan-out searches across many files/dirs     |
| `WebSearch` / `WebFetch`   | External research, best practices, docs           |

## Skills to Load

The project ships a skill library at `.claude/skills/<name>/SKILL.md`. To load a skill, **Read that file** and follow it. Load only the skills relevant to the current task — do not load everything.

**Always relevant to `/create`:**

- `senior-mode` — MANDATORY, load FIRST: senior/TA analysis pass (requirement + acceptance, blast radius, edge cases) before any spec is written. Every `ASK` it surfaces becomes a `[NEEDS CLARIFICATION]` marker or a question to the user — never a silent guess.
- `spec-driven-development` — turning a request into a concrete spec (Phases 6-8)
- `planning-and-task-breakdown` — decomposing the spec into verifiable tasks (Phase 10)

**If Phase 2 chose Backend (BE):**

- `api-and-interface-design` — API / module boundary design
- `test-driven-development` + `testing-anti-patterns` — when creating test cases (Phase 2)
- `security-and-hardening` — auth, input validation, secrets
- `core-data-expert` — data modeling / query design (Medusa + TypeORM/Postgres)

**If Phase 2 chose Frontend (FE):**

- `frontend-design` — base UI implementation (React/Tailwind/shadcn)
- `react-best-practices` — React/Next.js performance
- `accessibility-audit` — a11y checks
- `figma` / `mockup-to-code` — only if the user shares a design/mockup

**🌐 Localization — REQUIRED whenever Phase 2 includes FE (do NOT skip this):**

Any FE work that adds or changes user-facing text MUST be localized. Never hardcode a UI string in one language. Add a translation key for **every** supported language of the target app:

- **Storefront (`BEXMP-storefront`)** — localize **all 4 languages**. Add the key to each file in `src/lib/lang/`: `en.ts` (English), `jp.ts` (Japanese), `cn.ts` (Chinese Simplified), `tw.ts` (Chinese Traditional). Registry: `src/lib/lang/index.ts`.
- **Admin (`BEXMP-admin`)** — localize **2 languages: English + Japanese**. Add the key to `ui/public/locales/en/*.json` and `ui/public/locales/ja/*.json` (same namespace/key path in both).

When creating tasks in Phase 7, add an explicit `[i18n]` task listing the exact files above and requiring the same key set in every language file (no missing keys, no untranslated placeholders left in the non-English files).

**Workflow support (as needed):**

- `using-git-worktrees` — when offering the worktree option (Phase 9)
- `git-workflow-and-versioning` — branch/commit hygiene (Phase 9)
- `brainstorming` / `grill-me` — when the description is vague and needs shaping (Phase 4)

Browse the full catalog under `.claude/skills/` if a more specific skill fits the task.

## Phase 1: Duplicate Check

### Memory Search

Search memory for: prior decisions, similar work.

### Existing Work Check

Check `.claude/artifacts/.active` for existing work in progress. If active slug exists with a `spec.md`, ask user if they want to continue with `/ship` instead.

## Phase 2: Scope Questions — ASK ONCE

Before any research or writing the PRD, **STOP and ASK the user** in a **single `AskUserQuestion` call** (batch the questions below, don't ask one at a time). Do not guess. Do not continue until answered.

**Question 1 — Layer (always):**

- **Backend (BE)** — API, database, business logic, services, server-side
- **Frontend (FE)** — UI, components, screens, client-side
- **Both (BE + FE)** — if chosen, add a **Question 1b**: which layer to do first? (BE first / FE first)

**Question 2 — Test cases (batch now, apply only if BE or Both):**

- **Create test cases** — generate a test-case file in the active artifacts folder
- **Skip test cases** — no test file

**Question 3 — Figma (batch now, apply only if FE or Both):**

- **Yes, I have Figma** — user will share a Figma link
- **No Figma** — proceed without a design source

**After the answers:** ignore any answer not relevant to the chosen layer (Figma if BE-only, test cases if FE-only). Then:

- Use the layer to focus Phase 4 research, group/order PRD tasks by layer (respect "which first"), and tag each task in Phase 7 (`[BE]` / `[FE]`).
- If **Create test cases**: write `.claude/artifacts/$(cat .claude/artifacts/.active)/test-cases.md` with cases derived from the description/scope (happy path, edge cases, error handling for BE logic); reference them later in the PRD's Tasks and Success Criteria.
- If **Yes, I have Figma** and a link is shared: **load the figma skill** — Read `.claude/skills/figma/SKILL.md` and follow it (extract `fileKey` / `nodeId` from the URL, fetch design data via `skill_mcp`). Use the extracted layout/tokens as the design source for the FE tasks.

## Phase 3: Choose Research Depth

Before spawning agents, **ASK the user** how much codebase research they need. Do not continue until answered.

Ask with these options:

- **Deep** (recommended for complex work) — 3-5 agents: patterns, tests, deps, best practices (~2 min)
- **Standard** — 2 agents: patterns + tests (~1 min)
- **Minimal** — 1 agent: quick file scan (~30 sec)
- **Skip** — I know the codebase, use existing knowledge

## Phase 4: Gather Context

Do the research myself, scaling effort to the chosen depth. Focus on the layer(s) chosen in Phase 2 (BE / FE / both). Only spawn `Explore` subagents when the search is broad enough to be worth fanning out — otherwise just read/search directly.

**If Deep:**

- Explore code patterns, tests, and dependencies for the relevant layer(s) — spawn `Explore` subagents for broad sweeps if needed
- Do external research (best practices, docs) with `WebSearch` / `WebFetch` when relevant

**If Standard:**

- Explore code patterns and tests for the relevant layer(s) — read/search directly, spawn `Explore` only if the search is large

**If Minimal:**

- Quick scan of the main files/patterns for the relevant layer — do it directly, no subagents

**If Skip:**

- No research, use existing knowledge and CLAUDE.md context

**Alongside research**, ask clarifying questions if the description lacks scope or expected outcome. For bugs, also ask for reproduction steps and expected vs actual behavior.

## Phase 5: Initialize Plan

Extract title and description from `$ARGUMENTS`:

- If user provided a single line, use it for both title and description.
- If user provided multiple lines, use first line as title and full text as description.

Determine the **tag** (index/group). If a tag was passed in `$ARGUMENTS`, use it; otherwise **ask the user** for it (e.g. JIRA ticket / shared task code) before creating any folder — never guess it.

Derive a kebab-case slug from the title. The tag groups the feature; the slug is the sub-task namespace under it:

```bash
TAG=$(echo "$TAG_INPUT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//')
mkdir -p ".claude/artifacts/$TAG/$SLUG"
echo "$TAG/$SLUG" > ".claude/artifacts/.active"
```

## Phase 6: Determine PRD Rigor

Not every change needs a full spec. Assess complexity to choose the right PRD level:

| Signal | Lite PRD | Full PRD |
| --- | --- | --- |
| Scope | Simple, single-concern | Cross-cutting, multi-system |
| Files affected | 1-3 | 4+ |
| Research depth | Skip or Minimal | Standard or Deep |
| Description | "Fix X in Y" | "Implement X with Y and Z" |

**Auto-detect:** If research was Skip/Minimal AND description is a single sentence → default to Lite.

### Lite PRD Format

For simple, well-scoped work (bugs, small tasks):

```markdown
# [Title]

## Problem
[1-2 sentences: what's wrong or what's needed]

## Solution
[1-2 sentences: what to do]

## Affected Files
- `src/path/to/file.ts`

## Tasks
- [ ] [Task description] → Verify: `[command]`

## Success Criteria
- Verify: `npm run typecheck && npm run lint`
- Verify: `[specific test or check]`
```

### Full PRD Format

For features and complex work, use the full template:

Read the PRD template and write it to the active feature's spec (`.claude/artifacts/$(cat .claude/artifacts/.active)/spec.md`).

## Phase 7: Write PRD

Copy and fill the PRD template (lite or full) using context from Phase 4.

**If Lite PRD:** Fill the lite format directly. No template file needed.

**If Full PRD:** Read the template and fill all required sections:

| Section           | Source                                                     | Required          |
| ----------------- | ---------------------------------------------------------- | ----------------- |
| Problem Statement | User description + clarifying questions                    | Always            |
| Scope (In/Out)    | User input + codebase exploration                          | Always            |
| Proposed Solution | Codebase patterns + user intent                            | Always            |
| Success Criteria  | User verification + test commands (must include `Verify:`) | Always            |
| Technical Context | Explore agent findings                                     | Always            |
| Affected Files    | Explore agent findings (real paths from Phase 4)           | Always            |
| Tasks             | Derived from scope + solution                              | Always            |
| Risks             | Codebase exploration                                       | Feature/epic only |
| Open Questions    | Unresolved items from Phase 4                              | If any exist      |

### Task Format

Tasks must follow this format:

- Title with `[category]` tag
- One-sentence **end state** description (not step-by-step)
- Metadata block: `depends_on`, `parallel`, `conflicts_with`, `files`
- At least one verification command per task

## Phase 8: Validate PRD

Before saving, verify:

- [ ] No placeholder text remains (e.g., "[Clear description", "[List what's allowed]")
- [ ] Success criteria include `Verify:` commands
- [ ] Technical context references actual `src/` paths from exploration
- [ ] Affected files list real paths
- [ ] Tasks have `[category]` headings
- [ ] Each task has verification
- [ ] If FE with user-facing text: an `[i18n]` task exists covering all languages (storefront: `en/jp/cn/tw`; admin: `en/ja`)
- [ ] No implementation code in the PRD
- [ ] No unresolved `[NEEDS CLARIFICATION]` markers remain (convert to Open Questions or resolve)

If any check fails, fix it — don't ask the user.

## Phase 9: Prepare Workspace

### Workspace Check

```bash
git status --porcelain
git branch --show-current
```

- If uncommitted changes: ask user to stash, commit, or continue

### Create Branch

### Workspace Setup

Set up the workspace: create branch, install deps if needed.

Additionally, offer the user a **"Create worktree"** option. If chosen, set up a git worktree for the branch (isolated copy of the repo) instead of switching branches in place.

## Phase 10: Convert PRD to Tasks

Convert PRD markdown → executable JSON (`prd.json`).

## Phase 11: Report

Output:

1. Summary: task count, success criteria count, affected files count
2. Branch name and workspace (if claimed)
3. Active feature: `.claude/artifacts/$(cat .claude/artifacts/.active)/`
4. Next step: `/ship`

---

## Related Commands

| Need               | Command      |
| ------------------ | ------------ |
| Implement and ship | `/ship`      |
| Investigate a bug  | `/hotfix`    |

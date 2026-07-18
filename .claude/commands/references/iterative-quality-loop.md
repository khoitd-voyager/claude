# Iterative Quality Loop Mode

Score-gated feedback loop for high-risk features. Replaces the standard parallel review (in `/ship` Phase 5) with a structured iteration cycle. Enter this only when Mode Selection routes here; apply the UI Quality Gate first (before entering the loop), then run the scored loop flow below.

## Setup

Initialize loop state:

```bash
SLUG=$(cat .claude/artifacts/.active)
cat > ".claude/artifacts/$SLUG/review-state.json" << EOF
{
  "slug": "$SLUG",
  "rounds": 0,
  "maxRounds": 5,
  "lastScore": 0,
  "sameScoreCount": 0,
  "findingsResolved": 0,
  "findingsRemaining": 0,
  "status": "active"
}
EOF
```

## Loop

Repeat steps 2-8 until exit or escalation:

| Step | Action |
|---|---|
| **1. EXECUTE** | Implement per spec/plan (already done in Phase 3) |
| **2. REVIEW** | Spawn **one review-focused subagent** via `Agent` (`subagent_type: "general-purpose"`) with spec + current diff + `review-state.json`. Returns: score (X/5), findings array (severity + file:line + suggestion), suggested next action |
| **3. GATE** | Score ≥ 5 → mark done (`status: "passed"`), exit loop, proceed to Goal-Backward Verification. Score 4 → ask user if they want to proceed or loop. Score <4 → continue |
| **4. STALL?** | If `sameScoreCount ≥ 2` → escalate: surface accumulated findings, present to user with a recommendation |
| **5. MAX?** | If `rounds ≥ maxRounds` → escalate with full finding log |
| **6. FILTER** | Split findings into categories and handle each: |
| | • **Actionable** (code-level, clear fix) → proceed to fix |
| | • **Informational** (note, no code change) → log to progress.md with `[info]` |
| | • **Architecture/Design** → stop loop, present to user for decision |
| **7. FIX** | For each actionable finding, spawn a fix subagent with the exact file:line and suggested fix. Run sequentially for same-file findings, parallel for different files |
| **8. RE-REVIEW** | Update `review-state.json`: increment rounds, update score, reset/resolve findings. Go to step 2 |

## Loop State Updates

After each round, update `review-state.json`:

**`sameScoreCount` rule:**
- If new score === `lastScore` → increment `sameScoreCount`
- If new score !== `lastScore` → reset `sameScoreCount` to 0

**Example after round 1 (score: 3):**

```json
{
  "rounds": 1,
  "lastScore": 3,
  "sameScoreCount": 0,
  "findingsResolved": 2,
  "findingsRemaining": 1,
  "status": "active"
}
```

**Status transitions:**

- Stall detected (`sameScoreCount ≥ 2`) → `status: "stalled"`, append accumulated findings to progress.md
- Max rounds reached → `status: "maxed"`, append full finding log to progress.md
- Pass (score ≥ 5) → `status: "passed"`, proceed to Goal-Backward Verification

## Review Subagent Prompt

When spawning, include:

- The original spec/slug
- The current diff (all changed files since the start of Phase 3)
- The current `review-state.json`
- Return format: `{ score: number, findings: Array<{severity:"critical"|"important"|"minor", file:string, line:number, suggestion:string, type:"actionable"|"informational"|"architecture"}>, nextAction: string }`

## Exit Conditions

| Condition | Action |
|---|---|
| Score ≥ 5 | Proceed to Goal-Backward Verification |
| User approves score 4 | Proceed to Goal-Backward Verification |
| Architecture finding | Stop, present options to user |
| Stalled (same score 2x) | Escalate with accumulated findings |
| Max rounds | Escalate with full finding log |

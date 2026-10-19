# Self-healing on user correction

A user correction is evidence of a missing or wrong rule. Capture every one; promote few.

## Protocol

1. Classify: restate the correction as an operational rule in one sentence. Confirm its scope with the user if unclear (this task, this project, everywhere).
2. Capture: record correction, scope, evidence, outcome in the active `_TASK-LOG/` entry (or the backlog task if no repo task). Capture happens whether or not the rule is promoted.
3. Gate: decide promotion.
   - Promote now: the failure was dangerous, destructive, privacy-sensitive, or costly.
   - Promote after recurrence: the same failure has appeared more than once and a short rule would prevent it.
   - Do not promote: task-specific, ambiguous, or thinly evidenced. Keep the capture only.
4. Route to the smallest scope that holds:
   - rule for one repo: that repo's `AGENTS.md`
   - rule for one domain: the domain `AGENTS.md`
   - repeated workflow: the skill that owns the workflow
   - hard-to-reverse policy: an ADR
   - rule for all projects: the global instruction file (skill `global-agent-instructions`)
5. Edit: telegraph style; inspect the nearest existing rules first; replace, narrow or delete an overlapping rule rather than adding. Retire stale rules.
6. Verify: no duplicate or contradicting rule remains; every path, tool and condition named still exists. Run the check for that file (skill `agents-md-streamline`).
7. Commit with prefix `self-healing:` so the trail is searchable. Tell the user in one line what changed and where.

## Rules

- No default rule edit: most corrections stay as captures.
- Rationale and dates go in the task log or ADR, not in the live rule.
- Do not copy one rule into several repos; put it at the shallowest shared scope and point to it.

## Failure modes

- Every correction becomes a rule: instruction files bloat and conflict.
- Rule written without capture: the evidence for later promotion is lost.
- Rule placed globally for a one-project quirk: loads in every session for no gain.

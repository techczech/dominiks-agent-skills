# Placement Rules

Read when the entrypoint does not settle placement.

## Keep Test

For each line, ask:

1. Is it needed in most work at this scope?
2. Would omission cause a material mistake?
3. Is this the closest correct layer?
4. Is it operational and current?
5. Can a short trigger replace the detail?

Keep inline only when most answers support it.

## Destinations

- Always-needed boundary or first action: current instruction file.
- Cross-project situational default: direct global reference.
- Repeated procedure: skill.
- Local procedure, template, schema, or examples: one-hop repository reference.
- Human overview, rationale, or history: `README.md`.
- Current state, blocker, or next action: task record.
- Decision evidence or chronology: decision or change record.
- Lower-frequency correction: lessons or corrections space.
- Duplicate, superseded, or self-loading instruction: delete after recording its disposition.

An ADR, handoff, changelog, or task record may preserve evidence. It must not be the only place an agent can discover a live operational rule.

## One-Hop Test

- Name the triggering situation.
- Link the exact destination from the payload or invoked skill.
- Ensure the destination exists and is readable.
- Avoid a router that only points to another router.
- Use a basename intelligible outside its folder.
- Keep one canonical copy; update inbound routes when it moves.

## Sections

Prefer:

- First move
- Commands
- Routing
- Ownership
- Constraints
- Verification

Move elsewhere:

- Background
- Purpose
- History
- Provenance
- Research takeaways
- Current status

## Order

1. Put first moves and immediate safety first.
2. Put routing and ownership next.
3. Put commands and scoped details after them.
4. End with verification or final hard constraints.

## Size

- Global or simple scope: aim under 50 lines.
- Normal repository root: 30–90 lines.
- At 90–120 lines: compress or route detail.
- Over 120 lines: split by trigger or scope.

Treat line count as a warning. Instruction load and behavioural reliability are the real tests.

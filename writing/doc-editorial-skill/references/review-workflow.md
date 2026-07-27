# Review Workflow

Voice, tone, and style review that evolves its own reference guide based on user feedback. The voice guide is a living document — each review session refines it.

## Core Interaction Pattern

1. **Read** — Load the current voice guide
2. **Scan** — Identify voice/tone issues in the target doc(s)
3. **Present** — Show findings prioritized by likely importance
4. **Ask** — User accepts, rejects, or ranks each finding
5. **Learn** — Update the voice guide based on decisions
6. **Log** — Record changes and decisions to changelog

## Inputs

- **Target**: Single doc path or "all"
- **Voice guide**: Project's voice-and-tone file (path from `editorial-config.json`)
- **Doc templates**: Project's template definitions (path from config, if available)
- **Glossary**: `editorial-workspace/glossary.json` (for audience-appropriate language)

## What to Evaluate

### Voice & Tone

- Does the writing match the voice guide's described tone?
- Is the reading level appropriate for the target audience?
- Are project conventions followed (e.g., "you" language, contractions, metaphor usage)?

### Template Compliance (if templates defined)

- Does the doc follow its assigned template structure?
- Are expected sections present?

### Progressive Disclosure

- Are concepts introduced simply before being elaborated?
- Does complexity build gradually?

### Jargon Handling

- Is technical language explained on first use?
- Are terms linked to their canonical definitions?

### Readability

- Sentence length (flag paragraphs averaging >25 words per sentence)
- Passive voice density
- Paragraph length (flag >4 sentences without a break)

### Tone Calibration

- Encouraging without being patronizing?
- Honest about difficulty without being discouraging?

## Presenting Findings

Prioritize findings by likely impact. Start with what seems most important — the user's accept/reject responses will calibrate future priorities.

For each finding, show:
- The specific passage (with doc name and approximate location)
- What the issue is
- A suggested revision (when applicable)

Group by: Critical tone issues → Structural gaps → Polish suggestions.

## The Feedback Loop

After presenting findings, ask the user to:
1. **Accept** findings they agree with (these confirm the voice guide's priorities)
2. **Reject** findings they disagree with (these indicate the voice guide needs adjustment)
3. **Rank** which categories of issues matter most to them

Then update the voice guide:
- If a rejected finding contradicts the current guide → add a note/exception to the guide
- If accepted findings reveal a pattern not in the guide → add the pattern
- If the user ranks categories → reorder or emphasize priorities in the guide
- Add a dated note at the bottom of the guide summarizing what was learned

## Output

- Write report to `editorial-workspace/audit-reports/review-YYYY-MM-DD.md`
- Update the voice guide based on user decisions
- Append entry to `editorial-workspace/changelog.jsonl`
- Present findings inline, never auto-fix without approval

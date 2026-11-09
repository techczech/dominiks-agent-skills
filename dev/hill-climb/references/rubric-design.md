# Rubric design

## Sources of criteria

- Human signal (`source: human`): the owner's stated wants, past corrections, earlier review answers, house rules, "it all looks too grey". Keep their words in `human_signal`; turn each into a criterion, an anchor or a hard check.
- Comparators: "should beat two competitor apps" is a criterion and a panel member, not prose.
- Derived (`source: derived`): ask one judge, with the comparators and no target, "what separates the best of these from the worst?" Add what is missing. This is where the bitter-lesson gain comes from: criteria the owner would never have written.
- Programmatic (`source: programmatic`): any measurable proxy. Record direction (higher/lower better) and unit.

## Measured vs judged

Anything countable is a hard check or metric, never a judged criterion: word limit, banned-phrase count, page weight, test pass rate. The judged criterion is the quality behind the limit. Example: "main text ≤ 6,000 words" is a check; "economy: every paragraph earns its place, nothing repeats" is judged. Mixing them lets a judge trade one against the other and hides a failed limit inside an 8.

## Shape

- Scale 1–10 for judged criteria (decimals allowed). 1–5 for quick decision scoring is fine; state it.
- 5–8 criteria for climbs; 3–6 for decisions. More criteria spread judge attention thin.
- Each criterion: id, name, one-line description, anchors for 3 / 6 / 9, optional weight.
- Hard checks: pass/fail items that block the stop rule regardless of scores (e.g. "every key user path has a working way back", "no test regresses", "fits the 1000 px window").
- Overall: either judge's holistic score or weighted mean; say which.

## Locked decisions

Owner choices, cuts and approved passages: list them in `rubric.locked` and in the packet under "Owner decisions: do not deduct". Judges may list disagreements as "owner decisions to revisit"; those never lower a score.

## Checklist items

Optional per criterion: 2–4 yes/no items (e.g. "Primary action visible without scrolling at 1000 px"), each answered with a quote or location. They cut variance and make findings actionable.

## Judge packet

1. What the thing is for and who uses it (one paragraph).
2. The rubric with anchors.
3. The artefacts: screenshots, text, options. Label candidate and comparators neutrally (A/B/C), random order per round.
4. Ask for, for every subject (candidate and each comparator): score per criterion, overall, one-line reason per criterion; then the defects holding the candidate below the top of the scale, worst first, and top 3 concrete changes. JSON reply, e.g. `{"scores": {"A": {"typography": 9.3, ..., "overall": 9.3}, "B": {...}}, "reasons": {...}, "defects": [...], "changes": [...]}`. Reject and re-ask a reply that gives only an overall.
5. Also ask one seat for a pairwise verdict: previous vs current version, unlabelled, random order: which is better and why.
6. Omit: target, threshold, round number, earlier scores, builder notes, model or author names.

## Changing the rubric mid-run

Allowed when the owner adds signal or a criterion proves meaningless. Bump `rubric.version`, add a `rubric.changes` entry with round and reason. Scores across versions are not directly comparable; the report marks the break.

## Example criteria sets

- UI: hierarchy, typography, colour and contrast, iconography, spacing and density, consistency across surfaces, clarity of primary action, fit at smallest real window (check).
- Prose: serves the stated reader, accuracy to sources, structure, plainness, register fit, length discipline.
- Tool descriptions: eval correct/total (programmatic), tokens (programmatic, lower), no regressions (check).
- Decision options: see `decision-scoring.md`.

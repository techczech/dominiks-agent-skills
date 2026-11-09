# Decision scoring (score mode)

For any choice put to the owner with two or more real options (decision records, design choices, tool or model picks, plans). Replaces a bare "Recommended" from the proposing agent.

## Steps

1. Proposer writes the options neutrally: same length and depth each, no "recommended" label, consequences stated for each.
2. Rubric of 3–6 criteria from the owner's known priorities for this domain (cost, time to usable, risk to data, fit with existing estate, reversibility, what it looks like) plus anything they stated. Write `human_signal` entries for the sources.
3. Judges: at least two fresh seats that did not write the options. One model sampled twice is acceptable (no approval needed for same-family subagents); two models with two seats each when stakes are high. Shuffle option order per seat; label A/B/C.
4. Each judge returns score per option per criterion, overall per option, one-line reason, and the strongest argument against its top pick.
5. Write `run.json` with `mode: "score"`, one round, options as `subjects` with `kind: "option"`. Render the report.
6. In the message to the owner: options, the score table (mean and spread per option), where judges disagreed, then the proposer's recommendation labelled as the proposer's. If proposer and judges disagree, say so plainly.

## Size it

- Small, reversible choice: two seats of one model, 3 criteria, table inline in the message; report optional.
- Consequential or hard to reverse: two models where available (else more seats of one), full report, link it.
- A spread over 2 points on an option means the rubric is ambiguous or the options are underspecified; fix the wording before presenting, or present the disagreement.

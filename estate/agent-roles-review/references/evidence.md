# Evidence for a roles review

## Sources

- **Usage meters:** each subscription's usage page or CLI, read at the start of the review and compared with the last one recorded. Note which meter ran out first and when.
- **Transcripts:** harness session logs. Count subagents by model and type, starting context, cache rewrites after idle gaps, blocking waits. `../scripts/subagent_sizes.py --hours 336` does this for Claude Code transcripts (two weeks).
- **Test runs:** how often full suites ran, how often the same suite reran in one session, duration per run.
- **Review rounds:** rounds per change, and what each round found (new class of defect, or variants of a fixed one).
- **Incidents:** builds redone after the operator's first look, false greens, data loss, private material that nearly shipped, stalled or dead parcels.
- **The operator's corrections:** what they told agents to stop or start doing since the last review. These are the strongest evidence and the easiest to lose.
- **Model news:** releases, prices, plan limits and deprecations since the pinned date. Check primary sources, not memory.

## Triggers for an unscheduled review

- A new model in a tier the operator uses, or a price or limit change on a used plan.
- A meter running out before the week ends, twice.
- An incident a role rule should have prevented.
- The operator correcting the same routing choice twice.
- A harness or agent type added or removed.

## Measuring a seat change

- Replay a few real parcels on the candidate seat; record model, cost, time and verified defects.
- When comparing two builds side by side, judge both orderings: judges favour whichever is shown first.
- One pilot is a reason to trial, not a settled result. Log it as such.

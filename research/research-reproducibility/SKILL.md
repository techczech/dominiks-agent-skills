---
name: research-reproducibility
description: "Use when starting or continuing research, changing sources or methods, running model or analysis calls, or preparing a handover that must stay reconstructable."
---

# Research reproducibility

Recommend and make the smallest record that preserves the meaning of the work. Use the project's existing notebook, run manifests and evidence store; do not create a competing tracking system.

## At the current step

1. Read project instructions and the current source, decision and run records. Identify the active research question and what is about to change. Distinguish an approved decision from an agent suggestion.
2. Name the reconstruction target: explain a decision, rebuild from saved data, repeat a computation, or run a new model experiment. A successful rebuild does not establish scientific validity or identical future model behaviour.
3. Recommend what to capture **now**, why losing it would matter, and where it belongs. Record available evidence within the authorised task; ask only for unresolved scientific, privacy or resource decisions. Do useful independent work while waiting.
4. Read back the changed record and its evidence references. Report what was recorded, what remains unknown and the next material capture point. Planned work stays planned until observed.

## Choose the record

| Trigger | Minimum useful record |
|---|---|
| Exploration or routine editing | Existing notebook entry only when the question, interpretation or next experiment changes. No entry per read or punctuation fix. |
| Source, inclusion rule, method or output-selection change | Previous and new state; decision authority and reason; affected results; whether results had already been seen. Preserve earlier records. |
| Before an expensive, external or nondeterministic run | Approved input snapshot/hash; actual instructions and assembled request that can be captured; model/settings; code/environment; authorised scope; intended selection rule. |
| Attempt completes, fails or is retried | Attempt/request identity; actual status; raw response/error; outputs; available usage. Link retries and selected results without deleting failed or rejected attempts. |
| Review, handover or release | Exact source/output versions, reviewer exposure and decisions, verification performed, unresolved gaps, and who can approve the next step. |

Use [recording decisions](references/recording-decisions.md) for context limits, costs and a worked continuation.

## Build in checks

Where there is no single right answer, build in cheap signals that show when something is wrong: reach the same result two independent ways and compare; make the result visible (render, chart, play, compare with the source, open the links); check invariants (totals reconcile, counts before and after, no implausible clusters); and remove or alter the evidence before relying on an interpretation. Make sure each check could fail: a count of items processed is not a check that they are right, and a reference value must not be derived from the result it checks. Record which checks ran and what they showed.

## Evidence boundaries

- Store source, actions, decisions and derived presentation separately using existing project conventions. Keep sensitive evidence private; a shareable manifest can use authorised locators and hashes.
- Capture available effective request material, including attachments/tool inputs when exposed. Never promise unseen harness context or hidden reasoning. Label reconstructed prompts and candidate historical instruction versions; current hashes do not prove past use.
- Count distinct attempts, not copies of outputs. Cached input and reasoning tokens may be subsets; preserve provider semantics. Missing usage is unknown. API estimates, reconciled charges and subscription costs are separate quantities.
- Distinguish generated, checked, approved, sent and returned. A status field alone cannot prove that expected content survived packaging.
- After results are seen, changed prompts, exclusions or model substitutions form a documented amendment or new exploratory round. Do not silently rewrite the original comparison.

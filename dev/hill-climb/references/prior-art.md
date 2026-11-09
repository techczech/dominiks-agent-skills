# Prior art

What each source contributed. Papers were read at abstract level unless noted; the claims below are as the sources report them.

## Origin

- Theo (t3.gg), "Agents Sucked At UI (Until Today)", YouTube `xq0eB8vxeqk`, 3 Nov 2026, read from its transcript; details as understood from the narration. A council of judges from several providers scores screenshots 1–10 per category each round; the agent iterates until every judge gives at least 9 (later 9.5 and 10). Comparators in the panel (competitor apps) changed the scores sharply. Cheapest judge first. Programmatic evals preferred where possible (tool-description eval: perfect score, then cut description size to a third). Suspected that telling judges the target inflates scores. Owner taste still needed ("too grayscale").

## Loops with a fixed metric

- Karpathy, autoresearch, https://github.com/karpathy/autoresearch (Mar 2026). Agent edits one file, fixed time budget, one metric, keep or discard each change; the human edits the program, not the code. Source of keep-or-revert and the frozen ruler.
- pstack skills collection, "hillclimb" playbook (poteto-mode), read from a local copy. Frozen harness proven sensitive before use, one change per attempt, decision log of kept and reverted attempts, floor on attempts, median of repeated measurements for noise.

## Optimisers that read scored history

- Yang et al., OPRO, https://arxiv.org/abs/2309.03409 (2023). The optimiser sees earlier solutions with their scores.
- Agrawal et al., GEPA, https://arxiv.org/abs/2507.19457 (2025). Reflective evolution from natural-language feedback; keeps several non-dominated candidates. Source of the diversify/combine round at a plateau.
- Madaan et al., Self-Refine, https://arxiv.org/abs/2303.17651 (2023); Anthropic, "Building effective agents" (evaluator-optimizer), https://www.anthropic.com/engineering/building-effective-agents (2024). Same-model critique loops; this skill keeps judges independent instead.

## Judges

- Zheng et al., "Judging LLM-as-a-Judge", https://arxiv.org/abs/2306.05685 (2023). Position, verbosity and self-enhancement bias; pairwise vs single grading. Source of order shuffling, identity masking and pairwise checks.
- Chiang et al., Chatbot Arena, https://arxiv.org/abs/2403.04132 (2024). Reports that pairwise crowd votes agree well with expert raters.
- Verga et al., "Replacing Judges with Juries" (PoLL), https://arxiv.org/abs/2404.18796 (2024). Reports that a panel of smaller models from different families outperformed a single large judge at lower cost. Source of the seat panel.
- Gunjal et al., "Rubrics as Rewards", https://arxiv.org/abs/2507.17746 (2025). Reports that decomposed rubric criteria outperformed direct holistic judge scores as rewards. Source of per-criterion scoring.
- Hamel Husain, "Creating a LLM-as-a-Judge that drives business results", https://hamel.dev/blog/posts/llm-judge/ (2024). Critique shadowing: judge calibrated on an expert's pass/fail labels with critiques; report agreement on positives and negatives separately. Source of the calibration step.
- Eugene Yan, "Evaluating the Effectiveness of LLM-Evaluators", https://eugeneyan.com/writing/llm-evaluators/ (2024). Pairwise for subjective qualities, direct scores for objective ones, binary checks where possible; judges miss many defects. Source of checklist items and evidence grounding.

## Lessons from the author's earlier informal use (anecdotal; no logs published)

- Writing loop (two judges, eight criteria): judges asked to restore material the authors had deliberately cut, so owner decisions became a locked list; revisions dropped approved text and a figure that no judge flagged, so preservation became a hard check; material missing from the draft was invisible to judges who never saw the source inventory, so completeness became a hard check. After every criterion reached 9, the authors still found factual errors (a method described as used when it was only planned; subsets reported as full results): judges had checked the text against the agents' own evidence files, so an owner-confirmed fact sheet became part of the packet.
- UI loop (layout-problem count as the score): the scorer was frozen and the builder barred from hiding controls to pass; a reviewer outside the loop found a screen state the scorer never measured, which was then added; the builder made an owner-level choice on its own, so escalation became a rule.

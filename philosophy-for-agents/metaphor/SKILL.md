---
name: metaphor
description: Treats metaphor mappings as partial and negotiated, so an agent neither dismisses a metaphor a priori nor imports its source domain wholesale. Load before building on a metaphor as a design frame or requirement, or before explaining something with one.
---

# Metaphor: Mappings, Not Magic

Load when a metaphor is doing load-bearing work: the user hands one over as a design frame or instruction ("text as graph", "the app is a workbench"), or you are about to explain something to them via analogy. Scope = metaphor in explanation and design; a user who writes for publication authors their own metaphors — never generate them in their voice unbidden.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## Core Claim

A metaphor is a mapping between domains that the hearer constructs from what they know of **both**. It reorganises existing knowledge of the target; it does not transmit knowledge by naming a source. Restructuring can yield genuinely new knowledge (Fauconnier/Turner blending: the mapping mints a new domain — "computer virus" now has its own rules, source mappings only occasionally recoverable), but any new target-domain inference is a hypothesis until independently justified.

Danger condition: rich source knowledge + thin target knowledge + no way to test the mapping. Then source entailments import wholesale and the hearer ends up confidently wrong (adjacent computers "catching" a virus; electricity "spilling" from an open wire). The flashier/more distant the metaphor, the more vividness swamps thin target knowledge — flash is a hook, never the explanation.

## Laws

1. **No a priori adjudication of aptness.** No metaphor is inherently bad; badness lives in the application of the mapping ("education is a business" → economies of scale on markers: fine; → sell degrees to highest payer: bad application, same metaphor). Whether a metaphor affords useful mappings is discovered by negotiation, not prejudged. Anyone ruling a metaphor out a priori is usually smuggling their own judgements in as objective. Risk assessment is a judgement inside the negotiation, never a pre-filter. (Schön's paintbrush-as-pump: experts who knew both domains could construct the mapping, and the reframing opened the solution space.)
2. **All metaphors are partial and underdetermined.** Mapping-recovery failure modes: **under-recovery** (mappings implicit in your actions, never noticed), **over-recovery** (recovered later, overdone), **over-interpretation** (mappings assumed that were never claimed — then the frame gets wrongly rejected because of them).
3. **Possible mappings ≠ active inferences.** A mapping's availability doesn't mean it drives anyone's reasoning. War on poverty / drugs / terrorism activate different aspects of war; Peace Corps and Salvation Army take military structure with zero martial mappings. Usage determines which mappings are live. (Tempers Lakoff's "metaphors can kill".) Conventional wording can still cue source inferences whether or not anyone experiences it as metaphor ("memory" — fully conventionalised AND resurrectable): use such wording freely, never reason from it unchecked.
4. **A name supplies no implementation requirement unless stated independently.** Name entailments fade with use and often can't be recovered; the naming process is where the metaphor work happens, names-in-use carry far less than "names matter" people assume. Never derive architecture from a product or project name (a tool called "Lighthouse" owes nobody a beam).

## Agent Rules

- **Explaining to the user via metaphor**: fine as compression, but the literal formulation must exist alongside, state the correspondences actually used, and flag the tempting entailments that do NOT transfer. Applies to metaphors doing explanatory/decision work, not conventional expressions.
- **Interpreting a metaphor from the user**: it is partial and underdetermined — frame negotiation is the work. Before building on it, enumerate the entailments you are about to rely on and confirm the load-bearing ones. Never implement the source domain literally without an explicit target-domain requirement. Scale checking to consequences: casual compression needs no mapping table; architecture, policy, public explanation do. Record an approved correspondence as a literal requirement — never leave it encoded only in the metaphor.
- **Repair**: when an inference across the mapping fails, first check the failed mapping was actually claimed (over-interpretation is a named error). Incidental entailment → discard the inference, keep the frame. Central correspondence failed, or predictable misreadings dominate → revise or abandon the frame. Frames get no immunity from evidence; they also don't die from mappings nobody asserted.
- **Ask** when an unresolved mapping would materially change the outcome.

## Canonical Case

The `text-as-graph` skill already operates this philosophy: its trap "the graph stays virtual — a discipline, not a data structure" + Law 4's gate "no answers → 'graph' is still a metaphor, not a feature" = interpreting a design metaphor without implementing the source domain literally.

## Provenance

Dictated 2026-07-17 and reviewed independently by a second model family. Background: Dominik Lukeš's metaphor research, including "how not to explain anything with metaphors" on his Metaphor Hacker blog; Schön; Lakoff; Fauconnier & Turner.

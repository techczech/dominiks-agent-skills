---
name: model-council
description: Obtain independent second opinions from other language models when the user requests or approves a model council.
---

# Model Council

Get outside judgement without turning every question into a debate. Use the approved models and existing subscriptions where available. Preserve independent answers, disagreements and the evidence behind any recommendation.

Read `references/local.md` if present for the operator’s model, account and route preferences. It is optional local configuration, not part of the public workflow.

## Require explicit approval

Invoke a council only when the user explicitly asks for another model’s opinion or approves a proposed council. Complexity, uncertainty, earlier council use and a workflow suggestion are not permission to send task content to another model. Metadata-only availability checks are allowed before approval; test prompts are model calls too.

When proposing a council, state the question, why another view would help, which one to three models to use, and whether each route uses an existing subscription, a local model or a metered API. Ask only for decisions not already authorised. A model council is an extra opinion; it does not replace implementation, required verification or independent code review.

## Choose the smallest useful consultation

Use one second opinion for a normal plan, interpretation, draft or review. Use two or three independent models when distinct perspectives could change a consequential decision. Add targeted critique around a concrete disagreement or risk. Add adjudication only when the user needs a recommendation; do not decide by majority vote or average self-reported confidence.

Identify the stage and object of judgement: framing, planning, an implementation question, review, or delivery. Bulk extraction and categorisation are execution work, not council opinions. Repeated model-judge experiments require their own approved sampling, context and analysis protocol; this skill supplies routing and provenance, not a study design.

## Prepare an independent context packet

Give each first-round consultant the same evidence packet:

1. The question and current stage.
2. The smallest evidence-bearing artefact: draft, plan, diff, source extract or decision options.
3. Evaluation criteria and material constraints.
4. A request for a position, reasons, uncertainty, disconfirming evidence and recommendation.
5. A prohibition on other models, external actions and tools unless the approved consultation requires them.

Omit the host’s preferred answer for an independent first opinion. Include it, labelled as the object under review, for a critique. Exclude secrets and unrelated private context. A new child for each independent assessment avoids earlier answers influencing later responses.

## Choose a route

**Example route: T3 delegates (only if your host exposes T3 orchestration tools).** Use them when the requested provider, model and account are available and the operator prefers visible, linked child records. Read [T3 delegates](references/t3-delegates.md) before dispatch. T3 is an agent-orchestration app, not a guarantee of a subscription, a different model family or an isolated prompt. Verify the selected account, model and available settings.

**Outside T3, or when T3 lacks a required capability, use a suitable existing subscription CLI or local route.** Use the installed provider’s current documentation to establish containment, parsing and failure handling; this public package supplies no CLI execution helper. Pin an exact model identifier rather than relying on a startup default or moving alias. If a route cannot supply the approved model, report that; do not silently substitute a model, account or billing route.

Use a metered API only when the user has authorised that route and the existing routes cannot meet the need. Retrieve only the exact required credential through the configured secret manager. Never infer billing from an executable or provider name. Two wrappers around the same model family do not establish independent agreement.

## Run contained consultations

Use fresh contexts and the least tool and filesystem access the task needs. Disable inherited customisation and external tools where supported. Do not claim the harness omits unseen system or project instructions; record known residual context and controls that were unavailable. A behavioural instruction to avoid tools is not a technical sandbox.

Bind each route to its own approved exact model in a multi-route council. Grant repository access only when inspection is required. Keep permission checks in force. Never use a bypass flag or elevate a child merely to obtain an opinion.

Preserve the exact packet, requested and returned model/settings, route and account class, raw answer/error, available usage and failures. A completed answer is not proof of a successful external action. Missing usage is unknown, and list-price estimates are not subscription charges. For repeated experiments, a changed harness or prompt is a recorded condition change; do not silently pool it with earlier trials.

## Reconcile and retain

Keep first answers separate. Extract agreed claims, preserve material disagreements and minority objections, and check consequential factual claims against primary evidence. Explain which recommendation has the strongest support and what remains unresolved. Model agreement is not verification; model preference does not establish adequacy. Never hide failed calls or infer confidence from vote counts.

After a T3 child has finished, capture and use its result, save its link and settle it to keep the active list clear. Settling retains history; do not delete or archive the child as a substitute. Leave unfinished work and unresolved questions active. The T3 reference describes the lifecycle.

## Report the consultation

Tell the user which models and routes were used, their billing class, the context supplied, material agreement and disagreement, what changed in the recommendation and what still needs evidence. Report route failures and missing coverage honestly. Link the retained record when useful. [Protocol evidence](references/protocol-evidence.md) records prior art and research cautions for larger councils.

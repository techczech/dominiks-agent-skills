# Model Council through T3 delegates

Use this optional route when the host exposes T3 orchestration tools and the selected provider, model and account satisfy the user’s authorisation. Otherwise use another approved route (subscription CLI or local model). Availability and subscription entitlement are separate checks.

## Dispatch

1. Discover the T3 tools. Call `orchestrator_capabilities` once before the first `delegate_task`, and again only after an error or a user-requested provider change. Select the approved provider instance, exact model and supported settings; keep account boundaries explicit.
2. Save the independent packet before sending it. `delegate_task` receives only its task, without parent conversation history. Inherited system, project or harness context may still exist: record that limit. Supply evidence in the task for prompt-contained opinions; prohibit tools, files, other models and external actions unless needed and authorised. A prohibition is not a technical tool restriction.
3. Start one fresh child per independent opinion or repeat. Pass `target.providerInstanceId`, `target.model` and supported `target.options` explicitly. Use a descriptive title. Use shared isolation for a prompt-only consultation; choose a managed worktree only when an approved task needs a separate checkout. Never create an unrequested top-level thread to simulate a delegate.
4. Save the returned task, thread and run identifiers, link, actual model/options and raw result. Validate packet delivery, answer completeness and any required schema/evidence. Use exposed run metadata rather than a model’s self-description to establish identity. Record unavailable token or billing metadata as unknown.

## Completion and screen noise

Follow the tool’s `next` instruction. When completion will wake the parent, end the turn instead of polling or adding a schedule. A wait timeout does not cancel a child. Do not blindly retry an unknown outcome. Use `task_cancel` for a delegate that is being replaced; settling is not cancellation.

Once a child has finished, save and use or explicitly reject its result. Retain a task-to-evidence manifest with its link. Then call `t3_thread_organize` with `action: "settle"` and the child’s `threadId`. This removes completed work from the active list while retaining inspectable history. Do not delete or archive the child, settle it before consuming its result, or settle a child with unresolved approvals, questions or child work. If settling is unavailable, retain the link and report that limitation.

Mention a thread using the returned link verbatim. Capture answers and errors before settling. Keep sensitive packets and manifests inside their approved project boundary; a navigable thread is not permission to publish it.

## Experimental limits

A T3 delegate can be a different harness condition from a CLI request, even for the same model. Preserve the effective task packet, available settings and residual context separately. Do not claim identical prompt isolation, reproducibility or independence merely because the same model identifier appears. Fix repetition counts and sampling rules before new results; compare matched coverage and preserve every outcome.

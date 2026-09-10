---
name: dev-feedback
description: Use when requesting manual app testing or document review through Dev Traffic Control (DTC), collecting its feedback, or maintaining its release, roadmap, thread and handoff records. Also use before asking a user to check a build or review a document in an established DTC workflow.
---

# Dev Traffic Control

Use the existing app's file contract. Agents author requests and supported records; the app writes verdicts and user state. This skill provides portable instructions and no application code or new CLI.

## Resolve the installation

Find the configured watched record root from the app or workspace instructions; do not assume an author's home directory. `CONTROL_ROOT` in these references means that resolved directory, not an environment variable automatically supplied by the app. Read its current `AGENTS.md` and project instructions. If the root is unknown, ask for it once; meanwhile prepare the request content without claiming delivery.

Use the formats below for preparation; the installed contract resolves version differences. Do not edit the app-generated root contract as part of content work. Never launch or modify the app merely to create a request. If no installation exists, deliver the prepared Markdown as an unsubmitted handoff; use an already-installed legacy fallback only under its own local instructions.

## Choose the workflow

- **Quick app check:** follow [requests and reviews](references/requests-and-reviews.md). Default to `mode: light`, at most four key user-facing checks and three things to inspect per check. Put incidental version/build facts in the introduction.
- **Document review:** use `kind: doc-review`; prepare a short decision-focused distillation linked to the home document. Use tables or small visuals where useful and decision blocks for choices.
- **Collect feedback:** follow [report lifecycle](references/report-lifecycle.md). Reports are final only when `completedAt` exists; notes only when `handedOverAt` exists, unless the user explicitly asks to read a partial.
- **Release, roadmap, thread or handoff:** follow [work records](references/work-records.md). Their ownership and mutability differ from test requests.

## Ownership and completion

Never write app-owned reports, answer sidecars, roadmap ordering, handoff state or user notes. Preserve immutable requests and append-only thread entries. A retest with unchanged questions can reopen the existing run through the app; changed questions require a new request.

Record each actionable observation separately in the project's established issue/backlog/thread destination. Write a collection receipt only when the feedback has been read and acted on. Resolve an answer given in chat with the agent-owned resolution marker, without fabricating a test report.

Do not run Git inside the record root. Use its configured sync owner; RepoSync checkpoint can stage all changes and push, so follow the existing authorisation and scope. Tell the user what is ready and whether anyone is actually watching. Do not repeat the entire review request in chat.

---
name: todoscout
description: Use when reading TodoScout Action Items, preparing evidence-backed action summaries, reviewing dossiers or making supported record-layer updates. Applies to task content and existing commands, not development of the TodoScout application.
---

# TodoScout content

Work from canonical records and their evidence. An Action Item records a task; its dossier assembles context; derived indexes support views. This instruction-only skill does not install a connector or grant access to a store.

## Resolve the data mode

Identify the configured work/product store and whether the request concerns live data or mock fixtures. Do not infer the location from an author's machine paths. Prefer bounded list/read tools actually exposed by the current app; read individual records after finding relevant paths.

The inspected live Bridle assistant exposes `store.list_records` and `store.read_record`. A separate mock capability `store.draft_note` does not imply permission or support for live writes. A CLI name in a reference likewise does not establish that it is installed.

## Read and prepare

- Cite the relative source record for claims about tasks, people, commitments or dates. Distinguish missing evidence from evidence of absence.
- Check dossier freshness and underlying sources before reporting an action as current. Keep inferred next steps separate from recorded commitments.
- Preserve Action Item IDs and links. Distinguish `due_date` from review timing; do not invent deadlines, priorities or completion evidence.
- Prepare summaries, triage notes and response drafts within the user's scope. Preparing is different from sending a message, scheduling an event or marking work done.

## Supported changes

Use only a currently exposed write capability or the existing record-layer CLI described in [record operations](references/record-operations.md). Read its help and verify its store root first. Do not add missing tools or edit app source. If no writer is available, return a concrete proposed change rather than rewriting canonical records or generated indexes by hand.

Routine status changes include `open`, `in_progress`, `waiting`, `deferred` and `done`. `dropped` and `superseded` exist in the record layer but are not routine UI status choices; use only for an explicit request with the correct meaning.

After a write, validate and rebuild the relevant derived indexes, then read back the record and view. Report a successful record update and a failed index rebuild separately. A draft, a command success and an observed completed task are different results.

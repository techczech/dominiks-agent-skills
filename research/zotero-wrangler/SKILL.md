---
name: zotero-wrangler
description: Use when managing a Zotero desktop library, importing literature references, retrieving public PDFs or genuine abstracts, or organising collections, through the native API or the app interface.
---

# Zotero Wrangler

Manage the requested Zotero work through the appropriate interface. Current helpers implement native local API discovery, offline import planning, public metadata/PDF retrieval, resumable collection/item/attachment writes, linked notes, evidence-backed feature tags and native finder planning/reporting. Additional capabilities can be added without renaming the skill.

## Choose the interface

- Prefer native API helpers for the operations they cover. No direct database edits.
- For a requested operation not exposed by the API, or when the user explicitly wants the Zotero interface, use an available computer-use tool. Inspect the current app state and controls first; follow the tool's own instructions. Keep actions within the user's task scope, preserve unrelated library/settings state, and read back the result.
- Report the actual mechanism used and its validation limits. The native finder uses computer control by the runtime agent, guided by a scoped job and readback report. Helpers do not independently click the UI, perform OCR or synthesise paper findings. Do not promise an unimplemented feature or invent a successful UI action when computer control is unavailable.

Prepare a reviewable import before changing a library. Use `scripts/zotero-wrangler.py`; Python 3.10+ suffices for CSV/JSON, local API operations and retrieval. Optional BibTeX/RIS parsers are documented in [guide-zotero-workflow.md](references/guide-zotero-workflow.md). No Better BibTeX or cloud key required.

## Discover and scope

- Read [reference-zotero-local-api.md](references/reference-zotero-local-api.md) for enablement, native permission and version differences. Discover the running instance with `discover`; do not change settings automatically. Missing server ID means read-only support. A server ID indicates a write candidate, not a validated write capability.
- Resolve the named collection uniquely; use its key when names collide. Select `users/0` or an explicitly requested group. Take a fresh snapshot of the selected library. Treat snapshots and plans as private research artefacts, outside the distributable skill.
- Record the user's authorised scope: reference inputs, destination, additions and attachment retrieval. Native Zotero approval grants broad technical access; it does not expand task scope. Do not use a live library for testing without separately authorised scope.

## Identity and review

- Follow [schema-zotero-import.md](references/schema-zotero-import.md). Normalise DOI prefixes/case; syntactic validity does not prove identity. Verify uncertain punctuation against primary metadata. Do not remove terminal characters blindly.
- Reuse a unique DOI identity. Block ambiguous and title-only matches for judgement; never choose the first result. Preserve different publication DOIs as separate versions until their relationship is checked. If two records have no reliable identifier, obtain one or resolve them explicitly before execution.
- Consolidate duplicate source records with a union of query/source provenance. Preserve bibliographic fields, user tags, existing abstracts, notes, relations and memberships. Add only authorised memberships/tags and genuine missing abstracts. Inspect mapped BibTeX/RIS creators and fields; raw export records remain in provenance.
- `plan` and `apply` without `--execute` do not contact Zotero for writes. Review blocked identities, warnings, planned keys/version preconditions, tags, collection additions and evidence. Correct source records and rebuild an unexecuted plan. Once execution begins, retain that exact plan for reconciliation; generating new keys can duplicate successful writes.

## Retrieval and organisation

- Use `metadata` for Crossref depositor metadata; no abstract remains unavailable. Other genuine publisher/PubMed abstracts may be supplied with explicit source provenance. Never put generated summaries into `abstractNote`.
- Use `download-pdf` only for legitimate public publisher/repository PDF URLs. Check title, authors and publication version before attachment. A PDF signature/hash proves bytes, not that it is the right paper. No access bypass, paid retrieval or provider calls implied.
- Supply topic decisions with basis `search-stream`, `model judgement` or `user rule`. Search-stream groups are retrieval provenance, not eligibility decisions. Membership may overlap. Helpers create topic children under the selected parent and apply supplied decisions; they do not infer topics.
- Supply reading priorities with evidence and an explicit basis. Title-only decisions remain provisional; priority concerns usefulness to the user's question, never study quality. Judge relevance/importance with model understanding or explicit user rules; do not implement keyword appraisal. Existing priorities that conflict require review before additions.
- Record availability as evidence: advertised lead, author-stated supplement, checked files, restricted/request-only, unavailable or unassessed. Public repository access does not establish complete data, licence permission, runnable dependencies, matching historical model versions or reproduction. Record release/commit, checked paths, access date and limits. Do not run research/provider experiments without scope.

## Notes, feature coding and native retrieval

- For linked standalone collection overviews, child reading notes and evidence-backed feature tags, read [workflow-zotero-linked-notes.md](references/workflow-zotero-linked-notes.md). Use `discover --all-items` and `enrich-plan`; preserve existing notes, reuse exact generated notes and block edits/ambiguity. Supply annotations, query provenance, priorities, availability and follow-up checks with their limits.
- Separate empirical use from guidance, and unknown from assessed absence. Feature decisions require assessor/source/locator/access evidence. Helpers apply explicit decisions; they do not infer tool use from titles or keywords.
- For native Find Full Text, read [workflow-zotero-find-full-text.md](references/workflow-zotero-find-full-text.md). Use `finder-plan`, observed computer control of the native menu, and `finder-status` against complete before/after snapshots. Confirm the exact parent selection; do not select overview notes/attachments by accident. Record UI progress and keep an incomplete queue labelled running.
- A finder report checks parent/scope and reports stored hash metadata; document identity checks and actual-byte hash verification are separate. Downloading a PDF never implies full-paper appraisal. Fictional examples and tests do not authorise a live retrieval run.

## Execute and verify

- Only run `apply --execute` or `attach --execute` within authorised scope. Native keys stay in process memory; never write or print them. The helper uses Zotero's native dialog, including single-use and remembered approval.
- Keep receipts alongside the exact plan. Reconcile server readback before every retry; a timed-out client may follow a successful server write. Receipts are evidence, not server truth. Server mismatch, wrong-key state, stale versions or incomplete readback stops execution. Inspect and replan unresolved states; do not bypass preconditions.
- The helper uses batches of at most 50 and version 0 for preallocated new keys. Existing updates retain current planned versions. Attachment receipts preallocate a key before creation, bind source/file hashes and parent, then resume through the local upload flow. Verify parent and MD5 after registration; keep SHA-256 download provenance.
- Report verified references, reused identities, unavailable abstracts/PDFs, unresolved identities, topic/priority basis and availability limits. Separate offline tests, read-only discovery and live write validation. Exporting a package does not prove a live import or public release.

## Minimal example

Run from the skill folder; set a private output directory outside the installed skill and retain plans/receipts there:

```sh
ZOTERO_WORK=/path/to/private-zotero-work
python3 scripts/zotero-wrangler.py discover --snapshot "$ZOTERO_WORK/snapshot-zotero.json"
python3 scripts/zotero-wrangler.py plan references.json --snapshot "$ZOTERO_WORK/snapshot-zotero.json" --collection 'Reading list' --out "$ZOTERO_WORK/plan-zotero.json"
python3 scripts/zotero-wrangler.py apply "$ZOTERO_WORK/plan-zotero.json" --receipt "$ZOTERO_WORK/receipt-zotero.json"
# After review and within the user's scope:
python3 scripts/zotero-wrangler.py apply "$ZOTERO_WORK/plan-zotero.json" --receipt "$ZOTERO_WORK/receipt-zotero.json" --execute
```

See the workflow guide for an entirely offline fictional example, format limitations and attachment commands.

---
title: Native Find Full Text through computer use
register: FOR AGENTS
verified: 2026-10-14
---

# Scope and prepare

This capability combines native app control by the runtime agent with deterministic baseline/report helpers. It does not make a Python CLI click the app. Use an available computer-use tool and its current documentation; report blocked if unavailable. No hidden JavaScript injection, resolver changes, credentials, proxy changes or direct database edits.

Zotero's [PDF retrieval announcement](https://www.zotero.org/blog/improved-pdf-retrieval-with-unpaywall-integration/) describes its native item-context-menu retrieval and legitimate accessible copies. The historical label was Find Available PDF; observed current releases may say Find Full Text. Inspect the current menu rather than assuming a label. The [full-text API](https://www.zotero.org/support/dev/web_api/v3/fulltext_content) exposes indexed attachment content; it is not a PDF-discovery trigger.

1. Establish authorised library, collection and parent references. Retrieval downloads/attaches files and may sync under existing settings. Offline examples and tests do not authorise a live retrieval run.
2. Save a fresh complete baseline with `discover --all-items`. Run `finder-plan --snapshot ... --collection ... --out ...`; optionally pass `--keys KEY ...` for a subset. The job records the server/library partition, selected parent keys/titles and existing attachment keys. Only supplied collection references are accepted.
3. Keep the same job/baseline through the run. A changed database needs a new job. Do not automatically restart a possibly still-running native queue after interruption.

# Operate the native app

Use observed controls, not coordinates or element IDs copied from an earlier machine/session. With `cua_repl`, the first call must be exactly one documented entry call such as `await cua.getState()`; read its returned documentation/state before continuing. Locate the running Zotero app from the inventory, select it through the documented API, then inspect its accessibility state and/or screenshot. Other computer-use tools must follow their own entry/inspection rules.

- Select the exact library and collection. Resolve duplicate visible names against the prepared library/key/parent context.
- Clear an unintended search/filter only when needed for the scoped selection. Select the planned **parent references**; exclude standalone notes and attachments. Do not assume Select All equals the reference list after overview notes were added.
- Confirm collection, selection count and identities against job keys/titles/DOIs. A title-to-key correspondence needs unambiguous evidence; inspect identifying fields where titles collide. For a complete collection selection, reconcile the visible scope and reference count against the baseline. If scope cannot be verified, stop before clicking retrieval.
- Inspect the context menu and invoke its observed Find Full Text/Find Available PDF command. If absent/disabled, record blocked and the observed reason; never substitute a different destructive command.
- Observe the queue/progress window. Record started/running/completed/blocked/cancelled, timestamp and evidence. New PDFs alone do not establish queue completion. Native tool availability, eligible items and accessible copies vary.
- Use bounded progress checks and leave a running queue labelled running if the turn ends. Do not repeatedly initiate it. Preserve other app/library work and settings.

# Readback and report

After a checkpoint or observed queue completion, save another `discover --all-items` snapshot. Supply an observation JSON with `state`, `evidence`, and, for running/completed/cancelled, `selection` containing `library`, `collection`, exact `keys` and observational `evidence`. Construct the selection record from verified UI scope; copying planned keys without observing selection is not verification. This record is agent evidence, not a sensor reading fabricated by the CLI.

Run `finder-status JOB --snapshot AFTER --observation OBSERVATION --out REPORT`. It checks the partition, selected identities and memberships, collection identity and attachment parent keys. It reports only in-scope new attachments; other additions are listed separately. `complete` concerns reconciled queue completion, not paper appraisal or successful retrieval for every item. Report unavailable copies and pending identity checks explicitly.

For each new file, inspect title/authors/DOI/version from its first pages and parent metadata. Optional `identity_checks` entries use `key`, matching `parent`, `decision` (`consistent`, `mismatch`, `unresolved`) and `evidence`. No keyword heuristic certifies identity. `reported_md5` comes from metadata and `bytes_hash_verified` remains false: compute/compare actual local file bytes separately before claiming integrity. Do not call metadata readback a verified byte hash. A consistent first-page identity is not substantive methods appraisal.

# Offline example and validation limit

```sh
ZOTERO_WORK=/path/to/private-zotero-work
python3 scripts/zotero-wrangler.py finder-plan --snapshot assets/fictional-zotero-enrichment-snapshot.json --collection 'Fictional Reading' --out "$ZOTERO_WORK/job-fictional-finder.json"
python3 scripts/zotero-wrangler.py finder-status "$ZOTERO_WORK/job-fictional-finder.json" --snapshot assets/fictional-zotero-finder-after.json --observation assets/fictional-zotero-finder-observation.json --out "$ZOTERO_WORK/report-fictional-finder.json"
```

The observation is clearly labelled Mock UI. No real app action occurs. Synthetic tests cover selection/partition changes, progress vs completion, reference/collection changes, in-scope attachment deltas and pending identity/hash checks. They do not prove that a particular Zotero build/menu, computer-use runtime or retrieval service works live. A live validation run requires separately scoped disposable-library permission.

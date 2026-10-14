---
title: Linked collection notes and evidence-backed features
register: FOR AGENTS
---

# Plan notes and features

Use a fresh complete snapshot: `discover --all-items --snapshot ...`. A parent-only snapshot cannot reveal child notes and is rejected. Keep all runtime files outside the installed skill.

`enrich-plan` accepts an object containing `collections` and `papers`; see `assets/fictional-zotero-enrichment.json`. Each collection entry has an existing `key`, reader-facing `purpose` and `limits`. Each paper entry has an existing `key`, `status` (`preliminary` or `source-backed`) and optional `follow_up`, `provenance`, `reading_priority`, `availability` and `features`.

Source-backed annotations require `annotation` text and `source` with HTTP(S) `url`, `locator` and `access` basis. Preserve the supplied prose; do not invent a finding or upgrade an abstract/saved annotation into full-paper appraisal. Preliminary notes explicitly retain outstanding appraisal. Stored abstracts are included as existing library text, with provenance checks still required. Reading priorities require the same value/basis/evidence format as imports and do not express quality.

The planner creates a child reading note for each scoped paper and a standalone overview in each scoped collection. Overviews state partial coverage when only some collection references are supplied. Native links join overviews, reading notes and parents. Multiple collection memberships produce backlinks to all scoped overviews. Both personal and group libraries use their respective native item-selection links.

Feature decisions are supplied by the agent or user after reading evidence. Each contains `tag`, `kind`, `assessor` and `evidence` with `source`, `locator`, `statement`, `access`. Access is `full-text`, `abstract`, `saved annotation` or `user rule`; record limits/version details in the statement or source record. Titles alone do not establish empirical tool/method use. The helper applies decisions and retains evidence in the note; it does not classify papers.

- `empirical-use`: labels start `Tool used —`, `Method used —`, `Reviewers —`, `Outcome —`, `Evaluation —`, `Language tested —`, `Comparator —`, `Caution —` or `Model reporting —`.
- `guidance`: labels start `Guidance —`. A recommendation is not evidence of empirical use.
- Missing tags mean unknown/not assessed. Do not turn missing tags into negative findings.

# Preserve and reconcile

Existing user notes and bibliographic fields are untouched. Parent feature tags are additive partial updates with version preconditions. Generated notes have role tags. An exact matching generated note is reused; ambiguous, edited or differently generated notes block the plan for review. No automatic overwrite/delete command is provided. Keep the original plan after an interrupted run rather than allocating new note keys.

Apply with the existing `apply` command: dry run first; `--execute` only within task scope. Before/final readback verifies required parent identity, collection names/memberships, reused note bodies and all desired created-note bodies/parents. A concurrent identity, note or scope change stops execution.

# Offline fictional example

Run from the skill folder with an external private directory:

```sh
ZOTERO_WORK=/path/to/private-zotero-work
python3 scripts/zotero-wrangler.py enrich-plan assets/fictional-zotero-enrichment.json --snapshot assets/fictional-zotero-enrichment-snapshot.json --out "$ZOTERO_WORK/plan-fictional-notes.json"
python3 scripts/zotero-wrangler.py apply "$ZOTERO_WORK/plan-fictional-notes.json" --receipt "$ZOTERO_WORK/receipt-fictional-notes.json"
```

These are Mock Data only. Never execute the fictional plan against a real library. For real notes use actual selected keys, a complete live snapshot and source-grounded decisions.

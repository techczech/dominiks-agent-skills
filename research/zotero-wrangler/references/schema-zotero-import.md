---
title: Zotero import input and decision schema
register: FOR AGENTS
---

# Inputs

JSON: array of records. CSV: same column names; array/object cells use JSON strings. `title` required. Recognised metadata: `DOI` (alias `doi`), `itemType` (default journalArticle), `date`, `url`, `creators`, `publicationTitle`, `volume`, `issue`, `pages`, `publisher`, `abstractNote`. Creators use Zotero's objects, e.g. `{"creatorType":"author","firstName":"Alex","lastName":"Example"}`; organisations use `name`.

`abstractNote` requires `abstract_source`; the runtime agent must confirm it is a supplied genuine abstract. An explicit source label is provenance, not a truth validator. Unavailable stays empty. Existing nonempty abstracts are preserved. Review unsupported type/field combinations before writing; the local API can reject invalid combinations.

`provenance`: array of objects preserving source identifiers, query membership, URL, retrieval date and access limits. Helpers append input-content SHA-256 and row. Duplicate DOI records retain all provenance. Raw RIS/BibTeX export fields remain here, so import mapping does not discard them.

`tags`: strings or Zotero tag objects. Existing tag objects, including automatic tag type, are retained.

`topics`: `[{"name":"Methods","basis":"search-stream"}]`. Other bases: `model judgement`, `user rule`. Supply only scoped topic labels; the helper creates named children under the selected collection. `search-stream` states how the record was retrieved; it does not claim content relevance.

`priority`: `{"value":4,"basis":"title-only provisional","evidence":"Judged useful for the stated question from the supplied title; reassess after reading"}`. Valid values 1–5. Other bases: `abstract judgement`, `full-text judgement`, `user rule`. The agent records question/criteria and evidence sufficient to revisit the judgement. No automatic keyword rating.

`relevance`: object with `label`, `basis` and `evidence`. Use the same bases as priority. Tags preserve the supplied label and evidence basis; no automatic relevance inference.

`availability`: object with `status`, `source_url`, `checked_at`, `release`, `checked_paths`, `limits`. Status suggestions: `not assessed`, `advertised lead`, `author stated`, `public code checked`, `public data checked`, `restricted/request only`, `not found`. Record licences, completeness, dependencies, model versions and unexecuted experiments as limits; an empty data directory is not verified data.

# Plans and receipts

Snapshot: server ID, API version, explicit library prefix, collections and parent items. Plan: selected collection key, allocated keys, operations, identity decisions, blocked rows/warnings and content digest. Digest detects accidental edits; it is not a cryptographic authorisation signature. Review every operation before execution.

Operations contain desired partial data with key/version. Existing fields absent from a partial update remain untouched. Receipts bind server and plan digest. Every retry reads actual objects; saved success flags never cause skips. Existing satisfied tags/memberships may contain extra user additions; exact scalar values and identity must match. Unresolved concurrent changes require fresh judgement, not blanket replay.

No merge/delete command is provided. Resolve blocked identities by correcting input/snapshot only after checking authoritative identity and authorised scope. Never fake a live snapshot to force a match.

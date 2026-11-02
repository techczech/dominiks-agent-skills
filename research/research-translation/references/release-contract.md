# Fixed comparison release contract

Read before assembling any requested comparison. A supplied origin receipt is an operator assertion requiring independent checking against the original professional delivery or frozen AI run. The helper cannot authenticate a receipt or determine linguistic equivalence.

## Portable helper

Python 3.10+ standard library only; no keys, providers, local study paths or project-specific imports. Copy the skill folder; create a separate project. Run `python3 -m unittest discover -s research-translation/tests -v` from its parent. Tests use visibly labelled synthetic English tokens, not translations, back-translations or ratings.

`python3 research-translation/scripts/verify_review_release.py build --contract PROJECT/contract.json --registry PROJECT/origin-registry.json --workspace PROJECT --output PROJECT/reviewer-release.zip --receipt PROJECT/private-release-receipt.json`

Archive and private-receipt targets must resolve to separate, non-overlapping paths. Existing files and file symlinks are refused before building; receipt creation is exclusive so a concurrent file is never overwritten. A build failure after archive creation can leave a valid archive without a receipt; treat that attempt as incomplete and inspect it before any retry.

Contract fields (schema version 1): `schema_version`, boolean `test_data`, `package_id`, `language`, `material`, `source_version`, `source_path` relative to workspace, `source_sha256`, `required_origins` list (one entry per requested arm), `units` list of `{id, option_count}`, `reviewer_instructions`, `arms` list of `{label, source_id}`. Freeze the requested origins independently of available candidates. IDs, language/material and structural counts identify the exact requested scope. Preserve matrix/branching structure in the approved project representation; this minimal helper handles stems/options only and must not claim fuller structural coverage.

Registry maps source IDs to `{origin, path, sha256, evidence, model}`. Allowed origins: `professional`, `ai`, `user-supplied`. Paths resolve inside the separate workspace; hashes refer to fixed candidate JSON. `evidence` is a workspace-relative path to a separate lineage receipt JSON with `source_id`, `origin`, `candidate_sha256`, `approved_source_sha256`, `language`, `material`, `model`, `evidence_reference`. The helper checks these fields against the frozen contract/registry and fails on conflict. `evidence_reference` identifies the independently inspected original delivery or run. A self-authored receipt or arbitrary reference is not proof of authenticity. AI records require a named model. Professional source resolution is separate from the A/B key; copied display labels cannot override it.

Approved source and candidate JSON contain only `test_data`, `language`, `material`, `units`; units contain only `id`, `text`, `options`. Approved source language may differ from candidate language. Real content is supplied by approved sources/outputs. Synthetic data must retain `test_data: true` throughout. Helper verifies approved source bytes, declared unit IDs/options, all requested origins and candidates before creating output; existing outputs/receipts are refused. Unsupported formats fail closed; use an explicitly audited project adapter, do not relabel a converted file's provenance.

Only `review-candidates.json` and `reviewer-instructions.txt` enter the ZIP. The private receipt records hashes, actual origins and limitations. This is a fixed JSON transport, **not a complete questionnaire UI or spreadsheet**. Verify any derived renderer separately; do not claim browser QA for this JSON archive. Semantics, option order equivalence and effective anonymity require human/project review.

## Delivery readback

Download the actual draft/sent attachment through the authorised connector, then:

`python3 research-translation/scripts/verify_review_release.py inspect-attachment --attachment DOWNLOADED.zip --receipt PROJECT/private-release-receipt.json`

This verifies bytes and actual archive membership. It does not send, approve or establish that sending occurred. Record attachment identity, sent-message ID/date and recipient privately before stating sent. A local pre-send copy proves prepared only. Reviewer feedback belongs outside the skill and must never be created by test fixtures.

## Stop conditions

Missing professional input, wrong/missing requested origin, conflicting display key, wrong source version, incomplete structure, private payload fields or unverified actual archive: stop release and report the exact gap. Deadline pressure, an apparently correct page, and a stale send report do not fill that gap. Human owners resolve consequential source decisions and clinical/language suitability.

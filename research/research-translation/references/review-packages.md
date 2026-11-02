# Review Packages

Use this reference when creating artefacts for researchers or human reviewers.

**Release gate:** Read `release-contract.md` first. The requested origins are binding; missing a requested professional arm blocks release even if two AI arms exist. Professional provenance comes from independently inspected original delivery evidence, not an A/B key.

For HTML reports, report sites, dashboards, operator reports, cost reports, or project-local report builders, also read `report-generation.md`.

## Keep Two Surfaces Separate

Researcher review packages may include:

- source text
- translation candidates
- back-translation
- comparison notes
- provider metadata
- unresolved risks
- package export options
- a clear label for each translation/back-translation source, such as `agent-assisted`, `api-assisted`, `same-agent-check`, or `user-supplied`

External reviewer packages should include only:

- fixed candidate translation
- approved source context if needed
- reviewer instructions
- rating or comment fields
- exportable feedback

Do not include raw prompts, internal audit logs, unpublished variants, or provider errors in external reviewer packages unless the researcher explicitly approves it.

Do not include dummy translations, sample back-translations, or fabricated comments in either package. If a field has no real output yet, mark it as not generated.

## Comparison Readiness

Before building A/B or A/B/C reviewer packages, confirm:

- each arm is a real, distinct translation source
- professional/human translations are present when the package claims to include them
- AI or agent arms have run metadata or an agent provenance record
- target-language text matches the intended target language
- the source/original column is the approved source text for that material
- known source contamination is either corrected before generation or disclosed in a researcher-facing readiness note

If only one real arm exists, build a readiness report rather than a blind comparison. If a package has two arms, hide C controls and lay out the page as A/B, not A/B/C.

## Internal Unblinding Keys

Blind external-reviewer files should not reveal which arm is professional, agent-produced, or provider-produced. Keep the unblinding key in an internal researcher file.

The key should include:

- language
- material
- unit ID
- visible label, such as A, B, or C
- source type, such as professional, agent, provider, or user-supplied
- source detail, such as received date, run ID, model, or agent

Do not put the unblinding key into the sendable reviewer zip unless the researcher explicitly wants a non-blind package.

## Feedback Questions

External reviewers need concrete tasks:

- mark confusing words or phrases
- flag wording that changes the meaning
- flag tone that sounds too formal, too casual, coercive, stigmatizing, or unnatural
- comment on specific sections
- rate confidence by section

## Returned Feedback

Store returned feedback under `feedback/` and record:

- reviewer role, if known and approved
- language
- package version
- date received
- changes requested
- follow-up decisions

Use `scripts/prepare_feedback_request.py --internal-staging` for internal request staging when the project needs a structured return route. Its manifest includes local paths, its CSV has one template row per language/material rather than per item, and it does not assign package/version identity. Before using the template, add the fixed package identity/version and item IDs from the actual review package. Keep the manifest internal; select and inspect the reviewer-facing files separately. The folder contains:

- copied reviewer package files, if provided
- `feedback-form.csv`
- `request-manifest.json`
- a short `README.md` for the reviewer or coordinator

Use `scripts/collate_feedback.py` after returned feedback files have been saved under `feedback/returned/`. The script accepts CSV files created by the request script and JSON exports from reviewer interfaces that expose materials, units, arms, and comments. It writes:

- `feedback-collated.csv`
- `feedback-collated.json`
- `feedback-summary.md`

The collator retains package/version identifiers, hashes and additional rating fields in JSON and CSV, including metadata inherited from a JSON export. Conflicting package identity between an export and a row is an error. Additional nested values are JSON-encoded strings in the tabular outputs. Summary comments remain separated by package version and candidate identity. Keep original returns unchanged; a collated row can represent an unanswered item and is not evidence of a completed review. Collated outputs are internal researcher records, not automatically safe external packages.

Verify the whole return route with an explicitly labelled automation-only response before sending: enter feedback in the actual page, download it, collate it, and compare identity, item IDs, ratings and comments with the downloaded bytes. Keep these test responses separate from genuine reviewer returns.

Collation is not adjudication. After collating, a researcher or translation lead still needs to decide which comments require source correction, translation revision, reviewer follow-up, or no action.

The internal staging folder contains private source paths and is not a reviewer release. Use the strict release helper or a separately verified project-specific exporter for the actual archive.

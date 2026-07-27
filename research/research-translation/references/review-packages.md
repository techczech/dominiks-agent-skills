# Review Packages

Use this reference when creating artefacts for researchers or human reviewers.

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

Use `scripts/prepare_feedback_request.py` to create one outgoing request folder per reviewer when the project needs a structured return route. The folder contains:

- copied reviewer package files, if provided
- `feedback-form.csv`
- `request-manifest.json`
- a short `README.md` for the reviewer or coordinator

Use `scripts/collate_feedback.py` after returned feedback files have been saved under `feedback/returned/`. The script accepts CSV files created by the request script and JSON exports from reviewer interfaces that expose materials, units, arms, and comments. It writes:

- `feedback-collated.csv`
- `feedback-collated.json`
- `feedback-summary.md`

Collation is not adjudication. After collating, a researcher or translation lead still needs to decide which comments require source correction, translation revision, reviewer follow-up, or no action.

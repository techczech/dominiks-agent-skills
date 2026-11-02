---
name: research-translation
description: "Use for participant-facing research translations, questionnaires, professional-versus-AI comparison, back-translation or returned translation feedback."
---

# Research Translation

Keep this reusable skill separate from study data. Read existing project routing before operating in an established workspace. Using this skill does not establish participant suitability or clinical approval.

## Route

| Request | Read/use |
|---|---|
| Create separate workspace | `references/project-setup.md`; `scripts/init_translation_project.py` |
| Consent, agent/API exposure, usage | `references/providers-and-privacy.md` |
| Translate or back-translate | `references/workflow.md`; `references/language-and-document-risks.md` |
| Process guide/prompts | `references/process-guide-and-prompts.md` |
| Fixed review/comparison package | `references/release-contract.md`, then `references/review-packages.md` |
| HTML/dashboard/report | `references/report-generation.md`; inventory project builders first |
| Genuine feedback | `scripts/collate_feedback.py`; collation is not adjudication |

## Input and generation

Record authoritative source version/hash, languages/materials, stable units and options/branching, requested candidate origins, authorised provider exposure, audience and completion criteria. Do not flatten structured questionnaires. Seek clarification on consequential ambiguous source structure. Locate approved professional inputs across the authorised project sources and prior deliveries, rather than assuming the repository is the complete source estate.

Do not send study text or reviewer feedback to agent/API providers without applicable recorded consent. API execution must follow the project's live-call gate. No open-web terminology lookup without consent. Never invent translations, back-translations or reviewer scores. Isolated mechanical tests may use visibly labelled synthetic tokens; keep them outside study results.

Preserve forward, critique, reconciliation and back-translation stages, exact prompts, raw outputs, retries and provider usage. Resume verified completed work rather than repeating paid calls. Label the same model or agent used for both directions as **same-model or same-agent check**, even in a separate context; context isolation alone does not establish independence. Record source withholding separately. Token costs remain estimates until billing reconciliation.

## Review release

The requested comparison governs the package. **No silent downgrade or substitution:** missing professional evidence blocks a requested professional-versus-AI release, even when two AI arms exist. Prepare a researcher readiness note instead. Freeze origin requirements before candidate assembly; resolve origins from separate source receipts/run records. Display labels and an unblinding key are not provenance. A conflicting key blocks release pending resolution.

Use `scripts/verify_review_release.py` for its supported JSON archive contract. It verifies approved source/candidate hashes and structural coverage before writing an identity-free archive. Its strict allowlist excludes private paths, origins, keys and logs. It does not validate clinical meaning, authenticate professional credentials, or build HTML/workbooks. Project-specific renderers still need parity, actual archive membership and browser/export checks against output hashes.

The legacy `prepare_feedback_request.py` is **internal staging only**, requires `--internal-staging`, and must never supply the final reviewer archive. Keep researcher receipts outside reviewer payloads. Verify downloaded actual attachment bytes against the release receipt; mark sent only from actual sent-message evidence. Keep prepared, sent, returned, adjudicated and participant-approved separate.

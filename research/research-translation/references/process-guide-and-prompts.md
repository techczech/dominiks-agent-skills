# Process Guide And Prompts

Use this reference when the researcher asks what happens in the translation workflow, wants a shareable explainer, wants to inspect prompts, or needs to understand what text each model or agent sees.

## Shareable Process Guide

Create a human-readable guide in the project workspace when the process needs to be explained to researchers, reviewers, governance colleagues, or collaborators.

The guide should show:

- source intake and source provenance
- consent boundary before any provider or agent sees source text
- language and document research
- segmentation strategy
- forward translation route
- critique and reconciliation route
- back-translation route and independence label
- researcher review surface
- external reviewer surface
- feedback collation and change decisions

Keep it generic enough to share. Do not expose API keys, secret names, raw provider logs, private reviewer comments, or unpublished variants. Project-specific examples may be included only when the researcher approves that material for the guide audience.

## Prompt Transparency

For internal researcher review, preserve exact prompts or prompt renderings for each stage. Prompts should show what the agent or model actually received, including:

- target language
- document type
- audience and register guidance
- glossary or terminology rules
- whole-document preparation brief
- segment ID
- source segment text
- previous and next context, if included
- instructions for output format
- critique checklist or reconciliation instructions

External reviewers should not receive raw prompts unless explicitly approved.

## Dynamic Insertion Markers

When documenting prompts for humans, mark dynamically inserted content at the insertion point and name the inserted content plainly.

Use this style:

```text
<--INSERTED AT RUN BASED ON CONTEXT: audience and register guidance from material configuration-->
```

Do not write vague labels such as `<--comment-inserted-->` without naming what was inserted. Do not let marker text imply that a user comment, reviewer comment, or editorial note was sent to a provider unless that actually happened and consent allows it.

Use separate markers for separate insertions:

```text
<--INSERTED AT RUN BASED ON CONTEXT: target language profile-->
<--INSERTED AT RUN BASED ON CONTEXT: glossary entries for this language-->
<--INSERTED AT RUN BASED ON CONTEXT: current source segment text-->
<--INSERTED AT RUN BASED ON CONTEXT: previous and next segment context-->
```

## Source And Language Contamination Checks

Before translation, and again before review packaging, check for source text that does not belong in the current material:

- another target language embedded in the source
- placeholder text such as `[example translated text]`
- copied examples intended only for one language
- comments, tracked-change artefacts, or editorial notes
- OCR or PDF extraction fragments
- duplicated rows or table cells

If contamination is present in the approved source document, do not silently remove it from the audit record. Record it as a source issue. Then decide with the researcher whether to:

- translate the source exactly as supplied
- create a corrected source extract and rerun affected segments
- exclude the affected sentence from reviewer comparison
- mark the package as not ready for external review

If the contamination affects a generated target-language arm, do not claim the arm is clean. Either rerun from a corrected source or mark the limitation visibly in the researcher-facing package.

## Worked Example Discipline

When a guide includes a worked example, use one direction only unless a full bilingual example is necessary. Show:

- source segment
- rendered prompt with dynamic insertion markers
- model or agent output
- critique prompt or checklist
- reconciled translation
- back-translation label and output
- comparison notes

Use real generated text, user-supplied text, or text explicitly approved for illustration. Never invent a translation merely to make the guide look complete.

---
name: unslop
description: Use when drafting, revising or reviewing substantive prose, including an explicit request to unslop writing.
---

# Unslop

Adapted from Lauren Tan's [Unslop skill](https://github.com/cursor/plugins/blob/fd6dd6f7276956a532bb78a748a8d2818b6eb5f4/pstack/skills/unslop/SKILL.md) in Cursor's pstack plugin (MIT licence, see `LICENSE`).

Remove generated-prose patterns. Preserve meaning, evidence, intended voice, and useful structure.

Before work, read `references/local.md` if it exists (optional local rules, such as an author's word bans). Load the project's current whole-piece purpose/reader declaration, section brief, proposition inventory and narrative plan. Read the actual named files; a parent summary does not replace them. If a paragraph or sentence has an unclear purpose, declare its intended contribution before editing.

## Precedence

- Make only requested changes. Preserve all other wording and structure. Add no unrequested qualifications, checks, conditions or elaboration; ask before any necessary addition. A review finding never expands edit scope.
- Apply user instructions and the selected writing mode first. Substance, source fidelity, and accessibility outrank pattern cleanup.
- Follow the declared reader, genre and register. Preserve useful structure, reasoning, and exact operational identifiers. Do not impose an essay's rhetoric on a methods section, report or instruction.
- Writing in an author's name requires that author's current source. Preserve intentional wording and emphasis; add no opinions, claims, examples, or personality.
- Patterns are diagnostic cues, not proof of AI authorship or automatic bans. Keep justified dashes, passives, technical terms, and genuine triplets.
- Explicit author word bans are binding, not diagnostic cues. Do not conceal a conflict by altering an exact quotation or source text outside the authorised edit scope; flag it separately.
- Author deletions are authoritative, including deleted paragraphs and whole sections. Do not restore removed framing, qualifications or material from an older draft unless the author asks.

## Argument before polish

- Required final stage for substantive prose, including revisions. Apply to the actual final text; loading this skill is not a completed review.
- First establish the source argument: claim/purpose, reasons, evidence, qualifications and conclusion. Preserve the current author-edited baseline. A fluent paragraph fails if it loses the point the author was making.
- Check the section sequence and links between claims. Generic background, product descriptions or sensible advice must not replace a specific argument. Resolve unintended changes before this prose pass.
- For instructions/reference material, preserve the reader's question, definitions and action sequence. Do not impose a thesis. Respect the requested edit scope.

## Editing pass

1. Identify the claims, instructions, limitations, and evidence to preserve.
2. Check for unsupported significance, vague attribution, padded comparisons, synonym cycling, generic benefits, and chatbot scaffolding. For detailed diagnosis or a full Unslop review, read [the pattern catalogue](references/unslop-patterns.md).
3. State the fact, mechanism, instruction, number, or named source. Use supplied evidence; do not invent specificity. Missing evidence: flag the precise gap separately and ask before qualifying, deleting or elaborating beyond the requested edit. Do not restore a caveat the user removed.
4. Check what disappeared. Confirm every removed proposition was deliberately removed. Preserve quotations and source-faithful wording.
5. Ask: "What still makes this sound generated?" Fix the underlying vagueness or repetition only within the requested scope; do not manufacture quirks, mess, or a persona.
6. Read the assembled piece, including headings, summary, tables, captions and widget text. Confirm the argument, referents and material qualifications survived. Repeat after a material revision; format/build checks do not establish editorial quality.

## Separate critic pass

After the writer saves one section or output, a **different agent** runs the [independent critic workflow](references/independent-critic.md). The critic must load the author's current words and deletions, whole-piece purpose/reader declaration, section brief, proposition and narrative maps, evidence sources, local rules if present, and the actual draft. The writer's self-verdict is not independent review.

The critic saves sentence-by-sentence coverage and paragraph/section purpose checks with `keep`, `delete` or `rewrite` and a reason. The writer saves its repair response and revised draft; a different agent then rereads that actual revision and saves its verdict. The coordinating agent finally checks author fidelity against the current source. All prerequisites, versions, coverage, responses and verdicts remain in the project's writing-stage files.

Within the authorised edit scope, delete empty framing, repetition and invented qualifications. Delete a whole paragraph or section when it has no remaining purpose. Do not paraphrase an empty contrast or swap its connector to preserve a sentence that should disappear. Retain necessary facts and qualifications in direct wording; do not remove substantive distinctions just to satisfy the word ban. Recheck the assembled argument after deletions.

Delivery: keep an internal record of the baseline, instructions read, argument/fidelity review and unresolved limits. For a small edit, keep this proportionate. Delegated output still needs the receiving agent’s review against the source. Return the requested text. Put editorial notes outside the artefact, only when useful or requested.

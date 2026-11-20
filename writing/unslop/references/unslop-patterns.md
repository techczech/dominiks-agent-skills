---
title: Unslop pattern catalogue
purpose: Diagnose generated-prose patterns without overriding meaning or register
---

# Unslop patterns

Judge the passage in context. General pattern cues allow appropriate uses; explicit user bans do not. Diagnose what the passage fails to convey. Delete empty text; do not mechanically replace strings to keep it.

## Argument and context

- **Lost thesis:** an explicit criticism becomes a neutral overview of the subject. Restore the source's position and the reasons supporting it; raise factual objections separately.
- **Topic list replacing an argument:** individually relevant sections never explain why their evidence supports the conclusion. Give each section a role and make the missing inference explicit, or flag it as unsupported.
- **Context stripped during compression:** a summary retains conclusions but removes their actor, comparison, condition, date or example. Restore what the reader needs to understand the statement.
- **Generic caution replacing analysis:** recommendations about pilots, budgets, permissions or review appear without explaining their relation to the specific source argument. Retain only those warranted by the task and evidence.
- **Author revision reversed:** a later agent restores stock wording, qualifications, paragraphs or whole sections from an earlier draft over the author's deletions. Use the latest author-edited version as the baseline. Do not reintroduce deleted material without the author's request.

## Content

- **Puffery and significance claims:** "pivotal moment", "testament to", "setting the stage", "indelible mark". State what happened and its evidenced consequence. Importance requires an argument.
- **Promotional description:** "groundbreaking", "renowned", "stunning", "must-visit". Replace unsupported praise with properties the reader can assess. Keep requested promotional tone grounded in facts.
- **Name-dropping:** lists of outlets, authorities, or projects without their contribution. State who said what and why it bears on the claim. Retain multiple sources when they supply distinct evidence.
- **Vague attribution:** "experts believe", "reports suggest", "critics argue". Name the available source and its actual claim. Without a source, flag the evidence gap or remove the attribution; do not manufacture consensus.
- **Superficial `-ing` clauses:** "highlighting", "ensuring", "reflecting", "showcasing", "fostering" attached to a fact. Ask whether the clause adds a supported mechanism or consequence. Explain that connection or cut the unsupported interpretation. Keep ordinary participles that do real work.
- **Formulaic adversity:** "despite challenges, continues to thrive". Name the challenge, response, and observed result. Do not supply a recovery story without evidence.

## Language and reference

- **Inflated vocabulary:** "delve", "tapestry", abstract "landscape", "pivotal", "underscore", "vibrant". Inspect for empty elevation. Prefer the plain precise word; preserve literal or necessary uses.
- **Indirect predicates:** "serves as", "stands as", "boasts". Use "is" or "has" when the meaning is identical. "Serves as a temporary backup" may express an actual role; keep the distinction.
- **Padded contrasts:** "not just X, but Y", "the point is not X, it is Y". Check whether the sentence adds anything before rewriting it. Delete it when it repeats context or supplies an empty distinction. A connector substitution does not repair that failure. Preserve necessary information directly, subject to explicit word bans and the selected voice rules.
- **Forced triplets:** three adjectives or benefits added for rhythm. Keep the natural number of distinct items. Do not reduce a genuine three-part list.
- **Synonym cycling:** one object becomes "engine", "processor", "execution layer" without a real distinction. Repeat its name. If the terms denote different components, explain the relationship.
- **False ranges:** "from insight to innovation" when the endpoints share no meaningful scale. Name the actual topics. Preserve ranges of time, quantity, or another defined dimension.
- **Abstract metaphor jargon:** "substrate", "vector", "nexus", "bedrock", "flywheel", "north star" used as vague elevation. Name the object or mechanism. Keep precise field terms such as a mathematical vector or API surface when the audience needs them.

## Structure and punctuation

- **Repeated sentence moulds:** identical openings, clause lengths, or rhythmic lists. Vary construction where repetition obstructs reading; do not add arbitrary quirks or shorten every sentence.
- **Dash or colon dependence:** punctuation repeatedly carries connections the prose never states. Explain the connection or split a dense sentence. Keep useful em dashes, parentheses, colons, and the author's sourced punctuation.
- **Excessive bold:** every noun or acronym receives emphasis. Highlight the phrases that guide reading. Preserve the emphasis and navigation required by the selected register.
- **Redundant inline labels:** "**Performance:** Performance improved...". Remove repetition. Keep meaningful labels introducing new detail and agent-facing `Label: action` instructions.
- **Headings as advertising:** "Unlocking a vibrant future", or two-part slogan titles ("One dataset, three builds", "What it took: an account in tokens"). Name the section's question, claim, or object in a plain description. Prefer sentence case unless a document convention requires otherwise.
- **Decorative emoji:** remove visual noise when it supplies no navigation or meaning. Keep requested symbols and meaningful status markers.
- **Quotation typography:** follow the artefact's conventions. Do not normalise curly/straight quotes as an AI test; preserve quoted wording, identifiers, and code.

## Communication artefacts and filler

- **Chatbot scaffolding:** "certainly", "of course", "I hope this helps", habitual "let me know", or "found the smoking gun". Start with the answer or result. Keep a specific necessary question or next action.
- **Sycophancy:** "great question", "you're absolutely right" without reasoning. Respond directly; agree or disagree on the evidence.
- **Unsupported disclaimers:** "while specific details are limited" or boilerplate cutoff warnings. Delete invented or redundant qualifications, including whole paragraphs or sections with no other purpose. Keep a necessary, sourced evidence boundary; removing filler must not create false certainty.
- **Throat-clearing:** "it is important to note", "at its core", "in order to", "due to the fact that". Remove scaffolding or use "to"/"because" when meaning survives.
- **Stacked hedges:** "could potentially possibly". Keep the necessary uncertainty once. Do not turn tentative evidence into a settled claim.
- **Generic conclusions:** "the future looks bright", "ultimately this changes everything". End with the evidenced consequence, decision, next action, or limitation. Do not append a conclusion merely to provide closure.

## Specificity and readability

- **Benefits expressed as feelings:** "SQL you can read", "types that follow your schema". State the observable behaviour: "`.toSQL()` returns the string sent to SQLite"; "renaming a declared column makes TypeScript compilation fail". Use these examples only when true of the actual system.
- **Portable project copy:** ask whether the sentence could appear unchanged in another project's documentation. Generic promotion probably adds nothing. Shared instructions, definitions, and standards may legitimately travel; keep them when they help this reader.
- **Dense sentences:** split when the reader must backtrack. Preserve the causal relationship and qualifications; one idea per sentence is a heuristic, not a rule that fragments an argument.
- **Hidden actors:** name who does what when ownership or responsibility matters. Keep useful passives when the action or object is the focus. No universal active-voice requirement.
- **Adverbs masking evidence:** "significantly improves", "runs quickly". Use the measured delta if available. Without measurements, describe supported behaviour; do not invent a number.
- **Fancy synonyms:** "utilise", "leverage", "facilitate". Prefer "use" or "help" when equally precise. Do not replace terminology whose meaning would change.

## Final check

Meaning: every retained claim has a purpose and sufficient evidence.

Voice: rhythm, first person, judgement, and punctuation fit the requested author and register. Direct explanations may include the agent's reasoned recommendation. Writing in an author's name requires that author's source.

Navigation: summary, headings, emphasis, lists, and paragraph breaks remain useful. Human voice requires no deliberate mess.

Audit: "What still makes this sound generated?" Revise the vague claim or repeated construction. Stop when remaining choices serve the text; do not keep editing to evade imagined detection.

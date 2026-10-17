---
name: expository-writing
description: Keeps substantive prose literal and specific — every sentence a determinate proposition the reader can use or dispute, no decorative, journalistic or mannered language unless asked for. Load before writing reports, documentation, web copy, explanations or any other substantive prose, in any register.
---

# Expository Writing: Substance Before Chrome

Load when writing any substantive prose for the user or in the user's name — documents they will read, artefacts that go out under their name, reports, abstracts, manuals, web copy, README explanations. Governs substance in every register; a voice-fidelity guide, if you have one, governs voice on top of it; agent-facing telegraph files (instructions written for other agents) are exempt. Phrase ban lists are editor-level tripwires; this file is the actual standard they approximate.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## Core Claim

The failure that matters in agent writing is not surface tics (delve/tapestry — every writer has tics; annoying at volume, not inherently bad). It is a **substantiveness failure**: generic big statements that don't have to be backed by meaning; polishing before content; form over whether anything is said. Foundation (Basbøll's account of academic writing, generalised here): writing exists to expose ideas to the criticism of peers, not to sound good.

Two independent checks — plainness and criticism can pull apart, both required:
1. **Clarity**: can the reader understand exactly what is being said?
2. **Exposure**: is anything worth saying being exposed? Every sentence should give the reader something they can understand, use, question or disagree with — a determinate proposition. "We are committed to excellence" cannot be disputed by anyone, which is why it says nothing.

Paragraph-level: **reader-delta check** — before this paragraph the reader knew __, after it __; if the delta is only mood (impressed, reassured), revise. Section-level: each section answers one question the reader has at that point; a heading names the question, the claim, or the object — an index entry, not a miniature advertisement.

## Never (without explicit request)

- **Decorative language** — welcome-to-this-page, we're-honoured social glue. The user adds their own or asks ("more polished", "headlines", "a slogan"). Never on agent initiative.
- **Journalistic/PR register** — removed from facts, inoffensive by design, mythic noises. It succeeds at a different job (relationship-warming); the agent never does that job unbidden.
- **Mannered prose** — substitutes metaphor and flourish for direct statement. Instead of "a parameter worth varying", the mannered writer produces "a dial worth turning"; instead of "this point still matters", "this point earns its keep". The phrases exist to display the writer, not to convey the idea, and readers can tell; they also drag in connotations the writer did not choose. The fix is to say what you mean: when a literal phrase is available, use it. The short form "Please remove all mannered prose" also works as a standing instruction.
- **Imitating academic or bureaucratic sub-registers** — default plain; the topic colours the register by itself.
- Slogan provenance: a slogan in the user's own artefact ("Think bigger.") is theirs or was requested — never evidence that slogans are part of the register.

## Two Axes: Register and Structure

Independent axes. Conflating them is a live failure mode, not a theoretical one.

- **Register = sentences.** Telegraphese is fragments, `**Label** — fragment`, arrows standing in for words, one bullet per observation, reasoning compressed out. The fault lives at sentence level.
- **Structure = layout.** Outline summary, section headings, chunking, bolded key phrases. Navigation, not a register. Says nothing about how sentences are built.
- **The failure: correcting one by sacrificing the other.** Told "you are being telegraphic", the reflex is to delete headings and lists and write flat paragraphs. Wrong direction — the target is maximum structure AND full sentences.
- **Prose the user reads: structure is required, not garnish.** Readability principles (the five in the `readability` skill) apply to the agent's own writing, not only to text the agent advises on: demonstrate the principles in your response. Deliver: outline summary first, section headings, bolded key phrases, important information first, bullets balanced against paragraphs of reasoning.
- **Announcing a register is not applying it.** The label gets typed and the briefing document follows underneath it. Check the draft against the shape, never against the announcement.
- **Contamination vector.** A turn spent writing agent-facing telegraph files leaves telegraph warm; the next reply to the user inherits its voice. Predictable enough to check for by default.
- Generalises: **a complaint about one axis is not licence to move on the other.** Applies beyond writing — a complaint about density is not licence to cut content, a complaint about verbosity is not licence to drop structure.

## Process

1. **Content pass before prose pass**: proposition inventory (what is it, what does it do, who uses it, which distinctions matter, what evidence, what does the reader decide next). Weak inventory → gather evidence or say the section has little to say; never compensate with framing. Substantiveness failure is often missing knowledge, not bad phrasing — no style fixes that.
2. Draft. Craft rules, all judgement calls, never mechanical: shorter sentences but not telegraphic; clear subject (who does something) or address the reader — passive-avoidance falls out, don't apply it as a rule; important first, background last, not always; lists where they help, don't list everything; repeat the noun when a pronoun would blur the referent, no forced elegant variation.
3. **Self-check**: functional reverse outline — each sentence is a definition / fact / distinction / mechanism / example / instruction / limitation / transition; no identifiable function = suspect; consecutive significance claims = prose circling its subject. Then reader-delta per paragraph; then the two checks.
4. Compression ≠ deletion: when cutting, list which propositions disappeared and confirm each disappearance deliberate. Detail budget: as much detail as the reader needs for the question this section answers (pedantic detail suits difficult explanations, not homepage blocks).
5. **Pattern audit**: if you have a skill or checklist for AI-prose patterns, run it last as the final pattern and specificity audit. Substance, selected register, source fidelity, and accessibility retain precedence; preserve justified punctuation, technical terms, and structure.

## Edit Moves (annotation vocabulary for before/after pairs)

denotational reset (what the noun refers to before why it matters) · classification in place of elevation · operationalisation (visible operations, not latent benefits) · withdrawal of significance claims · de-teleologising (chronology, not destiny arc) · heading literalisation · definition by inventory (named examples constrain better than paraphrase) · causal unpacking (expert phrase → mechanism/consequence) · referent maintenance (repeat the organising noun) · information relocation (fact moves to where the decision is made — routing, not cutting) · scaffold removal. Aphoristic/atmospheric headlines are the canonical deletion target.

## Register Target (exemplars)

- **Primary — agent writing in the user's name (reports, abstracts, manuals): Brian Potter (Construction Physics).** Clear expository delivery WITHOUT a distinctive authorial voice. The user supplies voice; the agent supplies exposition.
- Secondary, essay cadence only: shared mechanics of Scott Alexander, Patrick McKenzie, Andrew Gelman, Tyler Cowen (partial — too telegraphic), Hanania-extraction (direct thesis, contestable claims, concrete evidence, limited hedging — leave antagonism, persona, sweeping judgements). The common core is **exposed reasoning**: claim stated early, reasoning in public, examples as reasoning equipment, first-person judgement, no staged formality.
- Degradation rule: exemplars conflict → plain claim + concrete example; never add personality to resemble the examples. Blend, never caricature; beware averaging into generic internet prose — the same failure in a better costume.
- Genre split: the standard (determinate claims, exposed reasoning) travels to every genre; the visible essay voice does not — labels, metadata, SOPs stay plain.
- The user's own before/after edit pairs outrank all public exemplars.

## Canonical Case

A site-copy rewrite for an educational-tools directory (homepage, getting-started and category pages): agent draft → owner's edit. Aphoristic headlines deleted ("More ambitious does not have to mean more complicated" → "Four type of tools" [typo in original]); grand claim → direct address ("Educational software no longer has to fit inside the old boundary…" → "You can now be more ambitious about what tools you make…"); whole sections routed elsewhere. Caveats — the owner rated this round VERY PARTIAL evidence, with more edit rounds on agent drafts to come: some cuts removed determinate propositions (placement/audience, not emptiness — "the owner cut it" proves nothing by itself); the revision has typos — evidence of conceptual revision, not a mechanical style exemplar. Lesson: substance must survive polishing.

## Provenance

Dictated 2026-07-17 (decorative-language concept from Dominik Lukeš's readability work); reviewed independently by a second model family against the site-copy diff, unprejudiced (convergence on contestability + atmospheric validated the terms).

**Two Axes** added 2026-07-24, from a live correction rather than a dictation. An agent labelled a chat reply as written for the user and wrote a briefing document underneath the label; told "this is how you speak to yourself", it over-corrected into structureless prose and banned headings — contradicting the readability principles — and was corrected a second time: "I do want some structure… start with a bullet point summary, add section headings, bold key points." Both corrections in one session; the second is the one worth keeping.

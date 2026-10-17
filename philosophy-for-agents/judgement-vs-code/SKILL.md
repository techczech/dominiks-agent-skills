---
name: judgement-vs-code
description: Decide when a task needs model judgement (reading and understanding) instead of string operations such as regex, keyword lists or first-N-sentences. Load before writing any logic over natural language or document content, and when reviewing such code ("can this be correct without understanding the input?").
---

# Judgement vs Code (Grep and Grok): Choosing the Right Implementation for Language Tasks

Load when implementing any logic whose input is natural language or document content.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## Schemas and Propositions

The dichotomy is literally **string matching vs judgement**: Boolean operators over matched strings = "Python semantics"; human semantics is not like that. **LLMs have human semantics, not Python semantics, even though they can write Python.** Terminology: we think in **schemas** and we speak in **propositions** — propositions are a lossy, quasi-logical translation of schemas ("propositional" deliberately spans the Lakoff ICM layer, Polanyi's tacit knowledge, and tension with the logic sense). Propositional semantics is parasitic on schematic semantics, in humans and LLMs alike; logic is parasitic on the fuzzy world. Easy/hard inversion (Moravec-style): local semantic judgement ("this paragraph is about sadness") is effortless for humans and LLMs, hard for classical code; string matching at scale is trivial for code, hopeless for humans AND LLMs. Agents misjudge which side a task falls on.

Term collision warning: "schema" here is the cognitive sense. A record/markup/RDF schema is an accidental homonym (bank-river vs bank-money) — never treat them as related. In this doc family, judgement-record structure is called a **record format**.

## The Test

Before writing the function, ask: **can it be correct without understanding what the input means?**

- **Yes** — correctness is structural (exact match, syntax, position, count, hash, path). Write deterministic code. It is cheaper, testable, reproducible. Right for: path validation, dedup by hash, frontmatter parsing, applying an exact-string edit.
- **No** — correctness depends on meaning (intent, quality, relevance, tone, salience, genre). Use model judgement: an LLM call, a tool the model drives, or defer the decision to the runtime agent. Right for: summarising, titling, editing prose, classifying requests, judging importance.

## Judgement Words

If the spec says *summarise, suggest, improve, tighten, title, rewrite, classify by topic, relevant, appropriate, interesting, important* — it names a judgement task. Implementing a judgement word with string operations requires explicit justification in the plan, not a silent default.

## Failure Signatures (flag these in review)

- Regex over natural language (`/\b(?:about|called|named)\s+(.+)$/` as "understanding the request")
- Word-substitution tables as "editing"
- First-N-sentences as "summary"
- Keyword lists as intent classification
- Slug/heading extraction as "title generation"
- Keyword scripts as semantic search (see below)

## Search and Filter Tasks

"Find all X about Y" over a corpus (documents, exhibits, images, records) is a judgement task **per item**. Canonical failure: asked to find all museum exhibits about women, a model writes a script grepping descriptions for female-related words. That does not approximate the judgement — it **silently redefines the question** (an exhibit about a female astronomer may never contain the word "woman"; a "women's prison" match is not *about* women). Correct implementations:

- Default: read and judge every item (batch/fan out subagents for scale; include images when the content is visual).
- Hybrid only when recall-safe: a mechanical prefilter may cut *obvious* noise (wrong language, wrong date range — structural criteria), never decide the semantic question. Code narrows on form; the model judges meaning.

## Disclose the Mechanism

The user asked a model, so they assume model-grade judgement was applied. If you substitute string matching for judgement anywhere in the pipeline, the results inherit your credibility without your understanding — misses and false positives the user cannot see and will not question. Never silently substitute. If a mechanical method was used, say so in the result ("keyword match, not per-item reading — may miss items that don't use these words") or do the judgement work.

## Composition Rule

Model decides, code executes — most good designs use both. The model chooses *what* the edit is; exact-string matching *applies* it. Never invert this (code deciding, model executing).

## Judgement at Scale: Chunk, Judge, Record, Reconcile, Aggregate

Semantic judgement is reliable over short spans — 1–3 paragraphs, up to a page (provisional heuristic, revisable per task; the principle: smallest evidence-bearing unit that permits reliable judgement, with enough context to interpret it). Whole-book verdicts ("read Pride and Prejudice, answer 15") are unreliable and unauditable.

Canonical architecture — "how many women are in Pride and Prejudice":
1. **Define the counting ontology** (distinct characters? mentions? named only?) — mechanical splitting follows structure (code's job).
2. **Judge each span** (model), **record each judgement**.
3. **Reconcile entities across spans** — Elizabeth / Miss Bennet / "she"; two different women sharing a name, disambiguated by context many paragraphs back. Reconciliation is itself semantic judgement; "code aggregates" must never hide it.
4. **Aggregate mechanically**, carrying uncertainty forward.

Recorded judgements are the stand-off sidecar layer of the `text-as-graph` skill: cached with provenance + confidence, re-derivable, never structural truth by default — with a promotion path (provisional model annotation → human-validated → canonical; provenance survives promotion).

Record requirements:
- Settled: every record carries confidence, and abstention ("not determinable from this span") is a first-class outcome.
- Working practice (recommended fields, not law): span ids, question asked, label, evidence location, model+prompt version, invalidation rules. Record evidence and criteria, not free-form rationale.
- Parasitism caveat: a recorded judgement is a lossy propositional translation of the schematic judgement — a working artefact, never the judgement itself.

## Evidential Care Is Universal — No Category Carve-Outs

The text never fully licenses an interpretation; schemas are always required ("his daughter" = female person only via schema — in a syntax paper it's a tree node; "Mrs Bennet" only *feels* self-evident). Reading is schema-driven inference; the variable is **confidence**, not licensed-vs-inferred (garden-path sentences: automatic schema commitment that sometimes must revise). Therefore: every judgement asks *how confident are we as readers? how easily are our stereotypes leading us?* — and "uncertain / not determinable from this span" is a first-class outcome for ALL judgements. No privileged carve-out for gender/ethnicity/religion/etc.: politically prominent ≠ epistemically separate, and special dances around one category understate the universal nuance. This is an epistemic rule; a deployment may add per-category caution, but that is a policy layer, named as such — never smuggled in as semantics.

## Retrieval Prefilters

Embeddings/BM25 are admissible only as **explicitly lossy retrieval**: ranking the order in which every item still gets judged; candidate generation with recall actually measured; or when the user explicitly accepts incomplete recall. Results must never present "qualifying items among retrieved candidates" as "all qualifying items in the corpus" — same disclosure duty as keyword matching above.

## Why You Default the Wrong Way

A deterministic function feels like a finished deliverable: self-contained, testable, no API dependency. The quality cost lands on the user later, not on you at generation time. Treat that pull as a bias to correct, not a signal.

## Stubs

If no model is wired up yet (proof-of-concept), a symbolic stand-in is acceptable **only** when marked `// judgement-stub: replace with model judgement` so it cannot silently fossilise. Finding stubs later is a legitimate string-matching job.

## Canonical Case

A Markdown writing-app proof of concept (2026-06-30): `suggestEdit` (substitution table as editing), `summariseMarkdown` (first-3-sentences as summary), `titleForNewFile` (regex as intent parsing) — all judgement tasks implemented as string mechanics; all replaced when a real model loop landed. Dominik Lukeš's *Grep and Grok* cartoon series illustrates the same principle: Grep is excellent at its own job but comically misapplied; the failure is using the wrong tool for the task. The relationship is Grep AND Grok — composition, not competition; the failure mode is substitution.

## Provenance

Distilled from the writing-app proof-of-concept case (2026-06-30). Extended 2026-07-17: schemas/propositions terminology, judgement-at-scale architecture, universal evidential care, retrieval doctrine. Independently reviewed by a second model family; the record-field list remains working practice.

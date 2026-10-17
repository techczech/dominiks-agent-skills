---
name: text-as-graph
description: Treats texts and courses as graphs of connected parts, with views (slides, handouts, outlines, calendars) as derived pathways and every duplicate carrying provenance and a regeneration rule. Load when designing document or course structure, registries, derived views, provenance, or fork/reuse/remix features in a content app.
---

# Text as Graph, Views as Pathways: Structuring Content Systems

Load when designing document/course/content structure, registries, derived views, reuse/remix, or provenance — slide and talk tools, writing apps, archive and highlight tools, course builders, agent event records. This is the philosophy behind many feature requests in content apps; don't make the user restate it per project.

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

## Core Claim

A text or a course is a graph, not a stack of buckets. Sections, headings, lists, paragraphs, readings, lectures, exercises — nodes with labelled, directed, valued edges. Traditional systems (Moodle, Canvas, most CMSs) model a shallow tree of buckets: once you hold the bucket, its interior is opaque. Presentations — slides vs handout, week-view vs calendar vs kanban, editor vs outline — are pathways/projections through the same graph wherever content is shared. Hold the graph and those views are re-derivable; genuinely view-specific content is explicitly authored and linked, not a smuggled duplicate.

The maximalist graph (every word, every anaphor, every claim) is infeasible and undesirable. The craft is deciding what earns explicit markup vs what is derived by convention. Minimalist-JSON over maximalist-XML; HTML5 over HTML4.

## Four Laws

1. **Trees for authoring, typed references for cross-cutting relationships, event logs for history, derived graphs for queries.** A graph database enters only when demonstrated query or scale requirements make derivation inadequate — never as the default store.
2. **An edge earns canonical markup only when it cannot be derived reliably from convention and shipped behaviour, integrity checking, or interchange requires it.** Derived relations may be cached or materialised with provenance + invalidation rules, but never become independent truth.
3. **A duplicate is legal only with declared provenance and either a regeneration rule or an explicit immutable purpose** (snapshot, audit record). An independently hand-maintained duplicate is a missing edge or a missing automation.
4. **Graph-feature gate — answer before building:** what has stable identity, at what granularity? which revision and source are authoritative? how are forks, conflicts, deletion, lineage represented? can view edits round-trip without ambiguity? No answers → "graph" is still a metaphor, not a feature.

## Markup Economy

- Free from convention: heading hierarchy, list containment, paragraph→heading, sentence→paragraph. Markdown already is the tree.
- LLMs move the derivability frontier: named entities, claims, anaphora are now derivable at query time. If persisted at all → stand-off sidecars with confidence + provenance (TEI pattern), never structural truth.
- Explicit markup therefore shrinks toward three things: **identity** (stable ids), **intent** (fork vs reuse, canonical star), **external commitments** (dates, audiences, publication, licence).

## Copy, Fork, Remix

- **Bad copy**: hand-maintained duplicate — a registry entry retyped elsewhere, a parallel ledger kept by hand, the same fact in two files with no derivation between them.
- **Good copy**: transformation input, frozen output (published handout, portable deck), snapshot, cache, audit record — each with provenance and a regeneration rule.
- **Fork/remix is first-class, not a violation.** Git solved provenance-preserving remix for software; OER's 5Rs established *permissions* to revise/remix but its mainstream tooling never made provenance-preserving textual remix routine — the many projects built specifically around OER remixing all failed on this — remix worked for images (simple attribution boundaries) and stalled for text (multi-passage, multi-contributor lineage; git's model conceptually too hard for the community). Design goal in every content app: make fork-with-provenance effortless. Record lineage regardless of licence; track licence and remix permission separately.
- **Minimum fork record:** source identity + revision/hash, parent lineage, transformation or changed regions, contributor attribution, timestamp, applicable licence. A fork may diverge permanently; regeneration and upstream propagation are explicit, never assumed.
- Canonical case: a slide app's slide ledger — reuse keeps the id (one slide, many locations); fork and duplicate mint a new id with lineage recorded; propagation is explicit, per-target, loss-proof (overwrites versioned first). Drift becomes visible instead of lost.

## Traps (never)

- A generalized graph/matrix store, or a unified node/edge schema across apps. The graph stays virtual — a discipline on markup and views, not a data structure. Reifying it creates a second copy of the document to keep in sync (violates Law 3 at architecture level).
- Persisting parse-derivable relations. Sync burden, zero information.
- Content-level edges (entities, claims) as unquestioned structure. Model-dependent and overlapping; sidecar or query-time only.
- "Views are free." Read-only projections are cheap; **editable** views need transactions and position mapping (ProseMirror lesson). Budget real product logic per view; the compiler is not incidental.

## Where It Already Operates (exemplars, cite these)

- Talk/slide app: heading = slide (structure from convention, no slide markers); the outline is canonical; one outline → slides, presenter view, handouts, pathways, run records; a slide ledger; layout-registry parity (an option declared once → picker, inline syntax and inspector all derived; hand-maintained inline lists banned).
- Agent harness: flight-recorder invariant — *record or derive everything that influenced a model call*. Canonical object = append-only event record; interview-by-query views = read models over it. Event sourcing, not a graph store.
- Writing app (apply): proposals anchor to structural nodes at a revision, never character offsets; durable ids only for blocks that agents/comments/proposals must address.
- Archive or corpus tool (apply next — least developed): provenance edges over artefacts — `converted-from`, `duplicate-of`, `extracted-from`, `supersedes`, `reviewed-as`. Minimal markup: artefact id, source locator/hash, media type, converter+version, triage state. Lineage/triage/vault views derived. No content atomisation.
- Highlights store, course builder: same rules — highlights/course elements get identity + provenance; courses are the original motivating case (bucket VLEs vs single-tree LiaScript/Quarto vs pathway-derivable graph).

## Prior Art (what to steal, not survey)

- Pandoc: small typed AST as the compilation boundary; writers = projections. Not an identity model.
- ProseMirror: schema-constrained trees, transactions, position mapping for editable views.
- TEI: stand-off annotation for overlapping/uncertain layers — that pattern only.
- Roam-likes: backlinks + user-visible reference integrity; not graph-as-UI.
- Nelson/transclusion: durable identity, provenance; "don't destroy relationships when producing a view."
- xAPI/cmi5: actor–verb–object–result shape for Runs/learning events only if interchange is ever needed.

## Provenance

Dictated 2026-07-14 (core philosophy + copy/fork/remix elaboration, including the OER remix failure) and reviewed independently by a second model family. Origin: VLE course design (opaque buckets) + text-as-graph framing. The sibling skill `judgement-vs-code` governs how the derivations are implemented.

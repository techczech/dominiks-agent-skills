# Independent critic workflow

Use after one section or output has been saved. Keep these records in the project's established writing workspace, outside audience-facing prose. Keep a stage index of the active draft and next step, and update it after each transition.

## 1. Load the review packet

The critic must be a different agent from the writer and from any editor whose visual, table or resource output it is reviewing. Give it paths to the following files, and require it to read their contents:

- The author's current wording or dictation, accepted edits and recorded deletions, plus the authorised scope.
- The whole-piece purpose and reader declaration: who reads, why, prior knowledge, required knowledge or action, irrelevant material, and genre constraints.
- The section brief, including its reader question, opening purpose proposition, intended knowledge before/after, exact author text and excluded content.
- The proposition inventory with claim IDs, conditions, modality, negation and evidence links; the narrative/dependency map explaining the order in which the reader learns things.
- The actual evidence sources relevant to this section and the actual draft to review, identified by file/version or hash.
- Visual/table briefs, editable sources and exports; appendix/shared-resource allocation and the actual selected resources, author/disclosure decisions and cross-references.
- Saved task packets and followups when an editorial inspection report is part of the requested output.
- This workflow, the pattern catalogue, and local author/register rules when present.

Record the files actually read in the critic record. If a prerequisite is missing, identify it and recover the source; do not certify an unreviewed claim or infer author intent from an older draft. A summary of the writer's reasoning or a statement that the draft passed cannot replace these inputs. Review only authorised source material.

## 2. Save complete coverage and findings

Create `critic-<section>-r01.md` or a project-equivalent record. State writer and critic identities, exact draft/source versions, purpose/reader and review scope. Review one section or output at a time, in reading order, with no sampling.

Record one row per sentence or equivalent unit, including headings, bullets, table cells, captions and widget text. Cover each visual, its labelled relationships and the corresponding editable source/export as an artefact; include appendix/resource allocation and inspection-manifest entries in the review scope. Then record one row per paragraph and per section. Use a stable locator, a brief exact text anchor, `keep`, `delete` or `rewrite`, and a concrete reason. State coverage totals and unresolved units; an unchecked unit prevents a complete-coverage claim.

For each unit, ask what proposition it communicates, what this reader needs, and what its position contributes to the declared narrative. When that is unclear, write its purpose and reader at paragraph or sentence level. Preserve subject, predicate, object, conditions and author emphasis. A concept map is optional when it helps inspect relationships; it does not replace the propositions or evidence.

Run a dedicated cohesion review (paragraph and section transitions, referents) as a named specialist part of this independent review. Inspect actual paragraph beginnings/endings and section entry/exit pairs, identify the antecedent or prior proposition and the relationship between the passages, and check longer referent/topic chains. Keep its boundary findings separate from factual and prose-pattern findings. Include the protocol’s separate opening-sentence and skimming pass: check topic, procedural or argumentative position, necessary context and the actual link at entry. Stable repeated nouns alone do not establish that progression. A separate reviewer may perform it; the independent critic may also take this role and save separate complete boundary coverage. The writer cannot certify its own repair. Recover missing context before proposing a specific bridge; preserve meaningful repetition and expand a link when the reader needs it. Do not insert a causal connector, assumed shared knowledge or an unexplained definite noun to simulate continuity.

Delete empty framing, repeated conclusions, invented qualifications, and paragraphs or sections with no remaining purpose within the authorised edit scope. Do not preserve an empty contrast by changing its connector. Preserve a necessary sourced distinction in direct wording. Respect the declared genre: a methods section explains the method; it does not need an essay hook or personal rhetoric.

Check figures and tables against their declared reader question and linked claims. Inspect actual labels, arrows, source/data, scales, units, denominators, captions and alt text. Check the editable source and export together. An accurate caption does not repair a diagram that encodes a different relationship. Review the assembled section with its required illustrations and callouts. Verify figure/table/screenshot and relevant-instruction repository references against actual files and versions. A missing required illustration prevents a claim that the illustrated section is ready, even when the prose alone passes.

Check whether appendix and shared-resource selections support the explanation or researcher reuse, and whether private exploratory evidence is being disclosed without an established decision. Review the selection and transformation record and actual resource; a public file or repository name is not proof of permission. Keep a scientific defect, an editorial placement issue and a disclosure decision distinguishable in the findings.

For a requested inspector, reconcile generated-file coverage with the actual manifest and payloads. Check recorded agent/model identities, exact available instruction packets/followups, actual read records, outputs and revisions. Flag invented historical instructions, missing files and claims to unseen context. Review the rendered offline report and its controls as well as its narrative source; mark unavailable testing unperformed.

For a procedural section, check whether the reader can follow one complete, compatible sequence. Verify connections between inputs, outputs, tools and versions, not only the truth of each sentence in isolation. A list of accurate but disconnected operations can still fail the section purpose.

Give each material defect an ID and record its location, source conflict or missing reader contribution, consequence and requested repair. Keep factual conflicts in a separate findings list with the exact claim and evidence. Flag any authorial decision needed; do not insert new cautions, qualifications or a neutralised position without authority. A review-only request produces findings, not silent edits.

## 3. Save the writer's repair response

The writer reads the critic file and saves `critic-<section>-r01-repair.md` or equivalent. For every finding, record accepted, rejected with source-based reason, or unresolved. Link the actual changed passage and new draft version. Do not replace an author deletion with a newly worded version of the same material. Record an intentionally removed paragraph or section as removed, not as missing work.

Keep the original critique and draft version identifiable. Update the stage index to point to the revised draft, repair response and next reviewer. A repair plan or a statement that changes were made is not the revised draft.

## 4. Independently rereview the actual revision

A different agent from the writer reads the actual revised section in full, its current inputs and the repair response, then saves `critic-<section>-r02.md` or equivalent. It may be the original critic. Check every repair against the new text and repeat unit coverage for that revision. Check that deletions did not remove required substance and that repairs did not introduce new empty framing or unauthorised claims. Evaluate disputed rejections against sources, not the writer's confidence.

Record the reviewed version, resolved and open findings, coverage and verdict. Repeat repair and independent review while material issues remain. Do not call a writer's self-check independent. If no different agent is available, record independent review as unperformed; never report it as passed.

## 5. Parent author-fidelity handoff

The coordinating agent reads the current author source and deletions, purpose/reader declaration, brief, maps, actual revised draft, critique and repair response. Check that the assembled argument retains the author's claims, qualifications, emphasis and genre, with no restored deleted sections or invented rhetoric. Save `critic-<section>-author-fidelity.md` or the project's equivalent and update the stage index with the accepted version and unresolved author decisions.

Present the reviewed section to the author through the agreed review route before advancing to the next section. The author response becomes a file-backed source for the next stage. A critic verdict does not approve publication or external delivery.

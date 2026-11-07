---
name: designing-visuals-for-learning
description: "Use when designing or reviewing visuals for learning: slides, explanatory graphics, diagrams, interactive visualisations, animation, cognitive load. Video production is a separate skill."
---

# Designing Visuals for Learning

Design visuals around what the audience needs to understand and the cognitive work required to understand it. Manage extraneous cognitive load, direct attention and support conceptual integration across media. Visual appeal should help learners notice, understand and revisit the content. Use the relevant production tool for implementation.

## First Move: Classify the Job

Establish what the learner should understand, notice, decide or be able to do. Use supplied context; ask only for missing information that materially changes the design.

Treat work as instruction when success depends on understanding a real artefact, concept, relationship, process, decision or result. Website context does not make it promotional. Reframe a proposed instructional explanation that substitutes slogans, logo reveals or generic visual theatre for its subject. Pure branding or cosmetic layout work does not need this instructional workflow.

Read [the shared principles](references/principles.md) before planning or reviewing. Then read the relevant section of [the medium guide](references/guide-visual-media.md): slides, static graphics and diagrams, interactive views, or video. Do not impose video timings, narration or chapters on a static artefact.

## Build from Evidence

- Inspect the source material, real artefact or workflow, and learner context. State the outcome and assumed prior knowledge.
- Separate source statements, observed results, modelling assumptions and your interpretation. Mark illustrative examples as examples. Keep sources traceable to the claims they support.
- Demonstrate procedural claims with real states or faithful reconstructions. Verify required states before scripting; remove unsupported features rather than inventing generic interface behaviour.
- Choose a representation for the learning demand: stable inspection, comparison, sequence, change over time or exploration. Honour the requested medium; suggest a companion mode when it serves a distinct need.
- Retain qualifiers, units, denominators, uncertainty and relevant context when simplifying. A visual must not imply stronger evidence than its source.

## Plan the Explanation

Scale the plan to the task. A single diagram may need a few notes; a lesson needs a fuller map.

1. Identify the main relationship or process, prerequisite terms and likely misunderstanding.
2. Choose coherent explanatory units. Keep connected ideas available together; segmenting is not a fixed number of concepts, bullets, seconds or slides.
3. For each unit, specify what is visible, what words explain it, where attention goes and what evidence or example supports it. For dynamic media, add changes, timing or learner actions and a stable inspection state.
4. Choose motion according to learner knowledge and processing demand. Dense unfamiliar content often needs stillness. Modest motion may guide attention in an overview without depicting physical change. See the motion section in the principles.
5. Use overview-before-detail, clear relationship labels and an explanatory summary before external-source navigation where they solve an actual comprehension problem. These are patterns, not compulsory screens or sequences.
6. Plan access and learner control for the medium. Distinguish designed display text from accessibility captions; keep needed text in silent and self-paced materials.
7. Check understanding with an appropriate explanation, prediction, comparison or application task. Do not infer learning from visual polish or clicks alone.

Plan output: learning outcome and audience assumptions; sources and interpretation boundaries; explanatory sequence or layout; words, visuals and attention cues; access/navigation; editable sources and requested exports; review checks. Add narration, timings and chapters only for relevant media. For a review, return findings and proposed changes without rebuilding an unrequested deliverable.

## Pair Every Performance with a Self-Study Companion (house rule)

Dominik, 2026-11-06: "for any graphic, any animation that we do, we should also have like a self-exploratory version that's an HTML that people can go through and go through it step by step and spend time on it and have control." This applies principle 5 (navigation and learner control) and segmenting/pacing: a paced, narrated video or a live talk gives the learner no control, so the companion supplies it. The aim is that people understand the thing better, not a polished artefact.

- **Two media, one explanation.** The video (or the projected slides) is the attractive, paced performance. The companion is an HTML page with the same explanation that the learner works through step by step, at their own pace, with back, next, reset and keyboard controls.
- **Split the content by medium.**
  - On screen in a video or a talk: pictures, one point per screen, and a visual for each point. No PowerPoint-style titles on explainer screens, no labels that only restate the narration, no interface chrome, and no self-study notes or captions.
  - In the companion: descriptive titles, notes per step, the full widget interface, sources with page references, and links to the original.
- **Titles are for discovery.** Section and chapter titles are descriptive lead-ins built on a verb or a question ("What the paper is trying to solve", "How these systems run"), never single nouns or cute labels ("The problem", "The route"). They mark progress on the video's section cards and become the companion's clickable table of contents.
- **Video embedded with chapters.** The companion embeds the video. Each table-of-contents entry jumps the video to that section and opens the section's step-through, so a viewer can watch first and then explore.
- **Every animated scene has a stepped version.** Widgets have a video mode (figure only, no chrome) and a self-study mode (controls, notes, About). Illustrated scenes become stepped figures with the same states the video shows.
- **A companion is a small learning app, not a scroll.** Give it a home page that routes into each way of learning (watch, step through, explore figures, look up terms, read), a stepped two-pane view (the picture beside its explanation and source reference), a transcript that follows the video, the source's own key terms linked to where they are shown, and progress the learner can see. A single long page of figures and paragraphs reads as an archive, not as something to work through.
- **Talks too.** A slide deck gets a self-study companion: a summary per section, the talk's widgets in self-study mode, and links. A recording alone is not enough.

Production: `animated-talk-video` (video and companion page), `talkweaver-visuals` (widget modes), `talkweaver` (talk summaries).

## Review the Result

Apply relevant checks to the actual output; explain genuine non-applicability.

- Can a learner locate the important element and explain the intended relationship, process or decision?
- Do labels, spatial arrangement and connectors communicate the correct relationships? Do comparisons preserve their context?
- Do terminology, detail, pace and motion fit the assumed knowledge? Can learners inspect dense states?
- Are words and visuals complementary for this medium, with necessary reading text, captions and descriptions retained?
- Are evidence, interpretation and illustrative assumptions distinguishable? Do crops, scales or animations change the apparent claim?
- Can learners access the meaning and operate the relevant controls without relying solely on colour, hearing, pointer hover or motion?
- Are editable sources available alongside the requested output, with teaching content and provenance separable from rendering?

Review layouts, labels and key states; for interaction, exercise the controls and recovery path; for video, inspect representative frames and the full sequence. State what was actually checked. Design review is not evidence of learner comprehension; report learner testing separately when performed.

## Resources and Production Boundaries

- [Worked examples](references/examples-visual-instruction.md): compare how one explanation changes across media and how source navigation supports interpretation.
- [Validation cases](references/cases-visual-instruction.md): use when updating this skill or checking difficult applications.
- [Sources and evidence limits](references/sources-multimedia-learning.md): consult for research attribution; do not present every design pattern as an experimentally established principle.
- Slides: use the requested presentation production skill for its source format and rendering.
- Interactive walkthroughs: use `simulation-walkthrough` when available for implementation; this skill supplies the cross-medium instructional decisions, not a new component system.
- Video production: use `designing-instructional-videos` when available for storyboarding and production routes. This skill supplies cognitive and instructional design guidance; it does not prescribe a renderer or require the companion video skill.

Other skills can reuse `references/principles.md` with the relevant medium-guide section. Maintain the shared principles here instead of duplicating them across production skills.

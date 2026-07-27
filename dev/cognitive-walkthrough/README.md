# Cognitive Walkthrough Skill

An AI skill that performs a **cognitive walkthrough** on any user interface artefact — a generated mockup, a screenshot, a live URL, or a paper prototype — and produces a structured learnability report.

The method is not original to this skill. It comes from the Nielsen Norman Group: a task-based usability inspection where evaluators step through a workflow from the perspective of a new user and, at each step, answer four diagnostic questions about whether the interface guides the user toward success. The working reference is NN/g's article "Cognitive Walkthroughs", <https://www.nngroup.com/articles/cognitive-walkthroughs/> (retrieved 2026-05-22); the underlying method is older, from Lewis, Polson, Wharton and Rieman's work in the late 1980s.

What this skill adds is the agent adaptation: how a single model takes on roles a cross-functional team would normally split, where reports are written, and what shape they take. The method itself — the four questions, the binary pass/fail rule — is reproduced faithfully rather than reinterpreted.

## What this contains

`SKILL.md` is what Claude Code, Codex, or another harness agent reads when the skill triggers. It defines how to set up a walkthrough, what to write where, and how to report findings.

`references/` holds the deeper material, loaded only when needed rather than inlined into `SKILL.md`: the methodology source notes, a copy-ready report template, and the handoff recipe for `image-to-design` folders. Most single-file skills would bundle all of this into one document. This one is split because the methodology is detailed enough that an agent should be able to read the short contract first and reach for the source notes only when a judgement call depends on them.

## When to use the skill

Use cognitive walkthroughs when you want to spot **learnability problems** before running a real usability test. They are particularly useful when:

- A design is novel or unfamiliar and you cannot rely on existing user mental models.
- The interface is at an early stage — sketches, mockups, conceptual prototypes — where formal testing would be premature.
- You have an image or static reference and want a structured critique, not just "looks nice".
- You are iterating on a generated design from the [`image-to-design`](../image-to-design/) skill and want each version to be evaluated before the next prompt revision.

Cognitive walkthroughs are **not the right tool** for interfaces that follow ubiquitous patterns (a standard ecommerce checkout, a familiar settings panel). Established conventions absorb learnability problems that this method is designed to surface, so the inspection becomes noise.

## How it relates to image-to-design

The relationship is a **handoff**, not a dependency. `image-to-design` produces a folder layout like:

```text
design-plans/<slug>/
├── 02-design-brief.md
└── versions/v1/
    ├── image-01.png
    └── prompt-v1-option-01.txt
```

This skill reads that folder when present, runs a walkthrough against `image-01.png` using the task implied by the brief, and writes the report alongside the image. The same skill works on inputs that have nothing to do with `image-to-design` — a screenshot dragged into a chat, a deployed URL, a Figma export — so the integration is opt-in, not load-bearing.

## Methodology in brief

For each task the user is meant to accomplish, the agent breaks the workflow into discrete steps. At every step the agent answers, from a new user's perspective:

1. *Will users try to achieve the right result?*
2. *Will users notice that the correct action is available?*
3. *Will users associate the correct action with the result they're trying to achieve?*
4. *After the action is performed, will users see that progress is made toward the goal?*

If any of the four answers is **No**, the step fails. Each failing step gets a recorded reason and, where possible, a concrete suggested fix. The report is structured so it can feed straight back into the next design revision.

## Files

| Path | Purpose |
|---|---|
| `SKILL.md` | The skill specification consumed by harness agents. |
| `references/methodology.md` | Source notes from the NN/g article: the verbatim four questions, the pass/fail rule, the worked example. |
| `references/report-template.md` | Copy-ready structure for a walkthrough report. |
| `references/integration-image-to-design.md` | Handoff recipe for the `image-to-design` folder layout. |

## Modifying the skill

If you fork or edit this, keep two things intact. The four questions must stay verbatim — paraphrasing them quietly changes what the method measures, and a report whose questions have drifted is no longer a cognitive walkthrough. And the pass/fail rule must stay binary: three Yes answers and one No is a Fail, not a partial pass, because the whole point is to surface every place a new user can lose the thread.

`references/methodology.md` is the authority on both. If it and `SKILL.md` ever disagree, the reference file is correct and `SKILL.md` is the file to fix.

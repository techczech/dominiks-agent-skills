# Cognitive Walkthrough Skill

An AI skill that performs a **cognitive walkthrough** on any user interface artefact — a generated mockup, a screenshot, a live URL, or a paper prototype — and produces a structured learnability report.

The method comes from the Nielsen Norman Group: a task-based usability inspection where evaluators step through a workflow from the perspective of a new user and, at each step, answer four diagnostic questions about whether the interface guides the user toward success. See <https://www.nngroup.com/articles/cognitive-walkthroughs/>.

## What this repo contains

- **`SKILL.md`** at the top level is what Claude Code, Codex, or other harness agents read when the skill is triggered. It defines how the agent should set up a walkthrough, what to write where, and how to report findings.
- **`references/`** holds the deeper methodology notes and the report template, loaded only when needed (progressive disclosure).

Most ad-hoc skills bundle everything into a single `SKILL.md`. This one is heavier because cognitive walkthroughs have non-trivial methodology that benefits from progressive disclosure.

## When to use the skill

Use cognitive walkthroughs when you want to spot **learnability problems** before running a real usability test. They are particularly useful when:

- A design is novel or unfamiliar and you cannot rely on existing user mental models.
- The interface is at an early stage — sketches, mockups, conceptual prototypes — where formal testing would be premature.
- You have an image or static reference and want a structured critique, not just "looks nice".
- You are iterating on a generated design from an image-generation/design-iteration workflow and want each version to be evaluated before the next prompt revision.

Cognitive walkthroughs are **not the right tool** for interfaces that follow ubiquitous patterns (a standard ecommerce checkout, a familiar settings panel). Established conventions absorb learnability problems that this method is designed to surface, so the inspection becomes noise.

## How it relates to design-iteration workflows

The relationship is a **handoff**, not a dependency. Some design-iteration workflows produce a folder layout like:

```text
design-plans/<slug>/
├── 02-design-brief.md
└── versions/v1/
    ├── image-01.png
    └── prompt-v1-option-01.txt
```

This skill reads that folder when present, runs a walkthrough against `image-01.png` using the task implied by the brief, and writes the report alongside the image. The same skill works on inputs that have nothing to do with that layout — a screenshot dragged into a chat, a deployed URL, a Figma export — so the integration is opt-in, not load-bearing.

## Methodology in brief

For each task the user is meant to accomplish, the agent breaks the workflow into discrete steps. At every step the agent answers, from a new user's perspective:

1. *Will users try to achieve the right result?*
2. *Will users notice that the correct action is available?*
3. *Will users associate the correct action with the result they're trying to achieve?*
4. *After the action is performed, will users see that progress is made toward the goal?*

If any of the four answers is **No**, the step fails. Each failing step gets a recorded reason and, where possible, a concrete suggested fix. The report is structured so it can feed straight back into the next design revision.

## Project structure

| Path | Purpose |
|---|---|
| `SKILL.md` | The skill specification consumed by harness agents. |
| `references/` | Methodology source notes and the report template. |

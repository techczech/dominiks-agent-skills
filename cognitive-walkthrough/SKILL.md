---
name: cognitive-walkthrough
description: "Run a structured cognitive walkthrough on any UI artefact — generated mockup, screenshot, live URL, paper prototype, Figma export — to evaluate learnability from a new user's perspective. Walks the user's task step by step, answers the four Nielsen Norman diagnostic questions per step, and writes a Markdown report with pass/fail verdicts and concrete fixes. Trigger this whenever the user asks for a cognitive walkthrough, learnability review, UX inspection, expert critique of a UI image, evaluation of a prototype, design review from a user's perspective, or wants to know whether a new user could actually complete a task on this interface — even when they don't use those exact words. Especially relevant after a new design mockup is generated and before the next revision, or when an interface is novel enough that established usability heuristics will miss its specific failures."
---

# Cognitive Walkthrough

Run a cognitive walkthrough on a UI artefact. The method is from the Nielsen Norman Group: pick a task, step through it as a new user, and at each step answer four diagnostic questions. Any *No* fails the step. The output is a short Markdown report with a verdict per step and a concrete fix where one is implied.

This skill is design-agnostic. The artefact can be a generated mockup, a screenshot, a deployed URL, a Figma export, or a paper prototype photographed and dropped into the conversation.

## Hard Rules

- Keep the four questions verbatim from `references/methodology.md`. Paraphrase only when you also quote the verbatim form alongside.
- Apply the binary pass/fail rule: any single *No* across the four questions fails the whole step. Three Yes + one No is still Fail.
- One report file per (artefact × task) pair. Two tasks on the same screen produce two reports.
- The agent's findings are an inspection by a model adopting a new-user persona. They are *not* observed user behaviour. Report wording must not imply real users were tested.
- When the artefact uses standard, ubiquitous patterns (typical ecommerce checkout, standard settings panel), say so and recommend a different method. Do not fabricate findings to fill a template.

## When to Use

- Novel or unfamiliar workflows where users have no existing mental model.
- Early-stage prototypes, sketches, conceptual mockups.
- After a design-iteration workflow generates a new mockup version and before the next prompt revision.
- Any time the user wants a structured critique anchored in a defined user task rather than a free-form opinion.

## When Not to Use

- Standard patterns with established conventions.
- Production interfaces where real usability data is available — that data trumps inspection.
- Tasks where the bottleneck is performance, content quality, or backend behaviour rather than learnability.

## Core Workflow

1. Locate the artefact (image path, screenshot, URL).
2. Derive the task and scenario (see *Task Source Priority* below).
3. Pick the persona — default *new user with no prior exposure to this system*.
4. Decide step granularity — default *goal-oriented sub-tasks* (group related controls).
5. Walk the task step by step. For each step, answer the four questions from `references/methodology.md` verbatim, with a one-line reason for each.
6. Mark the step pass or fail using the binary rule.
7. Where the failure suggests a concrete change, write a one-line fix.
8. Choose the output folder using *Output Location* below.
9. Write the report using `references/report-template.md`.
10. If multiple tasks are in scope, repeat from step 2 with a new report file.

## Task Source Priority

Resolve the task in this order. Stop at the first source that gives a usable answer.

1. **Explicit prompt.** The user states the task in the request ("walk through new-patient check-in on this screen"). Use it verbatim.
2. **Design brief.** When the artefact lives inside a `design-plans/<slug>/` folder layout (as produced by a design-iteration workflow), read `design-plans/<slug>/02-design-brief.md` and use the *Primary user task* field. If multiple tasks are listed, pick the one the user implied or ask which.
3. **Inferred by agent.** Inspect the artefact, propose one to three candidate tasks, present them as a numbered list, and ask the user to confirm or edit before continuing. Do not run a walkthrough on an unconfirmed inferred task.

Record which source was used in the report frontmatter (`task_source: prompt | brief | inferred`).

## Persona

Default: a new user with no prior exposure to the system, reading at the artefact's intended language level, no domain expertise unless the artefact targets specialists.

The user may set an alternate persona ("walk through as a low-literacy patient", "as a clinician with three years on a similar EHR"). Capture the persona in frontmatter and let it shape the answers to the four questions, especially Q3 (action–result association).

## Step Granularity

Default: *goal-oriented sub-tasks*. Group related controls into one step when they form a single sub-goal (filling a form section plus the Next button). Use single-control granularity only when a single control's discoverability or labelling is the load-bearing question.

Be consistent within one walkthrough. Six to twelve steps for a typical task is a good range. More than fifteen is usually too granular; fewer than three usually too coarse.

## Output Location

- **Inside a `design-plans/` folder layout:** write to `design-plans/<slug>/versions/vN/walkthroughs/<task-slug>.md`. Create the `walkthroughs/` directory if missing. The artefact context is already in the parent folder, so the report file is self-contained with frontmatter links upward.
- **Standalone (any other case):** write to `<target-project>/cognitive-walkthroughs/<artefact>-<task-slug>/` with two files:
  - `00-meta.md` — captures the artefact, persona, links, original request.
  - `walkthrough.md` — the report itself.

When the artefact is a remote URL with no local target project, write to the current working directory under `cognitive-walkthroughs/` and tell the user where the report went.

`<task-slug>` is a short kebab-case identifier derived from the task ("new-patient-checkin", "returning-patient-update").

## File Naming

- Co-located: `walkthroughs/<task-slug>.md`.
- Standalone: `<artefact>-<task-slug>/walkthrough.md` where `<artefact>` is a short identifier of the source (`image-01`, `checkout-screenshot`, `pricing-page`).

Do not name files generically (`walkthrough.md` at the top of the standalone folder is fine because the folder name disambiguates it).

## Report Shape

Use `references/report-template.md` as the canonical structure. The frontmatter captures machine-readable fields; the body has one section per step containing the four questions in a table plus a verdict and fix line.

The report must include:

- Frontmatter: `task`, `task_source`, `persona`, `artefact`, `artefact_path`, `date`, `steps_total`, `steps_failed`.
- A short *Scenario* paragraph naming the situation in which the user attempts the task.
- One section per step with the per-question table and the verdict.
- A *Summary* section listing every failing step and its proposed fix.
- A *Method note* paragraph stating that this is an agent-driven inspection, not observed user behaviour.

## Integration with design-iteration folders

Some design-iteration workflows version generated mockups in a `design-plans/<slug>/versions/vN/` folder layout. When the user invokes this skill on an artefact inside such a folder:

1. Read `00-meta.md`, `02-design-brief.md`, and `versions/vN/manifest.yml` for context.
2. Use *Primary user task* from the brief as the task source if the user did not state one.
3. Write the report under `versions/vN/walkthroughs/<task-slug>.md`.
4. If the report fails one or more steps, suggest concrete prompt changes the user could feed into the next design revision (vN+1).

The integration is opt-in detection of a folder shape, not a dependency: this skill never modifies files owned by the design workflow (no edits to `manifest.yml`, no prompt rewrites, no version bumps), and it never generates a new image.

## Live URLs and Interactive Artefacts

When the artefact is a live URL and a browser-automation tool is available (`chrome-devtools-mcp` or `playwright`), the agent may:

1. Open the URL and capture a screenshot of the relevant view.
2. Walk through interactively if the task requires it (clicking through multiple screens).
3. Save the captured screenshots alongside the report so the walkthrough is reproducible.

When no browser tool is available, ask the user for a screenshot rather than fabricating one.

## Verdict Wording

For each step, the *Verdict* line takes one of two forms:

- *Pass.* (No fix needed; nothing else on the line.)
- *Fail (Qn).* *Fix:* one short sentence describing the change.

If multiple questions failed, list them: *Fail (Q2, Q3).*

## Method Notes

This is a learnability inspection focused on new or inexperienced users. Other usability dimensions (efficiency for expert users, error recovery, accessibility for screen-reader users, performance) are out of scope unless the user explicitly extends the persona.

When the artefact is appropriate for the method but a step's verdict depends on information the agent cannot see (microcopy hidden behind a hover, dynamic state on click), say so in the reason rather than guessing.

## Verification

Before reporting the walkthrough as complete:

- Frontmatter present with all required fields.
- Every step has all four questions answered with a reason.
- Every Fail step has either a fix line or an explicit note that no fix is implied.
- The method note is present.
- The output path is correct for the case (co-located vs standalone).

## References

- `references/methodology.md` — NN/g source notes, including the verbatim four questions and pass/fail rule.
- `references/report-template.md` — copy-ready structure for the walkthrough report.

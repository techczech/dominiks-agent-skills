# Cognitive Walkthrough Methodology — Source Notes

Reference notes extracted from the Nielsen Norman Group article on cognitive walkthroughs (<https://www.nngroup.com/articles/cognitive-walkthroughs/>). Treat this file as the link between the public methodology and the skill's own instructions. If `SKILL.md` and this file ever diverge on the four questions or the failure rule, this file is correct and `SKILL.md` should be updated.

## Definition

A **cognitive walkthrough** is a task-based usability-inspection method in which a cross-functional team systematically evaluates an interface's *learnability* by walking through each task step from the perspective of a new user.

The purpose is to evaluate learnability without running a formal usability study. It is cheaper than user testing and applicable earlier in the design process.

## Preparation

Three pieces of preparation drive the rest of the method.

### User representation

Pick the user types whose perspective the team will adopt during the walkthrough. NN/g recommends defining these through user personas. The default focus is **new or inexperienced users** of the system, because learnability is the property being inspected.

### Task selection

Choose specific tasks rather than reviewing the whole interface. Pick tasks that are high-traffic, critical, or representative of the hardest parts of the workflow. Each task should have a clear definition of completion.

### Scenario

For each task, set up a realistic situation in which a user would attempt it. The scenario gives the walkthrough its grounding — without it, the team drifts into abstract critique.

## Roles

- **Facilitator** — performs the task aloud, step by step, pausing at each discrete step so the group can answer the four questions.
- **Evaluators** — interpret the new user's perspective. May include UX specialists, product owners, engineers, domain experts. Cross-functional composition matters; a single perspective produces a thinner walkthrough.
- **Recorder** — documents answers, pass/fail determinations, and design-improvement opportunities.

The agent-driven adaptation collapses these roles into one model. Compensate by being explicit about each role: declare which role the agent is performing at each moment.

## The four questions (verbatim)

At every step, the team asks:

1. *Will users try to achieve the right result?*
2. *Will users notice that the correct action is available?*
3. *Will users associate the correct action with the result they're trying to achieve?*
4. *After the action is performed, will users see that progress is made toward the goal?*

These four questions are the methodological core. Do not paraphrase them silently in any output. If a softer wording helps the report read naturally, include the verbatim question alongside the paraphrase.

## Step granularity

The facilitator decides step granularity in advance. A "step" can be a single click, but it can also be a grouped sub-task (filling in a form section plus pressing Next). Keep granularity consistent within one walkthrough.

## Pass/fail rule

> If any of the questions results in a determination of *No*, the entire step would be marked as Fail.

This is binary by design. A step that limps along on three Yes answers and one No is still a Fail. The point is to surface every place where a new user can lose the thread.

## What gets recorded

For each step:

- Step number and name.
- The four answers (Yes / No), with a short reason for each.
- Overall pass/fail determination.
- Suggested design improvement, when one is implied by the failure.

## Worked example — health clinic tablet

NN/g uses a tablet app for a health clinic to demonstrate. Two tasks:

1. Patient check-in for a new patient.
2. Record update for a returning patient.

In one analysed step, a new-patient selection screen, the verdict was:

- Q1 *Yes* — receptionist directs the patient and a header states the intent.
- Q2 *Yes* — buttons are clearly visible with strong visual styling.
- Q3 *No* — patients have to mentally rule out options that don't apply; "Patient Search" might look more correct than "New Patient".
- Q4 *Yes* — confirmation appears after selection.

Verdict: **Fail**, because of Q3. Recommended improvement: ask the patient up front whether they are new or returning, so the irrelevant options never appear.

This is a good model for the kind of report this skill should produce: terse, evidence-anchored, ending in a concrete fix.

## When the method is and isn't appropriate

Appropriate:

- Complex, novel, or unfamiliar workflows.
- Systems where users have no existing mental model.
- Early conceptual prototypes.
- Situations with limited time or budget for usability testing.

Not appropriate:

- Interfaces using standard, ubiquitous patterns.
- Typical ecommerce checkouts where users have extensive prior experience and the deviation from convention is small.

For the agent: when the artefact under review is conventional, say so in the report and recommend a different evaluation method rather than fabricating findings.

## Source

Nielsen Norman Group, "Cognitive Walkthroughs", <https://www.nngroup.com/articles/cognitive-walkthroughs/>. Retrieved 2026-05-22.

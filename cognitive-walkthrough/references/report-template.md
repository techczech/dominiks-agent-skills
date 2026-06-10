# Walkthrough Report Template

Copy this structure when writing a walkthrough report. Replace `{{PLACEHOLDER}}` markers with real values; remove any optional field that has nothing meaningful to record.

The frontmatter is machine-readable; treat field names as a contract. Tools that consume reports (a design-iteration workflow, a comparison viewer, an audit script) rely on the exact keys below.

```markdown
---
task: "{{One-sentence task statement, e.g. 'New patient checks in on tablet'}}"
task_source: prompt | brief | inferred
persona: "{{Default 'new user with no prior exposure'; override if user specified}}"
artefact: "{{Short identifier — image-01, checkout-screenshot, pricing-page}}"
artefact_path: "{{Path relative to the report file, or full URL}}"
date: YYYY-MM-DD
steps_total: 0
steps_failed: 0
links:
  brief: "{{Optional: relative path to 02-design-brief.md if used}}"
  manifest: "{{Optional: relative path to manifest.yml if inside a design-plans layout}}"
  source_request: "{{Optional: original user prompt if useful}}"
---

# Walkthrough — {{Artefact}} — {{Task}}

## Scenario

{{One short paragraph naming the situation in which the user attempts the task. Who they are, where they are, what they want, what triggered them to start. Two to four sentences. Concrete, not abstract.}}

## Step 1 — {{Short step name}}

| # | Question | Answer | Reason |
|---|---|---|---|
| 1 | Will users try to achieve the right result? | Yes / No | {{One line}} |
| 2 | Will users notice that the correct action is available? | Yes / No | {{One line}} |
| 3 | Will users associate the correct action with the result they're trying to achieve? | Yes / No | {{One line}} |
| 4 | After the action is performed, will users see that progress is made toward the goal? | Yes / No | {{One line}} |

**Verdict:** Pass. *— or —* **Verdict:** Fail (Q3). **Fix:** {{One short sentence}}

## Step 2 — {{Short step name}}

| # | Question | Answer | Reason |
|---|---|---|---|
| 1 | Will users try to achieve the right result? | Yes / No | {{One line}} |
| 2 | Will users notice that the correct action is available? | Yes / No | {{One line}} |
| 3 | Will users associate the correct action with the result they're trying to achieve? | Yes / No | {{One line}} |
| 4 | After the action is performed, will users see that progress is made toward the goal? | Yes / No | {{One line}} |

**Verdict:** Pass / Fail (Qn). **Fix:** {{If failed}}

<!-- Continue with Step 3, Step 4, … until the task is complete. -->

## Summary

- Total steps: {{N}}
- Failing steps: {{N}}
- Fixes suggested: {{N}}

### Failing steps and fixes

- **Step {{n}} ({{name}}):** Fail ({{Qn}}). {{Fix sentence.}}
- **Step {{n}} ({{name}}):** Fail ({{Qn, Qm}}). {{Fix sentence.}}

<!-- If all steps passed, write: "All steps passed. No fixes required at this granularity." -->

## Method note

This walkthrough was conducted by an AI agent adopting the persona above and applying the Nielsen Norman cognitive walkthrough method (<https://www.nngroup.com/articles/cognitive-walkthroughs/>). The findings are an expert-style inspection of learnability for new users; they are not observed behaviour from real users and should not be treated as evidence of how actual users will behave. Use them as inputs to design revision, not as a substitute for usability testing.
```

## Notes for the agent

- Keep reasons to one line each. If a reason needs more space, the granularity of the step is probably wrong — split the step rather than expanding the reason.
- The four question texts inside the table are verbatim. Do not edit them.
- A failing step's Fix sentence should describe a change to the *interface*, not a change to the user's behaviour ("ask new/returning first" — good; "users should look harder" — bad).
- When verdicts hinge on information the agent cannot observe (hover state, dynamic content, post-click behaviour), state the limitation in the reason rather than guessing.
- The Summary section is the part most often used to feed back into the next design revision. Keep it scannable.

# Methods and Relevance Template

Use this template when a paper's methods deserve a full audit *and* you need to
say what the paper is worth now. It is [methods-deep-dive.md](methods-deep-dive.md)
with an explicit **Relevance for Today** reading appended.

Reach for it when the paper is older than its field's turnover rate, when the
technology or population it studied has since changed, or when someone is about
to cite it as current evidence and you need to judge whether the methods still
license that use. Keep the two halves separate: audit the methods on their own
terms first, then ask what has changed since.

---

## YAML Header Template

```yaml
---
type: review
review_style: methods-and-relevance
paper_key: {ZOTERO_KEY}
paper_title: "{FULL_TITLE}"
reviewed_date: "{YYYY-MM-DDTHH:MM:SSZ}"
reviewer: "Claude Code"
status: completed
duration_minutes: {MINUTES}
tags:
  - "methodology"
  - "reproducibility"
  - "relevance"
  - "{specific-method-tag}"
links:
  - "[[{folder-name}/00-source]]"
  - "[[{folder-name}/extracts/methods]]"
---
```

Replace all `{PLACEHOLDERS}` with actual values.

---

# Methods and Relevance: {PAPER_TITLE}

**Paper**: {Full Citation}
**Reviewed**: {Date}

---

## Methods Summary

<!-- High-level overview of methodology (1-2 paragraphs) -->


---

## Study Design

### Type

<!-- RCT, observational, meta-analysis, qualitative, mixed methods, etc. -->
<!-- Justify whether the design is appropriate for the research question -->


### Population

<!-- Who was studied? -->
<!-- Include: target population, sampling frame, inclusion/exclusion criteria -->


### Intervention/Exposure

<!-- What was manipulated or measured? -->
<!-- For experiments: describe intervention in detail -->
<!-- For observational: describe exposure and how it was assessed -->


### Outcomes

<!-- What was measured? -->
<!-- Primary and secondary outcomes -->
<!-- Measurement instruments and validation -->


### Sample Size and Power

<!-- How many participants? -->
<!-- Was a power analysis conducted? -->
<!-- Is the sample size adequate for the analyses? -->


---

## Data Collection

### Instruments/Measures

<!-- How was data collected? -->
<!-- Reliability and validity of measures -->


### Procedure

<!-- Step-by-step data collection process, timeline, setting -->


### Quality Control

<!-- Pilot testing, inter-rater reliability, validation checks -->


---

## Analysis Plan

### Pre-registration

<!-- Was the analysis pre-registered? Did they follow the plan? -->
<!-- If not pre-registered, are there signs of p-hacking or forking paths? -->


### Statistical Methods

<!-- What analyses were performed? Are they appropriate? -->


### Software/Tools

<!-- What software, packages, versions? -->


### Assumptions

<!-- What assumptions are required? Were they tested? -->


---

## Reproducibility Assessment

### Data Availability

<!-- Public repository? Upon request? Not available? -->


### Code Availability

<!-- GitHub? Supplement? Upon request? Not available? -->


### Documentation Quality

<!-- Could I replicate this from the paper alone? What is missing? -->


### Reproducibility Score

- **Data**: Available/Upon Request/Not Available
- **Code**: Available/Upon Request/Not Available
- **Documentation**: Excellent/Good/Adequate/Poor
- **Overall**: High/Medium/Low


---

## Methodological Strengths

<!-- What did they do well methodologically? Be specific. -->

-
-


---

## Methodological Weaknesses

<!-- What could be improved? Be specific. -->

-
-


---

## Relevance for Today

<!-- The section that distinguishes this template from methods-deep-dive. -->
<!-- Judge the paper as present-day evidence, not as a historical artefact. -->

### What Has Changed Since Publication

<!-- Technology, population, policy, measurement practice, baseline conditions. -->
<!-- Name the specific changes, with dates, not a general sense of movement. -->


### Which Findings Still Hold

<!-- Findings whose support does not depend on what has changed. -->
<!-- Say why the change does not reach them. -->

-
-


### Which Findings Have Expired

<!-- Findings whose support depended on conditions that no longer obtain. -->
<!-- Say which condition failed and what that does to the claim. -->

-
-


### What the Paper Is Still Good For

<!-- Method to borrow? Instrument to reuse? Baseline to measure against? -->
<!-- A paper can be superseded on findings and still valuable on design. -->


### How It Should Be Cited Now

<!-- The one-sentence guidance a citing author needs. -->
<!-- e.g. "Cite for the elicitation protocol, not for the accuracy figures." -->


### Open Questions It Leaves

<!-- What would need re-running, and under what conditions, to settle this? -->

-
-


---

## Alternative Approaches

<!-- What else could have been done? Trade-offs? -->


---

## Replication Notes

<!-- What would replicating or extending this study require today? -->


---

## Review Metadata

**Review Style**: Methods deep dive plus relevance assessment
**Focus**: Methodological rigour, and standing as current evidence
**Depth**: Comprehensive
**Audience**: Researchers deciding whether and how to cite or build on the paper

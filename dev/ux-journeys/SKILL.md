---
name: ux-journeys
description: Elicit and lock user journeys (the aim, the situations the user arrives from, what they see, are told and do at each step, and when it is right) before visual design. Use at the start of design work on an app or feature, or when a design keeps missing.
---

# UX Journeys

If `references/local.md` exists, read it: it holds the local conventions for this workspace and overrides this file where they differ.

The artefact is a **user journey**: in service of a named **aim**, from a **situation**, a sequence of *sees → told → does*, ending in a *right-when* condition. An app's design IS its journeys; a mockup is one surface those journeys pass through. This skill runs BEFORE visual design (`design-first-dev`, PRD gate); `cognitive-walkthrough` asks the same questions AFTER build as the closing check.

## Propose, don't ask

The user often holds a clear recognition of when a design is right and an unclear articulation of why. Direct questions ("what should happen here?") fail against that. Draft concrete candidate journeys and let the user correct them — correction is cheap where specification is impossible. A wrong guess is not a failure; it is the probe that surfaces what the user couldn't state. (The founding case: a repo-sync tool went through three redesigns without a specified journey.)

## Process

### 1. Name the aims

One sentence per aim: what the user is trying to have be true, not what the app does. "Every repo on every machine is safe, and I can tell at a glance" — not "sync repos". An app has few aims; if you have listed seven, some are journeys.

### 2. Enumerate the situations

The moments the user arrives: what just happened, what they already know, what they want or fear. Ask briefly, then propose situations they didn't name — arriving at a machine after days away, mid-task interruption, something looks wrong, showing someone else. Situations the user rejects are recorded as out of scope.

### 3. Storyboard candidate journeys — half visual, half textual

For each situation, draft 2–3 **divergent** candidates. **A storyboard is a sequence of rough UI sketches with short captions — never a wall of text** (learned on the first real use: journeys are journeys *of interfaces*, and recognition needs something to look at). Equally, never full mockups — polish, typography and colour belong to the design rounds that follow, and an expensive frame defeats cheap divergence.

Each state = one **rough sketch** + one caption line:

- Sketch: lo-fi wireframe — boxes, labels, greyscale, and **concrete data as real strings in the frame** ("3 repos ahead on the laptop, one diverged", never lorem or "some items"). Inline SVG or minimal HTML blocks, in whatever format your review tool renders; an ASCII frame is acceptable only for a trivially simple surface.
- Caption: `Sees / Told / Does` in one line each at most.

```markdown
## Journey: <name>  (aim: <aim>)
Situation: <what just happened; what the user knows and wants>

### 1. <state name>
<rough sketch — svg/html block>
Sees: … — Told: … — Does: …

### 2. …

Right when: <the condition the user would state as "done, and I trust it">
```

Divergence matters for the same reason design rounds demand it: recognition needs genuinely different candidates to fire against — different *shapes of journey*, not one journey re-worded.

### 4. Correct and lock

The user corrects against recognition; iterate. Two conditions harden a lock beyond recognition alone (a convincing storyboard can win recognition and still fail real use):

- **Walk one candidate with representative data before locking** — the user's real data, real documents, real corpus sizes; where relevant, include the interruption, error and recovery states, not only the happy path.
- **The *right-when* is observable, not affective** — written so a test could assert it ("the window shows zero unsafe repos and the last-checked time"), which is also what seeds the e2e assertions later.

Locked journeys are design artefacts: `docs/design/<date>-<topic>/journeys.md`, committed the turn they are produced (design artefacts never live in a temp folder), and the lock recorded in the design ADR alongside the mockup lock.

### 5. Bind features to journeys

Every feature links to the journey(s) it serves. A feature serving no journey is flagged to the user — usually a roadmap candidate or a delight, never silently kept or silently dropped.

### 6. Hand to visual design

Design rounds render **journey states**, not a home screen: the mockup set covers every locked journey's states, and the written surfaces-and-states list each round ships derives from the journeys. Absence stays visible — a journey state no round has drawn is an open item, not a builder's guess.

## Scale

Not everything needs the full loop. A small feature inside already-locked journeys gets a single journey sentence ("from <situation>, the user can now <do> and knows <told>") attached to the feature. The loop collapses to a point; it is never skipped silently.

# Integration with `image-to-design`

How this skill consumes `image-to-design`'s folder layout and feeds its findings back into the next revision.

The two skills are independent. `image-to-design` does not need to know `cognitive-walkthrough` exists. `cognitive-walkthrough` recognises the folder shape and uses it when present; otherwise falls back to its standalone layout. Nothing in `image-to-design`'s `SKILL.md` has to change for this to work.

## The folder shape this skill expects

```
design-plans/<slug>/
├── 00-meta.md                 ← target surface, inputs, constraints
├── 01-content.md              ← real text and content for the mockup
├── 02-design-brief.md         ← purpose, audience, primary user task
└── versions/
    └── v1/
        ├── manifest.yml       ← workflow state, sources, generation settings
        ├── prompt-v1-option-01.txt
        ├── prompt-v1-option-02.txt
        ├── image-01.png
        ├── image-02.png
        ├── notes.md
        └── walkthroughs/      ← this skill writes here
            ├── new-patient-checkin.md
            └── returning-patient.md
```

The `walkthroughs/` directory does not exist by default. Create it on first use.

## Detecting that you are inside an `image-to-design` folder

Heuristic: the path contains `design-plans/<slug>/versions/v<N>/` and a sibling `02-design-brief.md` exists at `design-plans/<slug>/02-design-brief.md`.

When the input artefact path matches that shape, switch to the co-located layout. Otherwise use the standalone layout described in `SKILL.md`.

## Files to read for context

In priority order:

1. **`02-design-brief.md`** — the *Primary user task* heading is the canonical task source when the user has not stated one explicitly. *Purpose and audience* informs the persona. *Required states or variants* tells you which task variants matter.
2. **`00-meta.md`** — the *Original request* and *Constraints* sections set the boundaries of what the design is trying to do. Useful when a step's verdict depends on whether a constraint was intentional ("no images of patients" → a step that calls out a missing photo is wrong, not right).
3. **`01-content.md`** — the real wording that should appear in the artefact. If a step's Q3 verdict hinges on a label being unclear, check whether the brief specifies that label.
4. **`versions/vN/manifest.yml`** — generation settings and source references. Less load-bearing for the walkthrough itself, but useful for the *Method note* and links in the report frontmatter.
5. **`versions/vN/prompt-vN-option-XX.txt`** — the exact prompt sent to the image model. If the walkthrough finds a problem that traces back to a missing instruction in the prompt, name that prompt file in the fix sentence.

## What goes in the report frontmatter

Fill the `links` block in the report frontmatter using paths relative to the report file:

```yaml
links:
  brief: "../../../02-design-brief.md"
  manifest: "../manifest.yml"
  source_request: "../prompt-v1-option-01.txt"
```

These paths assume the report lives at `design-plans/<slug>/versions/vN/walkthroughs/<task>.md`. Adjust if the structure differs.

## Feeding findings back into the next revision

When the report has one or more failing steps, end with a short *Suggested prompt revisions* section *outside* the report file, in a chat message back to the user. Do not embed prompt-revision suggestions inside the walkthrough file — that file is the inspection record, not a revision plan.

The chat message should:

- Group fixes by what they imply for the generated image.
- Distinguish *prompt-level* fixes ("add 'Ask new or returning' as a pre-step in the prompt") from *interaction-level* fixes that the image alone cannot capture ("the fix is a conditional flow, not a layout change — recommend a state diagram alongside the next mockup").
- Recommend the user create a new version (`v(N+1)`) per the `image-to-design` workflow, with the failing-step fixes folded into the new prompt.

This keeps responsibility cleanly split: `image-to-design` owns versioning and prompt mechanics; `cognitive-walkthrough` owns the inspection and the *what to change* signal.

## Multiple tasks against one image

A single image can fail one task and pass another. When the design brief lists multiple primary tasks, ask the user which to walk through, or run separate walkthroughs and produce one report file per task. The naming convention (`<task-slug>.md`) prevents collisions.

## When the brief is missing or vague

If `02-design-brief.md` exists but does not contain a clear *Primary user task*, fall back to the *inferred + confirm* task source from `SKILL.md`. Propose one to three candidate tasks based on the image and the rest of the brief, and ask the user to confirm.

If no brief exists at all (the artefact is just an image dropped into the conversation), treat the input as standalone even if the file system happens to look like a `design-plans` folder.

## What this integration does *not* do

- It does not modify any file owned by `image-to-design` (no edits to `manifest.yml`, no rewrites of prompts, no version bumps).
- It does not generate a new image. Image generation stays in `image-to-design`.
- It does not require `image-to-design`'s SKILL.md to mention this skill. The two skills are siblings, not parent/child.

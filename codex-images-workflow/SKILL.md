---
name: codex-images-workflow
description: "Manage reproducible generated-image artefacts."
---

# Codex Images Workflow

Use this skill when generated images are project artefacts that should be reproducible later.

## Workflow

1. Create the target folder first.
2. Write a Markdown brief before generating any image.
3. Generate the image from that brief.
4. Copy the generated image into the repo.
5. Keep the image and the brief side by side.
6. Add or update version notes when iterating.

## Folder Rules

- Keep generated visuals in a dedicated repo folder such as `generated-images/`.
- Add a local `AGENTS.md` in that folder when the repo will likely generate more than one image.
- Keep folder instructions generic and workflow-focused, not project-copy-specific.

## Brief Rules

Create one Markdown brief per image or per tightly related image set.

Each brief should contain:

- `Title`
- `Version`
- `Status`
- `Purpose`
- `Audience`
- `Required elements`
- `Content to show`
- `Visual direction`
- `Exact generation prompt`
- `Revision notes`

If multiple screens are requested, prefer one brief per screen unless the screens are intentionally one board.

## Naming Rules

- Use stable descriptive filenames.
- Pair each image with a matching Markdown file.
- Prefer names like:
  - `project-screen-01-review.png`
  - `project-screen-01-review.md`

Keep the current approved asset at the unversioned stable filename.

## Versioning

Use explicit version labels in the brief:

- `v1` first usable concept
- `v1.1`, `v1.2` small revisions
- `v2` major redesign

When a revision materially changes the design direction, keep versioned copies as needed:

- `project-screen-01-review.v1.png`
- `project-screen-01-review.v1.1.png`

Keep the brief revision notes short:

- `v1` initial concept
- `v1.1` revised to use real source text
- `v1.2` reduced product styling and tightened layout

## Content Rules

- Prefer real project text over placeholder copy when available.
- Match the image to the actual use case: review application, research dashboard, poster, workflow diagram, and so on.
- Avoid generic SaaS conventions unless the user explicitly wants that style.
- If the image is for research or academic use, make it look like a research application, not a sales product.

## Output Rules

- Do not leave final artefacts only in Codex cache paths.
- Copy generated images into the repo.
- Do not create orphaned images without matching briefs.
- If replacing an image, verify whether the user wants the old version preserved.

## Good Defaults

- Start with one concise brief, then generate.
- For multiple related screens, keep a shared visual direction but separate prompts.
- Use British spelling when the project context suggests it.
- Keep prompts specific enough to avoid generic image output, but keep folder instructions abstract and reusable.

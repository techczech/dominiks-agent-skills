---
name: image-to-design
description: "Plan, generate, version, and implement UI designs from visual references. Use when the user asks for UI mockups, generated design concepts, visual design exploration, an image or screenshot turned into HTML/CSS, side-by-side comparison of design versions, or a revision of a previously generated mockup."
---

# Image to Design

Use this skill when a visual design should be planned, generated as one or more images, iterated in versions, and then translated into HTML/CSS or a frontend implementation.

The point is to make visual work reproducible. Do not leave the design only in chat or in transient image-generation output. Create a small design planning folder first, store the original request, the image prompt, any content used in the mockup, the generated images, and any later revision prompts.

## Hard Rules

- Use an image-generation model or image-generation tool for mockup images. Do not substitute hand-written SVG, HTML, CSS, canvas code, or a drawn diagram when the workflow calls for generating a design image.
- Save bitmap image outputs, normally PNG or JPG. SVG files are not generated mockup images for this workflow unless the user explicitly asks for SVG.
- If image generation is unavailable, stop and say that the image step is blocked. Do not fake the image step with code.
- When the user asks for multiple design directions, run separate image generations and save separate image files. Do not put multiple designs into one generated image, comparison sheet, collage, grid, or contact sheet unless the user explicitly asks for that.
- Prefer separate prompts per option when exploring alternatives, because independent runs produce more useful variation than one prompt asking for several designs at once.

## Core Workflow

1. Create a design planning folder in the target project.
2. Capture the original request in `00-meta.md`.
3. Create or collect the content that must appear in the mockup in `01-content.md`.
4. Describe the design intent in `02-design-brief.md`.
5. Write version metadata in `versions/v1/manifest.yml`.
6. Write the exact image-generation prompt in `versions/v1/prompt-v1-option-01.txt`.
7. Generate one bitmap image from only that prompt text.
8. For more design directions, repeat with `prompt-v1-option-02.txt`, `prompt-v1-option-03.txt`, and separate image-generation runs.
9. Save each image beside its prompt, manifest, and notes.
10. Use the selected image as the visual reference for HTML/CSS implementation.
11. When the user asks for changes, create a new version folder and preserve the older version.
12. If requested, build a simple local HTML browser to compare versions side by side.

## Folder Layout

Default to this layout unless the project already has a better convention:

```text
design-plans/
└── [design-slug]/
    ├── 00-meta.md
    ├── 01-content.md
    ├── 02-design-brief.md
    ├── review.html
    └── versions/
        ├── v1/
        │   ├── manifest.yml
        │   ├── prompt-v1-option-01.txt
        │   ├── prompt-v1-option-02.txt
        │   ├── image-01.png
        │   ├── image-02.png
        │   └── notes.md
        └── v2/
            ├── manifest.yml
            ├── prompt-v2-option-01.txt
            ├── image-01.png
            └── notes.md
```

Use `v1`, `v2`, `v3` for materially different directions. Use `v1.1` only for tiny prompt repairs that preserve the same direction.

## Planning Files

### `00-meta.md`

Capture:

- Original request, quoted or closely paraphrased.
- Date.
- Target surface: page, app screen, component, slide, report, dashboard, poster, or other artefact.
- Final implementation target: plain HTML/CSS, React, Astro, Tailwind, shadcn/ui, or the project default.
- Inputs supplied by the user: screenshots, brand colours, URLs, copy, existing files, design references.
- Constraints: accessibility, responsive needs, real content that must be preserved, privacy boundaries.

### `01-content.md`

Use this file when the design needs text, data, labels, navigation items, example records, or scenario copy.

Prefer real project content when available. If mock content is needed, make it plausible for the user’s actual project and label it clearly as mock content. Do not let image generation invent important wording that will later be treated as source text.

### `02-design-brief.md`

Describe:

- Purpose and audience.
- Primary user task.
- Visual hierarchy.
- Colours, materials, typography, density, and layout.
- Required states or variants.
- What the image should show in the first viewport.
- What the generated image should avoid.

Make the brief specific enough to guide image generation but broad enough to permit several useful design directions.

## Prompting Generated Mockups

Use two files for each generated design version:

- `manifest.yml` for metadata, workflow state, source references, and generation settings.
- `prompt-vN-option-XX.txt` for the exact text to send to the image model for one run.

Prefer this split over YAML frontmatter in the prompt file. Frontmatter is compact, but it is too easy to accidentally send it to the image model when copying a prompt manually. A separate manifest makes the boundary obvious: the manifest is for the workflow, and the prompt text is for generation.

If a project strongly prefers one Markdown prompt file, put metadata in YAML frontmatter and strip the frontmatter before generation. Do not send YAML metadata, headings, version notes, or provenance text to the image model.

Name the prompt file with the version number even though it also lives in a version folder:

- `versions/v1/prompt-v1-option-01.txt`
- `versions/v1/prompt-v1-option-02.txt`
- `versions/v2/prompt-v2-option-01.txt`

This makes copied prompts and review bundles self-describing when files are moved around.

Write the prompt before generating images. Include:

- The screen or component type.
- Layout and interaction hints.
- Content that must be visible.
- Colour direction and contrast requirements.
- Typography and spacing direction.
- Device or aspect ratio.
- Any reference-image influence.
- Negative instructions for generic or misleading visuals.

Keep `prompt-vN-option-XX.txt` clean. It should contain only text intended for the image model. If generation needs negative instructions, include them as part of the generation prompt text, not as administrative notes.

Ask for complete UI screenshots or mockups, not abstract mood boards, unless the user asks for mood exploration. For frontend work, the image should reveal concrete layout decisions that can be implemented.

When writing the prompt, explicitly ask for one bitmap UI screenshot/mockup. Do not ask the model to create an SVG, draw the interface with code, or place several alternatives on one canvas.

If the user asks for multiple suggestions, generate separate prompts, separate image-generation runs, and separate image files:

- `versions/v1/prompt-v1-option-01.txt`
- `versions/v1/image-01.png`
- `versions/v1/prompt-v1-option-02.txt`
- `versions/v1/image-02.png`
- `versions/v1/prompt-v1-option-03.txt`
- `versions/v1/image-03.png`

Only put multiple alternatives into a single generated image when the user explicitly wants a comparison sheet. The default is always independent images for variability.

## Using Inputs

When the user provides a screenshot, colour palette, logo, content file, or example site:

- Record it in `00-meta.md`.
- Copy or reference local source files where project rules allow it.
- Describe the input influence in `02-design-brief.md`.
- Record source paths and generation settings in `versions/vN/manifest.yml`.
- Include only generation-relevant visual constraints in `versions/vN/prompt-vN-option-XX.txt`.

If using a screenshot as the basis for redesign, say whether the new image should preserve layout, preserve brand style, or only borrow selected cues.

## Versioning Revisions

When the user asks for a change to a generated design:

1. Identify the source version and selected image, such as `v1/image-02.png`.
2. Keep `v1` unchanged.
3. Create the next version folder, such as `versions/v2/`.
4. Copy forward the relevant metadata into `versions/v2/manifest.yml`.
5. Copy forward the model-ready text from the selected source prompt, such as `v1/prompt-v1-option-02.txt`, into `v2/prompt-v2-option-01.txt`.
6. Edit the new prompt text to include the requested change.
7. Add `versions/v2/notes.md` with source version, requested change, and what changed.
8. Generate a new bitmap image from only `prompt-v2-option-01.txt` and save it in `v2`.

Do not overwrite an older image unless the user explicitly asks to replace it.

## HTML/CSS Implementation

After the user selects a generated design:

- Treat the image as a reference, not as a pixel-perfect contract unless requested.
- Implement the visible structure, spacing, hierarchy, colours, and states.
- Use real text from `01-content.md` where available.
- Follow the target project’s existing framework and styling conventions.
- Keep image-specific artefacts in the planning folder; put production code in the project’s normal source tree.
- If text in the generated image is garbled, use the content file and design brief as the authority.

For responsive work, verify the implementation at desktop and mobile widths. The generated image usually captures one viewport; the implementation still needs sensible behaviour outside that viewport.

## Implementation Reality Check

After translating a selected mockup into HTML/CSS or frontend code:

- Treat generated text as visual placeholder unless it came from `01-content.md`.
- Use the content file and source material as the authority for wording.
- Extract or recreate visual assets only when they are part of the selected direction.
- Record deliberate deviations from the mockup in `versions/vN/notes.md`.
- If the user asks for close or pixel-level replication, compare an actual implementation screenshot against the reference image before handoff.
- If the implementation cannot match the image because of missing assets, layout constraints, or content length, state the tradeoff and keep the chosen compromise in the planning notes.

## Side-by-Side Browser

When the user asks to compare versions, create or update `review.html` in the design planning folder. It should be a static local page that loads images from the `versions/` folders and shows:

- Version name.
- Image filename.
- Short notes if available.
- Images in a responsive side-by-side grid.

Prefer the bundled helper from this skill folder:

```bash
python3 scripts/build_design_browser.py design-plans/[design-slug]
```

The page should work by opening the HTML file directly in a browser.

## Templates

Use the templates in `templates/design-plan/` when creating a new planning folder:

- `00-meta.md`
- `01-content.md`
- `02-design-brief.md`
- `manifest.yml`
- `prompt-v1-option-01.txt`
- `notes.md`

Copy only the templates that are useful for the current task, then fill them with the user’s actual project context.

## Good Defaults

- Match the spelling and terminology conventions already used in the surrounding project.
- Prefer three visually distinct image suggestions for open-ended design exploration, created as three separate image-generation runs.
- Prefer one selected design image before writing production HTML/CSS.
- Keep prompts concrete and implementation-minded.
- Keep model-bound prompt text separate from YAML metadata.
- Block SVG/code substitutes when the task is to generate a mockup image.
- Use stable, plain filenames.
- Store every meaningful design decision in the planning folder before acting on it.

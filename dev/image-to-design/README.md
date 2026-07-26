# image-to-design

## Scope

A reproducible workflow that takes a design from a written brief, through generated mockup images, screenshots, or other visual references, to an HTML/CSS or frontend implementation. Every prompt, image, and revision is kept on disk in a design planning folder instead of scrolling away in a chat log.

Use it whenever someone asks for UI mockups, visual design exploration, generated design concepts, image-to-HTML/CSS conversion, side-by-side comparison of design versions, or a revision of a previous generated mockup.

## Contents

- `SKILL.md` — the full procedure: folder layout, prompting rules, versioning, implementation checks.
- `templates/design-plan/` — starter files for a new planning folder.
- `scripts/build_design_browser.py` — builds a static `review.html` that shows every saved version side by side.

## Requirements

Python 3.9 or later for the review-page script. No third-party packages. The image steps need an image-generation model or tool available to the agent; the skill deliberately refuses to fake them with hand-written SVG or code.

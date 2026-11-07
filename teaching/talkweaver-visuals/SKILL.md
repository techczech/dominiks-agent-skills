---
name: talkweaver-visuals
description: "Use when a TalkWeaver presentation needs SVG figures, interactive HTML widgets or a source-linked visual gallery."
---

# TalkWeaver visuals

Author presentation visuals and their portable gallery. Use `talkweaver` for outline, Pathway, recording and app-content operations; this skill supplies the visual-asset workflow.

## Establish the visual job

- Resolve the exact user-selected Talk folder and owning repository. Read its instructions, current outline and existing assets/gallery before suggesting additions. Reuse an existing candidate when it explains the intended relationship.
- For suggestions, anchor each proposal to an actual slide/section and say what the audience should understand. Distinguish a new visual from an already available gallery candidate. Suggestions alone do not authorise rebuilding the talk.
- For production, choose the representation around the explanation: stable comparison, labelled process, evidence trail, dated change, or meaningful interaction. Use `designing-visuals-for-learning` when planning an instructional visual.
- Preparing assets does not authorise insertion, app saves or publication. Unless requested, leave the outline, generated presentation, ledger and slide history untouched.

## Widgets are for the room, not for reading

Dominik's correction (3 Nov 2026): widgets came out too complicated, full of caveats, and some looked worse on the audience screen. Every widget is shown to a room while he talks. Before building one, load `designing-visuals-for-learning` and apply its multimedia principles (coherence, signalling, redundancy, spatial contiguity). Then:

- **One idea per widget.** Show the relationship he will talk about, at a size readable from the back of a room. Cut anything he will not point at.
- **No caveats, footnotes or method notes on the widget face.** Put all background in an **About** panel: a small "About" link in the bottom-right corner that opens sources with links and access dates, how it was made (selection, calculations, settings), qualifications, and a dated credit naming the actual authoring agent and provider (for example, "Made for Dominik Lukeš with Codex (OpenAI)"). Preserve original credits on unchanged reused assets. Widgets are also browsed on their own in handouts, so the panel must stand alone. Facts only: nothing about the conversations, requests or process that produced it. Speaker notes hold only what he will say.
- **Few words.** Labels, not sentences. If it has a heading, keep it to a few words; never repeat the slide title as a paragraph.
- **A screenshot is not a widget.** A captured page goes straight onto the slide as an image (`![](assets/…png)`), with a `[qr:URL]` to where it came from. For a live website, prefer an `[embed: URL]` slide plus a saved view or screenshot as the fallback, since TalkWeaver now supports both.
- **Simple, scalable layout.** Prefer one fixed canvas scaled as a whole (SVG `viewBox` or CSS scale) and logos in fixed boxes that keep their proportions. Making the audience window match the presenter view is TalkWeaver's job, not a check for agents (roadmap: widgets-look-the-same-on-the-audience-screen).
- **No boxes around labels when position already shows the relationship.** A logo placed right beside its name, or a name placed inside a ring, column or region, needs no frame, pill or rounded box; boxes only add visual noise. Encode extra facts (open or closed weights, region) with a small marker or the text colour, not a frame. Keep boxes only where the box itself means something, such as a step in a process.
- **Clicks, not hovers.** Every interaction is a click (or key press) that makes a visible change on the slide itself: something appears, moves or is highlighted. Hover and tooltips never carry content. The opening state already makes the point. Getting each click's change onto the audience screen is TalkWeaver's job (roadmap: presenter-drives-embeds-on-audience-screen).

## Place files beside the outline

Use the selected Talk folder, not a new chat or Documents folder:

```text
<talk>/
  <talk>-outline.md                  existing canonical presentation
  widgets/<subject>.html            portable interactive deliverables
  assets/<subject>.svg               standalone static figures
  assets/tool-screenshots/           real captures, when requested
  research/                         editable copy/data, JS/CSS/builds, evidence, receipts
  gallery-<subject>-visuals.html     one browseable, self-contained gallery
```

Keep authored copy/data canonical in Markdown with YAML frontmatter. Separate behaviour, styling and packaging; build the HTML from those sources. `single-html-document` supplies the packaging workflow. A renderer must enumerate its own inputs rather than ingesting every `content-*.md` schema in the folder.

When exporting existing research assets into a Talk, copy the intended files with source/destination hashes and provenance. Keep the research originals intact. Treat the copied files as portable exports, with an explicit refresh rule rather than two independently maintained sources.

## Design and content conventions

- Dominik's established default: SVGs omit an overall visible title; embedded HTML widgets have a visible heading because they may be enlarged without slide context. Follow a different current brief when supplied. SVG accessibility titles/descriptions can remain.
- **Widgets are reused in videos.** `animated-talk-video` shows a talk's widget as a scene (N39) instead of redrawing it, so a widget must render headless at 1920x1080 with no interaction needed for its main state, and, where it builds in steps, expose those steps (for example a `?step=N` parameter or `data-step` states) so a video can reveal them in time with speech. Add a video mode (`?video=1`): the figure alone, filling the frame, with no header, step buttons, Notes, About, Reset or self-study captions. Those belong to the self-study mode, which stays the default (Dominik, 2026-11-06: "when showing widgets don't show the full ui that end users use but not video audience"; companion rule in `designing-visuals-for-learning`).
- **Logos wherever a company or product is named.** Not only on charts: in diagrams, tables, labels, cards and About panels, put the official mark next to the name so the room recognises it at a glance. Take marks from TalkWeaver's bundled sets in `compiler/assets/icons/` (`svgl.json`, `simple-icons.json`, `extra.json`; concept icons in `lucide.json`, `tabler.json`, `concept-icons.json`) and credit the set in the About panel. If a mark is missing, add it to TalkWeaver's shared set rather than keeping a one-off copy: `scripts/add-icon.mjs <term> --svg-file … --source … --license …` (LobeHub Icons static SVGs, Simple Icons, or the maker's own press kit), on a branch with a pull request, so every later talk can use it. Use concept icons (an open set such as Lucide, ISC) for roles, actions and media types (microphone, speaker, document, image, code) where they help recognition, not as decoration. Keep marks in fixed boxes at their own proportions with readable contrast (white marks on dark backplates, dark on light). Never invent or redraw a logo; if no mark exists, use the name alone.
- Make HTML standalone and offline: inline media, CSS, JS and data; no runtime fetch, CDN font, adjacent-file dependency or storage/origin assumption. Use native controls and preserve focus when updating views.
- Give every gallery candidate its supporting source links. Add verified author, year, title and DOI/arXiv/version for papers where relevant. Link a historical paper version when a later revision has a different title or scope.
- Get the evidence right, but keep it off the widget face. Versions, settings, denominators and dates go in the About panel (and `research/`); the face shows only the comparison he is making.
- When screenshots are requested, establish the authorised surface. Label public interface, product page, research announcement or repository accurately. Record URL, capture time, viewport and hash. Use real browser captures; try a small number of legitimate public fallbacks if blocked, then record unavailable. Never substitute generated UI, a bot challenge or a login wall as a screenshot of the product. See [sources and screenshots](references/sources-and-screenshots.md).

## Gallery and insertion contract

Read [the gallery contract](references/gallery-contract.md) when creating or extending a gallery. Keep previews, version labels, source links and two independently copyable code blocks together. Compute candidate counts from the catalogue.

**Content only — widget:**

```markdown
[Simulation: widgets/example.html]
```

**Content only — SVG:**

```markdown
![](assets/example.svg)
```

**Separate suggested title and layout:**

```markdown
### Suggested slide title {layout=media}
```

No slide heading or title text belongs in a content-only block, including SVG alt text. Paths resolve relative to the outline, not the gallery or research folder. Check unfamiliar syntax against the installed TalkWeaver reference; the examples above were verified on 27 October 2026.

Clicking either block or its Copy button copies exactly that block. Copy feedback changes the button/status, never the code text. Provide a clipboard fallback and exact manual selection when clipboard access is denied.

## Verify and deliver

- Rebuild after a representative Markdown edit, observe the changed output, restore and rebuild. Check every referenced local asset and any export-copy hashes.
- Test from `file://` and in the relevant iframe sandbox. On the inspected TalkWeaver version, local HTML runs with `allow-scripts allow-forms` and an opaque origin; do not add `allow-same-origin` to make a widget work. The Interact chip or `e` key enables controls. Recheck the installed contract when behaviour/version differs.
- Inspect rendered visuals. At the intended slide size (the case used 1600 × 800), exercise meaningful states for clipping, labels and control access; do not rely on document height alone. Test narrower widths, keyboard focus, reset and modal Escape/return focus as applicable.
- Verify gallery filters/search, enlarged/static previews, optional live widget previews and repeated exact copying. Stub clipboard calls in tests; do not read or overwrite the user's system clipboard.
- Register delivered HTML and capture reusable visuals in the project's research collection using available local tools. On Dominik's machines, see `references/worked-case-and-registration.md` (private, not in the published copy). Report prepared/rendered/checked separately from app-inserted/exported/published.
- Hand over one gallery link and the asset locations. Honour an explicit full-code-only request; otherwise avoid flooding chat with every asset's source.

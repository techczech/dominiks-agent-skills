# Research Results And Development Plan

## Scope

This report summarizes research findings for a reusable skill that creates rich single-file HTML deliverables from complex report, presentation, course, gallery, dashboard, or knowledge-base websites.

The target output is a modern browser-openable `.html` file that can be shared instead of a PDF or PowerPoint. The preferred size range is 10-30 MB, with an upper practical range around 100 MB when the content warrants it.

The research strongly supports a two-stage architecture:

1. Build a full website first from separated content, templates/components, CSS, JavaScript, and media.
2. Package the working site into one self-contained HTML deliverable only at the end.

## Main Conclusion

Single-file HTML should be treated as a delivery artifact, not the authoring format.

The best architecture is:

- Markdown/YAML/JSON source content
- typed content normalization at build time
- a normal local website with separate assets during development
- automated packaging into one HTML file
- strict audit against unresolved local dependencies
- browser verification from `file://`

This keeps authoring maintainable while producing a polished portable report.

## Browser And Format Findings

### Data URLs

`data:` URLs are useful for embedding small-to-medium assets inline, especially images, icons, fonts, and compact payloads. MDN describes them as a way to embed small files inline and documents their syntax as `data:[<media-type>][;base64],<data>`.

Research implications:

- Use `data:` URLs for images and modest static assets.
- Do not use huge `data:` anchors as the primary download mechanism for large attachments.
- Do not rely on top-level `data:` navigation.
- Treat `data:` resources as embedded resources, not as the whole application model.

Important browser constraints:

- Modern browsers treat `data:` URLs as unique opaque origins.
- Chromium and Firefox document `data:` URL limits around 512 MB; Safari/WebKit documents a larger limit, but this is not a good design target.
- Modern browsers block top-level navigation to `data:` URLs for security reasons.

Sources:

- [MDN: data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data)

### Base64 Size Cost

Base64 encoding represents 24 input bits as four encoded characters, meaning three input bytes become four output characters before any surrounding `data:` prefix or JSON escaping. In practical terms, raw binary payloads grow by about one third before compression effects are considered.

Research implications:

- Base64 is acceptable for portability but must be budgeted.
- A 20 MB image set can become roughly 26-27 MB as Base64 before HTML overhead.
- Compress text, JSON, SVG, and HTML-like payloads before Base64 when size matters.
- Compressing already-compressed JPEG/PNG/WebP/PDF files may help less and should be tested.

Sources:

- [RFC 4648: Base64 encoding](https://datatracker.ietf.org/doc/html/rfc4648)

### Blob URLs

`blob:` URLs are a better runtime representation for larger embedded resources that need to be displayed or downloaded after page load. MDN documents that object URLs should be released with `URL.revokeObjectURL()` when no longer needed and that they can support range requests.

Research implications:

- Store large attachments as Base64 or gzip+Base64 records.
- Decode to `Blob` only when the user opens, previews, or downloads the item.
- Create object URLs on demand.
- Revoke object URLs after use, but not so early that user interactions break.
- Use `Blob` URLs rather than multi-megabyte `href="data:..."` anchors for downloads.

Sources:

- [MDN: blob URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob)
- [MDN: HTMLAnchorElement.download](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download)

### Downloads

The `download` attribute communicates that a linked resource is intended to download and can suggest a filename. MDN notes that the browser may not always use it, so the runtime should still be robust.

Research implications:

- Use `a.download` with Blob URLs for embedded PDFs, CSVs, spreadsheets, ZIPs, or slide decks.
- Do not make Markdown, TXT, YAML, JSON, or source notes downloadable by default. Render them into the report.
- Label generated downloads clearly as separate artifacts.

Sources:

- [MDN: HTMLAnchorElement.download](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download)

### Compression Streams

The Compression Streams API is broadly available in modern browsers and supports gzip/deflate compression and decompression. MDN documents `CompressionStream` and `DecompressionStream`, including conversion back to `Blob` through `Response`.

Research implications:

- For 10-100 MB deliverables, gzip+Base64 embedded payloads are a strong option.
- Use compression mainly for text-heavy data: Markdown, JSON, HTML fragments, SVG, transcript text, search indexes, and source notebooks.
- Use `DecompressionStream("gzip")` at runtime in modern browsers.
- Consider a fallback only if older browser support becomes a requirement. The stated target is modern browsers, so the skill can default to the native API.

Sources:

- [MDN: Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API)

### `file://` And JavaScript Modules

MDN documents that JavaScript modules run into CORS errors when loaded locally from `file://`. MDN also notes that `file:` URLs are often treated as opaque origins so local files cannot freely read each other.

Research implications:

- The final output must not rely on external module files.
- The final output should have all runtime JavaScript inline or bundled into the HTML.
- Do development and normal site testing through a dev server, but verify the final packaged file from disk.
- Avoid runtime `fetch("./content.json")`, `import("./chunk.js")`, root-absolute asset paths, and split chunks in the final deliverable.

Sources:

- [MDN: JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Origin and opaque origins](https://developer.mozilla.org/en-US/docs/Glossary/Origin)

## Build Tool Findings

### Vite

Vite is a good default for rich interactive single-file reports because it already supports React, TypeScript, asset handling, CSS bundling, minification, and Rollup/Rolldown escape hatches.

Research-backed configuration points:

- Use `base: "./"` or `base: ""` so generated paths are relative.
- Use `build.cssCodeSplit: false` for simpler final packaging.
- Use imported assets for anything that must be inlined.
- Be careful with `public/`: Vite serves and copies public assets as root paths, and the docs generally recommend importing assets unless the public-directory guarantees are specifically needed.
- Vite inlines assets below `build.assetsInlineLimit`, but the single-file workflow often needs stricter packaging than the default 4 KiB threshold.

Sources:

- [Vite: build options](https://main.vitejs.dev/config/build-options.html)
- [Vite: static asset handling](https://vite.dev/guide/assets)

### `vite-plugin-singlefile`

`vite-plugin-singlefile` is a practical first packaging tool for Vite sites, but its own documentation has caveats:

- It inlines JavaScript and CSS resources.
- Static resources in `public/` are not inlined by Vite or by the plugin.
- SVG handling may require another loader or direct template inclusion.
- Other referenced files may still escape inlining.

Research implications:

- Use it for direct-inline mode, not as the only guarantee.
- Always run a custom audit afterward.
- Avoid `public/` for assets that must be portable.
- Treat `vite-plugin-singlefile` as a packaging helper, not a complete deliverability proof.

Sources:

- [vite-plugin-singlefile README](https://github.com/richardtallent/vite-plugin-singlefile)

### Astro And Eleventy

Astro and Eleventy are strong candidates for content-heavy reports because they natively support Markdown-first authoring and build-time rendering.

Astro findings:

- Content collections are designed for structured sets of content.
- Astro supports local Markdown/MDX/YAML/TOML/JSON content through build-time loaders.
- Schemas are Zod-backed and provide validation plus TypeScript support.

Eleventy findings:

- Front matter supports YAML, JSON, and JavaScript through `gray-matter`.
- Layouts wrap content through front matter.
- Eleventy is a good fit for content pages and templated reports where interactivity is modest or progressively enhanced.

Research implications:

- For rich app-like deliverables, default to Vite + React + TypeScript.
- For mostly document/report/course content, Astro or Eleventy can be a cleaner source-site layer.
- Even with Astro or Eleventy, the final packaging rules remain the same: one HTML file, no required adjacent assets or source text files.

Sources:

- [Astro: content collections](https://docs.astro.build/en/guides/content-collections/)
- [Eleventy: front matter data](https://www.11ty.dev/docs/data-frontmatter/)
- [Eleventy: layouts](https://www.11ty.dev/docs/layouts/)

### Next.js

Next.js static export can generate HTML/CSS/JS assets for static hosting. The official docs say `next build` can generate an HTML file per route in static export mode, but features requiring a Node.js server or runtime dynamic logic are not supported.

Research implications:

- Next.js is not the preferred default for this skill.
- It may be acceptable when converting an existing Next project, but packaging into one HTML file will require additional bundling/auditing.
- The static-export model outputs a static site, not a single-file report.

Sources:

- [Next.js: static exports](https://nextjs.org/docs/pages/guides/static-exports)

### Capture Tools

SingleFile is useful for saving an already-rendered page as one HTML file. Its README describes it as a web extension and CLI for saving a complete page into a single HTML file.

Research implications:

- SingleFile is useful for capture, inspection, and emergency conversion of an existing page.
- It is not the recommended authoring architecture for reusable report generation.
- It may not preserve all dynamic app behaviours depending on scripts, lazy loading, iframes, and runtime state.

Sources:

- [SingleFile README](https://github.com/gildas-lormeau/SingleFile)

### Web Bundles

Web Bundles look conceptually close to the goal, but they are not viable as the default deliverable. Chrome’s own documentation says navigation to Web Bundles was removed from Chrome in February 2023, and that the API is only supported in Chromium-based browsers behind an experimental flag.

Research implications:

- Do not use Web Bundles as the primary architecture.
- Use ordinary `.html` as the portable distribution format.

Sources:

- [Chrome Developers: Web Bundles](https://developer.chrome.com/docs/web-platform/web-bundles/)

## Recommended Architecture

### Layer 1: Source Content

Use human-editable source files:

- Markdown for prose
- YAML front matter for page metadata
- YAML/JSON for structured records
- media folders for source images, figures, attachments, and slide exports
- optional transcript/source-note folders

Content should be separated into:

- site metadata
- page/chapter records
- figure records
- attachment records
- source/provenance records
- navigation model
- theme/design tokens

The content model should represent behaviour explicitly. Tabs, figures, callouts, timelines, galleries, comparison tables, downloadable artifacts, and provenance panels should be structured data, not accidental HTML fragments scattered through Markdown.

### Layer 2: Content Compiler

Compile source content before rendering.

Responsibilities:

- parse Markdown and front matter
- validate schemas
- normalize IDs and slugs
- resolve references between pages, people, figures, attachments, and records
- render Markdown to HTML where appropriate
- generate search index data
- generate table of contents/navigation data
- generate source appendix data
- generate attachment manifests
- report missing files, broken references, duplicate IDs, and large payload risks

Output:

```text
src/data/generated/
├── site.generated.json
├── pages.generated.json
├── records.generated.json
├── figures.generated.json
├── search.generated.json
├── sources.generated.json
└── attachments.generated.ts
```

### Layer 3: Normal Website

Build a normal website first.

Development structure:

```text
project/
├── content/
├── media/
├── scripts/
├── src/
│   ├── components/
│   ├── data/generated/
│   ├── routes-or-views/
│   └── styles/
├── package.json
└── vite.config.ts
```

Requirements:

- CSS and JavaScript remain separate during development.
- Components render typed data.
- The site works through a local dev server.
- The site can optionally build multiple normal HTML pages for development preview.
- Routing for the packaged output uses hash routing, in-page anchors, or an embedded single-page app model.

### Layer 4: Single-File Packaging

Choose one of three packaging modes.

#### Mode A: Direct Inline

Use for:

- mostly textual reports
- modest images
- few or no large attachments
- target size under roughly 30 MB

Mechanism:

- inline CSS and JavaScript
- inline imported assets as data URLs
- avoid split chunks
- avoid public assets
- audit final HTML

Default implementation:

- Vite
- React/TypeScript where useful
- `vite-plugin-singlefile`
- strict custom audit

#### Mode B: Embedded Manifest With Blob Materialization

Use for:

- richer reports
- downloadable PDFs/CSVs/spreadsheets
- many images
- target size 30-100 MB

Mechanism:

- embed assets and attachments as records
- Base64 or gzip+Base64 payload field
- decode on demand
- create `Blob` URLs for preview/download
- revoke object URLs carefully

This is the right mode for reports that need attachments.

#### Mode C: Compressed Bootstrap

Use for:

- very large text-heavy reports
- full source notebooks
- transcript-heavy event reports
- archive browsers
- when raw inline HTML becomes unwieldy

Mechanism:

- small HTML shell
- embedded compressed payload block
- `DecompressionStream("gzip")` at startup
- hydrate the app from decompressed JSON/assets

Tradeoff:

- better transport size
- less readable source HTML
- slightly more startup work
- requires modern browser APIs

## Content And Attachment Policy

The research supports a strict distinction between reader content and distributable artifacts.

Reader content:

- Markdown reports
- notes
- transcripts
- source manifests
- JSON records
- prompt text
- YAML metadata
- evidence summaries
- speaker/session notes

These must be rendered inside the HTML.

Downloadable artifacts:

- PDF
- CSV
- XLSX
- PPTX
- ZIP
- original images where users need the source files
- other binary files that have independent value outside the report

These may be embedded as Base64/gzip+Base64 records and exported with Blob URLs.

Practical rule:

If a user needs a local text file to understand the report, the single-file export is incomplete.

## Size And Performance Strategy

### Size Budgets

Recommended budgets:

- 0-10 MB: excellent
- 10-30 MB: preferred target for rich reports
- 30-100 MB: acceptable for media-heavy or transcript-heavy deliverables
- over 100 MB: needs explicit justification and stronger lazy loading

### Techniques

- Convert large PNG screenshots to WebP or AVIF where acceptable.
- Keep original PDF/CSV downloads only when needed.
- Avoid embedding duplicate images at multiple sizes unless necessary.
- Use lazy loading for image-heavy galleries.
- Decode large Base64 attachments only on demand.
- Compress text-heavy payloads with gzip before Base64.
- Precompute search indexes instead of parsing source text at runtime.
- Consider virtualized lists for thousands of records.
- Avoid heavy client libraries unless they add real value.
- Remove source maps from final deliverables unless debugging is explicitly needed.

### Expected Startup Model

For smaller files:

- browser parses HTML
- app initializes immediately
- images load lazily through data URLs

For larger files:

- minimal shell renders first
- payload decompresses
- navigation/search becomes available
- attachments decode only when requested

## UX Requirements

The deliverable should feel like a designed product, not a dumped file.

Required patterns:

- strong title/scope/date first viewport
- clear information hierarchy
- sidebar, tabs, anchor navigation, or section index
- searchable long content
- responsive layout
- keyboard-operable controls
- visible focus states
- print styles for reports, briefings, event notes, and course pages
- source/provenance areas where evidence matters
- density appropriate to the domain: dashboards should be compact; presentations can be more visual

Avoid:

- generic placeholder layouts
- external font dependencies
- CDN dependencies
- decorative-only UI
- text hidden behind download links
- card-in-card page structure
- huge hero-only pages where report content starts below the fold

## Security And Privacy

Single-file HTML can carry more data than it appears to carry.

Required checks:

- no secrets in embedded data
- no API keys
- no unnecessary personal data
- no unexpected remote requests
- no analytics
- no CDN scripts
- no remote fonts unless explicitly allowed
- no local file paths exposed in reader-facing UI unless provenance requires them
- clear marking of generated content and source confidence where relevant

Because the file is easy to share, privacy review is part of packaging.

## Audit Requirements

Strict audit should fail on:

- `<script src=...>` in the final deliverable
- `<link rel="stylesheet" href=...>` in the final deliverable
- `modulepreload`
- split chunk references
- root-absolute `/assets/...`
- local `.md`, `.txt`, `.json`, `.yaml`, `.yml`, `.js`, `.css` links required for reading
- runtime `fetch("./...")` or `import("./...")`
- `public/` asset leakage
- external fonts/CDNs
- giant `data:` URLs used as download anchors
- missing source appendix when source text files were provided

Strict audit may allow:

- external citation links
- remote video or hosted slide embeds when intentionally required
- Blob URL download creation
- PDF/CSV/XLSX/PPTX/ZIP attachment exports

## Recommended Skill Workflow

1. Clarify deliverable type: report, presentation, dashboard, course page, gallery, wiki, archive browser, or event report.
2. Inventory source content and classify each file as reader content, source/provenance content, media, or downloadable artifact.
3. Design the content schema.
4. Build or reuse a normal website project.
5. Implement the rich UI against generated data.
6. Verify the normal site locally.
7. Package into a single HTML file using the appropriate mode.
8. Run strict audit.
9. Open the packaged file from disk and test:
- navigation
- search
- tabs
- images
- attachments
- print mode
- offline behaviour
10. Deliver the `.html` file and, when useful, keep source project files for regeneration.

## Development Plan For The Skill

### Phase 1: Skill Contract And Research Docs

Deliverables:

- Rewrite the skill instructions around the two-stage architecture.
- Include the content/download policy.
- Include the packaging-mode decision table.
- Include this research report as a reference.

Acceptance criteria:

- A future agent knows that the final HTML must include all reader text.
- The skill clearly says to build the normal site first and package second.

### Phase 2: Content Schema Toolkit

Deliverables:

- Define reusable schema patterns for:
- report pages
- presentation sections
- figures
- attachments
- source notes
- event sessions
- people
- gallery items
- archive records
- dashboards
- Add examples of Markdown front matter plus sidecar YAML/JSON.

Acceptance criteria:

- Complex websites can be generated from structured content without mixing behaviour into prose.

### Phase 3: Compiler Starter

Deliverables:

- A script that reads Markdown/YAML/JSON source files.
- Schema validation.
- Stable ID generation.
- Markdown rendering.
- generated JSON/TS data output.
- source appendix generation.
- search index generation.

Acceptance criteria:

- A folder of Markdown source notes becomes embedded generated data without browser runtime file reads.

### Phase 4: Packaging Toolkit

Deliverables:

- Direct-inline Vite config.
- Attachment manifest generator.
- gzip+Base64 manifest option.
- Blob materialization runtime helper.
- compressed bootstrap example.

Acceptance criteria:

- The same source site can emit a normal development build and a single-file share build.

### Phase 5: UI Pattern Library

Deliverables:

- Report shell
- Presentation shell
- Dashboard shell
- Gallery shell
- Wiki/record browser shell
- Event report shell
- Source appendix/drawer
- Attachment export controls

Acceptance criteria:

- The generated outputs are modern, navigable, responsive, and clearly designed.

### Phase 6: Audit And Verification

Deliverables:

- Extend audit script for local dependency detection.
- Add size budget report.
- Add source incorporation report.
- Add browser smoke-test instructions.
- Optional Playwright smoke test for generated files served and opened from disk where feasible.

Acceptance criteria:

- The audit catches the common failure: a beautiful shell that still depends on adjacent text files.

### Phase 7: Recipes

Deliverables:

- CSV to dashboard
- Markdown folder to report
- Markdown records to wiki
- image/prompt folder to gallery
- event notes to event report
- course page to Canvas-ready standalone HTML
- existing website to captured single-file fallback

Acceptance criteria:

- A future project can start from a recipe instead of re-deriving the architecture.

## Recommended Default Stack

Default for rich reports:

- Vite
- React
- TypeScript
- Markdown/YAML content compiler
- generated data files
- custom component shells
- `vite-plugin-singlefile` for direct-inline mode
- custom attachment manifest for large files
- strict audit script

Default for content-heavy, low-interactivity reports:

- Astro or Eleventy source site
- generated static pages
- custom packager/audit

Fallback for already-built third-party/local pages:

- SingleFile capture
- manual audit
- possible post-processing

Not recommended as default:

- Web Bundles
- MHTML
- Next.js for new single-file report projects
- hand-authoring one giant HTML file

## Final Recommendation

Build the skill around a pipeline, not a trick.

The durable pattern is:

```text
Markdown/YAML/JSON + media
  -> validated generated data
  -> full local website
  -> one audited HTML file
  -> browser-tested portable report
```

Use `data:` URLs for inline assets, `Blob` URLs for large generated downloads, gzip+Base64 for large text-heavy embedded payloads, and strict audit rules to ensure the final output is genuinely self-contained.

# Runtime And Packaging Research

This file distills the most relevant official documentation for single-file HTML delivery.

## What The Research Supports

### Data URLs

Key findings:

- `data:` URLs are valid for embedding inline content directly in HTML.
- They are best thought of as embedded resources, not a full application architecture.
- They are treated as opaque origins by modern browsers.
- Top-level navigation to `data:` URLs is blocked in modern browsers.
- Current documented browser limits are large in Chromium/Firefox and larger still in Safari, but RFC 2397 originally framed the scheme as most useful for small inline items.

Design response:

- Use `data:` for many inline images and small assets.
- Do not rely on `data:` as the primary download mechanism for large attachments.
- Do not plan around top-level `data:` navigation.

Sources:

- MDN `data:` URLs: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data
- RFC 2397: https://www.ietf.org/rfc/rfc2397.txt

### Blob URLs And Downloads

Key findings:

- `blob:` URLs can represent larger resources than `data:` URLs.
- They are appropriate for locally generated data and downloads.
- `HTMLAnchorElement.download` is widely available and lets the browser treat a resource as a download with a suggested file name.

Design response:

- Decode large embedded attachments to `Blob` objects on demand.
- Use `URL.createObjectURL()` plus `a.download` for file export.
- Revoke object URLs after use.

Sources:

- MDN `blob:` URLs: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- MDN `HTMLAnchorElement.download`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download

### `file://` And Module Constraints

Key findings:

- Browsers treat `file:` URLs as opaque origins in many cases.
- JavaScript modules loaded from local files run into CORS restrictions when they try to import other files.
- Inline module code is possible, but external module fetching from `file://` is the risky part.

Design response:

- Do not leave split bundles or external module imports in the final deliverable.
- Collapse the final app into one self-contained HTML file or one inline bootstrap plus embedded payload.
- Test the final output from disk, not only from a local dev server.

Sources:

- MDN origin glossary: https://developer.mozilla.org/en-US/docs/Glossary/Origin
- MDN JavaScript modules guide: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules

### Vite Build Behavior

Key findings:

- Vite supports `base: "./"` or `base: ""` for relative output paths.
- Imported assets below `build.assetsInlineLimit` can be inlined as Base64 URLs.
- In library mode, Vite always inlines assets.
- `vite-plugin-singlefile` can inline JS and CSS, but its README explicitly calls out caveats: `public/` assets are not automatically inlined, SVG handling may need extra work, and history-based SPA routing is not a fit.

Design response:

- Use Vite with relative base paths for portable outputs.
- Import assets through source code when they must end up in the final file.
- Start with `vite-plugin-singlefile` for direct-inline packaging.
- Avoid `public/` for must-inline delivery artifacts.

Sources:

- Vite build guide: https://vite.dev/guide/build
- Vite build options: https://main.vite.dev/config/build-options
- `vite-plugin-singlefile`: https://github.com/richardtallent/vite-plugin-singlefile

### Compression Streams

Key findings:

- Compression Streams are baseline widely available in modern browsers.
- They support gzip and deflate compression and decompression.
- They are available in Web Workers as well.

Design response:

- For larger packaged deliverables, consider embedding gzip+Base64 payloads.
- Decompress them at runtime in the main thread or a worker.
- Use this when file size matters more than raw HTML readability.

Source:

- MDN Compression Streams API: https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API

### SingleFile As Capture Tool

Key findings:

- SingleFile is designed to save a complete web page into a single HTML file.
- It is strong for capture and offline snapshots.
- Its FAQ notes that interactive elements may fail unless scripts are preserved, and that some optimization settings trade fidelity for size.
- It also supports a self-extracting ZIP variant.

Design response:

- Use SingleFile as a capture or inspection tool.
- Do not make it the primary structured-report authoring architecture.
- Use it when the task is "collapse this already-built page" rather than "build a maintainable content system."

Sources:

- SingleFile repo: https://github.com/gildas-lormeau/SingleFile
- SingleFile FAQ: https://github.com/gildas-lormeau/SingleFile/blob/master/faq.md

### Web Bundles

Key findings:

- Web Bundles were designed for bundling a site into a single file.
- The Chrome documentation now states that the experimental implementation of navigation to Web Bundles was removed in February 2023.
- The same page says the feature is only supported in Chromium-based browsers behind an experimental flag.

Design response:

- Do not choose Web Bundles as the default or recommended delivery architecture.
- Mention them only as historical background or for explicit experimentation.

Source:

- Chrome Developers Web Bundles page: https://developer.chrome.com/docs/web-platform/web-bundles/

## House Heuristics

These are design heuristics inferred from the sources above and from the user's target workflows. They are not browser standards.

- Prefer direct inline packaging for modest report sites.
- Prefer blob-backed attachments for larger binaries.
- Prefer compressed embedded payloads when the output is getting heavy but still needs to remain one file.
- Treat the deliverable as ordinary `.html`, not as a separate browser format.

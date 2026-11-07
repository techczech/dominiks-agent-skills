# Visual gallery contract

Use a contact sheet for inspecting candidates. Keep the actual visuals visible; a list of titles and links alone is not a visual gallery.

## Catalogue and source model

Canonical catalogue: Markdown with YAML frontmatter and a structured block. Keep UI copy, candidate titles/descriptions, notes, source metadata and insertion snippets there. Generated preview payloads, embedded widget HTML and base64 media are build products, not a second authored source.

A candidate needs:

```json
{
  "id": "example",
  "title": "An explanatory title",
  "group": "widgets",
  "path": "widgets/example.html",
  "thumbnail": "research/previews/example.png",
  "contentCode": "[Simulation: widgets/example.html]",
  "headingCode": "### An explanatory title {layout=media}",
  "sources": [{"label": "Supporting source", "url": "https://example.org/source"}],
  "citations": []
}
```

For an SVG, use `path: assets/example.svg` and `contentCode: ![](assets/example.svg)`. The SVG itself can provide the thumbnail. Add source-checked paper references to `citations`; retain authors, year, title, identifier/version and URL. No invented authors or citations to a search-results page.

When reusing a candidate, read and preserve its catalogue group, version and source provenance. Choose the appropriate current variant, or label an older variant explicitly; do not silently substitute an original export or invent its current/earlier status.

Treat groups such as current/earlier SVGs as catalogue data. Do not hardcode candidate counts in labels, builders or tests. Extend or refresh candidates by stable ID; replacing an existing entry must refresh its description, source metadata, thumbnail and widget payload rather than skipping it because the ID exists.

## Working interaction

- Filter/search when the collection warrants it; derive counts from filtered data.
- Large preview with Escape dismissal and focus returned to the opener.
- Static thumbnails first. Run a live widget only on request, inside the same restricted local sandbox used for verification.
- Source/paper disclosure per candidate, reachable without leaving the gallery accidentally.
- Two labelled blocks: **Content only** and **Separate title and layout**. Never combine them in a single copy operation unless the user explicitly changes this contract.
- Code blocks keyboard-activatable; Copy buttons native buttons. On API failure, try a file-compatible fallback. If both fail, select the exact block and give manual-copy instructions.

Copy regression caught in this case: passing a `<pre>` as the feedback button caused `pre.textContent = "Copied"`, followed by `"Copy"`, destroying the insertion code. Restrict button-label feedback to actual buttons; keep status feedback separate. Test block activation twice, including after a feedback timeout.

## Packaging

Embed thumbnails and any live-preview HTML in the gallery. Escape `<` in JSON embedded in script elements, and verify that a widget's nested `</script>` sequences survive round-trip decoding. Do not fetch the local catalogue or media at runtime.

Keep the separate widget/SVG exports beside the outline even when the gallery embeds their previews. Copy codes refer to these exports. A gallery can work offline while its source links naturally require a network connection.

Keep ordinary Git assets near the repository's size guidance; the worked case stayed below 10 MB per HTML. Native browser JPEG captures or compressed preview copies can make an image-heavy atlas practical. Preserve the original capture/hash when deriving a smaller preview; do not alter the depicted tool state.

## Meaningful verification

- Every candidate path and thumbnail exists; copy codes contain relative paths only.
- Widget code is exactly a Simulation directive; SVG code is an empty-alt image reference; no heading/title is present in either.
- Title/layout code is separate and uses current registered syntax.
- Every candidate has supporting source links; paper references contain checked metadata where applicable.
- Copied exports match the recorded source hashes. Rebuilds refresh changed widget payloads and previews.
- Clipboard API success, fallback success and complete denial all behave correctly; selected text is exact after focus changes. Mock these paths rather than accessing the system clipboard.
- Embedded JSON decodes to the intended source bytes; static preview, sandboxed live preview and modal focus work.
- Check meaningful visual states, not only aggregate page dimensions. A clipped panel heading can pass a document-overflow test.

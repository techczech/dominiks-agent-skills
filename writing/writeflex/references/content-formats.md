# WriteFlex content formats

## Folios

The required manifest name is `_report-structure.json`. This is application syntax, not a suggested naming convention. Example for three pieces inside a `contents/` subfolder, in the requested reading order:

```json
{
  "schema_version": 1,
  "content_root": "contents",
  "files": [
    { "path": "02-context.md", "role": "section" },
    { "path": "01-question.md", "role": "section" },
    { "path": "03-conclusion.md", "role": "section" }
  ]
}
```

For pieces beside the manifest, `content_root` is `""`. The `files` array controls order. Existing manifests may carry `output`, `title_matter`, per-file `role`, `render`, `toc` and additional keys; retain them unless the request changes them. New entries should use paths relative to `content_root`. Existing manifests may include that prefix in their paths; preserve working paths rather than normalising speculatively.

Verify every declared file exists within the intended collection. Missing parts must be reported even if the app quietly omits them. Do not include covers, Index Notes, backups or underscore-prefixed support files as prose chapters merely because they are Markdown. Never infer a Folio from a numbered directory.

When exposed, `folio.create_manifest` derives its initial list/order from existing files and refuses any existing manifest. It does not accept an arbitrary requested chapter order; inspect its resulting proposal or file before claiming that order is satisfied.

## Markdown and objects

Retain the file's YAML frontmatter, wikilinks, citation identifiers and relative assets. Edit prose narrowly; do not run a formatter over unrelated content.

A portable pipe table is valid preparation material:

```markdown
| Topic | Decision |
| --- | --- |
| Scope | Keep the introduction |
```

With an exposed `objects.insert`, supply inner markup only; the capability owns the appropriate fences. Use its current schema for table, Mermaid, Markmap or SVG input. Do not nest an already fenced object inside another fence. SVG content remains untrusted; retain the app's validation and sanitisation path.

WriteFlex post-it annotations are lines beginning with `//` outside fenced or indented code. Preserve them in the working source. The app's export pipeline strips frontmatter and these annotations; a plain copy of the source does not. Keep code comments inside code blocks intact. Before sharing any independently prepared output, inspect the resulting artefact for notes and metadata; do not claim it passed WriteFlex's export pipeline.

## Source and app ownership

The application handles snapshots, proposal acceptance, internal history and export models. Ordinary external file edits do not establish those effects. A live buffer and disk can differ: preparing a separate revision is preferable when its current state cannot be obtained. Do not edit app configuration, `.bridle` journals, caches or compiled application files during content work.

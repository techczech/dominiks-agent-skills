# Editable Source Contract

Every authored user-facing string in a single-file HTML deliverable has one canonical editable home in Markdown with YAML front matter. This includes narrative copy and interface copy: headings, navigation, labels, prompts, placeholders, help, errors, status text, accessibility labels, and calendar/export text. Inline HTML is allowed inside Markdown where the renderer needs markup; it does not move authorship into HTML or JavaScript.

The Markdown source is part of the delivered source folder and drives the build. Generated JSON, TypeScript, HTML, and runtime templates are intermediate or packaged outputs, not independently maintained copies of authored text. Keep CSS, behaviour, and packaging separate from content. Runtime user-entered notes, annotations, imported records, and other live data are distinct from authored copy and may be stored under their own export contract.

## Minimum delivery contract

- Deliver the Markdown/YAML source folder alongside the self-contained `.html` file.
- Document the exact rebuild command in the source folder README or build notes.
- Compile and embed the Markdown at build time; the packaged file must not fetch adjacent Markdown at runtime.
- Make a representative edit to the Markdown, rebuild, and verify that the changed text appears in the generated HTML.
- Search the generated HTML and templates for authored strings that have no source reference, including fallback, error, empty-state, accessibility, and export/calendar copy.

This contract implements the repository-wide single-file HTML editable-source rule. If that companion instruction is unavailable in another environment, apply the contract above as the portable minimum.

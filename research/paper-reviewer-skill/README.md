# paper-reviewer-skill

Reusable skill for systematic academic-paper review. Drop into any host repo via four agent symlinks plus a `scripts/` + `templates/` symlink and you have:

- One-command Zotero import by title/author/DOI/URL/citekey
- Layout-aware figure + table extraction with caption metadata
- Six review templates (quick-read, gelman, methods, critical, methods-and-relevance, claims-audit-and-press)
- Self-contained single-HTML report builder with embedded figures and PDF
- Atomic-note + Zettelkasten conventions, fully-qualified filenames

See **[SKILL.md](SKILL.md)** for full documentation and install instructions.

It supersedes [`academic-paper-review`](https://github.com/techczech/academic-paper-review), which did the same job but lived inside a single research repository rather than dropping into any host repo.

## License

MIT.

## Companion skills

- [`academic-pdf-to-mkd`](https://github.com/techczech/academic-pdf-to-mkd) — required for the rich extraction path (Docling / MinerU / pymupdf4llm).

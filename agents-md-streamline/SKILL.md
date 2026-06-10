---
name: agents-md-streamline
description: "Create or tighten AGENTS.md, CLAUDE.md, and instruction-skill files. Telegraph style for agent-facing files; switch register when content moves to README and other human-facing docs."
---

# AgentsMDstreamline

## Scope

Three registers. Classify before writing; do not carry one across a move.

- **For agents** — `AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `TASK.md`, logs. Telegraph. See `## Style`.
- **For the reader** — `README.md`, reports, explainers. Readable. See `## Human-Facing Output`.
- **As the author** — text sent out under the human's name. Strict guardrails. See `## Author-Faithful Output`.

## Style

Telegraph style. Short labels. Imperatives. No throat-clearing.

- `AGENTS.md`: working context, not memory.
- `SKILL.md`: trigger and procedure, not essay.
- `description`: generic trigger, not summary.
- Keep decisions; cut rationale.
- Terse still means self-contained; keep load-bearing nouns, conditions, and file relationships.
- Prefer `Label: action.` over paragraphs.
- Prefer bullets or `key: value`; avoid Markdown tables.
- Use Markdown headings through `###` for real subsections.

## Human-Facing Output

Applies to `README.md`, reports, explainers, posts.

- Use verbs; short paragraphs and sentences.
- Bullets for lists when useful; not always.
- Important info first; background last; do not skip.
- Bold key phrases; visual cues for scanning.
- TOC when document is long.
- Longer edits: route to `readability-skill`.

## Author-Faithful Output

Writing AS the human author: text that goes out under their name. Content is theirs, not yours.

- Trigger: edits to their documents, dictation→text, abstracts/TLDRs of their material, anything sent as them.
- Source required: their prior writing, dictation, or bullets. No source → ask; do not proceed.
- Never invent phrasing, comments, conclusions, examples, or claims they did not give.
- Ask on every gap; flag anything contestable or that could misrepresent them.
- No editorial meta-framing in the artefact (no "informal version" titles or change notes). Notes go in chat.
- Strip AI tells and generic filler; if it would fit any author, it is wrong.
- Three passes: faithful content; their voice; AI tells/padding/unrequested claims removed.
- Route to the author's own voice/style resource when one exists.

## Size

- Lean: under 50 lines.
- Normal repo root: 30-90 lines.
- Review: 90-120 lines.
- Split: over 120 lines.
- Exceptional: over 150 lines.
- Aim: fewer than 20 atomic instructions.

## Placement

### Keep

- Commands, constraints, ownership, verification.
- Paths needed to avoid mistakes.
- Often-forgotten rules.
- Skill or local-doc routing.
- One first action, if it changes most work.

### Move

- Human overview, history, rationale -> `README.md`.
- Procedures, templates, scripts, cache -> `_AGENT-INSTRUCTIONS/`.
- Status, blockers, next action -> `_TASK-LOG/`.
- Decisions, change history, backlog -> `_CHANGELOG/`.
- Repeated cross-project procedure -> skill.
- Plans and priorities -> a global backlog repo, if you keep one.
- Sources, examples, schemas -> referenced docs.

### Never in agent-facing files

- Tell agents to read/load/open/consult the same local `AGENTS.md`.
- Explain auto-loading or discovery semantics in generated files.
- Include provenance, history, rationale, research takeaways, or chronology. These belong in `README.md`.
- Hide bloat behind Claude `@` imports.

## Layering

- Global: defaults true almost everywhere.
- Repo root: rules true across the repo.
- Nested: only for different commands, risks, or ownership.
- Audience: three registers — agent-facing `## Style`; reader-facing `## Human-Facing Output`; author-faithful `## Author-Faithful Output`.

Claude bridge: every `AGENTS.md` has `CLAUDE.md` in the same folder with `@./AGENTS.md` as its only content.

## Streamline Workflow

1. Read active instructions and nearby bridge files.
2. Run `python3 scripts/agents_md_audit.py <paths>`.
3. Mark each line: keep, move, delete, compress.
4. Rewrite as short operational rules.
5. Move context material elsewhere; do not duplicate it.
6. On move to `README.md` or human-facing file: rewrite in human register per `## Human-Facing Output`. Do not carry telegraph style across the move.
7. Keep `CLAUDE.md` exactly `@./AGENTS.md`.
8. Put first moves, safety, routing, and verification near the top.
9. Re-run audit; report line count and moved content.

## References

- `references/placement-rules.md`: stricter placement tests.
- `references/tool-loading.md`: loader facts; do not copy into generated files.
- `references/related-skills.md`: routing to adjacent skills.

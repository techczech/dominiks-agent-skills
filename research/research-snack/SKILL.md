---
name: research-snack
description: Use to check a public claim quickly against primary data with an agent and publish the result as a Research Snack on researchsnacks.semanticmachines.fyi, or to revise an existing snack.
---

# Research Snack

A Research Snack is a short public write-up of a quick check of a claim seen in the wild (a post, a talk, a headline). The agent goes to the primary data, produces numbers, tables and charts, and the page records how long it took, what the human did, what the AI did, the dead ends and the caveats. The point of the series: how quickly a claim can be checked now, not that the AI is always right.

- Site repo (build, frontmatter fields, deploy): [research-snacks](https://github.com/techczech/research-snacks) (public; read its `AGENTS.md` and `README.md`). Live: https://researchsnacks.semanticmachines.fyi.
- Reference entry: `entries/2026-11-16-one-in-270-jobs/`. Copy its shape.
- Working material: keep raw extracts, scratch scripts, checksums and notes outside the published entry folder.
- Data and code live in the public `techczech/research-snacks-data` repo, not on the site. The entry carries only `index.md` and `charts/` (each chart's PNG, CSV and Vega-Lite spec); it links to its data and code folders on GitHub.
- Style: British English; short, literal prose. Draft from a verified facts brief, preserve the author’s wording and distinguish the author’s judgement from the agent’s work.

## House rules (Dominik, 16 November 2026)

1. **Split the claim.** Most claims carry a fact and a claim about scope or meaning ("only 1 job is obsolete" and "so we live in a stable period"). Check both; the verdict and summary address both.
2. **Find the source even if the claim cites none.** Say where the number seems to come from, what the source actually says, and how the claim differs from it. If the full text could not be read, say so in the text and the caveats; paraphrase, do not quote what you have not seen.
3. **Test the word "only".** Look for obvious counterexamples before accepting an "only" or "just one" (elevator operators were not the only automation casualty; switchboard operators too).
4. **Measure both sides of a change.** If the claim counts what survived, also count what is new; a list from the past can only show losses.
5. **Primary data first.** Prefer microdata or the original dataset over secondary summaries. Pass API keys at runtime through the user’s secrets manager; never hardcode them, write them to a file or commit them. Ask the user to register if a free account is needed and record their minutes as human time.
6. **Log follow-up questions as they arose**, including ones the user supplies from memory (for example, a film), in the timeline. Pursue them with the same data where possible; if the user names a video or document, extract its actual content (for YouTube: `yt-dlp --skip-download --write-auto-subs --sub-langs "en.*"`) rather than describing it.
7. **Interactive charts, data exportable.** For every `charts/NAME.png` also write `charts/NAME.csv` (exactly the plotted data) and `charts/NAME.vl.json` (Vega-Lite, data url `charts/NAME.csv`): the build then shows an interactive chart (tooltips, legend click to pick a group, export menu) with links to the CSV, the PNG and the spec; the PNG stays as fallback and social image. Pattern: the reference entry's `code/interactive.py`. Keep one data source per layered chart (a transform inside one layer breaks the sort). Counts over decades also get a share of all workers (or population) column: growth in the total hides how stark a fall is.
8. **Readable numbers.** Any run of more than three or four numbers goes in a Markdown table (the build right-aligns numeric cells); charts as well, not instead. Name artefacts in the table (– for no comparable category) and in the caveats.
9. **Every cited thing is a clickable link**, in the text and in `references`.
10. **Citable.** Every source goes in the frontmatter `references` (the build renders formatted references with a separate `references.ris` download, plus `citation_*` and Dublin Core tags so Zotero saves the page as one item; no COinS). Data citations are copied verbatim from the provider's own citation (codebook, email, website), never composed.
11. **Models, tools and tokens** at the bottom: list only what the research needed in `tools:` frontmatter and repeated tools text: models, search and source retrieval, analysis code, corpora tools, and a special visualisation library (for example Vega-Lite). Omit page build, rendering, hosting and deployment tools (Astro, bun, Cloudflare, headless Chromium, Git and wrangler). Keep measured model usage and its coverage unchanged when cleaning up a tools list.

    Include a table of model, role, calls, tokens read and tokens written from `python3 scripts/session-usage.py <session.jsonl>` (for Claude Code; for another harness, use its reported usage records and state the coverage), plus the other tools. Say that tokens read include the cached history and what the count covers.
12. **Times are measured** from the transcript timestamps, with the timezone stated (UK time is the series convention); human time is an estimate and says so.
13. **Name the judgement steps** (a sort, a mapping) and add a caveats section ("What this does not show").
14. **No first person without the author.** Write "I", "my claim" or "my post" only for wording the author has written or approved. Otherwise name him: "Dominik's 2011 post", "Dominik claimed".
15. **The author sees every snack before it goes live.** Show him a preview of a new snack, or of a substantial revision, and publish only after he has looked at it. Corrections he asked for may go live once he has seen the preview.

## Page structure

The argument first, then a separate closing part about how it was made. Use H2 sections, each with H3 subsections; the contents sidebar shows the H2s and opens the H3s of the section being read.

1. `## The claim`: `### What was said` (quote, link), `### Where the number seems to come from`.
2. `## The answer`: `### In short`, then a subsection on the scope or meaning claim.
3. Findings as two to four H2 sections named by what they show (not "Results"), each with H3s for tables and charts.
4. `## Limits of this check`: the caveats; they belong to the argument.
5. `## How this was made` (exact heading; the build moves everything from here into a separate shaded appendix and adds References, Files and Cite this page to it): `### Timeline`, `### Data and method`, `### Models, tools and tokens`. Do not list the data and code files by hand: the build lists them under Files.

Headline figures that are one number, not a chart, are HTML infographics: write `charts/NAME.html` (a snippet using the site's `ig-*` classes) next to `charts/NAME.png`; the build inlines it and keeps the PNG for sharing.

## Process

1. Answer the question first. The author decides whether it becomes a public snack.
2. Keep analysis scripts, source extracts with checksums, notes on decisions, and a verified facts brief with every number, the timeline, method, caveats and verbatim citations. Only shareable final files are published: data and code in the data repo, charts in the entry.
3. Make charts as PNG plus CSV and Vega-Lite spec (rule 7). Use clear units, zero-based bars, distinguish missing observations from zero, preserve uncertainty and supply source notes. Do not use purple or pink. The build adds the contents sidebar from the H2/H3 headings, so give sections short, specific headings.
4. Draft `entries/YYYY-MM-DD-slug/index.md` from the verified facts brief. Check every number against `data/`, and add references, tables and the token table.
5. Before publishing, add `snacks/<entry-id>/` to the public `techczech/research-snacks-data` repo: `README.md`, `METHOD.md`, `data/`, `code/` and `expected/`. State which page numbers each output checks and name the judgement steps. Read each provider's own redistribution terms and record the decision in `DATA-SOURCES.md`; publish IPUMS extract definitions, recreation code and derived aggregates, never microdata. Withhold corpus text unless its licence clearly permits it, and exclude personal account data. Run `uv sync` and `uv run check.py <entry-id>` in a fresh clone; the expected tables must match before publishing. Scan the complete tree and Git history for private information and secrets. The site build adds the folder's “Check it yourself” link automatically.
6. Build with `bun run build` (Astro; content stays in the same entry Markdown and asset folders). Run `bun run check`, then look at the page headlessly (serve `site/` with `python3 -m http.server`; `file://` breaks the absolute stylesheet) and read screenshots of the tables and the citation block. The build updates `/rss.xml` automatically with complete entry summaries, dates, links and category/tag labels; readers can subscribe at https://researchsnacks.semanticmachines.fyi/rss.xml.
7. Deploy a preview (`scripts/deploy.sh --preview`) and show it to the author (rule 15). Only after he has looked at it, maintainers with publication authorisation push and deploy: run `scripts/deploy.sh --production` from clean `main`, then check the entry URL and `/rss.xml` return 200. For a fork, use its own deployment configuration.
8. Record what was checked and any remaining limits beside the work. If a data provider requires bibliography registration, remind the author to submit the publication.

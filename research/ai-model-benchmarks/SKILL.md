---
name: ai-model-benchmarks
description: "Fetch Artificial Analysis (AA), Arena and OpenRouter free data and build self-contained comparison widgets (model progress/frontier chart, benchmark comparison, price vs intelligence scatter, leaderboard bar or table, OpenRouter usage share, text-to-image/video/speech arena rankings): ONE inline HTML file with no external requests, for slides or documents (any tool that can embed or open a local HTML file). Also looks up whether a given model, such as an open model to run locally, has benchmark data and a licence. Use for: compare models for a talk/slide/document, model progress, benchmark comparison, leaderboard widget, Artificial Analysis, Arena, OpenRouter."
metadata:
  short-description: Benchmark widgets and model lookup from AA, Arena and OpenRouter
---

# ai-model-benchmarks

Free data (Artificial Analysis API v2, Arena, OpenRouter) -> dated local snapshots -> ONE self-contained HTML file. No screenshots. Python 3 stdlib only; run scripts as `python3 -I`. `$S` below = this skill's folder.

## Setup (once)

- Needs Python 3 (standard library only). Run commands from anywhere; `$S` is the folder containing this file.
- Get a free Artificial Analysis (AA) API key: create an account at https://artificialanalysis.ai and generate a key from the API section of your account (see the API documentation on that site if the menu differs). The free tier is rate-limited (see Quota).
- Set it in the shell that runs the scripts: `export ARTIFICIAL_ANALYSIS_API_KEY="<your key>"`. Never paste the key into a file you share or commit. Arena and OpenRouter need no key.
- Optional config: copy `config.example.json` to `config.local.json` in the skill folder (git-ignored; do not commit it). Use it to rename the environment variable (`env_var`) or to set `icons_dir` (logos). `key_source` is `env` (default; reads the variable) or `bws` (advanced, optional: macOS Keychain token + Bitwarden Secrets Manager CLI `bws secret get <uuid>`; fields `bws_secret_id`, `bws_keychain_service`; ignore this unless you already use it). If the file exists ONLY the configured source is used, with no fallback.
- Optional logos: set `icons_dir` in `config.local.json` (or pass `--icons-dir`) to a folder you supply holding svgl-format icon JSON (https://svgl.app; brand marks belong to their owners). The skill ships no logos. Without it, creators are shown as coloured shapes.

## Choosing a source

| Ask | Source | Notes |
|---|---|---|
| intelligence, coding/agentic, price, speed, model progress over time | `aa` (default) | `aa_fetch.py`; attribution to Artificial Analysis |
| which model do humans prefer; is it open (licence) | `arena` | human-preference rating + CI + licence; lags about a week; CC BY 4.0 |
| what do people actually use; OpenRouter's own benchmarks | `openrouter` | 30-day token share, benchmark accuracy and cost per task; CC BY 4.0 |

- Fetch Arena/OpenRouter: `python3 -I $S/scripts/open_sources_fetch.py --source arena|openrouter|all` (reuses today's snapshot; `--arena text_style_control,text_to_image`, `--arena-top 200` to save requests, `--history` only on request; `--openrouter ...,benchmark-runs` only on request).
- Widgets: add `--source arena|openrouter` to `aa_widget.py`. Arena: `bar`/`table` (`--arena <subset>`, `--open-only` = licence not Proprietary, licence in tooltip/table). OpenRouter: `share` (30-day usage lines, top 5 + all other, `--top` overrides), `bar`/`table` of share (`--metric share|share_latest`) or of a benchmark (`--benchmark <id>`, e.g. gpqa_diamond; cost per task in tooltip).
- Names differ per source (Arena `model-name-high`, OpenRouter `org/model-name-20260101`); they are tidied into readable names (provider prefix and date stamps dropped, effort suffix after a comma) with the raw id in the tooltip. `--models` ignores case, `-`, `_`, spaces and dots. Creator (and logo) come from the org/provider prefix.
- Attribution is built into each footer and cannot be turned off: Arena "Source: Arena (lmarena-ai/leaderboard-dataset), licensed under CC BY 4.0" + publish date; OpenRouter "Source: OpenRouter (openrouter.ai), licensed under CC BY 4.0" + data-as-of date; AA link + index version + fetch date.
- Example asks: "which open models rank best with humans" -> `bar --source arena --open-only --top 10`; "what are people really using" -> `share --source openrouter`; "GPQA on OpenRouter" -> `bar --source openrouter --benchmark gpqa_diamond`.

## Workflow (widget)

1. `python3 -I $S/scripts/aa_fetch.py` (AA; `--categories language,text-to-image,...|all`, `--refresh` forces) or `open_sources_fetch.py`. Reuses today's snapshot, zero requests.
2. Pick chart: `frontier` (model progress over time), `scatter` (price/speed vs intelligence), `bar` (ranking), `table` (several metrics), `share` (OpenRouter usage).
3. `python3 -I $S/scripts/aa_widget.py <chart> --out <folder>/assets/<descriptive-name>.html [options]`
4. Give the user the file path to open in a browser or embed in any tool that runs a local HTML file. One example: TalkWeaver and WriteFlex embed it with the line `[Simulation: assets/<name>.html]`; that syntax is specific to those apps.
5. Say the data date (the footer shows it).

Filename rule: descriptive kebab-case, says what it holds: `frontier-intelligence-2026-10.html`. Never `widget.html`.

## aa_widget.py options

- `--category language` (default) or a media category (`text-to-image`, `text-to-video`, `text-to-speech`, `speech-to-text`, ...).
- `--models "Name A,Name B"`: case-insensitive, punctuation-tolerant substrings of name/slug/base name. `--latest`: per term keep only the newest matching model.
- `--creators "Anthropic,OpenAI,Google"` (aliases: xAI = SpaceXAI, Qwen = Alibaba, Moonshot = Kimi). `--top N`. `--months N` (frontier). `--highlight "Name A"`.
- `--variants best` (default: per creator+base name keep the best-scoring effort setting; variant shown in tooltip) or `all`.
- `bar`: `--metric` (default intelligence; media/Arena: rating with 95% CI whiskers; the axis starts near the data when values are within 15% of each other, and says so). `scatter`: `--x blended_price --y intelligence` (price axes log). `frontier`: `--metric`. `table`: `--metrics intelligence,coding,agentic,blended_price,speed` (click headers to sort).
- `--label "Name A,Name B"` (frontier): label only the models the user names, at most 5 (the 5 highest if more). Default: only the newest record-setter; every other point is hover/focus tooltip only. Tell the user to name the models they want labelled.
- `--logo-column bar|left` (bar charts): logos at the bars' left edge (default) or in a column at the far left.
- `--icons-dir`, `--title`, `--subtitle`, `--snapshot-date YYYY-MM-DD`.
- Prints path, rows included, rows skipped (null metrics, with names). Read it; tell the user which models were left out and why.
- Metric aliases and field map: `references/fields.md`.

Examples:
- Progress: `aa_widget.py frontier --creators "Anthropic,OpenAI,Google,DeepSeek,Alibaba" --months 24 --label "Model A,Model B" --out assets/frontier-intelligence-last-24-months.html`
- Value: `aa_widget.py scatter --top 15 --x blended_price --y intelligence --out assets/scatter-price-vs-intelligence-top-15.html`

## Deciding about an open model

1. `python3 -I $S/scripts/aa_lookup.py "<candidate>"` (`--sources aa,arena,openrouter`, default all snapshots on disk; Arena shows the LICENCE, the open-model check AA cannot do; tolerant matching, all terms must match; `--json` for agents; `--category all` checks media too).
2. Found: read ranks/percentiles among all AA models; note MISSING fields. Intelligence present but no speed/price = no hosted provider benchmarked, so AA says nothing about serving speed.
3. Not found: AA does not benchmark every open model. Check the suggested names for a naming mismatch before concluding.
4. AA's free tier has NO open-weights or licence field. Arena's `license` column does carry one (anything not "Proprietary"); for models Arena lacks, confirm openness elsewhere (for example the model card).
5. Compare: `aa_widget.py table --models "<candidate>,<current choice>,<reference>" --metrics intelligence,coding,agentic,blended_price,speed --out ...`

## What the AA free tier can answer

- Language models: Intelligence Index (+ coding, agentic, six domain indexes), index run cost, input/output/cache prices, median speed, TTFT, end-to-end time, release date, creator.
- Media: Arena Elo + 95% CI (text-to-image, image-editing, text/image-to-video, with audio, text-to-speech, speech-to-speech, music); speech-to-text WER index.
- Do NOT promise (not in the free tier): per-benchmark scores (GPQA, HLE...), context window, open weights/licence, reasoning flag, AA's own blended price (we compute 3:1), history over time, provider-level data.
- Nulls = not measured, never zero. Skipped, never plotted as 0. Table dash `–` = null; a visible note appears under the table when a shown column is mostly empty.
- Coding/Agentic indexes lag: the newest frontier models often have Intelligence but null Coding/Agentic in the free feed. Check with `aa_lookup.py` before promising a coding chart; say so on the slide if a column is mostly dashes.
- The Intelligence Index is versioned (the footer shows it). Scores from different versions are not comparable; never mix snapshots across versions in one chart.
- Each model appears once per effort setting ("Name (Xhigh)", "(High)"). Base name = name minus trailing parenthetical.
- Media records have no release date: `frontier` is language-only.

## Terms

- Attribution is REQUIRED on every display and is built into the footer.
- Do NOT republish fetched snapshots. The files under `snapshots/` hold raw Artificial Analysis data, and redistributing it needs AA's permission under their terms. Keep `snapshots/` out of any repository, release or shared folder (git-ignore it if you version this skill). Check AA's current terms at https://artificialanalysis.ai before sharing anything beyond a widget.
- Widgets that display the data with attribution are fine to use and share.
- Arena and OpenRouter data are CC BY 4.0: attribution required, redistribution allowed with credit.

## Crediting the data

Keep the footer on every widget; it is generated and carries the credit. If you quote numbers elsewhere, credit them in words:
- Artificial Analysis (https://artificialanalysis.ai): required whenever AA data is shown.
- Arena (lmarena-ai/leaderboard-dataset): "licensed under CC BY 4.0".
- OpenRouter (https://openrouter.ai): "licensed under CC BY 4.0".

## Examples

Synthetic-data screenshots (invented models, no real results): `docs/widget-bar-example.png`, `docs/widget-frontier-example.png`, `docs/widget-table-example.png`.
- Logos are brand marks owned by their companies, used to identify them.
- The API key never goes in any output file, log or client-side code; `aa_key.py` is the only module that touches credentials and prints nothing.

## Quota

- Free AA key: 100 requests per fixed 24 h window, shared per account. Full language fetch = 4 requests; each media category = 1.
- Reuse snapshots; do not use `--refresh` casually. 429 = stop, retry after reset. 403 = endpoint not in the free tier.
- `aa_lookup.py` never spends quota except one language fetch when no language snapshot exists at all.

## History

- Snapshots accumulate in `snapshots/YYYY-MM-DD/<category>.json.gz`. Run a fetch before you need a chart so history builds. A future `trend` chart needs >= 2 snapshots (NOT built yet).

## Files

- `scripts/aa_key.py` (credentials, config), `aa_fetch.py` (+ `load_snapshot(category, date=None)`), `open_sources_fetch.py` (+ `load_open_snapshot`), `aa_sources.py` (adapters, name tidying), `aa_logos.py`, `aa_widget.py` + `widget_template.html`, `aa_lookup.py`.
- Tests: `python3 -I -m unittest discover -s $S/tests` (synthetic fixtures only).
- Widgets are inline-only (no external requests, no eval, no storage) and work under a strict CSP in a sandboxed iframe. Light/dark follows `prefers-color-scheme`.

---
name: archive-scout
description: Search, quote and analyse a personal text archive (own writing, posts, reading highlights) with the `scout` CLI — search, cite, KWIC, collocates, n-grams, keyness, verify-quote — and write cited archive reports with a JSON sidecar. Use for "what did I write / say / read about X", usage over time, and any report quoting the archive.
---

# Archive Scout

`scout` is a local corpus engine: it indexes folders of Markdown (writing, posts) and reading-highlight archives, and answers search, concordance and frequency questions with exact counts and citable passages. Source: [scout-core](https://github.com/techczech/scout-core) (`cargo install --git https://github.com/techczech/scout-core scout-cli`). The commands this skill uses (search, the analysis views, `verify-quote`, `cite`) never write to the sources; leave the tagging and event-editing subcommands (`correct`, `events`) alone unless the user asks.

## First move: find the corpora

Corpora are whatever the user registered. Never assume names; discover them:

```
scout corpora list            # id, kind, index state, path
scout corpora list --json     # for machine use
scout index status            # docs, passages, built-at, stale files per corpus
```

- The registry lives at `~/.config/scout/corpora.toml`. With no corpora yet, register a folder the user names: `scout corpora add <folder> [--id <id>] [--name <name>]` (Markdown and plain-text notes), or `scout corpora add <folder> --kind highlight-scout-archive` for a Highlight Scout archive; then `scout index build <id>`. Ask before registering anything; never register a folder the user did not name.
- `scout corpora remove <id>` unregisters a corpus and deletes only its index (`--keep-index` keeps it); source folders are never touched.
- A corpus marked `(folder missing)` in `corpora list` still searches from its index; say so when quoting from it.
- **Kinds tell you the role:** a `markdown-folder` corpus usually holds texts the user wrote (role `wrote`); a highlights archive holds what they read (role `read`). Ask when a corpus's role is unclear.
- A corpus whose index is missing or stale: `scout index build [<id>…]` (incremental and fast).

## When

- "What did I write / say / post about X", "find my line on…", "quote me on…", "what have I read on X".
- Word or phrase usage, change in topics over time, own writing against reading.
- Any cited report drawn from the archive.
- Not for: editing the user's files.

## Rules

1. **Never quote from memory or from a summary.** Every quotation comes out of `scout` and passes `scout verify-quote` before it goes into anything the user reads.
2. **Cite with `--cite markdown`, or `scout cite <passage-id>`.** The citation carries the full title, the date and the archive and public links when they exist. Never shorten titles.
3. **Language.** A corpus may mix languages. Add `--lang <code>` on the views (or `lang:<code>` in a `search` query or a slice) for counts in one language; keyness without it is dominated by the other language's function words.
4. **Counts are exact and agree across views:** KWIC lines = n-gram n=1 = profile frequency = the sum of the `dist` buckets. A collocate row's count = `scout kwic <node> --near <collocate>`. Report figures from the tool, never estimated.
5. **A stale index:** run `scout index status`, and `scout index build` if anything is stale.
6. **Output:** prefer `--json` for machine use; human output is for showing the user.
7. **Describe, never narrate (binding for every report).** Report WHAT the texts say in each period and what they are about. Never infer a change of mind, a motive or a trajectory from a shift in topics.
   - Barred: "moved from defending to analysing", "the stance changed", "what changed was the stance, not the core argument", "came to see…", or any sentence that evaluates or interprets the author's position beyond what a quote states.
   - Allowed: "In 2012 the posts argue X [quote]. The 2015 pieces discuss Y [quote]." Different topics in different years are just that; say so if it matters: "the later texts address different aspects; they do not revisit the 2012 argument."
   - Counts are facts. Their interpretation is the user's.
   - Before delivering, reread every non-quote sentence and delete any that interprets.

## Commands

```
scout search '<query>' [--in <ids>] [--limit 20] [--cite markdown|plain] [--passage] [--fts|--hybrid|--semantic] [--json]
scout kwic <term> [--in …] [--width 8] [--sort R1|L1|…|date|source] [--near <word> --window 5] [--limit 200] [--json]
scout collocates <node> [--in …] [--window 5] [--score logdice|mi] [--min 5] [--top 30] [--compare '<slice>'] [--dist year|doc|corpus] [--json]
scout ngrams [--in …] [--n 3-5] [--since Y] [--until Y] [--top 50] [--strict-stopwords] [--dist …] [--json]
scout profile <word> [--in …] [--min-hits 3] [--json]
scout dist <term> --by year|corpus|genre|lang [--json]
scout keyness --a '<slice>' --b '<slice>' [--top 40] [--json]
scout similar <passage-id>… [--in …] [--top 20] [--exclude-seeds] [--json]
scout verify-quote '<text>' [--in …] [--json]     # exit 1 = not found
scout cite <passage-id> [--format markdown|plain]
scout corpora list | show <id> | add <folder> [--kind …] [--id …] | remove <id> [--keep-index]
scout index status | build [<id>…] [--force] [--semantic]
```

- **Query grammar** (`search` and slices): `OR`, `AND`, `-x`, `"phrase"`, `x*`, `/re/i`, and the fields `in: after: before: y: lang: genre: source: au: ti: tag: co: ty:`.
- **Filter flags** on the views: `--in --lang --genre --after --before --y --source`.
- **A slice** is one quoted string, for example `'before:2015 lang:en'`, `'y:2010-2015'`, `'in:<corpus> genre:essay'`, or a corpus id.
- **A passage id** is `<corpus>:<path>:<line>`; `search`, `kwic` and `verify-quote` return it, and `cite` and `similar` take it.

## Archive report recipe

For "write me a report on what my texts say about X", "what have I said about Y", "how often did I write about Z", and similar:

1. **Scope.** Restate the question as corpora, a date range and a language. Say which in the report.
2. **Locate.**
   - `scout dist <term> --by year` for the shape over time.
   - `scout search` with fields for the candidate pieces.
   - `scout kwic` for how the term is used.
   - `scout collocates --compare` or `scout keyness` for differences between periods.
3. **Read.** Open the top passages in full (`scout cite <id>`, or the file at its line). Do not argue from KWIC fragments alone.
4. **Draft.** Make claims by period or theme, each backed by 1–3 quotes with citations. Keep what the author wrote apart from what they read.
5. **Verify.**
   - Run `scout verify-quote` on EVERY quotation, in the quote's own corpus.
   - A quote that is not found is fixed from the tool output or removed. Never paraphrase it back in as a quote.
   - Record the count ("14/14 quotes verified").
6. **Deliver.** A self-contained HTML (or Markdown) report. Each quote carries its citation, its archive link and its public link. End with a "Method" section: corpora, filters, commands run, index build time (`scout index status`), verified count.
   - Save where the user asks; otherwise in a `reports/` folder of the current project, named `<YYYY-MM-DD>-<slug>.html`.
   - Look at the rendered page before showing it.
7. **Sidecar.** Beside the page, write `<same basename>.json` (schema below). A reader app can list the sidecars in a folder, open each as an evidence ledger and re-run `verify-quote` on every quote. A sidecar that fails validation is listed as invalid and does not open.

### Report sidecar, schema version 1

Unknown keys are ignored.

```json
{
  "schema_version": 1,
  "question": "What do my texts say about X between 2012 and 2020?",
  "corpora": ["<corpus>", "<reading corpus>"],
  "filters": ["lang:en", "after:2012 before:2021"],
  "commands": ["scout dist x --by year", "scout verify-quote '<quote>' --in <corpus> --json"],
  "built_at": "2026-09-28T01:25:50Z",
  "built_at_by_corpus": {"<corpus>": "2026-09-28T01:25:50Z"},
  "verified_count": "21/21",
  "claims": [
    {
      "id": "c1", "period": "2012", "role": "wrote",
      "text": "The claim, one or two sentences.",
      "quotes": [
        {
          "text": "The quote, character for character as in the source.",
          "passage_id": "<corpus>:blog/2012-07-29-a-post.md:21",
          "citation": "Author Name, *Full Title of the Post*, 29 July 2012 · [archive](…) · [public](https://…)",
          "verified": true
        }
      ]
    }
  ]
}
```

- **Required:** `schema_version` (the number 1), `question` (non-empty), `corpora`, `filters` and `commands` (arrays of strings; may be empty), `built_at` (string; the index build time from `scout index status`), `claims` (at least one).
- **Each claim:** `id` (non-empty, unique in the file), `text` (non-empty), `quotes` (array). Optional: `period` (string; the claim's heading), `role` (`"wrote"` or `"read"`, nothing else).
- **Each quote:** `text` (non-empty; the exact source text you passed to `verify-quote`), `passage_id` (`<corpus>:<path>:<line>`, as `scout cite` takes it; its corpus is where a reader re-verifies), `citation` (non-empty; the attribution line of `scout cite --format markdown`, without the leading `— `), `verified` (boolean: what `verify-quote` returned).
- **Optional:** `built_at_by_corpus` (object of strings), `verified_count` (`"<verified>/<quotes>"`; readers warn when it disagrees with the `verified` flags).
- **Warned, still opens:** a claim with no quotes; a `verified_count` mismatch.
- A quote with `verified: false` belongs fixed or removed (step 5); readers show it as failed either way.

## Known limits

- No lemmatisation: inflected forms are separate words; search for the forms explicitly (`teach*`, or each form).
- Archive links depend on each corpus's `link` template in the registry; a corpus without one cites `file://` paths.
- The same text stored twice (a blog post and its book chapter) gives repeated results; say so in the report's caveats.
- Markdown files without the frontmatter a corpus requires (see `scout corpora show <id>`) are not indexed.

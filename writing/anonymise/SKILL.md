---
name: anonymise
description: "Detect and redact personally identifiable information (PII) in text on your own machine, using OpenAI's open-weight privacy-filter model via Hugging Face Transformers — no cloud API. Use when asked to anonymise or redact a document, scrub names, emails, phone numbers, addresses or credentials from transcripts, logs, survey responses or research data, or clean text before sending it to a hosted LLM. Outputs masked text, stable pseudonyms, or JSON spans with offsets."
---

# anonymise — Local PII Redaction (OpenAI Privacy Filter)

Detect and redact PII in text using OpenAI's open-weight `openai/privacy-filter` model. Runs locally via Hugging Face Transformers. No cloud, no MLX.

## What this skill does

Given input text (positional argument, `-f file`, or stdin), this skill:

1. Loads `openai/privacy-filter` from the local Hugging Face cache (auto-downloads on first run).
2. Runs token-classification across the input in a single forward pass.
3. Aggregates BIOES tokens into PII spans across the eight categories.
4. Either **masks** spans (`<PRIVATE_PERSON>`), **pseudonymises** them (`PERSON_1`, `PERSON_2` — deterministic and consistent within a document), or returns **tag-only** JSON with offsets and no rewriting.

This skill is the right tool when:

- You have text containing real PII (survey responses, transcripts, support tickets, application logs, draft emails, research data) and you need a clean version.
- The PII you're worried about falls into the eight standard categories: names, account numbers, addresses, emails, phone numbers, URLs, dates of birth, and secrets/credentials.
- You want the redaction to happen on this machine, not via a cloud API.

This skill is **not** the right tool when:

- You need to redact bespoke organisational categories (project codenames, internal role titles, the names of particular teams or institutions) — those require either fine-tuning Privacy Filter or using a different model. See `references/limitations.md`.
- You need a legal anonymisation guarantee. OpenAI explicitly disclaims this: the model is offered as a data-minimisation aid, not as anonymisation, compliance or a safety guarantee. Treat the output as one layer in a privacy-by-design pipeline, not the final word.
- The text is in Hausa, Western Punjabi, or another language for which the model card reports F1 < 0.86. See `references/multilingual-coverage.md`.

## Prerequisites

Scripts use `uv run` with inline dependencies (PEP 723) — no venv needed.
Ensure `uv` is installed: `which uv`

The model is cached wherever Hugging Face keeps its downloads — `~/.cache/huggingface/hub` by default, or the directory you point `HF_HUB_CACHE` / `HF_HOME` at. On first run the model downloads (~3 GB; subsequent runs load from cache in seconds).

**Transformers version requirement**: Privacy Filter requires `transformers >= 5.6.0` (released 2026-04-22), the first release that registers the `OpenAIPrivacyFilterForTokenClassification` architecture. If your uv configuration pins package resolution to an older cut-off (`exclude-newer` in `uv.toml` or `pyproject.toml`), resolution will silently hold you back to 5.5.x and the model will fail to load. Override it for a single run with `UV_EXCLUDE_NEWER=2030-01-01` (or any future date) in front of the `uv run` command.

**Pre-flight** — check whether the model is already cached:

```bash
ls "${HF_HUB_CACHE:-$HOME/.cache/huggingface/hub}" | grep -i "privacy-filter"
```

If `models--openai--privacy-filter` is present, the first run will be fast.

## Quick Start

```bash
# Direct text input
uv run --python 3.12 scripts/anonymise.py "Alice Smith lives at 12 Main St. Email alice@example.com"

# File input
uv run --python 3.12 scripts/anonymise.py -f /path/to/document.txt

# Pipe input
cat /path/to/document.txt | uv run --python 3.12 scripts/anonymise.py

# JSON output with span offsets
uv run --python 3.12 scripts/anonymise.py -f input.txt --json

# Pseudonymise instead of mask (deterministic fake values, stable within document)
uv run --python 3.12 scripts/anonymise.py -f input.txt --mode pseudonymise

# Tag-only — return JSON with spans, no rewriting
uv run --python 3.12 scripts/anonymise.py -f input.txt --mode tag-only --json
```

If your uv setup pins `exclude-newer` (see Prerequisites), prefix any of these with `UV_EXCLUDE_NEWER=2030-01-01` so `transformers >= 5.6.0` can be resolved.

## Output Modes

| Mode | Output | When to use |
|---|---|---|
| `mask` (default) | Each span replaced with `<{CATEGORY}>` (e.g. `<PRIVATE_PERSON>`). Matches the official `opf` CLI. | When you only need to suppress PII and downstream consumers don't need readable text. |
| `pseudonymise` | Each unique span replaced with a stable token (`PERSON_1`, `PERSON_2`, `EMAIL_1`, …). Same span value → same replacement within the document. | When you want to send the redacted text to a commercial LLM and still get coherent reasoning back. The LLM sees consistent referents (same person referenced multiple times keeps the same pseudonym). |
| `tag-only` | No rewriting. JSON output lists detected spans with `start`/`end`/`label`/`text`. Use with `--json`. | When downstream code needs the offsets to do its own redaction (e.g. preserving formatting, applying custom replacements). |

## Output Schema (with `--json`)

The JSON output mirrors the official `opf` CLI schema:

```json
{
  "schema_version": 1,
  "summary": {
    "output_mode": "mask",
    "span_count": 3,
    "by_label": {"private_person": 1, "private_address": 1, "private_email": 1}
  },
  "text": "Alice Smith lives at 12 Main St. Email alice@example.com",
  "detected_spans": [
    {"label": "private_person", "start": 0, "end": 11, "text": "Alice Smith", "placeholder": "<PRIVATE_PERSON>"},
    {"label": "private_address", "start": 21, "end": 31, "text": "12 Main St", "placeholder": "<PRIVATE_ADDRESS>"},
    {"label": "private_email", "start": 39, "end": 56, "text": "alice@example.com", "placeholder": "<PRIVATE_EMAIL>"}
  ],
  "redacted_text": "<PRIVATE_PERSON> lives at <PRIVATE_ADDRESS>. Email <PRIVATE_EMAIL>"
}
```

## The eight PII categories

| Category | Definition |
|---|---|
| `private_person` | Name of a private person, including usernames and handles that identify a specific person |
| `account_number` | Credit card, bank account, or other account identifier (includes national IDs in the trained taxonomy) |
| `private_url` | URL or IP address meant for a private audience or that identifies a private person |
| `private_email` | Email used for personal communication or that identifies a private person |
| `private_phone` | Phone number associated with a private person |
| `private_address` | Specific location or address associated with a private person |
| `secret` | API key, password, or other credential |
| `private_date` | Date of birth, birth year, or other datetime that identifies a private person |

Public-figure names, organisation names, and event dates that don't identify a private person are **not** in the taxonomy by design. See `references/label-taxonomy.md`.

## Generated Script Template

Scripts in this skill use this PEP 723 inline metadata header:

```python
#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["transformers>=5.6.0", "torch>=2.4", "huggingface-hub>=0.25"]
# ///
```

**Rules for generated scripts:**

- Do NOT create local venvs or `pip install` into global Python
- Run all scripts with `uv run --python 3.12 script.py`
- Default model: `openai/privacy-filter` (loads via `transformers.pipeline`)
- Use `aggregation_strategy="simple"` to get clean BIOES-aggregated spans
- Let Hugging Face resolve its own cache location — respect `HF_HUB_CACHE` / `HF_HOME` if the environment sets one, and never hard-code a model directory
- Default placeholder format: `<PRIVATE_PERSON>` etc. (matches the official `opf` CLI)

## Limitations to know

Summarised from the OpenAI model card (see `references/limitations.md` for the fuller account and a link to the card):

- Privacy Filter is *not* an anonymisation, compliance, or safety guarantee.
- Performance drops on non-English text, non-Latin scripts, and out-of-distribution domains.
- The eight-category label policy is **static** — changing it requires fine-tuning, not runtime config.
- Per-category recall on bare PII (no surrounding context cue) is materially weaker than recall on PII in natural sentences. A list of bare phone numbers will be redacted less reliably than the same numbers in their natural form.
- Known failure modes include under-detection of uncommon names / regional naming conventions / initials, over-redaction of public entities when context is ambiguous, and missed novel-format secrets.
- Additional caution is warranted in medical, legal, financial, HR, education, and government workflows.

## Troubleshooting

- **First-run slow**: Model is ~3GB; downloads on first invocation. Subsequent runs load from the Hugging Face cache in seconds.
- **Out of memory**: The model is small (1.5B / 50M active) — should fit comfortably in 4 GB of RAM. If you see OOM, close other apps or check that you're not loading multiple models in parallel.
- **MPS warnings on Apple Silicon**: Some `transformers` versions emit MPS-related warnings on first load. Safe to ignore; inference still runs.
- **Span boundaries look slightly off**: The HF `pipeline` uses simple BIOES aggregation. The official `opf` CLI uses constrained Viterbi decoding which produces marginally cleaner spans. For maximum span coherence, use the official `opf` CLI from `github.com/openai/privacy-filter` instead. See `references/opf-cli.md`.
- **Wrong category for a known identifier**: National IDs, passport numbers, and similar are mapped to `account_number` (per the trained taxonomy). This is by design.
- **Performance on Czech / Polish / regional names**: Privacy Filter was trained primarily on English with some multilingual coverage. For consistent quality on non-Western European names or non-Latin scripts, evaluate in-domain before relying on it.

## Related

- **Upstream sources**: the `openai/privacy-filter` model card (<https://huggingface.co/openai/privacy-filter>) and repository (`github.com/openai/privacy-filter`). Claims about the model's taxonomy, limitations and evaluation scores in the reference pages below are summarised from the model card dated 22 April 2026; follow the link for the vendor's own text.
- **Beyond the eight categories**: for redaction driven by a written policy rather than a fixed taxonomy, a policy-classification model such as `openai/gpt-oss-safeguard-20b` is the usual complement. That path is not implemented here; this skill deliberately covers only the trained PII taxonomy.
- **Source references**: `references/opf-cli.md`, `references/label-taxonomy.md`, `references/limitations.md`, `references/multilingual-coverage.md`

# Using the official `opf` CLI instead of this skill

This skill wraps `openai/privacy-filter` via Hugging Face Transformers and uses the `pipeline("token-classification", ...)` BIOES aggregation. That works well, but for absolute span-coherence quality the official `opf` CLI from the OpenAI privacy-filter repository runs the model's full constrained Viterbi decoder (with the six tunable transition-bias parameters described in section 2.3 of the model card).

When to switch:

- You need precision/recall calibration via the documented decoder operating points.
- You see span-boundary fragmentation that the simple BIOES aggregator can't fix.
- You want the official redacted output mode (`--output-mode redacted`) that collapses all eight categories to a single `<REDACTED>` placeholder.
- You want to fine-tune the model on a target dataset (`opf train`).

## Install

The `opf` CLI is shipped from source, not on PyPI:

```bash
git clone https://github.com/openai/privacy-filter
cd privacy-filter
uv tool install --editable .
```

(Clone it into wherever you keep upstream checkouts — the install is editable, so the checkout has to stay put.)

After install, `opf` is on `PATH`.

## Usage examples (from the official PDF model card, pages 8-9)

```bash
# One-shot redaction
opf "Ben Morgan lives at 12 3rd St. Call him at 123 456 7890."
# → <PRIVATE_PERSON> lives at <PRIVATE_ADDRESS>. Call him at <PRIVATE_PHONE>.

# File input
opf -f /path/to/file

# Pipe input
cat /path/to/file | opf

# JSON output (full schema)
opf "Ben Morgan lives at 12 3rd St." --format json

# Single-label redaction (collapse all categories to <REDACTED>)
opf "Ben Morgan lives at 12 3rd St." --output-mode redacted
# → <REDACTED> lives at <REDACTED>.

# CPU
opf --device cpu "..."

# Override checkpoint
opf --checkpoint /path/to/checkpoint_dir "..."
```

## Default checkpoint location

The `opf` CLI looks for a model in the `OPF_CHECKPOINT` env var, then `~/.opf/privacy_filter`. If neither exists, the CLI auto-downloads. That is **separate** from the Hugging Face cache this skill uses, so running both downloads the model twice unless you point one at the other.

To share a single copy, set `OPF_CHECKPOINT` to the snapshot directory inside the HF cache:

```bash
HF_CACHE="${HF_HUB_CACHE:-$HOME/.cache/huggingface/hub}"
ls "$HF_CACHE/models--openai--privacy-filter/snapshots/"   # after the first transformers load
export OPF_CHECKPOINT="$HF_CACHE/models--openai--privacy-filter/snapshots/<sha>"
```

## Mode parity with this skill

| This skill (`anonymise`) | Official `opf` CLI |
|---|---|
| `--mode mask` (default) | default (typed labels) |
| `--mode pseudonymise` | not natively supported — use `--format json` and post-process |
| `--mode tag-only --json` | `--format json` |
| not supported | `--output-mode redacted` (single `<REDACTED>` collapse) |
| not supported | decoder transition-bias tuning flags |
| not supported | `opf eval` (benchmark mode) |
| not supported | `opf train` (fine-tuning mode) |

This skill is the right entry point for fast, simple redaction inside a development workflow. For evaluation, fine-tuning, or precision/recall calibration, use the official CLI directly.

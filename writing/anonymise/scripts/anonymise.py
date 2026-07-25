#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["transformers>=5.6.0", "torch>=2.4", "huggingface-hub>=0.25"]
# ///
# Note: transformers >= 5.6.0 (released 2026-04-22) is required because that
# is the first release that registers the openai/privacy-filter architecture
# (`OpenAIPrivacyFilterForTokenClassification`, model_type `openai_privacy_filter`).
# If your uv configuration pins `exclude-newer`, resolution can silently hold
# you back to an older transformers and the model will fail to load. Override
# it for one run with `UV_EXCLUDE_NEWER=2030-01-01 uv run ...`.
"""
Local PII redaction via OpenAI Privacy Filter (openai/privacy-filter).

Detects 8 PII categories (private_person, account_number, private_address,
private_email, private_phone, private_url, private_date, secret) and emits
either masked text, pseudonymised text, or structured JSON with span offsets.

Usage:
    uv run --python 3.12 scripts/anonymise.py "text to redact"
    uv run --python 3.12 scripts/anonymise.py -f input.txt
    cat input.txt | uv run --python 3.12 scripts/anonymise.py
    uv run --python 3.12 scripts/anonymise.py -f input.txt --mode pseudonymise --json

Model: openai/privacy-filter (~3GB, downloads to the Hugging Face cache on
first run; set HF_HUB_CACHE or HF_HOME to relocate it)
Architecture and evaluation details: the openai/privacy-filter model card.
"""

import argparse
import json
import sys
from dataclasses import dataclass

MODEL_ID = "openai/privacy-filter"

CATEGORIES = (
    "account_number",
    "private_address",
    "private_email",
    "private_person",
    "private_phone",
    "private_url",
    "private_date",
    "secret",
)


@dataclass
class Span:
    label: str
    start: int
    end: int
    text: str
    placeholder: str


def load_classifier(device: str | None = None):
    from transformers import pipeline

    kwargs = {"task": "token-classification", "model": MODEL_ID, "aggregation_strategy": "simple"}
    if device is not None:
        kwargs["device"] = device
    return pipeline(**kwargs)


def detect_spans(classifier, text: str, mode: str) -> list[Span]:
    raw = classifier(text)
    # The HF `simple` aggregation does not fully consume BIOES E/S boundary
    # tags — adjacent same-label spans (e.g. "Alice" + " Smith") sometimes come
    # back as two records instead of one. Merge them before assigning placeholders.
    merged: list[tuple[str, int, int]] = []
    for entity in raw:
        label = entity["entity_group"]
        start = int(entity["start"])
        end = int(entity["end"])
        if merged and merged[-1][0] == label:
            prev_label, prev_start, prev_end = merged[-1]
            gap = text[prev_end:start]
            # Merge if adjacent (no gap) or separated only by whitespace.
            if start <= prev_end or gap.strip() == "":
                merged[-1] = (prev_label, prev_start, end)
                continue
        merged.append((label, start, end))

    spans: list[Span] = []
    for label, start, end in merged:
        # Trim leading/trailing whitespace from the span — the tokenizer often
        # includes the leading space in the entity boundary. Without trimming,
        # `Reach Pat at alice@example.com` redacts to `Reach Pat at<EMAIL>`,
        # silently dropping the space between "at" and the placeholder.
        while start < end and text[start].isspace():
            start += 1
        while end > start and text[end - 1].isspace():
            end -= 1
        if start >= end:
            continue
        span_text = text[start:end]
        placeholder = build_placeholder(label, span_text, mode, spans)
        spans.append(Span(label=label, start=start, end=end, text=span_text, placeholder=placeholder))
    return spans


def build_placeholder(label: str, span_text: str, mode: str, prior_spans: list[Span]) -> str:
    if mode == "mask":
        return f"<{label.upper()}>"
    if mode == "tag-only":
        return f"<{label.upper()}>"
    if mode == "pseudonymise":
        # Stable within a document: same span text gets the same pseudonym.
        for prev in prior_spans:
            if prev.label == label and prev.text == span_text:
                return prev.placeholder
        # Allocate the next sequential pseudonym for this label, counting distinct
        # prior values (not raw span occurrences — repeats reuse the early-return).
        prefix = label.replace("private_", "").upper()
        distinct_prior_values = {p.text for p in prior_spans if p.label == label}
        index = len(distinct_prior_values) + 1
        return f"{prefix}_{index}"
    raise ValueError(f"Unknown mode: {mode}")


def apply_redaction(text: str, spans: list[Span], mode: str) -> str:
    if mode == "tag-only":
        return text
    out: list[str] = []
    cursor = 0
    for span in spans:
        out.append(text[cursor:span.start])
        out.append(span.placeholder)
        cursor = span.end
    out.append(text[cursor:])
    return "".join(out)


def build_summary(spans: list[Span], mode: str) -> dict:
    by_label: dict[str, int] = {}
    for span in spans:
        by_label[span.label] = by_label.get(span.label, 0) + 1
    return {
        "output_mode": mode,
        "span_count": len(spans),
        "by_label": by_label,
    }


def read_input(args: argparse.Namespace) -> str:
    if args.text is not None:
        return args.text
    if args.file is not None:
        with open(args.file, "r", encoding="utf-8") as fh:
            return fh.read()
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise SystemExit(
        "No input provided. Pass text as a positional argument, use -f FILE, or pipe to stdin."
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect and redact PII via OpenAI Privacy Filter (openai/privacy-filter)."
    )
    parser.add_argument("text", nargs="?", help="Text to redact (positional)")
    parser.add_argument("-f", "--file", help="Read text from FILE instead of argv/stdin")
    parser.add_argument(
        "--mode",
        choices=["mask", "pseudonymise", "tag-only"],
        default="mask",
        help="Redaction mode (default: mask)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit structured JSON instead of redacted text",
    )
    parser.add_argument(
        "--device",
        help="Override Transformers device (e.g. cpu, mps, cuda). Default: auto.",
    )
    args = parser.parse_args()

    text = read_input(args)
    classifier = load_classifier(device=args.device)
    spans = detect_spans(classifier, text, args.mode)
    redacted = apply_redaction(text, spans, args.mode)

    if args.json:
        payload = {
            "schema_version": 1,
            "summary": build_summary(spans, args.mode),
            "text": text,
            "detected_spans": [
                {
                    "label": s.label,
                    "start": s.start,
                    "end": s.end,
                    "text": s.text,
                    "placeholder": s.placeholder,
                }
                for s in spans
            ],
            "redacted_text": redacted,
        }
        json.dump(payload, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        sys.stdout.write(redacted)
        if not redacted.endswith("\n"):
            sys.stdout.write("\n")

    return 0


if __name__ == "__main__":
    # Model caching is left to huggingface_hub: it uses HF_HUB_CACHE or HF_HOME
    # when the environment sets one, and ~/.cache/huggingface/hub otherwise.
    sys.exit(main())

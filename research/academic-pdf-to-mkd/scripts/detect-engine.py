"""Pick an extraction engine based on the PDF's text-layer characteristics.

Prints one of: docling | fast | math

Rules (post-OCR PDF assumed — caller runs ocr-preflight first):
  - math engine  for table-heavy papers or high maths-symbol density
  - fast engine  if the document is short, dense, clean, low-math
  - docling      otherwise (default)
"""

from __future__ import annotations

import re
import subprocess
import sys
import unicodedata

MATH_RATIO_THRESHOLD = 0.025
MIN_WIDE_TABLES = 2
MIN_NUMERIC_COLUMNS = 5
TABLE_CAPTION = re.compile(r"^[ 	]*(?:table|tabla)[ 	]+([A-Z]?\d+)(?=[ 	.:]|$)", re.IGNORECASE)
NUMERIC_FIELD = re.compile(r"^[−+\-]?(?:\d|\.\d)")
FAST_MAX_PAGES = 12
FAST_MIN_WORDS_PER_PAGE = 200
FAST_MAX_MATH_RATIO = 0.01

EXTRA_MATH_CHARS = set("∑∫∮∂∇∆≈≠≤≥∈∉∀∃∪∩⊆⊂⊇⊃±×÷√∞∝⊕⊗⋅←→↔⇒⇔αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΥΦΨΩ")


def count_math_chars(text: str) -> int:
    count = 0
    for ch in text:
        if ch in EXTRA_MATH_CHARS:
            count += 1
            continue
        if unicodedata.category(ch) == "Sm":  # math symbol
            count += 1
    # Inline-equation hints: (1), (2.3a) reference markers in body text
    count += len(re.findall(r"\([0-9]+(?:\.[0-9]+)?[a-z]?\)", text))
    return count


def page_count(pdf_path: str) -> int:
    try:
        out = subprocess.check_output(["pdfinfo", pdf_path], text=True, stderr=subprocess.DEVNULL)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return 0
    for line in out.splitlines():
        if line.startswith("Pages:"):
            try:
                return int(line.split()[1])
            except (IndexError, ValueError):
                return 0
    return 0


def pdf_text(pdf_path: str) -> str:
    try:
        return subprocess.check_output(
            ["pdftotext", "-layout", pdf_path, "-"], text=True, stderr=subprocess.DEVNULL
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def count_wide_tables(text: str) -> int:
    """Count distinct numbered tables with a wide numeric row near the caption."""
    tables = set()
    for page in text.split("\f"):
        lines = page.splitlines()
        for index, line in enumerate(lines):
            caption = TABLE_CAPTION.match(line)
            if not caption:
                continue
            # Look below the caption on this page, before the next caption.
            for row in lines[index + 1:index + 16]:
                if TABLE_CAPTION.match(row):
                    break
                columns = re.split(r"[ 	]{2,}", row.strip())
                if sum(bool(NUMERIC_FIELD.match(column)) for column in columns) >= MIN_NUMERIC_COLUMNS:
                    tables.add(caption[1].upper())
                    break
    return len(tables)


def select_engine(pages: int, words: int, math_chars: int, wide_tables: int) -> tuple[str, str]:
    math_ratio = math_chars / words if words else 0.0
    if wide_tables >= MIN_WIDE_TABLES:
        return "math", "table-heavy"
    if math_ratio >= MATH_RATIO_THRESHOLD:
        return "math", "maths-heavy"
    if (
        pages <= FAST_MAX_PAGES
        and words / pages >= FAST_MIN_WORDS_PER_PAGE
        and math_ratio < FAST_MAX_MATH_RATIO
    ):
        return "fast", "short, dense, low-maths"
    return "docling", "default"


def choose_engine(pdf_path: str) -> tuple[str, dict]:
    text = pdf_text(pdf_path)
    words = len(text.split())
    math_chars = count_math_chars(text)
    pages = page_count(pdf_path) or 1
    wide_tables = count_wide_tables(text)
    engine, reason = select_engine(pages, words, math_chars, wide_tables)
    return engine, {
        "pages": pages,
        "words": words,
        "math_chars": math_chars,
        "math_ratio": round(math_chars / words, 4) if words else 0.0,
        "words_per_page": words // pages,
        "wide_tables": wide_tables,
        "reason": reason,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: detect-engine.py <pdf_path>", file=sys.stderr)
        return 1
    engine, metrics = choose_engine(sys.argv[1])
    print(
        f"detect-engine: pages={metrics['pages']} words={metrics['words']} "
        f"math_chars={metrics['math_chars']} math_ratio={metrics['math_ratio']} "
        f"words_per_page={metrics['words_per_page']} wide_tables={metrics['wide_tables']} "
        f"-> {engine} ({metrics['reason']})",
        file=sys.stderr,
    )
    print(f"{engine} {metrics['reason']}" if sys.argv[2:] == ["--with-reason"] else engine)
    return 0


if __name__ == "__main__":
    sys.exit(main())

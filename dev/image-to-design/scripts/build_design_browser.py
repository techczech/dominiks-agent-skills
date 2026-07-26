#!/usr/bin/env python3
"""Build a static image review page for an image-to-design planning folder."""

from __future__ import annotations

import html
import sys
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def read_notes(version_dir: Path) -> str:
    notes_path = version_dir / "notes.md"
    if not notes_path.exists():
        return ""
    text = notes_path.read_text(encoding="utf-8").strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    useful = [line for line in lines if not line.startswith("#")]
    return " ".join(useful[:4])


def collect_images(plan_dir: Path) -> list[dict[str, str]]:
    versions_dir = plan_dir / "versions"
    if not versions_dir.exists():
        return []

    images: list[dict[str, str]] = []
    for version_dir in sorted(p for p in versions_dir.iterdir() if p.is_dir()):
        notes = read_notes(version_dir)
        for image_path in sorted(version_dir.iterdir()):
            if image_path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            images.append(
                {
                    "version": version_dir.name,
                    "filename": image_path.name,
                    "relative_path": image_path.relative_to(plan_dir).as_posix(),
                    "notes": notes,
                }
            )
    return images


def render_page(plan_dir: Path, images: list[dict[str, str]]) -> str:
    title = plan_dir.name.replace("-", " ").replace("_", " ").title()
    cards = []
    for item in images:
        notes = f"<p>{html.escape(item['notes'])}</p>" if item["notes"] else ""
        cards.append(
            f"""
            <article class="card">
              <header>
                <strong>{html.escape(item["version"])}</strong>
                <span>{html.escape(item["filename"])}</span>
              </header>
              <a href="{html.escape(item["relative_path"])}">
                <img src="{html.escape(item["relative_path"])}" alt="{html.escape(item["version"] + " " + item["filename"])}">
              </a>
              {notes}
            </article>
            """
        )

    if not cards:
        cards.append('<p class="empty">No images found under versions/ yet.</p>')

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)} Design Review</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f5f7fa;
      color: #17202a;
    }}
    body {{
      margin: 0;
      padding: 32px;
    }}
    main {{
      max-width: 1440px;
      margin: 0 auto;
    }}
    h1 {{
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.15;
    }}
    .meta {{
      margin: 0 0 24px;
      color: #5c6875;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      align-items: start;
    }}
    .card {{
      background: #ffffff;
      border: 1px solid #d9e0e8;
      border-radius: 8px;
      overflow: hidden;
    }}
    .card header {{
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid #e7edf3;
      font-size: 14px;
    }}
    .card header span {{
      color: #687585;
      overflow-wrap: anywhere;
      text-align: right;
    }}
    img {{
      display: block;
      width: 100%;
      height: auto;
      background: #edf1f5;
    }}
    p {{
      margin: 0;
      padding: 12px 14px 14px;
      color: #4d5a66;
      line-height: 1.45;
      font-size: 14px;
    }}
    .empty {{
      padding: 20px;
      background: #ffffff;
      border: 1px solid #d9e0e8;
      border-radius: 8px;
    }}
  </style>
</head>
<body>
  <main>
    <h1>{html.escape(title)} Design Review</h1>
    <p class="meta">Static side-by-side browser for images saved under <code>versions/</code>.</p>
    <section class="grid">
      {"".join(cards)}
    </section>
  </main>
</body>
</html>
"""


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: build_design_browser.py <design-plan-folder>", file=sys.stderr)
        return 2

    plan_dir = Path(sys.argv[1]).expanduser().resolve()
    if not plan_dir.exists() or not plan_dir.is_dir():
        print(f"Design plan folder not found: {plan_dir}", file=sys.stderr)
        return 1

    html_path = plan_dir / "review.html"
    html_path.write_text(render_page(plan_dir, collect_images(plan_dir)), encoding="utf-8")
    print(html_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

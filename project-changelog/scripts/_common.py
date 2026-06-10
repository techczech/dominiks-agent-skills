"""Shared helpers for project-changelog scripts. Pure stdlib."""
import json
import re
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent


def resolve_changelog_dir(explicit=None):
    if explicit:
        p = Path(explicit).resolve()
    else:
        p = Path.cwd() / "changelog"
    if not p.exists():
        raise SystemExit(f"error: changelog directory not found at {p}")
    return p


def load_config(cdir):
    cfg = cdir / ".config.json"
    if cfg.exists():
        return json.loads(cfg.read_text())
    return {}


def slugify(title):
    s = title.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def find_entry(bucket_dir, entry_id):
    if not bucket_dir.exists():
        return None
    direct = bucket_dir / f"{entry_id}.md"
    if direct.exists():
        return direct
    for p in bucket_dir.rglob("*.md"):
        if p.name in ("INDEX.md", "README.md", "AGENTS.md"):
            continue
        meta, _ = parse_frontmatter(p.read_text())
        if meta.get("id") == entry_id:
            return p
    return None


def parse_frontmatter(text):
    """Parse YAML frontmatter subset. Returns (meta_dict, body_str)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---\n", 4)
    if end == -1:
        tail = text.rfind("\n---")
        if tail != -1 and text[tail:].strip() == "---":
            header = text[4:tail]
            body = ""
            return _parse_yaml(header), body
        return {}, text
    header = text[4:end]
    body = text[end + 5:]
    return _parse_yaml(header), body


def _parse_yaml(text):
    lines = text.split("\n")
    result = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            i += 1
            continue
        if line.startswith(" ") or line.startswith("\t"):
            i += 1
            continue
        m = re.match(r"^([a-zA-Z_][\w-]*):(.*)$", line)
        if not m:
            i += 1
            continue
        key, rest = m.group(1), m.group(2).strip()
        if rest == "":
            sub = {}
            j = i + 1
            while j < len(lines):
                subline = lines[j]
                if not subline.strip():
                    j += 1
                    continue
                if re.match(r"^(?:\s{2,}|\t)", subline):
                    sm = re.match(r"^\s+([a-zA-Z_][\w-]*):\s*(.*)$", subline)
                    if sm:
                        sub[sm.group(1)] = _parse_value(sm.group(2).strip())
                    j += 1
                else:
                    break
            result[key] = sub if sub else {}
            i = j
        else:
            result[key] = _parse_value(rest)
            i += 1
    return result


def _parse_value(s):
    s = s.strip()
    if not s:
        return None
    if s == "[]":
        return []
    if s == "{}":
        return {}
    if s.startswith("[") and s.endswith("]"):
        inner = s[1:-1].strip()
        if not inner:
            return []
        return [_unquote(x.strip()) for x in _split_csv(inner)]
    return _unquote(s)


def _split_csv(s):
    return [x.strip() for x in s.split(",")]


def _unquote(s):
    if len(s) >= 2:
        if (s[0] == '"' and s[-1] == '"') or (s[0] == "'" and s[-1] == "'"):
            return s[1:-1]
    if s == "true":
        return True
    if s == "false":
        return False
    if s in ("null", "~"):
        return None
    return s


KEY_ORDER = [
    "title",
    "id",
    "date",
    "type",
    "status",
    "priority",
    "owner",
    "depends_on",
    "artifacts",
    "tags",
    "refs",
    "superseded_by",
    "updated",
]


def serialize_frontmatter(meta):
    lines = ["---"]
    seen = set()
    for key in KEY_ORDER:
        if key in meta:
            seen.add(key)
            lines.extend(_emit(key, meta[key]))
    for key in meta:
        if key not in seen:
            lines.extend(_emit(key, meta[key]))
    lines.append("---")
    return "\n".join(lines) + "\n"


def _emit(key, v):
    if v is None:
        return [f"{key}:"]
    if isinstance(v, bool):
        return [f"{key}: {'true' if v else 'false'}"]
    if isinstance(v, list):
        if not v:
            return [f"{key}: []"]
        items = ", ".join(_scalar(x) for x in v)
        return [f"{key}: [{items}]"]
    if isinstance(v, dict):
        if not v:
            return [f"{key}: {{}}"]
        out = [f"{key}:"]
        for k, vv in v.items():
            if isinstance(vv, list):
                if not vv:
                    out.append(f"  {k}: []")
                else:
                    items = ", ".join(_scalar(x) for x in vv)
                    out.append(f"  {k}: [{items}]")
            else:
                out.append(f"  {k}: {_scalar(vv)}")
        return out
    return [f"{key}: {_scalar(v)}"]


def _scalar(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    s = str(v)
    if not s:
        return '""'
    if any(c in s for c in [":", "#", "[", "]", "{", "}", ","]):
        return f'"{s}"'
    return s


def as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def add_ref(meta, key, value):
    refs = meta.get("refs") or {}
    if not isinstance(refs, dict):
        refs = {}
    cur = refs.get(key)
    if cur is None:
        cur = []
    elif not isinstance(cur, list):
        cur = [cur]
    if value not in cur:
        cur.append(value)
    refs[key] = cur
    meta["refs"] = refs


def update_entry(path, updates):
    text = path.read_text()
    meta, body = parse_frontmatter(text)
    for k, v in updates.items():
        if k == "refs" and isinstance(v, dict):
            for rk, rv in v.items():
                add_ref(meta, rk, rv)
        else:
            meta[k] = v
    path.write_text(serialize_frontmatter(meta) + body)

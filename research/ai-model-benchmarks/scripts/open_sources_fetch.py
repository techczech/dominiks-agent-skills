#!/usr/bin/env python3
"""Fetch Arena (lmarena-ai/leaderboard-dataset on Hugging Face) and OpenRouter dataset exports.

Both are free, need NO key, and are licensed CC BY 4.0 (attribution required). Kept separate from aa_fetch.py.
Usage:
  python3 -I open_sources_fetch.py [--source arena|openrouter|all]
      [--arena text_style_control,text_to_image] [--arena-category overall] [--history]
      [--openrouter rankings-daily,benchmark-leaderboard,search-benchmark-lanes] [--refresh] [--max-requests 10]
Snapshots: snapshots/YYYY-MM-DD/arena-<subset>.json.gz and openrouter-<dataset>.json.gz
Import: load_open_snapshot(name, date=None) -> dict (name like "arena-text_style_control")
"""
import argparse
import datetime as dt
import glob
import gzip
import json
import os
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP_DIR = os.path.join(SKILL_DIR, "snapshots")
HF_HOST = "datasets-server.huggingface.co"
HF_DATASET = "lmarena-ai/leaderboard-dataset"
OR_HOST = "openrouter.ai"
OR_BASE = "https://openrouter.ai/api/v1/datasets/exports"
PAGE = 100  # datasets-server maximum
MAX_PAGES = 30
# The 22 subsets of the Arena dataset (from the /splits listing, 2026-10-09). "*_style_control" are the
# default views on the Arena site. agent* subsets use score/score_ci_*/observation_count instead of rating*.
ARENA_SUBSETS = [
    "text", "text_style_control", "text_factuality", "webdev", "vision", "vision_style_control", "search",
    "search_style_control", "search_factuality", "document", "document_style_control", "text_to_image",
    "image_edit", "text_to_video", "image_to_video", "video_edit", "agent", "agent_bash_recovery_steps",
    "agent_praise_complaint", "agent_steerability", "agent_task_outcome_explicit", "agent_tool_hallucination"]
OR_DATASETS = ["rankings-daily", "benchmark-leaderboard", "search-benchmark-lanes", "benchmark-runs"]
OR_DEFAULT = ["rankings-daily", "benchmark-leaderboard", "search-benchmark-lanes"]  # benchmark-runs only on request
ARENA_LICENCE = "CC BY 4.0"
ARENA_ATTRIBUTION = "Source: Arena (lmarena-ai/leaderboard-dataset), licensed under CC BY 4.0"


class FetchError(Exception):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **kw):
        raise FetchError("unexpected redirect")


_OPENER = urllib.request.build_opener(_NoRedirect())


def _open(req):
    return _OPENER.open(req, timeout=120)


class Budget:
    def __init__(self, cap):
        self.cap, self.used = cap, 0

    def take(self):
        if self.used >= self.cap:
            raise FetchError("request cap (%d) reached; raise --max-requests to continue" % self.cap)
        self.used += 1


def _get_json(url, host, budget):
    """GET json from https://<host>/ only; no redirects; generic errors (no bodies)."""
    if not url.startswith("https://%s/" % host):
        raise FetchError("refusing a URL outside the expected host")
    text, ok = None, False
    for attempt in range(3):  # transient 5xx ("dataset index is loading") get up to 2 retries; each counts
        budget.take()
        status = None
        try:
            with _open(urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ai-model-benchmarks-skill/1"})) as r:
                text = r.read().decode("utf-8")
                ok = True
        except FetchError:
            raise
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception:
            status = 0
        if ok:
            break
        if status is not None and (status >= 500 or status == 0) and attempt < 2:
            time.sleep(8)
            continue
        break
    if not ok:
        raise FetchError("request to %s failed" % host)
    obj, parsed = None, False
    try:
        obj = json.loads(text)
        parsed = True
    except Exception:
        pass
    if not parsed:
        raise FetchError("could not parse response from %s" % host)
    return obj


# ---------------------------------------------------------------- Arena
def parse_arena_page(body):
    """Validate one datasets-server page. Returns (rows, total)."""
    if not isinstance(body, dict) or not isinstance(body.get("rows"), list):
        raise FetchError("unexpected Arena response shape")
    rows = []
    for r in body["rows"]:
        if not isinstance(r, dict) or not isinstance(r.get("row"), dict):
            raise FetchError("unexpected Arena row shape")
        rows.append(r["row"])
    total = body.get("num_rows_total")
    if not isinstance(total, int) or isinstance(total, bool):
        raise FetchError("unexpected Arena total")
    return rows, total


def fetch_arena(subset, budget, category="overall", history=False, top=None):
    if subset not in ARENA_SUBSETS:
        raise FetchError("unknown Arena subset %r" % subset)
    use_filter = bool(category) and not subset.startswith("agent")
    endpoint = "filter" if use_filter else "rows"
    rows, total = [], None
    for page in range(MAX_PAGES):
        q = [("dataset", HF_DATASET), ("config", subset), ("split", "full" if history else "latest"),
             ("offset", str(page * PAGE)), ("length", str(PAGE))]
        if use_filter:
            w = "\"category\"='%s'" % category.replace("'", "")
            if top:
                w += " AND \"rank\"<=%d" % int(top)
            q.append(("where", w))
        body = _get_json("https://%s/%s?%s" % (HF_HOST, endpoint, urllib.parse.urlencode(q)), HF_HOST, budget)
        got, total = parse_arena_page(body)
        rows.extend(got)
        if len(got) < PAGE or len(rows) >= total:
            break
    else:
        raise FetchError("Arena pagination cap reached; snapshot not saved")
    dates = sorted({r.get("leaderboard_publish_date") for r in rows if r.get("leaderboard_publish_date")})
    return {"fetched_at": _now(), "source": "https://huggingface.co/datasets/" + HF_DATASET,
            "licence": ARENA_LICENCE, "attribution": ARENA_ATTRIBUTION, "subset": subset,
            "category": category if use_filter else None, "top_rank": top if use_filter else None, "split": "full" if history else "latest",
            "publish_date": dates[-1] if dates else None, "data": rows}


# ---------------------------------------------------------------- OpenRouter
def parse_or_export(body, dataset):
    """Validate an OpenRouter export envelope. Returns snapshot dict."""
    if not isinstance(body, dict) or not isinstance(body.get("rows"), list) \
            or not all(isinstance(r, dict) for r in body["rows"]):
        raise FetchError("unexpected OpenRouter response shape")
    if body.get("dataset") != dataset:
        raise FetchError("OpenRouter dataset id mismatch")
    lic = body.get("license")
    return {"fetched_at": _now(), "source": "https://openrouter.ai", "dataset": dataset,
            "licence": (lic or {}).get("name", "CC BY 4.0") if isinstance(lic, dict) else "CC BY 4.0",
            "attribution": "Source: OpenRouter (openrouter.ai), licensed under CC BY 4.0",
            "as_of": body.get("snapshot_date"), "retrieved_at": body.get("retrieved_at"),
            "title": body.get("title"), "columns": [c.get("name") for c in body.get("columns", []) if isinstance(c, dict)],
            "data": body["rows"]}


def fetch_openrouter(dataset, budget):
    if dataset not in OR_DATASETS:
        raise FetchError("unknown OpenRouter dataset %r" % dataset)
    return parse_or_export(_get_json("%s/%s/latest.json" % (OR_BASE, dataset), OR_HOST, budget), dataset)


# ---------------------------------------------------------------- snapshots
def _now():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _validate(p):
    with gzip.open(p, "rt", encoding="utf-8") as f:
        d = json.load(f)
    if not isinstance(d, dict) or not isinstance(d.get("data"), list):
        raise ValueError("bad snapshot shape")
    return d


def write_snapshot(path, snap):
    """Atomic: temp file in same dir, re-read and validate, then os.replace."""
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    os.close(fd)
    try:
        with gzip.open(tmp, "wt", encoding="utf-8") as f:
            json.dump(snap, f)
        _validate(tmp)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def snapshot_path(name, date):
    return os.path.join(SNAP_DIR, date, name + ".json.gz")


def load_open_snapshot(name, date=None):
    """Latest (or dated) snapshot for e.g. 'arena-text_style_control'. Raises FileNotFoundError."""
    if date:
        p = snapshot_path(name, date)
        if not os.path.exists(p):
            raise FileNotFoundError("no %s snapshot for %s" % (name, date))
    else:
        found = sorted(glob.glob(os.path.join(SNAP_DIR, "*", name + ".json.gz")))
        if not found:
            raise FileNotFoundError("no %s snapshot; run open_sources_fetch.py" % name)
        p = found[-1]
    d = _validate(p)
    d["_snapshot_date"] = os.path.basename(os.path.dirname(p))
    return d


def available_snapshots(prefix):
    names = set()
    for p in glob.glob(os.path.join(SNAP_DIR, "*", prefix + "*.json.gz")):
        names.add(os.path.basename(p)[:-len(".json.gz")])
    return sorted(names)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default="all", choices=["arena", "openrouter", "all"])
    ap.add_argument("--arena", default="text_style_control", help="comma list of subsets, or 'all' (22 subsets: many requests)")
    ap.add_argument("--arena-category", default="overall", help="category filter ('' = none; agent subsets are never filtered)")
    ap.add_argument("--arena-top", type=int, help="only rows with rank <= N (fewer requests; default all)")
    ap.add_argument("--history", action="store_true", help="Arena split=full (rank over time); big, only on request")
    ap.add_argument("--openrouter", default=",".join(OR_DEFAULT))
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--max-requests", type=int, default=10, help="per run")
    a = ap.parse_args(argv)
    today = dt.date.today().isoformat()
    budget = Budget(a.max_requests)
    jobs = []
    if a.source in ("arena", "all"):
        subs = ARENA_SUBSETS if a.arena == "all" else [s.strip() for s in a.arena.split(",") if s.strip()]
        for s in subs:
            nm = "arena-%s" % s + ("--%s" % a.arena_category if a.arena_category not in ("overall", "") else "") + ("-history" if a.history else "")
            jobs.append((nm, lambda s=s: fetch_arena(s, budget, a.arena_category, a.history, a.arena_top)))
    if a.source in ("openrouter", "all"):
        for d in [x.strip() for x in a.openrouter.split(",") if x.strip()]:
            jobs.append(("openrouter-%s" % d, lambda d=d: fetch_openrouter(d, budget)))
    for nm, fn in jobs:
        p = snapshot_path(nm, today)
        if os.path.exists(p) and not a.refresh:
            try:
                print("%s: reused today's snapshot, %d rows, 0 requests" % (nm, len(_validate(p)["data"])))
                continue
            except Exception:
                print("%s: today's snapshot is unreadable; refetching" % nm)
        before = budget.used
        try:
            snap = fn()
            write_snapshot(p, snap)
        except FetchError as e:
            print("%s: error: %s" % (nm, e))
            print("total requests this run: %d" % budget.used)
            return 1
        print("%s: %d rows, %d requests -> %s" % (nm, len(snap["data"]), budget.used - before, p))
    print("total requests this run: %d" % budget.used)
    return 0


if __name__ == "__main__":
    sys.exit(main())

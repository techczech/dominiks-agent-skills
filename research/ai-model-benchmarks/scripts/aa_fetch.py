#!/usr/bin/env python3
"""Fetch Artificial Analysis free-tier data and store dated snapshots.

Usage: python3 -I aa_fetch.py [--categories language,text-to-image|all] [--refresh]
Import: load_snapshot(category, date=None) -> dict
The API key (see aa_key.py) is only ever placed in the request header; never printed or stored.
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
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from aa_key import FetchError, get_key, parse_json as _parse_json  # noqa: E402  (credential code lives in aa_key.py)

BASE = "https://artificialanalysis.ai/api/v2"
ORIGIN_PREFIX = "https://artificialanalysis.ai/"
MAX_PAGES = 50
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP_DIR = os.path.join(SKILL_DIR, "snapshots")

CATEGORIES = {
    "language": "/language/models/free",
    "text-to-image": "/media/text-to-image/models/free",
    "image-editing": "/media/image-editing/models/free",
    "text-to-video": "/media/text-to-video/models/free",
    "image-to-video": "/media/image-to-video/models/free",
    "text-to-video-audio": "/media/text-to-video-audio/models/free",
    "image-to-video-audio": "/media/image-to-video-audio/models/free",
    "text-to-speech": "/media/text-to-speech/models/free",
    "speech-to-speech": "/media/speech-to-speech/models/free",
    "speech-to-text": "/media/speech-to-text/models/free",
    "music-instrumental": "/media/music/instrumental/models/free",
    "music-with-vocals": "/media/music/with-vocals/models/free",
}



class RateLimited(Exception):
    def __init__(self, reset):
        self.reset = reset


class NotInTier(Exception):
    pass


def _guard(key, *values):
    """Refuse to write or print anything that contains the API key."""
    if key:
        for v in values:
            if v is not None and key in str(v):
                raise FetchError("response contained the API key; refusing to write or print it")


# ---------------------------------------------------------------- HTTP
class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **kw):
        raise FetchError("unexpected redirect")


_OPENER = urllib.request.build_opener(_NoRedirect())


def _open(req):
    return _OPENER.open(req, timeout=60)


def _request(url, key, counter):
    """GET with one retry. counter[0] counts every attempt. Returns (parsed json, headers)."""
    if not url.startswith(ORIGIN_PREFIX):
        raise FetchError("refusing to send the API key to a non-AA URL")
    for attempt in (0, 1):
        counter[0] += 1
        req = urllib.request.Request(url, headers={"x-api-key": key, "Accept": "application/json",
                                                   "User-Agent": "ai-model-benchmarks-skill/1"})
        status, text, hdr = None, None, None
        try:
            with _open(req) as r:
                status, hdr = 200, r.headers
                text = r.read().decode("utf-8")
        except FetchError:
            raise
        except urllib.error.HTTPError as e:
            status, hdr = e.code, e.headers
        except Exception:
            status = None
        if status == 200:
            _guard(key, text, *(hdr.values() if hdr else []))
            return _parse_json(text, "API response"), hdr
        if status == 429:
            ra = (hdr.get("Retry-After") or hdr.get("X-RateLimit-Reset") or "unknown") if hdr else "unknown"
            _guard(key, ra)
            raise RateLimited(ra)
        if status == 403:
            raise NotInTier()
        if attempt == 0:
            time.sleep(3)
            continue
        raise FetchError("HTTP error from Artificial Analysis" if status else "network error talking to Artificial Analysis")


def snapshot_path(category, date):
    return os.path.join(SNAP_DIR, date, category + ".json.gz")


def fetch_category(category, key, counter=None):
    """Returns (snapshot dict, requests_used incl. retries, remaining header).
    `counter` is a shared one-item list; attempts are added to it even when the call fails."""
    path = CATEGORIES[category]
    counter = counter if counter is not None else [0]
    start = counter[0]
    rows, remaining, meta = [], "?", {}
    for page in range(1, MAX_PAGES + 1):
        url = BASE + path + ("?page=%d" % page if page > 1 else "")
        body, hdr = _request(url, key, counter)
        if not isinstance(body, dict) or not isinstance(body.get("data"), list) \
                or not all(isinstance(r, dict) for r in body["data"]):
            raise FetchError("unexpected response shape from Artificial Analysis")
        # language: pagination REQUIRED; media: may be absent, but a present key follows the same rule (null rejected)
        pg = {}
        if "pagination" in body or category == "language":
            pg = body.get("pagination")
            if not isinstance(pg, dict) or not isinstance(pg.get("has_more"), bool) \
                    or not isinstance(pg.get("page"), int) or isinstance(pg.get("page"), bool):
                raise FetchError("unexpected pagination shape from Artificial Analysis")
            if pg["page"] != page:
                raise FetchError("pagination page does not match the requested page; snapshot not saved")
        ver = body.get("intelligence_index_version")
        if "version" in meta and meta["version"] != ver:
            raise FetchError("intelligence_index_version changed between pages; snapshot not saved")
        meta["version"] = ver
        remaining = hdr.get("X-RateLimit-Remaining", remaining)
        _guard(key, remaining)
        meta.setdefault("tier", body.get("tier") or hdr.get("X-AA-Tier"))
        meta.setdefault("intelligence_index_version", ver)
        rows.extend(body["data"])
        if not pg.get("has_more", False):
            break
    else:
        raise FetchError("pagination cap reached while more pages remain; snapshot not saved")
    snap = {"fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "tier": meta["tier"], "intelligence_index_version": meta["intelligence_index_version"],
            "source": "https://artificialanalysis.ai", "data": rows}
    return snap, counter[0] - start, remaining


def write_snapshot(path, snap, key=None):
    """Atomic: temp file in same dir, re-read and validate, then os.replace."""
    text = json.dumps(snap)
    _guard(key, text)
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    os.close(fd)
    try:
        with gzip.open(tmp, "wt", encoding="utf-8") as f:
            f.write(text)
        _validate(tmp)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _validate(p):
    with gzip.open(p, "rt", encoding="utf-8") as f:
        d = json.load(f)
    if not isinstance(d, dict) or not isinstance(d.get("data"), list):
        raise ValueError("bad snapshot shape")
    return d


def load_snapshot(category, date=None):
    """Load snapshot for category; latest by default. Raises FileNotFoundError."""
    if date:
        p = snapshot_path(category, date)
        if not os.path.exists(p):
            raise FileNotFoundError("no %s snapshot for %s" % (category, date))
    else:
        found = sorted(glob.glob(os.path.join(SNAP_DIR, "*", category + ".json.gz")))
        if not found:
            raise FileNotFoundError("no %s snapshot; run aa_fetch.py --categories %s" % (category, category))
        p = found[-1]
    with gzip.open(p, "rt", encoding="utf-8") as f:
        d = json.load(f)
    d["_snapshot_date"] = os.path.basename(os.path.dirname(p))
    return d


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--categories", default="language")
    ap.add_argument("--refresh", action="store_true")
    a = ap.parse_args(argv)
    cats = list(CATEGORIES) if a.categories == "all" else [c.strip() for c in a.categories.split(",") if c.strip()]
    bad = [c for c in cats if c not in CATEGORIES]
    if bad:
        print("unknown categories: %s (valid: %s)" % (", ".join(bad), ", ".join(CATEGORIES)))
        return 2
    today = dt.date.today().isoformat()
    key = None
    counter = [0]  # run-wide attempts, including failed categories
    for c in cats:
        p = snapshot_path(c, today)
        if os.path.exists(p) and not a.refresh:
            try:
                d = _validate(p)
                print("%s: reused today's snapshot, %d rows, 0 requests" % (c, len(d["data"])))
                continue
            except Exception:
                print("%s: today's snapshot is unreadable; refetching" % c)
        try:
            key = key or get_key()
            snap, used, rem = fetch_category(c, key, counter)
            write_snapshot(p, snap, key)
        except RateLimited as e:
            print("%s: rate limited (429). Reset/retry-after: %s. Stopping." % (c, e.reset))
            print("total requests this run: %d" % counter[0])
            return 1
        except NotInTier:
            print("%s: endpoint not in free tier (403)" % c)
            continue
        except FetchError as e:
            print("%s: error: %s" % (c, e))
            print("total requests this run: %d" % counter[0])
            return 1
        print("%s: %d rows, %d requests used, X-RateLimit-Remaining=%s -> %s" % (c, len(snap["data"]), used, rem, p))
    print("total requests this run: %d" % counter[0])
    return 0


if __name__ == "__main__":
    sys.exit(main())

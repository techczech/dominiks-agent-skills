#!/usr/bin/env python3
"""Is there Artificial Analysis data on this model? Usage:
  python3 -I aa_lookup.py "<query>" [--sources aa,arena,openrouter] [--category language|all] [--snapshot-date D] [--json]
  Default sources: aa plus any Arena/OpenRouter snapshots on disk. Arena reports the model's LICENCE
  (the open-model check Artificial Analysis cannot do). Nothing is fetched except one AA language snapshot if none exists.
Reads the local snapshot (fetches language only if no snapshot exists at all).
Import: lookup(query, snap) -> dict
"""
import argparse
import difflib
import json
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aa_fetch  # noqa: E402
import aa_widget as W  # noqa: E402
import aa_sources as S  # noqa: E402
import open_sources_fetch as osf  # noqa: E402

INDEXES = ["intelligence", "coding", "agentic", "finance", "strategy", "legal", "healthcare", "engineering", "economics"]
OTHER = ["input_price", "output_price", "blended_price", "index_cost", "speed", "ttft", "e2e"]
KEY_FIELDS = ["intelligence", "coding", "agentic", "blended_price", "speed"]


def norm(s):
    return re.sub(r"[\s\-_.]+", "", (s or "").lower())


def record_matches(rec, terms):
    name = rec.get("name") or ""
    hay = [norm(name), norm(rec.get("slug")), norm(W.base_name(name))]
    return all(any(norm(t) in h for h in hay) for t in terms)


def lookup(query, snap, category="language"):
    terms = query.split()
    recs = snap["data"]
    metrics = [m for m in INDEXES + OTHER + ["elo", "wer"] if (m in W.METRICS) and
               ((category == "language") == (m in W.LANGUAGE_ONLY) or category != "language" and m in W.MEDIA_ONLY)]
    allrows = [W.normalise(r, metrics) for r in recs]
    hits = [(r, row) for r, row in zip(recs, allrows) if record_matches(r, terms)]
    out = {"query": query, "category": category, "snapshot_date": snap.get("_snapshot_date"),
           "found": bool(hits), "models": []}
    if not hits:
        names = sorted({W.base_name(r.get("name") or "") for r in recs})
        nq = norm(query)
        out["suggestions"] = difflib.get_close_matches(query, names, n=5, cutoff=0.0)
        scored = sorted(names, key=lambda n: -difflib.SequenceMatcher(None, nq, norm(n)).ratio())[:5]
        out["suggestions"] = scored
        return out
    ranks = {}
    for m in metrics:
        ranks[m] = sorted(v for v in (row["v"][m] for row in allrows) if v is not None)
    groups = {}
    for rec, row in hits:
        groups.setdefault((row["creator"], row["name"]), []).append((rec, row))
    for (creator, base), items in groups.items():
        variants = []
        for rec, row in items:
            f = {}
            for m in metrics:
                v = row["v"][m]
                if v is None:
                    continue
                e = {"value": v}
                if m in INDEXES or m in ("elo", "speed"):
                    pool = ranks[m]
                    e["rank"] = 1 + sum(1 for x in pool if x > v)
                    e["of"] = len(pool)
                    e["percentile"] = round(100.0 * sum(1 for x in pool if x < v) / len(pool), 1)
                f[m] = e
            variants.append({"name": rec.get("name"), "variant": row["variant"], "slug": rec.get("slug"),
                             "release_date": rec.get("release_date"), "fields": f,
                             "missing_key_fields": [m for m in KEY_FIELDS if m in metrics and m not in f]})
        out["models"].append({"base_name": base, "creator": creator, "variants": variants,
                              "page_guess": "https://artificialanalysis.ai/models/%s" % (items[0][0].get("slug") or "")})
    return out


def render(res):
    L = []
    if not res["found"]:
        L.append("No Artificial Analysis data for '%s' in the %s snapshot." % (res["query"], res["snapshot_date"]))
        L.append("Closest names (check for a naming mismatch): " + "; ".join(res["suggestions"]))
        L.append("Note: AA does not benchmark every open model.")
        return "\n".join(L)
    L.append("Found %d model(s) for '%s' (%s snapshot)" % (len(res["models"]), res["query"], res["snapshot_date"]))
    for m in res["models"]:
        L.append("")
        L.append("== %s (%s)" % (m["base_name"], m["creator"]))
        L.append("   page (probably): %s" % m["page_guess"])
        for v in m["variants"]:
            L.append("  - %s  [released %s]" % (v["name"], v["release_date"] or "?"))
            for k, e in v["fields"].items():
                s = "      %-14s %s" % (k, W_fmt(k, e["value"]))
                if "rank" in e:
                    s += "   rank %d of %d, percentile %s" % (e["rank"], e["of"], e["percentile"])
                L.append(s)
            if v["missing_key_fields"]:
                miss = ", ".join(v["missing_key_fields"])
                note = ""
                if "speed" in v["missing_key_fields"]:
                    note = " (no speed: probably no hosted provider was benchmarked)"
                L.append("      MISSING (null, not zero): %s%s" % (miss, note))
    return "\n".join(L)


def W_fmt(k, v):
    kind = W.METRICS[k]["kind"]
    if kind == "price":
        return "$%g" % round(v, 4)
    if kind == "speed":
        return "%g tokens/s" % v
    if kind == "sec":
        return "%g s" % v
    return "%g" % v


def _closest(query, names):
    nq = S.match_key(query)
    return sorted(set(names), key=lambda n: -difflib.SequenceMatcher(None, nq, S.match_key(n)).ratio())[:5]


def lookup_arena(query, snap):
    terms = [S.match_key(t) for t in query.split()]
    recs = S.arena_records(snap)
    hits = [r for r in recs if all(t in S.match_key(r["name"] + r["slug"]) for t in terms)]
    out = {"source": snap.get("subset"), "found": bool(hits), "publish_date": snap.get("publish_date"),
           "licence_note": "CC BY 4.0", "top_rank_only": snap.get("top_rank"), "models": []}
    raw = {r["model_name"]: r for r in snap["data"] if r.get("model_name")}
    for r in hits:
        row = raw.get(r["slug"], {})
        out["models"].append({"name": r["name"], "raw_id": r["slug"], "organization": row.get("organization"), "rank": row.get("rank"),
                              "rating": r["elo"], "ci_95": r["ci_95"], "votes": r["votes"], "license": r["license"],
                              "open_licence": S.is_open_licence(r["license"])})
    if not hits:
        out["suggestions"] = _closest(query, [r["name"] for r in recs] + [r["slug"] for r in recs])[:5]
    return out


def lookup_openrouter(query, share_snap, bench_snap):
    terms = [S.match_key(t) for t in query.split()]
    out = {"found": False, "share": [], "benchmarks": []}
    if share_snap:
        recs, _o, _d = S.or_share_records(share_snap)
        ranked = sorted(recs, key=lambda r: -r["share"])
        for i, r in enumerate(ranked, 1):
            if all(t in S.match_key(r["slug"]) for t in terms):
                out["share"].append({"id": r["slug"], "share_30d_pct": r["share"], "rank_30d": i, "of": len(ranked),
                                     "share_latest_pct": r["share_latest"]})
        out["share_as_of"] = share_snap.get("as_of")
    names = []
    if bench_snap:
        for r in bench_snap["data"]:
            names.append(r.get("model_slug") or "")
            if all(t in S.match_key((r.get("model_slug") or "") + (r.get("model_name") or "")) for t in terms):
                out["benchmarks"].append({"benchmark": r.get("benchmark"), "model": r.get("model_name") or r.get("model_slug"),
                                          "accuracy_pct": round(100 * r["accuracy"], 2) if isinstance(r.get("accuracy"), (int, float)) else None,
                                          "cost_per_task_usd": r.get("avg_cost_per_task_usd")})
    out["found"] = bool(out["share"] or out["benchmarks"])
    if not out["found"]:
        out["suggestions"] = _closest(query, [x["slug"] if isinstance(x, dict) else x for x in names] +
                                      ([r["slug"] for r in S.or_share_records(share_snap)[0]] if share_snap else []))
    return out


def render_arena(res, query):
    L = ["== Arena (%s subset, published %s, CC BY 4.0)" % (res["source"], res["publish_date"])]
    if not res["found"]:
        L.append("   No Arena data for '%s' in this snapshot%s." % (query, " (top %s ranks only)" % res["top_rank_only"] if res.get("top_rank_only") else ""))
        L.append("   Closest names: " + "; ".join(res["suggestions"]))
        return "\n".join(L)
    for m in res["models"]:
        L.append("  - %s [%s] (%s)  rank %s  rating %s%s  votes %s" % (
            m["name"], m["raw_id"], m["organization"], m["rank"], m["rating"], " +/- %s" % m["ci_95"] if m["ci_95"] else "", m["votes"]))
        L.append("      LICENCE: %s -> %s" % (m["license"], "open licence" if m["open_licence"] else "proprietary"))
    return "\n".join(L)


def render_openrouter(res, query):
    L = ["== OpenRouter (CC BY 4.0, data as of %s)" % res.get("share_as_of")]
    if not res["found"]:
        L.append("   No OpenRouter data for '%s'. Closest: %s" % (query, "; ".join(res.get("suggestions", []))))
        return "\n".join(L)
    for r in res["share"]:
        L.append("  - usage %s: %.2f%% of tokens over 30 days (rank %d of %d), latest day %s" % (
            r["id"], r["share_30d_pct"], r["rank_30d"], r["of"],
            "%s%%" % r["share_latest_pct"] if r["share_latest_pct"] is not None else "n/a (not in top 50 that day)"))
    for b in res["benchmarks"][:12]:
        L.append("  - benchmark %s: %s accuracy %s%%, cost/task $%.3g" % (b["benchmark"], b["model"], b["accuracy_pct"], b["cost_per_task_usd"] or 0))
    return "\n".join(L)


def _try_load(name, date=None):
    try:
        return osf.load_open_snapshot(name, date)
    except FileNotFoundError:
        return None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("query")
    ap.add_argument("--category", default="language")
    ap.add_argument("--sources", default=None, help="comma list of aa,arena,openrouter (default: aa + available snapshots)")
    ap.add_argument("--snapshot-date")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    want = [x.strip() for x in a.sources.split(",")] if a.sources else ["aa", "arena", "openrouter"]
    explicit = a.sources is not None
    report, blocks = {"query": a.query, "sources": {}}, []
    if "aa" in want:
        cats = [c for c in aa_fetch.CATEGORIES if c != "language"] if a.category == "all" else [a.category]
        if a.category == "all":
            cats = ["language"] + cats
        results = []
        for c in cats:
            try:
                snap = aa_fetch.load_snapshot(c, a.snapshot_date)
            except FileNotFoundError:
                if c == "language" and not a.snapshot_date and aa_fetch.main(["--categories", "language"]) == 0:
                    snap = aa_fetch.load_snapshot(c)
                else:
                    continue  # no local snapshot for this category; never spend quota silently
            results.append(lookup(a.query, snap, c))
        if results:
            report["sources"]["aa"] = results if a.category == "all" else results[0]
            shown = [r for r in results if r["found"]] or results[:1]
            blocks.append("== Artificial Analysis\n" + "\n\n".join(render(r) for r in shown))
        elif explicit:
            blocks.append("== Artificial Analysis\nNo snapshot available; run aa_fetch.py first")
    if "arena" in want:
        names = osf.available_snapshots("arena-")
        names = [n for n in names if not n.endswith("-history")]
        if not names and explicit:
            blocks.append("== Arena\nNo Arena snapshot; run open_sources_fetch.py --source arena")
        arena = []
        for n in names:
            snap = _try_load(n, a.snapshot_date)
            if snap:
                arena.append(lookup_arena(a.query, snap))
        if arena:
            report["sources"]["arena"] = arena
            shown = [r for r in arena if r["found"]] or arena[:1]
            blocks.append("\n".join(render_arena(r, a.query) for r in shown))
    if "openrouter" in want:
        share, bench = _try_load("openrouter-rankings-daily", a.snapshot_date), _try_load("openrouter-benchmark-leaderboard", a.snapshot_date)
        if share or bench:
            res = lookup_openrouter(a.query, share, bench)
            report["sources"]["openrouter"] = res
            blocks.append(render_openrouter(res, a.query))
        elif explicit:
            blocks.append("== OpenRouter\nNo OpenRouter snapshot; run open_sources_fetch.py --source openrouter")
    if not blocks:
        print("No snapshot available; run aa_fetch.py first")
        return 2
    if a.json:
        print(json.dumps(report, indent=2))
    else:
        print("\n\n".join(blocks))
    return 0


if __name__ == "__main__":
    sys.exit(main())

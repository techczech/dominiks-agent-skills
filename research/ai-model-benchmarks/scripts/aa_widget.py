#!/usr/bin/env python3
"""Generate ONE self-contained HTML widget from an Artificial Analysis snapshot.

Usage: python3 -I aa_widget.py <bar|scatter|frontier|table> --out PATH [options]
See SKILL.md for options. Selection logic lives here; drawing lives in
widget_template.html (inline CSS/JS/SVG, no external requests).
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import aa_fetch  # noqa: E402
import aa_key  # noqa: E402
import aa_logos  # noqa: E402
import aa_sources  # noqa: E402
import open_sources_fetch as osf  # noqa: E402
import aa_sources  # noqa: E402
import open_sources_fetch as osf  # noqa: E402

TEMPLATE = os.path.join(HERE, "widget_template.html")
AA_URL = "https://artificialanalysis.ai"
BLENDED_NOTE = "Blended price, 3:1 input:output, computed"

# ---------------------------------------------------------------- metrics
# kind -> formatting hint for the template; hb = higher is better
def _ev(key):
    return lambda r: (r.get("evaluations") or {}).get(key)


def _pr(key):
    return lambda r: (r.get("pricing") or {}).get(key)


def _pf(key):
    return lambda r: (r.get("performance") or {}).get(key)


def _blended(r):
    i, o = _pr("price_1m_input_tokens")(r), _pr("price_1m_output_tokens")(r)
    return None if i is None or o is None else (3 * i + o) / 4


def _media_price(r):
    for k in ("price_per_1k_images", "price_per_minute"):
        if r.get(k) is not None:
            return r[k]
    return None


def _wer(r):
    v = r.get("aa_wer_index")
    return None if v in (None, 0) else v  # 0 looks like "unmeasured" in real data


def _index_cost(r):
    v = r.get("artificial_analysis_intelligence_index_cost")
    return v.get("total_cost") if isinstance(v, dict) else v


def _idx(label, key, domain=False):
    return dict(label=label, kind="index", hb=True, get=_ev(key))


METRICS = {
    "intelligence": dict(label="Intelligence Index", kind="index", hb=True, get=_ev("artificial_analysis_intelligence_index")),
    "coding": dict(label="Coding Index", kind="index", hb=True, get=_ev("artificial_analysis_coding_index")),
    "agentic": dict(label="Agentic Index", kind="index", hb=True, get=_ev("artificial_analysis_agentic_index")),
    "finance": dict(label="Finance & accounting Index", kind="index", hb=True, get=_ev("artificial_analysis_finance_and_accounting_index")),
    "strategy": dict(label="Strategy & ops Index", kind="index", hb=True, get=_ev("artificial_analysis_strategy_and_ops_index")),
    "legal": dict(label="Legal Index", kind="index", hb=True, get=_ev("artificial_analysis_legal_index")),
    "healthcare": dict(label="Healthcare & medical Index", kind="index", hb=True, get=_ev("artificial_analysis_healthcare_and_medical_index")),
    "engineering": dict(label="Engineering Index", kind="index", hb=True, get=_ev("artificial_analysis_engineering_index")),
    "economics": dict(label="Economics Index", kind="index", hb=True, get=_ev("artificial_analysis_economics_index")),
    "input_price": dict(label="Input price, $ per 1M tokens", kind="price", hb=False, log=True, get=_pr("price_1m_input_tokens")),
    "output_price": dict(label="Output price, $ per 1M tokens", kind="price", hb=False, log=True, get=_pr("price_1m_output_tokens")),
    "blended_price": dict(label="Blended price, $ per 1M tokens", kind="price", hb=False, log=True, get=_blended, computed=True),
    "speed": dict(label="Output speed, tokens per second", kind="speed", hb=True, get=_pf("median_output_tokens_per_second")),
    "ttft": dict(label="Time to first token, seconds", kind="sec", hb=False, get=_pf("median_time_to_first_token_seconds")),
    "e2e": dict(label="End-to-end response time, seconds", kind="sec", hb=False, get=_pf("median_end_to_end_response_time_seconds")),
    "index_cost": dict(label="Cost to run the Intelligence Index, $", kind="price", hb=False, log=True, get=_index_cost),
    # media
    "elo": dict(label="Arena Elo", kind="elo", hb=True, get=lambda r: r.get("elo")),
    "price": dict(label="Price", kind="price", hb=False, log=True, get=_media_price),
    "wer": dict(label="Word error rate index (lower is better)", kind="num", hb=False, get=_wer),
}
def _top(key):
    return lambda r: r.get(key)


METRICS.update({
    "votes": dict(label="Votes", kind="int", hb=True, get=_top("votes")),
    "license": dict(label="Licence", kind="text", hb=True, get=_top("license")),
    "share": dict(label="Share of OpenRouter tokens, last 30 days", kind="pct", hb=True, get=_top("share")),
    "share_latest": dict(label="Share of OpenRouter tokens, latest day", kind="pct", hb=True, get=_top("share_latest")),
    "accuracy": dict(label="Accuracy (OpenRouter benchmark)", kind="pct", hb=True, get=_top("accuracy")),
    "cost_task": dict(label="Cost per task, $", kind="price", hb=False, get=_top("cost_task")),
    "tokens_task": dict(label="Output tokens per task", kind="int", hb=False, get=_top("tokens_task")),
    "duration": dict(label="Time per task, seconds", kind="sec", hb=False, get=_top("duration")),
})
SOURCE_METRICS = {  # allowed aliases for the non-AA sources
    "arena": {"elo", "votes", "license"},
    "openrouter-share": {"share", "share_latest"},
    "openrouter-bench": {"accuracy", "cost_task", "tokens_task", "duration"},
}
LANGUAGE_ONLY = set(METRICS) - set().union(*SOURCE_METRICS.values()) - {"price", "wer"}
MEDIA_ONLY = {"elo", "price", "wer"}
SHORT = {"intelligence": "Intelligence", "coding": "Coding", "agentic": "Agentic", "finance": "Finance",
         "strategy": "Strategy", "legal": "Legal", "healthcare": "Healthcare", "engineering": "Engineering",
         "economics": "Economics", "input_price": "Input $/1M", "output_price": "Output $/1M",
         "blended_price": "Blended $/1M", "speed": "Speed t/s", "ttft": "TTFT s", "e2e": "End-to-end s",
         "index_cost": "Index cost $", "elo": "Elo", "price": "Price", "wer": "WER"}

SHORT.update({"votes": "Votes", "license": "Licence", "share": "30-day share", "share_latest": "Latest-day share",
              "accuracy": "Accuracy", "cost_task": "Cost/task", "tokens_task": "Tokens/task", "duration": "Time/task s"})

# ---------------------------------------------------------------- creators
CREATOR_KEYS = {  # lower-case creator name -> palette key
    "anthropic": "anthropic", "openai": "openai", "google": "google", "meta": "meta",
    "spacexai": "xai", "xai": "xai", "x.ai": "xai", "deepseek": "deepseek", "alibaba": "alibaba",
    "qwen": "alibaba", "mistral": "mistral", "z ai": "zai", "zhipu": "zai", "moonshot": "moonshot",
    "kimi": "moonshot", "xiaomi": "xiaomi",
}
# user-facing aliases accepted by --creators (match creator names)
CREATOR_ALIASES = {"xai": "spacexai", "x.ai": "spacexai", "qwen": "alibaba", "moonshot": "kimi",
                   "zhipu": "z ai", "zai": "z ai"}


def ckey(name):
    return CREATOR_KEYS.get((name or "").lower(), "other")


def base_name(name):
    return re.sub(r"\s*\([^()]*\)\s*$", "", name).strip()


def variant_of(name):
    m = re.search(r"\(([^()]*)\)\s*$", name)
    return m.group(1) if m else ""


# ---------------------------------------------------------------- selection
def normalise(rec, metrics):
    name = rec.get("name") or ""
    cr = (rec.get("model_creator") or {}).get("name") or "Unknown"
    return {"full": name, "name": base_name(name) or name, "variant": variant_of(name),
            "slug": rec.get("slug") or "", "creator": cr, "ckey": ckey(cr),
            "date": rec.get("release_date"), "ci": rec.get("ci_95"),
            "extra": rec.get("extra_lines") or [], "series": rec.get("series"),
            "v": {m: METRICS[m]["get"](rec) for m in metrics}}


def matches(row, term):
    t = term.lower()
    if t in row["full"].lower() or t in row["slug"].lower() or t in row["name"].lower():
        return True
    k = aa_sources.match_key(term)  # tolerant: 'opus 4.6' finds 'claude-opus-4-6-high'
    return bool(k) and any(k in aa_sources.match_key(x) for x in (row["full"], row["slug"], row["name"]))


def creator_match(row, wanted):
    c = row["creator"].lower()
    for w in wanted:
        w = CREATOR_ALIASES.get(w.lower(), w.lower())
        if w == c or w in c:
            return True
    return False


def better(a, b, hb):
    return a > b if hb else a < b


def select(records, chart, metrics, primary, models=None, creators=None, top=None, variants="best",
           latest=False, since=None, require=None):
    """Returns (rows, skipped_messages). `metrics` all computed; `require` = metrics that must be non-null."""
    require = require or [primary]
    rows = [normalise(r, metrics) for r in records]
    skipped = []
    if creators:
        rows = [r for r in rows if creator_match(r, creators)]
    if models:
        picked = []
        for term in models:
            hit = [r for r in rows if matches(r, term)]
            if latest and hit:
                newest = max(hit, key=lambda r: (r["date"] or "", r["name"]))
                hit = [r for r in hit if (r["creator"], r["name"]) == (newest["creator"], newest["name"])]
            if not hit:
                skipped.append("no model matched %r" % term)
            picked += hit
        seen = set()
        rows = []
        for r in picked:
            if id(r) not in seen:
                seen.add(id(r))
                rows.append(r)
    if since:
        rows = [r for r in rows if r["date"] and r["date"] >= since]
    # null skipping
    ok = []
    for r in rows:
        missing = [m for m in require if r["v"].get(m) is None]
        if missing:
            skipped.append("%s (no %s)" % (r["full"], ", ".join(missing)))
        else:
            ok.append(r)
    rows = ok
    # variants
    hb = METRICS[primary]["hb"]
    if variants == "best":
        groups = {}
        for r in rows:
            k = (r["creator"], r["name"])
            g = groups.setdefault(k, {"best": r, "n": 0})
            g["n"] += 1
            if better(r["v"][primary], g["best"]["v"][primary], hb):
                g["best"] = r
        rows = []
        for g in groups.values():
            g["best"]["nvar"] = g["n"]
            rows.append(g["best"])
    else:
        for r in rows:
            r["nvar"] = 1
    rows.sort(key=lambda r: (r["v"][primary], r["name"]), reverse=hb)
    if top:
        rows = rows[:top]
    return rows, skipped


# ---------------------------------------------------------------- output
def month_year(iso):
    d = dt.date.fromisoformat(iso[:10])
    return "%d %s %d" % (d.day, d.strftime("%B"), d.year)


def esc_json(obj):
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("</", "<\\/").replace("<!--", "<\\!--").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def data_note(cfg):
    """Visible note when a shown table column is mostly empty (null = not measured)."""
    rows, cols = cfg["rows"], cfg.get("metrics") or []
    empty = [m for m in cols if sum(1 for r in rows if r["v"].get(m) is None) * 2 >= len(rows)]
    if not empty:
        return ""
    names = [cfg["metricDefs"][m]["short"] for m in empty]
    if set(empty) <= {"coding", "agentic"}:
        return ("\u2013 = not yet measured by Artificial Analysis (newest models have no %s score in the free data)"
                % "/".join(names))
    return "\u2013 = not measured by Artificial Analysis (most of these models have no %s data in the free data)" % ", ".join(names)


SOURCES_INFO = {
    "arena": ("https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset", "Arena (lmarena-ai/leaderboard-dataset)", "CC BY 4.0"),
    "openrouter": ("https://openrouter.ai", "OpenRouter (openrouter.ai)", "CC BY 4.0"),
}


def footer_html(source, snap):
    """Attribution footer; names the right source, licence and dates. Always present."""
    fetched = month_year(snap["fetched_at"])
    link = 'target="_blank" rel="noopener noreferrer"'
    if source == "synthetic":  # invented example data: no source link, no real-data claim
        return "Synthetic example data \u2014 not real benchmark results"
    if source == "aa":
        parts = ['Data: <a href="%s" %s>Artificial Analysis \u00b7 artificialanalysis.ai</a>' % (AA_URL, link)]
        if snap.get("intelligence_index_version"):
            parts.append("Intelligence Index v%s" % snap["intelligence_index_version"])
        parts.append("fetched %s" % fetched)
    else:
        url, name, lic = SOURCES_INFO[source]
        parts = ['Source: <a href="%s" %s>%s</a>, licensed under %s' % (url, link, html.escape(name), lic)]
        if source == "arena" and snap.get("publish_date"):
            parts.append("leaderboard published %s" % month_year(snap["publish_date"]))
        if source == "openrouter" and snap.get("as_of"):
            parts.append("data as of %s" % month_year(snap["as_of"]))
        parts.append("fetched %s" % fetched)
    return " \u00b7 ".join(parts)


def build_html(cfg, snap, symbols="", source="aa"):
    footer = footer_html(source, snap)
    notes = list(cfg.get("notes", []))
    note_html = html.escape(" \u00b7 ".join(notes))
    with open(TEMPLATE, encoding="utf-8") as f:
        t = f.read()
    return (t.replace("__TITLE__", html.escape(cfg["title"]))
             .replace("__FOOTER__", footer)
             .replace("__NOTE__", note_html)
             .replace("__SYMBOLS__", symbols)
             .replace("__DATANOTE__", html.escape(data_note(cfg)))
             .replace("__DATA__", esc_json(cfg)))


def parse_list(s):
    return [x.strip() for x in s.split(",") if x.strip()] if s else None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("chart", choices=["bar", "scatter", "frontier", "table", "share"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--source", choices=["aa", "arena", "openrouter"], default="aa",
                    help="aa (default), arena (human-preference ratings + licence), openrouter (usage share, benchmarks)")
    ap.add_argument("--arena", default="text_style_control", help="Arena subset (default text_style_control)")
    ap.add_argument("--open-only", action="store_true", help="arena: only models whose licence is not Proprietary")
    ap.add_argument("--benchmark", help="openrouter: benchmark id (e.g. gpqa_diamond) -> accuracy bar/table")
    ap.add_argument("--category", default="language")
    ap.add_argument("--models", help="comma list; case-insensitive substrings of name/slug/base name")
    ap.add_argument("--latest", action="store_true", help="per --models term keep only the most recently released match")
    ap.add_argument("--creators", help="comma list (aliases: xAI->SpaceXAI, Qwen->Alibaba, Moonshot->Kimi)")
    ap.add_argument("--top", type=int)
    ap.add_argument("--variants", choices=["best", "all"], default="best")
    ap.add_argument("--metric", default=None, help="bar/frontier metric (default intelligence, media: elo)")
    ap.add_argument("--metrics", help="table columns, comma list of metric aliases")
    ap.add_argument("--x", default=None)
    ap.add_argument("--y", default=None)
    ap.add_argument("--months", type=int, help="frontier: only models released in the last N months")
    ap.add_argument("--title")
    ap.add_argument("--subtitle")
    ap.add_argument("--snapshot-date")
    ap.add_argument("--label", help="frontier: comma list of models to label (substrings); default labels only the newest record-setter")
    ap.add_argument("--logo-column", choices=["bar", "left"], default="bar",
                    help="bar charts: logos at the bars' left edge (default) or in a column at the far left")
    ap.add_argument("--icons-dir", default=None, help="folder with svgl-format icon JSON for company logos (default: icons_dir in config.local.json; none = shapes)")
    ap.add_argument("--synthetic", action="store_true",
                    help="mark the data as invented example data (footer says so, no source link); for documentation images")
    ap.add_argument("--highlight", help="comma list of substrings to emphasise")
    a = ap.parse_args(argv)

    src = a.source
    other_row = None
    try:
        if src == "aa":
            media = a.category != "language"
            snap = aa_fetch.load_snapshot(a.category, a.snapshot_date)
            records, allowed, default_metric = snap["data"], (MEDIA_ONLY if media else LANGUAGE_ONLY), ("elo" if media else "intelligence")
            ctx = "category %s" % a.category
        elif src == "arena":
            media = True
            snap = osf.load_open_snapshot("arena-" + a.arena, a.snapshot_date)
            records = aa_sources.arena_records(snap)
            if a.open_only:
                records = [r for r in records if aa_sources.is_open_licence(r.get("license"))]
            allowed, default_metric, ctx = SOURCE_METRICS["arena"], "elo", "Arena subset %s" % a.arena
        else:
            media = False
            if a.benchmark:
                snap = osf.load_open_snapshot("openrouter-benchmark-leaderboard", a.snapshot_date)
                records = aa_sources.or_benchmark_records(snap, a.benchmark)
                if not records:
                    print("error: no rows for benchmark %r. Available: %s" % (a.benchmark, ", ".join(aa_sources.benchmarks_in(snap))))
                    return 2
                allowed, default_metric, ctx = SOURCE_METRICS["openrouter-bench"], "accuracy", "OpenRouter benchmark"
            else:
                snap = osf.load_open_snapshot("openrouter-rankings-daily", a.snapshot_date)
                records, other_row, _dates = aa_sources.or_share_records(snap)
                allowed, default_metric, ctx = SOURCE_METRICS["openrouter-share"], "share", "OpenRouter rankings"
    except FileNotFoundError as e:
        print("error: %s" % e)
        return 2
    if a.open_only and src != "arena":
        print("error: --open-only applies to --source arena (AA free data has no licence field)")
        return 2
    if a.chart == "share" and not (src == "openrouter" and not a.benchmark):
        print("error: the share chart needs --source openrouter (without --benchmark)")
        return 2
    if src == "openrouter" and not a.benchmark and a.chart in ("scatter", "frontier"):
        print("error: openrouter rankings support bar, table and share")
        return 2

    def check(m):
        if m not in METRICS:
            print("error: unknown metric %r. Valid: %s" % (m, ", ".join(METRICS)))
            sys.exit(2)
        if m not in allowed:
            print("error: metric %r does not apply to %s. Valid: %s" % (m, ctx, ", ".join(sorted(allowed))))
            sys.exit(2)
        return m

    cfg = {"chart": a.chart, "highlight": [h.lower() for h in (parse_list(a.highlight) or [])],
           "label": [h.lower() for h in (parse_list(a.label) or [])], "logoColumn": a.logo_column,
           "category": a.category, "source": src, "notes": []}
    since = None
    fetched_date = dt.date.fromisoformat(snap["fetched_at"][:10])
    if a.chart == "frontier" and src != "aa":
        print("error: frontier needs release dates; only --source aa (language) has them")
        return 2
    if a.chart == "bar":
        m = check(a.metric or default_metric)
        metrics, primary, require = [m], m, [m]
        cfg["metric"] = m
        cfg["ci"] = m == "elo" and media
    elif a.chart == "scatter":
        x, y = check(a.x or "blended_price"), check(a.y or default_metric)
        if media and not a.x:
            print("error: media scatter needs --x and --y (e.g. --x price --y elo)")
            return 2
        metrics, primary, require = [x, y], y, [x, y]
        cfg["x"], cfg["y"] = x, y
    elif a.chart == "frontier":
        if media:
            print("error: frontier needs release dates; only the language category has them")
            return 2
        m = check(a.metric or default_metric)
        metrics, primary, require = [m], m, [m]
        cfg["metric"] = m
        if a.months:
            y, mo = divmod(fetched_date.month - 1 - a.months, 12)
            since = dt.date(fetched_date.year + y, mo + 1, 1).isoformat()
    elif a.chart == "share":
        m = check(a.metric or "share")
        metrics, primary, require = ["share", "share_latest"], m, [m]
        cfg["metric"] = m
        a.top = a.top or 5
    else:
        cols = [check(c) for c in (parse_list(a.metrics) or ([default_metric] + (["votes", "license"] if src == "arena" else [])))]
        metrics, primary, require = cols, cols[0], [cols[0]]
        cfg["metrics"] = cols

    models = parse_list(a.models)
    rows, skipped = select(records, a.chart, metrics, primary, models=models,
                           creators=parse_list(a.creators), top=a.top, variants=a.variants,
                           latest=a.latest, since=since, require=require)
    if a.chart == "frontier":
        dated = [r for r in rows if r["date"]]
        skipped += ["%s (no release date)" % r["full"] for r in rows if not r["date"]]
        rows = dated
    log_axes = []
    if a.chart == "scatter":
        for ax in (cfg["x"], cfg["y"]):
            if METRICS[ax].get("log"):
                log_axes.append(ax)
        if log_axes:
            keep = []
            for r in rows:
                bad = [ax for ax in log_axes if r["v"][ax] <= 0]
                if bad:
                    skipped.append("%s (%s is 0, cannot plot on log scale)" % (r["full"], bad[0]))
                else:
                    keep.append(r)
            rows = keep
    if not rows:
        print("error: no rows left after filtering. Skipped: %s" % "; ".join(skipped))
        return 1

    used = sorted(set(metrics))
    cfg["metricDefs"] = {m: {"label": ("Arena rating (human votes)" if (m == "elo" and src == "arena") else METRICS[m]["label"]), "short": SHORT[m], "kind": METRICS[m]["kind"],
                             "hb": METRICS[m]["hb"], "log": bool(METRICS[m].get("log")) and m in log_axes}
                         for m in used}
    if any(METRICS[m].get("computed") for m in used):
        cfg["notes"].append("Computed: " + BLENDED_NOTE)
        cfg["metricDefs"]["blended_price"]["label"] = BLENDED_NOTE
    if src == "aa" and a.variants == "best" and any(r.get("nvar", 1) > 1 for r in rows):
        cfg["notes"].append("Best-scoring effort setting shown per model; " +
                            ("variant listed beside the name" if a.chart == "table" else "hover for the variant"))
    if cfg.get("ci"):
        cfg["notes"].append("Whiskers: 95% confidence interval")
    cfg["rows"] = [{"name": r["name"], "full": r["full"], "variant": r["variant"], "creator": r["creator"],
                    "ck": r["ckey"], "date": r["date"], "n": r.get("nvar", 1), "v": r["v"],
                    **({"ci": r["ci"]} if cfg.get("ci") and r["ci"] is not None else {}),
                    **({"extra": r["extra"]} if r.get("extra") else {}),
                    **({"series": r["series"]} if r.get("series") else {})} for r in rows]
    if a.chart == "share" and other_row:
        cfg["other"] = other_row
    if src == "arena":
        cfg["notes"].append("Arena subset: %s%s" % (a.arena, ", open licences only" if a.open_only else ""))
    pm = METRICS[primary]["label"]
    titles = {"bar": "%s: model comparison" % pm, "scatter": "%s vs %s" % (METRICS[cfg.get("y", primary)]["label"], METRICS[cfg.get("x", primary)]["label"]),
              "frontier": "%s over time" % pm, "table": "Model comparison",
              "share": "Share of OpenRouter tokens, last 30 days"}
    if src == "arena":
        titles["bar"] = "Arena %s leaderboard%s" % (a.arena.replace("_", " "), ", open models" if a.open_only else "")
    elif src == "openrouter" and a.benchmark:
        titles["bar"] = "%s accuracy on OpenRouter" % a.benchmark.replace("_", " ")
    cfg["title"] = a.title or titles[a.chart]
    cfg["subtitle"] = a.subtitle or ""
    cats = {"language": "language models"}
    if src != "aa":
        cats = {a.category: "models"}
    n_cr = len({r["creator"] for r in rows})
    cfg["aria"] = "%s chart of %d %s from %d creators. %s" % (a.chart, len(rows), cats.get(a.category, a.category + " models"), n_cr, cfg["title"])

    icons_dir = a.icons_dir
    if icons_dir is None:
        try:
            icons_dir = aa_key.load_config().get("icons_dir")
        except aa_key.FetchError:
            icons_dir = None  # a malformed config must not stop a widget build; fetching reports it
    logos = aa_logos.build(sorted({r["creator"] for r in rows}), icons_dir)
    cfg["logos"] = logos["map"]
    if logos["note"]:
        print(logos["note"])
    out = build_html(cfg, snap, logos["symbols"], "synthetic" if a.synthetic else src)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(out)
    print("wrote %s (%d bytes)" % (a.out, len(out.encode("utf-8"))))
    print("rows included: %d" % len(rows))
    print("logos: %d of %d creators" % (len(logos["map"]), len({r["creator"] for r in rows})))
    if models or len(skipped) <= 12:
        print("rows skipped: %d%s" % (len(skipped), (" -> " + "; ".join(skipped)) if skipped else ""))
    else:
        print("rows skipped for null/unplottable metrics: %d (first 12: %s)" % (len(skipped), "; ".join(skipped[:12])))
    return 0


if __name__ == "__main__":
    sys.exit(main())

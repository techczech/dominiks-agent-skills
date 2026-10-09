"""Adapters: turn Arena and OpenRouter snapshots into the record shape aa_widget.py selects from.

arena_records(snap)                     -> media-like records (elo, ci_95, license, votes)
or_share_records(snap)                  -> (records, other_series, dates): one record per model with a 30-day share series
or_benchmark_records(snap, benchmark)   -> records with accuracy / cost / tokens / duration
Names differ across sources (Arena 'claude-opus-4-6-high', OpenRouter 'openai/gpt-6-astra-pro-20260903'):
the organisation/provider prefix gives the creator (and so the logo); match_key() normalises for --models.
"""
import re

ORG_DISPLAY = {
    "openai": "OpenAI", "anthropic": "Anthropic", "google": "Google", "meta": "Meta", "meta-llama": "Meta",
    "xai": "xAI", "x-ai": "xAI", "deepseek": "DeepSeek", "deepseek-ai": "DeepSeek", "mistral": "Mistral",
    "mistralai": "Mistral", "alibaba": "Alibaba", "qwen": "Alibaba", "z-ai": "Z AI", "zai": "Z AI",
    "zhipu": "Z AI", "moonshotai": "Kimi", "moonshot": "Kimi", "kimi": "Kimi", "xiaomi": "Xiaomi",
    "nvidia": "NVIDIA", "microsoft": "Microsoft", "amazon": "Amazon", "ibm": "IBM", "cohere": "Cohere",
    "perplexity": "Perplexity", "minimax": "MiniMax", "bytedance": "ByteDance", "bytedance-seed": "ByteDance",
}


def org_name(slug):
    s = (slug or "unknown").strip()
    return ORG_DISPLAY.get(s.lower(), re.sub(r"[-_]+", " ", s).title())


def match_key(s):
    """Normalise for tolerant matching: ignore case, '-', '_', spaces and dots."""
    return re.sub(r"[\s\-_.]+", "", (s or "").lower())


BRANDS = {
    "gpt": "GPT", "glm": "GLM", "deepseek": "DeepSeek", "claude": "Claude", "gemini": "Gemini", "grok": "Grok",
    "qwen": "Qwen", "kimi": "Kimi", "mimo": "MiMo", "llama": "Llama", "mistral": "Mistral", "nemotron": "Nemotron",
    "muse": "Muse", "gemma": "Gemma", "phi": "Phi", "minimax": "MiniMax", "ernie": "ERNIE", "hunyuan": "Hunyuan",
    "sonar": "Sonar", "command": "Command", "o": "o", "llm": "LLM", "ai": "AI", "vl": "VL", "moe": "MoE",
}
EFFORT = {"low": "Low", "medium": "Medium", "high": "High", "xhigh": "Xhigh", "max": "Max", "minimal": "Minimal"}
_SIZE = re.compile(r"^(\d+(?:\.\d+)?)([bkm])$", re.I)
_ACTIVE = re.compile(r"^a(\d+(?:\.\d+)?)b$", re.I)


def _word(tok):
    t = tok.lower()
    if t in BRANDS:
        return BRANDS[t]
    m = _SIZE.match(t)
    if m:
        return m.group(1) + m.group(2).upper()
    m = _ACTIVE.match(t)
    if m:
        return "A" + m.group(1) + "B"
    m = re.match(r"^([a-z]+)(\d.*)$", t)
    if m and m.group(1) in BRANDS:  # qwen3, gpt4o -> Qwen3, GPT4o
        return BRANDS[m.group(1)] + m.group(2)
    if re.match(r"^[vk]\d", t):  # v4.1 -> V4.1, k3 -> K3
        return t[0].upper() + t[1:]
    if t[:1].isdigit():
        return t
    return t[:1].upper() + t[1:]


def pretty_name(raw):
    """Readable model name from an Arena id or OpenRouter permaslug.
    'claude-opus-4-6-high' -> 'Claude Opus 4.6, High'; 'openai/gpt-6-astra-pro-20260903' -> 'GPT-6 Astra Pro'."""
    s = (raw or "").strip()
    if not s:
        return s
    s = s.split("/", 1)[-1]
    variant = ""
    if ":" in s:
        s, variant = s.split(":", 1)
    s = re.sub(r"-(?:\d{8}|\d{4}-\d{2}-\d{2})$", "", s)
    toks = [t for t in re.split(r"[-_]+", s) if t]
    suffix = ""
    if len(toks) > 2 and [t.lower() for t in toks[-2:]] == ["non", "reasoning"]:
        toks, suffix = toks[:-2], "Non-reasoning"
    elif len(toks) > 1 and toks[-1].lower() in EFFORT:
        suffix, toks = EFFORT[toks[-1].lower()], toks[:-1]
    elif len(toks) > 1 and toks[-1].lower() in ("reasoning", "thinking"):
        suffix, toks = toks[-1].capitalize(), toks[:-1]
    # consecutive pure-digit tokens form one version: 4-6 -> 4.6
    merged = []
    for t in toks:
        if merged and t.isdigit() and re.fullmatch(r"\d+(\.\d+)*", merged[-1]) and len(merged[-1]) <= 3:
            merged[-1] += "." + t
        else:
            merged.append(t)
    out = ""
    for i, t in enumerate(merged):
        w = _word(t)
        if i == 0:
            out = w
        elif merged[i - 1].lower() in ("gpt", "glm") and t[:1].isdigit():
            out += "-" + w  # GPT-6, GLM-5.3
        else:
            out += " " + w
    if suffix:
        out += ", " + suffix
    if variant:
        out += " (%s)" % variant
    return out


def is_open_licence(lic):
    return bool(lic) and str(lic).strip().lower() not in ("proprietary", "unknown", "")


# ---------------------------------------------------------------- Arena
def arena_records(snap):
    out = []
    for r in snap["data"]:
        rating = r.get("rating", r.get("score"))
        if not isinstance(rating, (int, float)) or not r.get("model_name"):
            continue
        lo = r.get("rating_lower", r.get("score_ci_lower"))
        hi = r.get("rating_upper", r.get("score_ci_upper"))
        ci = round((hi - lo) / 2.0, 1) if isinstance(lo, (int, float)) and isinstance(hi, (int, float)) else None
        votes = r.get("vote_count", r.get("observation_count"))
        lic = r.get("license")
        extra = []
        if r.get("rank") is not None:
            extra.append("Arena rank: %s" % r["rank"])
        if lic:
            extra.append("Licence: %s" % lic)
        extra.insert(0, "Raw id: %s" % r["model_name"])
        out.append({"id": r["model_name"], "name": pretty_name(r["model_name"]), "slug": r["model_name"],
                    "model_creator": {"name": org_name(r.get("organization"))},
                    "elo": round(rating, 1), "ci_95": ci, "license": lic,
                    "votes": votes, "extra_lines": extra})
    return out


# ---------------------------------------------------------------- OpenRouter
def display_from_permaslug(perma):
    name = perma.split("/", 1)[-1]
    return re.sub(r"-\d{8}(?=(:|$))", "", name)


def or_share_records(snap):
    daily_total, by_model, other = {}, {}, {}
    for r in snap["data"]:
        d, p = r.get("date"), r.get("model_permaslug")
        t, sh = r.get("total_tokens"), r.get("share_of_daily_tokens")
        if not (d and p and isinstance(t, (int, float)) and isinstance(sh, (int, float))):
            continue
        if sh > 0:
            daily_total[d] = t / sh
        (other if p == "other" else by_model.setdefault(p, {}))[d] = (t, sh)
    dates = sorted(daily_total)
    grand = sum(daily_total.values()) or 1.0
    latest = dates[-1] if dates else None
    recs = []
    for p, days in by_model.items():
        tokens = sum(t for t, _ in days.values())
        recs.append({"id": p, "name": pretty_name(p), "slug": p,
                     "model_creator": {"name": org_name(p.split("/", 1)[0] if "/" in p else None)},
                     "share": round(100.0 * tokens / grand, 3),
                     "share_latest": round(100.0 * days.get(latest, (0, 0))[1], 3) if latest in days else None,
                     "series": [[d, round(100.0 * days[d][1], 3) if d in days else 0.0] for d in dates],
                     "extra_lines": ["OpenRouter id: %s" % p]})
    other_series = [[d, round(100.0 * other[d][1], 3) if d in other else 0.0] for d in dates]
    other_share = round(100.0 * sum(t for t, _ in other.values()) / grand, 3)
    return recs, {"name": "All other models", "series": other_series, "share": other_share}, dates


def benchmarks_in(snap):
    return sorted({r.get("benchmark") for r in snap["data"] if r.get("benchmark")})


def or_benchmark_records(snap, benchmark):
    out = []
    for r in snap["data"]:
        if r.get("benchmark") != benchmark or not isinstance(r.get("accuracy"), (int, float)):
            continue
        slug = r.get("model_slug") or r.get("model_permaslug") or ""
        name = r.get("model_name") or pretty_name(slug)
        name = re.sub(r"^[^:]{1,40}:\s*", "", name)
        cost, dur, tok = r.get("avg_cost_per_task_usd"), r.get("avg_duration_per_task_ms"), r.get("avg_output_tokens_per_task")
        extra = []
        if isinstance(cost, (int, float)):
            extra.append("Cost per task: $%.3g" % cost)
        if r.get("provider_name"):
            extra.append("Provider: %s" % r["provider_name"])
        if r.get("run_count") is not None:
            extra.append("Runs: %s, questions: %s" % (r["run_count"], r.get("total_questions")))
        out.append({"id": r.get("model_permaslug") or slug, "name": name, "slug": slug,
                    "model_creator": {"name": org_name(slug.split("/", 1)[0] if "/" in slug else None)},
                    "accuracy": round(100.0 * r["accuracy"], 2),
                    "cost_task": cost if isinstance(cost, (int, float)) else None,
                    "tokens_task": tok if isinstance(tok, (int, float)) else None,
                    "duration": round(dur / 1000.0, 1) if isinstance(dur, (int, float)) else None,
                    "extra_lines": extra})
    return out

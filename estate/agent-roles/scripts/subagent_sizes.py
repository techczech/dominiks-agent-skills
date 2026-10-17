#!/usr/bin/env python3
"""Subagent context sizes and cache behaviour, read from Claude Code transcripts.

Usage: subagent_sizes.py [--hours N] [--session ID-PREFIX] [--agent ID-PREFIX]

Per agent: model, API calls, current and peak context, minutes since its last
call, whether its cache is still warm, cache TTL used, and the cost of cache
rewrites after an idle gap (expiry). Run it before continuing an agent with
SendMessage: continue only if ctx < 150k and the cache is warm.
Prices are API list rates, a proxy for the subscription meter.
"""
import argparse, glob, json, os, time
from datetime import datetime, timezone

PRICE = {"opus": 4.0, "sonnet": 3.0, "haiku": 1.0, "fable": 15.0}  # $/MTok input, list rates as of 2026-10; update when prices change
READ_MULT = {"opus": 0.05, "sonnet": 0.05, "fable": 0.025, "haiku": 0.1}
WRITE_MULT = {"5m": 1.25, "1h": 2.0}


def scan(path):
    seen, prev = set(), None
    a = dict(model="?", calls=0, ctx=0, peak=0, ttl=set(), cost=0.0, expiry=0.0,
             expiries=0, last=None, desc="")
    meta = path[:-6] + ".meta.json"
    if os.path.exists(meta):
        try:
            mj = json.load(open(meta))
            a["desc"] = f"{mj.get('agentType', '')}: {mj.get('description', '')}"
        except (OSError, ValueError):
            pass
    for line in open(path):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("type") != "assistant":
            continue
        m = d.get("message") or {}
        u, mid = m.get("usage"), m.get("id")
        if not u or mid in seen:  # one API call is logged once per content block
            continue
        seen.add(mid)
        fam = next((k for k in PRICE if k in m.get("model", "")), "sonnet")
        a["model"] = fam
        t = datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00"))
        gap = (t - prev).total_seconds() if prev else 0
        prev = a["last"] = t
        w = u.get("cache_creation_input_tokens", 0)
        r = u.get("cache_read_input_tokens", 0)
        cc = u.get("cache_creation") or {}
        ttl = "1h" if cc.get("ephemeral_1h_input_tokens") else "5m"
        if w:
            a["ttl"].add(ttl)
        p = PRICE[fam] / 1e6
        a["cost"] += w * WRITE_MULT[ttl] * p + r * READ_MULT[fam] * p + u.get("input_tokens", 0) * p
        limit = 3600 if ttl == "1h" else 300
        if gap > limit and w > 20000:
            a["expiries"] += 1
            a["expiry"] += w * WRITE_MULT[ttl] * p
        a["ctx"] = w + r + u.get("input_tokens", 0)
        a["peak"] = max(a["peak"], a["ctx"])
        a["calls"] += 1
    return a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hours", type=float, default=12)
    ap.add_argument("--session", default="")
    ap.add_argument("--agent", default="")
    o = ap.parse_args()
    now = time.time()
    files = glob.glob(os.path.expanduser("~/.claude/projects/*/*/subagents/agent-*.jsonl"))
    rows = []
    for f in files:
        if now - os.path.getmtime(f) > o.hours * 3600:
            continue
        sid, aid = f.split("/")[-3], os.path.basename(f)[6:-6]
        if not sid.startswith(o.session) or not aid.startswith(o.agent):
            continue
        a = scan(f)
        if a["last"]:
            rows.append((sid, aid, a))
    rows.sort(key=lambda x: x[2]["last"])
    tot = exp = 0.0
    for sid, aid, a in rows:
        idle = (datetime.now(timezone.utc) - a["last"]).total_seconds()
        ttl = "1h" if "1h" in a["ttl"] else "5m"
        warm = "warm" if idle < (3600 if ttl == "1h" else 300) else "cold"
        flag = " OVER-300k" if a["peak"] > 300_000 else ""
        print(f"{sid[:8]} {aid[:10]} {a['model']:6} calls={a['calls']:4} ctx={a['ctx']//1000:4}k "
              f"peak={a['peak']//1000:4}k idle={int(idle/60):4}m {ttl} {warm} "
              f"${a['cost']:6.2f} expiry=${a['expiry']:5.2f}({a['expiries']}){flag} | {a['desc'][:60]}")
        tot += a["cost"]; exp += a["expiry"]
    print(f"\n{len(rows)} agents, ${tot:.2f} at API list prices, of which ${exp:.2f} cache rewrites after expiry")


if __name__ == "__main__":
    main()

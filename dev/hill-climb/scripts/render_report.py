#!/usr/bin/env python3
"""Render a hill-climb run.json into a self-contained HTML report.

Usage: python3 render_report.py run.json [-o report.html] [--no-embed]
Stdlib only. Images referenced in evidence are embedded as data URIs unless --no-embed.
"""
import argparse
import base64
import html
import json
import mimetypes
import statistics
from datetime import datetime
from pathlib import Path

E = html.escape
SERIES = 8  # categorical slots, fixed order


def esc(v):
    return E("" if v is None else str(v))


def fmt(v):
    if v is None:
        return "–"
    if isinstance(v, float):
        return f"{v:.1f}".rstrip("0").rstrip(".") if v != int(v) else f"{int(v)}"
    return str(v)


class Ctx:
    def __init__(self, run, base, embed):
        self.run, self.base, self.embed = run, base, embed
        self.agents = {a["id"]: a for a in run.get("agents", [])}
        self.subjects = {s["id"]: s for s in run.get("subjects", [])}
        self.criteria = run.get("rubric", {}).get("criteria", [])
        self.crit_names = {c["id"]: c.get("name", c["id"]) for c in self.criteria}
        self.crit_names["overall"] = "Overall"
        self.judges = [a["id"] for a in run.get("agents", []) if a.get("role") == "judge"]
        for r in run.get("rounds", []):
            for s in r.get("scores", []):
                if s["judge"] not in self.judges:
                    self.judges.append(s["judge"])
        self.color = {j: f"var(--s{(i % SERIES) + 1})" for i, j in enumerate(self.judges)}

    def model(self, aid):
        a = self.agents.get(aid, {})
        return a.get("returned_model") or a.get("requested_model") or aid

    def panel(self, rnd, subject, crit="overall"):
        """Visible seats only; sealed hold-out seats are reported separately."""
        vals = [self.score(rnd, j, subject, crit) for j in self.judges if not self.agents.get(j, {}).get("sealed")]
        return [v for v in vals if v is not None]

    def name(self, aid):
        return self.agents.get(aid, {}).get("name", aid)

    def sname(self, sid):
        return self.subjects.get(sid, {}).get("name", sid)

    def img(self, rel):
        p = (self.base / rel)
        if self.embed and p.is_file():
            mime = mimetypes.guess_type(p.name)[0] or "image/png"
            return f"data:{mime};base64," + base64.b64encode(p.read_bytes()).decode()
        return rel

    def score(self, rnd, judge, subject, crit="overall"):
        for s in rnd.get("scores", []):
            if s["judge"] == judge and s.get("subject") == subject and s.get("criterion", "overall") == crit:
                return s.get("score")
        return None

    def candidate(self):
        for s in self.run.get("subjects", []):
            if s.get("kind") == "candidate":
                return s["id"]
        return None


# ---------- chart ----------

def line_chart(series, x_labels, y_min, y_max, threshold=None, y_label="score", higher_better=True):
    W, H, L, R, T, B = 720, 300, 44, 130, 16, 36
    pw, ph = W - L - R, H - T - B
    n = max(len(x_labels), 2)
    xs = lambda i: L + pw * (i / (n - 1))
    ys = lambda v: T + ph * (1 - (v - y_min) / ((y_max - y_min) or 1))
    out = [f'<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="{esc(y_label)} by round">']
    # grid
    steps = 5
    for k in range(steps + 1):
        v = y_min + (y_max - y_min) * k / steps
        y = ys(v)
        out.append(f'<line x1="{L}" x2="{L+pw}" y1="{y:.1f}" y2="{y:.1f}" class="grid"/>')
        out.append(f'<text x="{L-8}" y="{y+4:.1f}" class="axis" text-anchor="end">{fmt(round(v, 1))}</text>')
    for i, lab in enumerate(x_labels):
        out.append(f'<text x="{xs(i):.1f}" y="{H-12}" class="axis" text-anchor="middle">{esc(lab)}</text>')
    if threshold is not None and y_min <= threshold <= y_max:
        y = ys(threshold)
        out.append(f'<line x1="{L}" x2="{L+pw}" y1="{y:.1f}" y2="{y:.1f}" class="thresh"/>')
        out.append(f'<text x="{L+6}" y="{y-5:.1f}" class="axis">target {fmt(threshold)}</text>')
    labels = []
    for s in series:
        pts = [(i, v) for i, v in enumerate(s["points"]) if v is not None]
        if not pts:
            continue
        # draw segments only between consecutive present points
        d, prev = [], None
        for i, v in pts:
            d.append(("M" if prev is None or i != prev + 1 else "L") + f"{xs(i):.1f},{ys(v):.1f}")
            prev = i
        dash = ' stroke-dasharray="5 4"' if s.get("dashed") else ""
        out.append(f'<path d="{" ".join(d)}" fill="none" stroke="{s["color"]}" stroke-width="2"{dash} stroke-linejoin="round"/>')
        for i, v in pts:
            out.append(f'<circle cx="{xs(i):.1f}" cy="{ys(v):.1f}" r="4" fill="{s["color"]}" class="pt">'
                       f'<title>{esc(s["name"])} · {esc(x_labels[i])}: {fmt(v)}</title></circle>')
        li, lv = pts[-1]
        labels.append([ys(lv), s["name"], s["color"], xs(li)])
    if len(series) <= 4:
        labels.sort()
        for k in range(1, len(labels)):
            if labels[k][0] - labels[k - 1][0] < 13:
                labels[k][0] = labels[k - 1][0] + 13
        for y, name, color, _ in labels:
            out.append(f'<text x="{L+pw+8}" y="{y+4:.1f}" class="dlabel">{esc(name)}</text>')
    out.append("</svg>")
    legend = ""
    if len(series) >= 2:
        legend = '<div class="legend">' + "".join(
            f'<span><i style="background:{s["color"]}" class="{"dash" if s.get("dashed") else ""}"></i>{esc(s["name"])}</span>'
            for s in series) + "</div>"
    return legend + "".join(out)


def y_range(values, lo=None, hi=None):
    vals = [v for v in values if v is not None]
    if not vals:
        return 0, 10
    a, b = min(vals), max(vals)
    if lo is not None:
        a = min(a, lo)
    if hi is not None:
        b = max(b, hi)
    pad = max((b - a) * 0.1, 0.5)
    return max(0, round(a - pad)), round(b + pad + 0.49)


# ---------- sections ----------

def sec_header(c):
    r = c.run
    status = r.get("status", "running")
    meta = [("Mode", r.get("mode", "climb")), ("Called by", r.get("caller")), ("Owner", r.get("owner")),
            ("Started", r.get("started")), ("Ended", r.get("ended")), ("Rounds", len(r.get("rounds", [])))]
    seats = {}
    for a in r.get("agents", []):
        if a.get("role") == "judge":
            m = a.get("returned_model") or a.get("requested_model") or a["id"]
            seats[m] = seats.get(m, 0) + 1
    if seats:
        meta.append(("Judge panel", ", ".join(f"{m} ×{n}" for m, n in seats.items())
                     + f" ({len(seats)} model{'s' if len(seats) != 1 else ''}, {sum(seats.values())} seats)"))
    tgt = r.get("target", {})
    if tgt:
        meta.append(("Target", f'{tgt.get("rule", fmt(tgt.get("threshold")))}'
                     + ("" if not c.judges else (" (hidden from judges)" if tgt.get("hidden_from_judges") else " (judges were told)"))))
    b = r.get("budget", {})
    if b:
        meta.append(("Budget / spend", " · ".join(f"{k}: {v}" for k, v in b.items())))
    rows = "".join(f"<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in meta if v not in (None, ""))
    prov = f'<p class="muted">Source: {esc(r["provenance"])}</p>' if r.get("provenance") else ""
    return (f'<header><p class="eyebrow">Hill-climb report</p><h1>{esc(r.get("title", "Untitled run"))}</h1>'
            f'<p class="goal">{esc(r.get("goal", ""))}</p>'
            f'<span class="pill st-{esc(status)}">{esc(status.replace("-", " "))}</span>'
            f'<dl class="meta">{rows}</dl>{prov}</header>')


def sec_tiles(c):
    cand = c.candidate()
    rounds = c.run.get("rounds", [])
    if not cand or not rounds:
        return ""
    tiles = []
    last_rd = next((rd for rd in reversed(rounds) if c.panel(rd, cand)), None)
    if last_rd:
        pv = c.panel(last_rd, cand)
        sp = f"spread {fmt(round(max(pv)-min(pv), 2))} across {len(pv)} seats" if len(pv) > 1 else "one seat"
        tiles.append(f'<div class="tile strong"><div class="tlabel">Panel mean (visible seats), round {esc(last_rd.get("n"))}</div>'
                     f'<div class="tval">{fmt(round(statistics.mean(pv), 2))}</div><span class="delta">{sp}</span></div>')
    for j in c.judges:
        first = next((c.score(rd, j, cand) for rd in rounds if c.score(rd, j, cand) is not None), None)
        last = next((c.score(rd, j, cand) for rd in reversed(rounds) if c.score(rd, j, cand) is not None), None)
        if last is None:
            continue
        delta = f'<span class="delta">{"+" if last-first >= 0 else ""}{fmt(round(last-first, 2))} from first score</span>' if first is not None else ""
        tiles.append(f'<div class="tile"><div class="tlabel">{esc(c.name(j))}</div><div class="tval">{fmt(last)}</div>{delta}</div>')
    for m in c.run.get("metrics", []):
        vals = [rd.get("metrics", {}).get(m["id"]) for rd in rounds]
        vals = [v for v in vals if v is not None]
        if vals:
            tiles.append(f'<div class="tile"><div class="tlabel">{esc(m["name"])}</div><div class="tval">{fmt(vals[-1])}</div>'
                         f'<span class="delta">from {fmt(vals[0])} ({esc(m.get("direction","higher"))} is better)</span></div>')
    return f'<section class="tiles">{"".join(tiles)}</section>' if tiles else ""


def sec_method():
    return """<details class="method"><summary>Why this method</summary>
<p><b>Targets and feedback.</b> Models improve reliably when every round returns a score and reasons. A target such as “every judge scores at least 9” gives the builder something to climb; the judges’ notes tell it which way is up.</p>
<p><b>Not bottlenecked on articulation.</b> Hand-written principles cap the result at what someone managed to write down (the bitter lesson). Independent judges with broad taste score the work and the builder searches for improvements, including ones nobody would have specified.</p>
<p><b>Human signal still counts.</b> The owner’s preferences, examples, reference products, corrections and vetoes enter as rubric criteria, anchors, comparators and hard checks, listed below. The owner’s own look is the final gate; model agreement is not.</p>
<p><b>Read scores as signal, not truth.</b> The same judge can score the same thing differently on another run; comparators drift as the candidate improves. Judges did not see the target unless the header says so.</p>
</details>"""


def sec_rubric(c):
    r = c.run
    rub = r.get("rubric", {})
    parts = ['<section><h2><span class="num">1</span>Rubric</h2>']
    hs = r.get("human_signal", [])
    if hs:
        parts.append('<h3>Human signal</h3><ul class="signal">' + "".join(
            f'<li><span class="tag">{esc(h.get("kind"))}</span> “{esc(h.get("text"))}”'
            + (f' <span class="muted">— {esc(h["source"])}</span>' if h.get("source") else "") + "</li>" for h in hs) + "</ul>")
    if rub:
        parts.append(f'<p class="muted">Version {esc(rub.get("version", 1))} · scale {esc(rub.get("scale", "1-10"))}'
                     + (f' · overall = {esc(str(rub["overall"]).removeprefix("overall = ").removeprefix("overall: "))}' if rub.get("overall") else "") + "</p>")
    if c.criteria:
        rows = []
        for cr in c.criteria:
            an = cr.get("anchors", {})
            anchors = "".join(f'<div><b>{esc(k)}</b> {esc(v)}</div>' for k, v in sorted(an.items(), key=lambda kv: float(kv[0])))
            rows.append(f'<tr><td><b>{esc(cr.get("name", cr["id"]))}</b><div class="muted">{esc(cr.get("description",""))}</div></td>'
                        f'<td class="anch">{anchors or "–"}</td><td><span class="tag src-{esc(cr.get("source","human"))}">{esc(cr.get("source","human"))}</span></td>'
                        f'<td class="n">{fmt(cr.get("weight", 1))}</td></tr>')
        parts.append('<div class="tw"><table><thead><tr><th>Criterion</th><th>Anchors</th><th>Source</th><th>Weight</th></tr></thead><tbody>'
                     + "".join(rows) + "</tbody></table></div>")
    if rub.get("locked"):
        parts.append('<h3>Locked owner decisions <span class="muted">(judges told not to deduct)</span></h3><ul>' + "".join(
            f'<li>{esc(x.get("text"))}' + (f' <span class="muted">— {esc(x["source"])}</span>' if x.get("source") else "") + "</li>"
            for x in rub["locked"]) + "</ul>")
    if rub.get("checks"):
        parts.append('<h3>Hard checks</h3><ul>' + "".join(
            f'<li>{esc(k.get("name", k["id"]))}' + (f' <span class="tag">{esc(k["kind"])}</span>' if k.get("kind") else "") + "</li>"
            for k in rub["checks"]) + "</ul>")
    if r.get("metrics"):
        parts.append('<h3>Programmatic metrics</h3><ul>' + "".join(
            f'<li>{esc(m["name"])} <span class="muted">({esc(m.get("unit",""))}, {esc(m.get("direction","higher"))} is better)</span></li>'
            for m in r["metrics"]) + "</ul>")
    if rub.get("changes"):
        parts.append('<h3>Rubric changes</h3><ul>' + "".join(
            f'<li>Round {esc(ch.get("round"))} → v{esc(ch.get("version",""))}: {esc(ch.get("what"))} <span class="muted">({esc(ch.get("why",""))})</span></li>'
            for ch in rub["changes"]) + "</ul>")
    parts.append("</section>")
    return "".join(parts)


def link(u):
    if not u:
        return ""
    return f'<a href="{esc(u)}">open</a>' if str(u).startswith(("http", "https", "file")) else esc(u)


def sec_agents(c):
    ags = c.run.get("agents", [])
    if not ags:
        return ""
    rows = []
    for a in ags:
        req, ret = a.get("requested_model"), a.get("returned_model")
        mismatch = ' class="warn"' if req and ret and req != ret else ""
        role = esc(a.get("role")) + (' <span class="tag">sealed</span>' if a.get("sealed") else "")
        if a.get("same_family"):
            role += ' <span class="tag">implementer family</span>'
        rows.append(f'<tr><td>{esc(a.get("name", a["id"]))}</td><td>{role}</td><td>{esc(req)}</td>'
                    f'<td{mismatch}>{esc(ret or "unknown")}</td><td>{esc(a.get("route"))}</td><td>{esc(a.get("effort"))}</td>'
                    f'<td>{link(a.get("link"))}</td>'
                    f'<td class="muted">{esc(a.get("notes"))}</td></tr>')
    return ('<section><h2><span class="num">2</span>Agents and models</h2><div class="tw"><table><thead><tr><th>Agent</th><th>Role</th>'
            '<th>Requested model</th><th>Returned model</th><th>Route</th><th>Effort</th><th>Thread</th><th>Notes</th></tr></thead><tbody>'
            + "".join(rows) + "</tbody></table></div></section>")


def sec_scores_climb(c):
    rounds = c.run.get("rounds", [])
    cand = c.candidate()
    labels = [f'R{rd.get("n", i)}' for i, rd in enumerate(rounds)]
    thr = c.run.get("target", {}).get("threshold")
    parts = ['<section><h2><span class="num">3</span>Rounds and scores</h2>']
    if cand:
        series = [{"name": c.name(j), "color": c.color[j], "points": [c.score(rd, j, cand) for rd in rounds]} for j in c.judges]
        series = [s for s in series if any(v is not None for v in s["points"])]
        if series:
            lo, hi = y_range([v for s in series for v in s["points"]] + ([thr] if thr else []))
            parts.append(f'<h3>{esc(c.sname(cand))}: overall score by judge</h3>')
            parts.append(line_chart(series, labels, lo, hi, thr))
        comps = [s for s in c.run.get("subjects", []) if s.get("kind") in ("comparator", "baseline")]
        if comps:
            def mean_at(rd, sid):
                vals = [c.score(rd, j, sid) for j in c.judges]
                vals = [v for v in vals if v is not None]
                return round(statistics.mean(vals), 2) if vals else None
            cs = [{"name": c.sname(cand), "color": "var(--s1)", "points": [mean_at(rd, cand) for rd in rounds]}]
            for k, s in enumerate(comps):
                cs.append({"name": s["name"], "color": f"var(--s{(k % (SERIES-1)) + 2})", "dashed": True,
                           "points": [mean_at(rd, s["id"]) for rd in rounds]})
            cs = [s for s in cs if any(v is not None for v in s["points"])]
            if len(cs) > 1:
                lo, hi = y_range([v for s in cs for v in s["points"]])
                parts.append('<h3>Candidate against comparators (mean of judges who scored both)</h3>'
                             '<p class="muted">Comparators did not change between rounds; movement in their scores is judge drift.</p>')
                parts.append(line_chart(cs, labels, lo, hi))
    for m in c.run.get("metrics", []):
        pts = [rd.get("metrics", {}).get(m["id"]) for rd in rounds]
        if any(v is not None for v in pts):
            lo, hi = y_range(pts, lo=0)
            parts.append(f'<h3>{esc(m["name"])} ({esc(m.get("direction","higher"))} is better)</h3>')
            parts.append(line_chart([{"name": m["name"], "color": "var(--s3)", "points": pts}], labels, lo, hi, y_label=m["name"]))
    # table: rounds x judges x subjects overall
    subj_ids = [s["id"] for s in c.run.get("subjects", [])] or [cand]
    head = "".join(f"<th>{esc(c.name(j))}</th>" for j in c.judges) + "<th>Mean</th><th>Spread</th>"
    body = []
    for rd in rounds:
        for sid in subj_ids:
            cells = [c.score(rd, j, sid) for j in c.judges]
            if all(v is None for v in cells):
                continue
            body.append(f'<tr><td>R{esc(rd.get("n"))}</td><td>{esc(c.sname(sid))}</td>'
                        + "".join(f'<td class="n {heat(v, thr)}">{fmt(v)}</td>' for v in cells)
                        + mean_spread([v for v in cells if v is not None], thr) + "</tr>")
    if body:
        parts.append(f'<h3>Overall scores table</h3><div class="tw"><table><thead><tr><th>Round</th><th>Subject</th>{head}</tr></thead>'
                     f'<tbody>{"".join(body)}</tbody></table></div>')
    if cand:
        parts.append(model_table(c, rounds, cand))
    if cand:
        parts.append(criteria_over_rounds(c, rounds, cand, thr))
    parts.append('<p class="muted">Each round’s full table (every criterion × every subject, per seat) is in section 4.</p></section>')
    return "".join(parts)


def mean_spread(vals, thr=None):
    if not vals:
        return '<td class="n">–</td><td class="n">–</td>'
    m = round(statistics.mean(vals), 2)
    s = round(max(vals) - min(vals), 2) if len(vals) > 1 else None
    return f'<td class="n strong {heat(m, thr)}">{fmt(m)}</td><td class="n">{fmt(s)}</td>'


def model_table(c, rounds, subject):
    """Per round, mean and spread of seats grouped by model."""
    models = []
    for j in c.judges:
        if c.model(j) not in models:
            models.append(c.model(j))
    if len(models) == len(c.judges):
        return ""  # one seat per model: nothing to group
    head = "".join(f"<th>{esc(m)} mean</th><th>spread</th>" for m in models)
    rows = []
    for rd in rounds:
        cells = []
        for m in models:
            vals = [c.score(rd, j, subject) for j in c.judges if c.model(j) == m]
            cells.append(mean_spread([v for v in vals if v is not None]))
        if any("–" not in x for x in cells):
            rows.append(f'<tr><td>R{esc(rd.get("n"))}</td>{"".join(cells)}</tr>')
    return ('<h3>By model (seats of the same model averaged)</h3><p class="muted">Spread between seats of one model shows judge noise; '
            'agreement between seats of the same model is weaker evidence than agreement between models.</p>'
            f'<div class="tw"><table><thead><tr><th>Round</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def heat(v, thr):
    if v is None or thr is None:
        return ""
    return "hit" if v >= thr else ("near" if v >= thr - 1 else "low")


def cell(vals, thr, show_spread=True):
    if not vals:
        return '<td class="n">–</td>'
    m = round(statistics.mean(vals), 2)
    sp = f'<span class="sp">±{fmt(round((max(vals)-min(vals))/2, 2))}</span>' if show_spread and len(vals) > 1 else ""
    return f'<td class="n {heat(m, thr)}">{fmt(m)}{sp}</td>'


def crit_rows(c):
    return [(cr["id"], c.crit_names.get(cr["id"], cr["id"])) for cr in c.criteria] + [("overall", "Overall")]


def round_subjects(c, rd):
    ids = [s["id"] for s in c.run.get("subjects", [])]
    seen = {s.get("subject") for s in rd.get("scores", [])}
    return [i for i in ids if i in seen] + [i for i in seen if i not in ids and i]


def round_matrix(c, rd, thr):
    """Criteria x subjects for one round: panel mean (± half-range), plus each seat's own table."""
    subs = round_subjects(c, rd)
    if not subs:
        return ""
    seats = [j for j in c.judges if any(s["judge"] == j for s in rd.get("scores", []))]
    head = "".join(f"<th>{esc(c.sname(s))}</th>" for s in subs)
    rows = []
    for cid, cname in crit_rows(c):
        cells = [cell(c.panel(rd, s, cid), thr) for s in subs]
        if all(x == '<td class="n">–</td>' for x in cells):
            continue
        cls = ' class="overall"' if cid == "overall" else ""
        rows.append(f"<tr{cls}><td>{esc(cname)}</td>{''.join(cells)}</tr>")
    has_crit = any(s.get("criterion", "overall") != "overall" for s in rd.get("scores", []))
    warn = "" if has_crit or not c.criteria else '<p class="warnline">Only overall scores were recorded this round; judges should score every criterion.</p>'
    label = f"panel mean of {len(seats)} seat{'s' if len(seats) != 1 else ''}" + (" (± half the gap between highest and lowest seat)" if len(seats) > 1 else "")
    out = [f'<h4>Scores by criterion <span class="muted">{esc(label)}</span></h4>{warn}'
           f'<div class="tw"><table class="matrix"><thead><tr><th>Criterion</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>']
    if len(seats) > 1:
        per = []
        for j in seats:
            r2 = []
            for cid, cname in crit_rows(c):
                vals = [c.score(rd, j, s, cid) for s in subs]
                if all(v is None for v in vals):
                    continue
                cls = ' class="overall"' if cid == "overall" else ""
                r2.append(f"<tr{cls}><td>{esc(cname)}</td>" + "".join(f'<td class="n {heat(v, thr)}">{fmt(v)}</td>' for v in vals) + "</tr>")
            per.append(f'<h5>{esc(c.name(j))} <span class="muted">{esc(c.model(j))}</span></h5><div class="tw"><table class="matrix"><thead><tr><th>Criterion</th>{head}</tr></thead>'
                       f'<tbody>{"".join(r2)}</tbody></table></div>')
        out.append(f'<details><summary>Each seat’s table</summary>{"".join(per)}</details>')
    return "".join(out)


def criteria_over_rounds(c, rounds, subject, thr):
    rs = [rd for rd in rounds if c.panel(rd, subject) or any(c.panel(rd, subject, cr["id"]) for cr in c.criteria)]
    if not rs or not c.criteria:
        return ""
    head = "".join(f'<th>R{esc(rd.get("n"))}</th>' for rd in rs)
    rows = []
    for cid, cname in crit_rows(c):
        cls = ' class="overall"' if cid == "overall" else ""
        rows.append(f"<tr{cls}><td>{esc(cname)}</td>" + "".join(cell(c.panel(rd, subject, cid), thr, False) for rd in rs) + "</tr>")
    return (f'<h3>{esc(c.sname(subject))}: each criterion by round (panel mean)</h3>'
            f'<div class="tw"><table class="matrix"><thead><tr><th>Criterion</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def criteria_table(c, rd, subject, thr):
    crits = [cr["id"] for cr in c.criteria]
    if not crits:
        return ""
    rows = []
    for j in c.judges:
        vals = [c.score(rd, j, subject, cr) for cr in crits]
        if all(v is None for v in vals):
            continue
        rows.append(f"<tr><td>{esc(c.name(j))}</td>" + "".join(f'<td class="n {heat(v, thr)}">{fmt(v)}</td>' for v in vals) + "</tr>")
    if not rows:
        return ""
    head = "".join(f"<th>{esc(c.crit_names.get(cr, cr))}</th>" for cr in crits)
    return f'<div class="tw"><table><thead><tr><th>Judge</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>'


def sec_scores_options(c):
    rounds = c.run.get("rounds", [])
    if not rounds:
        return ""
    rd = rounds[-1]
    opts = [s for s in c.run.get("subjects", []) if s.get("kind") in ("option", "candidate", "baseline", "comparator")]
    crits = [cr["id"] for cr in c.criteria] + ["overall"]
    rows = []
    summary = []
    for o in opts:
        cells = []
        for cr in crits:
            vals = [c.score(rd, j, o["id"], cr) for j in c.judges]
            vals = [v for v in vals if v is not None]
            cells.append(round(statistics.mean(vals), 2) if vals else None)
        ov = [c.score(rd, j, o["id"]) for j in c.judges]
        ov = [v for v in ov if v is not None]
        spread = round(max(ov) - min(ov), 2) if len(ov) > 1 else None
        summary.append((cells[-1] if cells[-1] is not None else -1, o, cells, spread, ov))
    summary.sort(key=lambda t: -t[0])
    for rank, (_, o, cells, spread, ov) in enumerate(summary, 1):
        warn = ' class="n warn"' if spread is not None and spread > 2 else ' class="n"'
        rows.append(f'<tr><td class="n">{rank}</td><td><b>{esc(o["name"])}</b><div class="muted">{esc(o.get("description",""))}</div></td>'
                    + "".join(f'<td class="n">{fmt(v)}</td>' for v in cells)
                    + f'<td{warn}>{fmt(spread)}</td></tr>')
    head = "".join(f"<th>{esc(c.crit_names.get(cr, cr))}</th>" for cr in crits)
    per_judge = []
    for j in c.judges:
        jr = [f'<tr><td>{esc(o["name"])}</td>' + "".join(f'<td class="n">{fmt(c.score(rd, j, o["id"], cr))}</td>' for cr in crits) + "</tr>" for o in opts]
        per_judge.append(f'<details><summary>{esc(c.name(j))}: scores by option</summary><div class="tw"><table><thead><tr><th>Option</th>{head}</tr></thead>'
                         f'<tbody>{"".join(jr)}</tbody></table></div></details>')
    return ('<section><h2><span class="num">3</span>Scores</h2><p class="muted">Mean across judges. Spread is the gap between the highest and '
            'lowest overall score for that option; over 2 points is flagged.</p>'
            f'<div class="tw"><table><thead><tr><th>Rank</th><th>Option</th>{head}<th>Spread</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
            + "".join(per_judge) + "</section>")


def evidence_html(c, ev):
    t = ev.get("type")
    cap = f'<figcaption>{esc(ev.get("caption") or ev.get("label") or "")}</figcaption>' if (ev.get("caption") or ev.get("label")) else ""
    if t == "text":
        return (f'<figure class="ev">{cap}<div class="ba"><div><span class="tag">before</span><pre>{esc(ev.get("before"))}</pre></div>'
                f'<div><span class="tag after">after</span><pre>{esc(ev.get("after"))}</pre></div></div></figure>')
    if t == "images":
        return (f'<figure class="ev">{cap}<div class="ba"><div><span class="tag">before</span><img loading="lazy" src="{esc(c.img(ev["before"]))}" alt="before"></div>'
                f'<div><span class="tag after">after</span><img loading="lazy" src="{esc(c.img(ev["after"]))}" alt="after"></div></div></figure>')
    if t == "image":
        return f'<figure class="ev"><img loading="lazy" src="{esc(c.img(ev["path"]))}" alt="{esc(ev.get("caption",""))}">{cap}</figure>'
    return f'<p class="evnote">{esc(ev.get("text"))}</p>'


def response_html(c, r):
    out = [f'<div class="response"><h4>What the implementer did <span class="tag">{esc(c.name(r.get("by", "builder")))}</span></h4>']
    if r.get("summary"):
        out.append(f'<p>{esc(r["summary"])}</p>')
    if r.get("acted_on"):
        rows = "".join(f'<tr><td>{esc(c.name(x.get("from")))}</td><td>{esc(x.get("finding"))}</td><td>{esc(x.get("action"))}</td>'
                       f'<td class="muted">{esc(", ".join(c.crit_names.get(k, k) for k in x.get("criteria", [])))}</td></tr>' for x in r["acted_on"])
        out.append(f'<div class="tw"><table><thead><tr><th>From</th><th>Finding</th><th>Action taken</th><th>Criteria</th></tr></thead><tbody>{rows}</tbody></table></div>')
    for key, label in (("escalated", "Escalated to the owner"), ("reverted", "Tried and reverted")):
        if r.get(key):
            out.append(f'<p class="muted"><b>{label}:</b></p><ul>' + "".join(
                f'<li>{esc(x.get("finding") or x.get("change"))}'
                + (f' <span class="muted">({esc(c.name(x.get("from")))})</span>' if x.get("from") else "")
                + (f' <span class="muted">— {esc(x.get("why"))}</span>' if x.get("why") else "") + "</li>" for x in r[key]) + "</ul>")
    if r.get("declined"):
        out.append('<p class="muted"><b>Declined:</b></p><ul>' + "".join(
            f'<li>{esc(x.get("finding"))} <span class="muted">({esc(c.name(x.get("from")))}) — {esc(x.get("why"))}</span></li>' for x in r["declined"]) + "</ul>")
    out.append("</div>")
    return "".join(out)


def _dur(u):
    if u.get("duration_s") is not None:
        return float(u["duration_s"])
    try:
        a = datetime.fromisoformat(str(u["started"]).replace("Z", "+00:00"))
        b = datetime.fromisoformat(str(u["ended"]).replace("Z", "+00:00"))
        return (b - a).total_seconds()
    except Exception:
        return None


def hms(s):
    if s is None:
        return "unknown"
    s = int(round(s))
    h, m = divmod(s // 60, 60)
    return f"{h} h {m:02d} min" if h else (f"{m} min {s % 60:02d} s" if m else f"{s} s")


def ktok(n):
    if n is None:
        return "unknown"
    return f"{n/1e6:.2f} M" if n >= 1e6 else (f"{n/1e3:.1f} k" if n >= 1e3 else str(int(n)))


def money(v):
    return "unknown" if v is None else f"${v:,.2f}"


def agg(us):
    d = {"calls": len(us), "time": None, "tin": None, "tout": None, "cost": None, "unknown": 0, "bases": set()}
    for u in us:
        x = _dur(u)
        if x is not None:
            d["time"] = (d["time"] or 0) + x
        for k, f in (("tin", "tokens_in"), ("tout", "tokens_out"), ("cost", "cost")):
            if u.get(f) is not None:
                d[k] = (d[k] or 0) + u[f]
        if u.get("tokens_in") is None and u.get("tokens_out") is None:
            d["unknown"] += 1
        d["bases"].add(u.get("cost_basis", "unknown"))
    return d


def sec_usage(c):
    rounds = c.run.get("rounds", [])
    allu = [dict(u, _round=rd.get("n")) for rd in rounds for u in rd.get("usage", [])]
    if not allu:
        return ('<section><h2><span class="num">5</span>Time, tokens and cost</h2>'
                '<p class="muted">No usage recorded for this run.</p></section>')
    tot = agg(allu)
    wall = None
    starts = [u.get("started") for u in allu if u.get("started")]
    ends = [u.get("ended") for u in allu if u.get("ended")]
    if starts and ends:
        wall = _dur({"started": min(starts), "ended": max(ends)})
    tiles = [("Wall-clock", hms(wall)), ("Agent time (sum of calls)", hms(tot["time"])),
             ("Tokens in / out", f'{ktok(tot["tin"])} / {ktok(tot["tout"])}'), ("Cost", money(tot["cost"])),
             ("Agent calls", f'{tot["calls"]}' + (f' ({tot["unknown"]} without token data)' if tot["unknown"] else ""))]
    parts = ['<section><h2><span class="num">5</span>Time, tokens and cost</h2><div class="tiles">'
             + "".join(f'<div class="tile"><div class="tlabel">{esc(k)}</div><div class="tval sm">{esc(v)}</div></div>' for k, v in tiles)
             + f'</div><p class="muted">Cost basis: {esc(", ".join(sorted(tot["bases"])))}. Subscription calls cost nothing extra; list-price estimates are not charges. Totals count known values only.</p>']

    def table(label, groups):
        rows = "".join(f'<tr><td>{esc(k)}</td><td class="n">{g["calls"]}</td><td class="n">{esc(hms(g["time"]))}</td>'
                       f'<td class="n">{esc(ktok(g["tin"]))}</td><td class="n">{esc(ktok(g["tout"]))}</td><td class="n">{esc(money(g["cost"]))}</td>'
                       f'<td class="muted">{esc(", ".join(sorted(g["bases"])))}</td></tr>' for k, g in groups)
        return (f'<h3>{esc(label)}</h3><div class="tw"><table><thead><tr><th></th><th>Calls</th><th>Time</th><th>Tokens in</th>'
                f'<th>Tokens out</th><th>Cost</th><th>Basis</th></tr></thead><tbody>{rows}</tbody></table></div>')
    by_agent, by_round = {}, {}
    for u in allu:
        by_agent.setdefault(u.get("agent"), []).append(u)
        by_round.setdefault(u["_round"], []).append(u)
    parts.append(table("By agent", [(f'{c.name(a)} ({c.model(a)})', agg(us)) for a, us in by_agent.items()]))
    parts.append(table("By round", [(f"R{n}", agg(us)) for n, us in by_round.items()]))
    parts.append("</section>")
    return "".join(parts)


def sec_decisions(c):
    rounds = c.run.get("rounds", [])
    if not rounds:
        return ""
    thr = c.run.get("target", {}).get("threshold")
    parts = ['<section><h2><span class="num">4</span>Findings, responses and changes</h2>']
    cand = c.candidate()
    for rd in rounds:
        chips = []
        if cand:
            for j in c.judges:
                v = c.score(rd, j, cand)
                if v is not None:
                    chips.append(f'<span class="chip"><i style="background:{c.color[j]}"></i>{esc(c.name(j))} {fmt(v)}</span>')
        for mid, v in rd.get("metrics", {}).items():
            mname = next((m["name"] for m in c.run.get("metrics", []) if m["id"] == mid), mid)
            chips.append(f'<span class="chip">{esc(mname)} {fmt(v)}</span>')
        for cid, ok in rd.get("checks", {}).items():
            chips.append(f'<span class="chip {"ok" if ok else "bad"}">{"✓" if ok else "✗"} {esc(cid)}</span>')
        body = [f'<article class="round"><h3>Round {esc(rd.get("n"))}'
                + (f' <span class="muted">{esc(rd.get("date"))}</span>' if rd.get("date") else "") + "</h3>"]
        if chips:
            body.append(f'<div class="chips">{"".join(chips)}</div>')
        if rd.get("summary"):
            body.append(f'<p>{esc(rd["summary"])}</p>')
        body.append(round_matrix(c, rd, thr))
        if rd.get("winner"):
            body.append(f'<p class="pair"><b>Tournament winner:</b> <span class="tag after">{esc(c.sname(rd["winner"]))}</span></p>')
        if rd.get("outliers"):
            body.append('<p class="warnline">Outlier seats (shown, left out of the stop rule): '
                        + ", ".join(esc(c.name(j)) for j in rd["outliers"]) + "</p>")
        if rd.get("pairwise"):
            body.append('<p class="pair"><b>Pairwise, current vs previous:</b> ' + " · ".join(
                f'{esc(c.name(x.get("judge")))}: <span class="tag {"after" if x.get("winner") == "current" else ""}">{esc(x.get("winner"))}</span>'
                + (f' <span class="muted">{esc(x.get("reason"))}</span>' if x.get("reason") else "") for x in rd["pairwise"]) + "</p>")
        if rd.get("judge_notes"):
            body.append('<h4>What the judges said</h4><ul class="notes">' + "".join(
                f'<li><b>{esc(c.name(n.get("judge")))}:</b> {esc(n.get("text"))}</li>' for n in rd["judge_notes"]) + "</ul>")
        resp = rd.get("response")
        if resp:
            body.append(response_html(c, resp))
        for d in rd.get("decisions", []):
            crit = ", ".join(c.crit_names.get(x, x) for x in d.get("criteria", []))
            body.append(f'<div class="decision"><div class="dhead"><span class="tag">{esc(c.name(d.get("by", "builder")))}</span> <b>{esc(d.get("decision"))}</b></div>'
                        + (f'<p class="why">Why: {esc(d.get("reason"))}</p>' if d.get("reason") else "")
                        + (f'<p class="muted">Criteria: {esc(crit)}</p>' if crit else "")
                        + "".join(evidence_html(c, ev) for ev in d.get("evidence", [])) + "</div>")
        if rd.get("cost"):
            body.append(f'<p class="muted">Cost: {esc(rd["cost"])}</p>')
        body.append("</article>")
        parts.append("".join(body))
    parts.append("</section>")
    return "".join(parts)


def sec_outcome(c):
    o = c.run.get("outcome")
    if not o:
        return ""
    later = "".join(f"<li>{esc(x)}</li>" for x in o.get("later", []))
    return ('<section><h2>Outcome</h2><dl class="meta">'
            f'<div><dt>Stop reason</dt><dd>{esc(c.run.get("status"))}</dd></div>'
            f'<div><dt>Judges</dt><dd>{esc(o.get("verdict"))}</dd></div>'
            f'<div><dt>Owner verdict</dt><dd>{esc(o.get("owner_verdict", "pending"))}</dd></div></dl>'
            + (f'<p>{esc(o["notes"])}</p>' if o.get("notes") else "")
            + (f"<h3>Held back for later</h3><ul>{later}</ul>" if later else "") + "</section>")


CSS = """
:root{color-scheme:light;--bg:#fcfcfb;--panel:#f4f3f0;--ink:#0b0b0b;--ink2:#52514e;--line:#e2e0da;--grid:#ebe9e4;
--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--s6:#008300;--s7:#6250d6;--s8:#e34948;
--hit:#d9f2e6;--near:#fbefd3;--low:#fadcdc;--accent:#2a78d6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#1a1a19;--panel:#242422;--ink:#f0efec;--ink2:#c3c2b7;--line:#3a3936;--grid:#2e2d2a;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;--hit:#1f3d30;--near:#3d3320;--low:#452626;--accent:#3987e5}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#1a1a19;--panel:#242422;--ink:#f0efec;--ink2:#c3c2b7;--line:#3a3936;--grid:#2e2d2a;
--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--s6:#008300;--s7:#9085e9;--s8:#e66767;--hit:#1f3d30;--near:#3d3320;--low:#452626;--accent:#3987e5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1040px;margin:0 auto;padding:32px 16px 80px}
h1{font-size:2rem;line-height:1.2;margin:.2em 0}h2{font-size:1.35rem;margin:2.2em 0 .6em;display:flex;gap:.5em;align-items:center}
h3{font-size:1.05rem;margin:1.6em 0 .5em}h4{font-size:.95rem;margin:1em 0 .3em}
.num{display:inline-grid;place-items:center;width:1.6em;height:1.6em;border-radius:50%;background:var(--accent);color:#fff;font-size:.85rem}
.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:.75rem;color:var(--ink2);margin:0}
.goal{font-size:1.1rem;color:var(--ink2);margin:.2em 0 .8em}.muted{color:var(--ink2);font-size:.9rem}
.pill{display:inline-block;padding:.15em .7em;border-radius:99px;font-size:.85rem;background:var(--panel);border:1px solid var(--line);text-transform:capitalize}
.st-target-met{background:var(--hit)}.st-plateau,.st-round-cap,.st-budget-cap{background:var(--near)}
dl.meta{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px 20px;margin:1em 0}
dl.meta dt{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2)}dl.meta dd{margin:0}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:1.5em 0}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.tlabel{font-size:.8rem;color:var(--ink2)}.tval{font-size:2rem;font-weight:650;line-height:1.1}.delta{font-size:.8rem;color:var(--ink2)}
details{border:1px solid var(--line);border-radius:10px;padding:.6em 1em;margin:.8em 0;background:var(--panel)}
summary{cursor:pointer;font-weight:600}details.method p{margin:.6em 0}
.tw{overflow-x:auto;margin:.5em 0}table{border-collapse:collapse;width:100%;font-size:.92rem}
th,td{border-bottom:1px solid var(--line);padding:.45em .6em;text-align:left;vertical-align:top}th{font-size:.8rem;color:var(--ink2);font-weight:600}
td.n{text-align:right;font-variant-numeric:tabular-nums}td.hit{background:var(--hit)}td.near{background:var(--near)}td.low{background:var(--low)}
td.warn,.warn{background:var(--near)}
.anch div{font-size:.85rem;margin:.1em 0}
.tag{display:inline-block;font-size:.72rem;padding:.05em .5em;border-radius:5px;background:var(--bg);border:1px solid var(--line);color:var(--ink2);text-transform:uppercase;letter-spacing:.04em}
.tag.after{border-color:var(--s3);color:var(--ink)}
ul.signal li,ul.notes li{margin:.3em 0}
.chart{width:100%;height:auto;display:block;margin:.4em 0 1em}
.chart .grid{stroke:var(--grid);stroke-width:1}.chart .axis{fill:var(--ink2);font-size:12px}.chart .dlabel{fill:var(--ink);font-size:12px}
.chart .thresh{stroke:var(--ink2);stroke-dasharray:2 4;stroke-width:1.5}.chart .pt{stroke:var(--bg);stroke-width:2}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.85rem;color:var(--ink2)}
.legend i,.chip i{display:inline-block;width:14px;height:3px;border-radius:2px;margin-right:6px;vertical-align:middle}
.legend i.dash{background:repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)!important}
.round{border-left:3px solid var(--line);padding:.2em 0 .2em 1em;margin:1.5em 0}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{font-size:.8rem;padding:.15em .6em;border-radius:99px;background:var(--panel);border:1px solid var(--line)}
.chip.ok{background:var(--hit)}.chip.bad{background:var(--low)}
.decision{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:.8em 1em;margin:.8em 0}
.why{margin:.4em 0}
.ev{margin:.8em 0}.ev figcaption{font-size:.85rem;color:var(--ink2);margin:.3em 0}
.ba{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media (max-width:640px){.ba{grid-template-columns:1fr}}
.ba img,.ev>img{max-width:100%;border:1px solid var(--line);border-radius:6px;display:block;margin-top:4px}
pre{white-space:pre-wrap;font-size:.85rem;background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:.5em .7em;margin:4px 0}
.tile.strong{border-color:var(--accent)}.tval.sm{font-size:1.25rem;padding-top:.3em}td.strong{font-weight:650}
.response{border:1px solid var(--line);border-left:3px solid var(--s3);border-radius:10px;padding:.6em 1em;margin:.8em 0}
table.matrix{width:auto;min-width:min(100%,560px)}table.matrix td.n{min-width:96px}table.matrix tr.overall td{font-weight:650;border-top:2px solid var(--line)}.sp{display:block;font-size:.72rem;color:var(--ink2);font-weight:400}
.pair{font-size:.9rem;margin:.6em 0}.warnline{background:var(--near);padding:.3em .6em;border-radius:6px;font-size:.88rem}h5{margin:.8em 0 .2em;font-size:.9rem}
.evnote{font-size:.88rem;color:var(--ink2)}
footer{margin-top:3em;font-size:.8rem;color:var(--ink2)}
"""


def render(run, base, embed, src):
    c = Ctx(run, base, embed)
    scores = sec_scores_options(c) if run.get("mode") == "score" else sec_scores_climb(c)
    body = "".join([sec_header(c), sec_tiles(c), sec_method(), sec_rubric(c), sec_agents(c), scores, sec_decisions(c), sec_usage(c), sec_outcome(c)])
    gen = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = esc(run.get("title", "Hill-climb report"))
    return (f'<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title}</title><meta name="description" content="Hill-climb report: rubric, agents, scores by round and decisions.">'
            f'<style>{CSS}</style></head><body><main>{body}<footer>Rendered {gen} from {esc(src)} by hill-climb/render_report.py</footer></main></body></html>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("-o", "--out")
    ap.add_argument("--no-embed", action="store_true")
    a = ap.parse_args()
    p = Path(a.run).resolve()
    run = json.loads(p.read_text())
    out = Path(a.out) if a.out else p.with_name("report.html")
    out.write_text(render(run, p.parent, not a.no_embed, p.name))
    print(out)


if __name__ == "__main__":
    main()

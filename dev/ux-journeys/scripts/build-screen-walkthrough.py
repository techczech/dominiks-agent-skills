#!/usr/bin/env python3
"""Build a single-file interactive screen walkthrough.

Usage: python3 build-screen-walkthrough.py <contracts.json> <drawings-dir> <output.html>

Reads the contracts JSON (see references/screen-contract.md), one
<screen-id>.html drawing fragment per screen from drawings-dir, and an optional
_drawing.css in drawings-dir (shared drawing styles, injected once). Inlines
today.image (path relative to the JSON) as a data URI. Writes one
self-contained HTML file. Standard library only.

Fails (exit 1) when: a screen has no drawing; a step's goto names no screen;
a sees part has no data-part in its drawing; a data-goto names no screen; a
data-state / data-state-not names a state the screen does not have; a drawing
contains a script. Warns when a step's destination has no data-goto control.

Optional JSON, all backward compatible (a JSON without them builds as before):
  screens[].viewer, arrives_knowing, expects   shown at the top of the screen panel
  commitments: [{id, text}]                    numbered on the overview
  screens[].checks: ["C1"]                     chips; fails on an unknown commitment id
  roles: [{id, name}]; screens[].role          turns on the moment view (#moment-<n>)
  journey[].by (role id), does (text), causes: [{role, screen}],
  journey[].screens as {roleId: screenId} (the array form still works)
Also fails on: unknown role id; a screen listed under role R whose role is not R;
a duplicate role or commitment id; a screen with no role when roles exist.
"""
import base64
import html.parser
import json
import mimetypes
import sys
from pathlib import Path

PLACEHOLDER = '"__WALKTHROUGH_DATA__"'


class Scan(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.gotos, self.states, self.scripts = set(), set(), set(), 0

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.scripts += 1
        for k, v in attrs:
            if v is None:
                continue
            if k == "data-part":
                self.parts.add(v)
            elif k == "data-goto":
                self.gotos.add(v)
            elif k in ("data-state", "data-state-not", "data-default-state"):
                self.states.update(v.split())

    handle_startendtag = handle_starttag


def fail(errors):
    for e in errors:
        print("error: " + e, file=sys.stderr)
    print(f"{len(errors)} problem(s); nothing written.", file=sys.stderr)
    sys.exit(1)


def main(argv):
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        return 2
    json_path, ddir, out = Path(argv[1]), Path(argv[2]), Path(argv[3])
    template = Path(__file__).resolve().parent.parent / "assets" / "template-screen-walkthrough.html"
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"error: cannot read {json_path}: {e}", file=sys.stderr)
        return 1
    if not ddir.is_dir():
        print(f"error: drawings directory not found: {ddir}", file=sys.stderr)
        return 1

    errors, warnings = [], []
    ids = [s["id"] for s in data["screens"]]
    idset = set(ids)
    roles = data.get("roles") or []
    screen_role = {s["id"]: s.get("role") for s in data["screens"]}
    drawings = {}
    for s in data["screens"]:
        sid = s["id"]
        f = ddir / f"{sid}.html"
        if not f.is_file():
            errors.append(f"screen '{sid}' has no drawing (expected {f})")
            continue
        src = f.read_text(encoding="utf-8")
        drawings[sid] = src
        sc = Scan()
        sc.feed(src)
        if sc.scripts:
            errors.append(f"drawing '{sid}' contains a <script>; drawings must not")
        for x in s.get("sees", []):
            if x["part"] not in sc.parts:
                errors.append(f"screen '{sid}': sees part '{x['part']}' has no data-part in {f.name}")
        for g in sorted(sc.gotos - idset):
            errors.append(f"drawing '{sid}': data-goto='{g}' names no screen")
        stateids = {st["id"] for st in s.get("states", [])}
        for st in sorted(sc.states - stateids):
            errors.append(f"drawing '{sid}': data-state '{st}' names no state of screen '{sid}'")
        for stp in s.get("steps", []):
            if stp["goto"] not in idset:
                errors.append(f"screen '{sid}': step '{stp['do']}' has goto '{stp['goto']}', which names no screen")
            elif roles and screen_role.get(stp["goto"]) != s.get("role"):
                warnings.append(f"screen '{sid}': step '{stp['do']}' goes to '{stp['goto']}', which belongs to another role")
            elif stp["goto"] != sid and stp["goto"] not in sc.gotos:
                warnings.append(f"screen '{sid}': step '{stp['do']}' -> '{stp['goto']}' has no data-goto control in the drawing")
    roleids = [r["id"] for r in roles]
    roleset = set(roleids)
    if len(roleset) != len(roleids):
        errors.append("roles: duplicate role id")
    cids = [c["id"] for c in data.get("commitments", [])]
    cset = set(cids)
    if len(cset) != len(cids):
        errors.append("commitments: duplicate commitment id")
    for s in data["screens"]:
        if roles and s.get("role") not in roleset:
            errors.append(f"screen '{s['id']}': role '{s.get('role')}' is not in roles")
        for c in s.get("checks", []):
            if c not in cset:
                errors.append(f"screen '{s['id']}': checks unknown commitment '{c}'")
    for j in data.get("journey", []):
        n = j.get("n")
        scr = j.get("screens", [])
        pairs = list(scr.items()) if isinstance(scr, dict) else [(None, x) for x in scr]
        if isinstance(scr, dict) and not roles:
            errors.append(f"journey step {n}: screens is an object but the JSON has no roles")
        for role, sid in pairs:
            if sid not in idset:
                errors.append(f"journey step {n} names unknown screen '{sid}'")
            if role is not None:
                if role not in roleset:
                    errors.append(f"journey step {n}: screens names unknown role '{role}'")
                elif sid in idset and screen_role.get(sid) != role:
                    errors.append(f"journey step {n}: screen '{sid}' is listed under role '{role}' but has role '{screen_role.get(sid)}'")
        if "by" in j and j["by"] not in roleset:
            errors.append(f"journey step {n}: by names unknown role '{j['by']}'")
        for c in j.get("causes", []):
            r, sid = c.get("role"), c.get("screen")
            if r not in roleset:
                errors.append(f"journey step {n}: causes names unknown role '{r}'")
            if sid not in idset:
                errors.append(f"journey step {n}: causes names unknown screen '{sid}'")
            elif r in roleset and screen_role.get(sid) != r:
                errors.append(f"journey step {n}: causes screen '{sid}' does not have role '{r}'")
            elif isinstance(scr, dict) and scr.get(r) != sid:
                warnings.append(f"journey step {n}: causes screen '{sid}' is not the screen shown for role '{r}' at that moment")
    if errors:
        fail(errors)

    payload = dict(data)
    payload["drawings"] = drawings
    css = ddir / "_drawing.css"
    payload["drawingCss"] = css.read_text(encoding="utf-8") if css.is_file() else ""
    today = data.get("today") or {}
    payload["todayImage"] = ""
    if today.get("image"):
        img = (json_path.parent / today["image"])
        if not img.is_file():
            fail([f"today.image not found: {img}"])
        mime = mimetypes.guess_type(img.name)[0] or "application/octet-stream"
        payload["todayImage"] = f"data:{mime};base64," + base64.b64encode(img.read_bytes()).decode("ascii")

    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    blob = (blob.replace("</", "<\\/").replace("<!--", "\\u003c!--")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))
    tpl = template.read_text(encoding="utf-8")
    if tpl.count(PLACEHOLDER) != 1:
        print(f"error: template must contain {PLACEHOLDER} exactly once", file=sys.stderr)
        return 1
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(tpl.replace(PLACEHOLDER, blob), encoding="utf-8")
    for w in warnings:
        print("warning: " + w, file=sys.stderr)
    print(f"wrote {out} ({out.stat().st_size // 1024} KB, {len(ids)} screens)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

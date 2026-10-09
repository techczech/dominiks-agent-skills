"""Browser-level checks. Skipped unless PLAYWRIGHT_CORE (path to playwright-core) and
CHROME_HEADLESS_SHELL (path to a chrome-headless-shell binary) are set in the environment."""
import json
import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
import aa_fetch  # noqa: E402
import aa_key  # noqa: E402
import aa_widget as W  # noqa: E402

aa_key.CONFIG_PATH = "/nonexistent/config.local.json"
ICONS = os.path.join(HERE, "fixtures", "icons")
PW, CHROME = os.environ.get("PLAYWRIGHT_CORE"), os.environ.get("CHROME_HEADLESS_SHELL")


def probe(args, snap_name="language-sample.json"):
    with open(os.path.join(HERE, "fixtures", snap_name), encoding="utf-8") as f:
        snap = json.load(f)
    snap["_snapshot_date"] = "2026-10-09"
    out = os.path.join(tempfile.mkdtemp(), "w.html")
    with mock.patch.object(aa_fetch, "load_snapshot", return_value=snap), mock.patch("builtins.print"):
        assert W.main(args + ["--out", out]) == 0
    env = dict(os.environ)
    r = subprocess.run(["node", os.path.join(HERE, "render_probe.cjs"), out], env=env, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr[-400:]
    return out, json.loads(r.stdout)


@unittest.skipUnless(PW and CHROME, "set PLAYWRIGHT_CORE and CHROME_HEADLESS_SHELL to run browser tests")
class LabelAnchorTests(unittest.TestCase):
    def check(self, args):
        _, d = probe(args)
        self.assertEqual(d["errors"], [])
        pts = {p["model"]: p for p in d["points"]}
        self.assertTrue(d["labels"])
        for lab in d["labels"]:
            p = pts[lab["model"]]  # the label's own model's point
            self.assertAlmostEqual(lab["ax"], p["px"], places=3, msg=lab["model"])
            self.assertAlmostEqual(lab["ay"], p["py"], places=3, msg=lab["model"])
        for ld in d["leaders"]:  # every leader line starts at its own model's point
            p = pts[ld["model"]]
            self.assertAlmostEqual(ld["x1"], p["px"], places=3)
            self.assertAlmostEqual(ld["y1"], p["py"], places=3)
        boxes = [l["box"] for l in d["labels"]]
        for i, a in enumerate(boxes):
            for b in boxes[i + 1:]:
                self.assertFalse(a[0] < b[2] and a[2] > b[0] and a[1] < b[3] and a[3] > b[1], "labels overlap")
        return d

    def test_frontier_label_anchors(self):
        d = self.check(["frontier", "--label", "Example Alpha,Example Beta,Example Delta,Example Epsilon,Example Zeta",
                        "--icons-dir", ICONS])
        self.assertEqual(len(d["labels"]), 5)

    def test_frontier_default_labels_one_model(self):
        d = self.check(["frontier"])
        self.assertEqual(len(d["labels"]), 1)

    def test_scatter_label_anchors(self):
        self.check(["scatter", "--top", "8", "--icons-dir", ICONS])


if __name__ == "__main__":
    unittest.main()

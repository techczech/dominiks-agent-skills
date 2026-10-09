import json
import os
import re
import sys
import tempfile
import unittest
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
import aa_fetch  # noqa: E402
import aa_key  # noqa: E402
import aa_logos  # noqa: E402
import aa_lookup  # noqa: E402
import aa_widget as W  # noqa: E402

aa_key.CONFIG_PATH = "/nonexistent/config.local.json"  # tests never read a real install config
ICONS = os.path.join(HERE, "fixtures", "icons")  # synthetic svgl-format icons
FAKE_KEY = "FAKE-KEY-9f8e7d6c5b4a"


def fixture(name):
    with open(os.path.join(HERE, "fixtures", name), encoding="utf-8") as f:
        d = json.load(f)
    d["_snapshot_date"] = "2026-10-09"
    return d


LANG = fixture("language-sample.json")
IMG = fixture("text-to-image-sample.json")
M = ["intelligence", "blended_price"]


class SelectTests(unittest.TestCase):
    def sel(self, **kw):
        kw.setdefault("metrics", M)
        kw.setdefault("primary", "intelligence")
        return W.select(LANG["data"], "bar", **kw)

    def test_variants_best_collapses_and_keeps_best(self):
        rows, _ = self.sel(models=["Example Alpha"])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["v"]["intelligence"], 60.0)
        self.assertEqual(rows[0]["nvar"], 3)
        self.assertIn("Max", rows[0]["variant"])

    def test_variants_all(self):
        rows, _ = self.sel(models=["Example Alpha"], variants="all")
        self.assertEqual(len(rows), 3)

    def test_lower_is_better_picks_min(self):
        rows, _ = W.select(LANG["data"], "bar", ["e2e"], "e2e", models=["Example Eta 235B"])
        self.assertTrue(all(r["v"]["e2e"] is not None for r in rows))
        names = {r["name"] for r in rows}
        self.assertEqual(len(rows), len(names))

    def test_model_matching_case_insensitive_slug_and_base(self):
        rows, _ = self.sel(models=["EXAMPLE beta"])
        self.assertEqual([r["name"] for r in rows], ["Example Beta"])
        rows, _ = self.sel(models=["delta"])
        self.assertEqual(rows[0]["name"], "Example Delta")
        rows, _ = self.sel(models=["EXAMPLE-GAMMA"])  # slug match
        self.assertTrue(any(r["name"] == "Example Gamma" for r in rows))

    def test_unmatched_term_reported(self):
        _, skipped = self.sel(models=["nonexistent-model"])
        self.assertTrue(any("nonexistent-model" in s for s in skipped))

    def test_null_skipped_never_zero(self):
        rows, skipped = self.sel()
        names = {r["full"] for r in rows}
        self.assertNotIn("Example Pro (Xhigh)", names)
        self.assertTrue(any("Example Pro" in s for s in skipped))
        self.assertTrue(all(r["v"]["intelligence"] > 0 for r in rows))
        rows, skipped = self.sel(models=["Example Haiku"], primary="blended_price")
        self.assertEqual(rows, [])  # price is null: skipped, not plotted as 0

    def test_blended_price(self):
        rows, _ = self.sel(models=["Example Alpha"])
        raw = [r for r in LANG["data"] if r["name"] == rows[0]["full"]][0]["pricing"]
        want = (3 * raw["price_1m_input_tokens"] + raw["price_1m_output_tokens"]) / 4
        self.assertAlmostEqual(rows[0]["v"]["blended_price"], want)

    def test_creators_alias_and_latest(self):
        rows, _ = self.sel(creators=["xAI"])
        self.assertEqual([r["name"] for r in rows], ["Example Epsilon"])
        rows, _ = self.sel(models=["Example"], latest=True)
        self.assertEqual([r["name"] for r in rows], ["Example Zeta"])  # newest release among the matches

    def test_top(self):
        rows, _ = self.sel(top=3)
        self.assertEqual(len(rows), 3)
        vals = [r["v"]["intelligence"] for r in rows]
        self.assertEqual(vals, sorted(vals, reverse=True))

    def test_base_name(self):
        self.assertEqual(W.base_name("Claude Opus 5.5 (Max, Default Fallback)"), "Claude Opus 5.5")
        self.assertEqual(W.base_name("Qwen3 235B A22B 2507 Instruct"), "Qwen3 235B A22B 2507 Instruct")


class OutputTests(unittest.TestCase):
    def build(self, args, snap=LANG, env=None):
        d = tempfile.mkdtemp()
        out = os.path.join(d, "w.html")
        env = dict(os.environ)
        env["ARTIFICIAL_ANALYSIS_API_KEY"] = FAKE_KEY
        with mock.patch.dict(os.environ, env), mock.patch.object(aa_fetch, "load_snapshot", return_value=snap), \
                mock.patch("builtins.print") as pr:
            rc = W.main(args + ["--out", out])
        printed = "\n".join(" ".join(map(str, c.args)) for c in pr.call_args_list)
        self.assertEqual(rc, 0, printed)
        with open(out, encoding="utf-8") as f:
            return f.read(), printed

    def test_all_charts_have_footer_title_and_no_foreign_urls(self):
        for args in (["bar", "--models", "Example Alpha,Example Beta,Example Delta", "--title", "My <b>title</b>"],
                     ["scatter", "--top", "6"], ["frontier"], ["table", "--metrics", "intelligence,speed,blended_price"]):
            html, printed = self.build(args)
            self.assertIn("Data: <a href=\"https://artificialanalysis.ai\"", html)
            self.assertIn("Intelligence Index v4.3", html)
            self.assertIn("fetched ", html)
            self.assertIn("<title>", html)
            urls = re.findall(r"https?://[^\s\"'<>)]+", html)
            self.assertEqual(set(urls), {"https://artificialanalysis.ai"}, args)
            self.assertNotIn("eval(", html)
            self.assertNotIn("new Function", html)
            self.assertNotIn("localStorage", html)
            self.assertNotIn(FAKE_KEY, html)
            self.assertNotIn(FAKE_KEY, printed)
            self.assertIn("rows included", printed)

    def test_synthetic_footer_has_no_source_claim_or_link(self):
        html, _ = self.build(["bar", "--synthetic", "--models", "Example Alpha"])
        foot = html.split("<footer>")[1].split("</footer>")[0]
        self.assertIn("Synthetic example data \u2014 not real benchmark results", foot)
        self.assertNotIn("Artificial Analysis", foot)
        self.assertNotIn("<a ", foot)
        self.assertEqual(re.findall(r"https?://[^\s\"'<>)]+", html), [])

    def test_title_is_escaped(self):
        html, _ = self.build(["bar", "--title", "A <script>x</script>"])
        self.assertIn("<title>A &lt;script&gt;x&lt;/script&gt;</title>", html)

    def test_blended_note_present(self):
        html, _ = self.build(["scatter", "--top", "5"])
        self.assertIn("Blended price, 3:1 input:output, computed", html)

    def test_skipped_names_printed(self):
        _, printed = self.build(["bar", "--models", "Example Pro,Example Alpha"])
        self.assertIn("Example Pro (Xhigh)", printed)

    def test_media_bar_has_ci(self):
        html, _ = self.build(["bar", "--category", "text-to-image"], snap=IMG)
        self.assertIn('"ci":', html)
        self.assertNotIn("Intelligence Index v", html)  # media snapshot has no version

    def test_key_not_in_any_skill_file(self):
        for root, _, files in os.walk(os.path.dirname(HERE)):
            if ".git" in root or root.startswith(HERE):
                continue
            for fn in files:
                if fn.endswith((".py", ".html", ".md", ".json")):
                    with open(os.path.join(root, fn), encoding="utf-8", errors="ignore") as f:
                        self.assertNotIn(FAKE_KEY, f.read())


class LogoLabelNoteTests(unittest.TestCase):
    build = OutputTests.build

    def assertEqual(self, *a, **k):
        unittest.TestCase.assertEqual(self, *a, **k)

    def test_creator_to_logo_mapping(self):
        r = aa_logos.build(["Anthropic", "OpenAI", "SpaceXAI", "Alibaba", "Mystery Lab"], ICONS)
        self.assertEqual(set(r["map"]), {"Anthropic", "OpenAI", "SpaceXAI", "Alibaba"})
        self.assertEqual(r["map"]["Alibaba"]["id"], "lg-qwen")
        self.assertEqual(r["map"]["SpaceXAI"]["id"], "lg-xai")
        self.assertIn('id="lg-openai"', r["symbols"])
        self.assertNotIn("lg-meta", r["symbols"])  # only logos used are embedded
        self.assertIn(r["map"]["OpenAI"]["disc"], ("dark", "light"))
        self.assertEqual(aa_logos.CREATOR_ICON["mistral"], ("svgl", "mistral-ai"))

    def test_white_only_marks_recoloured_dark_mixed_marks_kept(self):
        r = aa_logos.build(["OpenAI", "Anthropic", "SpaceXAI", "Kimi", "Google"], ICONS)
        import re
        def sym(i):
            return re.search(r'<symbol id="%s".*?</symbol>' % i, r["symbols"], re.S).group(0)
        for i in ("lg-openai", "lg-anthropic", "lg-xai"):
            self.assertNotIn("#fff", sym(i).lower(), i)  # white-only: recoloured so it shows on the white tile
            self.assertIn("#111", sym(i))
        self.assertIn("#fff", sym("lg-kimi"))  # white detail inside a coloured mark stays
        self.assertNotIn("#ffff", r["symbols"])

    def test_no_icons_dir_means_shapes(self):
        r = aa_logos.build(["Anthropic"])
        self.assertEqual((r["map"], r["symbols"]), ({}, ""))
        self.assertIn("no icons_dir configured", r["note"])
        html, printed = self.build(["bar", "--models", "Example Alpha"])
        self.assertIn('"logos":{}', html)

    def test_symbols_are_inline_and_namespaced(self):
        r = aa_logos.build(["Google", "Meta", "Mistral"], ICONS)
        import re
        self.assertNotIn("http", r["symbols"])
        ids = re.findall(r'\bid="([^"]+)"', r["symbols"])
        self.assertEqual(len(ids), len(set(ids)))

    def test_fallback_when_icons_missing(self):
        r = aa_logos.build(["Anthropic"], icons_dir="/nonexistent/icons")
        self.assertEqual(r["map"], {})
        self.assertEqual(r["symbols"], "")
        self.assertIn("icon library not found", r["note"])
        html, printed = self.build(["bar", "--icons-dir", "/nonexistent/icons", "--models", "Example Alpha"])
        self.assertIn("icon library not found", printed)
        self.assertIn('"logos":{}', html)
        self.assertNotIn("<symbol id=", html)

    def test_widget_embeds_logos_without_external_urls(self):
        html, printed = self.build(["bar", "--models", "Example Alpha,Example Beta", "--icons-dir", ICONS])
        self.assertIn("<symbol id=", html)
        self.assertIn("logos: 2 of 2", printed)
        import re
        self.assertEqual(set(re.findall(r"https?://[^\s\"'<>)]+", html)), {"https://artificialanalysis.ai"})

    def test_label_option_lowercased_and_default_empty(self):
        html, _ = self.build(["frontier", "--label", "Example Alpha,Example Beta"])
        self.assertIn('"label":["example alpha","example beta"]', html)
        html, _ = self.build(["frontier"])
        self.assertIn('"label":[]', html)

    def test_data_note_for_mostly_empty_columns(self):
        html, _ = self.build(["table", "--models", "Example Alpha,Example Beta,Example Delta", "--metrics", "intelligence,coding,agentic"])
        self.assertIn("not yet measured by Artificial Analysis (newest models have no Coding/Agentic score", html)
        html, _ = self.build(["table", "--models", "Example Alpha,Example Beta,Example Delta,Example Epsilon", "--metrics", "intelligence,intelligence"])
        self.assertNotIn("not yet measured", html.split("<p id=\"datanote\">")[1].split("</p>")[0])

    def test_data_note_generic_wording(self):
        cfg = {"rows": [{"v": {"speed": None}}, {"v": {"speed": 5}}], "metrics": ["speed"],
               "metricDefs": {"speed": {"short": "Speed t/s"}}}
        self.assertIn("not measured by Artificial Analysis", W.data_note(cfg))
        self.assertIn("Speed t/s", W.data_note(cfg))
        cfg["rows"][0]["v"]["speed"] = 3
        self.assertEqual(W.data_note(cfg), "")


class LookupTests(unittest.TestCase):
    def test_found_groups_variants_with_rank(self):
        res = aa_lookup.lookup("example alpha", LANG)
        self.assertTrue(res["found"])
        self.assertEqual(len(res["models"]), 1)
        m = res["models"][0]
        self.assertEqual(len(m["variants"]), 3)
        top = max(m["variants"], key=lambda v: v["fields"]["intelligence"]["value"])
        self.assertEqual(top["fields"]["intelligence"]["rank"], 1)
        self.assertIn("probably", aa_lookup.render(res))
        self.assertTrue(m["page_guess"].startswith("https://artificialanalysis.ai/models/"))

    def test_normalised_matching(self):
        res = aa_lookup.lookup("example eta 235b", LANG)
        self.assertTrue(res["found"])
        self.assertTrue(any("235B" in m["base_name"] for m in res["models"]))
        self.assertTrue(aa_lookup.lookup("example beta", LANG)["found"])
        self.assertTrue(aa_lookup.lookup("EXAMPLE-BETA", LANG)["found"])

    def test_all_terms_must_match(self):
        self.assertFalse(aa_lookup.lookup("eta delta", LANG)["found"])

    def test_not_found_suggests(self):
        res = aa_lookup.lookup("Nonexistent Model 9", LANG)
        self.assertFalse(res["found"])
        self.assertEqual(len(res["suggestions"]), 5)
        text = aa_lookup.render(res)
        self.assertIn("No Artificial Analysis data for 'Nonexistent Model 9' in the 2026-10-09 snapshot", text)
        self.assertIn("does not benchmark every open model", text)

    def test_partial_data_reported(self):
        res = aa_lookup.lookup("example eta 235b a22b 2507", LANG)
        v = res["models"][0]["variants"][0]
        self.assertIn("coding", v["missing_key_fields"])
        self.assertNotIn("coding", v["fields"])
        self.assertIn("MISSING", aa_lookup.render(res))

    def test_json_serialisable(self):
        json.dumps(aa_lookup.lookup("epsilon", LANG))


if __name__ == "__main__":
    unittest.main()

import gzip
import io
import json
import os
import re
import sys
import tempfile
import unittest
import urllib.error
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
import aa_key  # noqa: E402
import aa_lookup  # noqa: E402
import aa_sources as S  # noqa: E402
import aa_widget as W  # noqa: E402
import open_sources_fetch as O  # noqa: E402


aa_key.CONFIG_PATH = "/nonexistent/config.local.json"  # tests never read a real install config
ICONS = os.path.join(HERE, "fixtures", "icons")  # synthetic svgl-format icons


def arow(name, org, lic, rating, rank, lo=None, hi=None):
    return {"model_name": name, "organization": org, "license": lic, "rating": rating,
            "rating_lower": rating - 5 if lo is None else lo, "rating_upper": rating + 5 if hi is None else hi,
            "vote_count": 1000.0, "rank": rank, "category": "overall", "leaderboard_publish_date": "2026-10-02"}


ARENA = {"fetched_at": "2026-10-09T01:00:00+00:00", "source": "x", "licence": "CC BY 4.0", "subset": "text_style_control",
         "publish_date": "2026-10-02", "top_rank": None, "_snapshot_date": "2026-10-09",
         "data": [arow("example-alpha-high", "google", "Proprietary", 1520.0, 1),
                  arow("example-beta-high", "anthropic", "Proprietary", 1500.0, 2),
                  arow("example-open-3-max", "zai", "MIT", 1470.5, 27),
                  arow("example-open-k2-max", "moonshot", "Example Community License", 1480.0, 16),
                  arow("example-open-v4.1-flash-max", "deepseek", "MIT", 1460.0, 38)]}


def orrow(d, p, rank, tokens, share):
    return {"date": d, "model_permaslug": p, "rank": rank, "total_tokens": tokens, "share_of_daily_tokens": share}


RANK = {"fetched_at": "2026-10-09T01:00:00+00:00", "source": "https://openrouter.ai", "dataset": "rankings-daily",
        "licence": "CC BY 4.0", "as_of": "2026-10-08", "_snapshot_date": "2026-10-09",
        "data": [orrow("2026-10-06", "openai/example-gamma-pro-20260903", 1, 600, 0.6),
                 orrow("2026-10-06", "z-ai/example-open-flash-20260826", 2, 300, 0.3),
                 orrow("2026-10-06", "other", None, 100, 0.1),
                 orrow("2026-10-07", "openai/example-gamma-pro-20260903", 1, 400, 0.4),
                 orrow("2026-10-07", "z-ai/example-open-flash-20260826:free", 2, 400, 0.4),
                 orrow("2026-10-07", "other", None, 200, 0.2)]}
BENCH = {"fetched_at": "2026-10-09T01:00:00+00:00", "source": "https://openrouter.ai", "dataset": "benchmark-leaderboard",
         "licence": "CC BY 4.0", "as_of": "2026-10-08", "_snapshot_date": "2026-10-09",
         "data": [{"benchmark": "gpqa_diamond", "model_permaslug": "google/example-delta-20260902", "model_slug": "google/example-delta",
                   "model_name": "Google: Example Delta", "provider_name": "auto-routing", "accuracy": 0.956,
                   "run_count": 1, "total_questions": 191, "avg_cost_per_task_usd": 0.068, "avg_duration_per_task_ms": 132000.0,
                   "avg_output_tokens_per_task": 18000.0},
                  {"benchmark": "gpqa_diamond", "model_permaslug": "google/example-delta-20260902", "model_slug": "google/example-delta",
                   "model_name": "Google: Example Delta", "provider_name": "other", "accuracy": 0.90, "run_count": 2,
                   "total_questions": 191, "avg_cost_per_task_usd": 0.05, "avg_duration_per_task_ms": 1000.0, "avg_output_tokens_per_task": 1.0},
                  {"benchmark": "tau_bench_verified_airline", "model_permaslug": "openai/example-x", "model_slug": "openai/example-x",
                   "model_name": "OpenAI: X", "accuracy": 0.5}]}


class ParserTests(unittest.TestCase):
    def test_arena_page_validation(self):
        rows, total = O.parse_arena_page({"rows": [{"row": {"model_name": "a"}}], "num_rows_total": 5})
        self.assertEqual((rows, total), ([{"model_name": "a"}], 5))
        for bad in ({"rows": "x", "num_rows_total": 1}, {"rows": [1], "num_rows_total": 1},
                    {"rows": [{"row": {}}], "num_rows_total": "5"}, [], {"rows": [{"nope": 1}], "num_rows_total": 1}):
            with self.assertRaises(O.FetchError, msg=str(bad)):
                O.parse_arena_page(bad)

    def test_or_envelope_validation(self):
        body = {"dataset": "rankings-daily", "snapshot_date": "2026-10-08", "license": {"name": "CC BY 4.0"},
                "columns": [{"name": "date"}], "rows": [{"a": 1}]}
        snap = O.parse_or_export(body, "rankings-daily")
        self.assertEqual((snap["as_of"], snap["licence"], snap["data"]), ("2026-10-08", "CC BY 4.0", [{"a": 1}]))
        self.assertIn("licensed under CC BY 4.0", snap["attribution"])
        for bad in ({"dataset": "other", "rows": []}, {"dataset": "rankings-daily", "rows": "x"},
                    {"dataset": "rankings-daily", "rows": [1]}, []):
            with self.assertRaises(O.FetchError):
                O.parse_or_export(bad, "rankings-daily")

    def test_arena_records_and_ci(self):
        recs = S.arena_records(ARENA)
        g = [r for r in recs if r["slug"] == "example-open-3-max"][0]
        self.assertEqual((g["name"], g["elo"], g["ci_95"], g["license"], g["model_creator"]["name"]), ("Example Open 3, Max", 1470.5, 5.0, "MIT", "Z AI"))
        self.assertIn("Licence: MIT", g["extra_lines"])
        self.assertIn("Raw id: example-open-3-max", g["extra_lines"])  # raw id kept for the tooltip
        agent = {"data": [{"model_name": "m", "organization": "openai", "score": 0.7, "score_ci_lower": 0.6,
                           "score_ci_upper": 0.8, "observation_count": 12}]}
        r = S.arena_records(agent)[0]
        self.assertEqual((r["elo"], r["ci_95"], r["votes"]), (0.7, 0.1, 12))

    def test_or_share_records(self):
        recs, other, dates = S.or_share_records(RANK)
        self.assertEqual(dates, ["2026-10-06", "2026-10-07"])
        a = [r for r in recs if r["slug"].startswith("openai")][0]
        self.assertEqual(a["name"], "Example Gamma Pro")  # prefix and date stripped, brand casing
        self.assertEqual(a["model_creator"]["name"], "OpenAI")
        self.assertAlmostEqual(a["share"], 100.0 * 1000 / 2000, places=2)  # 30-day, token-weighted
        self.assertEqual(a["share_latest"], 40.0)
        z = [r for r in recs if r["slug"].startswith("z-ai")]
        self.assertEqual(sorted(r["name"] for r in z), ["Example Open Flash", "Example Open Flash (free)"])
        self.assertEqual(other["series"], [["2026-10-06", 10.0], ["2026-10-07", 20.0]])

    def test_or_benchmark_records(self):
        recs = S.or_benchmark_records(BENCH, "gpqa_diamond")
        self.assertEqual(len(recs), 2)
        self.assertEqual(recs[0]["name"], "Example Delta")  # 'Google: ' prefix removed
        self.assertEqual(recs[0]["model_creator"]["name"], "Google")
        self.assertEqual(recs[0]["accuracy"], 95.6)
        self.assertEqual(recs[0]["duration"], 132.0)
        self.assertTrue(any("Cost per task" in e for e in recs[0]["extra_lines"]))
        self.assertEqual(S.benchmarks_in(BENCH), ["gpqa_diamond", "tau_bench_verified_airline"])


class FetchTests(unittest.TestCase):
    def test_redirect_refused_and_host_checked(self):
        with self.assertRaises(O.FetchError):
            O._NoRedirect().redirect_request(None, None, 302, "x", {}, "https://evil.example/")
        with mock.patch.object(O, "_open") as op:
            with self.assertRaises(O.FetchError):
                O._get_json("https://evil.example/x", O.OR_HOST, O.Budget(5))
            with self.assertRaises(O.FetchError):
                O._get_json("http://openrouter.ai/x", O.OR_HOST, O.Budget(5))
            op.assert_not_called()

    def test_budget_cap_and_retry_counting(self):
        def err(code):
            return urllib.error.HTTPError("https://datasets-server.huggingface.co/x", code, "e", {}, io.BytesIO(b""))
        b = O.Budget(10)
        calls = [err(500), err(500), err(500)]
        with mock.patch.object(O, "_open", side_effect=calls), mock.patch.object(O.time, "sleep"):
            with self.assertRaises(O.FetchError):
                O._get_json("https://datasets-server.huggingface.co/rows", O.HF_HOST, b)
        self.assertEqual(b.used, 3)  # every attempt counted
        b = O.Budget(1)
        b.take()
        with self.assertRaises(O.FetchError):
            b.take()

    def test_arena_pagination_by_offset_and_filter(self):
        urls = []
        pages = [{"rows": [{"row": {"model_name": "m%d" % i, "leaderboard_publish_date": "2026-10-02"}} for i in range(100)], "num_rows_total": 130},
                 {"rows": [{"row": {"model_name": "n%d" % i, "leaderboard_publish_date": "2026-10-02"}} for i in range(30)], "num_rows_total": 130}]
        def fake(url, host, budget):
            urls.append(url)
            budget.take()
            return pages.pop(0)
        b = O.Budget(10)
        with mock.patch.object(O, "_get_json", side_effect=fake):
            snap = O.fetch_arena("text_style_control", b, top=200)
        self.assertEqual((len(snap["data"]), b.used, snap["publish_date"], snap["licence"]), (130, 2, "2026-10-02", "CC BY 4.0"))
        self.assertIn("/filter?", urls[0])
        self.assertIn("offset=100", urls[1])
        self.assertIn("rank", urls[0])
        with self.assertRaises(O.FetchError):
            O.fetch_arena("not_a_subset", b)

    def test_snapshot_roundtrip_and_atomic(self):
        d = tempfile.mkdtemp()
        with mock.patch.object(O, "SNAP_DIR", d):
            p = O.snapshot_path("arena-text", "2026-10-09")
            O.write_snapshot(p, {"data": [1]})
            self.assertEqual(O.load_open_snapshot("arena-text")["data"], [1])
            with self.assertRaises(ValueError):
                O.write_snapshot(p, {"nodata": 1})
            self.assertEqual(O.load_open_snapshot("arena-text")["data"], [1])
            self.assertEqual(os.listdir(os.path.dirname(p)), ["arena-text.json.gz"])


class PrettyNameTests(unittest.TestCase):
    def test_examples(self):
        cases = {
            "deepseek-v4.1-flash-max": "DeepSeek V4.1 Flash, Max",
            "claude-opus-4-6-high": "Claude Opus 4.6, High",
            "openai/gpt-6-astra-pro-20260903": "GPT-6 Astra Pro",
            "z-ai/glm-5.3-flash": "GLM-5.3 Flash",
            "meta-llama/llama-3.3-70b-instruct": "Llama 3.3 70B Instruct",
            "gemini-4-argon-high": "Gemini 4 Argon, High",
            "claude-opus-4-6": "Claude Opus 4.6",
            "deepseek-v4-pro-high-20260813": "DeepSeek V4 Pro, High",
            "kimi-k3-max": "Kimi K3, Max",
            "qwen3-235b-a22b": "Qwen3 235B A22B",
            "z-ai/glm-5.3-flash-20260826:free": "GLM-5.3 Flash (free)",
            "claude-fable-5.1-xhigh": "Claude Fable 5.1, Xhigh",
        }
        for raw, want in cases.items():
            self.assertEqual(S.pretty_name(raw), want, raw)

    def test_lookup_matches_raw_or_pretty_and_shows_both(self):
        res = aa_lookup.lookup_arena("example-beta-high", ARENA)
        self.assertEqual((res["models"][0]["name"], res["models"][0]["raw_id"]), ("Example Beta, High", "example-beta-high"))
        self.assertIn("[example-beta-high]", aa_lookup.render_arena(res, "x"))


class NameTests(unittest.TestCase):
    def test_match_key(self):
        self.assertEqual(S.match_key("Claude-Opus 4.6_High"), "claudeopus46high")

    def test_models_term_matches_across_naming_styles(self):
        rows = [W.normalise(r, ["elo"]) for r in S.arena_records(ARENA)]
        hit = [r for r in rows if W.matches(r, "example beta")]
        self.assertEqual([(r["full"], r["slug"]) for r in hit], [("Example Beta, High", "example-beta-high")])
        self.assertTrue(W.matches(W.normalise(S.or_share_records(RANK)[0][0], ["share"]), "gamma pro"))
        self.assertTrue(any(W.matches(r, "Open V4.1") for r in rows))

    def test_org_prefix_gives_creator_and_logo(self):
        self.assertEqual(S.org_name("z-ai"), "Z AI")
        self.assertEqual(S.org_name("moonshotai"), "Kimi")
        self.assertEqual(S.org_name("x-ai"), "xAI")
        self.assertEqual(S.org_name("some-lab"), "Some Lab")
        import aa_logos
        self.assertEqual(set(aa_logos.build(["xAI", "Kimi", "Z AI"], ICONS)["map"]), {"xAI", "Kimi", "Z AI"})

    def test_open_licence(self):
        self.assertFalse(S.is_open_licence("Proprietary"))
        self.assertFalse(S.is_open_licence(None))
        self.assertTrue(S.is_open_licence("MIT"))
        self.assertTrue(S.is_open_licence("Kimi K3 license"))


class WidgetSourceTests(unittest.TestCase):
    def build(self, args):
        d = tempfile.mkdtemp()
        out = os.path.join(d, "w.html")
        snaps = {"arena-text_style_control": ARENA, "openrouter-rankings-daily": RANK, "openrouter-benchmark-leaderboard": BENCH}
        with mock.patch.object(W.osf, "load_open_snapshot", side_effect=lambda n, d=None: snaps[n]), \
                mock.patch("builtins.print") as pr:
            rc = W.main(args + ["--out", out])
        printed = "\n".join(" ".join(map(str, c.args)) for c in pr.call_args_list)
        self.assertEqual(rc, 0, printed)
        with open(out, encoding="utf-8") as f:
            return f.read(), printed

    def test_arena_bar_footer_and_urls(self):
        html, _ = self.build(["bar", "--source", "arena"])
        self.assertIn("Arena (lmarena-ai/leaderboard-dataset)", html)
        self.assertIn("licensed under CC BY 4.0", html)
        self.assertIn("leaderboard published 2 October 2026", html)
        self.assertNotIn("Artificial Analysis", html.split("<footer>")[1].split("</footer>")[0])
        self.assertEqual(set(re.findall(r"https?://[^\s\"'<>)]+", html)),
                         {"https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset"})
        self.assertIn('"ci":', html)

    def test_open_only_filters_by_licence_and_shows_it(self):
        html, _ = self.build(["bar", "--source", "arena", "--open-only"])
        cfg = json.loads(re.search(r"var CFG = (\{.*?\});\n", html, re.S).group(1))
        names = [r["name"] for r in cfg["rows"]]
        self.assertEqual(set(names), {"Example Open 3, Max", "Example Open K2, Max", "Example Open V4.1 Flash, Max"})
        self.assertTrue(all(any(e.startswith("Licence: ") for e in r["extra"]) for r in cfg["rows"]))

    def test_open_only_rejected_for_aa(self):
        with mock.patch("builtins.print") as pr, mock.patch.object(W.aa_fetch, "load_snapshot", return_value={"data": [], "fetched_at": "2026-10-09T00:00:00+00:00"}):
            rc = W.main(["bar", "--open-only", "--out", os.path.join(tempfile.mkdtemp(), "x.html")])
        self.assertEqual(rc, 2)

    def test_arena_table_has_licence_column(self):
        html, _ = self.build(["table", "--source", "arena", "--models", "open-3,beta"])
        cfg = json.loads(re.search(r"var CFG = (\{.*?\});\n", html, re.S).group(1))
        self.assertEqual(cfg["metrics"], ["elo", "votes", "license"])
        self.assertEqual({r["v"]["license"] for r in cfg["rows"]}, {"MIT", "Proprietary"})

    def test_openrouter_share_chart(self):
        html, _ = self.build(["share", "--source", "openrouter", "--top", "5"])
        self.assertIn("Source: <a href=\"https://openrouter.ai\"", html)
        self.assertIn("licensed under CC BY 4.0", html)
        self.assertIn("data as of 8 October 2026", html)
        cfg = json.loads(re.search(r"var CFG = (\{.*?\});\n", html, re.S).group(1))
        self.assertEqual(cfg["chart"], "share")
        self.assertEqual(len(cfg["rows"][0]["series"]), 2)
        self.assertEqual(cfg["other"]["name"], "All other models")
        self.assertEqual(set(re.findall(r"https?://[^\s\"'<>)]+", html)), {"https://openrouter.ai"})

    def test_openrouter_benchmark_bar(self):
        html, _ = self.build(["bar", "--source", "openrouter", "--benchmark", "gpqa_diamond"])
        cfg = json.loads(re.search(r"var CFG = (\{.*?\});\n", html, re.S).group(1))
        self.assertEqual(len(cfg["rows"]), 1)  # variants collapsed to the best accuracy
        self.assertEqual(cfg["rows"][0]["v"]["accuracy"], 95.6)
        self.assertTrue(any("Cost per task" in e for e in cfg["rows"][0]["extra"]))

    def test_unknown_benchmark_lists_available(self):
        d = os.path.join(tempfile.mkdtemp(), "x.html")
        with mock.patch.object(W.osf, "load_open_snapshot", return_value=BENCH), mock.patch("builtins.print") as pr:
            rc = W.main(["bar", "--source", "openrouter", "--benchmark", "nope", "--out", d])
        self.assertEqual(rc, 2)
        self.assertIn("gpqa_diamond", " ".join(str(c.args[0]) for c in pr.call_args_list))

    def test_share_and_frontier_misuse(self):
        d = os.path.join(tempfile.mkdtemp(), "x.html")
        with mock.patch.object(W.osf, "load_open_snapshot", return_value=ARENA), mock.patch("builtins.print"):
            self.assertEqual(W.main(["share", "--source", "arena", "--out", d]), 2)
            self.assertEqual(W.main(["frontier", "--source", "arena", "--out", d]), 2)


class LookupSourceTests(unittest.TestCase):
    def test_arena_lookup_reports_licence(self):
        res = aa_lookup.lookup_arena("example open 3", ARENA)
        self.assertTrue(res["found"])
        self.assertEqual((res["models"][0]["license"], res["models"][0]["open_licence"]), ("MIT", True))
        text = aa_lookup.render_arena(res, "example open 3")
        self.assertIn("LICENCE: MIT -> open licence", text)
        prop = aa_lookup.lookup_arena("example beta", ARENA)
        self.assertFalse(prop["models"][0]["open_licence"])

    def test_arena_lookup_not_found_suggests(self):
        res = aa_lookup.lookup_arena("nonexistent 70b", ARENA)
        self.assertFalse(res["found"])
        self.assertEqual(len(res["suggestions"]), 5)
        self.assertIn("No Arena data for 'nonexistent 70b'", aa_lookup.render_arena(res, "nonexistent 70b"))

    def test_openrouter_lookup(self):
        res = aa_lookup.lookup_openrouter("open flash", RANK, BENCH)
        self.assertTrue(res["found"])
        self.assertEqual(res["share"][0]["rank_30d"], 2)
        miss = aa_lookup.lookup_openrouter("zzz", RANK, BENCH)
        self.assertFalse(miss["found"])
        self.assertIn("No OpenRouter data", aa_lookup.render_openrouter(miss, "zzz"))


if __name__ == "__main__":
    unittest.main()

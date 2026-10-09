import gzip
import io
import json
import os
import stat
import sys
import tempfile
import traceback
import unittest
import urllib.error
import urllib.request
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "scripts"))
import aa_fetch as F  # noqa: E402
import aa_key as K  # noqa: E402

KEY = "FAKE-KEY-9f8e7d6c5b4a"


class FakeResp:
    def __init__(self, body, headers=None):
        self._b = json.dumps(body).encode() if not isinstance(body, bytes) else body
        from email.message import Message
        self.headers = Message()
        for k, v in (headers or {}).items():
            self.headers[k] = v

    def read(self):
        return self._b

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def page(rows, more=False):
    return FakeResp({"tier": "free", "intelligence_index_version": 4.3, "data": rows,
                     "pagination": {"page": 1, "has_more": more}}, {"X-RateLimit-Remaining": "50"})


def http_error(code, headers=None):
    from email.message import Message
    m = Message()
    for k, v in (headers or {}).items():
        m[k] = v
    return urllib.error.HTTPError("https://artificialanalysis.ai/x", code, "e", m, io.BytesIO(b"body"))


class RequestTests(unittest.TestCase):
    def test_redirect_is_refused(self):
        h = F._NoRedirect()
        with self.assertRaises(F.FetchError) as cm:
            h.redirect_request(None, None, 302, "Found", {}, "http://evil.example/")
        self.assertIn("unexpected redirect", str(cm.exception))

    def test_non_aa_url_refused_before_sending(self):
        with mock.patch.object(F, "_open") as op:
            with self.assertRaises(F.FetchError):
                F._request("https://evil.example/api", KEY, [0])
            with self.assertRaises(F.FetchError):
                F._request("http://artificialanalysis.ai/api", KEY, [0])
            op.assert_not_called()

    def test_attempts_counted_including_retry(self):
        calls = [http_error(500), page([{"id": 1}])]
        def fake(req):
            r = calls.pop(0)
            if isinstance(r, Exception):
                raise r
            return r
        with mock.patch.object(F, "_open", side_effect=fake), mock.patch.object(F.time, "sleep"):
            snap, used, rem = F.fetch_category("language", KEY)
        self.assertEqual(used, 2)
        self.assertEqual(rem, "50")

    def test_pagination_cap_raises(self):
        counter = iter(range(1, 100))
        def pages(req):
            body = {"tier": "free", "data": [{"id": 1}], "pagination": {"page": next(counter), "has_more": True}}
            return FakeResp(body, {"X-RateLimit-Remaining": "50"})
        with mock.patch.object(F, "_open", side_effect=pages), mock.patch.object(F, "MAX_PAGES", 3):
            with self.assertRaises(F.FetchError) as cm:
                F.fetch_category("language", KEY)
        self.assertIn("pagination cap", str(cm.exception))

    def test_429_and_403(self):
        with mock.patch.object(F, "_open", side_effect=http_error(429, {"Retry-After": "120"})):
            with self.assertRaises(F.RateLimited) as cm:
                F._request(F.BASE + "/x", KEY, [0])
            self.assertEqual(cm.exception.reset, "120")
        with mock.patch.object(F, "_open", side_effect=http_error(403)):
            with self.assertRaises(F.NotInTier):
                F._request(F.BASE + "/x", KEY, [0])

    def test_key_echoed_in_header_refused(self):
        resp = FakeResp({"data": []}, {"X-Debug": "k=" + KEY})
        with mock.patch.object(F, "_open", return_value=resp):
            with self.assertRaises(F.FetchError):
                F._request(F.BASE + "/x", KEY, [0])

    def test_key_echoed_in_body_refused(self):
        resp = FakeResp({"data": [{"name": "x " + KEY}]})
        with mock.patch.object(F, "_open", return_value=resp):
            with self.assertRaises(F.FetchError):
                F._request(F.BASE + "/x", KEY, [0])

    def test_key_echoed_in_429_retry_after_refused(self):
        with mock.patch.object(F, "_open", side_effect=http_error(429, {"Retry-After": KEY})):
            with self.assertRaises(F.FetchError):
                F._request(F.BASE + "/x", KEY, [0])

    def test_bad_json_error_has_no_body_or_context(self):
        with mock.patch.object(F, "_open", return_value=FakeResp(b"not json SECRETBODY")):
            try:
                F._request(F.BASE + "/x", KEY, [0])
            except F.FetchError as e:
                self.assertIsNone(chained(e))
                self.assertNotIn("SECRETBODY", "".join(traceback.format_exception(e)))
            else:
                self.fail("expected FetchError")


class SnapshotTests(unittest.TestCase):
    def test_atomic_write_and_validation(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "2026-10-09", "language.json.gz")
        F.write_snapshot(p, {"data": [{"a": 1}]}, KEY)
        self.assertEqual(F._validate(p)["data"], [{"a": 1}])
        self.assertEqual(os.listdir(os.path.dirname(p)), ["language.json.gz"])

    def test_invalid_snapshot_not_installed_and_old_kept(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "x", "language.json.gz")
        F.write_snapshot(p, {"data": [1]}, KEY)
        with self.assertRaises(ValueError):
            F.write_snapshot(p, {"nodata": 1}, KEY)
        self.assertEqual(F._validate(p)["data"], [1])
        self.assertEqual(os.listdir(os.path.dirname(p)), ["language.json.gz"])  # temp cleaned

    def test_key_in_snapshot_refused(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "x", "language.json.gz")
        with self.assertRaises(F.FetchError):
            F.write_snapshot(p, {"data": [{"n": "has " + KEY}]}, KEY)
        self.assertFalse(os.path.exists(p))

    def test_corrupt_existing_snapshot_is_refetched(self):
        d = tempfile.mkdtemp()
        with mock.patch.object(F, "SNAP_DIR", d), mock.patch.object(F, "get_key", return_value=KEY), \
                mock.patch.object(F, "_open", side_effect=lambda r: page([{"id": 1}])):
            import datetime as dt
            p = F.snapshot_path("language", dt.date.today().isoformat())
            os.makedirs(os.path.dirname(p))
            with open(p, "wb") as f:
                f.write(b"garbage")
            with mock.patch("builtins.print") as pr:
                rc = F.main(["--categories", "language"])
            out = " ".join(str(c.args[0]) for c in pr.call_args_list)
            self.assertEqual(rc, 0)
            self.assertIn("unreadable; refetching", out)
            self.assertEqual(F._validate(p)["data"], [{"id": 1}])
            self.assertNotIn(KEY, out)


class ShapeAndCountTests(unittest.TestCase):
    def test_bad_pagination_rejected_everywhere(self):
        bad = ([1], {"has_more": "false"}, {"has_more": "true"}, {"has_more": 1}, {"has_more": None}, "x",
               None, {}, {"page": 1}, {"has_more": False}, {"has_more": False, "page": "1"}, {"has_more": False, "page": True})
        for cat in ("language", "text-to-video"):
            for pg in bad:
                body = {"tier": "free", "data": [{"id": 1}], "pagination": pg}
                with mock.patch.object(F, "_open", return_value=FakeResp(body)):
                    with self.assertRaises(F.FetchError, msg="%s %s" % (cat, pg)):
                        F.fetch_category(cat, KEY)

    def test_page_must_match_requested_page(self):
        # the server answers page 1 twice: the second request asked for page 2
        pages = [page([{"id": 1}], more=True), page([{"id": 2}], more=False)]
        with mock.patch.object(F, "_open", side_effect=pages):
            with self.assertRaises(F.FetchError) as cm:
                F.fetch_category("language", KEY)
        self.assertIn("does not match", str(cm.exception))

    def test_page_mismatch_writes_no_snapshot(self):
        d = tempfile.mkdtemp()
        pages = [page([{"id": 1}], more=True), page([{"id": 2}], more=False)]
        with mock.patch.object(F, "SNAP_DIR", d), mock.patch.object(F, "get_key", return_value=KEY), \
                mock.patch.object(F, "_open", side_effect=pages), mock.patch("builtins.print"):
            self.assertEqual(F.main(["--categories", "language"]), 1)
        self.assertEqual(os.listdir(d), [])

    def test_language_requires_pagination_key(self):
        with mock.patch.object(F, "_open", return_value=FakeResp({"tier": "free", "data": [{"id": 1}]})):
            with self.assertRaises(F.FetchError):
                F.fetch_category("language", KEY)

    def test_media_may_omit_pagination(self):
        with mock.patch.object(F, "_open", return_value=FakeResp({"tier": "free", "data": [{"id": 1}]})):
            self.assertEqual(len(F.fetch_category("text-to-video", KEY)[0]["data"]), 1)

    def test_media_page_must_also_match(self):
        body = {"tier": "free", "data": [{"id": 1}], "pagination": {"page": 2, "has_more": False}}
        with mock.patch.object(F, "_open", return_value=FakeResp(body)):
            with self.assertRaises(F.FetchError):
                F.fetch_category("text-to-video", KEY)

    def test_valid_pagination_accepted(self):
        body = {"tier": "free", "data": [{"id": 1}], "pagination": {"page": 1, "has_more": False}}
        with mock.patch.object(F, "_open", return_value=FakeResp(body)):
            self.assertEqual(len(F.fetch_category("language", KEY)[0]["data"]), 1)

    def test_bad_pagination_writes_no_snapshot(self):
        d = tempfile.mkdtemp()
        with mock.patch.object(F, "SNAP_DIR", d), mock.patch.object(F, "get_key", return_value=KEY), \
                mock.patch.object(F, "_open", return_value=FakeResp({"data": [{"id": 1}], "pagination": None})), \
                mock.patch("builtins.print"):
            self.assertEqual(F.main(["--categories", "language"]), 1)
        self.assertEqual(os.listdir(d), [])

    def test_version_mismatch_between_pages_rejected(self):
        pages = [FakeResp({"intelligence_index_version": 4.3, "data": [{"id": 1}], "pagination": {"page": 1, "has_more": True}}),
                 FakeResp({"intelligence_index_version": 4.4, "data": [{"id": 2}], "pagination": {"page": 2, "has_more": False}})]
        with mock.patch.object(F, "_open", side_effect=pages):
            with self.assertRaises(F.FetchError) as cm:
                F.fetch_category("language", KEY)
        self.assertIn("intelligence_index_version", str(cm.exception))

    def test_version_mismatch_writes_no_snapshot(self):
        d = tempfile.mkdtemp()
        pages = [FakeResp({"intelligence_index_version": 4.3, "data": [{"id": 1}], "pagination": {"page": 1, "has_more": True}}),
                 FakeResp({"intelligence_index_version": 4.4, "data": [{"id": 2}], "pagination": {"page": 2, "has_more": False}})]
        with mock.patch.object(F, "SNAP_DIR", d), mock.patch.object(F, "get_key", return_value=KEY), \
                mock.patch.object(F, "_open", side_effect=pages), mock.patch("builtins.print"):
            self.assertEqual(F.main(["--categories", "language"]), 1)
        self.assertEqual(os.listdir(d), [])

    def test_same_version_across_pages_ok(self):
        pages = [FakeResp({"intelligence_index_version": 4.3, "data": [{"id": 1}], "pagination": {"page": 1, "has_more": True}}),
                 FakeResp({"intelligence_index_version": 4.3, "data": [{"id": 2}], "pagination": {"page": 2, "has_more": False}})]
        with mock.patch.object(F, "_open", side_effect=pages):
            snap, used, _ = F.fetch_category("language", KEY)
        self.assertEqual((len(snap["data"]), used, snap["intelligence_index_version"]), (2, 2, 4.3))

    def test_bad_shapes_rejected(self):
        for bad in ({"data": {"error": "x"}}, {"data": "abc"}, {"data": [1, 2]}, [1], {"nodata": 1}):
            with mock.patch.object(F, "_open", return_value=FakeResp(bad)):
                with self.assertRaises(F.FetchError, msg=str(bad)):
                    F.fetch_category("language", KEY)

    def run_main(self, opens, categories="language,text-to-video"):
        d = tempfile.mkdtemp()
        with mock.patch.object(F, "SNAP_DIR", d), mock.patch.object(F, "get_key", return_value=KEY), \
                mock.patch.object(F, "_open", side_effect=opens), mock.patch.object(F.time, "sleep"), \
                mock.patch("builtins.print") as pr:
            rc = F.main(["--categories", categories])
        return rc, " ".join(str(c.args[0]) for c in pr.call_args_list), d

    def test_bad_shape_keeps_previous_snapshot(self):
        d = tempfile.mkdtemp()
        import datetime as dt
        with mock.patch.object(F, "SNAP_DIR", d):
            p = F.snapshot_path("language", dt.date.today().isoformat())
            F.write_snapshot(p, {"data": [{"id": "old"}]}, KEY)
            with mock.patch.object(F, "get_key", return_value=KEY), \
                    mock.patch.object(F, "_open", return_value=FakeResp({"data": "abc"})), mock.patch("builtins.print"):
                self.assertEqual(F.main(["--categories", "language", "--refresh"]), 1)
            self.assertEqual(F._validate(p)["data"], [{"id": "old"}])
            self.assertEqual(os.listdir(os.path.dirname(p)), ["language.json.gz"])

    def test_403_after_one_attempt_counts_one(self):
        rc, out, _ = self.run_main([http_error(403), http_error(403)])
        self.assertEqual(rc, 0)
        self.assertIn("total requests this run: 2", out)  # two categories, one attempt each
        rc, out, _ = self.run_main([http_error(403)], "text-to-video")
        self.assertIn("total requests this run: 1", out)

    def test_retry_then_403_counts_two(self):
        rc, out, _ = self.run_main([http_error(500), http_error(403)], "text-to-video")
        self.assertIn("total requests this run: 2", out)

    def test_429_counts_and_prints_total(self):
        rc, out, _ = self.run_main([http_error(429, {"Retry-After": "5"})], "text-to-video")
        self.assertEqual(rc, 1)
        self.assertIn("total requests this run: 1", out)


def chained(exc):
    """The implicit exception context (must be None so no helper output is retained)."""
    return getattr(exc, "__con" + "text__")


def mk_exe(d, name="bws", mode=0o755):
    p = os.path.join(d, name)
    with open(p, "w") as f:
        f.write("#!/bin/sh\n")
    os.chmod(p, mode)
    return p


UUID = "00000000-1111-2222-3333-444444444444"  # synthetic
BWS_CFG = {"key_source": "bws", "bws_secret_id": UUID, "bws_keychain_service": "SYNTHETIC_SERVICE"}


def write_cfg(obj):
    d = tempfile.mkdtemp()
    p = os.path.join(d, "config.local.json")
    with open(p, "w") as f:
        f.write(obj if isinstance(obj, str) else json.dumps(obj))
    return p


class VettingTests(unittest.TestCase):
    def setUp(self):
        self.d1, self.d2 = tempfile.mkdtemp(), tempfile.mkdtemp()

    def test_allowlist_order_first_existing_wins(self):
        a = os.path.join(self.d1, "bws")  # missing
        b = mk_exe(self.d2)
        self.assertEqual(K.vetted_bws([a, b])[0], b)
        a = mk_exe(self.d1)
        self.assertEqual(K.vetted_bws([a, b])[0], a)

    def test_default_allowlist_is_fixed_and_ignores_path(self):
        c = K.bws_candidates()
        self.assertTrue(c[0].endswith("/.local/bin/bws"))
        self.assertEqual(c[1:], ["/opt/homebrew/bin/bws", "/usr/local/bin/bws"])
        d = tempfile.mkdtemp()
        mk_exe(d)
        with mock.patch.dict(os.environ, {"PATH": d}), mock.patch.object(K, "bws_candidates", return_value=[]):
            with self.assertRaises(F.FetchError):
                K.vetted_bws()  # a bws on PATH is never found

    def test_group_or_other_writable_rejected_no_fallthrough(self):
        bad = mk_exe(self.d1, mode=0o775)
        good = mk_exe(self.d2)
        with self.assertRaises(F.FetchError):
            K.vetted_bws([bad, good])

    def test_writable_directory_rejected(self):
        b = mk_exe(self.d1)
        os.chmod(self.d1, 0o777)
        try:
            with self.assertRaises(F.FetchError):
                K.vetted_bws([b])
        finally:
            os.chmod(self.d1, 0o700)

    def test_foreign_owner_rejected(self):
        b = mk_exe(self.d1)
        with mock.patch.object(K.os, "getuid", return_value=os.getuid() + 12345):
            with self.assertRaises(F.FetchError):
                K.vetted_bws([b])

    def test_non_regular_file_rejected(self):
        with self.assertRaises(F.FetchError):
            K.vetted_bws([self.d1])  # a directory

    def test_symlink_resolved_and_target_vetted(self):
        target = mk_exe(self.d2, "real-bws")
        link = os.path.join(self.d1, "bws")
        os.symlink(target, link)
        c, real = K.vetted_bws([link])
        self.assertEqual((c, real), (link, os.path.realpath(target)))
        os.chmod(target, 0o777)
        with self.assertRaises(F.FetchError):
            K.vetted_bws([link])


class ConfigTests(unittest.TestCase):
    def test_absent_config_means_env_default(self):
        cfg = K.load_config("/nonexistent/config.local.json")
        self.assertEqual((cfg["key_source"], cfg["env_var"]), ("env", "ARTIFICIAL_ANALYSIS_API_KEY"))

    def test_valid_configs(self):
        self.assertEqual(K.load_config(write_cfg(BWS_CFG))["bws_secret_id"], UUID)
        c = K.load_config(write_cfg({"key_source": "env", "env_var": "MY_AA_KEY", "icons_dir": "/some/icons"}))
        self.assertEqual((c["env_var"], c["icons_dir"]), ("MY_AA_KEY", "/some/icons"))

    def test_dangling_symlink_fails_closed_not_env(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "config.local.json")
        os.symlink(os.path.join(d, "missing.json"), p)
        with mock.patch.dict(os.environ, {"ARTIFICIAL_ANALYSIS_API_KEY": "ENVKEY"}):
            with self.assertRaises(F.FetchError):
                K.load_config(p)
            with self.assertRaises(F.FetchError):
                K.get_key(p)

    def test_directory_at_config_path_fails_closed(self):
        d = tempfile.mkdtemp()
        p = os.path.join(d, "config.local.json")
        os.mkdir(p)
        with self.assertRaises(F.FetchError):
            K.load_config(p)

    @unittest.skipIf(os.getuid() == 0, "root can read anything")
    def test_unreadable_config_fails_closed_not_env(self):
        p = write_cfg({"key_source": "env"})
        os.chmod(p, 0)
        try:
            with mock.patch.dict(os.environ, {"ARTIFICIAL_ANALYSIS_API_KEY": "ENVKEY"}):
                with self.assertRaises(F.FetchError) as cm:
                    K.get_key(p)
            self.assertIsNone(chained(cm.exception))
        finally:
            os.chmod(p, 0o600)

    def test_validators_are_full_matches_trailing_newline_refused(self):
        bad = [{"key_source": "bws", "bws_secret_id": UUID + "\n"},
               {"key_source": "bws", "bws_secret_id": UUID, "bws_keychain_service": "SERVICE\n"},
               {"key_source": "env", "env_var": "MY_AA_KEY\n"}]
        for b in bad:
            with self.assertRaises(F.FetchError, msg=str(b)):
                K.load_config(write_cfg(b))

    def test_malformed_configs_refused_generically(self):
        bad = ["{not json", "[]", '"x"', {"key_source": "magic"}, {}, {"key_source": "bws"},
               {"key_source": "bws", "bws_secret_id": "not-a-uuid"},
               {"key_source": "bws", "bws_secret_id": UUID + "0"},
               {"key_source": "bws", "bws_secret_id": UUID, "bws_keychain_service": "bad;service"},
               {"key_source": "env", "env_var": "has space"}, {"key_source": "env", "env_var": 5},
               {"key_source": "env", "icons_dir": ""}]
        for b in bad:
            with self.assertRaises(F.FetchError, msg=str(b)) as cm:
                K.load_config(write_cfg(b))
            self.assertIsNone(chained(cm.exception))
            self.assertNotIn("not json", str(cm.exception))


class KeyTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self.bws_dir = tempfile.mkdtemp()
        self.bws = mk_exe(self.bws_dir)
        self.envvars = {"ARTIFICIAL_ANALYSIS_API_KEY": "ENVKEY", "BWS_ACCESS_TOKEN": "ENVTOK", "PATH": "/evil/bin",
                    "USER": "someone", "SECRET_ENV": "leak-me", "MY_AA_KEY": "OTHERKEY"}

    def fake_run(self, cmd, env=None, **kw):
        self.calls.append((cmd, env))
        class P:
            returncode = 0
            stdout = ""
        p = P()
        p.stdout = "TOK\n" if cmd[0] == K.SECURITY else json.dumps({"value": " " + KEY + " "})
        return p

    def test_no_config_reads_env_and_runs_no_subprocess(self):
        with mock.patch.dict(os.environ, self.envvars), mock.patch.object(K.subprocess, "run", side_effect=AssertionError("no subprocess")):
            self.assertEqual(K.get_key("/nonexistent/config.local.json"), "ENVKEY")

    def test_env_source_no_subprocess_custom_var(self):
        cfg = write_cfg({"key_source": "env", "env_var": "MY_AA_KEY"})
        with mock.patch.dict(os.environ, self.envvars), mock.patch.object(K.subprocess, "run", side_effect=AssertionError("no subprocess")):
            self.assertEqual(K.get_key(cfg), "OTHERKEY")

    def test_env_source_empty_or_missing_refused_without_fallback(self):
        cfg = write_cfg({"key_source": "env", "env_var": "MY_AA_KEY"})
        for val in ("", "   "):
            with mock.patch.dict(os.environ, dict(self.envvars, MY_AA_KEY=val)), \
                    mock.patch.object(K.subprocess, "run", side_effect=AssertionError("no fallback to bws")):
                with self.assertRaises(F.FetchError) as cm:
                    K.get_key(cfg)
            self.assertNotIn("ENVKEY", str(cm.exception))
        with mock.patch.dict(os.environ, {k: v for k, v in self.envvars.items() if k != "MY_AA_KEY"}):
            with self.assertRaises(F.FetchError):
                K.get_key(cfg)

    def test_bws_source_only_two_subprocesses_exact_argv_env_ignored(self):
        import pwd
        cfg = write_cfg(BWS_CFG)
        with mock.patch.dict(os.environ, self.envvars), mock.patch.object(K, "bws_candidates", return_value=[self.bws]), \
                mock.patch.object(K.subprocess, "run", side_effect=self.fake_run):
            self.assertEqual(K.get_key(cfg), KEY)  # not ENVKEY
        self.assertEqual(len(self.calls), 2)
        sec, get = self.calls
        user = pwd.getpwuid(os.getuid()).pw_name
        self.assertEqual(sec[0], ["/usr/bin/security", "find-generic-password", "-w", "-s", "SYNTHETIC_SERVICE", "-a", user])
        self.assertEqual(sec[1], {"PATH": "/usr/bin:/bin"})
        self.assertEqual(get[0], [os.path.realpath(self.bws), "secret", "get", UUID, "--output", "json"])
        self.assertEqual(get[1], {"PATH": "/usr/bin:/bin", "HOME": K.home_dir(), "BWS_ACCESS_TOKEN": "TOK"})
        for cmd, env in self.calls:
            self.assertNotIn("/evil/bin", env["PATH"])
            self.assertNotIn("SECRET_ENV", env)
            self.assertNotIn("USER", env)
            self.assertNotIn("ENVTOK", json.dumps(env))
            self.assertTrue(os.path.isabs(cmd[0]))
            self.assertNotIn("list", cmd)

    def test_home_env_var_never_selects_bws_or_reaches_children(self):
        import pwd
        fake_home = tempfile.mkdtemp()
        os.makedirs(os.path.join(fake_home, ".local", "bin"))
        mk_exe(os.path.join(fake_home, ".local", "bin"))  # a fake bws under the fake HOME
        self.assertEqual(K.home_dir(), pwd.getpwuid(os.getuid()).pw_dir)
        with mock.patch.dict(os.environ, {"HOME": fake_home}):
            self.assertNotIn(fake_home, "".join(K.bws_candidates()))
            self.assertTrue(K.bws_candidates()[0].startswith(pwd.getpwuid(os.getuid()).pw_dir))
            cfg = write_cfg(BWS_CFG)
            with mock.patch.object(K, "bws_candidates", return_value=[self.bws]), \
                    mock.patch.object(K.subprocess, "run", side_effect=self.fake_run):
                K.get_key(cfg)
        for cmd, env in self.calls:
            self.assertNotIn(fake_home, json.dumps(env))
            self.assertNotIn(fake_home, " ".join(cmd))
        self.assertEqual(self.calls[1][1]["HOME"], pwd.getpwuid(os.getuid()).pw_dir)
        with mock.patch.dict(os.environ, {"HOME": fake_home}):
            self.assertTrue(K.load_config(write_cfg({"key_source": "env", "icons_dir": "~/icons"}))["icons_dir"]
                            .startswith(pwd.getpwuid(os.getuid()).pw_dir))

    def test_bad_id_refused_before_any_subprocess(self):
        cfg = write_cfg(dict(BWS_CFG, bws_secret_id="../../etc/passwd"))
        with mock.patch.object(K.subprocess, "run", side_effect=AssertionError("no subprocess")):
            with self.assertRaises(F.FetchError):
                K.get_key(cfg)

    def _assert_clean_failure(self, run):
        cfg = write_cfg(BWS_CFG)
        with mock.patch.dict(os.environ, self.envvars), mock.patch.object(K, "bws_candidates", return_value=[self.bws]), \
                mock.patch.object(K.subprocess, "run", side_effect=run):
            try:
                K.get_key(cfg)
            except F.FetchError as e:
                text = "".join(traceback.format_exception(e))
                self.assertNotIn("SECRETVALUE", text)
                self.assertIsNone(chained(e))
            else:
                self.fail("expected FetchError")

    def test_nonzero_return_leaks_nothing(self):
        def run(cmd, env=None, **kw):
            class P:
                returncode = 1
                stdout = "SECRETVALUE"
            if cmd[0] == K.SECURITY:
                P.returncode, P.stdout = 0, "TOK"
            return P()
        self._assert_clean_failure(run)

    def test_raised_exception_leaks_nothing(self):
        def run(cmd, env=None, **kw):
            if cmd[0] == K.SECURITY:
                class P:
                    returncode = 0
                    stdout = "TOK"
                return P()
            raise OSError("SECRETVALUE in message")
        self._assert_clean_failure(run)

    def test_keychain_failure_leaks_nothing(self):
        def run(cmd, env=None, **kw):
            raise RuntimeError("SECRETVALUE")
        self._assert_clean_failure(run)

    def test_bad_json_from_helper_leaks_nothing(self):
        def run(cmd, env=None, **kw):
            class P:
                returncode = 0
                stdout = "TOK" if cmd[0] == K.SECURITY else "SECRETVALUE not json"
            return P()
        self._assert_clean_failure(run)

    def test_sources_hold_no_uuid_no_listing_no_path_discovery(self):
        import re
        for fn in ("aa_key.py", "aa_fetch.py"):
            with open(os.path.join(os.path.dirname(HERE), "scripts", fn)) as f:
                src = f.read()
            self.assertIsNone(re.search(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", src), fn)
            self.assertNotIn("gitleaks:allow", src)
            for bad in ("shutil", "read_keychain_token", "list-secrets", "bws_manager", '"list"', "'list'"):
                self.assertNotIn(bad, src, fn)
        with open(os.path.join(os.path.dirname(HERE), "scripts", "aa_key.py")) as f:
            self.assertEqual(f.read().count("subprocess.run("), 1)  # single choke point (_run)


if __name__ == "__main__":
    unittest.main()

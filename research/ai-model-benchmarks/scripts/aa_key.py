"""Credential and per-install config for the Artificial Analysis API key. All credential code lives here.

get_key() -> str. ONE source per install, chosen by `config.local.json` in the skill root:
  {"key_source": "env", "env_var": "ARTIFICIAL_ANALYSIS_API_KEY"}                       (public default if no file)
  {"key_source": "bws", "bws_secret_id": "<uuid>", "bws_keychain_service": "<service>"}  (macOS Keychain + Bitwarden CLI)
If the file exists only the configured source is used; there is no fallback to another source.
The key is never printed, logged, written, or placed in an exception message.
Other optional config key: "icons_dir" (see aa_logos.py); read through load_config().
"""
import json
import os
import pwd
import re
import stat
import subprocess
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(SKILL_DIR, "config.local.json")
DEFAULT_ENV_VAR = "ARTIFICIAL_ANALYSIS_API_KEY"
DEFAULT_KEYCHAIN_SERVICE = "BWS_ACCESS_TOKEN"
SAFE_PATH = "/usr/bin:/bin"
SECURITY = "/usr/bin/security"
BWS_FIXED_CANDIDATES = ["/opt/homebrew/bin/bws", "/usr/local/bin/bws"]
_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")
_ENVNAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
_SERVICE = re.compile(r"^[A-Za-z0-9_.\- ]{1,128}$")


class FetchError(Exception):
    """Generic failure. Messages never carry response bodies, headers or secrets."""


def home_dir():
    """The account's home from the password database, never from the HOME environment variable."""
    return pwd.getpwuid(os.getuid()).pw_dir


def _expand(path):
    return os.path.join(home_dir(), path[2:]) if path.startswith("~/") else path


def parse_json(text, what):
    """json.loads with a generic error raised OUTSIDE the except block (no chained context)."""
    obj, ok = None, False
    try:
        obj = json.loads(text)
        ok = True
    except Exception:
        pass
    if not ok:
        raise FetchError("could not parse %s" % what)
    return obj


# ---------------------------------------------------------------- config
def load_config(path=None):
    """Validated config dict. Absent file -> the public default (env). Malformed -> FetchError."""
    path = path or CONFIG_PATH
    if not os.path.lexists(path):  # lexists: a dangling symlink counts as present and fails closed below
        return {"key_source": "env", "env_var": DEFAULT_ENV_VAR, "icons_dir": None}
    text, ok = "", False
    try:
        with open(path, encoding="utf-8") as f:
            text = f.read()
        ok = True
    except Exception:
        pass
    if not ok:
        raise FetchError("could not read config.local.json")
    raw = parse_json(text, "config.local.json")
    if not isinstance(raw, dict):
        raise FetchError("config.local.json must be a JSON object")
    src = raw.get("key_source")
    cfg = {"key_source": src, "icons_dir": None}
    if raw.get("icons_dir") is not None:
        if not isinstance(raw["icons_dir"], str) or not raw["icons_dir"]:
            raise FetchError("config.local.json: icons_dir must be a non-empty string")
        cfg["icons_dir"] = _expand(raw["icons_dir"])
    if src == "env":
        name = raw.get("env_var", DEFAULT_ENV_VAR)
        if not isinstance(name, str) or not _ENVNAME.fullmatch(name):
            raise FetchError("config.local.json: env_var is not a valid variable name")
        cfg["env_var"] = name
    elif src == "bws":
        sid = raw.get("bws_secret_id")
        if not isinstance(sid, str) or not _UUID.fullmatch(sid):
            raise FetchError("config.local.json: bws_secret_id is not a UUID")
        svc = raw.get("bws_keychain_service", DEFAULT_KEYCHAIN_SERVICE)
        if not isinstance(svc, str) or not _SERVICE.fullmatch(svc):
            raise FetchError("config.local.json: bws_keychain_service is not valid")
        cfg["bws_secret_id"], cfg["bws_keychain_service"] = sid, svc
    else:
        raise FetchError('config.local.json: key_source must be "env" or "bws"')
    return cfg


# ---------------------------------------------------------------- bws path (macOS Keychain + Bitwarden CLI)
def _check_node(path, want_regular):
    """Owned by us or root, not group/other writable (and a regular file when want_regular)."""
    st = os.stat(path)
    if want_regular and not stat.S_ISREG(st.st_mode):
        return False
    if st.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
        return False
    return st.st_uid in (0, os.getuid())


def bws_candidates():
    return [os.path.join(home_dir(), ".local/bin/bws")] + list(BWS_FIXED_CANDIDATES)


def vetted_bws(candidates=None):
    """First existing allowlisted bws, vetted. Never consults PATH.
    Returns (candidate_path, real_path). A first-existing candidate that fails vetting is an error
    (no silent fall-through to a lower-trust location)."""
    for c in (bws_candidates() if candidates is None else candidates):
        if not os.path.exists(c):
            continue
        ok = False
        try:
            real = os.path.realpath(c)
            ok = (_check_node(real, True) and _check_node(os.path.dirname(real), False)
                  and _check_node(os.path.dirname(c), False))
        except OSError:
            ok = False
        if not ok:
            raise FetchError("bws at an allowlisted location is not safely installed")
        return c, real
    raise FetchError("bws not found in the allowlisted locations")


def _run(cmd, env):
    """Run without shell, capture output, never raise with output attached. Returns (rc, stdout)."""
    rc, out, ok = None, "", False
    try:
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, check=False)
        rc, out, ok = p.returncode, p.stdout, True
        del p
    except Exception:
        pass
    if not ok:
        raise FetchError("could not run a helper command")
    return rc, out


def _access_token(service):
    user = pwd.getpwuid(os.getuid()).pw_name
    rc, out = _run([SECURITY, "find-generic-password", "-w", "-s", service, "-a", user], {"PATH": SAFE_PATH})
    tok = out.strip() if rc == 0 else ""
    del out
    if not tok:
        raise FetchError("no Bitwarden access token available")
    return tok


def _key_from_bws(cfg):
    tok = _access_token(cfg["bws_keychain_service"])
    _, real = vetted_bws()
    home = home_dir()
    # exact retrieval by id with the vetted absolute binary and a fixed PATH (no listing, no bulk reads)
    rc, out = _run([real, "secret", "get", cfg["bws_secret_id"], "--output", "json"],
                   {"PATH": SAFE_PATH, "HOME": home, "BWS_ACCESS_TOKEN": tok})
    if rc != 0:
        del out
        raise FetchError("could not read the secret")
    obj = parse_json(out, "secret")
    del out
    key = obj.get("value", "").strip() if isinstance(obj, dict) and isinstance(obj.get("value"), str) else ""
    del obj
    if not key:
        raise FetchError("secret is empty")
    return key


def _key_from_env(cfg):
    key = os.environ.get(cfg["env_var"], "").strip()
    if not key:
        raise FetchError("environment variable %s is not set or is empty" % cfg["env_var"])
    return key


def get_key(config_path=None):
    cfg = load_config(config_path)
    return _key_from_bws(cfg) if cfg["key_source"] == "bws" else _key_from_env(cfg)

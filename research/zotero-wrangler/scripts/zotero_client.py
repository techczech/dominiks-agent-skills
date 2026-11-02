"""Native local API transport. No redirect forwarding.

Remembered ("Always Allow") keys persist only in the OS credential store
(zotero_credentials); single-use keys never leave process memory.
"""
import json
import re
import secrets
import sys
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler
import zotero_credentials as credentials

DEFAULT_STORE = object()  # resolve the platform store lazily, on the first write


class APIError(RuntimeError):
    def __init__(self, status):
        self.status = status
        super().__init__(f'Zotero HTTP {status}; inspect state before retrying')


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_base(base):
    u = urlsplit(base)
    if (u.scheme != 'http' or u.hostname not in ('localhost', '127.0.0.1', '::1')
        or u.port != 23119 or u.username or u.password or u.query or u.fragment or u.path != '/api/'):
        raise ValueError('Require local HTTP Zotero on port 23119, path /api/')
    return base


def validate_library(library):
    if not re.fullmatch(r'(users/0|groups/[1-9][0-9]*)', library): raise ValueError('Use users/0 or an explicitly selected group library')
    return library


def _stderr(message):
    print('warning: ' + message, file=sys.stderr)


class LocalAPI:
    def __init__(self, base='http://127.0.0.1:23119/api/', app_name='Zotero Wrangler', store=DEFAULT_STORE, warn=None):
        self.base = validate_base(base); self.app_name = app_name
        self.opener = build_opener(ProxyHandler({}), NoRedirect())
        self.server = None; self.key = None; self.remember = False
        # Read-only use never touches the credential store.
        self._store_choice = store; self._store = None; self._store_ready = False
        self._stored = False; self._store_checked = False; self._warn = warn or _stderr; self._warned = False
        self._delete_pending = False  # a rejected stored key not yet removed; blocks all writes until it is
        _, h, _ = self.request('', api_version=False)
        self.server = h.get('Zotero-Server-ID')
        self.api_version = h.get('Zotero-API-Version')
        self.info = {k: h.get(k) for k in ('X-Zotero-Version', 'Zotero-API-Version', 'Zotero-Schema-Version', 'Zotero-Server-ID')}
        if self.api_version != '3': raise ValueError('Unsupported or undiscovered API version; no writes')

    def request(self, route, method='GET', data=None, headers=None, api_version=True, timeout=60):
        if route.startswith('/') or '://' in route or '..' in route: raise ValueError('Relative API routes only')
        h = {}
        if api_version: h['Zotero-API-Version'] = '3'
        if self.server: h['Zotero-Server-ID'] = self.server
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False).encode(); h['Content-Type'] = 'application/json'
        h.update(headers or {})
        try:
            with self.opener.open(Request(self.base + route, data=data, headers=h, method=method), timeout=timeout) as response:
                b = response.read(); rh = dict(response.headers)
                if self.server and rh.get('Zotero-Server-ID') != self.server: raise ValueError('Server ID changed or missing; discard cached state')
                result = json.loads(b) if b and 'json' in response.headers.get('Content-Type', '') else b
                return result, rh, response.status
        except HTTPError as e:
            e.close(); raise APIError(e.code) from None

    def get(self, route):
        return self.request(route)[0]

    def _credential_store(self):
        if not self._store_ready:
            self._store = credentials.default_store() if self._store_choice is DEFAULT_STORE else self._store_choice
            self._store_ready = True
        return self._store

    def _session_only(self, reason):
        if not self._warned:
            self._warned = True
            self._warn(reason + '; "Always Allow" approval is kept for this run only and Zotero will ask again next time')

    def _load_remembered(self):
        # Once per client, marked only after the store answers. Store errors stop
        # here, before any Zotero prompt, and recur on every write until it recovers.
        if self._store_checked: return
        store = self._credential_store()
        if store is None or not credentials.valid_scope(self.server, self.app_name):
            self._store_checked = True; return
        key = store.get(self.server, self.app_name)
        if key is not None and not credentials.valid_key(key):
            store.delete(self.server, self.app_name); key = None
        self._store_checked = True
        if key is not None: self.key = key; self.remember = True; self._stored = True

    def _save_remembered(self):
        store = self._credential_store()
        if store is None: self._session_only('No supported OS credential store on this platform'); return
        if not credentials.valid_scope(self.server, self.app_name): self._session_only('Server ID or app name unsuitable for credential storage'); return
        try: store.set(self.server, self.app_name, self.key)
        except credentials.CredentialStoreError as e: self._session_only(str(e)); return
        self._stored = True

    def _forget_rejected(self):
        self.key = None; self.remember = False
        if self._stored:
            self._stored = False; self._delete_pending = True
            self._remove_rejected()

    def _remove_rejected(self):
        self._credential_store().delete(self.server, self.app_name)
        self._delete_pending = False

    def authorize(self):
        if not self.server: raise ValueError('Older read-only local API; writes unavailable')
        response, _, _ = self.request('local/authorize', 'POST', {'appName': self.app_name}, timeout=60)
        key = response.get('key') if isinstance(response, dict) else None
        if not credentials.valid_key(key): raise ValueError('Zotero returned no usable authorisation; no writes')
        self.key = key; self.remember = response.get('remember') is True; self._stored = False
        if self.remember: self._save_remembered()

    def write(self, route, data, headers=None):
        if not self.server: raise ValueError('Read-only local API; writes unavailable')
        if self._delete_pending: self._remove_rejected()
        if not self.key: self._load_remembered()
        if not self.key: self.authorize()
        headers = dict(headers or {})
        if isinstance(data, list): headers.setdefault('Zotero-Write-Token', secrets.token_hex(16))
        for attempt in range(2):
            try:
                result = self.request(route, 'POST', data, {**headers, 'Zotero-API-Key': self.key})[0]
                if not self.remember: self.key = None
                return result
            except APIError as e:
                if e.status != 401:
                    # 403/429 and others: no prompt; a remembered key stays valid, a single-use key is spent.
                    if not self.remember: self.key = None
                    raise
                self._forget_rejected()
                if attempt: raise
                self.authorize()

    def upload(self, url, content, content_type):
        u = urlsplit(url); base = urlsplit(self.base)
        if u.scheme != base.scheme or u.hostname != base.hostname or u.port != base.port or u.username or u.password or u.query or u.fragment or not u.path.startswith('/api/local/uploads/'):
            raise ValueError('Upload must remain on the same local Zotero origin')
        route = u.path[len('/api/'):]
        # Upload key is in the URL. Never print it or send the local API key.
        _, _, status = self.request(route, 'POST', content, {'Content-Type': content_type})
        if status != 201: raise ValueError('Upload was not confirmed Created')

    def snapshot(self, library='users/0', all_items=False):
        validate_library(library)
        return {'server_id': self.server, 'api_version': self.api_version, 'library': library,
                'includes_children': all_items, 'client': self.info, 'collections': self.get(library + '/collections'),
                'items': self.get(library + ('/items' if all_items else '/items/top'))}

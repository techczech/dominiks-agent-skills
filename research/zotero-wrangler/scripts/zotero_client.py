"""Native local API transport. No credential persistence or redirect forwarding."""
import json
import re
import secrets
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler, ProxyHandler


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


class LocalAPI:
    def __init__(self, base='http://127.0.0.1:23119/api/', app_name='Zotero Wrangler'):
        self.base = validate_base(base); self.app_name = app_name
        self.opener = build_opener(ProxyHandler({}), NoRedirect())
        self.server = None; self.key = None; self.remember = False
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
        except HTTPError as e: raise APIError(e.code) from None

    def get(self, route):
        return self.request(route)[0]

    def authorize(self):
        if not self.server: raise ValueError('Older read-only local API; writes unavailable')
        response, _, _ = self.request('local/authorize', 'POST', {'appName': self.app_name}, timeout=60)
        self.key = response['key']; self.remember = bool(response.get('remember'))

    def write(self, route, data, headers=None):
        if not self.server: raise ValueError('Read-only local API; writes unavailable')
        if not self.key: self.authorize()
        headers = dict(headers or {})
        if isinstance(data, list): headers.setdefault('Zotero-Write-Token', secrets.token_hex(16))
        for attempt in range(2):
            try:
                result = self.request(route, 'POST', data, {**(headers or {}), 'Zotero-API-Key': self.key})[0]
                if not self.remember: self.key = None
                return result
            except APIError as e:
                self.key = None
                if e.status != 401 or attempt: raise
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

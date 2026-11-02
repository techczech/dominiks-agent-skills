"""Synthetic server on an ephemeral port. Never bind or connect to Zotero's port."""
import json
import secrets
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import zotero_client as client
import zotero_credentials as credentials
import zotero_execute as execute
import zotero_retrieve as retrieve


class SyntheticHandler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def respond(self, code, value=None, **headers):
        self.send_response(code)
        self.send_header('Zotero-API-Version', '3')
        self.send_header('Zotero-Server-ID', self.server.server_id)
        self.send_header('Content-Type', 'application/json')
        for key, value_header in headers.items(): self.send_header(key, value_header)
        self.end_headers()
        if value is not None: self.wfile.write(json.dumps(value).encode())

    def do_GET(self):
        if self.path == '/api/redirect':
            self.respond(302, Location=f'http://127.0.0.1:{self.server.server_port}/api/sink')
        elif self.path == '/api/sink':
            self.server.sink_calls += 1; self.respond(200, {})
        else: self.respond(200, {})

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if self.path == '/api/local/authorize':
            self.server.authorizations += 1
            if self.server.deny: self.respond(403, {'denied': True}); return
            if self.server.authorize_status: self.respond(self.server.authorize_status); return
            self.server.current = secrets.token_hex(16)
            self.respond(200, {'key': self.server.current, 'remember': self.server.remember}); return
        if self.server.reject_all or self.headers.get('Zotero-API-Key') != self.server.current:
            self.respond(401); return
        if self.server.write_status: self.respond(self.server.write_status); return
        if self.server.reject_once:
            self.server.reject_once = False; self.server.current = None
            self.respond(401); return
        if self.headers.get('Zotero-Server-ID') != self.server.server_id:
            self.respond(412); return
        json.loads(body)
        self.server.writes += 1
        if not self.server.remember: self.server.current = None
        self.respond(200, {'successful': {}, 'failed': {}})


class GuardStore:
    """Fails any test that reaches the real OS credential store by default."""
    def __getattr__(self, name): raise AssertionError('test reached the default OS credential store')


_default_store_patch = patch.object(credentials, 'default_store', side_effect=lambda: GuardStore())


def setUpModule(): _default_store_patch.start()
def tearDownModule(): _default_store_patch.stop()


class FakeStore:
    """In-memory stand-in for the OS store; shared between clients it models a later process."""
    def __init__(self, fail=None):
        self.items = {}; self.calls = []; self.fail = fail or {}

    def _call(self, name, *args):
        self.calls.append((name,) + args[:2])
        if name in self.fail: raise credentials.CredentialStoreError(self.fail[name])

    def get(self, server, app):
        self._call('get', server, app); return self.items.get((server, app))

    def set(self, server, app, key):
        self._call('set', server, app); self.items[(server, app)] = key

    def delete(self, server, app):
        self._call('delete', server, app); self.items.pop((server, app), None)


class SyntheticServerCase(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), SyntheticHandler)
        self.server.authorizations = self.server.writes = self.server.sink_calls = 0
        self.server.current = None; self.server.remember = False; self.server.deny = False; self.server.reject_once = False
        self.server.reject_all = False; self.server.write_status = None; self.server.authorize_status = None
        self.server.server_id = 'fictional-http-server'
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={'poll_interval': 0.05}, daemon=True); self.thread.start()
        self.store = FakeStore(); self.warnings = []
        self.api = self.client()

    def client(self, store=None, app_name='Zotero Wrangler', **kw):
        # Only tests adapt strict port selection to a synthetic, ephemeral local server.
        with patch.object(client, 'validate_base', side_effect=lambda base: base):
            return client.LocalAPI(f'http://127.0.0.1:{self.server.server_port}/api/', app_name=app_name,
                                   store=self.store if store is None else store, warn=self.warnings.append, **kw)

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()

    def assertSecretFree(self, *texts):
        secrets_seen = [v for v in self.store.items.values()] + [self.server.current or 'no-current-key']
        for text in list(texts) + self.warnings:
            for secret in secrets_seen: self.assertNotIn(secret, str(text))


class TransportTests(SyntheticServerCase):

    def test_single_use_authorizes_for_each_write(self):
        self.api.write('users/0/items', [])
        self.assertIsNone(self.api.key)
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)
        self.assertEqual(self.server.writes, 2)

    def test_remembered_key_reused_with_bounded_401(self):
        self.server.remember = True
        self.api.write('users/0/items', [])
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1)
        self.server.reject_once = True
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)
        self.assertEqual(self.server.writes, 3)

    def test_denial_never_writes_or_loops(self):
        self.server.deny = True
        with self.assertRaises(client.APIError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1)
        self.assertEqual(self.server.writes, 0)

    def test_local_redirect_not_followed(self):
        with self.assertRaises(client.APIError): self.api.get('redirect')
        self.assertEqual(self.server.sink_calls, 0)

    def test_upload_different_origin_rejected(self):
        with self.assertRaises(ValueError): self.api.upload('https://example.org/api/local/uploads/fictional', b'pdf', 'application/pdf')
        with self.assertRaises(ValueError): self.api.upload('http://127.0.0.1:23119/api/local/uploads/fictional', b'pdf', 'application/pdf')


class RememberedApprovalTests(SyntheticServerCase):
    def test_remembered_key_reused_by_separate_client(self):
        self.server.remember = True
        self.api.write('users/0/items', [])
        later = self.client()  # a later process reading the same OS store
        later.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1)
        self.assertEqual(self.server.writes, 2)
        self.assertEqual([c[0] for c in self.store.calls], ['get', 'set', 'get'])

    def test_read_only_discovery_never_touches_store(self):
        with patch.object(credentials, 'default_store') as factory:
            api = self.client(store=client.DEFAULT_STORE)
            api.get('users/0/items'); api.snapshot('users/0')
            factory.assert_not_called()
        self.assertEqual(self.store.calls, [])

    def test_default_store_resolved_lazily_once_for_writes(self):
        self.server.remember = True
        with patch.object(credentials, 'default_store', return_value=self.store) as factory:
            api = self.client(store=client.DEFAULT_STORE)
            factory.assert_not_called()
            api.write('users/0/items', []); api.write('users/0/items', [])
            factory.assert_called_once_with()
        self.assertEqual(self.server.authorizations, 1)

    def test_store_scoped_by_server_id(self):
        self.server.remember = True
        self.api.write('users/0/items', [])
        self.server.server_id = 'fictional-other-profile'
        other = self.client(); other.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)
        self.assertEqual(sorted(k[0] for k in self.store.items), ['fictional-http-server', 'fictional-other-profile'])

    def test_store_scoped_by_app_identity(self):
        self.server.remember = True
        self.api.write('users/0/items', [])
        other = self.client(app_name='Fictional Other App'); other.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)
        self.assertEqual(sorted(k[1] for k in self.store.items), ['Fictional Other App', 'Zotero Wrangler'])

    def test_stale_stored_key_removed_then_single_reauthorisation(self):
        self.server.remember = True
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'fictionalstalekey'
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1); self.assertEqual(self.server.writes, 1)
        self.assertEqual([c[0] for c in self.store.calls], ['get', 'delete', 'set'])
        self.assertEqual(self.store.items[('fictional-http-server', 'Zotero Wrangler')], self.server.current)

    def test_stale_refresh_failure_is_bounded(self):
        self.server.remember = True; self.server.reject_all = True
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'fictionalstalekey'
        with self.assertRaises(client.APIError) as caught: self.api.write('users/0/items', [])
        self.assertEqual(caught.exception.status, 401)
        self.assertEqual(self.server.authorizations, 1); self.assertEqual(self.server.writes, 0)
        self.assertEqual(self.store.items, {})  # the rejected fresh key is not left behind either
        self.assertSecretFree(caught.exception)

    def test_unremembered_401_reauthorises_once(self):
        self.server.reject_all = True
        with self.assertRaises(client.APIError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)

    def test_forbidden_or_rate_limited_write_keeps_key_without_prompt(self):
        self.server.remember = True
        self.api.write('users/0/items', [])
        for status in (403, 429):
            self.server.write_status = status
            with self.assertRaises(client.APIError) as caught: self.api.write('users/0/items', [])
            self.assertEqual(caught.exception.status, status)
        self.assertEqual(self.server.authorizations, 1)
        self.assertNotIn('delete', [c[0] for c in self.store.calls])

    def test_rate_limited_authorisation_does_not_loop(self):
        self.server.authorize_status = 429
        with self.assertRaises(client.APIError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1)
        self.assertEqual([c[0] for c in self.store.calls], ['get'])

    def test_denial_saves_nothing(self):
        self.server.deny = True
        with self.assertRaises(client.APIError): self.api.write('users/0/items', [])
        self.assertEqual(self.store.items, {})
        self.assertNotIn('set', [c[0] for c in self.store.calls])

    def test_single_use_never_saved(self):
        self.api.write('users/0/items', []); self.api.write('users/0/items', [])
        self.assertEqual(self.store.items, {})
        self.assertNotIn('set', [c[0] for c in self.store.calls])
        self.assertEqual(self.server.authorizations, 2)

    def test_store_read_failure_stops_before_prompt(self):
        self.store.fail['get'] = 'macOS Keychain read failed (OSStatus -25293)'
        with self.assertRaises(credentials.CredentialStoreError) as caught: self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0); self.assertEqual(self.server.writes, 0)
        self.assertIn('OSStatus -25293', str(caught.exception))

    def test_store_save_failure_warns_and_keeps_key_for_this_run(self):
        self.server.remember = True; self.store.fail['set'] = 'macOS Keychain write failed (OSStatus -25308)'
        self.api.write('users/0/items', []); self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1); self.assertEqual(self.server.writes, 2)
        self.assertEqual(len(self.warnings), 1); self.assertIn('this run', self.warnings[0])
        self.assertSecretFree()

    def test_stale_delete_failure_stops_without_prompt(self):
        self.server.remember = True; self.store.fail['delete'] = 'Windows Credential Manager delete failed (error 5)'
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'fictionalstalekey'
        with self.assertRaises(credentials.CredentialStoreError) as caught: self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0)
        self.assertNotIn('fictionalstalekey', str(caught.exception))

    def test_unsupported_platform_keeps_session_semantics_with_warning(self):
        self.server.remember = True
        with patch.object(credentials, 'default_store', return_value=None):
            api = self.client(store=client.DEFAULT_STORE)
            api.write('users/0/items', []); api.write('users/0/items', [])
            later = self.client(store=client.DEFAULT_STORE); later.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 2)
        self.assertEqual(len(self.warnings), 2)
        self.assertTrue(all('this run' in w for w in self.warnings))

    def test_malformed_stored_value_discarded(self):
        self.server.remember = True
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'bad key\r\nInjected: header'
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1)
        self.assertEqual(self.store.items[('fictional-http-server', 'Zotero Wrangler')], self.server.current)

    def test_read_failure_stays_fatal_for_later_writes_until_store_recovers(self):
        self.server.remember = True; self.server.current = 'fictionalvalidkey123'
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'fictionalvalidkey123'
        self.store.fail['get'] = 'macOS Keychain read failed (OSStatus -25293)'
        for _ in range(2):
            with self.assertRaises(credentials.CredentialStoreError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0); self.assertEqual(self.server.writes, 0)
        del self.store.fail['get']
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0); self.assertEqual(self.server.writes, 1)

    def test_delete_failure_stays_fatal_for_later_writes_until_removed(self):
        self.server.remember = True; self.store.fail['delete'] = 'Windows Credential Manager delete failed (error 5)'
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'fictionalstalekey'
        for _ in range(2):
            with self.assertRaises(credentials.CredentialStoreError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0); self.assertEqual(self.server.writes, 0)
        self.assertEqual(self.store.items[('fictional-http-server', 'Zotero Wrangler')], 'fictionalstalekey')
        del self.store.fail['delete']
        self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 1); self.assertEqual(self.server.writes, 1)
        self.assertEqual(self.store.items[('fictional-http-server', 'Zotero Wrangler')], self.server.current)

    def test_malformed_item_delete_failure_stays_fatal(self):
        self.server.remember = True; self.store.fail['delete'] = 'macOS Keychain delete failed (OSStatus -25293)'
        self.store.items[('fictional-http-server', 'Zotero Wrangler')] = 'bad key'
        for _ in range(2):
            with self.assertRaises(credentials.CredentialStoreError): self.api.write('users/0/items', [])
        self.assertEqual(self.server.authorizations, 0); self.assertEqual(self.server.writes, 0)


class AttachmentAPI:
    def __init__(self):
        self.server = 'fictional-server'
        self.objects = {'PARENTAA': {'key': 'PARENTAA', 'itemType': 'journalArticle', 'version': 1}}
        self.creates = 0; self.uploads = 0; self.md5 = None
        self.interrupt_create = False; self.interrupt_register = False

    def get(self, route):
        if route.endswith('/children'):
            return [{'key': k, 'data': d} for k, d in self.objects.items() if d.get('parentItem') == 'PARENTAA']
        key = route.rsplit('/', 1)[-1]
        if key not in self.objects: raise client.APIError(404)
        return {'key': key, 'data': dict(self.objects[key])}

    def write(self, route, data, **kw):
        from urllib.parse import parse_qs
        if isinstance(data, list):
            self.creates += 1
            self.objects[data[0]['key']] = {**data[0], 'version': 1}
            if self.interrupt_create:
                self.interrupt_create = False; raise TimeoutError()
            return {'successful': {'0': {'key': data[0]['key']}}}
        fields = parse_qs(data.decode()); key = route.split('/')[-2]
        if 'md5' in fields:
            self.md5 = fields['md5'][0]
            return {'url': 'fictional-local-upload', 'uploadKey': 'fictional-upload', 'contentType': 'application/pdf'}
        self.objects[key]['md5'] = self.md5
        if self.interrupt_register:
            self.interrupt_register = False; raise TimeoutError()
        return b''

    def upload(self, url, content, content_type):
        self.uploads += 1
        assert retrieve.pdf_hashes(content)['md5'] == self.md5


class AttachmentTests(unittest.TestCase):
    def test_creation_interrupted_reuses_preallocated_key(self):
        api = AttachmentAPI(); api.interrupt_create = True
        with tempfile.TemporaryDirectory() as td:
            pdf = Path(td) / 'fictional.pdf'; pdf.write_bytes(b'%PDF-1.4\nfictional')
            r = Path(td) / 'receipt.json'
            with self.assertRaises(TimeoutError): execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)
            result = execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)
            self.assertTrue(result['complete']); self.assertEqual(api.creates, 1); self.assertEqual(api.uploads, 1)
            self.assertNotIn('uploadKey', r.read_text())

    def test_registration_interrupted_uses_hash_readback(self):
        api = AttachmentAPI(); api.interrupt_register = True
        with tempfile.TemporaryDirectory() as td:
            pdf = Path(td) / 'fictional.pdf'; pdf.write_bytes(b'%PDF-1.4\nfictional')
            r = Path(td) / 'receipt.json'
            with self.assertRaises(TimeoutError): execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)
            execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)
            self.assertEqual(api.uploads, 1); self.assertEqual(api.creates, 1)

    def test_attachment_file_changed_stops(self):
        api = AttachmentAPI()
        with tempfile.TemporaryDirectory() as td:
            pdf = Path(td) / 'fictional.pdf'; pdf.write_bytes(b'%PDF-1.4\nfictional'); r = Path(td) / 'receipt.json'
            execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)
            pdf.write_bytes(b'%PDF-1.4\nchanged')
            with self.assertRaises(ValueError): execute.attach(api, 'users/0', 'PARENTAA', pdf, 'https://example.org/fictional.pdf', r)


if __name__ == '__main__': unittest.main()

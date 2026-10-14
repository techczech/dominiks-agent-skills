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
import zotero_execute as execute
import zotero_retrieve as retrieve


class SyntheticHandler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass

    def respond(self, code, value=None, **headers):
        self.send_response(code)
        self.send_header('Zotero-API-Version', '3')
        self.send_header('Zotero-Server-ID', 'fictional-http-server')
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
            self.server.current = secrets.token_hex(16)
            self.respond(200, {'key': self.server.current, 'remember': self.server.remember}); return
        if self.headers.get('Zotero-API-Key') != self.server.current:
            self.respond(401); return
        if self.server.reject_once:
            self.server.reject_once = False; self.server.current = None
            self.respond(401); return
        if self.headers.get('Zotero-Server-ID') != 'fictional-http-server':
            self.respond(412); return
        json.loads(body)
        self.server.writes += 1
        if not self.server.remember: self.server.current = None
        self.respond(200, {'successful': {}, 'failed': {}})


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), SyntheticHandler)
        self.server.authorizations = self.server.writes = self.server.sink_calls = 0
        self.server.current = None; self.server.remember = False; self.server.deny = False; self.server.reject_once = False
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True); self.thread.start()
        # Only tests adapt strict port selection to a synthetic, ephemeral local server.
        with patch.object(client, 'validate_base', side_effect=lambda base: base):
            self.api = client.LocalAPI(f'http://127.0.0.1:{self.server.server_port}/api/')

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()

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

"""OS credential stores with native calls mocked. The default suite never touches a real store.

The optional macOS smoke test writes one synthetic random item under a test-only
service name, reads it from a separate interpreter and deletes it in `finally`.
It runs only with ZOTERO_WRANGLER_KEYCHAIN_SMOKE=1 on macOS and never contacts Zotero.
"""
import ctypes
import hashlib
import os
import secrets
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
import zotero_credentials as credentials

SECRET = 'fictionalsecret' + 'f00d' * 4


class ScopeTests(unittest.TestCase):
    def test_default_store_by_platform(self):
        with patch.object(sys, 'platform', 'darwin'):
            self.assertIsInstance(credentials.default_store(), credentials.MacKeychainStore)
        with patch.object(sys, 'platform', 'win32'):
            self.assertIsInstance(credentials.default_store(), credentials.WindowsCredentialStore)
        with patch.object(sys, 'platform', 'linux'):
            self.assertIsNone(credentials.default_store())

    def test_constructing_stores_loads_no_native_library(self):
        with patch.object(ctypes, 'CDLL', side_effect=AssertionError('loaded')):
            credentials.MacKeychainStore(); credentials.WindowsCredentialStore()

    def test_scope_validation(self):
        self.assertTrue(credentials.valid_scope('fictional-http-server', 'Zotero Wrangler'))
        for server, app in (('', 'App'), ('a/b', 'App'), ('x' * 200, 'App'), ('server', ''), ('server', 'bad\napp'), (None, 'App')):
            self.assertFalse(credentials.valid_scope(server, app))

    def test_key_validation_blocks_header_injection(self):
        self.assertTrue(credentials.valid_key('abcDEF123'))
        for key in ('', 'has space', 'a\r\nInjected: x', None, 'x' * 600, 'ключ'):
            self.assertFalse(credentials.valid_key(key))

    def test_invalid_scope_refused_by_store(self):
        with self.assertRaises(credentials.CredentialStoreError):
            credentials.MacKeychainStore().get('bad/server', 'App')


class FakeAdvapi:
    """Implements CredReadW/CredWriteW/CredDeleteW/CredFree on ctypes structures."""
    def __init__(self, error=None):
        self.items = {}; self.error = error; self.last_error = 0; self.freed = 0; self.writes = []
        self._keep = []

    def _fail(self, code): self.last_error = code; return 0

    def CredReadW(self, target, cred_type, flags, ref):
        if self.error: return self._fail(self.error)
        if cred_type != credentials.CRED_TYPE_GENERIC or target not in self.items: return self._fail(credentials.ERROR_NOT_FOUND)
        blob = self.items[target]
        buf = (ctypes.c_ubyte * len(blob)).from_buffer_copy(blob)
        cred = credentials.CREDENTIALW(Type=credentials.CRED_TYPE_GENERIC, TargetName=target,
                                       CredentialBlobSize=len(blob), CredentialBlob=ctypes.cast(buf, ctypes.POINTER(ctypes.c_ubyte)))
        self._keep += [buf, cred]
        ref._obj.contents = cred
        return 1

    def CredWriteW(self, ref, flags):
        if self.error: return self._fail(self.error)
        cred = ref._obj
        self.writes.append((cred.TargetName, cred.Type, cred.Persist, cred.UserName))
        self.items[cred.TargetName] = ctypes.string_at(cred.CredentialBlob, cred.CredentialBlobSize)
        return 1

    def CredDeleteW(self, target, cred_type, flags):
        if self.error: return self._fail(self.error)
        if target not in self.items: return self._fail(credentials.ERROR_NOT_FOUND)
        del self.items[target]; return 1

    def CredFree(self, pointer): self.freed += 1


class WindowsStoreTests(unittest.TestCase):
    def store(self, adv):
        return credentials.WindowsCredentialStore(advapi32=adv, get_last_error=lambda: adv.last_error)

    def test_round_trip_scoped_targets(self):
        adv = FakeAdvapi(); store = self.store(adv)
        self.assertIsNone(store.get('server-a', 'App'))
        store.set('server-a', 'App', SECRET)
        self.assertEqual(store.get('server-a', 'App'), SECRET)
        self.assertIsNone(store.get('server-b', 'App')); self.assertIsNone(store.get('server-a', 'Other App'))
        target, cred_type, persist, user = adv.writes[0]
        self.assertEqual((cred_type, persist), (credentials.CRED_TYPE_GENERIC, credentials.CRED_PERSIST_LOCAL_MACHINE))
        self.assertIn('server-a', target); self.assertIn('App', target); self.assertNotIn(SECRET, target + user)
        self.assertEqual(adv.freed, 1)  # one successful read
        store.delete('server-a', 'App'); store.delete('server-a', 'App')  # missing item is fine
        self.assertEqual(adv.items, {})

    def test_native_errors_are_safe(self):
        adv = FakeAdvapi(error=5); store = self.store(adv)
        for call in (lambda: store.get('server-a', 'App'), lambda: store.set('server-a', 'App', SECRET),
                     lambda: store.delete('server-a', 'App')):
            with self.assertRaises(credentials.CredentialStoreError) as caught: call()
            self.assertIn('error 5', str(caught.exception)); self.assertNotIn(SECRET, str(caught.exception))

    def test_unloadable_library_is_safe_error(self):
        store = credentials.WindowsCredentialStore()
        with patch.object(credentials, '_load_advapi32', side_effect=credentials.CredentialStoreError('Windows Credential Manager is unavailable')):
            with self.assertRaises(credentials.CredentialStoreError): store.get('server-a', 'App')

    def test_undecodable_blob_is_safe_error(self):
        adv = FakeAdvapi(); adv.items['Zotero Wrangler local API/server-a/App'] = b'\xff\xfe'
        with self.assertRaises(credentials.CredentialStoreError): self.store(adv).get('server-a', 'App')


@unittest.skipUnless(sys.platform == 'darwin', 'Security.framework constants are macOS-only')
class MacStoreTests(unittest.TestCase):
    """Real CoreFoundation for dictionaries; every SecItem* call is a fake."""

    class FakeSecurity:
        def __init__(self, store, status=None):
            self.store = store; self.status = status or {}; self.items = {}; self.calls = []

        def _account(self, query):
            lib = self.store._lib
            return lib.py_string(lib.cf.CFDictionaryGetValue(query, lib.kSecAttrAccount)), \
                lib.py_string(lib.cf.CFDictionaryGetValue(query, lib.kSecAttrService))

        def SecItemCopyMatching(self, query, ref):
            self.calls.append('copy')
            if 'copy' in self.status: return self.status['copy']
            key = self._account(query)
            if key not in self.items: return credentials.ERR_SEC_ITEM_NOT_FOUND
            data = self.items[key]
            ref._obj.value = self.store._lib.cf.CFDataCreate(None, data, len(data))
            return 0

        def SecItemUpdate(self, query, attrs):
            self.calls.append('update')
            if 'update' in self.status: return self.status['update']
            key = self._account(query)
            if key not in self.items: return credentials.ERR_SEC_ITEM_NOT_FOUND
            self.items[key] = self._data(attrs); return 0

        def SecItemAdd(self, attrs, result):
            self.calls.append('add')
            if 'add' in self.status: return self.status['add']
            self.items[self._account(attrs)] = self._data(attrs); return 0

        def SecItemDelete(self, query):
            self.calls.append('delete')
            if 'delete' in self.status: return self.status['delete']
            return 0 if self.items.pop(self._account(query), None) is not None else credentials.ERR_SEC_ITEM_NOT_FOUND

        def _data(self, attrs):
            lib = self.store._lib; ref = lib.cf.CFDictionaryGetValue(attrs, lib.kSecValueData)
            return ctypes.string_at(lib.cf.CFDataGetBytePtr(ref), lib.cf.CFDataGetLength(ref))

    def make(self, status=None):
        store = credentials.MacKeychainStore(service='fictional.zotero-wrangler.test')
        fake = self.FakeSecurity(store, status); store._functions = fake
        return store, fake

    def test_round_trip_update_then_add(self):
        store, fake = self.make()
        self.assertIsNone(store.get('server-a', 'App'))
        store.set('server-a', 'App', SECRET)
        self.assertEqual(fake.calls[-2:], ['update', 'add'])
        self.assertEqual(store.get('server-a', 'App'), SECRET)
        self.assertEqual(fake.items, {('server-a/App', 'fictional.zotero-wrangler.test'): SECRET.encode()})
        store.set('server-a', 'App', SECRET + 'x'); self.assertEqual(fake.calls[-1], 'update')
        self.assertIsNone(store.get('server-b', 'App'))
        store.delete('server-a', 'App'); store.delete('server-a', 'App')
        self.assertEqual(fake.items, {})

    def test_native_errors_are_safe(self):
        for op, call in (('copy', lambda s: s.get('server-a', 'App')), ('update', lambda s: s.set('server-a', 'App', SECRET)),
                         ('delete', lambda s: s.delete('server-a', 'App'))):
            store, _ = self.make({op: -25293})
            with self.assertRaises(credentials.CredentialStoreError) as caught: call(store)
            self.assertIn('OSStatus -25293', str(caught.exception)); self.assertNotIn(SECRET, str(caught.exception))
        store, _ = self.make({'add': -25308})
        with self.assertRaises(credentials.CredentialStoreError): store.set('server-a', 'App', SECRET)

    def test_unloadable_framework_is_safe_error(self):
        store = credentials.MacKeychainStore()
        with patch.object(ctypes, 'CDLL', side_effect=OSError('missing')):
            with self.assertRaises(credentials.CredentialStoreError) as caught: store.get('server-a', 'App')
        self.assertNotIn('missing', str(caught.exception))


CHILD = '''
import hashlib, sys
sys.path.insert(0, sys.argv[1])
import zotero_credentials as credentials
value = credentials.MacKeychainStore(service=sys.argv[2]).get(sys.argv[3], sys.argv[4])
print('missing' if value is None else 'match' if hashlib.sha256(value.encode()).hexdigest() == sys.argv[5] else 'mismatch')
'''


@unittest.skipUnless(sys.platform == 'darwin' and os.environ.get('ZOTERO_WRANGLER_KEYCHAIN_SMOKE') == '1',
                     'opt-in real macOS Keychain smoke test')
class MacKeychainSmokeTest(unittest.TestCase):
    def test_separate_interpreter_reads_synthetic_item(self):
        service = 'zotero-wrangler.smoke-test.' + secrets.token_hex(4)
        server, app = 'synthetic-smoke-server', 'Zotero Wrangler Smoke Test'
        value = secrets.token_hex(24); digest = hashlib.sha256(value.encode()).hexdigest()
        store = credentials.MacKeychainStore(service=service)
        try:
            store.set(server, app, value)
            # Only the digest crosses the process boundary; the value never enters argv or output.
            out = subprocess.run([sys.executable, '-I', '-c', CHILD, str(SCRIPTS), service, server, app, digest],
                                 capture_output=True, text=True, timeout=30)
            self.assertEqual(out.stdout.strip(), 'match', 'child exit %s' % out.returncode)
            self.assertNotIn(value, out.stdout + out.stderr)
        finally:
            store.delete(server, app)
        self.assertIsNone(store.get(server, app))


if __name__ == '__main__': unittest.main()

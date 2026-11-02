"""Remembered Zotero local API approval in the OS credential store.

macOS: login Keychain (generic password) through Security.framework.
Windows: Credential Manager (generic credential, this machine only) through advapi32.
Both via stdlib ctypes; no subprocess, so the key never enters argv. Other
platforms have no store and keep remembered approval for one run only.
Items are scoped by Zotero server ID and app name. Errors carry only a native
status code, never the key. No plaintext fallback exists.
"""
import ctypes
import re
import sys
from ctypes import wintypes

SERVICE = 'Zotero Wrangler local API'
ERR_SEC_ITEM_NOT_FOUND = -25300
CRED_TYPE_GENERIC = 1
CRED_PERSIST_LOCAL_MACHINE = 2
ERROR_NOT_FOUND = 1168
CRED_MAX_CREDENTIAL_BLOB_SIZE = 5 * 512


class CredentialStoreError(RuntimeError):
    """Safe to print: message holds a store name and status code only."""


def valid_scope(server, app_name):
    return (isinstance(server, str) and re.fullmatch(r'[A-Za-z0-9._-]{1,128}', server) is not None
            and isinstance(app_name, str) and re.fullmatch(r'[ -~]{1,128}', app_name) is not None)


def valid_key(key):
    # Sent as an HTTP header: printable ASCII without spaces, bounded length.
    return isinstance(key, str) and re.fullmatch(r'[!-~]{1,512}', key) is not None


def _require_scope(server, app_name):
    if not valid_scope(server, app_name): raise CredentialStoreError('Server ID or app name unsuitable for credential storage')


def default_store():
    if sys.platform == 'darwin': return MacKeychainStore()
    if sys.platform == 'win32': return WindowsCredentialStore()
    return None


class _MacLib:
    CF = '/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation'
    SEC = '/System/Library/Frameworks/Security.framework/Security'

    def __init__(self):
        try:
            cf = ctypes.CDLL(self.CF); sec = ctypes.CDLL(self.SEC)
        except OSError: raise CredentialStoreError('macOS Keychain is unavailable') from None
        p, n = ctypes.c_void_p, ctypes.c_long
        for name, res, args in (
                ('CFStringCreateWithBytes', p, [p, ctypes.c_char_p, n, ctypes.c_uint32, ctypes.c_bool]),
                ('CFStringGetCString', ctypes.c_bool, [p, ctypes.c_char_p, n, ctypes.c_uint32]),
                ('CFDataCreate', p, [p, ctypes.c_char_p, n]), ('CFDataGetLength', n, [p]), ('CFDataGetBytePtr', p, [p]),
                ('CFDictionaryCreate', p, [p, ctypes.POINTER(p), ctypes.POINTER(p), n, p, p]),
                ('CFDictionaryGetValue', p, [p, p]), ('CFRelease', None, [p])):
            fn = getattr(cf, name); fn.restype = res; fn.argtypes = args
        for name, args in (('SecItemCopyMatching', [p, ctypes.POINTER(p)]), ('SecItemAdd', [p, p]),
                           ('SecItemUpdate', [p, p]), ('SecItemDelete', [p])):
            fn = getattr(sec, name); fn.restype = ctypes.c_int32; fn.argtypes = args
        self.cf, self.sec = cf, sec
        for name in ('kSecClass', 'kSecClassGenericPassword', 'kSecAttrService', 'kSecAttrAccount', 'kSecAttrLabel',
                     'kSecValueData', 'kSecReturnData', 'kSecMatchLimit', 'kSecMatchLimitOne'):
            setattr(self, name, p.in_dll(sec, name).value)
        self.kCFBooleanTrue = p.in_dll(cf, 'kCFBooleanTrue').value
        self.key_callbacks = ctypes.addressof(ctypes.c_char.in_dll(cf, 'kCFTypeDictionaryKeyCallBacks'))
        self.value_callbacks = ctypes.addressof(ctypes.c_char.in_dll(cf, 'kCFTypeDictionaryValueCallBacks'))

    def string(self, text):
        b = text.encode('utf-8')
        return self.cf.CFStringCreateWithBytes(None, b, len(b), 0x08000100, False)

    def py_string(self, ref):
        buf = ctypes.create_string_buffer(1024)
        return buf.value.decode('utf-8') if ref and self.cf.CFStringGetCString(ref, buf, 1024, 0x08000100) else None

    def dictionary(self, pairs):
        n = len(pairs)
        keys = (ctypes.c_void_p * n)(*[k for k, _ in pairs]); values = (ctypes.c_void_p * n)(*[v for _, v in pairs])
        return self.cf.CFDictionaryCreate(None, keys, values, n, self.key_callbacks, self.value_callbacks)


class MacKeychainStore:
    """Generic password: service SERVICE, account '<server ID>/<app name>'."""

    def __init__(self, service=SERVICE, functions=None):
        self.service = service; self._functions = functions; self._lib = None

    def _native(self):
        if self._lib is None: self._lib = _MacLib()
        return self._lib, self._functions or self._lib.sec

    def _run(self, server, app_name, operation, extra=(), secret=None):
        _require_scope(server, app_name)
        lib, fns = self._native(); owned = []
        try:
            def cf(ref):
                owned.append(ref); return ref
            base = [(lib.kSecClass, lib.kSecClassGenericPassword), (lib.kSecAttrService, cf(lib.string(self.service))),
                    (lib.kSecAttrAccount, cf(lib.string(server + '/' + app_name)))]
            data = None
            if secret is not None:
                raw = secret.encode('utf-8'); data = cf(lib.cf.CFDataCreate(None, raw, len(raw)))
            return operation(lib, fns, base, data, cf)
        finally:
            for ref in owned:
                if ref: lib.cf.CFRelease(ref)

    def get(self, server, app_name):
        def op(lib, fns, base, _, cf):
            query = cf(lib.dictionary(base + [(lib.kSecReturnData, lib.kCFBooleanTrue), (lib.kSecMatchLimit, lib.kSecMatchLimitOne)]))
            result = ctypes.c_void_p()
            status = fns.SecItemCopyMatching(query, ctypes.byref(result))
            if status == ERR_SEC_ITEM_NOT_FOUND: return None
            if status != 0: raise CredentialStoreError(f'macOS Keychain read failed (OSStatus {status})')
            cf(result.value)
            raw = ctypes.string_at(lib.cf.CFDataGetBytePtr(result.value), lib.cf.CFDataGetLength(result.value))
            try: return raw.decode('utf-8')
            except UnicodeDecodeError: raise CredentialStoreError('macOS Keychain item is unreadable') from None
        return self._run(server, app_name, op)

    def set(self, server, app_name, key):
        def op(lib, fns, base, data, cf):
            query = cf(lib.dictionary(base))
            status = fns.SecItemUpdate(query, cf(lib.dictionary([(lib.kSecValueData, data)])))
            if status == ERR_SEC_ITEM_NOT_FOUND:
                label = cf(lib.string(SERVICE + ' approval'))
                status = fns.SecItemAdd(cf(lib.dictionary(base + [(lib.kSecAttrLabel, label), (lib.kSecValueData, data)])), None)
            if status != 0: raise CredentialStoreError(f'macOS Keychain write failed (OSStatus {status})')
        self._run(server, app_name, op, secret=key)

    def delete(self, server, app_name):
        def op(lib, fns, base, _, cf):
            status = fns.SecItemDelete(cf(lib.dictionary(base)))
            if status not in (0, ERR_SEC_ITEM_NOT_FOUND): raise CredentialStoreError(f'macOS Keychain delete failed (OSStatus {status})')
        self._run(server, app_name, op)


class CREDENTIALW(ctypes.Structure):
    _fields_ = [('Flags', wintypes.DWORD), ('Type', wintypes.DWORD), ('TargetName', wintypes.LPWSTR),
                ('Comment', wintypes.LPWSTR), ('LastWritten', wintypes.FILETIME), ('CredentialBlobSize', wintypes.DWORD),
                ('CredentialBlob', ctypes.POINTER(ctypes.c_ubyte)), ('Persist', wintypes.DWORD),
                ('AttributeCount', wintypes.DWORD), ('Attributes', ctypes.c_void_p), ('TargetAlias', wintypes.LPWSTR),
                ('UserName', wintypes.LPWSTR)]


def _load_advapi32():
    try: adv = ctypes.WinDLL('advapi32', use_last_error=True)
    except (AttributeError, OSError): raise CredentialStoreError('Windows Credential Manager is unavailable') from None
    pcred = ctypes.POINTER(CREDENTIALW)
    adv.CredReadW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(pcred)]
    adv.CredWriteW.argtypes = [ctypes.POINTER(CREDENTIALW), wintypes.DWORD]
    adv.CredDeleteW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD]
    adv.CredFree.argtypes = [ctypes.c_void_p]; adv.CredFree.restype = None
    for name in ('CredReadW', 'CredWriteW', 'CredDeleteW'): getattr(adv, name).restype = wintypes.BOOL
    return adv


class WindowsCredentialStore:
    """Generic credential 'Zotero Wrangler local API/<server ID>/<app name>', persisted for this user on this machine."""

    def __init__(self, advapi32=None, get_last_error=None):
        self._adv = advapi32; self._last_error = get_last_error

    def _native(self):
        if self._adv is None: self._adv = _load_advapi32()
        return self._adv, self._last_error or ctypes.get_last_error

    @staticmethod
    def _target(server, app_name):
        _require_scope(server, app_name)
        return f'{SERVICE}/{server}/{app_name}'

    def get(self, server, app_name):
        target = self._target(server, app_name); adv, last_error = self._native()
        pcred = ctypes.POINTER(CREDENTIALW)()
        if not adv.CredReadW(target, CRED_TYPE_GENERIC, 0, ctypes.byref(pcred)):
            code = last_error()
            if code == ERROR_NOT_FOUND: return None
            raise CredentialStoreError(f'Windows Credential Manager read failed (error {code})')
        try:
            cred = pcred.contents
            raw = ctypes.string_at(cred.CredentialBlob, cred.CredentialBlobSize)
        finally: adv.CredFree(pcred)
        try: return raw.decode('utf-8')
        except UnicodeDecodeError: raise CredentialStoreError('Windows Credential Manager item is unreadable') from None

    def set(self, server, app_name, key):
        target = self._target(server, app_name); raw = key.encode('utf-8')
        if len(raw) > CRED_MAX_CREDENTIAL_BLOB_SIZE: raise CredentialStoreError('Key too large for Windows Credential Manager')
        adv, last_error = self._native()
        blob = (ctypes.c_ubyte * len(raw)).from_buffer_copy(raw)
        cred = CREDENTIALW(Type=CRED_TYPE_GENERIC, TargetName=target, CredentialBlobSize=len(raw),
                           CredentialBlob=ctypes.cast(blob, ctypes.POINTER(ctypes.c_ubyte)),
                           Persist=CRED_PERSIST_LOCAL_MACHINE, UserName=app_name)
        if not adv.CredWriteW(ctypes.byref(cred), 0):
            raise CredentialStoreError(f'Windows Credential Manager write failed (error {last_error()})')

    def delete(self, server, app_name):
        target = self._target(server, app_name); adv, last_error = self._native()
        if not adv.CredDeleteW(target, CRED_TYPE_GENERIC, 0):
            code = last_error()
            if code != ERROR_NOT_FOUND: raise CredentialStoreError(f'Windows Credential Manager delete failed (error {code})')

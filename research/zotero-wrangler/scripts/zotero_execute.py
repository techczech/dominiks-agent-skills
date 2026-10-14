"""Reconcile desired server state, not client receipts, before retrying writes."""
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from zotero_client import APIError, validate_library
from zotero_plan import digest, new_key, identity_doi, normal_title, KEY_ALPHABET
from zotero_retrieve import pdf_hashes


def save_private(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.' + new_key() + '.tmp')
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as out:
            json.dump(value, out, ensure_ascii=False, indent=2); out.flush(); os.fsync(out.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists(): temporary.unlink()


def validate_plan(plan, for_execution=True):
    if plan.get('format') != 1 or plan.get('digest') != digest({k: v for k, v in plan.items() if k != 'digest'}):
        raise ValueError('Plan changed; rebuild rather than editing an integrity-checked plan')
    validate_library(plan['library'])
    if for_execution and plan.get('blocked'): raise ValueError('Unresolved identity decisions; plan is not executable')
    if for_execution and (not plan.get('server_id') or plan.get('api_version') != '3'): raise ValueError('Plan requires supported writable local API instance')
    keys = set()
    for op in plan['operations']:
        if op['endpoint'] not in ('items', 'collections') or op['action'] not in ('create', 'update'): raise ValueError('Unsupported operation')
        d = op['desired']; key = d['key']
        if key in keys or len(key) != 8 or any(c not in KEY_ALPHABET for c in key): raise ValueError('Invalid or repeated operation key')
        keys.add(key)
        if op['action'] == 'create' and d.get('version') != 0: raise ValueError('New predetermined keys require version 0')


def read_optional(api, route):
    try: return api.get(route)['data']
    except APIError as e:
        if e.status == 404: return None
        raise


def satisfied(actual, desired):
    if actual is None: return False
    for field, value in desired.items():
        if field == 'version': continue
        if field in ('tags', 'collections'):
            if any(v not in actual.get(field, []) for v in value): return False
        elif actual.get(field) != value: return False
    return True


def identity_matches(actual, op):
    identity = op.get('identity')
    if not actual or not identity: return bool(actual)
    return (identity_doi(actual) == identity['DOI'] if identity['DOI']
            else normal_title(actual.get('title')) == normal_title(identity['title']))


def verified_state(actual, op):
    return identity_matches(actual, op) and satisfied(actual, op['desired'])


def check_requirements(api, plan):
    for req in plan.get('requires', []):
        if req['endpoint'] not in ('items','collections'): raise ValueError('Invalid scope requirement')
        actual = read_optional(api, plan['library']+'/'+req['endpoint']+'/'+req['key'])
        if actual is None: raise ValueError('Required parent/collection/note is missing')
        if req.get('identity') and not identity_matches(actual, req): raise ValueError('Required paper identity changed')
        if any(actual.get(k)!=v for k,v in req.get('fields',{}).items()): raise ValueError('Required collection/note changed')
        if not set(req.get('collections',[])) <= set(actual.get('collections',[])): raise ValueError('Required collection membership changed')


def apply(api, plan, receipt_path):
    validate_plan(plan)
    if api.server != plan['server_id']: raise ValueError('Server partition mismatch; take a new snapshot and plan')
    receipt_path = Path(receipt_path)
    receipt = {'server_id': api.server, 'plan_digest': plan['digest'], 'events': []}
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt.get('server_id') != api.server or receipt.get('plan_digest') != plan['digest']:
            raise ValueError('Receipt belongs to another server or plan')
    check_requirements(api, plan)
    library = plan['library']; pending = []
    live_items = api.get(library + '/items/top') if any(op['endpoint'] == 'items' and op['action'] == 'create' for op in plan['operations']) else []
    live_notes = api.get(library + '/items') if any(op.get('note_identity') for op in plan['operations']) else []
    live_collections = api.get(library + '/collections') if any(op['endpoint'] == 'collections' and op['action'] == 'create' for op in plan['operations']) else []
    for op in plan['operations']:
        if op['action'] != 'create': continue
        d = op['desired']
        for candidate in (live_notes if op.get('note_identity') else live_items if op['endpoint'] == 'items' else live_collections):
            if candidate['key'] == d['key']: continue
            data = candidate['data']
            if op['endpoint'] == 'items':
                if op.get('note_identity'):
                    ni=op['note_identity']
                    collision = data.get('itemType')=='note' and data.get('parentItem')==ni.get('parentItem') and set(ni['collections'])<=set(data.get('collections',[])) and any(t.get('tag')==ni['role'] for t in data.get('tags',[]))
                    if collision: raise ValueError('Generated note appeared since snapshot; reconcile before creating')
                    continue
                if data.get('itemType') in ('note', 'attachment'): continue
                ident = op['identity']
                collision = (ident['DOI'] and identity_doi(data) == ident['DOI']) or (normal_title(data.get('title')) == normal_title(ident['title']) and (not ident['DOI'] or not identity_doi(data)))
            else:
                collision = data.get('name') == d['name'] and data.get('parentCollection') == d.get('parentCollection')
            if collision: raise ValueError('New matching identity appeared since snapshot; reconcile before creating')
    # Complete preflight before the first mutation. Never trust a saved success flag.
    for op in plan['operations']:
        desired = op['desired']; route = library + '/' + op['endpoint'] + '/' + desired['key']
        actual = read_optional(api, route)
        identity = op.get('identity')
        if actual and identity:
            same_identity = (identity_doi(actual) == identity['DOI'] if identity['DOI']
                             else normal_title(actual.get('title')) == normal_title(identity['title']))
            if not same_identity: raise ValueError('Item identity changed at planned key; inspect before retry')
        if verified_state(actual, op):
            receipt['events'].append({'key': desired['key'], 'state': 'readback_satisfied'}); continue
        if op['action'] == 'create' and actual is not None:
            raise ValueError('Predetermined key exists with different desired state; inspect, do not overwrite')
        if op['action'] == 'update' and (actual is None or actual['version'] != desired['version']):
            raise ValueError('Concurrent item change or missing update target; rebuild reviewable plan')
        pending.append(op)
    save_private(receipt_path, receipt)
    for endpoint in ('collections', 'items'):
        ops = [op for op in pending if op['endpoint'] == endpoint]
        for offset in range(0, len(ops), 50):
            batch = ops[offset:offset + 50]
            receipt['events'].append({'keys': [op['desired']['key'] for op in batch], 'state': 'pending_response'})
            save_private(receipt_path, receipt)
            response = api.write(library + '/' + endpoint, [op['desired'] for op in batch])
            failed_count = len(response.get('failed', {}))
            missing = []
            for op in batch:
                d = op['desired']; actual = read_optional(api, library + '/' + endpoint + '/' + d['key'])
                state = 'verified' if verified_state(actual, op) else 'unresolved'
                receipt['events'].append({'key': d['key'], 'state': state})
                if state != 'verified': missing.append(d['key'])
            save_private(receipt_path, receipt)
            if missing or failed_count: raise RuntimeError('Partial/unverified write; resume only after readback reconciliation')
    # Also re-read formerly satisfied objects after writing other batches.
    for op in plan['operations']:
        d = op['desired']
        if not verified_state(read_optional(api, library + '/' + op['endpoint'] + '/' + d['key']), op):
            raise RuntimeError('Final verification failed')
    check_requirements(api, plan)
    receipt['complete'] = True; save_private(receipt_path, receipt)
    return {'verified_operations': len(plan['operations']), 'complete': True}


def verify_attachment(data, parent, md5):
    if data.get('parentItem') != parent or data.get('md5') != md5:
        raise ValueError('Attachment parent or MD5 readback mismatch')


def attach(api, library, parent, pdf, source_url, receipt_path):
    validate_library(library)
    if len(parent) != 8 or any(c not in KEY_ALPHABET for c in parent): raise ValueError('Invalid parent item key')
    pdf = Path(pdf); content = pdf.read_bytes(); hashes = pdf_hashes(content)
    if read_optional(api, library + '/items/' + parent) is None: raise ValueError('Parent item missing')
    binding = {'server_id': api.server, 'library': library, 'parent': parent, **hashes, 'source_url': source_url}
    rpath = Path(receipt_path)
    if rpath.exists():
        r = json.loads(rpath.read_text())
        if any(r.get(k) != v for k, v in binding.items()): raise ValueError('Attachment receipt binding mismatch')
    else:
        # A same-hash child is reusable; an arbitrary PDF is not the same document.
        children = api.get(library + '/items/' + parent + '/children')
        matches = [c for c in children if c['data'].get('md5') == hashes['md5'] and c['data'].get('parentItem') == parent]
        if matches:
            r = {**binding, 'key': matches[0]['key'], 'complete': True}; save_private(rpath, r); return r
        r = {**binding, 'key': new_key(), 'complete': False}; save_private(rpath, r)
    key = r['key']; route = library + '/items/' + key
    actual = read_optional(api, route)
    desired = {'key': key, 'version': 0, 'itemType': 'attachment', 'linkMode': 'imported_file',
               'parentItem': parent, 'title': 'Full text PDF', 'contentType': 'application/pdf',
               'filename': pdf.name, 'tags': [], 'collections': [], 'note': '', 'url': source_url}
    if actual is None:
        api.write(library + '/items', [desired])
        actual = read_optional(api, route)
    if not actual or actual.get('parentItem') != parent or actual.get('linkMode') not in ('imported_file', 'imported_url') or actual.get('filename') != pdf.name:
        raise ValueError('Attachment key state differs; inspect before retry')
    if actual.get('md5'):
        verify_attachment(actual, parent, hashes['md5'])
    else:
        precondition = {'If-None-Match': '*', 'Content-Type': 'application/x-www-form-urlencoded'}
        form = urlencode({'md5': hashes['md5'], 'filename': pdf.name, 'filesize': len(content),
                          'mtime': int(pdf.stat().st_mtime * 1000)}).encode()
        auth = api.write(route + '/file', form, headers=precondition)
        if not auth.get('exists'):
            api.upload(auth['url'], content, auth['contentType'])
            api.write(route + '/file', urlencode({'upload': auth['uploadKey']}).encode(), headers=precondition)
        verify_attachment(api.get(route)['data'], parent, hashes['md5'])
    r['complete'] = True; save_private(rpath, r)
    return r

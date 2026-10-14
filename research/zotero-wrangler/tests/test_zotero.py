import copy
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import zotero_plan as plan
import zotero_client as client
import zotero_execute as execute
import zotero_retrieve as retrieve


def snapshot(items=None):
    return {'server_id': 'fictional-server', 'api_version': '3',
            'library': 'users/0', 'collections': [
                {'key': 'ABCDEFGH', 'data': {'key': 'ABCDEFGH', 'version': 2,
                 'name': 'Fictional Reading', 'parentCollection': False}}],
            'items': items or []}


def record(**kw):
    return {'title': 'Fictional demonstration', 'DOI': '10.9999/demo',
            'provenance': [{'source': 'fictional export', 'query': 'stream A'}], **kw}


class FakeAPI:
    def __init__(self, snap):
        self.server = snap['server_id']
        self.objects = {x['key']: copy.deepcopy(x['data']) for x in snap['items']}
        self.collections = {x['key']: copy.deepcopy(x['data']) for x in snap['collections']}
        self.calls = []
        self.lose_response = False
        self.partial = False

    def get(self, route):
        if route.endswith('/items') or route.endswith('/items/top'): return [{'key': k, 'data': copy.deepcopy(d)} for k, d in self.objects.items()]
        if route.endswith('/collections'): return [{'key': k, 'data': copy.deepcopy(d)} for k, d in self.collections.items()]
        store = self.collections if '/collections/' in route else self.objects
        key = route.rsplit('/', 1)[-1]
        if key not in store:
            raise client.APIError(404)
        return {'key': key, 'data': copy.deepcopy(store[key])}

    def write(self, route, data, **kw):
        self.calls.append(copy.deepcopy(data))
        store = self.collections if route.endswith('/collections') else self.objects
        for n, d in enumerate(data):
            if self.partial and n:
                return {'failed': {'1': {'code': 400}}}
            old = store.get(d['key'], {})
            store[d['key']] = {**old, **d, 'version': old.get('version', 0) + 1}
        if self.lose_response:
            self.lose_response = False
            raise TimeoutError('fictional interrupted client')
        return {'successful': {str(i): {'key': d['key']} for i, d in enumerate(data)}}


class WorkflowTests(unittest.TestCase):
    def test_normalisation_preserves_uncertain_punctuation(self):
        self.assertEqual(plan.doi('https://doi.org/10.9999/DEMO'), '10.9999/demo')
        self.assertEqual(plan.doi('10.9999/demo.'), '10.9999/demo.')
        p = plan.prepare([record(DOI='10.9999/demo.')], snapshot(), 'Fictional Reading')
        self.assertTrue(p['blocked'])

    def test_union_provenance_for_duplicate_rows(self):
        p = plan.prepare([record(), record(DOI='https://doi.org/10.9999/DEMO',
            provenance=[{'source': 'fictional export', 'query': 'stream B'}])], snapshot(), 'Fictional Reading')
        self.assertEqual(len(p['operations']), 1)
        self.assertIn('stream A', p['operations'][0]['desired']['extra'])
        self.assertIn('stream B', p['operations'][0]['desired']['extra'])

    def test_complementary_duplicate_metadata_kept(self):
        p = plan.prepare([record(), record(date='2025', abstractNote='Fictional genuine export abstract',
            abstract_source='fictional export', creators=[{'creatorType':'author','name':'Alex Example'}],
            availability={'status':'not assessed'})], snapshot(), 'Fictional Reading')
        self.assertFalse(p['blocked'])
        d = p['operations'][0]['desired']
        self.assertEqual(d['date'], '2025')
        self.assertEqual(d['abstractNote'], 'Fictional genuine export abstract')
        self.assertIn('not assessed', d['extra'])

    def test_distinct_versions_kept(self):
        p = plan.prepare([record(), record(DOI='10.9999/preprint')], snapshot(), 'Fictional Reading')
        self.assertEqual(len(p['operations']), 2)
        self.assertTrue(p['warnings'])

    def test_title_only_match_blocks(self):
        old = {'key': 'JKLMNPQR', 'data': {'key': 'JKLMNPQR', 'version': 4,
               'title': 'Fictional demonstration', 'itemType': 'journalArticle'}}
        p = plan.prepare([record()], snapshot([old]), 'Fictional Reading')
        self.assertTrue(p['blocked'])

    def test_existing_arrays_and_fields_preserved(self):
        old = {'key': 'JKLMNPQR', 'data': {'key': 'JKLMNPQR', 'version': 4,
               'title': 'My corrected title', 'DOI': '10.9999/demo',
               'abstractNote': 'User abstract', 'tags': [{'tag': 'user', 'type': 1}],
               'collections': ['ZZZZZZZZ'], 'extra': 'User note', 'itemType': 'journalArticle'}}
        p = plan.prepare([record(abstractNote='Source abstract', abstract_source='fictional source')], snapshot([old]), 'Fictional Reading')
        d = p['operations'][0]['desired']
        self.assertNotIn('abstractNote', d)
        self.assertNotIn('title', d)
        self.assertIn({'tag': 'user', 'type': 1}, d['tags'])
        self.assertEqual(d['collections'], ['ZZZZZZZZ', 'ABCDEFGH'])
        self.assertTrue(d['extra'].startswith('User note'))

    def test_ambiguous_identity_stops(self):
        old = [{'key': k, 'data': {'key': k, 'version': 1, 'DOI': '10.9999/demo',
                'itemType': 'journalArticle'}} for k in ('JKLMNPQR', 'STUVWXYZ')]
        self.assertTrue(plan.prepare([record()], snapshot(old), 'Fictional Reading')['blocked'])

    def test_duplicate_collection_name_stops(self):
        s = snapshot()
        s['collections'].append({'key': 'ZZZZZZZZ', 'data': {'name': 'Fictional Reading'}})
        with self.assertRaises(ValueError):
            plan.prepare([record()], s, 'Fictional Reading')

    def test_priority_requires_evidence(self):
        with self.assertRaises(ValueError):
            plan.prepare([record(priority={'value': 5, 'basis': 'keyword'})], snapshot(), 'Fictional Reading')

    def test_topic_basis_and_title_priority_explicit(self):
        p = plan.prepare([record(topics=[{'name': 'Methods', 'basis': 'search-stream'}],
            priority={'value': 4, 'basis': 'title-only provisional', 'evidence': 'fictional title judgement'})], snapshot(), 'Fictional Reading')
        self.assertEqual(p['operations'][0]['endpoint'], 'collections')
        self.assertIn('search-stream', p['operations'][-1]['desired']['extra'])
        self.assertIn('title-only provisional', str(p))

    def test_response_lost_resume_reads_server(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        api.lose_response = True
        with tempfile.TemporaryDirectory() as td:
            receipt = Path(td) / 'receipt.json'
            with self.assertRaises(TimeoutError):
                execute.apply(api, p, receipt)
            execute.apply(api, p, receipt)
            self.assertEqual(len(api.calls), 1)

    def test_partial_batch_reconciles_only_satisfied_objects(self):
        s = snapshot(); p = plan.prepare([record(), record(title='Other', DOI='10.9999/other')], s, 'Fictional Reading')
        api = FakeAPI(s); api.partial = True
        with tempfile.TemporaryDirectory() as td:
            r = Path(td) / 'receipt.json'
            with self.assertRaises(RuntimeError): execute.apply(api, p, r)
            api.partial = False
            execute.apply(api, p, r)
            self.assertEqual(len(api.calls[1]), 1)

    def test_server_change_and_stale_versions_stop(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        api.server = 'other-fictional-server'
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): execute.apply(api, p, Path(td) / 'r.json')

    def test_identity_created_after_snapshot_stops(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        api.objects['JKLMNPQR'] = {'key':'JKLMNPQR','version':1,'itemType':'journalArticle','DOI':'10.9999/demo'}
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): execute.apply(api, p, Path(td) / 'r.json')
        self.assertFalse(api.calls)

    def test_standalone_attachment_title_does_not_block_reference(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        api.objects['JKLMNPQR'] = {'key':'JKLMNPQR','version':1,'itemType':'attachment','title':'Fictional demonstration'}
        with tempfile.TemporaryDirectory() as td:
            result = execute.apply(api, p, Path(td) / 'r.json')
        self.assertTrue(result['complete'])

    def test_key_collision_stops(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        key = p['operations'][0]['desired']['key']
        api.objects[key] = {'key': key, 'version': 1, 'DOI': '10.9999/wrong'}
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): execute.apply(api, p, Path(td) / 'r.json')
        self.assertFalse(api.calls)

    def test_update_concurrent_version_stops(self):
        old = {'key': 'JKLMNPQR', 'data': {'key': 'JKLMNPQR', 'version': 4, 'DOI': '10.9999/demo', 'itemType': 'journalArticle'}}
        s = snapshot([old]); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        api.objects['JKLMNPQR']['version'] = 5
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): execute.apply(api, p, Path(td) / 'r.json')

    def test_read_only_and_blocked_plans_remain_reviewable(self):
        s = snapshot(); s['server_id'] = None
        p = plan.prepare([record(DOI='10.9999/demo.')], s, 'Fictional Reading')
        execute.validate_plan(p, for_execution=False)
        with self.assertRaises(ValueError): execute.validate_plan(p)

    def test_edited_plan_rejects(self):
        p = plan.prepare([record()], snapshot(), 'Fictional Reading')
        p['operations'][0]['desired']['title'] = 'tampered'
        with self.assertRaises(ValueError): execute.validate_plan(p)

    def test_loopback_only(self):
        for url in ('https://example.org/api/', 'http://127.0.0.1:23119@evil.test/api/', 'http://localhost:23119/other/'):
            with self.assertRaises(ValueError): client.validate_base(url)
        client.validate_base('http://127.0.0.1:23119/api/')

    def test_false_pdf_rejects(self):
        with self.assertRaises(ValueError): retrieve.pdf_hashes(b'<html>login</html>')
        self.assertEqual(len(retrieve.pdf_hashes(b'%PDF-1.4\nfictional')['md5']), 32)

    def test_pdf_private_atomic_idempotent_save(self):
        b = b'%PDF-1.4\nfictional'
        with tempfile.TemporaryDirectory() as td, patch.object(retrieve, 'fetch', return_value=(b, 'https://example.org/fictional.pdf')):
            p = Path(td) / 'fictional.pdf'
            retrieve.download_pdf('https://example.org/fictional.pdf', p)
            self.assertEqual(p.stat().st_mode & 0o777, 0o600)
            retrieve.download_pdf('https://example.org/fictional.pdf', p)
            self.assertEqual(p.read_bytes(), b)
            p.write_bytes(b'other')
            with self.assertRaises(ValueError): retrieve.download_pdf('https://example.org/fictional.pdf', p)
            self.assertEqual(p.read_bytes(), b'other')

    def test_receipt_wrong_plan_stops_before_writes(self):
        s = snapshot(); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        with tempfile.TemporaryDirectory() as td:
            r = Path(td) / 'r.json'
            r.write_text('{"server_id":"fictional-server","plan_digest":"other"}')
            with self.assertRaises(ValueError): execute.apply(api, p, r)
        self.assertFalse(api.calls)

    def test_format_adapters(self):
        root = Path(__file__).resolve().parents[1] / 'assets'
        for ext in ('bib', 'ris'):
            try: rows = plan.load_records(root / ('fictional-zotero-references.' + ext))
            except ValueError as e:
                if 'requires optional' in str(e): self.skipTest('Optional parsers not installed')
                raise
            self.assertEqual(rows[0]['DOI'], '10.9999/fictional-demo')
            self.assertEqual(rows[0]['creators'][0]['name'], 'Example, Alex')
            self.assertTrue(rows[0]['provenance'][0]['raw'])

    def test_public_fetch_pins_validated_ip_without_reresolving(self):
        class Raw:
            def settimeout(self, value): pass
            def connect(self, address): self.address = address
            def close(self): pass
        class Response:
            status = 200
            def read(self, limit): return b'%PDF-fictional'
        class Connection:
            def __init__(self, *args, **kw): pass
            def request(self, *args, **kw): pass
            def getresponse(self): return Response()
            def close(self): pass
        raw = Raw()
        address = (retrieve.socket.AF_INET, retrieve.socket.SOCK_STREAM, 6, '', ('93.184.216.34', 80))
        with patch.object(retrieve.socket, 'getaddrinfo', return_value=[address]) as dns, patch.object(retrieve.socket, 'socket', return_value=raw), patch.object(retrieve.http.client, 'HTTPConnection', Connection):
            content, url = retrieve.fetch('http://example.org/fictional.pdf')
        self.assertEqual(dns.call_count, 1)
        self.assertEqual(raw.address, ('93.184.216.34', 80))
        self.assertEqual(content, b'%PDF-fictional')

    def test_private_public_source_rejected(self):
        address = (retrieve.socket.AF_INET, retrieve.socket.SOCK_STREAM, 6, '', ('127.0.0.1', 80))
        with patch.object(retrieve.socket, 'getaddrinfo', return_value=[address]):
            with self.assertRaises(ValueError): retrieve.public_url('http://example.org/fictional.pdf')

    def test_attachment_verifies_parent_and_hash(self):
        with self.assertRaises(ValueError): execute.verify_attachment({'parentItem': 'wrong', 'md5': 'abc'}, 'PARENTAA', 'abc')
        with self.assertRaises(ValueError): execute.verify_attachment({'parentItem': 'PARENTAA', 'md5': 'wrong'}, 'PARENTAA', 'abc')

    def test_orphan_abstract_source_rejects(self):
        with self.assertRaises(ValueError):
            plan.prepare([record(abstract_source='source A'), record(abstractNote='text B', abstract_source='source B')], snapshot(), 'Fictional Reading')

    def test_identity_change_after_write_cannot_complete(self):
        old = {'key': 'JKLMNPQR', 'data': {'key': 'JKLMNPQR', 'version': 4, 'DOI': '10.9999/demo', 'itemType': 'journalArticle'}}
        s = snapshot([old]); p = plan.prepare([record()], s, 'Fictional Reading'); api = FakeAPI(s)
        original = api.write
        def change_doi(*args, **kw):
            result = original(*args, **kw)
            api.objects['JKLMNPQR']['DOI'] = '10.9999/changed'
            return result
        api.write = change_doi
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(RuntimeError): execute.apply(api, p, Path(td) / 'r.json')

    def test_batch_limit(self):
        s = snapshot(); p = plan.prepare([record(title=str(i), DOI=f'10.9999/x{i}') for i in range(51)], s, 'Fictional Reading')
        api = FakeAPI(s)
        with tempfile.TemporaryDirectory() as td: execute.apply(api, p, Path(td) / 'r.json')
        self.assertEqual([len(x) for x in api.calls], [50, 1])


if __name__ == '__main__':
    unittest.main()

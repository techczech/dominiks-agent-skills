import copy
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import zotero_enrich as enrich
import zotero_finder as finder
import zotero_execute as execute
from test_zotero import FakeAPI


def snapshot():
    return {'server_id':'fictional-server','api_version':'3','library':'users/0','includes_children':True,
        'collections':[{'key':'ABCDEFGH','data':{'key':'ABCDEFGH','version':1,'name':'Fictional Reading','parentCollection':False}}],
        'items':[{'key':'PARENTAA','data':{'key':'PARENTAA','version':1,'itemType':'journalArticle','title':'Fictional <study>',
          'DOI':'10.9999/demo','collections':['ABCDEFGH'],'tags':[{'tag':'User tag','type':1}]}},
          {'key':'USERNOTE','data':{'key':'USERNOTE','version':1,'itemType':'note','parentItem':'PARENTAA','note':'My untouched note'}}]}


def spec():
    return {'collections':[{'key':'ABCDEFGH','purpose':'Fictional methods reading','limits':'Not eligibility screening'}],
      'papers':[{'key':'PARENTAA','status':'source-backed','annotation':'Fictional annotation <script>unsafe</script>',
        'source':{'url':'https://example.org/fictional','locator':'Methods, page 2','access':'saved annotation'},
        'follow_up':['Check full paper'], 'features':[{'tag':'Tool used — Example Translator','kind':'empirical-use',
          'assessor':'Fictional assessor','evidence':{'source':'https://example.org/fictional','locator':'Methods, page 2','statement':'Explicitly states use','access':'saved annotation'}}]}]}


class EnrichmentTests(unittest.TestCase):
    def test_linked_notes_and_preserved_user_fields(self):
        s=snapshot(); p=enrich.prepare(spec(),s); self.assertFalse(p['blocked'])
        notes=[o['desired'] for o in p['operations'] if o['desired'].get('itemType')=='note']
        self.assertEqual(len(notes),2)
        paper=next(n for n in notes if n.get('parentItem'))
        overview=next(n for n in notes if not n.get('parentItem'))
        self.assertIn(overview['key'],paper['note']); self.assertIn(paper['key'],overview['note'])
        self.assertNotIn('<script>',paper['note']); self.assertIn('&lt;script&gt;',paper['note'])
        patch=next(o['desired'] for o in p['operations'] if o['action']=='update')
        self.assertEqual(set(patch),{'key','version','tags'})
        self.assertIn({'tag':'User tag','type':1},patch['tags'])
        api=FakeAPI(s)
        with tempfile.TemporaryDirectory() as td: execute.apply(api,p,Path(td)/'receipt.json')
        self.assertEqual(api.objects['USERNOTE']['note'],'My untouched note')

    def test_interrupted_notes_resume_and_exact_reuse(self):
        s=snapshot(); p=enrich.prepare(spec(),s); api=FakeAPI(s); api.lose_response=True
        with tempfile.TemporaryDirectory() as td:
            r=Path(td)/'r.json'
            with self.assertRaises(TimeoutError): execute.apply(api,p,r)
            execute.apply(api,p,r)
        updated={**s,'items':[{'key':k,'data':d} for k,d in api.objects.items()]}
        q=enrich.prepare(spec(),updated)
        self.assertFalse(q['blocked']); self.assertFalse(q['operations'])

    def test_existing_generated_edit_blocks_rebuild(self):
        s=snapshot(); p=enrich.prepare(spec(),s)
        notes=[o['desired'] for o in p['operations'] if o['desired'].get('itemType')=='note']
        for n in notes: s['items'].append({'key':n['key'],'data':{**n,'version':1}})
        s['items'][-1]['data']['note']='User edited generated note'
        self.assertTrue(enrich.prepare(spec(),s)['blocked'])

    def test_feature_evidence_and_guidance_not_interchangeable(self):
        for mutation in ('missing','guidance'):
            x=spec(); f=x['papers'][0]['features'][0]
            if mutation=='missing': f.pop('evidence')
            else: f['kind']='guidance'
            with self.assertRaises(ValueError): enrich.prepare(x,snapshot())

    def test_source_backed_annotation_needs_locator(self):
        x=spec(); x['papers'][0]['source'].pop('locator')
        with self.assertRaises(ValueError): enrich.prepare(x,snapshot())

    def test_incomplete_note_snapshot_rejected(self):
        s=snapshot(); s.pop('includes_children')
        with self.assertRaises(ValueError): enrich.prepare(spec(),s)

    def test_parent_removed_from_collection_stops_before_writes(self):
        s=snapshot(); p=enrich.prepare(spec(),s); api=FakeAPI(s)
        api.objects['PARENTAA']['collections']=[]
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaises(ValueError): execute.apply(api,p,Path(td)/'r.json')
        self.assertFalse(api.calls)

    def test_missing_feature_is_explicitly_unknown(self):
        x=spec(); x['papers'][0]['features']=[]
        p=enrich.prepare(x,snapshot()); text=str(p)
        self.assertIn('unknown or not assessed',text)

    def test_finder_running_snapshot_not_completion(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH'); after=copy.deepcopy(s)
        after['items'].append({'key':'PDFADDXX','data':{'key':'PDFADDXX','itemType':'attachment','parentItem':'PARENTAA','contentType':'application/pdf','md5':'fictional-md5'}})
        report=finder.report(job,after,{'selection':{'library':job['library'],'collection':job['collection'],'keys':job['selected_keys'],'evidence':'Fictional observed selection'},'state':'running','evidence':'Fictional progress window says Processing'})
        self.assertEqual(report['state'],'running'); self.assertEqual(len(report['added_attachments']),1)
        self.assertFalse(report['complete']); self.assertFalse(report['added_attachments'][0]['bytes_hash_verified'])

    def test_finder_requires_observed_completion_and_partition(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH')
        with self.assertRaises(ValueError): finder.report(job,s,{'state':'completed'})
        s['server_id']='other'
        with self.assertRaises(ValueError): finder.report(job,s,{'state':'running','evidence':'Fictional observation'})

    def test_finder_selection_mismatch_stops(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH')
        with self.assertRaises(ValueError): finder.verify_selection(job,{'library':'users/0','collection':'ABCDEFGH','keys':['OTHERAAA'],'evidence':'Fictional wrong selection'})

    def test_finder_changed_reference_is_not_complete(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH'); after=copy.deepcopy(s)
        after['items'][0]['data']['DOI']='10.9999/changed'
        r=finder.report(job,after,{'state':'completed','evidence':'Fictional queue finished','selection':{'library':job['library'],'collection':job['collection'],'keys':job['selected_keys'],'evidence':'Fictional observed selection'}})
        self.assertFalse(r['complete']); self.assertEqual(r['changed_parents'],['PARENTAA'])

    def test_finder_missing_collection_is_not_complete(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH'); after=copy.deepcopy(s); after['collections']=[]
        r=finder.report(job,after,{'state':'completed','evidence':'Fictional queue finished','selection':{'library':job['library'],'collection':job['collection'],'keys':job['selected_keys'],'evidence':'Fictional observed selection'}})
        self.assertFalse(r['complete']); self.assertTrue(r['changed_collection'])

    def test_finder_does_not_count_out_of_scope_pdf(self):
        s=snapshot(); job=finder.prepare(s,'ABCDEFGH'); after=copy.deepcopy(s)
        after['items'].append({'key':'PDFADDXX','data':{'key':'PDFADDXX','itemType':'attachment','parentItem':'OTHERAAA','contentType':'application/pdf'}})
        r=finder.report(job,after,{'selection':{'library':job['library'],'collection':job['collection'],'keys':job['selected_keys'],'evidence':'Fictional observed selection'},'state':'completed','evidence':'Fictional finder queue finished'})
        self.assertFalse(r['added_attachments']); self.assertEqual(r['out_of_scope_additions'],['PDFADDXX'])


if __name__=='__main__': unittest.main()

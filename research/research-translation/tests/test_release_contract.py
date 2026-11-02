"""Synthetic structural fixtures; never translations or reviewer scores."""
import hashlib, importlib.util, json, subprocess, sys, tempfile, unittest, zipfile
from pathlib import Path
from unittest.mock import patch
SCRIPT=Path(__file__).parents[1]/'scripts/verify_review_release.py'
def fixture(p):
 payload={'test_data':True,'language':'synthetic','material':'test-form','units':[{'id':'q1','text':'SYNTHETIC TEST DATA: stem','options':['SYNTHETIC TEST DATA: option 1','SYNTHETIC TEST DATA: option 2']}]}
 (p/'approved-source.json').write_text(json.dumps(payload))
 registry={};arms=[]
 for i,origin in enumerate(['professional','ai']):
  name=f'fixed-{i}.json';(p/name).write_text(json.dumps(payload))
  registry[f's{i}']={'origin':origin,'path':name,'sha256':hashlib.sha256((p/name).read_bytes()).hexdigest(),'evidence':'SYNTHETIC TEST DATA: supplied source receipt' if origin=='professional' else 'SYNTHETIC TEST DATA: frozen run record','model':'test-model' if origin=='ai' else None}
  receipt={'source_id':f's{i}','origin':origin,'candidate_sha256':registry[f's{i}']['sha256'],'approved_source_sha256':hashlib.sha256((p/'approved-source.json').read_bytes()).hexdigest(),'language':'synthetic','material':'test-form','model':registry[f's{i}']['model'],'evidence_reference':'SYNTHETIC TEST DATA: original delivery/run identity'}
  (p/f'lineage-{i}.json').write_text(json.dumps(receipt));registry[f's{i}']['evidence']=f'lineage-{i}.json'
  arms.append({'label':chr(65+i),'source_id':f's{i}'})
 return {'schema_version':1,'test_data':True,'package_id':'synthetic-test','language':'synthetic','material':'test-form','source_version':'synthetic-v1','source_path':'approved-source.json','source_sha256':hashlib.sha256((p/'approved-source.json').read_bytes()).hexdigest(),'required_origins':['professional','ai'],'units':[{'id':'q1','option_count':2}],'reviewer_instructions':'SYNTHETIC TEST DATA: do not collect scores','arms':arms},registry
class Release(unittest.TestCase):
 def setUp(self):
  spec=importlib.util.spec_from_file_location('gate',SCRIPT);self.g=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.g)
  self.tmp=tempfile.TemporaryDirectory();self.p=Path(self.tmp.name);self.c,self.r=fixture(self.p)
 def tearDown(self): self.tmp.cleanup()
 def build(self):return self.g.build(self.c,self.r,self.p,self.p/'release.zip')
 def refresh_candidate_hash(self, source_id):
  record=self.r[source_id]
  record['sha256']=hashlib.sha256((self.p/record['path']).read_bytes()).hexdigest()
  path=self.p/record['evidence'];lineage=json.loads(path.read_text())
  lineage['candidate_sha256']=record['sha256'];path.write_text(json.dumps(lineage))
 def cli_args(self, output, receipt):
  contract=self.p/'contract.json';registry=self.p/'registry.json'
  contract.write_text(json.dumps(self.c));registry.write_text(json.dumps(self.r))
  return [str(SCRIPT),'build','--contract',str(contract),'--registry',str(registry),'--workspace',str(self.p),'--output',str(output),'--receipt',str(receipt)]
 def reject_cli_collision(self, receipt):
  output=self.p/'release.zip'
  result=subprocess.run([sys.executable]+self.cli_args(output,receipt),capture_output=True,text=True)
  self.assertNotEqual(result.returncode,0,result.stdout)
  self.assertIn('Release blocked:',result.stderr)
  self.assertFalse(output.exists())
 def reject(self):
  with self.assertRaises(ValueError):self.build()
  self.assertFalse((self.p/'release.zip').exists())
 def test_valid_archive_identity_free_and_exact(self):
  receipt=self.build()
  with zipfile.ZipFile(self.p/'release.zip') as z:
   self.assertEqual(set(z.namelist()),{'review-candidates.json','reviewer-instructions.txt'})
   raw=z.read('review-candidates.json').decode();self.assertNotIn('professional',raw);self.assertNotIn('source_id',raw)
  self.assertEqual(receipt['state'],'prepared-and-archive-verified')
 def test_missing_professional(self):self.r['s0']['origin']='ai';self.reject()
 def test_missing_arm(self):self.c['arms'].pop();self.reject()
 def test_unknown_origin(self):self.r['s0']['origin']='provider';self.reject()
 def test_unknown_source(self):self.c['arms'][0]['source_id']='missing';self.reject()
 def test_display_key_cannot_override_origin(self):self.c['arms'][0]['origin']='professional';self.reject()
 def test_missing_source_evidence(self):self.r['s0']['evidence']='';self.reject()
 def test_false_professional_origin(self):self.r['s1']['origin']='professional';self.c['required_origins']=['professional','professional'];self.reject()
 def test_tampered_source_hash(self):(self.p/'fixed-0.json').write_text('{}');self.reject()
 def test_missing_option(self):
  q=json.loads((self.p/'fixed-0.json').read_text());q['units'][0]['options'].pop();(self.p/'fixed-0.json').write_text(json.dumps(q));self.refresh_candidate_hash('s0')
  with self.assertRaisesRegex(ValueError,'Option structure mismatch'):self.build()
  self.assertFalse((self.p/'release.zip').exists())
 def test_missing_unit(self):self.c['units'].append({'id':'q2','option_count':0});self.reject()
 def test_tampered_approved_source(self):(self.p/'approved-source.json').write_text('{}');self.reject()
 def test_wrong_language(self):self.c['language']='wrong';self.reject()
 def test_empty_units(self):self.c['units']=[];self.reject()
 def test_duplicate_candidate(self):self.c['arms'][1]['source_id']='s0';self.reject()
 def test_internal_payload_field(self):
  q=json.loads((self.p/'fixed-0.json').read_text());q['private_key']='hidden';(self.p/'fixed-0.json').write_text(json.dumps(q));self.refresh_candidate_hash('s0')
  with self.assertRaisesRegex(ValueError,'Unexpected field'):self.build()
  self.assertFalse((self.p/'release.zip').exists())
 def test_cli_refuses_same_archive_and_receipt(self):self.reject_cli_collision(self.p/'release.zip')
 def test_cli_valid_archive_and_receipt_match(self):
  output=self.p/'release.zip';receipt=self.p/'receipt.json'
  result=subprocess.run([sys.executable]+self.cli_args(output,receipt),capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
  record=json.loads(receipt.read_text())
  self.assertEqual(record['state'],'prepared-and-archive-verified')
  self.assertEqual(self.g.inspect_attachment(output,record)['state'],'attachment-bytes-verified')
  self.assertTrue(zipfile.is_zipfile(output))
 def test_cli_refuses_lexical_alias_of_archive(self):
  (self.p/'alias').mkdir();self.reject_cli_collision(self.p/'alias/../release.zip')
 def test_cli_refuses_symlinked_parent_alias_of_archive(self):
  (self.p/'alias').symlink_to(self.p,target_is_directory=True)
  self.reject_cli_collision(self.p/'alias/release.zip')
 def test_cli_refuses_receipt_symlink_before_output(self):
  receipt=self.p/'receipt.json';target=self.p/'unrelated.json';receipt.symlink_to(target)
  self.reject_cli_collision(receipt);self.assertTrue(receipt.is_symlink());self.assertFalse(target.exists())
 def test_cli_refuses_nested_receipt_under_archive(self):self.reject_cli_collision(self.p/'release.zip/receipt.json')
 def test_cli_does_not_overwrite_raced_in_receipt(self):
  output=self.p/'release.zip';receipt=self.p/'receipt.json';original_build=self.g.build
  def interfering_build(*args):
   result=original_build(*args);receipt.write_text('concurrent owner data');return result
  with patch.object(sys,'argv',self.cli_args(output,receipt)),patch.object(self.g,'build',interfering_build):
   with self.assertRaises(SystemExit) as error:self.g.main()
  self.assertNotEqual(error.exception.code,0)
  self.assertEqual(receipt.read_text(),'concurrent owner data')
  self.assertTrue(zipfile.is_zipfile(output))
 def test_path_outside_workspace(self):self.r['s0']['path']='../outside.json';self.reject()
 def test_refuse_overwrite(self):self.build();self.assertRaises(ValueError,self.build)
 def test_legacy_copier_requires_internal_staging(self):
  helper=SCRIPT.parent/'prepare_feedback_request.py'
  args=['python3',str(helper),'--project-dir',str(self.p),'--reviewer-code','test-only','--out-dir',str(self.p/'staging')]
  r=subprocess.run(args,capture_output=True,text=True);self.assertNotEqual(r.returncode,0);self.assertFalse((self.p/'staging').exists())
  r=subprocess.run(args+['--internal-staging'],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stderr)
 def test_attachment_readback(self):
  receipt=self.build();self.assertEqual(self.g.inspect_attachment(self.p/'release.zip',receipt)['state'],'attachment-bytes-verified')
 def test_tampered_attachment(self):
  receipt=self.build();(self.p/'release.zip').write_bytes(b'bad');self.assertRaises(ValueError,self.g.inspect_attachment,self.p/'release.zip',receipt)
if __name__=='__main__':unittest.main(verbosity=2)

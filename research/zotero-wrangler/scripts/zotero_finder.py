"""Plan native UI retrieval and report observed progress plus API attachment deltas."""
from zotero_plan import digest, resolve_collection, identity_doi, normal_title
from zotero_client import validate_library


def prepare(snapshot, collection, selected_keys=None):
    if not snapshot.get('includes_children'): raise ValueError('Finder baseline needs --all-items to compare attachments')
    library=validate_library(snapshot['library']); ck=resolve_collection(snapshot['collections'],collection)
    parents={x['key']:x['data'] for x in snapshot['items'] if x['data'].get('itemType') not in ('note','attachment') and ck in x['data'].get('collections',[])}
    selected=selected_keys if selected_keys is not None else sorted(parents)
    if not selected or len(set(selected))!=len(selected) or not set(selected)<=set(parents): raise ValueError('Finder selection must be nonempty, unique and within the selected collection')
    job={'format':1,'server_id':snapshot.get('server_id'),'library':library,'collection':ck,
         'collection_name':next(c['data']['name'] for c in snapshot['collections'] if c['key']==ck),
         'identities':{k:{'DOI':identity_doi(parents[k]),'title':parents[k].get('title','')} for k in selected},
         'selected_keys':selected,'titles':{k:parents[k].get('title','') for k in selected},
         'before_attachment_keys':[x['key'] for x in snapshot['items'] if x['data'].get('itemType')=='attachment'],
         'mechanism':'native app menu via computer use','state':'prepared-not-started'}
    job['digest']=digest(job); return job


def verify_selection(job, selection):
    if not isinstance(selection,dict) or selection.get('library')!=job['library'] or selection.get('collection')!=job['collection'] or set(selection.get('keys',[]))!=set(job['selected_keys']) or len(selection.get('keys',[]))!=len(job['selected_keys']) or not selection.get('evidence'):
        raise ValueError('Observed UI selection must match the exact scoped references and collection')


def report(job, after, observation):
    if job.get('digest')!=digest({k:v for k,v in job.items() if k!='digest'}): raise ValueError('Finder job changed')
    if not after.get('includes_children') or after.get('server_id')!=job['server_id'] or after['library']!=job['library']: raise ValueError('Finder snapshot partition/completeness mismatch')
    state=observation.get('state')
    if state not in ('prepared','running','completed','blocked','cancelled') or not observation.get('evidence'):
        raise ValueError('Record observed UI state and evidence; never infer completion from counts')
    if state in ('running','completed','cancelled'): verify_selection(job,observation.get('selection'))
    selected=set(job['selected_keys']); before=set(job['before_attachment_keys']); additions=[]; outside=[]
    checks={c['key']:c for c in observation.get('identity_checks',[])}
    for obj in after['items']:
        d=obj['data']; k=obj['key']
        if d.get('itemType')!='attachment' or k in before: continue
        if d.get('parentItem') not in selected: outside.append(k); continue
        check=checks.get(k,{})
        if check and (check.get('parent')!=d.get('parentItem') or check.get('decision') not in ('consistent','mismatch','unresolved') or not check.get('evidence')):
            raise ValueError('Document identity check requires matching parent, decision and evidence')
        additions.append({'key':k,'parent':d['parentItem'],'content_type':d.get('contentType'),
            'reported_md5':d.get('md5'),'bytes_hash_verified':False,'identity_status':check.get('decision','pending'),
            'identity_evidence':check.get('evidence','')})
    present={x['key']:x['data'] for x in after['items']}
    missing=sorted(selected-set(present))
    changed=[]
    collection_matches=[c for c in after['collections'] if c['key']==job['collection']]
    changed_collection=len(collection_matches)!=1 or collection_matches[0]['data']['name']!=job['collection_name']
    for k in selected-set(missing):
        d=present[k]; i=job['identities'][k]
        same=identity_doi(d)==i['DOI'] if i['DOI'] else normal_title(d.get('title'))==normal_title(i['title'])
        if d.get('itemType') in ('note','attachment') or job['collection'] not in d.get('collections',[]) or not same: changed.append(k)
    with_pdf={x['data'].get('parentItem') for x in after['items'] if x['data'].get('itemType')=='attachment' and x['data'].get('contentType')=='application/pdf' and x['data'].get('parentItem') in selected}
    return {'state':state,'complete':state=='completed' and not missing and not changed and not changed_collection,'ui_evidence':observation['evidence'],
        'selected_references':len(selected),'papers_with_pdf':len(with_pdf),'missing_parents':missing,'changed_parents':sorted(changed),'changed_collection':changed_collection,
        'attachments_identity_checked':all(a['identity_status']=='consistent' for a in additions),
        'added_attachments':additions,'out_of_scope_additions':outside,'retrieval_success_is_not_appraisal':True,
        'limits':'UI completion is an observed claim, not an API inference. New attachments require document/version review; reported MD5 is metadata, not verified file bytes.'}

"""Linked notes and additive feature coding from explicit evidence decisions."""
import html
from urllib.parse import urlsplit
from zotero_plan import digest, new_key, identity_doi, list_unique, KEY_ALPHABET
from zotero_client import validate_library

PAPER_ROLE = 'Wrangler paper reading note'
OVERVIEW_ROLE = 'Wrangler collection overview'


def key(value):
    if not isinstance(value,str) or len(value)!=8 or any(c not in KEY_ALPHABET for c in value): raise ValueError('Invalid Zotero object key')
    return value


def item_link(library, item):
    validate_library(library); key(item)
    prefix='library' if library=='users/0' else library
    return 'zotero://select/'+prefix+'/items/'+item


def evidence(value):
    if not isinstance(value,dict) or not value.get('source') or not value.get('locator') or not value.get('statement') or value.get('access') not in ('full-text','abstract','saved annotation','user rule'):
        raise ValueError('Feature evidence requires source, locator, statement and explicit access basis')
    return value


def feature(value):
    if not isinstance(value,dict) or not value.get('assessor'): raise ValueError('Feature decision requires an assessor')
    kind=value.get('kind'); tag=value.get('tag','')
    if kind not in ('empirical-use','guidance'): raise ValueError('Only explicitly assessed positive use/guidance decisions become tags')
    prefixes=('Tool used — ','Method used — ','Reviewers — ','Outcome — ','Evaluation — ','Language tested — ','Comparator — ','Caution — ','Model reporting — ')
    if (kind=='guidance' and not tag.startswith('Guidance — ')) or (kind=='empirical-use' and not tag.startswith(prefixes)):
        raise ValueError('Guidance and empirical-use tag categories must stay distinct')
    evidence(value.get('evidence')); return value


def source_text(source):
    if not isinstance(source,dict) or not source.get('locator') or not source.get('access') or not source.get('url'):
        raise ValueError('Source-backed annotation requires URL, locator and access basis')
    u=urlsplit(source['url'])
    if u.scheme not in ('http','https') or not u.hostname or u.username or u.password: raise ValueError('Source URL must be public HTTP(S)')
    return '<p>Source: <a href="'+html.escape(source['url'],quote=True)+'">publication/evidence</a>; '+html.escape(source['locator'])+'; access: '+html.escape(source['access'])+'.</p>'


def prepare(spec, snapshot):
    if not snapshot.get('includes_children'): raise ValueError('Enrichment needs a complete --all-items snapshot to preserve/reuse notes')
    library=validate_library(snapshot['library']); items={i['key']:i['data'] for i in snapshot['items']}
    collections={c['key']:c['data'] for c in snapshot['collections']}
    papers=spec.get('papers',[]); scopes=spec.get('collections',[])
    if not papers or not scopes: raise ValueError('Provide explicit papers and collection overviews')
    if len({p['key'] for p in papers})!=len(papers) or len({c['key'] for c in scopes})!=len(scopes): raise ValueError('Repeated enrichment scope keys')
    p={'format':1,'server_id':snapshot.get('server_id'),'api_version':snapshot.get('api_version'),
       'library':library,'operations':[],'blocked':[],'warnings':[],'requires':[],'purpose':'linked-notes-and-features'}
    note_keys={}; overview_keys={}; generated={}; notes=[(k,d) for k,d in items.items() if d.get('itemType')=='note']
    for c in scopes:
        k=key(c['key'])
        if k not in collections or not c.get('purpose') or not c.get('limits'): raise ValueError('Overview requires existing collection, purpose and limits')
        matches=[nk for nk,d in notes if not d.get('parentItem') and k in d.get('collections',[]) and any(t.get('tag')==OVERVIEW_ROLE for t in d.get('tags',[]))]
        if len(matches)>1: p['blocked'].append({'key':k,'reason':'Multiple generated overview notes'}); continue
        overview_keys[k]=matches[0] if matches else new_key()
        p['requires'].append({'endpoint':'collections','key':k,'fields':{'name':collections[k]['name']}})
    for row in papers:
        k=key(row['key']); d=items.get(k)
        if not d or d.get('itemType') in ('note','attachment'): raise ValueError('Reading-note parent must be an existing reference')
        if row.get('status') not in ('preliminary','source-backed'): raise ValueError('Use preliminary or source-backed note status')
        if row['status']=='source-backed': source_text(row.get('source'))
        if row.get('annotation') and row['status']=='preliminary': raise ValueError('Annotation requires source-backed status and access limits')
        for f in row.get('features',[]): feature(f)
        memberships=[c['key'] for c in scopes if c['key'] in d.get('collections',[])]
        if not memberships: raise ValueError('Each selected paper must belong to a selected collection')
        matches=[nk for nk,n in notes if n.get('parentItem')==k and any(t.get('tag')==PAPER_ROLE for t in n.get('tags',[]))]
        if len(matches)>1: p['blocked'].append({'key':k,'reason':'Multiple generated reading notes'}); continue
        note_keys[k]=matches[0] if matches else new_key()
        req={'endpoint':'items','key':k,'collections':memberships,'identity':{'DOI':identity_doi(d),'title':d.get('title','')}}
        p['requires'].append(req)
    if p['blocked']: p['digest']=digest(p); return p
    esc=html.escape
    def link(k,label): return '<a href="'+item_link(library,k)+'">'+esc(label)+'</a>'
    for row in papers:
        k=row['key']; d=items[k]; memberships=[c for c in scopes if c['key'] in d.get('collections',[])]
        body='<div><h1>Reading note — '+esc(d.get('title',''))+'</h1><p>Note status: '+row['status']+'. Reading guidance, not eligibility or study-quality appraisal.</p><p>'+link(k,'Select paper and attachments')+'</p>'
        if row['status']=='source-backed': body+='<h2>Source-backed annotation</h2><p>'+esc(row.get('annotation',''))+'</p>'+source_text(row['source'])
        else: body+='<p>Preliminary candidate: full-paper appraisal pending.</p>'
        if row.get('provenance'):
            import json
            body+='<h2>Search/source provenance</h2><p>'+esc(json.dumps(row['provenance'],ensure_ascii=False,sort_keys=True))+'</p>'
        if row.get('reading_priority'):
            from zotero_plan import clean_record
            priority=row['reading_priority']; clean_record({'title':d.get('title','Reference'),'priority':priority})
            body+='<p>Reading priority '+str(priority['value'])+'/5; '+esc(priority['basis'])+'. '+esc(priority['evidence'])+'. Not study quality.</p>'
        if row.get('availability'):
            import json
            body+='<h2>Data/code availability</h2><p>'+esc(json.dumps(row['availability'],ensure_ascii=False,sort_keys=True))+'</p><p>Availability does not establish reproducibility; no experiment execution is implied.</p>'
        if d.get('abstractNote'):
            body+='<h2>Existing stored abstract</h2><p>'+esc(d['abstractNote'])+'</p><p>Existing library text retained; source provenance must be checked before citation.</p>'
        body+='<h2>Assessed features</h2>'
        fs=row.get('features',[])
        if fs:
            body+='<ul>'+''.join('<li>'+esc(f['tag'])+'; '+esc(f['kind'])+'. Evidence: '+esc(f['evidence']['statement'])+'; '+esc(f['evidence']['source'])+'; '+esc(f['evidence']['locator'])+'. Access: '+esc(f['evidence']['access'])+'. Assessor: '+esc(f['assessor'])+'.</li>' for f in fs)+'</ul>'
        body+='<p>Missing feature tags mean unknown or not assessed. Guidance recommendations do not establish empirical use.</p>'
        body+='<h2>Outstanding checks</h2><ul>'+''.join('<li>'+esc(t)+'</li>' for t in row.get('follow_up',[]))+'</ul>'
        body+='<h2>Collection overviews</h2><ul>'+''.join('<li>'+link(overview_keys[c['key']],collections[c['key']]['name'])+'</li>' for c in memberships)+'</ul></div>'
        nk=note_keys[k]; generated[nk]={'key':nk,'version':0,'itemType':'note','parentItem':k,'note':body,'collections':[],'tags':[{'tag':PAPER_ROLE}], 'relations':{}}
        tags=list_unique(d.get('tags',[])+[{'tag':f['tag']} for f in fs if f['tag'] not in {t['tag'] for t in d.get('tags',[])}])
        if tags!=d.get('tags',[]): p['operations'].append({'endpoint':'items','action':'update','identity':req_identity(d),'desired':{'key':k,'version':d['version'],'tags':tags}})
    for c in scopes:
        ck=c['key']; members=[r for r in papers if ck in items[r['key']].get('collections',[])]
        total=sum(ck in d.get('collections',[]) and d.get('itemType') not in ('note','attachment') for d in items.values())
        body='<div><h1>Overview — '+esc(collections[ck]['name'])+'</h1><p>'+esc(c['purpose'])+'</p><p>Limits: '+esc(c['limits'])+'</p><p>Scoped notes: '+str(len(members))+' of '+str(total)+' collection references. Membership may overlap other collections.</p><ul>'
        body+=''.join('<li>'+link(note_keys[r['key']],items[r['key']].get('title',''))+' — '+r['status']+'.</li>' for r in members)+'</ul><p>Missing feature tags mean unknown or not assessed. Acquiring a PDF does not appraise its methods.</p></div>'
        nk=overview_keys[ck]; generated[nk]={'key':nk,'version':0,'itemType':'note','note':body,'collections':[ck],'tags':[{'tag':OVERVIEW_ROLE}], 'relations':{}}
    note_ops=[]
    for nk,n in generated.items():
        old=items.get(nk)
        if old:
            if old.get('note')!=n['note'] or old.get('parentItem')!=n.get('parentItem') or not set(n['collections'])<=set(old.get('collections',[])):
                p['blocked'].append({'key':nk,'reason':'Generated note differs or was edited; preserve and review'}); continue
            
            p['requires'].append({'endpoint':'items','key':nk,'fields':{'note':old['note'],'parentItem':old.get('parentItem')},'collections':n['collections']})
        else:
            note_ops.append({'endpoint':'items','action':'create','note_identity':{'role':n['tags'][0]['tag'],'parentItem':n.get('parentItem'),'collections':n['collections']},'desired':n})
    p['operations']=note_ops+p['operations']
    p['digest']=digest(p); return p


def req_identity(data):
    return {'DOI':identity_doi(data),'title':data.get('title','')}

"""Offline reviewable plans. Identity matching is deliberately conservative."""
import copy
import csv
import hashlib
import html
import json
import re
import secrets
import string
import unicodedata
from pathlib import Path
from urllib.parse import unquote

KEY_ALPHABET = ''.join(str(n) for n in range(2, 10)) + string.ascii_uppercase.replace('O', '')


def new_key():
    return ''.join(secrets.choice(KEY_ALPHABET) for _ in range(8))


def doi(value):
    return unquote(re.sub(r'^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)', '',
                         str(value or '').strip(), flags=re.I)).casefold()


def normal_title(value):
    value = html.unescape(re.sub(r'<[^>]+>', ' ', value or ''))
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', value).casefold()).strip()


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                   separators=(',', ':')).encode()).hexdigest()


def load_records(path):
    """Keep raw exports in provenance; format adapters never silently drop them."""
    path = Path(path); text = path.read_text(encoding='utf-8-sig')
    suffix = path.suffix.lower()
    if suffix == '.json':
        rows = json.loads(text)
        if not isinstance(rows, list):
            raise ValueError('JSON input must be an array of records')
    elif suffix == '.csv':
        rows = list(csv.DictReader(text.splitlines()))
        for row in rows:
            for field in ('provenance', 'creators', 'tags', 'topics', 'priority', 'relevance', 'availability'):
                if row.get(field): row[field] = json.loads(row[field])
                else: row.pop(field, None)
    elif suffix in ('.bib', '.bibtex'):
        try:
            import bibtexparser
            from bibtexparser.bparser import BibTexParser
        except ImportError:
            raise ValueError('BibTeX requires optional bibtexparser>=1.4,<2') from None
        parser = BibTexParser(ignore_nonstandard_types=False)
        entries = parser.parse(text, partial=False).entries
        types = {'article': 'journalArticle', 'book': 'book', 'inproceedings': 'conferencePaper',
                 'incollection': 'bookSection', 'phdthesis': 'thesis', 'mastersthesis': 'thesis',
                 'techreport': 'report', 'misc': 'document', 'unpublished': 'manuscript'}
        rows = []
        for e in entries:
            if e['ENTRYTYPE'] not in types:
                raise ValueError('Unsupported BibTeX type: ' + e['ENTRYTYPE'])
            row = {'title': e.get('title', ''), 'DOI': e.get('doi', ''), 'date': e.get('year', ''),
                   'url': e.get('url', ''), 'itemType': types[e['ENTRYTYPE']],
                   'creators': [{'creatorType': 'author', 'name': a.strip()}
                                for a in e.get('author', '').split(' and ') if a.strip()],
                   'provenance': [{'source': 'BibTeX export', 'source_id': e['ID'], 'raw': e}],
                   'adapter_review': 'BibTeX author strings retained as single-field names; review LaTeX and family names'}
            if e.get('abstract'):
                row.update(abstractNote=e['abstract'], abstract_source='provided BibTeX export')
            rows.append(row)
    elif suffix == '.ris':
        try: import rispy
        except ImportError: raise ValueError('RIS requires optional rispy>=0.9,<1') from None
        entries = rispy.loads(text)
        types = {'JOUR': 'journalArticle', 'BOOK': 'book', 'CHAP': 'bookSection',
                 'CONF': 'conferencePaper', 'CPAPER': 'conferencePaper', 'THES': 'thesis',
                 'RPRT': 'report', 'GEN': 'document', 'ELEC': 'webpage'}
        rows = []
        for e in entries:
            if e.get('type_of_reference') not in types: raise ValueError('Unsupported RIS type')
            row = {'title': e.get('title') or e.get('primary_title', ''), 'DOI': e.get('doi', ''),
                   'date': e.get('year') or e.get('publication_year', ''),
                   'itemType': types[e['type_of_reference']],
                   'url': (e.get('urls') or [''])[0],
                   'creators': [{'creatorType': 'author', 'name': a} for a in e.get('authors', [])],
                   'provenance': [{'source': 'RIS export', 'raw': e}],
                   'adapter_review': 'RIS author strings retained as single-field names; review mapped fields'}
            if e.get('abstract'): row.update(abstractNote=e['abstract'], abstract_source='provided RIS export')
            rows.append(row)
    else: raise ValueError('Use CSV, JSON, BibTeX or RIS')
    if not rows: raise ValueError('No input records parsed')
    for i, row in enumerate(rows):
        if not isinstance(row, dict): raise ValueError('Every record must be an object')
        row.setdefault('provenance', []).append({'source': 'input export', 'row': i + 1,
                                               'input_sha256': hashlib.sha256(text.encode()).hexdigest()})
    return rows


def resolve_collection(collections, selector):
    hits = [c for c in collections if c['key'] == selector or c['data']['name'] == selector]
    if len(hits) != 1: raise ValueError('Collection selector must resolve exactly once; use a key for ambiguity')
    return hits[0]['key']


def clean_record(row):
    r = copy.deepcopy(row)
    if not isinstance(r.get('title'), str) or not r['title'].strip(): raise ValueError('Title required')
    r['DOI'] = doi(r.get('DOI', r.get('doi', '')))
    if r['DOI'] and not re.fullmatch(r'10\.\d{4,9}/\S+', r['DOI']): raise ValueError('Malformed DOI')
    if r.get('abstractNote') and not r.get('abstract_source'): raise ValueError('Abstract requires source provenance')
    if r.get('abstract_source') and not r.get('abstractNote'): raise ValueError('Abstract source requires corresponding abstract text')
    for topic in r.get('topics', []):
        if not isinstance(topic, dict) or not topic.get('name') or topic.get('basis') not in ('search-stream', 'model judgement', 'user rule'):
            raise ValueError('Topic requires name and explicit basis')
    priority = r.get('priority')
    if priority:
        if priority.get('value') not in (1, 2, 3, 4, 5) or priority.get('basis') not in ('title-only provisional', 'abstract judgement', 'full-text judgement', 'user rule') or not priority.get('evidence'):
            raise ValueError('Priority requires 1–5, judgement/user basis and evidence; never keyword quality scoring')
    if r.get('relevance'):
        v = r['relevance']
        if not isinstance(v, dict) or not v.get('label') or not v.get('evidence') or v.get('basis') not in ('title-only provisional', 'abstract judgement', 'full-text judgement', 'user rule'):
            raise ValueError('Relevance requires label, evidence and explicit judgement/user basis')
    if r.get('availability') and not isinstance(r['availability'], dict): raise ValueError('Availability must be an evidence object')
    return r


def identity_doi(data):
    value = data.get('DOI', '')
    if not value:
        match = re.search(r'^DOI:\s*(.+)$', data.get('extra', ''), re.M | re.I)
        value = match[1] if match else ''
    return doi(value)


def prepare(records, snapshot, collection):
    target = resolve_collection(snapshot['collections'], collection)
    plan = {'format': 1, 'server_id': snapshot.get('server_id'), 'api_version': snapshot.get('api_version'),
            'library': snapshot['library'], 'collection': target, 'operations': [], 'blocked': [], 'warnings': []}
    merged = []; by_doi = {}
    for raw in records:
        r = clean_record(raw); d = r['DOI']
        if d and (d.endswith(('.', ',', ';')) or d.count('(') != d.count(')')):
            plan['blocked'].append({'title': r['title'], 'reason': 'DOI punctuation uncertain; verify primary metadata, do not strip blindly'})
            continue
        if d and d in by_doi:
            prior = by_doi[d]
            for field in ('title', 'date', 'itemType', 'abstractNote'):
                if prior.get(field) and r.get(field) and prior[field] != r[field]:
                    plan['blocked'].append({'title': r['title'], 'reason': 'Conflicting same-DOI source fields: ' + field})
            for field in ('provenance', 'tags', 'topics'):
                prior[field] = list_unique(prior.get(field, []) + r.get(field, []))
            for field in ('creators', 'relevance', 'availability', 'url', 'publicationTitle', 'volume', 'issue', 'pages', 'publisher'):
                if prior.get(field) and r.get(field) and prior[field] != r[field]:
                    plan['blocked'].append({'title': r['title'], 'reason': 'Conflicting same-DOI source fields: ' + field})
            if prior.get('priority') != r.get('priority') and r.get('priority'):
                if prior.get('priority'):
                    plan['blocked'].append({'title': r['title'], 'reason': 'Conflicting duplicate priority decisions'})
            for field in ('date', 'itemType', 'creators', 'abstractNote', 'abstract_source', 'availability',
                          'priority', 'relevance', 'url', 'publicationTitle', 'volume', 'issue', 'pages', 'publisher'):
                if not prior.get(field) and r.get(field): prior[field] = copy.deepcopy(r[field])
            continue
        merged.append(r)
        if d: by_doi[d] = r
    existing = [i for i in snapshot['items'] if i['data'].get('itemType') not in ('note', 'attachment')]
    titles = {}
    for r in merged:
        t = normal_title(r['title'])
        if t in titles and titles[t] != r['DOI']:
            plan['warnings'].append({'title': r['title'], 'reason': 'Same title, distinct DOI/version; kept separate, relation requires judgement'})
        elif t in titles and not r['DOI']:
            plan['blocked'].append({'title': r['title'], 'reason': 'Repeated title without DOI needs identity review'})
        titles[t] = r['DOI']
    children = [c for c in snapshot['collections'] if c['data'].get('parentCollection') == target]
    topic_keys = {}
    for r in merged:
        for topic in r.get('topics', []):
            name = topic['name']
            if name in topic_keys: continue
            matches = [c for c in children if c['data']['name'] == name]
            if len(matches) > 1: raise ValueError('Ambiguous topic subcollection')
            if matches: topic_keys[name] = matches[0]['key']
            else:
                key = new_key(); topic_keys[name] = key
                plan['operations'].append({'endpoint': 'collections', 'action': 'create',
                    'desired': {'key': key, 'version': 0, 'name': name, 'parentCollection': target}})
    for r in merged:
        matches = [i for i in existing if r['DOI'] and identity_doi(i['data']) == r['DOI']]
        title_matches = [i for i in existing if normal_title(i['data'].get('title')) == normal_title(r['title'])]
        if len(matches) > 1:
            plan['blocked'].append({'title': r['title'], 'reason': 'Ambiguous existing DOI', 'keys': [i['key'] for i in matches]}); continue
        if not matches and any(not r['DOI'] or not identity_doi(i['data']) for i in title_matches):
            plan['blocked'].append({'title': r['title'], 'reason': 'Title-only identity candidate requires review', 'keys': [i['key'] for i in title_matches]}); continue
        if not matches and title_matches:
            plan['warnings'].append({'title': r['title'], 'reason': 'Different DOI with matching existing title; preserve publication version'})
        old = matches[0]['data'] if matches else {}
        if matches and r.get('priority'):
            expected_priority = f"Reading priority {r['priority']['value']}/5"
            if any(t['tag'].startswith('Reading priority ') and t['tag'] != expected_priority for t in old.get('tags', [])):
                plan['blocked'].append({'title': r['title'], 'reason': 'Existing reading priority conflicts; resolve before adding'}); continue
        key = matches[0]['key'] if matches else new_key()
        tags = copy.deepcopy(old.get('tags', [])); names = {t['tag'] for t in tags}
        added = [t if isinstance(t, dict) else {'tag': t} for t in r.get('tags', [])]
        added += [{'tag': 'Topic basis — ' + t['basis']} for t in r.get('topics', [])]
        if r.get('priority'):
            p = r['priority']; added += [{'tag': f"Reading priority {p['value']}/5"}, {'tag': 'Priority basis — ' + p['basis']}]
        if r.get('relevance'): added += [{'tag': 'Relevance — ' + r['relevance']['label']}, {'tag': 'Relevance basis — ' + r['relevance']['basis']}]
        for tag in added:
            if not isinstance(tag.get('tag'), str): raise ValueError('Tag must contain text')
            if tag['tag'] not in names: tags.append(tag); names.add(tag['tag'])
        evidence = {f: r[f] for f in ('provenance', 'topics', 'priority', 'relevance', 'availability', 'abstract_source', 'adapter_review') if r.get(f)}
        note = 'Import provenance: ' + json.dumps(evidence, ensure_ascii=False, sort_keys=True)
        desired = {'key': key, 'version': old.get('version', 0), 'tags': tags,
                   'collections': list_unique(old.get('collections', []) + [target] + [topic_keys[t['name']] for t in r.get('topics', [])]),
                   'extra': old.get('extra', '') + ('\n\n' if old.get('extra') else '') + note}
        if not matches:
            desired.update({k: r[k] for k in ('title', 'date', 'DOI', 'url', 'creators', 'publicationTitle', 'volume', 'issue', 'pages', 'publisher') if r.get(k)})
            desired['itemType'] = r.get('itemType', 'journalArticle')
        if r.get('abstractNote') and not old.get('abstractNote'):
            desired['abstractNote'] = r['abstractNote']
        plan['operations'].append({'endpoint': 'items', 'action': 'update' if matches else 'create',
            'identity': {'DOI': r['DOI'], 'title': r['title']}, 'desired': desired})
    plan['digest'] = digest(plan)
    return plan


def list_unique(values):
    result = []
    for v in values:
        if v not in result: result.append(v)
    return result

#!/usr/bin/env python3
"""Build identity-free fixed JSON review archives from an explicit origin contract.
Standard library only. Does not translate, judge semantic equivalence, or send files.
"""
import argparse
import hashlib
import json
from pathlib import Path
import tempfile
import zipfile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def keys(record, allowed, required=None):
    require(isinstance(record, dict), 'Expected object')
    require(set(record) <= set(allowed), 'Unexpected field; do not leak private metadata')
    require(set(required or allowed) <= set(record), 'Missing required field')


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def build(contract, registry, workspace, output):
    workspace, output = Path(workspace).resolve(), Path(output)
    require(not output.exists(), 'Refusing overwrite')
    keys(contract, ['schema_version','test_data','package_id','language','material','source_version','source_path','source_sha256','required_origins','units','reviewer_instructions','arms'])
    require(contract['schema_version'] == 1 and isinstance(contract['test_data'],bool), 'Unsupported schema/test-data flag')
    for name in ['package_id','language','material','source_version','reviewer_instructions']:
        require(nonempty(contract[name]), f'Missing {name}')
    require(isinstance(contract['source_sha256'],str) and len(contract['source_sha256']) == 64 and all(c in '0123456789abcdef' for c in contract['source_sha256']), 'Invalid frozen source hash')
    required = contract['required_origins']
    require(isinstance(required,list) and bool(required) and set(required) <= {'professional','ai','user-supplied'}, 'Invalid required origins')
    expected = {}
    for unit in contract['units']:
        keys(unit,['id','option_count'])
        require(nonempty(unit['id']) and unit['id'] not in expected, 'Duplicate/missing unit ID')
        require(type(unit['option_count']) is int and unit['option_count'] >= 0, 'Invalid option count')
        expected[unit['id']] = unit['option_count']
    require(bool(expected), 'No units')
    source=(workspace/contract['source_path']).resolve()
    require(source.is_relative_to(workspace) and source.is_file(),'Approved source missing or outside workspace')
    require(digest(source.read_bytes())==contract['source_sha256'],'Approved source hash mismatch')
    frozen=json.loads(source.read_bytes())
    keys(frozen,['test_data','language','material','units'])
    require(frozen['test_data'] is contract['test_data'] and frozen['material']==contract['material'],'Approved source scope mismatch')
    frozen_units={}
    for unit in frozen['units']:
        keys(unit,['id','text','options'])
        require(nonempty(unit['text']) and unit['id'] not in frozen_units,'Invalid approved source unit')
        require(isinstance(unit['options'],list) and all(nonempty(o) for o in unit['options']),'Invalid approved source options')
        frozen_units[unit['id']]=len(unit['options'])
    require(frozen_units==expected,'Contract units do not match approved source structure')
    arms=[]; origins=[];labels=set();source_ids=set();source_hashes={}
    for arm in contract['arms']:
        keys(arm,['label','source_id'])
        require(nonempty(arm['label']) and arm['label'] not in labels, 'Duplicate/missing label')
        require(arm['source_id'] not in source_ids and arm['source_id'] in registry, 'Missing/duplicate source resolver')
        labels.add(arm['label']);source_ids.add(arm['source_id'])
        record=registry[arm['source_id']]
        keys(record,['origin','path','sha256','evidence','model'])
        require(record['origin'] in {'professional','ai','user-supplied'}, 'Unrecognised origin')
        require(nonempty(record['evidence']), 'Source receipt/run provenance required')
        if record['origin']=='ai': require(nonempty(record['model']), 'AI model provenance required')
        source=(workspace/record['path']).resolve()
        require(source.is_relative_to(workspace) and source.is_file(), 'Source missing or outside workspace')
        evidence_path=(workspace/record['evidence']).resolve()
        require(evidence_path.is_relative_to(workspace) and evidence_path.is_file(), 'Lineage receipt missing/outside workspace')
        lineage=json.loads(evidence_path.read_bytes())
        keys(lineage,['source_id','origin','candidate_sha256','approved_source_sha256','language','material','model','evidence_reference'])
        require(nonempty(lineage['evidence_reference']), 'Original delivery/run reference required')
        for field,value in {'source_id':arm['source_id'],'origin':record['origin'],'candidate_sha256':record['sha256'],'approved_source_sha256':contract['source_sha256'],'language':contract['language'],'material':contract['material'],'model':record['model']}.items():
            require(lineage[field]==value, f'Lineage conflict: {field}')
        raw=source.read_bytes()
        require(digest(raw)==record['sha256'], 'Fixed candidate hash mismatch')
        payload=json.loads(raw)
        keys(payload,['test_data','language','material','units'])
        require(payload['test_data'] is contract['test_data'], 'Synthetic/real data mismatch')
        require(payload['language']==contract['language'] and payload['material']==contract['material'], 'Language/material mismatch')
        units={}
        for unit in payload['units']:
            keys(unit,['id','text','options'])
            require(unit['id'] in expected and unit['id'] not in units, 'Wrong/duplicate unit')
            require(nonempty(unit['text']), 'Empty candidate text')
            require(isinstance(unit['options'],list) and len(unit['options'])==expected[unit['id']] and all(nonempty(x) for x in unit['options']), 'Option structure mismatch')
            units[unit['id']]=unit
        require(set(units)==set(expected), 'Incomplete candidate units')
        origins.append(record['origin']);source_hashes[arm['source_id']]=record['sha256']
        arms.append({'label':arm['label'],'units':[units[i] for i in expected]})
    # The request determines origins; display keys cannot redefine provenance.
    require(sorted(origins)==sorted(required), 'Requested origins/arm count not met; no fallback')
    reviewer={'schema_version':1,'test_data':contract['test_data'],'package_id':contract['package_id'],'language':contract['language'],'material':contract['material'],'arms':arms}
    members={'review-candidates.json':(json.dumps(reviewer,ensure_ascii=False,indent=2)+'\n').encode(),'reviewer-instructions.txt':contract['reviewer_instructions'].encode()}
    output.parent.mkdir(parents=True,exist_ok=True)
    temp=None
    try:
        with tempfile.NamedTemporaryFile(dir=output.parent,delete=False) as handle:temp=Path(handle.name)
        with zipfile.ZipFile(temp,'w',compression=zipfile.ZIP_DEFLATED) as archive:
            for name,data in members.items():archive.writestr(name,data)
        with zipfile.ZipFile(temp) as archive:
            require(archive.namelist()==list(members), 'Unexpected archive membership')
            for name,data in members.items():require(archive.read(name)==data,'Archive byte parity failed')
        # Exclusive creation prevents replacing an output that appeared during validation.
        with output.open('xb') as handle:handle.write(temp.read_bytes())
    finally:
        if temp:temp.unlink(missing_ok=True)
    return {'schema_version':1,'state':'prepared-and-archive-verified','package_id':contract['package_id'],'test_data':contract['test_data'],'archive_sha256':digest(output.read_bytes()),'members':{n:digest(d) for n,d in members.items()},'contract_sha256':digest(json.dumps(contract,sort_keys=True).encode()),'source_hashes':source_hashes,'matched_origin_declarations':origins,'limitations':['lineage consistency checked; receipt authenticity and semantic equivalence need human review','JSON export only; renderer/browser validation required for HTML or spreadsheet deliveries','prepared is not sent or participant-approved']}


def inspect_attachment(path,receipt):
    data=Path(path).read_bytes()
    require(digest(data)==receipt['archive_sha256'],'Attachment bytes differ from verified release')
    with zipfile.ZipFile(path) as archive:
        require(len(archive.namelist())==len(receipt['members']) and set(archive.namelist())==set(receipt['members']),'Wrong actual archive membership')
        for name,h in receipt['members'].items():require(digest(archive.read(name))==h,'Wrong member bytes')
    return {'state':'attachment-bytes-verified','package_id':receipt['package_id'],'archive_sha256':receipt['archive_sha256'],'limitations':'This local readback cannot establish sending. Record actual sent-message identity separately.'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    b=sub.add_parser('build');b.add_argument('--contract',required=True);b.add_argument('--registry',required=True);b.add_argument('--workspace',required=True);b.add_argument('--output',required=True);b.add_argument('--receipt',required=True)
    v=sub.add_parser('inspect-attachment');v.add_argument('--attachment',required=True);v.add_argument('--receipt',required=True)
    args=parser.parse_args()
    try:
        receipt_path=Path(args.receipt)
        if args.command=='build':
            output_path=Path(args.output)
            require(not receipt_path.exists() and not receipt_path.is_symlink(),'Refusing receipt overwrite')
            require(not output_path.exists() and not output_path.is_symlink(),'Refusing archive overwrite')
            receipt_path=receipt_path.resolve()
            output_path=output_path.resolve()
            require(receipt_path != output_path and receipt_path not in output_path.parents and output_path not in receipt_path.parents,
                    'Archive and receipt targets must be distinct, non-overlapping paths')
            result=build(json.loads(Path(args.contract).read_text()),json.loads(Path(args.registry).read_text()),args.workspace,output_path)
            with receipt_path.open('x',encoding='utf-8') as handle:
                handle.write(json.dumps(result,indent=2)+'\n')
        else:result=inspect_attachment(args.attachment,json.loads(receipt_path.read_text()))
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile) as error:
        parser.exit(2,f'Release blocked: {error}\n')
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()

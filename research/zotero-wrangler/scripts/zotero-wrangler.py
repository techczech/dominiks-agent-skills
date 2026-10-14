#!/usr/bin/env python3
"""Discover, plan, retrieve and explicitly apply Zotero literature imports."""
import argparse
import json
from pathlib import Path
from zotero_client import LocalAPI
from zotero_execute import apply, attach, save_private
from zotero_plan import load_records, prepare
from zotero_retrieve import crossref, download_pdf
from zotero_enrich import prepare as prepare_enrichment
from zotero_finder import prepare as prepare_finder, report as report_finder


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:23119/api/')
    sub = parser.add_subparsers(dest='command', required=True)
    discover = sub.add_parser('discover'); discover.add_argument('--snapshot'); discover.add_argument('--library', default='users/0'); discover.add_argument('--all-items', action='store_true')
    plan = sub.add_parser('plan'); plan.add_argument('input'); plan.add_argument('--snapshot', required=True)
    plan.add_argument('--collection', required=True); plan.add_argument('--out', required=True)
    run = sub.add_parser('apply'); run.add_argument('plan'); run.add_argument('--receipt', required=True)
    run.add_argument('--execute', action='store_true', help='Explicitly execute the reviewed plan; default is dry run')
    pdf = sub.add_parser('download-pdf'); pdf.add_argument('url'); pdf.add_argument('--out', required=True)
    metadata = sub.add_parser('metadata'); metadata.add_argument('doi'); metadata.add_argument('--out', required=True)
    attachment = sub.add_parser('attach'); attachment.add_argument('pdf'); attachment.add_argument('--parent', required=True)
    attachment.add_argument('--library', default='users/0'); attachment.add_argument('--source-url', required=True)
    attachment.add_argument('--receipt', required=True); attachment.add_argument('--execute', action='store_true')
    enrich = sub.add_parser('enrich-plan'); enrich.add_argument('input'); enrich.add_argument('--snapshot', required=True); enrich.add_argument('--out', required=True)
    finder = sub.add_parser('finder-plan'); finder.add_argument('--snapshot', required=True); finder.add_argument('--collection', required=True); finder.add_argument('--keys', nargs='+'); finder.add_argument('--out', required=True)
    status = sub.add_parser('finder-status'); status.add_argument('job'); status.add_argument('--snapshot', required=True); status.add_argument('--observation', required=True); status.add_argument('--out', required=True)
    a = parser.parse_args()
    if a.command in ('enrich-plan','finder-plan','finder-status'):
        snap = json.loads(Path(a.snapshot).read_text())
        if a.command=='enrich-plan': result=prepare_enrichment(json.loads(Path(a.input).read_text()),snap)
        elif a.command=='finder-plan': result=prepare_finder(snap,a.collection,a.keys)
        else: result=report_finder(json.loads(Path(a.job).read_text()),snap,json.loads(Path(a.observation).read_text()))
        save_private(a.out,result)
        print(json.dumps({'command':a.command,'operations':len(result.get('operations',[])),'blocked':result.get('blocked',[]),'state':result.get('state'),'complete':result.get('complete',False),'mode':'snapshot-report' if a.command=='finder-status' else 'offline-plan','live_action_performed':False})); return
    if a.command == 'plan':
        p = prepare(load_records(a.input), json.loads(Path(a.snapshot).read_text()), a.collection)
        save_private(a.out, p)
        print(json.dumps({'operations': len(p['operations']), 'blocked': p['blocked'], 'warnings': p['warnings'], 'dry_run': True}, ensure_ascii=False))
    elif a.command == 'apply':
        from zotero_execute import validate_plan
        p = json.loads(Path(a.plan).read_text()); validate_plan(p, for_execution=a.execute)
        if not a.execute:
            print(json.dumps({'dry_run': True, 'operations': len(p['operations']), 'plan_digest': p['digest'], 'blocked': p['blocked'], 'warnings': p['warnings'], 'write_candidate': bool(p['server_id'])})); return
        print(json.dumps(apply(LocalAPI(a.base), p, a.receipt)))
    elif a.command == 'discover':
        api = LocalAPI(a.base)
        if a.snapshot: save_private(a.snapshot, api.snapshot(a.library, all_items=a.all_items))
        print(json.dumps({'client': api.info, 'write_candidate': bool(api.server),
                          'writes_validated': False, 'native_authorisation_required': True}))
    elif a.command == 'metadata':
        r = crossref(a.doi); save_private(a.out, r)
        print(json.dumps({'metadata': r['status'], 'abstract': r['abstract_status']}))
    elif a.command == 'download-pdf':
        r = download_pdf(a.url, a.out); print(json.dumps({'status': r['status'], 'bytes': r['bytes'], 'sha256': r['sha256']}))
    elif a.command == 'attach':
        if not a.execute:
            print(json.dumps({'dry_run': True, 'parent': a.parent, 'file': a.pdf})); return
        r = attach(LocalAPI(a.base), a.library, a.parent, a.pdf, a.source_url, a.receipt)
        print(json.dumps({'complete': r['complete'], 'attachment_key': r['key']}))


if __name__ == '__main__':
    try: main()
    except Exception as error:
        # HTTP bodies, authorisation responses and upload URLs never go to output.
        if isinstance(error, (ValueError, RuntimeError)):
            print(str(error))
        else: print(type(error).__name__ + ': operation interrupted; inspect readback before retry')
        raise SystemExit(1)

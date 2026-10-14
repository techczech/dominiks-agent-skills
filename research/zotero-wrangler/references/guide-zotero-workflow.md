---
title: Running the Zotero local API helpers
register: FOR DOMINIK
---

# Prepare an import

**Start with a plan.** The helpers accept ordinary reference exports and preserve the source information needed to review their decisions. CSV and JSON need only Python 3.10 or later. Commands below run from the skill folder; replace paths with your own inputs.

Choose a private output directory outside the installed skill. An entirely offline demonstration uses **fictional data**:

```sh
ZOTERO_WORK=/path/to/private-zotero-work
python3 scripts/zotero-wrangler.py plan assets/fictional-zotero-references.json --snapshot assets/fictional-zotero-snapshot.json --collection 'Fictional Reading' --out "$ZOTERO_WORK/plan-fictional-zotero.json"
python3 scripts/zotero-wrangler.py apply "$ZOTERO_WORK/plan-fictional-zotero.json" --receipt "$ZOTERO_WORK/receipt-fictional-zotero.json"
```

The second command validates and reports a dry run. **Do not execute the fictional plan against a live library.** For a real import, use `discover --snapshot "$ZOTERO_WORK/snapshot-zotero.json"`, then prepare a plan from your own records and the live snapshot. Review the plan before adding `--execute` to `apply`. If an operation is interrupted, use the same plan and receipt; the helper checks Zotero's saved state before retrying.

# BibTeX and RIS

Optional adapters use [bibtexparser's v1 API](https://bibtexparser.readthedocs.io/en/v1.0/bibtexparser.html) and [rispy](https://pypi.org/project/rispy/). Use an isolated environment, for example:

```sh
uv run --no-project --with 'bibtexparser>=1.4,<2' --with 'rispy>=0.9,<1' python scripts/zotero-wrangler.py plan references.bib --snapshot "$ZOTERO_WORK/snapshot-zotero.json" --collection 'Reading list' --out "$ZOTERO_WORK/plan-zotero.json"
```

The BibTeX adapter supports article, book, inproceedings, incollection, theses, report, misc and unpublished records. The RIS adapter supports JOUR, BOOK, CHAP, CONF, CPAPER, THES, RPRT, GEN and ELEC. Unsupported types fail explicitly. Both map title, DOI, date, URL, authors and abstract; other parsed fields remain in raw provenance for review and promotion into JSON metadata. Author strings initially use Zotero single-field names. Check personal names, LaTeX markup, dates, venues and missing fields before execution. The adapters do not promise complete format fidelity.

# Retrieve source material

Retrieve depositor metadata and its genuine abstract when supplied:

```sh
python3 scripts/zotero-wrangler.py metadata '10.1234/replace-with-real-doi' --out "$ZOTERO_WORK/metadata-zotero.json"
```

Review the returned metadata against the primary publication, then incorporate wanted fields and provenance into your reference input. Metadata retrieval is separate from applying changes; unavailable abstracts stay unavailable.

Use a public publisher or repository PDF URL:

```sh
python3 scripts/zotero-wrangler.py download-pdf 'https://example.org/replace-with-public-paper.pdf' --out "$ZOTERO_WORK/source-paper.pdf"
python3 scripts/zotero-wrangler.py attach "$ZOTERO_WORK/source-paper.pdf" --parent REPLACEK --source-url 'https://example.org/replace-with-public-paper.pdf' --receipt "$ZOTERO_WORK/receipt-attachment.json"
```

Check the paper's title, authors and version. The attachment command is a dry run until you add `--execute`. Receipts retain source URL, hashes and parent. An identical stored PDF can be reused. The helper does not overwrite a different attachment. Retrieval follows public redirects with private-address checks, limits response size and refuses HTML masquerading as a PDF. It neither searches paywalls nor discovers every available copy; choose legitimate URLs using publisher/repository evidence.

# Limits and tests

**Topic and priority judgements are supplied explicitly.** Search-stream topic labels do not mean screening. Title-only reading priorities do not mean study quality. Record data/code evidence with checked paths and access limits; public access does not prove reproduction.

Run offline tests with `python3 -m unittest discover -s tests`. Optional parser tests run when the adapters are installed. A synthetic local HTTP harness verifies transport and authorisation semantics without accessing Zotero. The tests validate generic helper behaviour; live write compatibility still needs a separately scoped disposable library test. No settings, remembered approvals or production collections should change during tests.

Plans, snapshots, receipts and downloaded papers can contain private or copyrighted material. Store them outside this distributable package. The package licence covers its generic code, instructions and fictional fixtures.

# Notes, features and native Find Full Text

Use [linked-note and feature guidance](workflow-zotero-linked-notes.md) to create collection overviews with links to child reading notes, preserve annotations/provenance and apply explicit evidence decisions. Use a complete snapshot (`discover --all-items`) and `enrich-plan`, then review through the existing dry-run `apply` command. Existing notes remain intact; edited generated notes block replacement.

Use [native finder guidance](workflow-zotero-find-full-text.md) for computer control of Zotero's Find Full Text command. `finder-plan` prepares the exact scope; the runtime agent observes/selects the app controls; `finder-status` reconciles a later snapshot with an explicit UI observation. The CLI does not independently click Zotero. Running, completed and blocked queues remain distinct, and stored hashes are not treated as verified file bytes.

The package includes fictional enrichment decisions, a complete fictional snapshot and Mock UI finder observations. Their commands work entirely offline. Live app control and library writes remain untested in this package validation.

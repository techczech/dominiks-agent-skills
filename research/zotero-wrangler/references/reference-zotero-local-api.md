---
title: Native Zotero local API compatibility
register: FOR AGENTS
verified: 2026-10-14
---

# Compatibility

Official [Local API](https://www.zotero.org/support/dev/web_api/v3/local_api) documentation describes reads without authentication and native writes in Zotero 10+. Enable Settings → Advanced → “Allow other applications on this computer to communicate with Zotero”. A 403 can mean disabled access. Never expose port 23119 externally. Root discovery reads API/schema/server headers; client version may be absent.

`users/0` addresses the local user. Keep local versions partitioned by server ID. Write authorisation uses `POST local/authorize`, app name and server header. “Allow” is single-use; “Always Allow” returns remembered approval. Keys are broad, profile-local permissions. Single-use keys stay in process memory.

Remembered keys (a user-approved exception to the Bitwarden-only rule, held in the user's own OS account store): `zotero_credentials.py` saves only `remember: true` keys, through stdlib `ctypes`, never a subprocess or plaintext file. macOS: login Keychain generic password, service `Zotero Wrangler local API`, account `<server ID>/<app name>`. Windows: Credential Manager generic credential `Zotero Wrangler local API/<server ID>/<app name>`, persisted for this user on this machine. Other platforms: no store; "Always Allow" lasts one run, with a warning. Read-only commands never open the store; the first write does. A store read or delete failure stops the write before any Zotero prompt; a save failure warns and keeps the key for this run. Errors show only a status code.

Revoke: delete the Keychain item (Keychain Access, search `Zotero Wrangler local API`) or the Windows Credential Manager entry; the helper then asks Zotero again. Zotero's own record of the approval is separate and outside this helper; turning off the local API in Zotero's settings blocks all local API access. A key Zotero rejects with 401 is deleted from the store, then one reauthorisation runs. Denial stops; 403 and rate limiting stop without prompting or deleting. A timeout is uncertain; reconcile first.

Earlier read-only instances can produce snapshots/plans but cannot execute. Unknown API versions stop. Header presence does not prove write behaviour. The helper never probes writes during discovery.

# Writes and attachments

The [Write Requests](https://www.zotero.org/support/dev/web_api/v3/write_requests) documentation defines partial POST updates, per-object versions, predetermined keys and 50-object batches. Array values replace full arrays; retain existing tags and memberships. Use version 0 for preallocated new keys; this precondition also comes from verified local workflow evidence. Updates use their observed version. On conflict inspect server state; do not alter a precondition to force a write. Write-token caches disappear across Zotero restarts, so they cannot replace reconciliation.

The [File Uploads](https://www.zotero.org/support/dev/web_api/v3/file_upload) documentation and Local API page specify three phases: request upload permission with MD5/filename/size/mtime and file precondition; upload bytes to the supplied local URL; register its upload key with the same precondition. The helper permits only same-origin local uploads, uses stored-file attachments, refuses replacement of an existing different hash, and reads attachment parent and MD5 afterward. Partial binary uploads are unsupported. SHA-256 is retained separately for downloaded-source provenance.

Do not mix cloud and local snapshots or assume cloud versions match local versions. Local writes may subsequently sync according to the user's existing Zotero configuration.

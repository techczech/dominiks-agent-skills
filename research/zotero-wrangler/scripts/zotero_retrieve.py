"""Public source retrieval. No guessed abstracts, login or access bypass."""
import hashlib
import html
import ipaddress
import json
import re
import socket
import ssl
import http.client
from urllib.parse import quote, urlsplit
from urllib.parse import urljoin


def vetted_addresses(url):
    u = urlsplit(url)
    if u.scheme not in ('https', 'http') or not u.hostname or u.username or u.password:
        raise ValueError('Public HTTP(S) URL without credentials required')
    if u.port not in (None, 80, 443): raise ValueError('Public retrieval uses standard ports')
    addresses = socket.getaddrinfo(u.hostname, u.port or (443 if u.scheme == 'https' else 80), type=socket.SOCK_STREAM)
    for address in addresses:
        if not ipaddress.ip_address(address[4][0]).is_global:
            raise ValueError('Public retrieval cannot access local/private addresses')
    return u, addresses


def public_url(url):
    vetted_addresses(url)
    return url


def fetch(url, limit=64 * 1024 * 1024):
    for redirect in range(6):
        u, addresses = vetted_addresses(url)
        family, socktype, proto, _, address = addresses[0]
        raw = socket.socket(family, socktype, proto); raw.settimeout(30)
        connection = http.client.HTTPConnection(u.hostname, u.port or (443 if u.scheme == 'https' else 80), timeout=30)
        try:
            # Connect to the exact validated numeric address, without a second DNS lookup.
            raw.connect(address)
            connection.sock = ssl.create_default_context().wrap_socket(raw, server_hostname=u.hostname) if u.scheme == 'https' else raw
            connection.request('GET', (u.path or '/') + ('?' + u.query if u.query else ''),
                               headers={'User-Agent': 'ZoteroLiteratureHelper/1.0'})
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader('Location')
                if not location: raise ValueError('Redirect lacks location')
                url = urljoin(url, location); continue
            if response.status != 200: raise ValueError(f'Public source HTTP {response.status}')
            content = response.read(limit + 1)
            if len(content) > limit: raise ValueError('Source exceeds configured size limit')
            return content, url
        finally:
            connection.close(); raw.close()
    raise ValueError('Too many public-source redirects')


def pdf_hashes(content):
    if not content.startswith(b'%PDF-'): raise ValueError('Response is not PDF bytes')
    return {'md5': hashlib.md5(content).hexdigest(), 'sha256': hashlib.sha256(content).hexdigest()}


def download_pdf(url, output):
    from zotero_execute import save_private
    from pathlib import Path
    import os
    import tempfile
    b, final = fetch(url); hashes = pdf_hashes(b); path = Path(output)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='pdf-download-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(b); out.flush(); os.fsync(out.fileno())
        if path.exists():
            if hashlib.sha256(path.read_bytes()).hexdigest() != hashes['sha256']:
                raise ValueError('Existing output differs; choose another path')
        else: os.link(temporary, path)
    finally: os.unlink(temporary)
    receipt = {'requested_url': url, 'source_url': final, **hashes, 'bytes': len(b),
               'status': 'downloaded_pdf_bytes', 'document_identity': 'requires title/version review'}
    save_private(str(path) + '.receipt.json', receipt)
    return receipt


def crossref(doi_value):
    from zotero_plan import doi
    d = doi(doi_value)
    if not re.fullmatch(r'10\.\d{4,9}/\S+', d): raise ValueError('Valid DOI required')
    url = 'https://api.crossref.org/works/' + quote(d, safe='')
    b, final = fetch(url, 4 * 1024 * 1024); m = json.loads(b)['message']
    if doi(m.get('DOI')) != d: raise ValueError('Depositor DOI readback mismatch')
    abstract = html.unescape(re.sub(r'<[^>]+>', ' ', m.get('abstract', '')))
    abstract = re.sub(r'\s+', ' ', abstract).strip()
    return {'DOI': d, 'title': m.get('title', [''])[0], 'abstractNote': abstract,
            'abstract_source': 'Crossref depositor metadata' if abstract else '',
            'source_url': final, 'raw': m, 'status': 'metadata_available',
            'abstract_status': 'available' if abstract else 'unavailable'}

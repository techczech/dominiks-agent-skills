// Serve media files with HTTP Range support (206), which Cloudflare Pages static assets do not give.
// Safari/iOS will not play an MP4 without it, and seeking to chapters needs it everywhere.
export async function onRequestGet({ request, env }) {
  const asset = await env.ASSETS.fetch(new Request(new URL(request.url), { method: 'GET' }));
  const range = request.headers.get('Range');
  if (!asset.ok || !range) {
    const res = new Response(asset.body, asset);
    res.headers.set('Accept-Ranges', 'bytes');
    return res;
  }
  const buf = await asset.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start, end;
  if (m && m[1] !== '') { start = Number(m[1]); end = m[2] !== '' ? Math.min(Number(m[2]), size - 1) : size - 1; }
  else if (m && m[2] !== '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  if (!m || start > end || start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  const headers = new Headers(asset.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(buf.slice(start, end + 1), { status: 206, headers });
}

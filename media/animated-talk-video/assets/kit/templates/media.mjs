// media: still image(s), optionally with copy beside them. Covers media, copy-visual, image-claim, image-grid,
// cta-screenshots, list-visual. The picture is the evidence: it is shown whole and still.
//  1 image, no items   -> full picture
//  1 image + items     -> picture left, items (callouts / copy) right, one per build
//  2-4 images          -> grid; image i arrives with item i (its caption) when items.length === images.length
// slide: { title?, section, accent, images:[{src, alt, caption?}], items?:[{text}],
//          crops?: [{t, x, y, scale}]  (x,y = percent point to zoom toward; only when he points at that part aloud) }
// Standard motion adds a very slow push-in (1.00 to 1.04) on single images with nothing else moving: the
// "slow crop that refreshes the frame" of principles.md. Calm never moves the picture.
import { kit, esc, arrowMarker } from './_kit.mjs'

export const layout = 'media'
export const aliases = ['copy-visual', 'image-claim', 'image-grid', 'imagegrid', 'cta-screenshots', 'list-visual', 'image-quote']
export const units = slide => (slide.items ?? []).map(i => i.text)

export const css = `
.md .pic { position: absolute; overflow: hidden; border-radius: 18px; background: var(--hairline); border: 2px solid var(--hairline); }
.md .pic img { width: 100%; height: 100%; object-fit: contain; display: block; background: #fff; }
.md .cap { position: absolute; font-size: 28px; font-weight: 700; text-align: center; }
.md .gclip { position: absolute; left: 0; width: 1920px; overflow: hidden; }
.md .gwrap { position: absolute; left: 0; width: 1920px; height: 1080px; transform-origin: 0 0; }
.md > svg, .md > .tbody > svg { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }
.md .claim { position: absolute; left: 1240px; width: 560px; height: 112px; isolation: isolate; display: flex; align-items: center; padding: 0 28px; font-size: 40px; line-height: 1.18; font-weight: 400; border: 2px solid color-mix(in srgb, var(--accent) 34%, #fff); border-radius: 16px; background: color-mix(in srgb, var(--accent) 5%, #fff); }
`

export function render(slide, ctx) {
  const k = kit(ctx), A = slide.accent ?? 'green', sid = ctx.sid, imgs = slide.images ?? [], items = slide.items ?? [], n = items.length
  const grid = imgs.length > 1, split = !grid && n > 0
  const b = n ? k.B(n) : []
  let html = (slide.title ? k.top(slide.kicker ?? '', slide.title, A) : ''), js = slide.title ? k.topJs() : ''
  const top = slide.title ? 255 : 90, H = 990 - top
  if (grid) {
    // N19: the grid is not shown as a still. It builds, then the camera moves into each image in turn as it is discussed
    // (ease in, then a slow drift), the other images fade back, and the last move returns to the whole grid.
    const cols = 2, rows = Math.ceil(imgs.length / cols), gap = 40
    const W = Math.floor((1680 - gap * (cols - 1)) / cols), h = Math.floor((H - gap * (rows - 1) - 50) / rows)
    const geo = imgs.map((_, i) => { const r = Math.floor(i / cols), c = i % cols; return { x: 120 + c * (W + gap), y: top + r * (h + gap + 50) } })
    html += `<div class="gclip" style="top:${top}px;height:${H}px"><div class="gwrap" id="${sid}gw" style="top:${-top}px">` + imgs.map((im, i) => {
      const { x, y } = geo[i]
      return `<div class="pic" id="${sid}g${i}" style="left:${x}px;top:${y}px;width:${W}px;height:${h}px"><img src="${esc(im.src)}" alt="${esc(im.alt ?? '')}"></div>` +
        `<div class="cap" id="${sid}c${i}" style="left:${x}px;top:${y + h + 8}px;width:${W}px">${esc(items[i]?.text ?? im.caption ?? '')}</div>`
    }).join('') + `</div></div>`
    imgs.forEach((_, i) => { const t = n === imgs.length ? b[i] : k.t0 + 0.3 + i * 0.4; js += k.show(`#${sid}g${i}`, t, 'pop') + k.show(`#${sid}c${i}`, t + 0.15, 'none') })
    if (n === imgs.length) {
      const zs = Math.min(1680 / W, (H - 10) / (h + 50)) * 0.96, gw = JSON.stringify(`#${sid}gw`)
      const aim = (i, s) => ({ x: 960 - s * (geo[i].x + W / 2), y: top + H / 2 - s * (geo[i].y + (h + 50) / 2) })
      const lastT = b[n - 1]
      imgs.forEach((_, i) => {
        // zoom in on image i once it has arrived and is being discussed; the same scene time the next move starts, minus the move
        const t0 = i === 0 ? Math.max(b[0] + 0.9, k.t0) : b[i] + 0.5, p = aim(i, zs), drift = aim(i, zs * 1.05)
        const nextT = i < n - 1 ? b[i + 1] - 0.1 : Math.max(t0 + 3, ctx.end - 3.2)
        js += `tl.to(${gw}, { scale: ${f(zs)}, x: ${f(p.x)}, y: ${f(p.y)}, duration: 1.4, ease: "sine.inOut" }, ${k.at(t0)});\n`
        if (nextT - (t0 + 1.4) > 0.6) js += `tl.to(${gw}, { scale: ${f(zs * 1.05)}, x: ${f(drift.x)}, y: ${f(drift.y)}, duration: ${f(nextT - t0 - 1.41)}, ease: "none" }, ${k.at(t0 + 1.41)});\n`
        // fade only images that have already arrived: a not-yet-built image must not be tweened before its own entrance
        imgs.forEach((_, j) => { if (j < i) { js += `tl.to(${JSON.stringify(`#${sid}g${j}, #${sid}c${j}`)}, { opacity: 0.0, duration: 0.7, ease: "power1.out" }, ${k.at(t0)});\n` } })
      })
      const tOut = Math.max(lastT + 3.4, ctx.end - 2.6)
      if (tOut + 1.6 < ctx.end) {
        js += `tl.to(${gw}, { scale: 1, x: 0, y: 0, duration: 1.4, ease: "sine.inOut" }, ${k.at(tOut)});\n`
        js += `tl.to(${JSON.stringify(`#${sid}gw .pic, #${sid}gw .cap`)}, { opacity: 1, duration: 0.8 }, ${k.at(tOut)});\n`
      }
    } else k.warn('image-grid: zoom needs one spoken item per image (items.length === images.length); the grid stays whole')
  } else {
    const claimsMode = split
    const w = split ? 1000 : 1680
    html += `<div class="pic" id="${sid}g0" style="left:120px;top:${top}px;width:${w}px;height:${H}px"><img id="${sid}img" src="${esc(imgs[0].src)}" alt="${esc(imgs[0].alt ?? '')}"></div>`
    if (split) {
      // N18: each claim is a box with a line that runs from the claim's left edge to the picture's right edge (both touched,
      // head on the picture). Boxes have a fixed height so the line positions are exact, not measured.
      const ch = 112, cg = 34, tot = n * ch + (n - 1) * cg, y0 = Math.round(top + (H - tot) / 2), px = 120 + w, cx0 = 1240
      if (tot > H) k.warn(`media: ${n} claims do not fit beside the picture; use at most ${Math.floor((H + cg) / (ch + cg))}`)
      if (items.some(it => String(it.text).length > 50)) k.warn('media: a claim is longer than two lines; shorten it')
      const mid = i => y0 + i * (ch + cg) + ch / 2
      html += `<svg viewBox="0 0 1920 1080"><defs>${arrowMarker('mh' + sid)}</defs><g stroke="#101418" stroke-width="3" fill="none">${items.map((_, i) => `<path id="${sid}ln${i}" d="M${cx0} ${f(mid(i))} L${px} ${f(mid(i))}" marker-end="url(#mh${sid})"/>`).join('')}</g></svg>`
      html += items.map((it, i) => `<div class="claim" id="${sid}i${i}" style="--accent:var(--${A});top:${y0 + i * (ch + cg)}px">${k.hl}${esc(it.text)}</div>`).join('')
    }
    js += k.show(`#${sid}g0`, k.t0 + 0.2, 'none', { dur: 0.7 })
    items.forEach((_, i) => { js += k.show(`#${sid}i${i}`, b[i], 'l', { travel: 40 }) + k.show(`#${sid}ln${i}`, b[i] + 0.2, 'none', { dur: 0.4 }) })
    js += k.now(items.map((_, i) => `#${sid}i${i}`), b)
    const dwell = ctx.end - k.t0
    if (slide.crops?.length) slide.crops.forEach((c, i) => { js += `tl.to(${JSON.stringify('#' + sid + 'img')}, { scale: ${c.scale ?? 1.5}, transformOrigin: "${c.x ?? 50}% ${c.y ?? 50}%", duration: 1.4, ease: "power2.inOut" }, ${k.at(c.t)});\n` })
    else if (k.P.travel && dwell > 12) js += `tl.fromTo(${JSON.stringify('#' + sid + 'img')}, { scale: 1 }, { scale: 1.04, duration: ${f(dwell - 1)}, ease: "none" }, ${k.at(k.t0 + 0.5)});\n`
  }
  return { html, js, cls: 'md' }
}
const f = n => +n.toFixed(2)

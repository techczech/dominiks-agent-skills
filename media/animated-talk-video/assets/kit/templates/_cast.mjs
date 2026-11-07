// Cast: front-view people drawn from parts. Origin = the floor point under the person; y up is negative.
// JS port of the approved storyboard-v3 generator (cast.py). The same face, hair and clothes every time a given `who` appears;
// only pose and mood change. who: main (the recurring colleague) | approver | newbie | alerted | xa xb xc (extras).
import { INK, PAPER, GREEN, path, line, circle, ellipse, rect, g } from './_draw.mjs'

const SKIN = '#fbf6ee', TROUSER = '#dedcd2', JUMPER = '#ecebe3'
export const WHO = ['main', 'approver', 'newbie', 'alerted', 'xa', 'xb', 'xc']
export const MOODS = ['neutral', 'think', 'worried', 'frown', 'smile', 'surprised']

function twoBone(sx, sy, hx, hy, A, B, prefer) {
  const dx = hx - sx, dy = hy - sy
  const d = Math.max(1e-3, Math.min(Math.hypot(dx, dy), A + B - 1.0))
  const ang = Math.atan2(dy, dx)
  const c = Math.max(-1, Math.min(1, (A * A + d * d - B * B) / (2 * A * d)))
  const Ang = Math.acos(c)
  const cands = [1, -1].map(sg => [sx + A * Math.cos(ang + sg * Ang), sy + A * Math.sin(ang + sg * Ang)])
  let e
  if (prefer === 'down') e = cands.reduce((p, q) => (q[1] > p[1] ? q : p))
  else if (prefer === 'up') e = cands.reduce((p, q) => (q[1] < p[1] ? q : p))
  else e = cands.reduce((p, q) => (Math.abs(q[0]) > Math.abs(p[0]) ? q : p))
  return [e, [sx + d * Math.cos(ang), sy + d * Math.sin(ang)]]
}
function poly(p0, p1, w0, w1) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n
  const pts = [[p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2], [p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2], [p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2], [p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2]]
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + ' Z'
}
function hand(wx, wy, ang, kind, side) {
  const t = side
  let inner
  if (kind === 'point') {
    inner = path('M0 -13 Q14 -17 26 -12 Q32 -4 28 6 Q24 14 12 14 Q2 13 0 11 Z', SKIN, INK, 3.2) +
      path('M22 -9 L56 -9 Q62 -7 56 -3 L24 0', SKIN, INK, 3.2) + path(`M6 ${t * 10} Q16 ${t * 22} 26 ${t * 12}`, SKIN, INK, 3.2) +
      line(34, 0, 44, 0, INK, 2.5) + line(34, 6, 42, 6, INK, 2.5)
  } else if (kind === 'grip') {
    inner = path('M0 -13 Q16 -18 30 -12 Q38 0 30 12 Q16 17 0 12 Z', SKIN, INK, 3.2) + line(14, -9, 14, 9, INK, 2.5) + line(23, -8, 23, 8, INK, 2.5) +
      path(`M4 ${t * 8} Q18 ${t * 20} 34 ${t * 8}`, SKIN, INK, 3.2)
  } else {
    inner = path('M0 -12 Q14 -16 26 -14 L44 -11 Q50 -8 46 -4 L48 0 Q51 5 46 8 L44 12 Q38 15 26 13 Q12 14 0 11 Z', SKIN, INK, 3.2) +
      line(34, -6, 46, -6, INK, 2.5) + line(34, 2, 47, 2, INK, 2.5) + path(`M4 ${t * 9} Q16 ${t * 24} 30 ${t * 11}`, SKIN, INK, 3.2)
  }
  return `<g transform="translate(${wx.toFixed(1)} ${wy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(1.15)">${inner}</g>`
}
function arm(sx, sy, hx, hy, fill, prefer = 'down', kind = 'open', cuff = true) {
  const A = 100, B = 94
  const dxx = hx - sx, dyy = hy - sy, dd = Math.hypot(dxx, dyy) || 1
  const k = Math.max(0, dd - 22) / dd
  const [[ex, ey], [wx, wy]] = twoBone(sx, sy, sx + dxx * k, sy + dyy * k, A, B, prefer)
  const ang = Math.atan2(wy - ey, wx - ex) * 180 / Math.PI
  const wa = [36, 30, 25]
  const shapes = [['c', [sx, sy], wa[0] / 2 + 1], ['p', poly([sx, sy], [ex, ey], wa[0], wa[1])], ['c', [ex, ey], wa[1] / 2], ['p', poly([ex, ey], [wx, wy], wa[1], wa[2])]]
  const draw = (fillc, strokec, sw) => shapes.map(([kd, v, r]) => kd === 'c'
    ? `<circle cx="${v[0].toFixed(1)}" cy="${v[1].toFixed(1)}" r="${r.toFixed(1)}" fill="${fillc}" stroke="${strokec}" stroke-width="${sw}" stroke-linejoin="round"/>`
    : `<path d="${v}" fill="${fillc}" stroke="${strokec}" stroke-width="${sw}" stroke-linejoin="round"/>`).join('')
  let o = draw(INK, INK, 7) + draw(fill, fill, 0.6)
  const rad = ang * Math.PI / 180
  if (cuff) {
    const ux = Math.cos(rad), uy = Math.sin(rad), cx = wx - ux * 12, cy = wy - uy * 12
    o += line((cx - uy * 12.5).toFixed(1), (cy + ux * 12.5).toFixed(1), (cx + uy * 12.5).toFixed(1), (cy - ux * 12.5).toFixed(1), INK, 3)
  }
  const nx = -Math.sin(rad), ny = Math.cos(rad), inward = sx < 0 ? -1 : 1
  let side = (ny * -1) > 0 ? 1 : -1
  if (Math.abs(ny) < 0.25) side = (nx * -inward) > 0 ? 1 : -1
  return o + hand(wx, wy, ang, kind, side)
}
function hair(who, hc) {
  if (who === 'main') return path(`M-47 ${hc - 4} Q-56 ${hc - 66} 2 ${hc - 66} Q56 ${hc - 66} 47 ${hc - 4} Q40 ${hc - 30} 10 ${hc - 36} Q-24 ${hc - 32} -47 ${hc - 4} Z`, INK, INK) + path(`M-6 ${hc - 62} Q-18 ${hc - 46} -30 ${hc - 38}`, 'none', PAPER, 2.5)
  if (who === 'approver') return path(`M-50 ${hc + 34} Q-62 ${hc - 70} 0 ${hc - 68} Q62 ${hc - 70} 50 ${hc + 34} Q42 ${hc + 38} 40 ${hc + 20} Q36 ${hc - 26} 0 ${hc - 34} Q-36 ${hc - 26} -40 ${hc + 20} Q-42 ${hc + 38} -50 ${hc + 34} Z`, INK, INK)
  if (who === 'newbie') {
    const s = [[-34, 12], [-16, -2], [6, -8], [28, -2], [42, 14], [-44, 30], [46, 32]].map(([cx, cy]) => circle(cx, hc - 50 + cy, 17, INK, INK, 2)).join('')
    return s + path(`M-40 ${hc - 12} Q0 ${hc - 40} 40 ${hc - 12} L40 ${hc - 30} L-40 ${hc - 30} Z`, INK, INK)
  }
  if (who === 'alerted') return path(`M-46 ${hc - 8} Q-48 ${hc - 60} 0 ${hc - 60} Q48 ${hc - 60} 46 ${hc - 8} Q30 ${hc - 26} 0 ${hc - 26} Q-30 ${hc - 26} -46 ${hc - 8} Z`, INK, INK) +
    path(`M-42 ${hc + 6} Q-40 ${hc + 58} 0 ${hc + 60} Q40 ${hc + 58} 42 ${hc + 6} Q30 ${hc + 34} 0 ${hc + 38} Q-30 ${hc + 34} -42 ${hc + 6} Z`, INK, INK)
  if (who === 'xa') return path(`M-48 ${hc - 2} Q-50 ${hc - 64} 0 ${hc - 64} Q50 ${hc - 64} 48 ${hc - 2} Q30 ${hc - 34} 0 ${hc - 34} Q-30 ${hc - 34} -48 ${hc - 2} Z`, INK, INK)
  if (who === 'xb') return path(`M-52 ${hc + 50} Q-60 ${hc - 66} 0 ${hc - 66} Q60 ${hc - 66} 52 ${hc + 50} L36 ${hc + 50} Q40 ${hc - 20} 0 ${hc - 30} Q-40 ${hc - 20} -36 ${hc + 50} Z`, INK, INK)
  return path(`M-46 ${hc - 10} Q-40 ${hc - 60} 0 ${hc - 58} Q40 ${hc - 60} 46 ${hc - 10} Q20 ${hc - 24} 0 ${hc - 24} Q-20 ${hc - 24} -46 ${hc - 10} Z`, INK, INK)
}
function face(hc, mood, look, who) {
  const lx = look * 6
  let s = ''
  for (const ex of [-17, 17]) s += circle(ex + lx, hc - 2, 4.8, INK, null)
  const glasses = who === 'approver'
  if (glasses) { for (const ex of [-17, 17]) s += circle(ex, hc - 2, 15, 'none', INK, 3); s += line(-2, hc - 4, 2, hc - 4, INK, 3) }
  const by = hc - 22
  if (mood === 'frown' || mood === 'worried') s += line(-26, by + 2, -9, by - 4, INK, 3) + line(26, by + 2, 9, by - 4, INK, 3)
  else if (mood === 'think') s += line(-26, by, -9, by, INK, 3) + line(26, by - 8, 9, by - 2, INK, 3)
  else if (mood === 'surprised') s += line(-26, by - 6, -9, by - 6, INK, 3) + line(26, by - 6, 9, by - 6, INK, 3)
  else if (!glasses) s += line(-26, by, -9, by - 2, INK, 3) + line(26, by, 9, by - 2, INK, 3)
  const m = hc + 26
  if (mood === 'smile') s += path(`M-16 ${m - 4} Q0 ${m + 14} 16 ${m - 4}`, 'none', INK, 3.5)
  else if (mood === 'frown' || mood === 'worried') s += path(`M-14 ${m + 8} Q0 ${m - 6} 14 ${m + 8}`, 'none', INK, 3.5)
  else if (mood === 'think') s += path(`M-10 ${m + 2} Q4 ${m + 2} 14 ${m - 4}`, 'none', INK, 3.5)
  else if (mood === 'surprised') s += ellipse(0, m + 2, 8, 10, PAPER, INK, 3)
  else s += line(-11, m, 11, m, INK, 3.5)
  return s + path(`M2 ${hc + 4} Q9 ${hc + 14} 1 ${hc + 16}`, 'none', INK, 2.5)
}

// figure(): L / R = hand targets in local coordinates (L = the viewer's left). `desk` = y of the desk top in scene coordinates (seated typing).
export function figure(id, x, y, s = 1.0, o = {}) {
  const { who = 'main', mood = 'neutral', look = 0, seated = false, elbow = ['out', 'out'], flip = false, walk = 0, chair = true, hands = ['open', 'open'], desk = null } = o
  let { L = null, R = null } = o
  const hip = seated ? -172 : -232, sh = hip - 152, hc = sh - 78
  const garment = { main: JUMPER, approver: PAPER, newbie: '#f1f0ea', alerted: PAPER }[who] ?? '#f1f0ea'
  let out = ''
  if (seated && chair) out += rect(-76, -310, 152, 140, 16, '#f1f0ea') + rect(-86, -176, 172, 26, 10) + line(0, -150, 0, -20) + line(-60, -16, 60, -16, INK, 6)
  if (seated) {
    for (const sx of [-34, 34]) {
      const d = `M${sx} ${hip + 4} L${sx * 1.5} ${hip + 36} L${sx * 1.5} -26`
      out += path(d, 'none', INK, 46) + path(d, 'none', TROUSER, 39) + ellipse(sx * 1.5 + (sx > 0 ? 14 : -14), -12, 30, 13, INK)
    }
  } else {
    for (const [sx, wl] of [[-34, -walk], [34, walk]]) {
      const fx = sx + wl * 14, d = `M${sx} ${hip} L${fx} -22`
      out += path(d, 'none', INK, 48) + path(d, 'none', TROUSER, 41) + ellipse(fx + (sx > 0 ? 16 : -16), -12, 34, 14, INK)
    }
  }
  out += path(`M-76 ${sh + 30} Q-78 ${sh} -40 ${sh - 2} L40 ${sh - 2} Q78 ${sh} 76 ${sh + 30} L62 ${hip + 6} L-58 ${hip + 6} Z`, garment)
  if (who === 'main') out += path(`M-26 ${sh - 2} Q0 ${sh + 26} 26 ${sh - 2}`, 'none', INK, 3) + line(-58, hip - 6, 58, hip - 6, INK, 3)
  else if (who === 'approver') out += path(`M-26 ${sh - 2} L0 ${sh + 60} L26 ${sh - 2}`, 'none', INK, 3) + path(`M-14 ${sh + 60} L0 ${sh + 120} L14 ${sh + 60}`, 'none', INK, 3) + circle(0, sh + 96, 4, INK) + circle(0, sh + 126, 4, INK)
  else if (who === 'newbie') out += path(`M-24 ${sh - 2} L-10 ${sh + 110}`, 'none', INK, 3) + path(`M24 ${sh - 2} L10 ${sh + 110}`, 'none', INK, 3) + rect(-26, sh + 108, 52, 40, 6, PAPER, INK, 3) + line(-14, sh + 122, 14, sh + 122, GREEN, 4)
  else if (who === 'alerted') out += path(`M-26 ${sh - 2} L0 ${sh + 26} L26 ${sh - 2}`, PAPER, INK, 3) + line(0, sh + 26, 0, hip, INK, 3)
  out += rect(-15, sh - 34, 30, 40, 6, SKIN)
  out += ellipse(-46, hc + 2, 8, 14, SKIN, INK, 3) + ellipse(46, hc + 2, 8, 14, SKIN, INK, 3)
  out += ellipse(0, hc, 47, 54, SKIN) + face(hc, mood, look, who) + hair(who, hc)
  let hd = hands, el = elbow
  if (desk != null && !L && !R) { const ty = (desk - y) / s - 18; L = [-44, ty]; R = [44, ty]; el = ['out', 'out']; hd = ['flat', 'flat'] }
  const dl = L ?? [-82, hip + 60], dr = R ?? [82, hip + 60]
  out += arm(-72, sh + 22, dl[0], dl[1], garment, el[0], hd[0]) + arm(72, sh + 22, dr[0], dr[1], garment, el[1], hd[1])
  return `<g id="${id}" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${out}</g>`
}

// Named poses (standing figures): hand targets, elbow side and hand shapes in local coordinates. Seated typing needs `desk`.
export const POSES = {
  stand: {},
  think: { R: [30, -350], elbow: ['out', 'out'] },                                        // a hand to the chin
  point: { R: [150, -400], hands: ['open', 'point'], elbow: ['out', 'out'] },             // arm out to the viewer's right
  pointLeft: { L: [-150, -400], hands: ['point', 'open'], elbow: ['out', 'out'] },
  open: { L: [-122, -300], R: [122, -300], elbow: ['down', 'down'] },                     // palms out, explaining
  wave: { R: [112, -545], elbow: ['out', 'down'] },
  talk: { L: [-80, -170], R: [118, -450], elbow: ['out', 'down'] },
  hold: { L: [-60, -250], R: [60, -250], hands: ['grip', 'grip'], elbow: ['out', 'out'] },  // holding something in front
  reach: { L: [-100, -262], R: [100, -425], elbow: ['out', 'down'] },
  typing: { seated: true },
  seated: { seated: true }
}
export function person(id, x, y, o = {}) {
  const { pose = 'stand', s = 1.0 } = o
  const p = POSES[pose] ?? (() => { throw new Error(`unknown pose "${pose}" (use ${Object.keys(POSES).join(', ')})`) })()
  const rest = Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== 'pose' && k !== 's'))
  return figure(id, x, y, s, { ...p, ...rest })
}
export const handXY = (x, y, s, p, flip = false) => [x + (flip ? -p[0] : p[0]) * s, y + p[1] * s]
export function extraRow(id, x, y, s, whos, gap = 170) { return g(id, whos.map((w, i) => figure(`${id}-${i}`, x + i * gap, y, s, { who: w }))) }

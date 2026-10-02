// The landing hero's motion (see HeroMotion.tsx). Everything on screen is a function of two numbers: loop time T
// (0 to 15 s, the brief becoming the finished files) and scroll progress p (0 at the top of the page, 1 when the tab
// has become the Highlights panel). One animation frame loop writes transform, opacity, clip-path and a few sizes to
// elements marked data-hm="…". It runs only while the hero is on screen, and rests on the finished frame under
// reduced motion. ?hero-t=<seconds> holds the loop at one moment (for screenshots).

export interface HeroEngineOptions {
  /** The selected Highlights tab. 0 is the loop itself; any other tab shows its own demo in the panel. */
  getTab: () => number
  /** Called once, the first time the panel is reached. */
  onHighlights?: () => void
}

type Box = { x: number; y: number; w: number; h: number }
type Styles = Record<string, string>

const LOOP = 15
const cl = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const c01 = (v: number) => cl(v, 0, 1)
const seg = (t: number, a: number, b: number) => c01((t - a) / (b - a))
const EZ = {
  l: (x: number) => x,
  oc: (x: number) => 1 - Math.pow(1 - x, 3),
  ic: (x: number) => x * x * x,
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  oe: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  ie: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  ob: (x: number) => { const s = 2.2, y = x - 1; return 1 + (s + 1) * y * y * y + s * y * y },
  om: (x: number) => { const s = 1.2, y = x - 1; return 1 + (s + 1) * y * y * y + s * y * y },
}
type Ease = keyof typeof EZ
const tw = (t: number, a: number, b: number, e: Ease = 'oc') => EZ[e](seg(t, a, b))
const L = (a: number, b: number, k: number) => a + (b - a) * k
const bell = (t: number, a: number, b: number, c: number, d: number) => (t <= a || t >= d ? 0 : t < b ? seg(t, a, b) : t <= c ? 1 : 1 - seg(t, c, d))
const f2 = (v: number) => Math.round(v * 100) / 100
const f4 = (v: number) => Math.round(v * 10000) / 10000
const TR = (x: number, y: number) => `translate3d(${f2(x)}px,${f2(y)}px,0)`
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const mix = (a: string, b: string, k: number) => { const p = hex(a), q = hex(b); return `rgb(${Math.round(L(p[0], q[0], k))},${Math.round(L(p[1], q[1], k))},${Math.round(L(p[2], q[2], k))})` }

// Timeline constants (seconds on the loop, content coordinates of the 800 x 876 stage content box).
const SWITCH: [number, number, number][] = [[0, 1, 0], [2.5, 0, 1], [8, 1, 2], [10, 2, 1]] // [at, from, to]: 0 Studio, 1 Editor, 2 Effects
const FXT = [8.12, 8.56, 9.0, 9.44]
const IG = { x: 160, y: 138, w: 480, h: 600 }
const FORMATS = [[480, 600], [360, 640], [440, 624], [468, 624]] // Instagram post, Story, A5 flyer, Poster 18 x 24 in
const MORPHS: [number, number, number][] = [[10.15, 0, 1], [10.65, 1, 2], [11.15, 2, 3]]
const FAN = [[7, 318, 208, 260], [233, 318, 146.25, 260], [397, 318, 183.3, 260], [598, 318, 195, 260]]
const SWX = [256, 316, 376, 436, 496]
const LZ = [0, 70, 150, 215, 275, 330]
const ROWT = [5.45, 5.2, 4.95, 4.22, 3.55, 10.0, 3.55, 3.0]
const CARD = { x: 220, y: 150, w: 360, h: 500 }
const CG = [
  { r: 0, dx: 0, dy: 0, s: [20, 20, 320, 400] },
  { r: -9, dx: -80, dy: 16, s: [67.5, 20, 225, 400] },
  { r: 8, dx: 82, dy: 22, s: [39, 20, 282, 400] },
  { r: -3, dx: 4, dy: -22, s: [30, 20, 300, 400] },
]
const slotOf = (g: (typeof CG)[number]) => {
  const cx = CARD.x + CARD.w / 2, cy = CARD.y + CARD.h / 2
  const sx = CARD.x + g.s[0] + g.s[2] / 2 - cx, sy = CARD.y + g.s[1] + g.s[3] / 2 - cy
  const a = (g.r * Math.PI) / 180
  const nx = cx + sx * Math.cos(a) - sy * Math.sin(a) + g.dx, ny = cy + sx * Math.sin(a) + sy * Math.cos(a) + g.dy
  return { x: nx - g.s[2] / 2, y: ny - g.s[3] / 2, w: g.s[2], h: g.s[3], r: g.r }
}
const SLOT = CG.map(slotOf)
const CARDG = [CG[1], CG[2], CG[3], CG[0]]
const KW = ['coffee', 'yaba', 'warm', 'quiet', 'insta'] as const
const HLT: Record<string, number> = { coffee: 1.5, yaba: 1.6, warm: 1.7, quiet: 1.8 }

export function mountHero(root: HTMLElement, opts: HeroEngineOptions): () => void {
  const $: Record<string, HTMLElement> = {}
  root.querySelectorAll<HTMLElement>('[data-hm]').forEach(el => { $[el.dataset.hm!] = el })
  const byAttr = (a: string) => Array.from(root.querySelectorAll<HTMLElement>(`[${a}]`)).sort((p, q) => +p.getAttribute(a)! - +q.getAttribute(a)!)
  const X = byAttr('data-hm-x'), Y = byAttr('data-hm-y')
  const { track, pin, frame, content, cam, board } = $
  if (!track || !pin || !frame || !content || !cam || !board) return () => {}
  const LET = Array.from($['L-head'].querySelectorAll<HTMLElement>('.hm-hdl > span'))
  const list = (k: string, n: number) => Array.from({ length: n }, (_, i) => $[`${k}-${i}`])
  const MINI = list('mini', 3), CARDEL = list('card', 4), CHIP = list('chip', 6), FX = list('fx', 4), SWS = list('sw', 5), PSW = list('psw', 5), ROWS = list('row', 8)
  const LAY = ['L-photo', 'L-fade', 'L-head', 'L-tag', 'L-eye', 'L-badge'].map(k => $[k])
  const dock = document.querySelector<HTMLElement>('[data-hero-dock]')
  const dockRing = dock?.querySelector<HTMLElement>('[data-hero-dock-ring]') ?? null

  // Style writes go through a cache, so an unchanged value costs nothing.
  const cache = new WeakMap<HTMLElement, Styles>()
  const S = (el: HTMLElement | null | undefined, k: string, v: string) => {
    if (!el) return
    let c = cache.get(el); if (!c) { c = {}; cache.set(el, c) }
    if (c[k] === v) return
    c[k] = v
    if (k.charCodeAt(0) === 45) el.style.setProperty(k, v); else (el.style as unknown as Styles)[k] = v
  }
  const off = (el: HTMLElement, anc: HTMLElement): Box => {
    let x = 0, y = 0, e: HTMLElement | null = el
    while (e && e !== anc) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight }
  }

  // Layout, measured on load, on resize and when fonts arrive.
  let W = 1440, H = 900, D = 1440, trackTop = 0, desk = true, ui = 1.2
  let A: Box = { x: 700, y: 120, w: 560, h: 700 }, B = A, C = A
  const M = {
    kw: {} as Record<string, Box>,
    seg: [{ x: 4, w: 80 }, { x: 84, w: 80 }, { x: 164, w: 84 }],
    bl: [220, 300, 200, 300], yaba: { x: 60, y: 0, w: 20, h: 7 }, tagH: 7, fxl: 300, mqW: 3000,
    cta: null as Box | null, nav: null as Box | null,
  }
  const measureStage = () => {
    for (const k of KW) {
      const r = off($[`kw-${k}`], content); M.kw[k] = r
      const f = $[`fly-${k}`]
      S(f, 'left', `${f2(r.x)}px`); S(f, 'top', `${f2(r.y)}px`); S(f, 'width', `${f2(r.w)}px`); S(f, 'height', `${f2(r.h)}px`)
    }
    const u = parseFloat(board.style.getPropertyValue('--u')) || 4.8
    const ty = $['tag-y'], tg = ty.parentElement as HTMLElement
    M.yaba = { x: (tg.offsetLeft + ty.offsetLeft) / u, y: ty.offsetTop / u, w: ty.offsetWidth / u, h: ty.offsetHeight / u }
    M.tagH = tg.offsetHeight / u
    M.seg = [0, 1, 2].map(i => ({ x: $[`seg-${i}`].offsetLeft, w: $[`seg-${i}`].offsetWidth }))
    M.bl = [0, 1, 2, 3].map(i => $[`bl-${i}`].offsetWidth)
    M.fxl = $.fxl.offsetWidth
    M.mqW = $.mq.scrollWidth
    const cw = $.cta
    if (cw) { cw.style.width = ''; const c = cache.get(cw); if (c) delete c.width; M.cta = off(cw, pin) }
    if (dock) { const r = dock.getBoundingClientRect(); M.nav = { x: r.left, y: r.top, w: r.width, h: r.height } }
  }
  const measure = () => {
    W = pin.clientWidth; H = pin.clientHeight
    if (!W || !H) return
    desk = W >= 1024
    const wide = W >= 640
    let sw: number, sh: number
    if (desk) { sh = cl(Math.min(H - 48 - 150, (W - 128 - 56 - 600) * 1.25), 360, 740); sw = sh * 0.8 } else { sw = Math.min(W - 40, 520); sh = sw * 1.25 }
    S(root, '--hm-slot-w', `${f2(sw)}px`); S(root, '--hm-slot-h', `${f2(sh)}px`)
    let pw: number, ph: number
    if (wide) { ph = cl(Math.min(H - 48 - (desk ? 262 : 320), Math.min(W - (desk ? 160 : 40), 960) / 1.6), 220, 600); pw = ph * 1.6 } else { pw = Math.min(W - 40, 520); ph = pw * 1.25 }
    S(root, '--hm-panel-w', `${f2(pw)}px`); S(root, '--hm-panel-h', `${f2(ph)}px`)
    D = Math.round(H * 1.6)
    S(track, 'height', `${H + D}px`)
    trackTop = track.getBoundingClientRect().top + window.scrollY
    A = off($['slot-hero'], pin); C = off($['slot-panel'], pin)
    if (desk) { const h = Math.min(H * 0.84, W * 0.9 * 1.25); B = { w: h * 0.8, h, x: (W - h * 0.8) / 2, y: (H - h) / 2 + 14 } }
    else { const w = Math.min(W, (H - 70) * 0.8); B = { w, h: w * 1.25, x: (W - w) / 2, y: (H - w * 1.25) / 2 + 12 } }
    ui = cl(0.66 / Math.max(0.1, A.h / 1000), 1.2, 1.6)
    S(frame, '--ui', ui.toFixed(3))
    if (ui > 1.35) frame.setAttribute('data-compact', ''); else frame.removeAttribute('data-compact')
    measureStage()
  }

  const born = performance.now()
  let origin = born + 150
  const q = new URLSearchParams(location.search).get('hero-t')
  const hold = q !== null && !isNaN(parseFloat(q)) ? Math.min(Math.max(0, parseFloat(q)), LOOP - 0.001) : null
  const mq = matchMedia('(prefers-reduced-motion: reduce)')
  let pS = 0, wl = 800, sideF = 0, docked = 0, seen = false

  const scene = (p: number, intro: number, reduced: boolean, T: number, artK: number) => {
    const k1 = tw(p, 0.05, 0.4, 'io'), k2 = tw(p, 0.58, 0.93, 'io')
    let x = L(A.x, B.x, k1), y = L(A.y, B.y, k1), h = L(A.h, B.h, k1)
    x = L(x, C.x, k2); y = L(y, C.y, k2); h = L(h, C.h, k2)
    const sc = h / 1000
    wl = L(800, (1000 * C.w) / Math.max(1, C.h), k2)
    const ii = reduced ? 1 : tw(intro, 0.05, 0.8, 'oe')
    const si = 0.95 + 0.05 * ii
    const ox = ((1 - si) * wl * sc) / 2, oy = (1 - si) * 500 * sc + (1 - ii) * 26
    S($.stagewrap, 'transform', `${TR(x + ox, y + oy)} scale(${f4(sc * si)})`)
    S($.stagewrap, 'opacity', String(f2(ii * (1 - artK))))
    S($.stagewrap, 'visibility', artK >= 1 ? 'hidden' : 'visible')
    S(frame, 'width', `${f2(wl)}px`)
    S(content, 'left', `${f2((wl - 800) / 2)}px`)
    sideF = c01((wl - 820) / 480)
    S($['side-l'], 'opacity', String(f2(sideF))); S($['side-l'], 'transform', TR(-(1 - sideF) * 140, 0))
    S($['side-r'], 'opacity', String(f2(sideF))); S($['side-r'], 'transform', TR((1 - sideF) * 140, 0))
    // The headline and the rest of the copy lift out, one after another.
    const n = X.length
    for (let i = 0; i < n; i++) {
      const e = reduced ? tw(p, 0.02, 0.22, 'l') : tw(p, 0.01 + (0.13 * i) / n, 0.19 + (0.13 * i) / n, 'ic')
      S(X[i], 'transform', e < 0.0005 ? 'none' : TR(0, -e * 72))
      S(X[i], 'opacity', String(f2(1 - e)))
      S(X[i], 'filter', reduced || e < 0.005 ? 'none' : `blur(${f2(e * 10)}px)`)
    }
    // "Start designing" flies up into the nav and becomes its button, so there is one at a time.
    if (M.cta && M.nav && M.cta.h > 0) {
      const kd = tw(p, 0.03, 0.2, 'io')
      const sEnd = M.nav.h / M.cta.h
      const s = L(1, sEnd, kd)
      S($.cta, 'transform', kd === 0 ? 'none' : `${TR((M.nav.x - M.cta.x) * kd, (M.nav.y - M.cta.y) * kd)} scale(${f4(s)})`)
      S($.cta, 'width', kd > 0 ? `${f2(L(M.cta.w, M.nav.w / sEnd, kd))}px` : '')
      S($.cta, 'opacity', String(f2(1 - seg(kd, 0.82, 1))))
      S($.cta, 'visibility', kd >= 1 ? 'hidden' : 'visible')
      S($['cta-arrow'], 'opacity', String(f2(1 - seg(kd, 0.15, 0.55))))
      const nk = seg(kd, 0.82, 1)
      S(dock, 'opacity', String(f2(nk)))
      S(dock, 'visibility', nk > 0 ? 'visible' : 'hidden')
      docked = kd
    }
    S($.hero, 'visibility', p > 0.42 ? 'hidden' : 'visible')
    S($.next, 'visibility', p < 0.5 ? 'hidden' : 'visible')
    S($.next, 'pointerEvents', p > 0.9 ? 'auto' : 'none')
    for (let i = 0; i < Y.length; i++) {
      const e = reduced ? tw(p, 0.6, 0.82, 'l') : tw(p, 0.6 + i * 0.016, 0.8 + i * 0.016, 'oc')
      S(Y[i], 'transform', `translate3d(0,${f2((1 - e) * 112)}%,0)`)
    }
    const ed = tw(p, 0.72, 0.87)
    S($.demo, 'opacity', String(f2(ed))); S($.demo, 'transform', TR(0, (1 - ed) * 16))
    const ep = tw(p, 0.7, 0.88, 'oc')
    S($.pills, 'opacity', String(f2(ep))); S($.pills, 'transform', `${TR(0, (1 - ep) * 18)} scale(${f4(0.96 + 0.04 * ep)})`)
    const ec = tw(p, 0.86, 0.98)
    S($.caps, 'opacity', String(f2(ec))); S($.caps, 'transform', TR(0, (1 - ec) * 12))
    // Between the two, a band of the three module names passes behind the tab.
    const mo = reduced ? 0 : bell(p, 0.14, 0.34, 0.62, 0.82)
    S($.mq, 'opacity', String(f2(mo * 0.9)))
    if (mo > 0) S($.mq, 'transform', `translate3d(${f2(L(W * 0.3, W * 0.7 - M.mqW, seg(p, 0.08, 0.9)))}px,-50%,0)`)
    const warm = bell(T, 3.0, 3.9, 9.5, 10.6)
    const gt = `${TR(x + (wl * sc) / 2, y + 500 * sc)} scale(${f4(L(0.8, 1.25, k1 * (1 - k2)) * (desk ? 1 : 0.6))})`
    S($['glow-a'], 'transform', gt); S($['glow-b'], 'transform', gt)
    S($['glow-a'], 'opacity', String(f2(1 - warm * 0.8)))
    S($['glow-b'], 'opacity', String(f2(warm)))
    S($['glow-t'], 'opacity', String(f2(1 - k1)))
  }

  const loop = (T: number, intro: number, reduced: boolean, tab: number) => {
    // The button's cue: a ring and a sheen as the files land, and once as the page opens.
    {
      const pk = Math.max(T >= 13.15 && T < 14.05 ? seg(T, 13.15, 14.0) : 0, intro >= 1.35 && intro < 2.25 ? seg(intro, 1.35, 2.2) : 0)
      const sk = Math.max(T >= 13.15 && T < 13.8 ? seg(T, 13.15, 13.75) : 0, intro >= 1.35 && intro < 2.0 ? seg(intro, 1.35, 1.95) : 0)
      const an = Math.max(bell(T, 13.15, 13.28, 13.36, 13.62), bell(intro, 1.35, 1.48, 1.56, 1.82))
      const on = !reduced && pk > 0 && pk < 1
      const g = 18 * EZ.oc(pk), ro = on ? (1 - pk) * 0.9 : 0
      const ring = (el: HTMLElement | null | undefined, r: Box | null, show: boolean) => {
        S(el, 'opacity', String(f2(show ? ro : 0)))
        S(el, 'transform', show && ro > 0 && r && r.w ? `scale(${f4(1 + (2 * g) / r.w)},${f4(1 + (2 * g) / r.h)})` : 'none')
      }
      ring($['cta-ring'], M.cta, docked < 1)
      ring(dockRing, M.nav, docked >= 1)
      S($['cta-sheen'], 'transform', `translateX(${f2(!reduced && sk > 0 && sk < 1 ? L(-130, 330, EZ.io(sk)) : -130)}%)`)
      S($['cta-arrow'], 'transform', reduced || an <= 0 ? 'none' : `translateX(${f2(5 * an)}px)`)
    }
    let sw = SWITCH[0]
    for (const s of SWITCH) if (T >= s[0]) sw = s
    const kk = tw(T, sw[0], sw[0] + 0.34, 'oe')
    const sa = M.seg[sw[1]], sb = M.seg[sw[2]]
    S($.sind, 'transform', TR(L(sa.x, sb.x, kk), 0)); S($.sind, 'width', `${f2(L(sa.w, sb.w, kk))}px`)
    const cur = kk > 0.5 ? sw[2] : sw[1]
    for (let i = 0; i < 3; i++) {
      const v = i === sw[2] ? kk : i === sw[1] ? 1 - kk : 0
      S($[`seg-${i}`], 'color', i === cur ? '#ffffff' : '#91919f')
      S($[`path-${i}`], 'opacity', String(f2(v)))
      S($[`path-${i}`], 'transform', TR(0, (1 - v) * (i === sw[2] ? 10 : -10)))
      S($[`sg-${i}`], 'opacity', String(f2(v)))
      const cv = tab === 0 ? v : 0
      S($[`cap-${i}`], 'opacity', String(f2(cv)))
      S($[`cap-${i}`], 'visibility', cv > 0.02 ? 'visible' : 'hidden')
      S($[`pdot-${i}`], 'opacity', tab === 0 && i === cur ? '1' : '0')
    }
    const pr = bell(T, 12.36, 12.42, 12.46, 12.6)
    S($.exp, 'transform', pr > 0 ? `scale(${f4(1 - 0.1 * pr)})` : 'none')
    const exOn = T >= 12.42 && T < 13.1
    S($.exp, 'background', exOn ? '#8b7cff' : '#ffffff'); S($.exp, 'color', exOn ? '#ffffff' : '#0c0c0e')
    // 0 to 1 s: the hook, four words of the brief.
    for (let i = 0; i < 3; i++) {
      const a = i * 0.25, on = T >= a && T < a + 0.25
      S($[`slam-${i}`], 'visibility', on ? 'visible' : 'hidden')
      if (on) { const k = tw(T, a, a + 0.19, 'oe'); S($[`slamt-${i}`], 'transform', `scale(${f4(L(1.42, 1, k))}) rotate(${f2(L(i === 1 ? 7 : -5, 0, k))}deg)`) }
    }
    const sm = tw(T, 14.8, 15, 'ie')
    S($.seam, 'visibility', T >= 14.8 ? 'visible' : 'hidden')
    S($.seam, 'clipPath', `inset(${f2(100 - sm * 100)}% 0 0 0)`)
    let cz = 1, ctx = 0, cty = 0
    const ki = M.kw.insta
    if (ki && ki.w > 0 && T >= 0.7 && T < 1.55) {
      const Fx = ki.x + ki.w / 2, Fy = ki.y + ki.h / 2
      const k = tw(T, 1.0, 1.5, 'oe')
      cz = L(cl(700 / ki.w, 1.8, 5), 1, k)
      ctx = L(400, Fx, k) - cz * Fx; cty = L(438, Fy, k) - cz * Fy
    }
    const fz = tw(T, 11.75, 12.25, 'io') * (1 - tw(T, 12.5, 12.95, 'io'))
    if (fz > 0) { cz = L(1, 0.9, fz); ctx = 400 * (1 - cz); cty = 448 * (1 - cz) }
    S(cam, 'transform', cz === 1 && ctx === 0 && cty === 0 ? 'none' : `${TR(ctx, cty)} scale(${f4(cz)})`)
    // 1 to 2.5 s: back out into the brief; the key phrases light up.
    const s4 = T >= 0.75 && T < 1.0 ? 1 : T >= 1.0 && T < 1.32 ? 1 - tw(T, 1.0, 1.32) : 0
    S($.slam4bg, 'opacity', String(f2(s4))); S($.slam4bg, 'visibility', s4 > 0 ? 'visible' : 'hidden')
    S($['hls-insta'], 'opacity', String(f2(s4)))
    const pa = T < 0.75 ? 0 : bell(T, 1.05, 1.45, 2.45, 2.8)
    S($['brief-p'], '--pa', String(f2(pa)))
    S($['brief-lbl'], 'opacity', String(f2(bell(T, 1.15, 1.4, 2.45, 2.7))))
    for (const k of KW) {
      S($[`kw-${k}`], 'opacity', String(f2(T < 2.55 ? (k === 'insta' ? (T >= 0.75 ? 1 : 0) : pa) : 0)))
      const hk = k === 'insta' ? (T >= 0.75 ? 1 : 0) : tw(T, HLT[k], HLT[k] + 0.2, 'oe')
      S($[`hl-${k}`], 'transform', `scaleX(${f4(hk)})`)
      S($[`kt-${k}`], 'color', k === 'insta' ? mix('#0c0c0e', '#ffffff', tw(T, 1.0, 1.3)) : hk > 0.5 ? '#ffffff' : '#d9d9de')
    }
    // 2.5 to 6 s: each phrase flies into the post and becomes part of it.
    const fly = (k: string, show: boolean, x: number, y: number, sx: number, sy: number, o: number) => {
      const f = $[`fly-${k}`], r = M.kw[k]
      S(f, 'visibility', show && r ? 'visible' : 'hidden')
      if (!show || !r) return
      S(f, 'transform', `${TR(x - r.x, y - r.y)} scale(${f4(sx)},${f4(sy)})`)
      S(f, 'opacity', String(f2(o)))
    }
    const chipH = 30 * ui
    if (M.kw.insta) {
      const r = M.kw.insta, k = tw(T, 2.55, 2.85, 'io'), s = L(1, chipH / Math.max(1, r.h), k)
      fly('insta', T >= 2.55 && T < 2.93, L(r.x, IG.x, k), L(r.y, IG.y - chipH - 10, k), s, s, 1 - seg(T, 2.8, 2.93))
    }
    if (M.kw.coffee) {
      const r = M.kw.coffee, k = tw(T, 3.0, 3.35, 'io')
      const rx0 = L(r.x, IG.x, k), ry0 = L(r.y, IG.y, k), rw = L(r.w, IG.w, k), rh = L(r.h, IG.h, k)
      fly('coffee', T >= 2.55 && T < 3.36, rx0, ry0, rw / Math.max(1, r.w), rh / Math.max(1, r.h), 1 - seg(T, 3.24, 3.36))
      S($['flyt-coffee'], 'opacity', String(f2(1 - seg(T, 3.0, 3.1))))
      S($['L-photo'], 'clipPath', T >= 3.0 && T < 3.35 ? `inset(${f2(ry0 - IG.y)}px ${f2(IG.x + IG.w - rx0 - rw)}px ${f2(IG.y + IG.h - ry0 - rh)}px ${f2(rx0 - IG.x)}px round 6px)` : 'none')
    }
    if (M.kw.warm) {
      const r = M.kw.warm, k = tw(T, 3.4, 3.62, 'io'), s = L(1, 0.3, seg(T, 3.58, 3.72))
      fly('warm', T >= 2.55 && T < 3.74, L(r.x, 400 - r.w / 2, k) + (r.w * (1 - s)) / 2, L(r.y, 784 - r.h / 2, k) + (r.h * (1 - s)) / 2, s, s, 1 - seg(T, 3.6, 3.74))
    }
    if (M.kw.quiet) {
      const r = M.kw.quiet, k = tw(T, 3.95, 4.24, 'io')
      const s = L(1, Math.min(117 / Math.max(1, r.h), 430 / Math.max(1, r.w)), k), drop = seg(T, 4.2, 4.36)
      fly('quiet', T >= 2.55 && T < 4.37, L(r.x, 184, k), L(r.y, 408, k) + drop * r.h * s * 0.5, s, s, 1 - drop)
    }
    if (M.kw.yaba) {
      const r = M.kw.yaba, k = tw(T, 4.65, 4.95, 'io')
      const tx = IG.x + M.yaba.x * 4.8, ty = IG.y + IG.h - 8 * 4.8 - M.tagH * 4.8 + M.yaba.y * 4.8
      const s = L(1, (M.yaba.h * 4.8) / Math.max(1, r.h), k)
      fly('yaba', T >= 2.55 && T < 5.02, L(r.x, tx, k), L(r.y, ty, k), s, s, 1 - seg(T, 4.9, 5.02))
    }
    // The board: Instagram post, then four formats, then a row of all four, then files.
    let bw = FORMATS[0][0], bh = FORMATS[0][1]
    for (const [at, a, b] of MORPHS) if (T >= at) { const k = tw(T, at, at + 0.36, 'om'); bw = L(FORMATS[a][0], FORMATS[b][0], k); bh = L(FORMATS[a][1], FORMATS[b][1], k) }
    let bx = 400 - bw / 2, by = 438 - bh / 2, br = 0
    const kf = tw(T, 11.75, 12.25, 'io')
    if (kf > 0) { const fs = FAN[3]; bx = L(bx, fs[0], kf); by = L(by, fs[1], kf); bw = L(bw, fs[2], kf); bh = L(bh, fs[3], kf) }
    const kcm = tw(T, 12.64, 13.09, 'io')
    if (kcm > 0) { const s = SLOT[3]; bx = L(bx, s.x, kcm); by = L(by, s.y, kcm); bw = L(bw, s.w, kcm); bh = L(bh, s.h, kcm); br = s.r * kcm }
    S(board, 'left', `${f2(bx)}px`); S(board, 'top', `${f2(by)}px`); S(board, 'width', `${f2(bw)}px`); S(board, 'height', `${f2(bh)}px`)
    S(board, '--u', `${f2(Math.min(bw, bh * 0.8) / 100)}px`)
    S(board, 'visibility', T >= 2.7 ? 'visible' : 'hidden')
    S(board, 'zIndex', T >= 11.7 && T < 12.62 ? '3' : '')
    const kd = tw(T, 2.7, 3.05, 'io')
    S(board, 'clipPath', T >= 2.7 && T < 3.05 ? `inset(0 ${f2((1 - kd) * 100)}% ${f2((1 - kd) * 100)}% 0)` : 'none')
    // 6 to 8 s: the layers come apart in depth and slam shut on the beat.
    const a3 = tw(T, 6.0, 6.5, 'io'), c3 = tw(T, 7.6, 8.0, 'oc'), o3 = seg(T, 6.5, 7.6)
    const rx = L(0, L(20, 13, o3), a3) * (1 - c3), ry = L(0, L(-34, -18, o3), a3) * (1 - c3)
    const bs = (1 - 0.17 * a3 * (1 - c3)) * (1 + 0.03 * bell(T, 7.97, 8.0, 8.03, 8.18))
    let tfb = ''
    if (br) tfb += `rotate(${f2(br)}deg) `
    if (Math.abs(rx) > 0.001 || Math.abs(ry) > 0.001) tfb += `rotateX(${f2(rx)}deg) rotateY(${f2(ry)}deg) `
    if (Math.abs(bs - 1) > 0.0001) tfb += `scale(${f4(bs)})`
    S(board, 'transform', tfb || 'none')
    const ex = tw(T, 6.2, 6.85, 'oe') * (1 - tw(T, 7.55, 7.92, 'ie'))
    const lift = tw(T, 8.0, 8.2) * (1 - tw(T, 9.8, 10.08))
    for (let i = 0; i < 6; i++) {
      const zz = LZ[i] * ex, ly = i > 0 ? -14 * lift : 0
      S(LAY[i], 'transform', Math.abs(zz) > 0.01 || ly ? `translate3d(0,${f2(ly)}px,${f2(zz)}px)` : 'none')
      S(LAY[i], 'boxShadow', ex > 0.01 ? `inset 0 0 0 2px rgba(185,175,255,${f2(0.55 * ex)})` : 'none')
      if (i > 0) S(LAY[i], 'opacity', String(f2((1 - lift) * (i === 1 ? tw(T, 3.55, 3.95) : 1))))
      S(CHIP[i], 'opacity', String(f2(bell(T, 6.5 + i * 0.04, 6.72 + i * 0.04, 7.36, 7.52))))
    }
    S($.flash, 'opacity', String(f2(T >= 8 ? 0.32 * (1 - tw(T, 8.0, 8.24)) : 0)))
    S($['img-photo'], 'opacity', T >= 3.0 ? '1' : '0')
    for (let i = 0; i < LET.length; i++) {
      const k = tw(T, 4.22 + i * 0.028, 4.56 + i * 0.028, 'oe')
      S(LET[i], 'transform', k >= 1 ? 'none' : `translate3d(0,${f2((1 - k) * 108)}%,0)`)
    }
    S($['tag-y'], 'opacity', String(f2(seg(T, 4.9, 5.0))))
    const kt = tw(T, 4.95, 5.3)
    S($['tag-a'], 'clipPath', `inset(0 0 0 ${f2(100 - kt * 100)}%)`)
    S($['tag-b'], 'clipPath', `inset(0 ${f2(100 - kt * 100)}% 0 0)`)
    const e1 = Math.floor(seg(T, 5.2, 5.5) * 17) / 17, e2 = Math.floor(seg(T, 5.32, 5.46) * 4) / 4
    S($['eye-a'], 'clipPath', `inset(0 ${f2(100 - e1 * 100)}% 0 0)`)
    S($['eye-b'], 'clipPath', `inset(0 ${f2(100 - e2 * 100)}% 0 0)`)
    const kbd = tw(T, 5.45, 5.85, 'ob')
    S($.badge, 'transform', `rotate(${f2(L(-80, -12, c01(kbd)))}deg) scale(${f4(Math.max(0, kbd))})`)
    S($.badge, 'visibility', T >= 5.45 ? 'visible' : 'hidden')
    for (let i = 0; i < 5; i++) {
      const k = tw(T, 3.6 + i * 0.035, 3.95 + i * 0.035, 'ob'), out = tw(T, 6.0 + i * 0.03, 6.2 + i * 0.03, 'ic')
      S(SWS[i], 'visibility', T >= 3.6 && out < 1 ? 'visible' : 'hidden')
      S(SWS[i], 'transform', `${TR((376 - SWX[i]) * (1 - c01(k)), 0)} scale(${f4(Math.max(0, k) * (1 - out))})`)
    }
    const bi = T < 10.15 ? 0 : T < 10.65 ? 1 : T < 11.15 ? 2 : 3
    const kb = bi === 0 ? 1 : tw(T, MORPHS[bi - 1][0], MORPHS[bi - 1][0] + 0.3, 'oe')
    let blo = T < 2.8 ? 0 : T < 2.93 ? seg(T, 2.8, 2.93) : 1 - seg(T, 11.72, 11.88)
    blo *= (1 - 0.8 * bell(T, 5.95, 6.15, 7.8, 8.0)) * (1 - bell(T, 8.0, 8.15, 9.85, 10.0))
    S($.blabel, 'opacity', String(f2(blo))); S($.blabel, 'visibility', blo > 0 ? 'visible' : 'hidden')
    S($.blabel, 'transform', TR(bx, by - chipH - 10))
    S($.blbg, 'width', `${f2(bi === 0 ? M.bl[0] : L(M.bl[bi - 1], M.bl[bi], kb))}px`)
    for (let i = 0; i < 4; i++) {
      const v = i === bi ? kb : i === bi - 1 ? 1 - kb : 0
      S($[`bl-${i}`], 'opacity', String(f2(v)))
      S($[`bl-${i}`], 'transform', TR(0, (1 - v) * (i === bi ? 10 : -10)))
    }
    // 8 to 10 s: Effects. Real Halftone, Pop Art, Glitch and Film Grain renders wipe across the photo.
    let wlx = 0, wlo = 0
    for (let i = 0; i < 4; i++) {
      const a = FXT[i], k = tw(T, a, a + 0.24, 'io')
      S(FX[i], 'visibility', T >= a ? 'visible' : 'hidden')
      S(FX[i], 'clipPath', T >= a && k < 1 ? `inset(0 ${f2(100 - k * 100)}% 0 0)` : 'none')
      if (T >= a && T < a + 0.3) { wlx = k * bw; wlo = bell(T, a, a + 0.03, a + 0.22, a + 0.3) }
    }
    S($.wline, 'opacity', String(f2(wlo))); S($.wline, 'transform', TR(wlx, 0))
    const fi = T < FXT[1] ? 0 : T < FXT[2] ? 1 : T < FXT[3] ? 2 : 3
    const kf2 = tw(T, FXT[fi], FXT[fi] + 0.25, 'oe')
    const flo = bell(T, 8.0, 8.14, 9.96, 10.12)
    S($.fxl, 'opacity', String(f2(flo))); S($.fxl, 'visibility', flo > 0 ? 'visible' : 'hidden')
    S($.fxl, 'transform', TR(400 - M.fxl / 2, by + bh + 24))
    for (let i = 0; i < 4; i++) {
      const v = fi === 0 ? (i === 0 ? 1 : 0) : i === fi ? kf2 : i === fi - 1 ? 1 - kf2 : 0
      S($[`fxv-${i}`], 'opacity', String(f2(v)))
      S($[`fxv-${i}`], 'transform', TR(0, (1 - v) * (i === fi ? 10 : -10)))
    }
    const on2 = tw(T, 9.62, 9.8, 'oe')
    S($['fxn-0'], 'opacity', String(f2(1 - on2))); S($['fxn-1'], 'opacity', String(f2(on2)))
    S($['fxn-1'], 'color', on2 > 0.5 ? '#b9afff' : '#91919f')
    // 10 to 12.5 s: every format, then all four side by side.
    for (let i = 0; i < 3; i++) {
      const el = MINI[i], fs = FAN[i], vis = T >= 11.8
      S(el, 'visibility', vis ? 'visible' : 'hidden')
      if (!vis) continue
      const k = tw(T, 11.8 + i * 0.05, 12.28 + i * 0.05, 'oe')
      let w = L(fs[2] * 0.6, fs[2], k), h = L(fs[3] * 0.6, fs[3], k)
      let x = L(400 - w / 2, fs[0], k), y = L(438 - h / 2, fs[1], k), r = 0
      const kc = tw(T, 12.55 + i * 0.03, 13.0 + i * 0.03, 'io')
      if (kc > 0) { const s = SLOT[i]; x = L(x, s.x, kc); y = L(y, s.y, kc); w = L(w, s.w, kc); h = L(h, s.h, kc); r = s.r * kc }
      S(el, 'opacity', String(f2(c01(k * 1.6))))
      S(el, 'left', `${f2(x)}px`); S(el, 'top', `${f2(y)}px`); S(el, 'width', `${f2(w)}px`); S(el, 'height', `${f2(h)}px`)
      S(el, '--u', `${f2(Math.min(w, h * 0.8) / 100)}px`)
      S(el, 'transform', r ? `rotate(${f2(r)}deg)` : 'none')
    }
    for (let i = 0; i < 4; i++) S($[`fanl-${i}`], 'opacity', String(f2(bell(T, 12.05 + i * 0.03, 12.3 + i * 0.03, 12.48, 12.6))))
    // 12.5 to 15 s: Export, and the finished files. The cream wipe loops back to the first word.
    for (let i = 0; i < 4; i++) {
      const g = CARDG[i], el = CARDEL[i], vis = T >= 12.6
      S(el, 'visibility', vis ? 'visible' : 'hidden')
      if (!vis) continue
      const k = tw(T, 12.6 + i * 0.04, 12.98 + i * 0.04, 'oe')
      S(el, 'opacity', String(f2(k)))
      S(el, 'transform', `${TR(g.dx, g.dy + (1 - k) * 24)} rotate(${f2(g.r)}deg) scale(${f4(0.92 + 0.08 * k)})`)
    }
    S($.fname, 'clipPath', `inset(0 ${f2(100 - tw(T, 12.95, 13.25) * 100)}% 0 0)`)
    S($.fmeta, 'opacity', String(f2(tw(T, 13.08, 13.3))))
    const kck = tw(T, 13.05, 13.4, 'ob')
    S($.check, 'visibility', T >= 13.05 ? 'visible' : 'hidden')
    S($.check, 'transform', `scale(${f4(Math.max(0, kck))}) rotate(${f2(L(-30, 0, c01(kck)))}deg)`)
    const kn = tw(T, 13.2, 13.5)
    S($.note, 'opacity', String(f2(kn))); S($.note, 'transform', TR(0, (1 - kn) * 10))
    // The side panels only show when the tab is wide (the Highlights panel on a desktop).
    if (sideF > 0.01) {
      let yy = 0
      for (let i = 0; i < ROWS.length; i++) {
        const v = tw(T, ROWT[i], ROWT[i] + 0.25, 'oe')
        S(ROWS[i], 'opacity', String(f2(v))); S(ROWS[i], 'transform', TR(0, yy))
        yy += v * 50
      }
      S($.fxact, 'opacity', T >= FXT[0] ? '1' : '0'); S($.fxact, 'transform', TR(0, fi * 50))
      for (let i = 0; i < 4; i++) S($[`pb-${i}`], 'opacity', i === bi ? '1' : '0')
      for (let i = 0; i < 5; i++) S(PSW[i], 'opacity', String(f2(tw(T, 3.6 + i * 0.04, 3.9 + i * 0.04))))
      const pf = T < FXT[0] ? 0 : fi + 1
      for (let i = 0; i < 5; i++) S($[`pf-${i}`], 'opacity', i === pf ? '1' : '0')
    }
    // The headline follows the loop: "brief" while the brief is on screen, "finished file." when the files land.
    S($['u-brief'], 'transform', `scaleX(${f4(tw(T, 0.05, 0.42, 'oe') * (1 - tw(T, 2.45, 2.75, 'ic')))})`)
    S($['u-file'], 'transform', `scaleX(${f4(tw(T, 12.6, 12.98, 'oe') * (1 - tw(T, 14.7, 14.95, 'ic')))})`)
  }

  const frameAt = (now: number) => {
    const reduced = mq.matches
    const T = hold !== null ? hold : reduced ? 14.2 : (Math.max(0, now - origin) / 1000) % LOOP
    const pr = c01((window.scrollY - trackTop) / Math.max(1, D))
    pS += (pr - pS) * (reduced ? 1 : 0.2)
    if (Math.abs(pr - pS) < 0.0004) pS = pr
    const tab = opts.getTab()
    const artK = tab !== 0 ? seg(pS, 0.88, 0.95) : 0
    scene(pS, reduced ? 9 : (now - born) / 1000, reduced, T, artK)
    if (artK < 1) loop(T, reduced ? 9 : (now - born) / 1000, reduced, tab)
    if (!seen && pS >= 0.9) { seen = true; opts.onHighlights?.() }
  }

  // Run only while the hero is on screen. When it leaves, settle one last frame so the nav keeps its button.
  let raf = 0, running = false, dead = false
  const tick = (now: number) => {
    if (dead || !running) return
    raf = requestAnimationFrame(tick)
    frameAt(now)
  }
  const start = () => { if (running || dead) return; running = true; raf = requestAnimationFrame(tick) }
  const stop = () => { running = false; cancelAnimationFrame(raf); pS = c01((window.scrollY - trackTop) / Math.max(1, D)); frameAt(performance.now()) }
  const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '0px' })
  io.observe(track)

  const onRestart = () => { origin = performance.now() }
  root.addEventListener('hm:restart', onRestart)
  const onResize = () => { measure(); if (!running) frameAt(performance.now()) }
  const ro = new ResizeObserver(onResize)
  ro.observe(pin); ro.observe($['slot-hero'].parentElement as HTMLElement)
  addEventListener('resize', onResize)
  const timers = [400, 1500, 3000].map(ms => setTimeout(onResize, ms))
  document.fonts?.ready.then(() => { if (!dead) onResize() })
  // The effect renders are only needed from 8 s in; fetch them once the page has settled.
  timers.push(setTimeout(() => root.querySelectorAll<HTMLImageElement>('img[data-src]').forEach(img => { img.src = img.dataset.src! }), 1200))
  measure()
  frameAt(performance.now())

  return () => {
    dead = true; running = false
    cancelAnimationFrame(raf); io.disconnect(); ro.disconnect()
    removeEventListener('resize', onResize)
    root.removeEventListener('hm:restart', onRestart)
    timers.forEach(clearTimeout)
    if (dock) { dock.style.opacity = ''; dock.style.visibility = '' }
  }
}

// Cuts the six campaign videos: title cards from HTML, footage from the recordings, captions as ASS, VO and music mixed in ffmpeg.
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
const V = '/home/claude/video', F = `${V}/footage`, CARDS = `${V}/cards`, OUT = `${V}/out`, VO = `${V}/vo`, MUSIC = `${V}/music`
const TMP = `${V}/tmp`; fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); fs.mkdirSync(OUT, { recursive: true })
const W = 1080, H = 1350, FPS = 30
const only = process.argv[2]
const lines = JSON.parse(fs.readFileSync(`${VO}/lines.json`, 'utf8'))
const fonts = fs.readFileSync('/home/claude/statics/fonts.css', 'utf8')
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' })
const dur = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString())
const marks = name => JSON.parse(fs.readFileSync(`${F}/${name}.json`, 'utf8'))
const at = (name, label) => marks(name).find(m => m.label.includes(label))?.t

// ─── Cards ────────────────────────────────────────────────────────
const browser = await chromium.launch()
const cardPage = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage()
const CSS = `${fonts}*{box-sizing:border-box;margin:0;padding:0}html,body{width:${W}px;height:${H}px;overflow:hidden}body{font-family:Inter,sans-serif;background:#0b0b0e;color:#fff;-webkit-font-smoothing:antialiased;position:relative}
.paper{background:#f2f0ea;color:#0b0b0e}.h{font-weight:600;letter-spacing:-0.05em;line-height:.92;text-transform:uppercase}.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px}
.mono{font-family:"JetBrains Mono",monospace}.mark{position:absolute;left:80px;bottom:72px;font-size:26px;font-weight:600}.mark span{opacity:.45}.credit{position:absolute;right:80px;bottom:72px;font-size:18px;opacity:.45;text-align:right;line-height:1.4}
.bubble{background:#fff;color:#0b0b0e;border-radius:44px 44px 44px 10px;padding:44px 56px;font-size:58px;font-weight:500;letter-spacing:-.02em;line-height:1.15;max-width:860px;box-shadow:0 30px 80px rgba(0,0,0,.5)}.from{font-size:22px;letter-spacing:.14em;text-transform:uppercase;opacity:.5;margin-bottom:26px}`
let cardN = 0
async function card(body, cls = '') {
  const f = `${CARDS}/c${++cardN}.png`
  await cardPage.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body class="${cls}">${body}</body></html>`)
  await cardPage.evaluate(() => document.fonts.ready); await cardPage.waitForTimeout(120)
  await cardPage.screenshot({ path: f }); return f
}
const big = (t, size = 120, extra = '') => `<div class="center"><div class="h" style="font-size:${size}px;${extra}">${t}</div></div>`
const end = (line, credit) => `<div class="center"><div class="h" style="font-size:150px">Voidcanvas</div>${line ? `<div class="h" style="font-size:64px;margin-top:40px;opacity:.6">${line}</div>` : ''}<div style="margin-top:60px;font-size:26px;opacity:.6">voidcanvas.netlify.app · No account · Free</div></div><div class="credit">Music: ${credit}<br>Kevin MacLeod (incompetech.com), CC BY 4.0</div>`

// ─── Segments ─────────────────────────────────────────────────────
let segN = 0
const enc = ['-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-an']
function still(png, seconds, fade = 0.35) {
  const f = `${TMP}/s${++segN}.mp4`
  ff(['-loop', '1', '-t', String(seconds), '-i', png, '-vf', `scale=${W}:${H},fade=t=in:st=0:d=${fade},fade=t=out:st=${Math.max(0, seconds - fade)}:d=${fade},format=yuv420p`, ...enc, f])
  return { f, d: seconds }
}
function clip(name, from, to, speed = 1, crop = null) {
  const f = `${TMP}/s${++segN}.mp4`
  const vf = [crop ? `crop=${crop}` : null, `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`, `setpts=PTS/${speed}`, 'format=yuv420p'].filter(Boolean).join(',')
  ff(['-ss', String(from), '-to', String(to), '-i', `${F}/${name}.webm`, '-vf', vf, ...enc, f])
  return { f, d: (to - from) / speed }
}
/** Like clip, but skips the slow middle of every Add dialog (thumbnails render slowly when recorded), keeping the open and the pick. */
function condense(name, from, to, speed = 1) {
  const ms = marks(name); const cuts = []
  for (let i = 0; i < ms.length - 1; i++) if (ms[i].label.includes('click header button:has-text("Add")') && ms[i + 1].label.includes('[role=dialog]')) { const a = ms[i].t + 0.7, b = ms[i + 1].t - 0.55; if (b > a + 0.3 && a > from && b < to) cuts.push([a, b]) }
  const parts = []; let cur = from
  for (const [a, b] of cuts) { parts.push(clip(name, cur, a, speed)); cur = b }
  parts.push(clip(name, cur, to, speed))
  return parts
}
function concat(segs, out) {
  const list = `${TMP}/list${++segN}.txt`; fs.writeFileSync(list, segs.map(s => `file '${s.f}'`).join('\n'))
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out])
}

// ─── Captions (ASS) ───────────────────────────────────────────────
const ts = s => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = (s % 60).toFixed(2).padStart(5, '0'); return `${h}:${String(m).padStart(2, '0')}:${sec}` }
function ass(caps, file) {
  // caps: [{start,end,text,style}]
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${W}\nPlayResY: ${H}\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: cap,Inter,52,&H00FFFFFF,&H00FFFFFF,&H00000000,&HA0000000,1,0,0,0,100,100,-1,0,3,14,0,2,80,80,150,1
Style: word,Inter,150,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,-6,0,1,0,0,5,60,60,0,1
Style: chip,Inter,40,&H000B0B0E,&H00FFFFFF,&H00FFFFFF,&H00FFFFFF,1,0,0,0,100,100,0,0,3,16,0,8,80,80,140,1
Style: clock,JetBrains Mono,110,&H003B3BFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,-4,0,1,0,0,8,60,60,110,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
  const ev = caps.map(c => `Dialogue: 0,${ts(c.start)},${ts(c.end)},${c.style || 'cap'},,0,0,0,,${c.text.replace(/\n/g, '\\N')}`).join('\n')
  fs.writeFileSync(file, head + ev + '\n')
}

// ─── Mix ──────────────────────────────────────────────────────────
function mix(video, out, { vo = [], music, musicVol = 0.16, total, assFile }) {
  // vo: [{i, at}] lines placed at seconds
  const inputs = ['-i', video]
  const filters = []; const mixIn = []
  if (music) { inputs.push('-i', `${MUSIC}/${music}.mp3`); filters.push(`[1:a]atrim=0:${total},volume=${musicVol},afade=t=in:st=0:d=1,afade=t=out:st=${total - 2.5}:d=2.5[m]`); mixIn.push('[m]') }
  vo.forEach((v, k) => { inputs.push('-i', `${VO}/${String(v.i).padStart(2, '0')}.wav`); const idx = k + (music ? 2 : 1); filters.push(`[${idx}:a]adelay=${Math.round(v.at * 1000)}|${Math.round(v.at * 1000)},volume=1.0[v${k}]`); mixIn.push(`[v${k}]`) })
  filters.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,apad,atrim=0:${total}[a]`)
  const vf = assFile ? `ass=${assFile}:fontsdir=/home/claude/video/fonts` : 'null'
  ff([...inputs, '-filter_complex', `${filters.join(';')};[0:v]${vf}[v]`, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(total), out])
}
const L = i => lines.find(l => l.i === i)
/** Lay VO lines one after another from a start time, with a gap; returns placements and caption events. */
function speak(ids, start, gap = 0.45) {
  const vo = [], caps = []; let t = start
  for (const i of ids) { const l = L(i); vo.push({ i, at: t }); caps.push({ start: t, end: t + l.dur + gap * 0.6, text: l.text }); t += l.dur + gap }
  return { vo, caps, end: t }
}
const sum = segs => segs.reduce((a, s) => a + s.d, 0)

// ═══ 01 · 60 SECONDS ═══════════════════════════════════════════════
if (!only || only === '01') {
  const m = 'sixty'
  const segs = [
    still(await card(big('You have<br>60 seconds.', 130)), 2.2),
    ...condense(m, at(m, 'editor') - 0.4, at(m, 'clock 00:04') - 0.1, 1.2),
    clip(m, at(m, 'clock 00:04'), at(m, 'made') + 1.4, 1),
    still(await card(big('You made<br>something.', 140)), 2.4),
    still(await card(end('', 'Voxel Revolution')), 3),
  ]
  const v = `${TMP}/v01.mp4`; concat(segs, v); const total = sum(segs)
  ass([{ start: segs[0].d, end: segs[0].d + segs[1].d, text: 'Turn this photo into a poster for a nightclub called NO SIGNAL.' }], `${TMP}/01.ass`)
  mix(v, `${OUT}/01-sixty-seconds.mp4`, { music: 'Voxel Revolution', musicVol: 0.22, total, assFile: `${TMP}/01.ass` })
}

// ═══ 02 · NO CEREMONY ══════════════════════════════════════════════
if (!only || only === '02') {
  const m = 'ceremony'
  const segs = [
    clip(m, at(m, 'home') - 1.2, at(m, 'editor') + 0.8, 1),
    ...condense(m, at(m, 'editor') + 0.8, at(m, 'made') + 1.5, 1.25),
    still(await card(end('No ceremony.', 'Wallpaper')), 3.2),
  ]
  const v = `${TMP}/v02.mp4`; concat(segs, v); const total = sum(segs)
  const s = speak([0, 1, 2, 3, 4], 0.6, 1.1)
  ass(s.caps, `${TMP}/02.ass`)
  mix(v, `${OUT}/02-no-ceremony.mp4`, { vo: s.vo, music: 'Wallpaper', total, assFile: `${TMP}/02.ass` })
}

// ═══ 03 · ONE IMAGE. FIVE LIVES. ═══════════════════════════════════
if (!only || only === '03') {
  const m = 'lives'
  const t = { photo: at(m, 'photo'), h: at(m, 'Halftone'), d: at(m, 'Dither'), g: at(m, 'Glitch'), e: at(m, 'editor'), p: at(m, 'poster') }
  const segs = [
    still(await card(big('One image.', 150)), 1.6),
    ...condense(m, t.photo - 1.2, t.p + 1.2, 1.25),
    still(await card(big('One image<br>was never<br>just one image.', 96)), 3),
    still(await card(end('', 'Voxel Revolution')), 2.6),
  ]
  const v = `${TMP}/v03.mp4`; concat(segs, v); const total = sum(segs)
  const o = segs[0].d, sp = 1.25, rel = x => o + (x - (t.photo - 1.2)) / sp
  const caps = [['Photo', t.photo, t.h], ['Halftone', t.h, t.d], ['Dither', t.d, t.g], ['Glitch', t.g, t.e], ['Poster', t.e, t.p], ['Social', t.p, t.p + 1.2]].map(([w, a, b]) => ({ start: rel(a), end: rel(b), text: w, style: 'chip' }))
  ass(caps, `${TMP}/03.ass`)
  mix(v, `${OUT}/03-one-image-five-lives.mp4`, { music: 'Voxel Revolution', musicVol: 0.22, total, assFile: `${TMP}/03.ass` })
}

// ═══ 04 · CLIENT FROM HELL ═════════════════════════════════════════
if (!only || only === '04') {
  const m = 'client'
  const msgs = ['Can we make it pop?', 'Can we have another version?', 'Story size too.', 'A4 please.', 'Actually can you make it black?']
  const segs = []
  for (const t of msgs) { segs.push(still(await card(`<div class="center" style="align-items:flex-start;text-align:left"><div class="from">The client · just now</div><div class="bubble">${t}</div></div>`), 1.5, 0.12)); segs.push(still(await card(''), 0.25, 0.05)) }
  segs.push(...condense(m, at(m, 'editor') - 0.3, at(m, 'export') + 2, 1.35))
  segs.push(still(await card(big("The client<br>isn't going away.<br><span style=\"opacity:.55\">Make the<br>work easier.</span>", 96)), 3.4))
  segs.push(still(await card(end('', 'Carefree')), 2.6))
  const v = `${TMP}/v04.mp4`; concat(segs, v); const total = sum(segs)
  mix(v, `${OUT}/04-client-from-hell.mp4`, { music: 'Carefree', musicVol: 0.2, total })
}

// ═══ 05 · THE OTHER 80% ════════════════════════════════════════════
if (!only || only === '05') {
  const m = 'eighty'
  const words = ['Resize.', 'Export.', 'Version.', 'Revision.', 'Artboard.', 'PDF.', 'Story.', 'Web.', 'Print.', 'Client.', 'Again.']
  const segs = [...condense(m, at(m, 'editor') - 0.5, at(m, 'boards') + 0.3, 1.1), clip(m, at(m, 'boards') + 0.3, at(m, 'export') + 2.4, 1)]
  // Voice first, words flash over the footage, then the line.
  const s = speak([5, 6], 0.4, 0.5)
  const wordStart = s.end + 0.2, each = 0.5
  const s2 = speak([7, 8, 9, 10, 11], wordStart + words.length * each + 0.3, 0.35)
  const need = s2.end + 0.6
  let v0 = `${TMP}/v05a.mp4`; concat(segs, v0)
  // Loop/extend footage to cover the voice: hold the last frame.
  const have = sum(segs); if (have < need) { const last = `${TMP}/last05.png`; ff(['-sseof', '-0.1', '-i', v0, '-frames:v', '1', last]); segs.push(still(last, need - have, 0.01)) }
  segs.push(still(await card(big('Make the work.', 150)), 2.8)); segs.push(still(await card(end('', 'Deliberate Thought')), 2.6))
  const v = `${TMP}/v05.mp4`; concat(segs, v); const total = sum(segs)
  const caps = [...s.caps, ...words.map((w, k) => ({ start: wordStart + k * each, end: wordStart + (k + 1) * each, text: w, style: 'word' })), ...s2.caps]
  ass(caps, `${TMP}/05.ass`)
  mix(v, `${OUT}/05-the-other-80.mp4`, { vo: [...s.vo, ...s2.vo], music: 'Deliberate Thought', total, assFile: `${TMP}/05.ass` })
}

// ═══ 06 · MAKE SOMETHING ═══════════════════════════════════════════
if (!only || only === '06') {
  const m = 'make', p = 'phone'
  const segs = [
    ...condense(m, at(m, 'make') - 1, at(m, 'made') + 2.5, 1.2),
    clip(p, 0.3, marks(p).at(-1).t + 0.5, 1.3),
    still(await card(end('Open. Make.', 'Inspired')), 3.5),
  ]
  const v = `${TMP}/v06.mp4`; concat(segs, v); const total = sum(segs)
  const s = speak([12, 13, 14, 15, 16, 17, 18, 19, 20], 0.8, 0.55)
  const last = L(21); const lastAt = total - 3.5 - last.dur - 0.5
  s.vo.push({ i: 21, at: lastAt }); s.caps.push({ start: lastAt, end: lastAt + last.dur + 0.4, text: 'Make something.', style: 'word' })
  ass(s.caps, `${TMP}/06.ass`)
  mix(v, `${OUT}/06-make-something.mp4`, { vo: s.vo, music: 'Inspired', total, assFile: `${TMP}/06.ass` })
}

await browser.close()
console.log(fs.readdirSync(OUT))

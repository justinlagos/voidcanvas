import { RAMP_STEPS, fmtOklch, rgb255 } from './color'
import { toCss, toJson, toTailwind, fileSlug } from './export'
import { localFontFace } from './fonts'
import { logoPlacements, monoMark, type LogoInfo } from './logo'
import type { Brand, FontRef } from './tokens'

// One self-contained HTML file the client opens locally. No hosting, no account.
// Slides with arrow-key navigation, click-to-copy colours, logo downloads, and tokens.

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fam = (f: FontRef, fb: string) => `"${f.family.replace(/"/g, '')}", ${fb}`

/**
 * @param inlineFonts Google font files embedded as @font-face data URLs (from inlineGoogleFontFaces), so the file
 * works offline. Families listed in `linkFonts` could not be fetched and are linked from Google instead.
 */
export function buildHandoffHtml(b: Brand, logo: LogoInfo | null, slides: string[], inlineFonts = '', linkFonts?: string[]): string {
  const fonts = [b.fonts.heading, b.fonts.body, b.fonts.mono]
  const google = linkFonts ?? Array.from(new Set(fonts.filter(f => f.source === 'google').map(f => f.family)))
  const localCss = [inlineFonts, ...Array.from(new Set(fonts.filter(f => f.source === 'local').map(f => f.family))).map(localFontFace)].filter(Boolean).join('\n')
  const gLink = google.length ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${google.map(g => `family=${encodeURIComponent(g).replace(/%20/g, '+')}:wght@400;600;700`).join('&')}&display=swap">` : ''
  const slug = fileSlug(b.name)

  const logoFiles: { label: string; href: string; file: string }[] = []
  if (logo) {
    logoFiles.push({ label: 'Full colour PNG', href: logo.img.toDataURL('image/png'), file: `${slug}-logo.png` })
    logoFiles.push({ label: 'Reversed white PNG', href: monoMark(logo, '#ffffff').toDataURL('image/png'), file: `${slug}-logo-white.png` })
    logoFiles.push({ label: 'Dark mono PNG', href: monoMark(logo, b.surfaces.inkOnLight).toDataURL('image/png'), file: `${slug}-logo-dark.png` })
    if (logo.svg) logoFiles.push({ label: 'Original SVG', href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logo.svg), file: `${slug}-logo.svg` })
  }
  const logoSrc = (mode: string) => logoFiles.find(f => (mode === 'original' ? f.file.endsWith('logo.png') : mode === 'white' ? f.file.endsWith('white.png') : f.file.endsWith('dark.png')))?.href

  const swatch = (hex: string, name: string, ink: string) => {
    const [r, g, bl] = rgb255(hex)
    return `<div class="sw"><button class="chip" style="background:${hex};color:${ink}" data-copy="${hex.toUpperCase()}" aria-label="Copy ${esc(name)} ${hex}"><span>${esc(name)}</span></button>
      <dl><div><dt>HEX</dt><dd><button data-copy="${hex.toUpperCase()}">${hex.toUpperCase()}</button></dd></div>
      <div><dt>RGB</dt><dd><button data-copy="rgb(${r}, ${g}, ${bl})">${r} ${g} ${bl}</button></dd></div>
      <div><dt>OKLCH</dt><dd><button data-copy="${fmtOklch(hex)}">${fmtOklch(hex).replace('oklch(', '').replace(')', '')}</button></dd></div></dl></div>`
  }
  const rampRow = (name: string, ramp: Record<number, string>) => `<div class="ramp"><span class="rn">${esc(name)}</span><div class="cells">${RAMP_STEPS.map(s => `<button style="background:${ramp[s]}" data-copy="${ramp[s].toUpperCase()}" title="${esc(name)} ${s} ${ramp[s]}"><i>${s}</i></button>`).join('')}</div></div>`

  const places = logoPlacements(b, logo)
  const code = { css: toCss(b), tailwind: toTailwind(b), json: toJson(b) }

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(b.name)} brand guidelines</title>
${gLink}
<style>
${localCss}
:root{--brand:${b.roles[0].hex};--accent:${b.roles[2].hex};--ink:${b.surfaces.inkOnLight};--paper:${b.surfaces.light};--line:${b.neutral[200]};--muted:${b.neutral[600]};--dark:${b.surfaces.dark};
--fh:${fam(b.fonts.heading, 'system-ui, sans-serif')};--fb:${fam(b.fonts.body, 'system-ui, sans-serif')};--fm:${fam(b.fonts.mono, 'ui-monospace, monospace')};--r:${Math.min(b.radius, 16)}px}
*{box-sizing:border-box}html{scroll-behavior:smooth}@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.55 var(--fb)}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
header{display:flex;align-items:center;gap:20px;padding:20px clamp(20px,5vw,64px);border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--paper);z-index:5}
header img{height:36px;width:auto}header h1{font:700 20px/1.1 var(--fh);margin:0}
nav{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}nav a{color:var(--muted);text-decoration:none;font-size:14px;padding:6px 10px;border-radius:8px}nav a:hover{color:var(--ink);background:${b.neutral[100]}}
main{max-width:1180px;margin:0 auto;padding:0 clamp(20px,5vw,64px) 96px}
section{padding-top:72px}h2{font:700 clamp(28px,4vw,40px)/1.1 var(--fh);letter-spacing:-.015em;margin:0 0 8px}
.lead{color:var(--muted);max-width:62ch;margin:0 0 28px}
.viewer{background:var(--dark);border-radius:var(--r);padding:clamp(12px,2vw,24px)}
.viewer img{display:block;width:100%;height:auto;border-radius:4px;}
.vbar{display:flex;align-items:center;gap:10px;margin-top:14px;color:#fff}.vbar button{height:36px;min-width:36px;padding:0 12px;border-radius:8px;background:rgba(255,255,255,.1)}.vbar button:hover{background:rgba(255,255,255,.18)}.vbar .count{margin-left:auto;font:14px var(--fm);opacity:.75}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.tile{border-radius:var(--r);aspect-ratio:4/3;display:grid;place-items:center;border:1px solid var(--line)}.tile img{max-width:56%;max-height:52%}
.cap{display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-top:8px}.cap b{font-weight:600}.pass{color:${b.semantic[0].ramp[700]}}.fail{color:${b.semantic[2].ramp[600]}}
.dl{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}.btn{display:inline-flex;align-items:center;height:40px;padding:0 16px;border-radius:10px;background:var(--ink);color:var(--paper);text-decoration:none;font-weight:600;font-size:14px}.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.sw .chip{width:100%;aspect-ratio:3/2;border-radius:var(--r);display:flex;align-items:flex-end;padding:16px;font:600 17px var(--fb);border:1px solid rgba(0,0,0,.06)}
dl{margin:12px 0 0;display:grid;gap:4px}dl div{display:flex;justify-content:space-between;gap:12px;font:13px var(--fm)}dt{color:var(--muted)}dd{margin:0}dd button:hover{text-decoration:underline}
.ramp{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:12px;margin:10px 0}.rn{font-weight:600;font-size:14px}.cells{display:grid;grid-template-columns:repeat(10,1fr);gap:3px}.cells button{height:48px;border-radius:4px;position:relative}.cells i{position:absolute;left:6px;bottom:4px;font:10px var(--fm);font-style:normal;mix-blend-mode:difference;color:#fff}
.scale div{display:grid;grid-template-columns:90px 1fr 220px;gap:16px;align-items:baseline;padding:12px 0;border-top:1px solid var(--line)}.scale .l{color:var(--muted);font-size:14px}.scale .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.scale .v{font:13px var(--fm);color:var(--muted);text-align:right}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:10px 8px;border-top:1px solid var(--line)}th{color:var(--muted);font-weight:500}td .aa{display:inline-block;padding:2px 8px;border-radius:6px;font-weight:600}
.tabs{display:flex;gap:6px;margin-bottom:10px}.tabs button{padding:6px 12px;border-radius:8px;border:1px solid var(--line);font-size:14px}.tabs button[aria-selected=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
pre{background:var(--dark);color:#e8e8ee;border-radius:var(--r);padding:20px;overflow:auto;max-height:460px;font:13px/1.6 var(--fm);margin:0}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--ink);color:var(--paper);padding:10px 16px;border-radius:10px;font-size:14px;opacity:0;pointer-events:none;transition:opacity .15s}.toast.on{opacity:1}
@media (max-width:640px){.scale div{grid-template-columns:70px 1fr}.scale .v{display:none}.ramp{grid-template-columns:1fr}}
</style></head><body>
<header>${logoSrc('original') ? `<img src="${logoSrc('original')}" alt="${esc(b.name)}"><h1 style="font:500 15px var(--fb);color:var(--muted)">Brand guidelines</h1>` : `<h1>${esc(b.name)}</h1>`}
<nav aria-label="Sections"><a href="#guide">Guideline</a><a href="#logo">Logo</a><a href="#colour">Colour</a><a href="#type">Type</a><a href="#contrast">Contrast</a><a href="#tokens">Tokens</a></nav></header>
<main>
<section id="guide"><h2>Brand guidelines</h2><p class="lead">${b.tagline ? esc(b.tagline.replace(/[.!?]*$/, '.')) + ' ' : ''}Use the arrow keys to move between pages.</p>
<div class="viewer"><img id="slide" src="${slides[0] ?? ''}" alt="Guideline page 1">
<div class="vbar"><button id="prev" aria-label="Previous page">Previous</button><button id="next" aria-label="Next page">Next</button><span class="count" id="count">1 / ${slides.length}</span></div></div></section>

<section id="logo"><h2>Logo</h2><p class="lead">Keep clear space of ${b.logo.clearSpace} × the mark height on every side. Never smaller than ${b.logo.minWidth}px wide on screen. Use the version shown for each background.</p>
<div class="grid">${places.map(p => `<div><div class="tile" style="background:${p.bg}">${logoSrc(p.mode) ? `<img src="${logoSrc(p.mode)}" alt="">` : `<span style="width:64px;height:64px;border-radius:50%;background:${p.mode === 'white' ? '#fff' : p.mode === 'dark' ? b.surfaces.inkOnLight : b.roles[0].hex}"></span>`}</div>
<div class="cap"><b>${esc(p.bgName)}</b><span class="${p.ok ? 'pass' : 'fail'}">${p.mode === 'original' ? 'Full colour' : p.mode === 'white' ? 'Reversed' : 'Dark mono'}, ${p.ratio.toFixed(2)}:1</span></div></div>`).join('')}</div>
${logoFiles.length ? `<div class="dl">${logoFiles.map(f => `<a class="btn ghost" href="${f.href}" download="${f.file}">${esc(f.label)}</a>`).join('')}</div>` : ''}</section>

<section id="colour"><h2>Colour</h2><p class="lead">Click any value to copy it.</p>
<div class="grid">${b.roles.map(r => swatch(r.hex, r.name, r.ink)).join('')}${swatch(b.surfaces.light, 'Light surface', b.surfaces.inkOnLight)}${swatch(b.surfaces.dark, 'Dark surface', '#ffffff')}</div>
<div style="margin-top:36px">${b.roles.map(r => rampRow(r.name, r.ramp)).join('')}${rampRow('Neutral', b.neutral)}${b.semantic.map(r => rampRow(r.name, r.ramp)).join('')}</div></section>

<section id="type"><h2>Type</h2><p class="lead">${esc(b.fonts.pairing)}. ${esc(b.ratioLabel)} scale, ${b.ratio} on a ${b.baseSize}px base.</p>
<div class="scale">${b.scale.map(s => `<div><span class="l">${s.label}</span><span class="s" style="font-family:${s.family === 'heading' ? 'var(--fh)' : 'var(--fb)'};font-size:${Math.min(s.px, 96)}px;font-weight:${s.weight};line-height:${s.lineHeight};letter-spacing:${s.tracking}em">${esc(s.px >= 28 ? b.name : b.principles[0].body)}</span><span class="v">${s.px}px / ${s.lineHeight} / ${s.tracking}em / ${s.weight}</span></div>`).join('')}</div></section>

<section id="contrast"><h2>Contrast</h2><p class="lead">WCAG 2.2. Body text needs 4.5:1, large text and icons 3:1.</p>
<table><thead><tr><th>Use</th><th>Pair</th><th>Ratio</th><th>Result</th></tr></thead><tbody>${b.pairs.map(p => `<tr><td>${esc(p.use)}</td><td><span style="background:${p.bg};color:${p.fg};padding:3px 10px;border-radius:6px;font-weight:600">Aa</span> ${esc(p.fgName)} on ${esc(p.bgName)}</td><td style="font-family:var(--fm)">${p.ratio.toFixed(2)}:1</td><td class="${p.ratio >= p.need ? 'pass' : 'fail'}">${p.ratio >= p.need ? p.grade : 'Fail'}</td></tr>`).join('')}</tbody></table></section>

<section id="tokens"><h2>Tokens</h2><p class="lead">The same values, ready for code.</p>
<div class="tabs" role="tablist">${(['css', 'tailwind', 'json'] as const).map((k, i) => `<button role="tab" aria-selected="${i === 0}" data-tab="${k}">${k === 'css' ? 'CSS' : k === 'json' ? 'JSON' : 'Tailwind'}</button>`).join('')}<button class="btn" style="margin-left:auto;height:34px" id="copycode">Copy</button></div>
${(['css', 'tailwind', 'json'] as const).map((k, i) => `<pre id="code-${k}"${i ? ' hidden' : ''}>${esc(code[k])}</pre>`).join('')}</section>
</main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
(function(){
var S=${JSON.stringify(slides)},i=0,img=document.getElementById('slide'),cnt=document.getElementById('count');
function go(n){if(!S.length)return;i=(n+S.length)%S.length;img.src=S[i];img.alt='Guideline page '+(i+1);cnt.textContent=(i+1)+' / '+S.length}
document.getElementById('prev').onclick=function(){go(i-1)};document.getElementById('next').onclick=function(){go(i+1)};
document.addEventListener('keydown',function(e){if(e.target.closest&&e.target.closest('input,textarea'))return;if(e.key==='ArrowRight')go(i+1);if(e.key==='ArrowLeft')go(i-1)});
var t=document.getElementById('toast'),tt;function toast(m){t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},1400)}
function copy(v){(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){toast('Copied '+v)},function(){var a=document.createElement('textarea');a.value=v;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Copied '+v)}catch(_){toast('Select and copy: '+v)}a.remove()})}
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(b)copy(b.getAttribute('data-copy'))});
var cur='css';document.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){cur=b.getAttribute('data-tab');document.querySelectorAll('[data-tab]').forEach(function(x){x.setAttribute('aria-selected',x===b)});['css','tailwind','json'].forEach(function(k){document.getElementById('code-'+k).hidden=k!==cur})}});
document.getElementById('copycode').onclick=function(){var v=document.getElementById('code-'+cur).textContent;(navigator.clipboard?navigator.clipboard.writeText(v):Promise.reject()).then(function(){toast('Copied '+cur.toUpperCase())},function(){toast('Copy blocked. Select the code instead.')})};
})();
</script></body></html>`
}

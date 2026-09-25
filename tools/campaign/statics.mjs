// Renders the 24 campaign statics (1080x1350) from HTML, using real app captures where the copy calls for the interface.
import { chromium } from 'playwright'
import fs from 'node:fs'
const D = '/home/claude/statics', OUT = `${D}/out`, S = `${D}/shots`, P = `${D}/photos`
fs.mkdirSync(OUT, { recursive: true })
const fonts = fs.readFileSync(`${D}/fonts.css`, 'utf8')

const BASE_CSS = `
${fonts}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;background:#0b0b0e;color:#fff;-webkit-font-smoothing:antialiased;position:relative}
.paper{background:#f2f0ea;color:#0b0b0e}
.h{font-weight:600;letter-spacing:-0.05em;line-height:0.92;text-transform:uppercase}
.h1{font-size:150px}.h2{font-size:120px}.h3{font-size:96px}.h4{font-size:78px}
.pad{position:absolute;inset:0;padding:96px 80px}
.mark{position:absolute;left:80px;bottom:72px;font-size:26px;font-weight:600;letter-spacing:-0.02em}
.mark span{opacity:.45}
.url{position:absolute;right:80px;bottom:72px;font-size:24px;opacity:.55;font-weight:500}
.small{font-size:34px;font-weight:500;opacity:.7;line-height:1.25}
.mono{font-family:"JetBrains Mono",ui-monospace,monospace}
.full{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.browser{background:#141418;border-radius:22px;overflow:hidden;box-shadow:0 60px 120px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.08)}
.browser .bar{height:56px;background:#1c1c22;display:flex;align-items:center;gap:10px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.06)}
.browser .dot{width:14px;height:14px;border-radius:50%;background:#3a3a44}
.browser .addr{margin-left:14px;flex:1;height:32px;border-radius:9px;background:#0f0f13;color:#9a9aa6;font-size:15px;display:flex;align-items:center;padding:0 14px}
.browser img{display:block;width:100%}
.frame{background:#fff;box-shadow:0 20px 50px rgba(0,0,0,.5);overflow:hidden;position:relative}
.frame img{width:100%;height:100%;object-fit:cover;display:block}
.label{position:absolute;left:10px;top:10px;z-index:1;font-size:15px;font-weight:600;color:#fff;letter-spacing:.04em;background:rgba(0,0,0,.6);padding:4px 9px;border-radius:6px}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px}
`
const mark = (dark = true) => `<div class="mark">Void<span>canvas</span></div>`
const url = (u = 'voidcanvas.netlify.app') => `<div class="url">${u}</div>`
const page = (body, cls = '', extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}${extra}</style></head><body class="${cls}">${body}</body></html>`
const img = n => `file://${S}/${n}`
const ph = n => `file://${P}/${n}.jpg`

const STATICS = [
  // 01 We left the door unlocked. Browser window, app open, nothing else.
  ['01-door-unlocked', page(`
    <div class="pad"><div class="h h2">We left<br>the door<br>unlocked.</div></div>
    <div class="browser" style="position:absolute;left:80px;right:-260px;top:560px;transform:rotate(-3deg)">
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="addr">voidcanvas.netlify.app/editor</div></div>
      <img src="${img('editor-street.png')}">
    </div>
    ${mark()}`)],
  // 02 Don't sign up. Just make something.
  ['02-dont-sign-up', page(`
    <div class="pad"><div class="h h2" style="margin-top:220px">Don't<br>sign up.<br><span style="opacity:.35">Just make<br>something.</span></div></div>
    ${mark()}${url('voidcanvas.netlify.app/make')}`, 'paper')],
  // 03 You have 60 seconds. Giant clock.
  ['03-sixty-seconds', page(`
    <div class="center"><div class="mono" style="font-size:330px;font-weight:500;letter-spacing:-0.06em;line-height:1;color:#ff3b3b">00:60</div>
    <div class="h h4" style="margin-top:40px">You have<br>60 seconds.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/60')}`)],
  // 04 This image deserves better.
  ['04-deserves-better', page(`
    <img class="full" src="${ph('product')}">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.75) 100%)"></div>
    <div class="pad" style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:180px"><div class="h h2">This image<br>deserves<br>better.</div><div class="small" style="margin-top:36px;opacity:.9">Fix it.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/rescue')}`)],
  // 05 No login. No download. No excuse.
  ['05-no-excuse', page(`
    <div class="pad"><div class="h h1" style="margin-top:160px">No login.<br>No download.<br><span style="color:#8b7cff">No excuse.</span></div></div>
    ${mark()}${url()}`)],
  // 06 What happens if you push it? Just the strange finished result.
  ['06-push-it', page(`
    <img class="full" src="${img('fx-street-halftone.png')}" style="filter:contrast(1.4)">
    <img class="full" src="${img('fx-street-glitch.png')}" style="mix-blend-mode:screen;filter:hue-rotate(160deg) saturate(3) contrast(1.6);opacity:.9;transform:scale(1.04)">
    <img class="full" src="${img('fx-street-pixelate.png')}" style="mix-blend-mode:difference;opacity:.5;transform:translateX(24px)">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(0,0,0,.85))"></div>
    <div class="pad" style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:180px"><div class="h h3">What happens<br>if you push it?</div><div class="small" style="margin-top:28px">Remix this.</div></div>
    ${mark()}${url()}`)],
  // 07 Your PSD is not trapped.
  ['07-psd', page(`
    <div class="pad"><div class="h h2">Your PSD<br>is not<br>trapped.</div></div>
    <div class="browser" style="position:absolute;left:80px;right:80px;top:600px;height:574px">
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="addr">voidcanvas.netlify.app/psd</div></div>
      <img src="${img('editor-portrait.png')}" style="opacity:.55">
      <div style="position:absolute;inset:56px 0 0;display:flex;align-items:center;justify-content:center"><div style="border:3px dashed rgba(255,255,255,.4);border-radius:24px;width:78%;height:76%;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:600;color:rgba(255,255,255,.75)">Drop it here</div></div>
    </div>
    <div style="position:absolute;left:560px;top:430px;width:250px;height:300px;background:#2b2f6e;border-radius:18px;transform:rotate(8deg);box-shadow:0 40px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;justify-content:space-between;padding:26px">
      <div style="font-size:22px;font-weight:700;color:#9ab0ff">Ps</div>
      <div><div style="font-size:24px;font-weight:600;line-height:1.1">launch_poster_v7.psd</div><div style="font-size:16px;opacity:.6;margin-top:8px">48 layers · 212 MB</div></div>
    </div>
    <svg style="position:absolute;left:770px;top:690px" width="60" height="70" viewBox="0 0 24 28"><path d="M3 2l17 12-7 1 4 9-3 1-4-9-5 5z" fill="#fff" stroke="#000" stroke-width="1.5"/></svg>
    ${mark()}${url()}`)],
  // 08 One tab. Go.
  ['08-one-tab', page(`
    <div style="position:absolute;left:0;right:0;top:300px;height:130px;background:#202027"></div>
    <div style="position:absolute;left:80px;top:328px;height:102px;width:640px;background:#0b0b0e;border-radius:22px 22px 0 0;display:flex;align-items:center;gap:22px;padding:0 34px">
      <span style="width:44px;height:44px;border-radius:10px;background:#fff;color:#0b0b0e;font-weight:700;font-size:28px;display:flex;align-items:center;justify-content:center">V</span>
      <span style="font-size:32px;font-weight:500">Voidcanvas</span><span style="margin-left:auto;font-size:34px;opacity:.5">×</span>
    </div>
    <div style="position:absolute;left:760px;top:352px;font-size:56px;opacity:.5">+</div>
    <div class="pad"><div class="h h1" style="margin-top:460px">One tab.<br>Go.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/editor')}`)],
  // 09 Make a bad photo look expensive. Before/after.
  ['09-look-expensive', page(`
    <div style="position:absolute;left:0;top:0;width:540px;height:1350px;overflow:hidden"><img class="full" src="${ph('product')}"></div>
    <div style="position:absolute;left:540px;top:0;width:540px;height:1350px;overflow:hidden;background:#0b0b0e"><img class="full" src="${ph('product')}" style="filter:grayscale(.85) contrast(1.35) brightness(.72) sepia(.15);transform:scale(1.25) rotate(2deg)"><div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(0,0,0,0) 30%,rgba(0,0,0,.85) 100%)"></div><div style="position:absolute;left:0;right:0;bottom:250px;text-align:center;font-size:30px;letter-spacing:.34em;font-weight:500;opacity:.9">OLIO · 1954</div></div>
    <div style="position:absolute;left:539px;top:0;width:2px;height:1350px;background:#fff"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,0) 45%)"></div>
    <div class="pad"><div class="h h3">Make a<br>bad photo<br>look expensive.</div></div>
    <div style="position:absolute;left:80px;bottom:150px;font-size:22px;letter-spacing:.2em;opacity:.7">BEFORE</div><div style="position:absolute;right:80px;bottom:150px;font-size:22px;letter-spacing:.2em;opacity:.7">AFTER</div>
    ${mark()}${url('voidcanvas.netlify.app/rescue')}`)],
  // 10 Make it halftone. Then keep going.
  ['10-halftone', page(`
    <div class="pad"><div class="h h4">Make it halftone.<br><span style="opacity:.45">Then keep going.</span></div></div>
    <div class="frame" style="position:absolute;left:80px;top:400px;width:420px;height:525px;background:#000"><img src="${img('fx-street-halftone.png')}"></div>
    <svg style="position:absolute;left:470px;top:560px" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M4 4v10a4 4 0 0 0 4 4h11"/><path d="M15 13l4 5-4 5"/></svg>
    <div class="browser" style="position:absolute;left:420px;top:700px;width:760px;height:484px"><div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><div class="addr">voidcanvas.netlify.app/editor</div></div><img src="${img('editor-street.png')}" style="filter:grayscale(1) contrast(1.2)"></div>
    ${mark()}${url('voidcanvas.netlify.app/tools/halftone')}`)],
  // 11 Break the image.
  ['11-break', page(`
    <img class="full" src="${img('fx-landscape-glitch.png')}" style="filter:saturate(2.4) contrast(1.5) hue-rotate(-30deg);transform:scale(1.1)">
    <img class="full" src="${img('fx-street-glitch.png')}" style="mix-blend-mode:lighten;opacity:.7;transform:scaleX(-1) scale(1.2);filter:hue-rotate(120deg) saturate(3)">
    <div style="position:absolute;left:0;right:0;top:640px;height:12px;background:#0ff;mix-blend-mode:difference"></div><div style="position:absolute;left:0;right:0;top:900px;height:40px;background:#f0f;mix-blend-mode:difference;transform:translateX(60px)"></div>
    <div class="pad"><div class="h h1">Break<br>the<br>image.</div><div class="small" style="margin-top:40px">Then fix it.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/tools/glitch')}`)],
  // 12 The client said "just one more version." Six artboards.
  ['12-one-more-version', page(`
    <div class="pad"><div class="h h4">The client said<br>"just one more<br>version."</div><div class="small" style="margin-top:28px">Of course.</div></div>
    <div style="position:absolute;left:80px;right:80px;top:560px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:290px 290px;gap:40px 28px;padding-top:30px">
      ${['Post','Story','LinkedIn','A4','Poster','Web'].map((n,i)=>`<div class="frame" style="${i===1?'aspect-ratio:9/16;height:290px;justify-self:center;width:163px':i===2||i===5?'height:170px;align-self:end':'height:290px'}"><div class="label">${n}</div><img src="${ph('street')}" style="filter:${['none','hue-rotate(40deg)','grayscale(1)','sepia(.6)','contrast(1.5) saturate(1.8)','hue-rotate(-60deg)'][i]}"></div>`).join('')}
    </div>
    ${mark()}${url()}`)],
  // 13 Put the image inside the shape. Clip mask.
  ['13-clip-mask', page(`
    <div class="pad"><div class="h h3">Put the image<br>inside<br>the shape.</div></div>
    <div style="position:absolute;left:80px;top:560px;width:920px;height:620px;display:flex;align-items:center;justify-content:center">
      <div style="font-size:720px;font-weight:800;letter-spacing:-0.08em;line-height:1;background:url(${ph('portrait')}) center/cover;-webkit-background-clip:text;color:transparent">V</div>
    </div>
    <div style="position:absolute;right:80px;top:660px;width:220px;height:280px;border:2px solid rgba(255,255,255,.35);overflow:hidden"><img src="${ph('portrait')}" style="width:100%;height:100%;object-fit:cover;opacity:.6"></div>
    <div style="position:absolute;right:80px;top:960px;font-size:22px;opacity:.6">Clip Mask.</div>
    ${mark()}${url('voidcanvas.netlify.app/editor')}`)],
  // 14 Make it once. Send it everywhere.
  ['14-everywhere', page(`
    <div class="pad"><div class="h h3">Make it once.<br><span style="opacity:.45">Send it<br>everywhere.</span></div></div>
    <div class="frame" style="position:absolute;left:80px;top:600px;width:300px;height:375px"><img src="${img('fx-portrait-halftone.png')}"></div>
    <svg style="position:absolute;left:390px;top:600px" width="200" height="600" viewBox="0 0 200 600" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2">${[60,160,260,360,460,560].map(y=>`<path d="M0 187 C 100 187, 100 ${y}, 200 ${y}"/>`).join('')}</svg>
    ${[['IG','1/1',60],['Story','9/16',160],['LinkedIn','1.91/1',260],['A4','1/1.41',360],['Poster','1/1.41',460],['Web','16/9',560]].map(([n,ar,y])=>`<div style="position:absolute;left:600px;top:${560+y}px;display:flex;align-items:center;gap:20px"><div class="frame" style="height:64px;aspect-ratio:${ar};box-shadow:none"><img src="${img('fx-portrait-halftone.png')}"></div><span style="font-size:22px;opacity:.7">${n}</span></div>`).join('')}
    ${mark()}${url()}`)],
  // 15 This is not another resize tool.
  ['15-not-a-resize-tool', page(`
    <div class="pad"><div class="h h3">This is not<br>another<br>resize tool.</div></div>
    ${[['street','SECOND<br>SUN','#ffb020',0],['landscape','NO<br>SIGNAL','#fff',1],['portrait','TOKYO<br>2040','#8b7cff',2]].map(([p,t,c,i])=>`<div class="frame" style="position:absolute;left:${80+i*320}px;top:600px;width:290px;height:500px;background:#000"><img src="${ph(p)}" style="filter:${['contrast(1.3)','grayscale(1) contrast(1.6)','saturate(.4) contrast(1.4)'][i]}"><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.7))"></div><div class="h" style="position:absolute;left:22px;bottom:22px;font-size:54px;color:${c};letter-spacing:-.04em">${t}</div></div>`).join('')}
    <div style="position:absolute;left:80px;bottom:170px;font-size:24px;opacity:.6">Three compositions. One photo each. Made, not scaled.</div>
    ${mark()}${url('voidcanvas.netlify.app/editor')}`)],
  // 16 You know what you're doing. Editor in the background.
  ['16-out-of-the-way', page(`
    <img class="full" src="${img('editor-portrait.png')}" style="opacity:.22;object-position:left top">
    <div class="pad" style="display:flex;align-items:center"><div class="h h4">You know<br>what you're doing.<br><span style="opacity:.5">The software<br>shouldn't get<br>in the way.</span></div></div>
    ${mark()}${url('voidcanvas.netlify.app/editor')}`)],
  // 17 You were going to scroll anyway.
  ['17-scroll-anyway', page(`
    <div class="pad"><div class="h h2" style="margin-top:220px">You were<br>going to<br>scroll<br>anyway.</div><div class="small" style="margin-top:40px">Make something first.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/make')}`, 'paper')],
  // 18 Try something stupid.
  ['18-try-something-stupid', page(`
    <img class="full" src="${img('fx-portrait-popart.png')}" style="filter:saturate(1.6)">
    <img class="full" src="${img('fx-portrait-threshold.png')}" style="mix-blend-mode:multiply;opacity:.8;transform:scale(1.15) rotate(6deg)">
    <img class="full" src="${img('fx-street-dither.png')}" style="mix-blend-mode:exclusion;opacity:.45;transform:scale(1.4) rotate(-12deg)">
    <div class="pad"><div class="h h1" style="color:#fff;mix-blend-mode:difference">Try<br>some<br>thing<br>stupid.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/make')}`)],
  // 19 FINAL_FINAL_FINAL ACTUALLY-FINAL.psd
  ['19-final-final', page(`
    <div class="pad" style="display:flex;flex-direction:column;justify-content:center">
      <div class="mono" style="font-size:88px;font-weight:500;letter-spacing:-.04em;line-height:1.05;word-break:break-all">FINAL_<br>FINAL_<br>FINAL_<br>ACTUALLY-<br>FINAL.psd</div>
      <div class="small" style="margin-top:48px">We know.</div>
    </div>
    ${mark()}${url('voidcanvas.netlify.app/psd')}`, 'paper')],
  // 20 Sometimes you don't need new software.
  ['20-open-a-tab', page(`
    <div class="center" style="align-items:flex-start;text-align:left"><div class="h h4">Sometimes<br>you don't need<br>new software.</div><div class="h h4" style="margin-top:80px;color:#8b7cff">You just need<br>to open a tab.</div></div>
    ${mark()}${url()}`)],
  // 21 Made by someone who has been asked...
  ['21-made-by', page(`
    <div class="center" style="align-items:flex-start;text-align:left"><div class="h h4">Made by<br>someone<br>who has<br>been asked<br><span style="opacity:.45">"Can you just<br>make one more?"</span></div></div>
    ${mark()}${url()}`, 'paper')],
  // 22 Not everything needs an AI button.
  ['22-ai-button', page(`
    <div class="center" style="align-items:flex-start;text-align:left"><div class="h h2">Not<br>everything<br>needs an<br>AI button.</div><div class="small" style="margin-top:48px">Sometimes a good tool is enough.</div></div>
    ${mark()}${url()}`)],
  // 23 Make something you don't need to post.
  ['23-dont-need-to-post', page(`
    <img class="full" src="${ph('landscape')}" style="opacity:.55;object-position:center 20%;transform:scale(1.15)">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,14,.2),rgba(11,11,14,.9))"></div>
    <div class="pad" style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:180px"><div class="h h3">Make something<br>you don't need<br>to post.</div></div>
    ${mark()}${url('voidcanvas.netlify.app/make')}`)],
  // 24 The best creative tool is the one you forget you're using.
  ['24-forget-youre-using', page(`
    <div class="center" style="align-items:flex-start;text-align:left"><div class="h h4" style="opacity:.92">The best<br>creative tool<br>is the one<br>you forget<br>you're using.</div></div>
    <div class="mark" style="opacity:.25">Void<span>canvas</span></div>`, 'paper')],
  // Bonus: mobile.
  ['25-holding-a-creative-tool', page(`
    <div class="pad"><div class="h h3">You're holding<br>a creative tool.</div><div class="small" style="margin-top:24px">Open Voidcanvas.</div></div>
    <div style="position:absolute;left:330px;top:540px;width:420px;height:910px;border-radius:64px;background:#000;padding:14px;box-shadow:0 60px 120px rgba(0,0,0,.7)"><div style="width:100%;height:100%;border-radius:52px;overflow:hidden;background:#111"><img src="${img('phone-editor.png')}" style="width:100%;display:block"></div></div>
    ${mark()}${url()}`)],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
const pg = await ctx.newPage()
for (const [name, html] of STATICS) {
  fs.writeFileSync(`${OUT}/${name}.html`, html)
  await pg.goto(`file://${OUT}/${name}.html`)
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(250)
  await pg.screenshot({ path: `${OUT}/${name}.png` })
  fs.unlinkSync(`${OUT}/${name}.html`)
  console.log(name)
}
await browser.close()

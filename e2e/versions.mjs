// Versions and comments you can trust: a review version keeps every format board and the exact design it was
// made from; approving keeps that design for good; delivery builds from the approved design and warns when
// the design changed after approval; client pins land on layers and show in the Editor's Comments panel;
// Editor versions can be named and compared.
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'http://localhost:3123'
const out = []; const ok = (n, c, i = '') => { out.push(`${c ? 'PASS' : 'FAIL'} ${n} ${i}`); if (!c) process.exitCode = 1 }
const b = await chromium.launch()
const errors = []
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept())
const E = (f, a) => p.evaluate(f, a)
const idbGet = (store, id) => E(([store, id]) => new Promise(res => { const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction(store).objectStore(store).get(id); g.onsuccess = () => { res(g.result ?? null); db.close() }; g.onerror = () => { res(null); db.close() } } }), [store, id])
const idbAll = store => E(store => new Promise(res => { const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const g = db.transaction(store).objectStore(store).getAll(); g.onsuccess = () => { res(g.result ?? []); db.close() } } }), store)
const jobOf = async id => { const j = await idbGet('jobs', id); if (!j) return null; return { ...j, versions: j.versions.map(v => ({ ...v, images: v.images.map(im => ({ name: im.name, w: im.w, h: im.h, frameId: im.frameId ?? null })) })) } }
const tab = async name => { await p.click(`nav[aria-label="Job steps"] button:has-text("${name}")`); await p.waitForTimeout(800) }

try {
// ── A design with a master, two formats (one from Studio, one from Cascade) and a loose working board
await p.goto(`${BASE}/editor`); await p.waitForSelector('button:has-text("Open a photo")')
const ids = await E(() => {
  const E = window.__voidEditor, s = () => E.getState()
  s().newDoc({ name: 'Lagos Nights', width: 1080, height: 1350, background: '#ffffff' })
  s().addFrame({ name: 'Post', width: 1080, height: 1350 }); s().addFrame({ name: 'Story', width: 1080, height: 1920 }); s().addFrame({ name: 'Square', width: 1080, height: 1080 }); s().addFrame({ name: 'Scratch', width: 600, height: 600 })
  const f = () => s().doc.frames
  const [post, story, square] = ['Post', 'Story', 'Square'].map(n => f().find(x => x.name === n))
  s().setDoc({ jobId: 'job-v', frames: f().map(x => x.name === 'Story' ? { ...x, linkedFrom: post.id, deliverableId: 'dStory' } : x.name === 'Square' ? { ...x, linkedFrom: post.id } : x) })
  s().setActiveFrame(post.id)
  s().addShape('rect', post.x, post.y, 1080, 1350, { fill: '#10131a', name: 'Background' })
  const head = s().addShape('rect', post.x + 140, post.y + 300, 800, 240, { fill: '#ff5a1f', name: 'Headline' })
  const logo = s().addShape('ellipse', post.x + 880, post.y + 1150, 120, 120, { fill: '#ffffff', name: 'Logo' })
  s().setActiveFrame(story.id); s().addShape('rect', story.x + 140, story.y + 600, 800, 240, { fill: '#ff5a1f', name: 'Story headline' })
  s().setActiveFrame(square.id); s().addShape('rect', square.x + 140, square.y + 300, 800, 240, { fill: '#ff5a1f', name: 'Square headline' })
  s().commit('Build')
  return { doc: s().doc.id, post: post.id, head, logo }
})
await E(() => window.__vcSave.flush()); await p.waitForTimeout(400)
// The Studio job this design belongs to.
await E(([docId]) => new Promise(res => { const r = indexedDB.open('voidcanvas'); r.onsuccess = () => { const db = r.result; const t = db.transaction('jobs', 'readwrite'); t.objectStore('jobs').put({ id: 'job-v', client: 'Ada Stores', name: 'Lagos Nights', status: 'design', createdAt: Date.now(), updatedAt: Date.now(), brief: 'Poster', deliverables: [{ id: 'dPost', label: 'Instagram post', presetId: 'ig-post', width: 1080, height: 1350, group: 'Social', done: false }, { id: 'dStory', label: 'Story', presetId: 'story', width: 1080, height: 1920, group: 'Social', done: false }], refs: [], board: [], directions: [], versions: [], designId: docId, masterDeliverableId: 'dPost' }); t.oncomplete = () => { db.close(); res(true) } } }), [ids.doc])

// ── Review version from the design
await p.goto(`${BASE}/studio?job=job-v`); await p.waitForSelector('nav[aria-label="Job steps"]', { timeout: 20000 })
await tab('Review')
await p.click('button:has-text("New version from the design")')
await p.waitForSelector('select[aria-label="Version status"]', { timeout: 30000 }); await p.waitForTimeout(900)
let job = await jobOf('job-v')
let v1 = job.versions[0]
ok('review: one version made', job.versions.length === 1)
ok('review: master and both formats, working board left out', v1.images.map(i => i.name).join() === 'Instagram post,Story,Square', v1.images.map(i => i.name).join())
ok('review: each image knows its board', v1.images.every(i => !!i.frameId))
ok('review: first version is a Direction', v1.stage === 'direction')
ok('review: keeps the design it was made from', !!v1.designVersionId && !!v1.designFp)
const ev = await idbGet('versionIndex', v1.designVersionId)
ok('review: the Editor version is named', ev?.name === 'Review v1', ev?.name)
ok('review: layer boxes recorded, no background', !!v1.boxes?.['0']?.some(x => x.name === 'Headline') && !v1.boxes['0'].some(x => x.name === 'Background'), JSON.stringify(v1.boxes?.['0']?.map(x => x.name)))
// Sending the same design again reuses the stored copy
await p.click('button:has-text("New version from the design")'); await p.waitForTimeout(2500)
job = await jobOf('job-v')
ok('review: an unchanged design is not stored twice', job.versions.length === 2 && job.versions[1].designVersionId === v1.designVersionId && job.versions[1].stage === 'revision')
await p.click('button[aria-label="Delete this version"]'); await p.waitForTimeout(900)
job = await jobOf('job-v')
ok('review: a version can be deleted', job.versions.length === 1)

// Name it and approve it
await p.click(`aside button:has-text("v1")`); await p.waitForTimeout(300)
await p.fill('input[aria-label="Version name"]', 'Direction A'); await p.locator('input[aria-label="Version name"]').blur(); await p.waitForTimeout(300)
await p.selectOption('select[aria-label="Version status"]', 'approved'); await p.waitForTimeout(1500)
job = await jobOf('job-v'); v1 = job.versions.find(v => v.n === 1)
ok('name: shows in the list', await p.isVisible('aside >> text=Direction A · v1'))
ok('approve: status saved', v1.status === 'approved' && v1.name === 'Direction A')
const ev2 = await idbGet('versionIndex', v1.designVersionId)
ok('approve: the design is kept for good', ev2?.keep === true && /Direction A/.test(ev2?.name ?? ''), JSON.stringify({ keep: ev2?.keep, name: ev2?.name }))

// A designer pin on the headline lands on that layer
const hb = v1.boxes['0'].find(x => x.name === 'Headline')
const im = p.locator('img[alt="Instagram post"]').first()
const r = await im.boundingBox()
await p.mouse.click(r.x + ((hb.x + hb.w / 2) / v1.images[0].w) * r.width, r.y + ((hb.y + hb.h / 2) / v1.images[0].h) * r.height); await p.waitForTimeout(200)
await p.keyboard.type('Make this bigger'); await p.waitForTimeout(900)
job = await jobOf('job-v'); v1 = job.versions.find(v => v.n === 1)
const pin = v1.pins['0']?.[0]
ok('pin: tied to the headline layer', pin?.layerId === ids.head && pin?.layerName === 'Headline', JSON.stringify(pin))
ok('pin: the list says which layer', await p.isVisible('text=On: Headline'))

// ── Delivery from the approved version
await tab('Deliver')
await p.waitForSelector('[data-deliver-source]', { timeout: 20000 }); await p.waitForTimeout(800)
ok('deliver: offers the approved version', await p.isVisible('text=Direction A · v1, as the client approved it'))
ok('deliver: says the design is the same as approved', await p.isVisible('text=the same as v1'))

// Change the design after approval
await p.goto(`${BASE}/editor?project=${ids.doc}`); await p.waitForFunction(id => window.__voidEditor?.getState().doc?.id === id, ids.doc, { timeout: 20000 })
await E(id => { const s = window.__voidEditor.getState(); s.updateLayer(id, { fill: '#00aa55' }, 'Fill') }, ids.head)
await E(() => window.__vcSave.flush()); await p.waitForTimeout(400)
await p.goto(`${BASE}/studio?job=job-v`); await p.waitForSelector('nav[aria-label="Job steps"]', { timeout: 20000 })
await tab('Deliver'); await p.waitForSelector('[data-deliver-source]', { timeout: 20000 }); await p.waitForTimeout(1200)
ok('deliver: knows the design changed since approval', await p.isVisible('text=changed since v1 was approved'))
await p.check('input[name="deliver-source"] >> nth=1'); await p.waitForTimeout(300)
ok('deliver: warns when delivering the changed design', await p.isVisible('text=The design changed after v1 was approved. Deliver v1, or send v2 for approval.'))
await p.click('button:has-text("Deliver v1")'); await p.waitForTimeout(300)
ok('deliver: the warning switches back to v1', await p.isChecked('input[name="deliver-source"] >> nth=0'))
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('button:has-text("Build the package")')])
const zip = await (await import('node:fs')).promises.readFile(await dl.path())
// The zip is stored, not compressed: walk its local headers.
const files = {}; for (let o = 0; o + 30 < zip.length && zip.readUInt32LE(o) === 0x04034b50;) { const n = zip.readUInt16LE(o + 26), x = zip.readUInt16LE(o + 28), size = zip.readUInt32LE(o + 18); const name = zip.subarray(o + 30, o + 30 + n).toString(); files[name] = zip.subarray(o + 30 + n + x, o + 30 + n + x + size); o += 30 + n + x + size }
const post = Object.keys(files).find(n => /instagram-post_v1\.png$/.test(n))
ok('deliver: files are named for v1', !!post, Object.keys(files).join(', '))
// The delivered post has the approved orange headline, not the later green one.
const colour = await E(async ([b64, h]) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const bm = await createImageBitmap(new Blob([bin], { type: 'image/png' })); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const g = c.getContext('2d'); g.drawImage(bm, 0, 0); return Array.from(g.getImageData(h.x, h.y, 1, 1).data) }, [post ? files[post].toString('base64') : '', { x: 540, y: 420 }])
ok('deliver: the package matches the approved version', colour[0] > 200 && colour[1] < 140 && colour[2] < 80, JSON.stringify(colour))

// ── Comments in the Editor
await p.goto(`${BASE}/editor?project=${ids.doc}&comments=1&layer=${ids.head}`)
await p.waitForSelector('[data-comments-panel]', { timeout: 20000 }); await p.waitForTimeout(800)
ok('comments: the panel lists the pin', await p.isVisible('[data-comments-panel] >> text=Make this bigger'))
ok('comments: says which layer', await p.isVisible('[data-comments-panel] >> text=On: Headline'))
ok('comments: notices the layer changed', await p.isVisible('[data-comments-panel] >> text=Changed since the comment'))
ok('comments: opening from the link selects the layer', (await E(() => window.__voidEditor.getState().activeId)) === ids.head)
await E(() => window.__voidEditor.getState().setActive(null))
await p.click('[data-comments-panel] button:has-text("Select layer")'); await p.waitForTimeout(200)
ok('comments: Select layer selects it', (await E(() => window.__voidEditor.getState().activeId)) === ids.head)
// The pin follows the layer when it moves
const before = await E(() => { const { pins } = window.__vcComments?.getState?.() ?? { pins: [] }; return pins.length })
ok('comments: pins are drawn on the canvas', before === 1)
await p.click('[data-comments-panel] button:has-text("Done")'); await p.waitForTimeout(600)
job = await jobOf('job-v')
ok('comments: Done is saved to the job', job.versions.find(v => v.n === 1).pins['0'][0].done === true)

// ── Editor versions: name, compare
await E(() => window.dispatchEvent(new CustomEvent('vc:open', { detail: 'versions' }))); await p.waitForSelector('[data-versions]')
ok('versions: the approved one is kept for good', await p.isVisible('[data-versions] >> text=Kept for good'))
await p.fill('input[aria-label="Name for the new version"]', 'Green headline'); await p.click('button:has-text("Save a version now")'); await p.waitForTimeout(1200)
ok('versions: a named version shows its name', await p.isVisible('[data-versions] >> text=Green headline'))
await p.locator('[data-version] button:has-text("Compare")').nth(1).click()
await p.waitForSelector('[data-compare-slider] img', { timeout: 20000 })
ok('versions: compare shows both under a slider', (await p.locator('[data-compare-slider] img').count()) === 2)
await p.click('button:has-text("Side by side")'); await p.waitForTimeout(800)
ok('versions: and side by side', (await p.locator('[data-compare] img').count()) === 2)

} catch (e) { ok('the run finished', false, e.message.split('\n')[0]); await p.screenshot({ path: 'e2e/.out/versions-fail.png' }).catch(() => {}) }

ok('no page errors', errors.length === 0, errors.join(' | '))
console.log(out.join('\n'))
await b.close()

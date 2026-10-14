import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
const BASE=process.env.BASE||'http://localhost:3000'
const OUT=path.resolve('e2e/evidence/print-fidelity');fs.mkdirSync(OUT,{recursive:true})
const profile=process.env.ICC_PROFILE||['/usr/share/color/icc/ghostscript/default_cmyk.icc','/usr/share/ghostscript/iccprofiles/default_cmyk.icc'].find(p=>fs.existsSync(p))
if(!profile)throw Error('Set ICC_PROFILE to a real CMYK ICC fixture before running print acceptance.')
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const check=(v,label)=>{if(!v)throw Error(label);console.log('PASS '+label)}
try{
  await page.goto(BASE+'/editor');await page.waitForFunction(()=>!!window.__voidEditor)
  await page.evaluate(()=>{
    const s=window.__voidEditor.getState(),b={visible:true,locked:false,opacity:1,blend:'source-over',mask:null,maskEnabled:false,scaleX:1,scaleY:1,rotation:0,rev:1,stroke:null,strokeWidth:0,radius:0,type:'shape',shape:'rect',frameId:'card'}
    s.loadFramed({id:'print',name:'Artwork bleed proof',width:1600,height:1000,dpi:72,background:null,frames:[{id:'card',name:'Business card',x:100,y:100,width:1050,height:600,background:'#fff',print:{widthMm:88.9,heightMm:50.8,dpi:300}}]},[
      {...b,id:'blue',name:'Trim artwork',fill:'#2244ee',x:100,y:100,w:1050,h:600},
      {...b,id:'bleed-red',name:'Actual bleed artwork',fill:'#ee4422',x:64,y:100,w:36,h:600},
    ],[],[])
    s.setActiveFrame('card')
  })
  const saved=await page.evaluate(()=>window.__vcAssets.saveVoid())
  await page.evaluate(()=>window.__voidEditor.getState().closeDoc())
  await page.evaluate(b64=>window.__vcAssets.openVoid(b64),saved.b64)
  const print=await page.evaluate(()=>window.__voidEditor.getState().doc.frames[0].print)
  check(print.widthMm===88.9&&print.dpi===300,'physical print metadata survives .void reopening')
  const plain=await page.evaluate(()=>window.__vcAssets.exportBoard('pdf'))
  fs.writeFileSync(path.join(OUT,'card-trim.pdf'),Buffer.from(plain.b64,'base64'))
  const text=Buffer.from(plain.b64,'base64').toString('latin1')
  const media=text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)
  check(media&&Math.abs(+media[1]-252)<0.002&&Math.abs(+media[2]-144)<0.002,'regular PDF uses 88.9 × 50.8 mm trim rather than screen DPI')
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('vc:open',{detail:'proof'})))
  await page.getByLabel('Printer ICC profile').setInputFiles(profile)
  await page.getByText(/Loaded output profile:/).waitFor({timeout:30000})
  await page.getByLabel('Print board').selectOption('card')
  await page.getByLabel('PDFX bleed').fill('3')
  await page.screenshot({path:path.join(OUT,'production-settings.png')})
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.getByRole('button',{name:'Export PDF/X-4',exact:true}).click()])
  const output=path.join(OUT,'card-real-bleed-PDFX4.pdf');await download.saveAs(output)
  const bytes=fs.readFileSync(output),pdf=bytes.toString('latin1')
  const trim=pdf.match(/\/TrimBox \[([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)\]/)
  check(trim&&Math.abs((+trim[3]- +trim[1])-252)<0.002&&Math.abs((+trim[4]- +trim[2])-144)<0.002,'PDF/X trim remains the exact physical card size')
  check(pdf.includes('/DestOutputProfile')&&pdf.includes('/ColorSpace [/ICCBased')&&!pdf.includes('/DeviceRGB'),'actual PDF/X handoff embeds the supplied CMYK ICC output intent')
  const im=pdf.match(/\/Subtype \/Image \/Width (\d+) \/Height (\d+) [^\n]+\nstream\n/)
  check(im&&+im[1]===1122&&+im[2]===672,'3 mm bleed adds 36 real artwork pixels on every side')
  const matrix=pdf.match(/q ([\d.]+) 0 0 ([\d.]+) (-?[\d.]+) (-?[\d.]+) cm \/Im0 Do Q/)
  check(matrix&&Math.abs(+matrix[3]+36*(+matrix[1]/1122)- +trim[1])<0.002,'trim artwork registers to TrimBox without scaling drift from rounded bleed pixels')
  const at=im.index+im[0].length
  const pixel=(x,y)=>Array.from(bytes.subarray(at+(y*1122+x)*4,at+(y*1122+x)*4+4))
  const left=pixel(5,335),inside=pixel(45,335)
  check(left.reduce((s,v,i)=>s+Math.abs(v-inside[i]),0)>60,'bleed contains the red artwork outside trim, not repeated blue edge pixels')
  const [tiff]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.getByRole('button',{name:'Export CMYK TIFF',exact:true}).click()])
  await tiff.saveAs(path.join(OUT,'card-CMYK.tif'))
  check(errors.length===0,'no browser errors during ICC conversion and production export')
  console.log('Print evidence:',output)
}finally{await browser.close()}

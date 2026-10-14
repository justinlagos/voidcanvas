import { chromium } from 'playwright'
const BASE=process.env.BASE||'http://localhost:3000'
const browser=await chromium.launch()
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const check=(value,label)=>{if(!value)throw Error(label);console.log('PASS '+label)}
const command=async label=>{
  await page.keyboard.press('Control+k')
  const dialog=page.getByRole('dialog',{name:'Search actions'})
  await dialog.locator('input').fill(label)
  await dialog.getByRole('option').filter({hasText:label}).first().click()
}
const seed=async(opts={})=>page.evaluate(opts=>{
  const s=window.__voidEditor.getState()
  const n=(x,y)=>({x,y,inX:x,inY:y,outX:x,outY:y})
  const rect=(x,y,w,h)=>({closed:true,nodes:[n(x,y),n(x+w,y),n(x+w,y+h),n(x,y+h)]})
  const base={visible:true,locked:false,opacity:1,blend:'source-over',mask:null,maskEnabled:false,scaleX:1,scaleY:1,rotation:0,rev:1,stroke:null,strokeWidth:0,radius:0,frameId:'board',type:'shape',shape:'path'}
  const layers=[{...base,id:'outer',name:'Outer',x:60,y:60,w:200,h:200,fill:'#2244ee',subpaths:[rect(0,0,200,200)]},
    {...base,id:'inner',name:'Inner',x:opts.overlap?160:110,y:110,w:100,h:100,fill:'#ee4422',subpaths:[rect(0,0,100,100)],locked:!!opts.locked,frameId:opts.crossBoard?'other':'board'}]
  s.loadFramed({id:'u2b',name:'Compound proof',width:800,height:600,background:'#fff',frames:[{id:'board',name:'Board',x:0,y:0,width:800,height:600,background:'#fff'},{id:'other',name:'Other',x:900,y:0,width:800,height:600,background:'#fff'}]},layers,[],[])
  s.setActive('outer');s.toggleSelect('inner')
},opts)
const state=()=>page.evaluate(()=>{const s=window.__voidEditor.getState();return {layers:s.layers,history:s.history.length,last:s.history.at(-1)?.label,selected:s.selectedIds,toast:s.toast?.msg}})
try{
  await page.goto(BASE+'/editor');await page.waitForFunction(()=>!!window.__voidEditor)
  await seed();await command('Make compound path')
  await page.waitForFunction(()=>window.__voidEditor.getState().layers.length===1)
  let s=await state();check(s.layers[0].subpaths.length===2&&s.layers[0].id==='inner','compound contours retain the top shape identity')
  check(s.history===2,'compound operation is exactly one Undo step')
  await page.evaluate(()=>window.__voidEditor.getState().undo());s=await state()
  check(s.layers.length===2&&s.selected.length===2,'one Undo restores both source shapes and selection')
  await page.evaluate(()=>window.__voidEditor.getState().redo())
  await page.evaluate(()=>{const st=window.__voidEditor.getState();st.setTool('pathselect');st.setView({zoom:1,panX:30,panY:30})})
  const point=await page.evaluate(()=>{
    const st=window.__voidEditor.getState(),l=st.layers[0],n=l.subpaths[1].nodes[0]
    const box=document.querySelector('[data-stage]').getBoundingClientRect()
    return {x:box.left+st.view.panX+l.x+n.x,y:box.top+st.view.panY+l.y+n.y}
  })
  await page.mouse.click(point.x,point.y)
  await page.getByRole('button',{name:'Path…',exact:true}).click()
  await page.getByRole('menuitem',{name:'Selected parts: Subtract',exact:true}).click()
  s=await state();check(s.layers[0].subpaths[1].op==='sub'&&!s.layers[0].subpaths[0].op,'Direct Select changes the picked contour operation without changing the outer contour')
  const opSvg=await page.evaluate(()=>window.__vcAssets.exportBoard('svg'))
  const opText=Buffer.from(opSvg.b64,'base64').toString()
  check(opText.includes('<path')&&!opText.includes('<image'),'render-time subtraction exports as real editable SVG geometry')
  s=await state();check(s.layers[0].subpaths[1].op==='sub','SVG export does not bake or mutate the source compound')
  await page.evaluate(()=>window.__voidEditor.getState().undo())
  await page.evaluate(()=>window.__voidEditor.getState().setTool('move'))
  const svg=await page.evaluate(()=>window.__vcAssets.exportBoard('svg'))
  const svgText=Buffer.from(svg.b64,'base64').toString()
  check(svgText.includes('fill-rule="evenodd"')&&svgText.includes('<path'),'compound exports as an editable SVG path with holes')
  const saved=await page.evaluate(()=>window.__vcAssets.saveVoid())
  await page.evaluate(()=>window.__voidEditor.getState().closeDoc())
  await page.evaluate(b64=>window.__vcAssets.openVoid(b64),saved.b64)
  s=await state();check(s.layers[0].subpaths.length===2,'.void round-trip keeps both compound contours')
  await command('Release compound path');await page.waitForFunction(()=>window.__voidEditor.getState().layers.length===2)
  s=await state();check(s.history===2,'release is one history step after reopening')
  check(s.layers.every(l=>l.shape==='path'&&l.subpaths.length===1)&&s.selected.length===2,'release returns and selects both editable shape layers')
  await page.evaluate(()=>window.__voidEditor.getState().undo());s=await state();check(s.layers.length===1&&s.layers[0].subpaths.length===2,'release Undo restores the hole')
  for(const op of ['Unite','Minus front','Minus back','Intersect','Exclude','Divide']){
    await seed({overlap:true});await command('Pathfinder: '+op)
    await page.waitForFunction(op=>window.__voidEditor.getState().history.at(-1)?.label==='Pathfinder: '+op,op)
    s=await state();check(s.history===2,op+' produces one atomic history step')
    check(s.layers.every(l=>l.type==='shape'&&l.subpaths.every(sp=>sp.closed)),op+' remains native vector geometry')
    check(s.selected.length===s.layers.length,op+' selects every resulting piece')
    await page.evaluate(()=>window.__voidEditor.getState().undo());s=await state();check(s.layers.length===2&&s.layers[0].id==='outer',op+' Undo restores original identities')
  }
  await seed({locked:true});await command('Pathfinder: Unite');await page.waitForFunction(()=>/Unlock/.test(window.__voidEditor.getState().toast?.msg||''))
  s=await state();check(s.layers.length===2&&s.history===1,'locked shape is never consumed')
  await seed({crossBoard:true});await command('Pathfinder: Unite');await page.waitForFunction(()=>/same board/.test(window.__voidEditor.getState().toast?.msg||''))
  s=await state();check(s.layers.length===2&&s.history===1,'Boolean operation cannot consume another artboard')
  check(errors.length===0,'no uncaught browser errors')
}finally{await browser.close()}

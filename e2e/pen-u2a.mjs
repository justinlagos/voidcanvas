import { chromium } from 'playwright'

// Real U2-A Editor acceptance: contextual symmetric anchors, grid setting and
// direct-selection node manipulation on a saved path.
const BASE=process.env.BASE||'http://localhost:3000'
const browser=await chromium.launch()
const page=await browser.newPage({viewport:{width:1440,height:900}})
const failures=[]
page.on('pageerror',e=>failures.push(e.message))
const eq=(v,expected,label)=>{if(v!==expected)throw new Error(label+': got '+JSON.stringify(v)+' expected '+JSON.stringify(expected)); console.log('PASS '+label)}
try {
  await page.goto(BASE+'/editor')
  await page.waitForFunction(()=>!!window.__voidEditor,null,{timeout:45000})
  await page.evaluate(()=>{
    const s=window.__voidEditor.getState()
    const n=(x,y)=>({x,y,inX:x,inY:y,outX:x,outY:y})
    s.loadFramed({
      id:'u2a-browser',name:'U2-A Pen',width:800,height:600,background:'#fff',
      frames:[{id:'board',name:'Artboard',x:0,y:0,width:800,height:600,background:'#fff'}],
      paths:[{id:'u2path',name:'Bezier test',subpaths:[{closed:false,nodes:[n(100,100),n(180,160),n(280,100)]}]}],
    },[],[],[])
    s.setView({zoom:1,panX:30,panY:30})
    s.setTool('pathselect')
    window.__voidEditor.setState({activePathId:'u2path'})
  })
  await page.waitForFunction(()=>document.querySelector('[data-stage]')?.getBoundingClientRect().width>100)
  // Select all nodes through the genuine stage command, then click the visible
  // tool option so the test exercises the production store/history.
  const pt=async()=>page.evaluate(()=>{
    const st=window.__voidEditor.getState()
    const box=document.querySelector('[data-stage]').getBoundingClientRect()
    return {x:box.left+st.view.panX+180*st.view.zoom,
      y:box.top+st.view.panY+160*st.view.zoom}
  })
  const p=await pt()
  await page.mouse.click(p.x,p.y)
  await page.getByRole('button',{name:'Symmetric',exact:true}).click()
  const read=()=>page.evaluate(()=>{
    const s=window.__voidEditor.getState();const n=s.doc.paths.find(p=>p.id==='u2path').subpaths[0].nodes[1]
    return {node:n,history:s.history.at(-1)?.label,grid:s.options.penSnapGrid,
      spacing:s.options.penGridSize}
  })
  let state=await read()
  eq(state.node.symmetric,true,'contextual Symmetric action updates live node')
  eq(state.node.smooth,true,'symmetric anchor remains smooth')
  if(Math.abs(state.node.inX+state.node.outX-2*state.node.x)>0.0001)throw Error('handles not symmetric')
  await page.getByLabel('Snap grid').check()
  await page.locator('label').filter({hasText:'Grid spacing'}).locator('input[type=number]').fill('20')
  state=await read()
  eq(state.grid,true,'grid snap toggled in real Options Bar')
  eq(state.spacing,20,'grid pitch saved in Editor options')
  await page.mouse.move(p.x,p.y)
  await page.mouse.down()
  await page.mouse.move(p.x+19,p.y+21,{steps:5})
  await page.mouse.up()
  state=await read()
  eq(state.node.x,200,'Direct Selection anchor snaps to X grid')
  eq(state.node.y,180,'Direct Selection anchor snaps to Y grid')
  await page.evaluate(()=>window.__voidEditor.getState().undo())
  state=await read()
  eq(state.node.x,180,'Undo restores original X without losing anchor')
  await page.evaluate(()=>window.__voidEditor.getState().redo())
  state=await read()
  eq(state.node.x,200,'Redo restores snapped path')
  // Hit a real on-canvas handle and drag it. Symmetric mode must retain
  // equal-length opposite handles rather than only a metadata boolean.
  const handle=await page.evaluate(()=>{
    const st=window.__voidEditor.getState()
    const n=st.doc.paths.find(p=>p.id==='u2path').subpaths[0].nodes[1]
    const box=document.querySelector('[data-stage]').getBoundingClientRect()
    return {x:box.left+st.view.panX+n.outX*st.view.zoom,
      y:box.top+st.view.panY+n.outY*st.view.zoom}
  })
  await page.mouse.move(handle.x,handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x+14,handle.y-10,{steps:7})
  await page.mouse.up()
  const afterHandle=await read()
  eq(afterHandle.node.symmetric,true,'live symmetric flag survives drag')
  const n=afterHandle.node
  if(Math.abs(n.inX+n.outX-2*n.x)>0.01||Math.abs(n.inY+n.outY-2*n.y)>0.01)
    throw Error('handle dragging did not preserve mirror geometry: '+JSON.stringify(n))
  console.log('PASS real Bézier handle drag keeps mirror geometry')
  // Verify that .void persistence retains the new symmetric node extension
  // and the document-pixel coordinates after the browser's edit workflow.
  await page.waitForFunction(()=>!!window.__vcAssets?.saveVoid,null,{timeout:15000})
  const saved=await page.evaluate(async()=>window.__vcAssets.saveVoid())
  if(!saved?.b64||saved.len<1000)throw Error('editable .void save unavailable')
  await page.evaluate(()=>window.__voidEditor.getState().closeDoc())
  await page.evaluate(b64=>window.__vcAssets.openVoid(b64),saved.b64)
  const reopened=await read()
  eq(reopened.node.symmetric,true,'.void round-trip keeps symmetric vector anchor')
  if(Math.abs(reopened.node.outX-n.outX)>0.01)
    throw Error('.void round-trip changed vector handles')
  console.log('PASS .void reopens editable U2-A Bézier path')
  // Multi-object batch editing: two independent shape layers, one Undo step,
  // native path geometry retained on both layers (not a separate vector store).
  await page.evaluate(()=>{
    const st=window.__voidEditor.getState()
    const n=(x,y)=>({x,y,inX:x,inY:y,outX:x,outY:y})
    const make=(id,x)=>({
      id,name:id,type:'shape',shape:'path',frameId:'board',x,y:100,w:160,h:120,
      scaleX:1,scaleY:1,rotation:0,rev:1,fill:'#2244ee',stroke:null,strokeWidth:0,radius:0,
      visible:true,locked:false,opacity:1,blend:'source-over',mask:null,maskEnabled:false,
      subpaths:[{closed:false,nodes:[n(0,0),n(80,60),n(150,0)]}],
    })
    st.loadFramed({
      id:'u2a-multi',name:'Multiple paths',width:800,height:600,background:'#fff',
      frames:[{id:'board',name:'Artboard',x:0,y:0,width:800,height:600,background:'#fff'}],
    },[make('shape-a',60),make('shape-b',310)],[],[])
    st.setTool('pathselect')
    st.setActive('shape-a')
    st.toggleSelect('shape-b')
  })
  await page.getByRole('button',{name:'Symmetric selected shapes',exact:true}).click()
  const batch=()=>page.evaluate(()=>{
    const st=window.__voidEditor.getState()
    return { anchorFlags:st.layers.filter(l=>l.type==='shape').map(l=>l.subpaths[0].nodes.map(n=>!!n.symmetric)),
      lastAction:st.history.at(-1)?.label }
  })
  const both=await batch()
  if(both.anchorFlags.length!==2||both.anchorFlags.some(flags=>flags.some(flag=>!flag)))
    throw Error('Multi-layer anchors were not symmetrized in live Editor: '+JSON.stringify(both))
  eq(both.lastAction,'Symmetric anchors in selected shapes','multi-vector batch is one history step')
  await page.evaluate(()=>window.__voidEditor.getState().undo())
  const beforeMulti=await batch()
  if(beforeMulti.anchorFlags.some(flags=>flags.some(Boolean)))
    throw Error('Multi-vector Undo did not restore original anchors')
  await page.evaluate(()=>window.__voidEditor.getState().redo())
  const afterMulti=await batch()
  if(afterMulti.anchorFlags.some(flags=>flags.some(flag=>!flag)))
    throw Error('Multi-vector Redo failed')
  console.log('PASS two separate vector layers edited together with one Undo/Redo')
  if(failures.length)throw Error('browser errors: '+failures.join('; '))
  console.log('U2-A real UI browser acceptance complete')
}finally{await browser.close()}

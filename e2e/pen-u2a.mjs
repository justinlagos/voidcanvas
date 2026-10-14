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
  if(failures.length)throw Error('browser errors: '+failures.join('; '))
  console.log('U2-A real UI browser acceptance complete')
}finally{await browser.close()}

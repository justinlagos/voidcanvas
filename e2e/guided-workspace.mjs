import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const base=process.env.BASE||'http://localhost:3123';const b=await chromium.launch();const errors=[]
const c=await b.newContext({viewport:{width:1440,height:900}});await c.addInitScript(()=>{window.__vcDebugOn=true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
const inView=async locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1});
const overlap=async(a,b)=>{const ar=await a.boundingBox(),br=await b.boundingBox();if(!ar||!br)return false;return ar.x<br.x+br.width&&ar.x+ar.width>br.x&&ar.y<br.y+br.height&&ar.y+ar.height>br.y};
try{
 await p.goto(base+'/brand?view=guideline');await p.getByRole('navigation',{name:'Guideline tools'}).waitFor();
 const brandCanvas=p.locator('canvas[data-brand-renderer]').first();await brandCanvas.waitFor();assert.equal(await brandCanvas.getAttribute('data-brand-renderer'),'legacy','Designers stay on the legacy renderer until V2 passes its gates');
 assert.equal(await p.locator('#brand-controls').count(),0,'Preview starts uncluttered');
 for(const width of [320,390,768,1440]){
  await p.setViewportSize({width,height:width<800?740:900});
  await p.getByRole('button',{name:'Identity',exact:true}).click();
  assert(await inView(p.getByRole('button',{name:'Close brand controls'})));
  const nameField=p.locator('input[placeholder="e.g. Northbound"]');
  await nameField.fill('Acme Studio');
  if(width===390){
   const pageCards=p.locator('[data-page]:visible');
   for(let i=0;i<await pageCards.count();i++)assert.equal(await overlap(nameField,pageCards.nth(i)),false,'B28: phone page strip must not cover the brand-name field');
   assert(await inView(nameField),'B28: brand-name field remains fully visible at 390 x 740');
  }
  const detail=p.locator('details').filter({has:p.locator('summary', {hasText:'Logo versions & usage rules'})});
  assert.equal(await detail.getAttribute('open'),null);await detail.locator('summary').click();
  await p.getByRole('button',{name:'Close brand controls'}).click();
  await p.getByRole('button',{name:'Pages',exact:true}).click();assert(await p.locator('[data-page]').count()>=10);
  await p.locator('[data-page="1"] > button').click();
  await p.getByRole('button',{name:'Close brand controls'}).click();
  await p.getByRole('button',{name:'Export guideline',exact:true}).click();
  assert(await p.getByRole('button',{name:'Screen PDF',exact:true}).isVisible());
  assert(await p.getByRole('button',{name:'HTML handoff',exact:true}).isVisible());
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.getByRole('button',{name:'Close brand controls'}).click();
 }
 await p.getByRole('button',{name:'Save brand',exact:true}).click();await p.getByRole('status').filter({hasText:'Saved.'}).waitFor({timeout:30000});
 console.log('PASS Brand default renderer, disclosure, editable identity, B28 phone overlap, page navigation, exports, save, narrow and desktop layouts');
 await p.goto(base+'/editor');await p.waitForFunction(()=>!!window.__voidEditor);
 await p.evaluate(()=>{let s=window.__voidEditor.getState();s.newDoc({name:'Live drag',width:1200,height:900,background:'#ffffff'});s=window.__voidEditor.getState();s.addShape('rect',300,300,200,150,{fill:'#e53636',name:'Move me'});s.setTool('move')});await p.waitForTimeout(500);
 const stage=p.locator('[data-stage]');const box=await stage.boundingBox();const pos=await p.evaluate(()=>{const s=window.__voidEditor.getState();return {view:s.view,l:s.active()}});
 const x=box.x+pos.view.panX+(pos.l.x+100)*pos.view.zoom,y=box.y+pos.view.panY+(pos.l.y+75)*pos.view.zoom;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+80,y+35,{steps:12});
 const during=await p.evaluate(()=>{const s=window.__voidEditor.getState();const l=s.active();return {x:l.x,y:l.y,history:s.historyIndex,view:s.view}});
 assert(during.x>pos.l.x+30,'Layer moves before pointer release');
 // Read the actual composited canvas at the dragged location, while the pointer is still down.
 await p.waitForTimeout(50);
 const pixel=await stage.locator('canvas').first().evaluate((el,{view,lx,ly})=>{const d=el.width/el.getBoundingClientRect().width;return [...el.getContext('2d').getImageData(Math.round((view.panX+(lx+100)*view.zoom)*d),Math.round((view.panY+(ly+75)*view.zoom)*d),1,1).data]}, {view:during.view,lx:during.x,ly:during.y});
 assert(pixel[0]>pixel[1]*1.5,'Artwork visibly tracks the pointer before release');
 await p.mouse.up();await p.waitForTimeout(250);
 assert.equal(await p.evaluate(()=>window.__voidEditor.getState().historyIndex),during.history+1,'Drag is one undo step');
 await p.evaluate(()=>window.__voidEditor.getState().undo());assert.equal(await p.evaluate(()=>window.__voidEditor.getState().active().x),pos.l.x);
 assert.equal(await p.getByRole('button',{name:'Send feedback',exact:true}).count(),0);
 await p.evaluate(()=>window.dispatchEvent(new CustomEvent('vc:feedback',{detail:{quick:true,trigger:'export'}})));
 assert.equal(await p.getByRole('dialog',{name:'Send feedback'}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS live artwork drag before release, single-step undo, no canvas feedback prompts, no runtime errors');
}finally{await b.close()}
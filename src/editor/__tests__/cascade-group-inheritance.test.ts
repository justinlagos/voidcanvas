import { describe, it, expect } from 'vitest'
import { stampCascadeGroups, reconcileCascadeBoard } from '../cascade-integrity'
import type { Group, Layer } from '../types'

const g=(id:string,parentId:string|null,opacity=1,extra:Record<string,unknown>={}):Group =>
 ({id,name:id,parentId,visible:true,opacity,collapsed:false,...extra}) as Group
const l=(id:string,srcId:string|null,frameId:string,groupId:string):Layer=>({
 id,srcId,frameId,groupId,type:'shape',name:id,shape:'rect',x:0,y:0,w:10,h:10,
 scaleX:1,scaleY:1,rotation:0,fill:'#111',stroke:null,strokeWidth:0,radius:0,
 visible:true,locked:false,opacity:1,blend:'source-over',mask:null,maskEnabled:false,rev:1,
}) as Layer
const fixture=()=>{
 const masters=[g('master-root',null,1),g('master-leaf','master-root',1)]
 const oldMaster=[l('source',null,'M','master-leaf')]
 const generated=[g('new-root',null,1),g('new-leaf','new-root',1)]
 const linked=[l('new-layer','source','V','new-leaf')]
 return {masters,oldMaster,generated,linked}
}

describe('Cascade linked nested group inheritance',()=>{
 it('maps nested group ancestry to stable master ids and serializable baselines',()=>{
  const f=fixture()
  const groups=stampCascadeGroups(f.generated,f.masters,f.linked,f.oldMaster) as any[]
  expect(groups[0].cascadeSourceId).toBe('master-root')
  expect(groups[1].cascadeSourceId).toBe('master-leaf')
  expect(groups[0].cascadeBase).toMatchObject({opacity:1,visible:true,name:'master-root'})
  expect(groups[0].cascadeBase).not.toHaveProperty('mask')
 })
 it('untouched variant nested group inherits master opacity, visibility and name',()=>{
  const f=fixture()
  const oldGroups=stampCascadeGroups([g('old-root',null),g('old-leaf','old-root')],f.masters,
    [l('stable','source','V','old-leaf')],f.oldMaster)
  const newest=[g('master-root',null,0.4,{visible:false,name:'Changed'}),f.masters[1]]
  const fresh=stampCascadeGroups([g('temp-root',null,0.4,{visible:false,name:'Changed'}),g('temp-leaf','temp-root')],
    newest,[l('temp','source','V','temp-leaf')],f.oldMaster)
  const r=reconcileCascadeBoard(f.oldMaster,[l('stable','source','V','old-leaf')],[...f.masters,...oldGroups],
    [l('temp','source','V','temp-leaf')],fresh)
  const root=r.groups.find(x=>x.id==='old-root')!
  expect(root.opacity).toBe(0.4)
  expect(root.visible).toBe(false)
  expect(root.name).toBe('Changed')
  expect(r.groups.find(x=>x.id==='old-leaf')?.parentId).toBe('old-root')
  expect(r.layers[0].id).toBe('stable')
  expect(r.conflicts).toHaveLength(0)
 })
 it('simultaneous variant edit keeps local opacity and records durable conflict',()=>{
  const f=fixture()
  const oldGroups=stampCascadeGroups([g('old-root',null,0.8),g('old-leaf','old-root')],f.masters,
    [l('stable','source','V','old-leaf')],f.oldMaster)
  // A variant-local override must be made AFTER the original baseline is stamped.
  const previous=[{...oldGroups[0],opacity:0.7},oldGroups[1]]
  const newest=[g('master-root',null,0.35),f.masters[1]]
  const proposed=stampCascadeGroups([g('tmp-root',null,0.35),g('tmp-leaf','tmp-root')],
    newest,[l('tmp','source','V','tmp-leaf')],f.oldMaster)
  const first=reconcileCascadeBoard(f.oldMaster,[l('stable','source','V','old-leaf')],[...f.masters,...previous],
    [l('tmp','source','V','tmp-leaf')],proposed)
  const root=first.groups.find(x=>x.id==='old-root') as any
  expect(root.opacity).toBe(0.7)
  expect(root.cascadeConflicts).toContain('opacity')
  const second=reconcileCascadeBoard(f.oldMaster,first.layers,[...f.masters,...first.groups],
    [l('tmp2','source','V','tmp-leaf')],proposed)
  expect((second.groups.find(x=>x.id==='old-root') as any).cascadeConflicts).toContain('opacity')
 })
 it('legacy variant groups without inheritance metadata remain unchanged',()=>{
  const f=fixture()
  const old=[g('old-root',null,0.8),g('old-leaf','old-root')]
  const proposed=stampCascadeGroups([g('tmp-root',null,0.2),g('tmp-leaf','tmp-root')],
    [g('master-root',null,0.2),f.masters[1]],[l('tmp','source','V','tmp-leaf')],f.oldMaster)
  const r=reconcileCascadeBoard(f.oldMaster,[l('stable','source','V','old-leaf')],[...f.masters,...old],
    [l('tmp','source','V','tmp-leaf')],proposed)
  expect(r.groups.find(x=>x.id==='old-root')?.opacity).toBe(0.8)
 })
 it('leaves old group canvas masks and edit-focused collapsed state untouched',()=>{
  const f=fixture()
  const old=stampCascadeGroups([g('old-root',null),g('old-leaf','old-root')],f.masters,
    [l('stable','source','V','old-leaf')],f.oldMaster)
  const mask={local:true} as unknown as HTMLCanvasElement
  const originals=[{...old[0],mask,collapsed:true},old[1]]
  const newest=[g('master-root',null,0.5),f.masters[1]]
  const proposed=stampCascadeGroups([g('tmp-root',null,0.5),g('tmp-leaf','tmp-root')],
    newest,[l('tmp','source','V','tmp-leaf')],f.oldMaster)
  const r=reconcileCascadeBoard(f.oldMaster,[l('stable','source','V','old-leaf')],[...f.masters,...originals],
    [l('tmp','source','V','tmp-leaf')],proposed)
  const root=r.groups.find(x=>x.id==='old-root')!
  expect(root.mask).toBe(mask)
  expect(root.collapsed).toBe(true)
  expect(root.opacity).toBe(0.5)
 })
})

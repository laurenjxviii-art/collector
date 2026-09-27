import {createRequire} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {homeBindings}=require('../app/home-figma/data.ts');
const {homeWidgetSelection,packHomeWidgets}=require('../app/home-figma/widget-layout.ts');
const {demo}=require('../lib/demo.ts');
const {normalizeLifeData}=require('../lib/life.ts');
const aux={sell:null,posts:null,drops:null,stats:null},now=new Date('2026-09-27T12:00:00');
test('first visit shows only five widgets; saved additions, removals, and empty Home survive normalization',()=>{
 const initial=homeWidgetSelection();assert.equal(initial.filter(w=>w.visible).length,5);
 const customized=initial.map(w=>({...w,visible:w.id==='248:3186'}));assert.deepEqual(homeWidgetSelection(customized).filter(w=>w.visible).map(w=>w.id),['248:3186']);
 assert.equal(homeWidgetSelection(initial.map(w=>({...w,visible:false}))).filter(w=>w.visible).length,0);
});
test('all widget sizes fit without overlaps at phone, tablet, laptop and wide desktop widths',()=>{
 for(const width of [296,406,480,664,800,1060,1280,1614,2250]){
  const packed=packHomeWidgets(width,homeWidgetSelection().map(w=>({...w,visible:true})));
  for(const a of packed.items){assert.ok(a.left>=0&&a.left+a.renderedWidth<=width+0.01,`${width}: ${a.id} outside width`);assert.ok(a.top+a.renderedHeight<=packed.height+0.01);
   for(const b of packed.items)if(a.id!==b.id)assert.ok(a.left+a.renderedWidth<=b.left+0.01||b.left+b.renderedWidth<=a.left+0.01||a.top+a.renderedHeight<=b.top+0.01||b.top+b.renderedHeight<=a.top+0.01,`${width}: ${a.id} overlaps ${b.id}`);
  }
 }
});
test('portfolio bindings multiply quantities and exclude sold or archived items',()=>{
 const store=structuredClone(demo);store.items=[{...store.items[0],quantity:3,purchasePrice:20,currentValue:40},{...store.items[1],status:'sold',currentValue:999},{...store.items[2],archivedAt:'2026-09-01',currentValue:999}];
 const b=homeBindings(store,aux,now,{});assert.equal(b.text['175:50'],'$120');assert.equal(b.text['248:3595'],'3');assert.equal(b.text['248:3599'],'$60.00');assert.equal(b.text['248:3601'],'+$60.00');
});
test('empty history and disconnected services never display invented trends or reputation',()=>{
 const b=homeBindings({...demo,history:[]},aux,now,{});assert.equal(b.charts['248:3608'].values.length,0);assert.equal(b.text['175:53'],'—');assert.equal(b.text['177:933'],'—');assert.equal(b.text['177:693'],'—');
});
test('task labels, checkbox visibility, and completion styling follow saved task state',()=>{
 const life=normalizeLifeData();life.tasks=[{id:'task-1',title:'Ship record',notes:'',status:'todo',priority:'Medium',tags:[],subtasks:[],dueDate:'2026-09-27',createdAt:now.toISOString(),updatedAt:now.toISOString()}];
 const open=homeBindings({...demo,life},aux,now,{});assert.equal(open.text['177:174'],'Ship record');assert.equal(open.style['177:174'].textDecorationLine,'none');assert.ok(open.hidden.has('177:175'));
 life.tasks[0].status='completed';const done=homeBindings({...demo,life},aux,now,{});assert.equal(done.style['177:174'].textDecorationLine,'line-through');
});

test('mark-all-read uses the same persisted notification IDs as the Home alerts',()=>{
 const {normalizePlatformState}=require('../lib/platform.ts');const {todayKey}=require('../lib/life.ts');const current=new Date(),life=normalizeLifeData();life.tasks=[{id:'due-1',title:'Catalog camera',notes:'',status:'todo',priority:'Medium',tags:[],subtasks:[],dueDate:todayKey(current),createdAt:current.toISOString(),updatedAt:current.toISOString()}];const store={...demo,life,platform:normalizePlatformState(undefined,true)};
 const unread=homeBindings(store,aux,current,{});assert.ok(unread.alertIds.length>0);assert.notEqual(unread.text['248:3129'],'0');
 store.platform.notifications.readIds=unread.alertIds;const read=homeBindings(store,aux,current,{});assert.equal(read.text['248:3129'],'0');assert.equal(read.text['248:3410'],'You’re all caught up');
});
test('free placement keeps gaps, displaces collisions, and restores desktop positions after mobile use',()=>{
 const {moveHomeWidget,pinHomeLayout}=require('../app/home-figma/widget-layout.ts');
 const initial=homeWidgetSelection();const sparse=moveHomeWidget(1614,initial,'175:35',7,8);let packed=packHomeWidgets(1614,sparse);let moved=packed.items.find(w=>w.id==='175:35');assert.equal(moved.x,7);assert.equal(moved.y,8);
 const other=packed.items.find(w=>w.id==='175:306');const collision=moveHomeWidget(1614,sparse,'175:35',other.x,other.y);packed=packHomeWidgets(1614,collision);moved=packed.items.find(w=>w.id==='175:35');assert.equal(moved.x,other.x);assert.equal(moved.y,other.y);const displaced=packed.items.find(w=>w.id==='175:306');assert.ok(displaced.x!==other.x||displaced.y!==other.y);
 const mobile=pinHomeLayout(406,sparse);const restored=packHomeWidgets(1614,mobile).items.find(w=>w.id==='175:35');assert.equal(restored.x,7);assert.equal(restored.y,8);
});

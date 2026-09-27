import {createRequire} from 'node:module';
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{esModuleInterop:true,resolveJsonModule:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const m=require('../app/home-figma/mobile-layout.ts');

test('phone starter layout reproduces the Figma 01 Home · Mobile arrangement',()=>{
 const {items,rows}=m.packMobile(m.mobileSelection());
 const at=id=>{const i=items.find(w=>w.id===id);return [i.x,i.y,i.w,i.h]};
 assert.deepEqual(at('175:35'),[0,0,1,1]);assert.deepEqual(at('175:306'),[1,0,1,1]);
 assert.deepEqual(at('248:3575'),[0,1,2,2]);
 assert.deepEqual(at('248:2753'),[0,3,1,2]);assert.deepEqual(at('175:441'),[1,3,1,1]);assert.deepEqual(at('177:84'),[1,4,1,1]);
 assert.deepEqual(at('177:725'),[0,6,1,1]);assert.deepEqual(at('248:3148'),[1,6,1,2]);assert.deepEqual(at('177:608'),[0,7,1,1]);
 assert.deepEqual(at('248:3186'),[0,8,2,2]);assert.equal(rows,12);
});
test('packing never overlaps or leaves the two columns, whatever the order and sizes',()=>{
 const all=m.MOBILE_WIDGETS.map(w=>({id:w.id,size:m.mobileSizes(w.id).at(-1)}));
 for(const rows of [all,all.toReversed(),all.filter((_,i)=>i%3)]){
  const {items}=m.packMobile(rows),cells=new Set();
  for(const it of items){assert.ok(it.x>=0&&it.x+it.w<=2);for(let x=it.x;x<it.x+it.w;x++)for(let y=it.y;y<it.y+it.h;y++){const k=x+','+y;assert.ok(!cells.has(k),'overlap at '+k);cells.add(k);}}
 }
});
test('saved phone layouts are separate, keep order and fall back to a valid size',()=>{
 const saved=[{id:'248:3186',visible:true,order:1,size:'small',config:{}},{id:'175:35',visible:true,order:0,size:'large',config:{}},{id:'248:3472',visible:true,order:2,size:'large',config:{}},{id:'177:84',visible:false,order:3,size:'small',config:{}}];
 assert.deepEqual(m.mobileSelection(saved),[{id:'175:35',size:'small'},{id:'248:3186',size:'large'}]);
 assert.deepEqual(m.mobileSelection([]),[]);
 assert.notEqual(m.MOBILE_LAYOUT_KEY,'figma-01-home');
});
test('size rules: medium is 1×2 only where Figma has a phone layout; desktop mediums fill the 2×2 slot',()=>{
 assert.deepEqual(m.mobileSizes('175:35'),['small']);
 assert.deepEqual(m.mobileSizes('248:2753'),['medium','large']);
 assert.deepEqual(m.mobileSizes('248:2482'),['large']);
 assert.deepEqual(m.mobileSizes('248:3575'),['large']);
 assert.deepEqual(m.mobileSizes('248:3472'),[]);
 assert.equal(m.usesFit('248:2753','large'),false);assert.equal(m.usesFit('248:2753','medium'),true);assert.equal(m.usesFit('248:3575','large'),true);
});

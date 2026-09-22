'use client';

import {ArrowLeft,Box,MapPin,PackageOpen} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {normalizeSetupData,setupLocationLabel,setupObjectPath} from '../lib/setup';

function money(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
}

export default function VexumLocation({id}:{id:string}){
  const workspace=useWorkspace();
  if(!workspace.ready)return <main className="vxloc-page"><div className="vxloc-card loading">Loading VEXUM location…</div></main>;

  const setup=normalizeSetupData(workspace.data.setup);
  const object=setup.objects.find(entry=>entry.id===id);
  if(!object)return <main className="vxloc-page"><section className="vxloc-card empty"><MapPin/><span>VEXUM LOCATION</span><h1>Location unavailable</h1><p>This location is not present in the signed-in workspace on this device. The URL itself does not expose private collection contents.</p><button onClick={()=>history.back()}><ArrowLeft/>Back</button></section></main>;

  const space=setup.spaces.find(entry=>entry.id===object.setupId);
  const placements=setup.placements.filter(entry=>entry.setupObjectId===object.id);
  const ownedPlacements=placements.filter(entry=>entry.kind==='owned'&&entry.portfolioItemId);
  const ownedItems=ownedPlacements.map(placement=>workspace.data.items.find(item=>item.id===placement.portfolioItemId)).filter(Boolean);
  const value=ownedItems.reduce((sum,item)=>sum+(item?item.currentValue*item.quantity:0),0);
  const capacity=object.capacityValue;
  const capacityText=capacity!==undefined?placements.length+' / '+capacity:object.capacityType==='physical'?'Physical dimensions':'Not set';

  return <main className="vxloc-page">
    <section className="vxloc-card">
      <header><button onClick={()=>history.back()}><ArrowLeft/></button><div><span>VEXUM LOCATION</span><h1>{object.name}</h1><p>{setupLocationLabel(setup,object.setupId,object.id)}</p></div></header>
      <div className="vxloc-metrics"><div><span>Space</span><strong>{space?.name||'Unknown'}</strong></div><div><span>Contents</span><strong>{placements.length}</strong></div><div><span>Estimated Value</span><strong>{money(value)}</strong></div><div><span>Capacity</span><strong>{capacityText}</strong></div></div>
      <section className="vxloc-details"><div><span>Type</span><b>{object.type}</b></div><div><span>Path</span><b>{setupObjectPath(setup,object.id)}</b></div><div><span>Dimensions</span><b>{object.width} × {object.height} × {object.depth} {space?.unit||''}</b></div><div><span>Mode</span><b>{space?.mode||'Unknown'}</b></div></section>
      <section className="vxloc-items"><header><Box/><strong>Contents</strong></header>
        {ownedItems.map(item=>item?<article key={item.id}><PackageOpen/><span><strong>{item.name}</strong><small>{item.category} · {item.condition}</small></span><b>{money(item.currentValue*item.quantity)}</b></article>:null)}
        {placements.filter(entry=>entry.kind==='wishlist').map(entry=>{
          const record=entry.wishlistProductId?workspace.data.wishlist?.[entry.wishlistProductId]:undefined;
          return <article key={entry.id} className="planned"><PackageOpen/><span><strong>{record?.snapshot?.name||'Planned Wishlist item'}</strong><small>Dream / planned placement · not owned</small></span><b>Planned</b></article>;
        })}
        {!placements.length?<div className="vxloc-empty">No items are assigned directly to this location.</div>:null}
      </section>
    </section>
  </main>;
}

'use client';

import {useMemo,useRef,useState} from 'react';
import {
  AlertTriangle,Box,ChevronRight,ClipboardCheck,Grid2X2,Layers3,MapPin,
  Maximize2,PackageOpen,Plus,Redo2,Ruler,Search,Tags,Undo2
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {
  EMPTY_SETUP,newSetupId,normalizeSetupData,
  setupLocationLabel,setupObjectFit,setupObjectPath,
  type SetupCapacityType,type SetupData,type SetupMode,type SetupObject,type SetupPlacement,type SetupSpace,type SetupUnit
} from '../lib/setup';

type Tab='Overview'|'Spaces'|'Planner'|'Storage'|'Items'|'Labels';
type PlannerView='top'|'front';
type Composer='space'|'object'|null;

function money(value:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value)}
function now(){return new Date().toISOString()}
function pct(value:number,total:number){return total>0?Math.max(0,Math.min(100,Math.round(value/total*100))):0}
function unitLabel(unit:SetupUnit){return unit==='"ft'?'ft':unit}
function objectContents(data:SetupData,objectId:string){return data.placements.filter(p=>p.setupObjectId===objectId)}
function itemDimensions(item:{customFields:Record<string,string>}){
  const read=(...keys:string[])=>{
    for(const key of keys){
      const raw=item.customFields?.[key];
      if(raw){
        const n=Number(String(raw).replace(/[^0-9.]/g,''));
        if(Number.isFinite(n)&&n>0)return n;
      }
    }
    return undefined;
  };
  return {width:read('Width','width'),height:read('Height','height'),depth:read('Depth','depth')};
}

function Metric({label,value,sub}:{label:string;value:string;sub:string}){
  return <section className="vxsup-metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></section>;
}

export default function VexumSetup(){
  const workspace=useWorkspace();
  const setup=normalizeSetupData(workspace.data.setup||EMPTY_SETUP);
  const [tab,setTab]=useState<Tab>('Overview');
  const [view,setView]=useState<PlannerView>('top');
  const [composer,setComposer]=useState<Composer>(null);
  const [selectedSpaceId,setSelectedSpaceId]=useState(setup.activeSetupId||setup.spaces[0]?.id||'');
  const [selectedObjectId,setSelectedObjectId]=useState('');
  const [query,setQuery]=useState('');
  const [undo,setUndo]=useState<SetupData[]>([]);
  const [redo,setRedo]=useState<SetupData[]>([]);
  const canvasRef=useRef<HTMLDivElement>(null);

  const activeSpace=setup.spaces.find(space=>space.id===selectedSpaceId)||setup.spaces[0];
  const activeSpaceId=activeSpace?.id||'';
  const objects=setup.objects.filter(object=>object.setupId===activeSpaceId);
  const placements=setup.placements.filter(p=>p.setupId===activeSpaceId);
  const selectedObject=objects.find(object=>object.id===selectedObjectId);
  const owned=workspace.data.items.filter(item=>item.status==='owned');
  const wishlist=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived);

  const currentSpaces=setup.spaces.filter(space=>space.mode==='current');
  const currentSpaceIds=new Set(currentSpaces.map(space=>space.id));
  const currentOwnedPlacements=setup.placements.filter(p=>p.kind==='owned'&&p.portfolioItemId&&currentSpaceIds.has(p.setupId));
  const assignedCurrentIds=new Set(currentOwnedPlacements.map(p=>p.portfolioItemId!));
  const unassigned=owned.filter(item=>!assignedCurrentIds.has(item.id));
  const currentAssignedValue=owned.filter(item=>assignedCurrentIds.has(item.id)).reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const capacityObjects=setup.objects.filter(object=>['count','slots'].includes(object.capacityType)&&object.capacityValue);
  const capacityUsed=capacityObjects.reduce((sum,object)=>sum+objectContents(setup,object.id).length,0);
  const capacityTotal=capacityObjects.reduce((sum,object)=>sum+(object.capacityValue||0),0);
  const dreamSpaces=new Set(setup.spaces.filter(s=>s.mode==='dream').map(s=>s.id));
  const dreamFurnitureCost=setup.objects.filter(o=>dreamSpaces.has(o.setupId)).reduce((sum,o)=>sum+(o.cost||0),0);
  const dreamWishlistCost=setup.placements.filter(p=>dreamSpaces.has(p.setupId)&&p.kind==='wishlist'&&p.wishlistProductId).reduce((sum,p)=>{
    const record=workspace.data.wishlist?.[p.wishlistProductId!];
    return sum+(record?.currentMarket??record?.targetPrice??record?.maximumPrice??0);
  },0);
  const dreamCost=dreamFurnitureCost+dreamWishlistCost;

  const persist=(next:SetupData,recordHistory=true)=>{
    if(recordHistory){setUndo(history=>[...history.slice(-39),setup]);setRedo([])}
    const oldCurrentPlacements=new Set(setup.placements.filter(p=>p.kind==='owned'&&p.portfolioItemId&&currentSpaceIds.has(p.setupId)).map(p=>p.portfolioItemId!));
    const nextCurrentSpaceIds=new Set(next.spaces.filter(space=>space.mode==='current').map(space=>space.id));
    const nextCurrentPlacements=next.placements.filter(p=>p.kind==='owned'&&p.portfolioItemId&&nextCurrentSpaceIds.has(p.setupId));
    const placementMap=new Map(nextCurrentPlacements.map(p=>[p.portfolioItemId!,p]));
    const items=workspace.data.items.map(item=>{
      const placement=placementMap.get(item.id);
      if(placement)return {...item,location:setupLocationLabel(next,placement.setupId,placement.setupObjectId),updatedAt:now()};
      if(oldCurrentPlacements.has(item.id))return {...item,location:'',updatedAt:now()};
      return item;
    });
    workspace.update({...workspace.data,setup:next,items});
  };

  const chooseSpace=(id:string)=>{
    setSelectedSpaceId(id);setSelectedObjectId('');
    if(id!==setup.activeSetupId)persist({...setup,activeSetupId:id},false);
  };

  const undoChange=()=>{
    const previous=undo[undo.length-1];
    if(!previous)return;
    setRedo(stack=>[...stack,setup]);
    setUndo(stack=>stack.slice(0,-1));
    persist(previous,false);
    setSelectedObjectId('');
  };
  const redoChange=()=>{
    const next=redo[redo.length-1];
    if(!next)return;
    setUndo(stack=>[...stack,setup]);
    setRedo(stack=>stack.slice(0,-1));
    persist(next,false);
    setSelectedObjectId('');
  };

  const removeSpace=(id:string)=>{
    const next:{spaces:SetupSpace[];objects:SetupObject[];placements:SetupPlacement[];activeSetupId?:string}={
      spaces:setup.spaces.filter(s=>s.id!==id),
      objects:setup.objects.filter(o=>o.setupId!==id),
      placements:setup.placements.filter(p=>p.setupId!==id),
      activeSetupId:setup.activeSetupId===id?setup.spaces.find(s=>s.id!==id)?.id:setup.activeSetupId
    };
    persist(next);
    if(selectedSpaceId===id)setSelectedSpaceId(next.activeSetupId||next.spaces[0]?.id||'');
  };

  const removeObject=(id:string)=>{
    const descendants=new Set<string>([id]);
    let changed=true;
    while(changed){
      changed=false;
      for(const object of setup.objects){
        if(object.parentObjectId&&descendants.has(object.parentObjectId)&&!descendants.has(object.id)){descendants.add(object.id);changed=true}
      }
    }
    persist({...setup,objects:setup.objects.filter(o=>!descendants.has(o.id)),placements:setup.placements.map(p=>p.setupObjectId&&descendants.has(p.setupObjectId)?{...p,setupObjectId:undefined,updatedAt:now()}:p)});
    setSelectedObjectId('');
  };

  const assignOwned=(itemId:string,objectId?:string)=>{
    if(!activeSpace)return;
    const existing=setup.placements.filter(p=>!(p.kind==='owned'&&p.portfolioItemId===itemId&&p.setupId===activeSpace.id));
    const stamp=now();
    const placement:SetupPlacement={id:newSetupId('place'),setupId:activeSpace.id,setupObjectId:objectId||undefined,portfolioItemId:itemId,kind:'owned',x:0,y:0,rotation:0,notes:'',createdAt:stamp,updatedAt:stamp};
    persist({...setup,placements:[...existing,placement]});
  };
  const assignWishlist=(productId:string,objectId?:string)=>{
    if(!activeSpace||activeSpace.mode!=='dream')return;
    const existing=setup.placements.filter(p=>!(p.kind==='wishlist'&&p.wishlistProductId===productId&&p.setupId===activeSpace.id));
    const stamp=now();
    persist({...setup,placements:[...existing,{id:newSetupId('planned'),setupId:activeSpace.id,setupObjectId:objectId||undefined,wishlistProductId:productId,kind:'wishlist',x:0,y:0,rotation:0,notes:'',createdAt:stamp,updatedAt:stamp}]});
  };
  const unassign=(placementId:string)=>persist({...setup,placements:setup.placements.filter(p=>p.id!==placementId)});

  const moveObject=(object:SetupObject,clientX:number,clientY:number)=>{
    if(!activeSpace||!canvasRef.current)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const maxX=activeSpace.width;
    const maxY=view==='top'?activeSpace.length:activeSpace.height;
    const x=Math.max(0,Math.min(maxX,(clientX-rect.left)/rect.width*maxX));
    const y=Math.max(0,Math.min(maxY,(clientY-rect.top)/rect.height*maxY));
    persist({...setup,objects:setup.objects.map(o=>o.id===object.id?{...o,x,y,updatedAt:now()}:o)});
  };

  const audit=useMemo(()=>{
    const issues:Array<{label:string;count:number;detail:string}>=[];
    if(unassigned.length)issues.push({label:'Unassigned owned items',count:unassigned.length,detail:'Owned Portfolio records without a Current Setup placement.'});
    const over=setup.objects.filter(object=>object.capacityValue&&['count','slots'].includes(object.capacityType)&&objectContents(setup,object.id).length>object.capacityValue).length;
    if(over)issues.push({label:'Locations over capacity',count:over,detail:'Count/slot capacity is exceeded.'});
    const missingDims=owned.filter(item=>{const d=itemDimensions(item);return !d.width||!d.height||!d.depth}).length;
    if(missingDims)issues.push({label:'Items without dimensions',count:missingDims,detail:'Fit analysis stays unknown until dimensions are recorded.'});
    const soldAssigned=setup.placements.filter(p=>p.portfolioItemId&&workspace.data.items.some(item=>item.id===p.portfolioItemId&&item.status==='sold')).length;
    if(soldAssigned)issues.push({label:'Sold items still assigned',count:soldAssigned,detail:'Review physical placement for archived/sold inventory.'});
    return issues;
  },[setup,unassigned,owned,workspace.data.items]);

  const filteredObjects=objects.filter(o=>!query||[o.name,o.type,setupObjectPath(setup,o.id)].join(' ').toLowerCase().includes(query.toLowerCase()));
  const filteredItems=owned.filter(item=>!query||[item.name,item.category,item.location].join(' ').toLowerCase().includes(query.toLowerCase()));

  if(!workspace.ready)return <div className="vxsup-page"><div className="vxsup-loading">Loading Setup workspace…</div></div>;

  return <div className="vxsup-page">
    <section className="vxsup-title">
      <div><span>SETUP</span><h1>Physical Collection System</h1><p>Portfolio knows what you own. Setup knows where each owned copy physically exists.</p></div>
      <aside><strong>{workspace.status}</strong><small>2D only · autosaved through the shared VEXUM workspace</small></aside>
    </section>

    <div className="vxsup-toolbar">
      <nav>{(['Overview','Spaces','Planner','Storage','Items','Labels'] as Tab[]).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name}</button>)}</nav>
      <div>{setup.spaces.length?<select value={activeSpaceId} onChange={e=>chooseSpace(e.target.value)}>{setup.spaces.map(space=><option value={space.id} key={space.id}>{space.name} · {space.mode}</option>)}</select>:null}<button onClick={undoChange} disabled={!undo.length}><Undo2/>Undo</button><button onClick={redoChange} disabled={!redo.length}><Redo2/>Redo</button></div>
    </div>

    {tab==='Overview'&&<>
      <div className="vxsup-metrics">
        <Metric label="Spaces" value={String(setup.spaces.length)} sub={currentSpaces.length+' current · '+setup.spaces.filter(s=>s.mode==='dream').length+' dream'}/>
        <Metric label="Storage Units" value={String(setup.objects.length)} sub="Furniture, storage, and nested objects"/>
        <Metric label="Items Assigned" value={assignedCurrentIds.size+' / '+owned.length} sub="Current physical placements"/>
        <Metric label="Unassigned Items" value={String(Math.max(0,owned.length-assignedCurrentIds.size))} sub="Owned copies needing a location"/>
        <Metric label="Storage Capacity" value={capacityTotal?pct(capacityUsed,capacityTotal)+'%':'Unknown'} sub={capacityTotal?capacityUsed+' / '+capacityTotal+' count or slots':'No count/slot capacities set'}/>
        <Metric label="Setup Value" value={money(currentAssignedValue)} sub="Market value assigned to Current spaces"/>
        <Metric label="Dream Setup Cost" value={dreamCost?money(dreamCost):'Not set'} sub="Explicit furniture + Wishlist estimates only"/>
      </div>
      <div className="vxsup-overview">
        <section className="vxsup-panel">
          <header><h3>Spaces</h3><button onClick={()=>{setTab('Spaces');setComposer('space')}}><Plus/>New Space</button></header>
          <div className="vxsup-space-list">{setup.spaces.map(space=>{
            const count=setup.placements.filter(p=>p.setupId===space.id&&p.kind==='owned').length;
            const value=setup.placements.filter(p=>p.setupId===space.id&&p.kind==='owned'&&p.portfolioItemId).reduce((sum,p)=>sum+(workspace.data.items.find(item=>item.id===p.portfolioItemId)?.currentValue||0),0);
            return <button key={space.id} onClick={()=>{chooseSpace(space.id);setTab('Planner')}}><span className={'mode '+space.mode}>{space.mode}</span><div><strong>{space.name}</strong><small>{space.type} · {space.width}{unitLabel(space.unit)} × {space.length}{unitLabel(space.unit)}</small></div><b>{count} items</b><em>{money(value)}</em><ChevronRight/></button>;
          })}{!setup.spaces.length?<div className="vxsup-empty compact"><Layers3/><strong>No Setup yet</strong><p>Create a Current space, Dream setup, or storage system. Nothing will alter your Portfolio ownership.</p><button className="red" onClick={()=>{setTab('Spaces');setComposer('space')}}>Create Setup</button></div>:null}</div>
        </section>
        <section className="vxsup-panel">
          <header><h3>Setup Audit</h3><button onClick={()=>setTab('Items')}>Review Items</button></header>
          <div className="vxsup-audit">{audit.map(issue=><div key={issue.label}><AlertTriangle/><span><strong>{issue.label}</strong><small>{issue.detail}</small></span><b>{issue.count}</b></div>)}{!audit.length?<div className="vxsup-empty-row"><ClipboardCheck/>No setup issues detected from the data currently available.</div>:null}</div>
        </section>
      </div>
    </>}

    {tab==='Spaces'&&<section className="vxsup-panel vxsup-full">
      <header><div><h3>Spaces</h3><p>Current represents reality. Planned and Dream remain separate from real inventory location.</p></div><button className="red" onClick={()=>setComposer(composer==='space'?null:'space')}><Plus/>Create Space</button></header>
      {composer==='space'?<SpaceForm onCancel={()=>setComposer(null)} onSave={space=>{const next={...setup,spaces:[...setup.spaces,space],activeSetupId:space.id};persist(next);setSelectedSpaceId(space.id);setComposer(null)}}/>:null}
      <div className="vxsup-space-grid">{setup.spaces.map(space=><article key={space.id}><header><span className={'mode '+space.mode}>{space.mode}</span><button onClick={()=>removeSpace(space.id)}>Remove</button></header><Layers3/><strong>{space.name}</strong><small>{space.type}</small><div><span>{space.width}{unitLabel(space.unit)} W</span><span>{space.length}{unitLabel(space.unit)} L</span><span>{space.height}{unitLabel(space.unit)} H</span></div><footer><button onClick={()=>{chooseSpace(space.id);setTab('Planner')}}>Open Planner</button><button onClick={()=>{chooseSpace(space.id);setTab('Storage')}}>Storage Tree</button></footer></article>)}</div>
      {!setup.spaces.length?<div className="vxsup-empty"><Layers3/><strong>You haven't created a Setup yet.</strong><p>Start with a Current room, a Dream setup, or a storage-only space.</p></div>:null}
    </section>}

    {tab==='Planner'&&(!activeSpace?<section className="vxsup-panel vxsup-full"><div className="vxsup-empty"><Grid2X2/><strong>Create a space before opening the planner.</strong><button className="red" onClick={()=>{setTab('Spaces');setComposer('space')}}>Create Space</button></div></section>:<div className="vxsup-planner-shell">
      <section className="vxsup-panel vxsup-planner">
        <header className="vxsup-planner-head"><div><h3>{activeSpace.name}</h3><p>{activeSpace.width}{unitLabel(activeSpace.unit)} × {activeSpace.length}{unitLabel(activeSpace.unit)} · {activeSpace.mode}</p></div><div><button className={view==='top'?'active':''} onClick={()=>setView('top')}>Top-Down</button><button className={view==='front'?'active':''} onClick={()=>setView('front')}>Front View</button><button onClick={()=>setComposer(composer==='object'?null:'object')}><Plus/>Object</button></div></header>
        {composer==='object'?<ObjectForm space={activeSpace} parentObjectId={selectedObjectId||undefined} onCancel={()=>setComposer(null)} onSave={object=>{persist({...setup,objects:[...setup.objects,object]});setSelectedObjectId(object.id);setComposer(null)}}/>:null}
        <div className="vxsup-canvas-wrap">
          <div className="vxsup-ruler"><Ruler/><span>{view==='top'?'Room width × length':'Wall width × height'} · drag objects to move · snap is visual only in this phase</span></div>
          <div className="vxsup-canvas" ref={canvasRef} onDragOver={e=>e.preventDefault()} onDrop={e=>{
            e.preventDefault();
            const itemId=e.dataTransfer.getData('application/vexum-item');
            if(itemId)assignOwned(itemId,selectedObjectId||undefined);
          }}>
            {filteredObjects.map(object=>{
              const maxY=view==='top'?activeSpace.length:activeSpace.height;
              const objectY=view==='top'?object.depth:object.height;
              const fit=setupObjectFit(activeSpace,object,view);
              const count=objectContents(setup,object.id).length;
              return <button
                key={object.id}
                draggable
                onDragEnd={e=>moveObject(object,e.clientX,e.clientY)}
                onClick={()=>setSelectedObjectId(object.id)}
                className={'vxsup-object '+(selectedObjectId===object.id?'selected ':'')+fit}
                style={{left:(object.x/Math.max(1,activeSpace.width)*100)+'%',top:(object.y/Math.max(1,maxY)*100)+'%',width:Math.max(4,object.width/Math.max(1,activeSpace.width)*100)+'%',height:Math.max(6,objectY/Math.max(1,maxY)*100)+'%',transform:'rotate('+object.rotation+'deg)'}}
              ><Box/><strong>{object.name}</strong><small>{count} item{count===1?'':'s'}</small></button>;
            })}
            {!objects.length?<div className="vxsup-canvas-empty"><Grid2X2/><strong>Blank {activeSpace.mode} space</strong><span>Add a display, shelf, desk, box, or custom object.</span></div>:null}
          </div>
        </div>
      </section>
      <aside className="vxsup-panel vxsup-inspector">
        {selectedObject?<ObjectInspector object={selectedObject} space={activeSpace} setup={setup} items={workspace.data.items} onUpdate={next=>persist({...setup,objects:setup.objects.map(o=>o.id===next.id?next:o)})} onRemove={()=>removeObject(selectedObject.id)} onAddChild={()=>setComposer('object')}/>:<><header><h3>Planner Inspector</h3></header><div className="vxsup-empty compact"><Maximize2/><strong>Select an object</strong><p>Dimensions, capacity, contents, fit status, and nested structure appear here.</p></div></>}
        <div className="vxsup-tray"><header><strong>Unassigned Items</strong><span>{unassigned.length}</span></header>{unassigned.slice(0,8).map(item=><div key={item.id} draggable onDragStart={e=>e.dataTransfer.setData('application/vexum-item',item.id)}><PackageOpen/><span><strong>{item.name}</strong><small>{item.category}</small></span><button onClick={()=>assignOwned(item.id,selectedObjectId||undefined)}>Place</button></div>)}{!unassigned.length?<p>All owned items have a Current Setup assignment.</p>:null}</div>
      </aside>
    </div>)}

    {tab==='Storage'&&<div className="vxsup-storage-shell">
      <section className="vxsup-panel vxsup-tree">
        <header><div><h3>Storage Tree</h3><p>{activeSpace?.name||'No active space'}</p></div>{activeSpace?<button onClick={()=>setComposer('object')}><Plus/>Add</button>:null}</header>
        {activeSpace?<StorageTree objects={objects} setup={setup} selected={selectedObjectId} onSelect={setSelectedObjectId}/>:<div className="vxsup-empty-row">Create a space first.</div>}
      </section>
      <section className="vxsup-panel vxsup-location-detail">
        {selectedObject&&activeSpace?<ObjectInspector object={selectedObject} space={activeSpace} setup={setup} items={workspace.data.items} onUpdate={next=>persist({...setup,objects:setup.objects.map(o=>o.id===next.id?next:o)})} onRemove={()=>removeObject(selectedObject.id)} onAddChild={()=>setComposer('object')}/>:<div className="vxsup-empty"><MapPin/><strong>Select a storage location</strong><p>The exact path, value, contents, and capacity will appear here.</p></div>}
        {composer==='object'&&activeSpace?<ObjectForm space={activeSpace} parentObjectId={selectedObjectId||undefined} onCancel={()=>setComposer(null)} onSave={object=>{persist({...setup,objects:[...setup.objects,object]});setSelectedObjectId(object.id);setComposer(null)}}/>:null}
      </section>
    </div>}

    {tab==='Items'&&<section className="vxsup-panel vxsup-full">
      <header><div><h3>Items + Locations</h3><p>Current Setup placement is the physical-location source of truth. The legacy Portfolio location string is updated as a compatibility mirror.</p></div><label className="vxsup-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search item or location…"/></label></header>
      <div className="vxsup-item-table"><div className="head"><span>Item</span><span>Category</span><span>Physical Location</span><span>Dimensions</span><span>Value</span><span>Action</span></div>{filteredItems.map(item=>{
        const placement=currentOwnedPlacements.find(p=>p.portfolioItemId===item.id);
        const dims=itemDimensions(item);
        const path=placement?setupLocationLabel(setup,placement.setupId,placement.setupObjectId):'Unassigned';
        return <div key={item.id}><span><strong>{item.name}</strong><small>{item.condition}</small></span><span>{item.category}</span><span className={placement?'':'unassigned'}>{path}</span><span>{dims.width&&dims.height&&dims.depth?dims.width+' × '+dims.height+' × '+dims.depth:'Unknown'}</span><b>{money(item.currentValue*item.quantity)}</b><span>{placement?<button onClick={()=>unassign(placement.id)}>Unassign</button>:activeSpace?<button onClick={()=>assignOwned(item.id,selectedObjectId||undefined)}>Assign to {selectedObject?.name||activeSpace.name}</button>:<button onClick={()=>setTab('Spaces')}>Create Space</button>}</span></div>;
      })}</div>
      {activeSpace?.mode==='dream'?<div className="vxsup-dream-tray"><header><strong>Wishlist Items for Dream Setup</strong><span>Placing one here does not mark it owned.</span></header>{wishlist.slice(0,20).map(record=>{
        const placed=setup.placements.some(p=>p.setupId===activeSpace.id&&p.kind==='wishlist'&&p.wishlistProductId===record.productId);
        return <div key={record.productId}><StarIcon/><span><strong>{record.snapshot?.name||record.productId}</strong><small>{money(record.currentMarket??record.targetPrice??record.maximumPrice??0)}</small></span><button disabled={placed} onClick={()=>assignWishlist(record.productId,selectedObjectId||undefined)}>{placed?'Placed':'Place in Dream'}</button></div>;
      })}</div>:null}
    </section>}

    {tab==='Labels'&&<section className="vxsup-panel vxsup-full">
      <header><div><h3>Location Labels</h3><p>Safe labels point to a VEXUM location identifier. They do not encode private collection contents directly.</p></div></header>
      <div className="vxsup-label-grid">{setup.objects.map(object=>{
        const space=setup.spaces.find(s=>s.id===object.setupId);
        const url='https://vexum.app/location/'+encodeURIComponent(object.id);
        return <article key={object.id}><span>VEXUM</span><strong>{object.name}</strong><small>{space?.name} → {setupObjectPath(setup,object.id)}</small><div className="vxsup-qr-placeholder"><Tags/><b>QR renderer not configured</b><code>{url}</code></div><footer><button onClick={()=>navigator.clipboard?.writeText(url)}>Copy Location URL</button></footer></article>;
      })}{!setup.objects.length?<div className="vxsup-empty wide"><Tags/><strong>No labelable locations yet.</strong><p>Add a storage object first. VEXUM will never fake a QR pattern that cannot actually resolve.</p></div>:null}</div>
    </section>}
  </div>;
}

function StarIcon(){return <span className="vxsup-star">★</span>}

function SpaceForm({onSave,onCancel}:{onSave:(space:SetupSpace)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [type,setType]=useState('Collection Room');
  const [mode,setMode]=useState<SetupMode>('current');
  const [unit,setUnit]=useState<SetupUnit>('ft');
  const [width,setWidth]=useState('12');
  const [length,setLength]=useState('10');
  const [height,setHeight]=useState('8');
  const submit=()=>{if(!name.trim())return;const stamp=now();onSave({id:newSetupId('setup'),name:name.trim(),type:type.trim()||'Custom Space',mode,width:Number(width)||0,length:Number(length)||0,height:Number(height)||0,unit,isPublic:false,createdAt:stamp,updatedAt:stamp})};
  return <div className="vxsup-composer"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Collection Room"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value)}><option>Collection Room</option><option>Bedroom</option><option>Office</option><option>Garage</option><option>Storage Unit</option><option>Display Wall</option><option>Desk Area</option><option>Closet</option><option>Blank</option></select></label><label>Mode<select value={mode} onChange={e=>setMode(e.target.value as SetupMode)}><option value="current">Current</option><option value="planned">Planned</option><option value="dream">Dream</option></select></label><label>Units<select value={unit} onChange={e=>setUnit(e.target.value as SetupUnit)}><option value="ft">Feet</option><option value="in">Inches</option><option value="cm">Centimeters</option><option value="mm">Millimeters</option></select></label><label>Width<input inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)}/></label><label>Length<input inputMode="decimal" value={length} onChange={e=>setLength(e.target.value)}/></label><label>Height<input inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)}/></label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>Create Space</button></footer></div>;
}

function ObjectForm({space,parentObjectId,onSave,onCancel}:{space:SetupSpace;parentObjectId?:string;onSave:(object:SetupObject)=>void;onCancel:()=>void}){
  const [name,setName]=useState('');
  const [type,setType]=useState('Display Case');
  const [width,setWidth]=useState(space.unit==='ft'?'3':'36');
  const [height,setHeight]=useState(space.unit==='ft'?'6':'72');
  const [depth,setDepth]=useState(space.unit==='ft'?'1.5':'18');
  const [capacityType,setCapacityType]=useState<SetupCapacityType>('physical');
  const [capacity,setCapacity]=useState('');
  const [cost,setCost]=useState('');
  const submit=()=>{if(!name.trim())return;const stamp=now();onSave({id:newSetupId('object'),setupId:space.id,parentObjectId,name:name.trim(),type,width:Number(width)||0,height:Number(height)||0,depth:Number(depth)||0,x:0,y:0,rotation:0,capacityType,capacityValue:capacity.trim()?Math.max(0,Number(capacity)||0):undefined,cost:cost.trim()?Math.max(0,Number(cost)||0):undefined,notes:'',createdAt:stamp,updatedAt:stamp})};
  return <div className="vxsup-composer object"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Display Case 1"/></label><label>Type<select value={type} onChange={e=>setType(e.target.value)}><option>Display Case</option><option>Shelf</option><option>Wall Shelf</option><option>Desk</option><option>Cabinet</option><option>Bookcase</option><option>Binder</option><option>Card Box</option><option>Comic Box</option><option>Storage Bin</option><option>Drawer</option><option>Display Riser</option><option>Pegboard</option><option>Custom</option></select></label><label>Width ({space.unit})<input inputMode="decimal" value={width} onChange={e=>setWidth(e.target.value)}/></label><label>Height ({space.unit})<input inputMode="decimal" value={height} onChange={e=>setHeight(e.target.value)}/></label><label>Depth ({space.unit})<input inputMode="decimal" value={depth} onChange={e=>setDepth(e.target.value)}/></label><label>Capacity<select value={capacityType} onChange={e=>setCapacityType(e.target.value as SetupCapacityType)}><option value="physical">Physical Dimensions</option><option value="count">Count</option><option value="slots">Slots</option><option value="custom">Custom</option></select></label>{capacityType!=='physical'?<label>Capacity value<input inputMode="numeric" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="200"/></label>:null}<label>Cost optional<input inputMode="decimal" value={cost} onChange={e=>setCost(e.target.value)} placeholder="0"/></label><footer><button onClick={onCancel}>Cancel</button><button className="red" onClick={submit}>{parentObjectId?'Add Nested Object':'Add Object'}</button></footer></div>;
}

function StorageTree({objects,setup,selected,onSelect}:{objects:SetupObject[];setup:SetupData;selected:string;onSelect:(id:string)=>void}){
  const render=(parent?:string,depth=0):React.ReactNode=>objects.filter(o=>(o.parentObjectId||'')===(parent||'')).map(object=>{
    const count=objectContents(setup,object.id).length;
    return <div key={object.id}><button className={selected===object.id?'active':''} style={{paddingLeft:12+depth*18}} onClick={()=>onSelect(object.id)}><ChevronRight/><Box/><span><strong>{object.name}</strong><small>{object.type}</small></span><b>{count}</b></button>{render(object.id,depth+1)}</div>;
  });
  return <div className="vxsup-tree-list">{render()}{!objects.length?<div className="vxsup-empty-row">No storage objects in this space.</div>:null}</div>;
}

function ObjectInspector({object,space,setup,items,onUpdate,onRemove,onAddChild}:{object:SetupObject;space:SetupSpace;setup:SetupData;items:Array<{id:string;name:string;currentValue:number;quantity:number}>;onUpdate:(object:SetupObject)=>void;onRemove:()=>void;onAddChild:()=>void}){
  const placements=objectContents(setup,object.id);
  const value=placements.filter(p=>p.portfolioItemId).reduce((sum,p)=>{const item=items.find(entry=>entry.id===p.portfolioItemId);return sum+(item?item.currentValue*item.quantity:0)},0);
  const cap=object.capacityValue;
  const capPct=cap?pct(placements.length,cap):undefined;
  const fit=setupObjectFit(space,object,'top');
  return <div className="vxsup-object-inspector"><header><div><span>{object.type}</span><h3>{object.name}</h3><small>{setupObjectPath(setup,object.id)}</small></div><button onClick={onRemove}>Remove</button></header><div className="vxsup-inspector-grid"><label>Width<input type="number" value={object.width} onChange={e=>onUpdate({...object,width:Math.max(0,Number(e.target.value)||0),updatedAt:now()})}/></label><label>Height<input type="number" value={object.height} onChange={e=>onUpdate({...object,height:Math.max(0,Number(e.target.value)||0),updatedAt:now()})}/></label><label>Depth<input type="number" value={object.depth} onChange={e=>onUpdate({...object,depth:Math.max(0,Number(e.target.value)||0),updatedAt:now()})}/></label><label>Rotation<input type="number" value={object.rotation} onChange={e=>onUpdate({...object,rotation:Number(e.target.value)||0,updatedAt:now()})}/></label></div><div className="vxsup-inspector-stats"><div><span>Contents</span><strong>{placements.length}</strong></div><div><span>Value</span><strong>{money(value)}</strong></div><div><span>Fit in room</span><strong className={fit==='no'?'tone-red':fit==='fits'?'tone-green':''}>{fit==='fits'?'Fits':fit==='no'?'Does Not Fit':'Unknown'}</strong></div></div>{cap!==undefined?<div className="vxsup-capacity"><span>{placements.length} / {cap} {object.capacityType}</span><b>{capPct}%</b><i><em style={{width:Math.min(100,capPct||0)+'%'}}/></i></div>:<p className="vxsup-note">No count/slot capacity is set. Physical multi-item packing is intentionally not guessed.</p>}<div className="vxsup-inspector-actions"><button onClick={onAddChild}><Plus/>Add nested location</button></div></div>;
}

'use client';

import {useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,Archive,Bell,CalendarDays,Check,ChevronRight,CircleDollarSign,Eye,
  Filter,Grid2X2,History,List,PackageCheck,Pencil,Search,ShoppingBag,Star,Store,
  Target,WalletCards,X
} from 'lucide-react';
import {DEMO_PRODUCTS,DEMO_RELATIONSHIPS} from '../lib/search/demo';
import type {NormalizedProduct,UserProductRelationship} from '../lib/search/types';
import type {Item} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';

type Priority='Low'|'Medium'|'High'|'Grail';
type MainTab='Overview'|'Items'|'Opportunities'|'Grails'|'Preorders'|'Planned'|'Archive';
type DetailTab='Overview'|'Market'|'Availability'|'Planning'|'History';
type ViewMode='table'|'grid';
type MarketSource='demo'|'saved'|'unavailable';
type ArchiveReason='purchased'|'removed';
type AlertKey='price'|'msrp'|'restock'|'local'|'marketplace'|'release'|'preorder';

type GrailGoal={
  goalAmount?:number;
  savedAmount?:number;
  deadline?:string;
  status:'Saving'|'Paused'|'Funded';
};

type PreorderPlan={
  enabled:boolean;
  price?:number;
  deposit?:number;
  balance?:number;
  chargeDate?:string;
  releaseDate?:string;
  status:'Planned'|'Preordered'|'Charging Soon'|'Released'|'Cancelled';
};

type WishlistMeta={
  priority:Priority;
  targetPrice?:number;
  maxPrice?:number;
  desiredCondition:string;
  retailers:string[];
  quantity:number;
  deadline?:string;
  plannedMonth?:string;
  notes:string;
  alerts:Record<AlertKey,boolean>;
  grail?:GrailGoal;
  preorder?:PreorderPlan;
  archived:boolean;
  archiveReason?:ArchiveReason;
  purchasedAt?:string;
  purchasePrice?:number;
  history:Array<{at:string;event:string}>;
};

type WishlistEntry={
  id:string;
  productId:string;
  name:string;
  category:string;
  line:string;
  manufacturer:string;
  imageUrl?:string;
  msrp?:number;
  market?:number;
  marketSource:MarketSource;
  relation:UserProductRelationship;
  meta:WishlistMeta;
  product?:NormalizedProduct;
  workspaceItem?:Item;
  ownedQuantity:number;
};

const REL_KEY='vexum.search.relationships.v1';
const META_KEY='vexum.wishlist.meta.v1';
const PREF_KEY='vexum.wishlist.view.v1';
const ALERT_LABELS:Record<AlertKey,string>={
  price:'Price target',
  msrp:'At MSRP',
  restock:'Restock',
  local:'Local availability',
  marketplace:'Marketplace listing',
  release:'Release',
  preorder:'Preorder'
};
const PRIORITY_ORDER:Record<Priority,number>={Grail:0,High:1,Medium:2,Low:3};

function money(value?:number){
  return typeof value==='number'&&Number.isFinite(value)
    ?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)
    :'—';
}
function norm(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function num(value:string){const n=Number(value);return value.trim()!==''&&Number.isFinite(n)?n:undefined}
function emptyAlerts():Record<AlertKey,boolean>{
  return {price:false,msrp:false,restock:false,local:false,marketplace:false,release:false,preorder:false};
}
function defaultMeta(relation?:UserProductRelationship):WishlistMeta{
  const alerts=emptyAlerts();
  if(relation?.tracked)alerts.marketplace=true;
  return {
    priority:relation?.grail?'Grail':'Medium',
    targetPrice:relation?.targetPrice,
    maxPrice:relation?.maxPrice,
    desiredCondition:relation?.conditionRequirement||'Any',
    retailers:[],
    quantity:1,
    notes:'',
    alerts,
    archived:false,
    history:[]
  };
}
function normalizeMeta(value:Partial<WishlistMeta>|undefined,relation?:UserProductRelationship):WishlistMeta{
  const base=defaultMeta(relation);
  return {
    ...base,
    ...value,
    priority:value?.priority||base.priority,
    desiredCondition:value?.desiredCondition||base.desiredCondition,
    retailers:Array.isArray(value?.retailers)?value!.retailers!.filter(Boolean):[],
    quantity:Math.max(1,Number(value?.quantity)||1),
    notes:typeof value?.notes==='string'?value.notes:'',
    alerts:{...base.alerts,...(value?.alerts||{})},
    history:Array.isArray(value?.history)?value!.history!.filter(row=>row&&typeof row.event==='string'&&typeof row.at==='string'):[]
  };
}
function loadRelations(){
  if(typeof window==='undefined')return {...DEMO_RELATIONSHIPS};
  try{
    const saved=JSON.parse(localStorage.getItem(REL_KEY)||'{}');
    return {...DEMO_RELATIONSHIPS,...saved} as Record<string,UserProductRelationship>;
  }catch{return {...DEMO_RELATIONSHIPS}}
}
function loadMeta(){
  if(typeof window==='undefined')return {} as Record<string,WishlistMeta>;
  try{
    const saved=JSON.parse(localStorage.getItem(META_KEY)||'{}') as Record<string,Partial<WishlistMeta>>;
    const next:Record<string,WishlistMeta>={};
    Object.entries(saved).forEach(([id,value])=>{next[id]=normalizeMeta(value)});
    return next;
  }catch{return {} as Record<string,WishlistMeta>}
}
function saveRelations(value:Record<string,UserProductRelationship>){
  try{localStorage.setItem(REL_KEY,JSON.stringify(value))}catch{}
}
function saveMeta(value:Record<string,WishlistMeta>){
  try{localStorage.setItem(META_KEY,JSON.stringify(value))}catch{}
}
function currentMonth(){return new Date().toISOString().slice(0,7)}
function today(){return new Date().toISOString().slice(0,10)}
function stampEvent(meta:WishlistMeta,event:string):WishlistMeta{
  return {...meta,history:[{at:new Date().toISOString(),event},...meta.history].slice(0,80)};
}
function sourceLabel(source:MarketSource){
  if(source==='demo')return 'Demo market data';
  if(source==='saved')return 'Saved valuation';
  return 'Provider unavailable';
}
function availabilityClass(source:MarketSource){return source==='unavailable'?'unavailable':source==='demo'?'demo':'saved'}

export default function VexumWishlist(){
  const workspace=useWorkspace();
  const [hydrated,setHydrated]=useState(false);
  const [relations,setRelations]=useState<Record<string,UserProductRelationship>>(()=>({...DEMO_RELATIONSHIPS}));
  const [meta,setMeta]=useState<Record<string,WishlistMeta>>({});
  const [tab,setTab]=useState<MainTab>('Overview');
  const [detailTab,setDetailTab]=useState<DetailTab>('Overview');
  const [view,setView]=useState<ViewMode>('table');
  const [sort,setSort]=useState('priority');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('All');
  const [condition,setCondition]=useState('All');
  const [priorityFilter,setPriorityFilter]=useState<Priority[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [planningId,setPlanningId]=useState<string|null>(null);
  const [purchasingId,setPurchasingId]=useState<string|null>(null);

  useEffect(()=>{
    setRelations(loadRelations());
    setMeta(loadMeta());
    try{
      const saved=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
      if(saved.view==='grid'||saved.view==='table')setView(saved.view);
      if(typeof saved.sort==='string')setSort(saved.sort);
    }catch{}
    setHydrated(true);
  },[]);
  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(PREF_KEY,JSON.stringify({view,sort}))}catch{}
  },[hydrated,view,sort]);

  const entries=useMemo<WishlistEntry[]>(()=>{
    const productById=new Map(DEMO_PRODUCTS.map(product=>[product.id,product]));
    const rows:WishlistEntry[]=[];
    const catalogIds=new Set<string>();
    Object.entries(relations).forEach(([id,relation])=>{
      if(relation.wishlisted||meta[id]?.archived)catalogIds.add(id);
    });
    Object.keys(meta).forEach(id=>{if(!id.startsWith('workspace:'))catalogIds.add(id)});

    catalogIds.forEach(productId=>{
      const relation=relations[productId]||{productId,ownedQuantity:0,wishlisted:false,tracked:false,grail:false};
      const product=productById.get(productId);
      const savedMeta=normalizeMeta(meta[productId],relation);
      if(product){
        const ownedWorkspace=workspace.data.items.filter(item=>item.status==='owned'&&(
          norm(item.name)===norm(product.canonicalName)||
          (!!product.upc&&item.identity?.upc===product.upc)||
          (!!product.sku&&item.identity?.sku===product.sku)
        )).reduce((sum,item)=>sum+item.quantity,0);
        rows.push({
          id:productId,
          productId,
          name:product.canonicalName,
          category:product.category,
          line:product.line||product.brand||'Catalog',
          manufacturer:product.manufacturer,
          imageUrl:product.imageUrl,
          msrp:product.msrp,
          market:product.demoMarket?.current,
          marketSource:product.demoMarket?'demo':'unavailable',
          relation,
          meta:savedMeta,
          product,
          ownedQuantity:(relation.ownedQuantity||0)+ownedWorkspace
        });
      }else{
        rows.push({
          id:productId,
          productId,
          name:'Unresolved catalog item',
          category:'Other',
          line:'Search catalog',
          manufacturer:'Identity owned by Search',
          marketSource:'unavailable',
          relation,
          meta:savedMeta,
          ownedQuantity:relation.ownedQuantity||0
        });
      }
    });

    const knownNames=new Set(rows.map(row=>norm(row.name)).filter(name=>name!=='unresolved catalog item'));
    const workspaceIds=new Set<string>();
    workspace.data.items.forEach(item=>{
      const key='workspace:'+item.id;
      if(item.status==='wishlist'||meta[key]?.archived)workspaceIds.add(key);
    });
    Object.keys(meta).filter(id=>id.startsWith('workspace:')).forEach(id=>workspaceIds.add(id));

    workspaceIds.forEach(id=>{
      const itemId=id.slice('workspace:'.length);
      const item=workspace.data.items.find(candidate=>candidate.id===itemId);
      if(!item)return;
      if(item.status==='wishlist'&&knownNames.has(norm(item.name))&&!meta[id]?.archived)return;
      const relation=relations[id]||{productId:id,ownedQuantity:0,wishlisted:item.status==='wishlist',tracked:false,grail:false};
      const savedMeta=normalizeMeta(meta[id],relation);
      const ownedWorkspace=workspace.data.items.filter(candidate=>candidate.status==='owned'&&norm(candidate.name)===norm(item.name)).reduce((sum,candidate)=>sum+candidate.quantity,0);
      rows.push({
        id,
        productId:id,
        name:item.name,
        category:item.category||'Other',
        line:item.identity?.series||item.identity?.brand||'Portfolio catalog',
        manufacturer:item.identity?.brand||'Saved item',
        imageUrl:item.image||undefined,
        market:item.currentValue>0?item.currentValue:undefined,
        marketSource:item.currentValue>0?'saved':'unavailable',
        relation,
        meta:savedMeta,
        workspaceItem:item,
        ownedQuantity:ownedWorkspace
      });
    });

    return rows;
  },[relations,meta,workspace.data.items]);

  const activeEntries=entries.filter(entry=>(entry.relation.wishlisted||entry.workspaceItem?.status==='wishlist')&&!entry.meta.archived);
  const archivedEntries=entries.filter(entry=>entry.meta.archived);
  const opportunities=activeEntries.filter(entry=>typeof entry.market==='number'&&typeof entry.meta.targetPrice==='number'&&entry.market<=entry.meta.targetPrice);
  const grails=activeEntries.filter(entry=>entry.meta.priority==='Grail');
  const preorders=activeEntries.filter(entry=>entry.meta.preorder?.enabled&&entry.meta.preorder.status!=='Cancelled');
  const planned=activeEntries.filter(entry=>Boolean(entry.meta.plannedMonth));
  const potentialSavings=opportunities.reduce((sum,entry)=>sum+Math.max(0,(entry.meta.targetPrice||0)-(entry.market||0))*entry.meta.quantity,0);

  const categories=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.category))).sort()],[activeEntries]);

  const baseForTab=useMemo(()=>{
    if(tab==='Archive')return archivedEntries;
    if(tab==='Opportunities')return opportunities;
    if(tab==='Grails')return grails;
    if(tab==='Preorders')return preorders;
    if(tab==='Planned')return planned;
    return activeEntries;
  },[tab,activeEntries,archivedEntries,opportunities,grails,preorders,planned]);

  const visible=useMemo(()=>{
    const clean=query.trim().toLowerCase();
    const next=baseForTab.filter(entry=>{
      if(clean&&!([entry.name,entry.category,entry.line,entry.manufacturer].join(' ').toLowerCase().includes(clean)))return false;
      if(category!=='All'&&entry.category!==category)return false;
      if(condition!=='All'&&entry.meta.desiredCondition!==condition)return false;
      if(priorityFilter.length&&!priorityFilter.includes(entry.meta.priority))return false;
      return true;
    });
    return next.toSorted((a,b)=>{
      if(sort==='name')return a.name.localeCompare(b.name);
      if(sort==='market')return (b.market||-1)-(a.market||-1);
      if(sort==='target')return (b.meta.targetPrice||-1)-(a.meta.targetPrice||-1);
      if(sort==='deadline')return (a.meta.deadline||'9999').localeCompare(b.meta.deadline||'9999');
      return PRIORITY_ORDER[a.meta.priority]-PRIORITY_ORDER[b.meta.priority]||a.name.localeCompare(b.name);
    });
  },[baseForTab,query,category,condition,priorityFilter,sort]);

  const selected=selectedId?entries.find(entry=>entry.id===selectedId)||null:null;
  const editing=editingId?entries.find(entry=>entry.id===editingId)||null:null;
  const planning=planningId?entries.find(entry=>entry.id===planningId)||null:null;
  const purchasing=purchasingId?entries.find(entry=>entry.id===purchasingId)||null:null;

  function updateRelation(id:string,next:UserProductRelationship){
    setRelations(current=>{
      const value={...current,[id]:next};
      saveRelations(value);
      return value;
    });
  }
  function updateMeta(id:string,next:WishlistMeta){
    setMeta(current=>{
      const value={...current,[id]:next};
      saveMeta(value);
      return value;
    });
  }
  function archiveEntry(entry:WishlistEntry,reason:ArchiveReason='removed'){
    const nextMeta=stampEvent({...entry.meta,archived:true,archiveReason:reason,alerts:emptyAlerts()},reason==='purchased'?'Marked purchased':'Archived from wishlist');
    updateMeta(entry.id,nextMeta);
    updateRelation(entry.id,{...entry.relation,wishlisted:false,tracked:false});
    setTab('Archive');
  }
  function restoreEntry(entry:WishlistEntry){
    const nextMeta=stampEvent({...entry.meta,archived:false,archiveReason:undefined,purchasedAt:undefined,purchasePrice:undefined},'Restored to wishlist');
    updateMeta(entry.id,nextMeta);
    updateRelation(entry.id,{...entry.relation,wishlisted:true,grail:nextMeta.priority==='Grail',tracked:Object.values(nextMeta.alerts).some(Boolean)});
    setTab('Items');
  }

  if(!hydrated||!workspace.ready){
    return <div className="vxw-page">
      <section className="vxw-hero"><div><span>04 — WISHLIST</span><h1>Wishlist</h1><p>Your acquisition command center.</p></div></section>
      <div className="vxw-loading"><i/><i/><i/><i/><span>Loading wishlist intelligence…</span></div>
    </div>;
  }

  return <div className="vxw-page">
    <section className="vxw-hero">
      <div><span>04 — WISHLIST</span><h1>Wishlist</h1><p>Plan what you want, what it costs, and what buying it changes.</p></div>
      <aside><span>PURCHASE COMMAND CENTER</span><q>VEXUM informs the decision. You make it.</q></aside>
    </section>

    <div className="vxw-tabs">
      {(['Overview','Items','Opportunities','Grails','Preorders','Planned','Archive'] as MainTab[]).map(name=>
        <button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>
          {name}<small>{name==='Items'?activeEntries.length:name==='Opportunities'?opportunities.length:name==='Grails'?grails.length:name==='Preorders'?preorders.length:name==='Planned'?planned.length:name==='Archive'?archivedEntries.length:''}</small>
        </button>
      )}
    </div>

    <div className="vxw-stats">
      <StatCard label="Active Wishlist" value={String(activeEntries.length)} note="Canonical + saved items" icon={<Star/>}/>
      <StatCard label="At / Under Target" value={String(opportunities.length)} note="Based on labeled market sources" icon={<Target/>}/>
      <StatCard label="Grails" value={String(grails.length)} note="Priority = Grail" icon={<Star/>}/>
      <StatCard label="Planned / Preorders" value={String(planned.length+preorders.length)} note="Known purchase commitments" icon={<CalendarDays/>}/>
      <StatCard label="Potential Savings" value={money(potentialSavings)} note="Target minus current, when known" icon={<CircleDollarSign/>}/>
    </div>

    <div className="vxw-provider-note">
      <AlertTriangle/><div><strong>Provider transparency</strong><span>Live retailer and local inventory feeds are not connected in Wishlist Phase 1. Demo market data and saved valuations are labeled; VEXUM does not invent stock, sale, or availability data.</span></div>
    </div>

    <section className="vxw-command">
      <div className="vxw-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search wishlist items…"/>{query?<button onClick={()=>setQuery('')}><X/></button>:null}</div>
      <select value={sort} onChange={event=>setSort(event.target.value)} aria-label="Sort wishlist">
        <option value="priority">Sort: Priority</option>
        <option value="name">Sort: Name</option>
        <option value="market">Sort: Market value</option>
        <option value="target">Sort: Target price</option>
        <option value="deadline">Sort: Deadline</option>
      </select>
      <button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(value=>!value)}><Filter/>Filters</button>
      <div className="vxw-view-toggle"><button className={view==='table'?'active':''} onClick={()=>setView('table')} title="Table view"><List/></button><button className={view==='grid'?'active':''} onClick={()=>setView('grid')} title="Grid view"><Grid2X2/></button></div>
    </section>

    {filtersOpen?<section className="vxw-filters">
      <label>Category<select value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Condition<select value={condition} onChange={event=>setCondition(event.target.value)}><option>All</option><option>Any</option><option>Sealed</option><option>Opened Complete</option><option>Opened Incomplete</option><option>Loose</option><option>Used Excellent</option></select></label>
      <div className="vxw-priority-filter"><span>Priority</span>{(['Low','Medium','High','Grail'] as Priority[]).map(value=><button key={value} className={priorityFilter.includes(value)?'active':''} onClick={()=>setPriorityFilter(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value])}>{value}</button>)}</div>
      <button className="vxw-clear-filter" onClick={()=>{setCategory('All');setCondition('All');setPriorityFilter([]);setQuery('')}}>Clear filters</button>
    </section>:null}

    {visible.length===0?<EmptyState tab={tab} filtered={Boolean(query||category!=='All'||condition!=='All'||priorityFilter.length)}/>:view==='table'?
      <WishlistTable entries={visible} onOpen={entry=>{setSelectedId(entry.id);setDetailTab('Overview')}} onEdit={entry=>setEditingId(entry.id)} onPlan={entry=>setPlanningId(entry.id)} onRestore={restoreEntry}/>:
      <WishlistGrid entries={visible} onOpen={entry=>{setSelectedId(entry.id);setDetailTab('Overview')}} onEdit={entry=>setEditingId(entry.id)} onPlan={entry=>setPlanningId(entry.id)} onRestore={restoreEntry}/>
    }

    {selected?<DetailDrawer entry={selected} tab={detailTab} setTab={setDetailTab} onClose={()=>setSelectedId(null)} onEdit={()=>setEditingId(selected.id)} onPlan={()=>setPlanningId(selected.id)} onPurchase={()=>setPurchasingId(selected.id)} onArchive={()=>archiveEntry(selected)} onRestore={()=>restoreEntry(selected)}/>:null}
    {editing?<EditModal entry={editing} onClose={()=>setEditingId(null)} onSave={(nextMeta,nextRelation)=>{updateMeta(editing.id,stampEvent(nextMeta,'Wishlist settings updated'));updateRelation(editing.id,nextRelation);setEditingId(null)}}/>:null}
    {planning?<PlanModal entry={planning} onClose={()=>setPlanningId(null)} onSave={(month,deadline,quantity)=>{const next=stampEvent({...planning.meta,plannedMonth:month||undefined,deadline:deadline||planning.meta.deadline,quantity},month?'Purchase planned for '+month:'Purchase plan updated');updateMeta(planning.id,next);setPlanningId(null);setTab('Planned')}}/>:null}
    {purchasing?<PurchaseModal entry={purchasing} busy={workspace.busy} onClose={()=>setPurchasingId(null)} onConfirm={(price,date,conditionValue,quantity)=>{const now=new Date().toISOString();const existing=purchasing.workspaceItem;let items:Item[];if(existing){
      items=workspace.data.items.map(item=>item.id===existing.id?{...item,status:'owned',purchasePrice:price,currentValue:purchasing.market||price,quantity,condition:conditionValue,purchaseDate:date,updatedAt:now}:item);
    }else{
      const product=purchasing.product;
      const newItem:Item={
        id:'wishlist-'+purchasing.productId.replace(/[^a-z0-9]+/gi,'-')+'-'+Date.now(),
        collectionId:'',
        name:purchasing.name,
        category:purchasing.category,
        status:'owned',
        purchasePrice:price,
        currentValue:purchasing.market||price,
        quantity,
        image:purchasing.imageUrl||'',
        condition:conditionValue,
        purchaseDate:date,
        location:'',
        notes:purchasing.meta.notes,
        customFields:{'Wishlist Product ID':purchasing.productId,'Wishlist Priority':purchasing.meta.priority},
        identity:product?{brand:product.brand,series:product.line,modelNumber:product.modelNumber,upc:product.upc,sku:product.sku,year:product.releaseYear}:undefined,
        createdAt:now,
        updatedAt:now
      };
      items=[...workspace.data.items,newItem];
    }
    workspace.update({...workspace.data,items});
    const nextMeta=stampEvent({...purchasing.meta,archived:true,archiveReason:'purchased',purchasedAt:now,purchasePrice:price,alerts:emptyAlerts()},'Purchased '+money(price)+' · '+quantity+' item'+(quantity===1?'':'s'));
    updateMeta(purchasing.id,nextMeta);
    updateRelation(purchasing.id,{...purchasing.relation,wishlisted:false,tracked:false,ownedQuantity:(purchasing.relation.ownedQuantity||0)+quantity});
    setPurchasingId(null);setSelectedId(null);setTab('Archive');
  }}/>:null}
  </div>;
}

function StatCard({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){
  return <div className="vxw-stat"><span>{icon}{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function MarketBadge({source}:{source:MarketSource}){
  return <span className={'vxw-source '+availabilityClass(source)}>{sourceLabel(source)}</span>;
}

function PriorityBadge({priority}:{priority:Priority}){
  return <span className={'vxw-priority '+priority.toLowerCase()}><Star/>{priority}</span>;
}

function ItemArt({entry}:{entry:WishlistEntry}){
  return <div className="vxw-art">{entry.imageUrl?<img src={entry.imageUrl} alt=""/>:<ShoppingBag/>}</div>;
}

function WishlistTable({entries,onOpen,onEdit,onPlan,onRestore}:{entries:WishlistEntry[];onOpen:(entry:WishlistEntry)=>void;onEdit:(entry:WishlistEntry)=>void;onPlan:(entry:WishlistEntry)=>void;onRestore:(entry:WishlistEntry)=>void}){
  return <section className="vxw-list-panel">
    <div className="vxw-table-head"><span>Item</span><span>Priority</span><span>Target</span><span>Market</span><span>Condition</span><span>Plan / Deadline</span><span>Data source</span><span/></div>
    {entries.map(entry=><button className="vxw-table-row" key={entry.id} onClick={()=>onOpen(entry)}>
      <span className="vxw-item-cell"><ItemArt entry={entry}/><span><strong>{entry.name}</strong><small>{entry.line} · {entry.category}</small>{entry.ownedQuantity>0?<em><AlertTriangle/>Already own {entry.ownedQuantity}</em>:null}</span></span>
      <PriorityBadge priority={entry.meta.priority}/>
      <b>{money(entry.meta.targetPrice)}</b>
      <span className="vxw-market-cell"><b>{money(entry.market)}</b><small>{entry.marketSource==='unavailable'?'No quote':entry.marketSource==='demo'?'Not live':'User-saved'}</small></span>
      <span>{entry.meta.desiredCondition}</span>
      <span className="vxw-plan-cell"><b>{entry.meta.plannedMonth||entry.meta.preorder?.chargeDate||'—'}</b><small>{entry.meta.deadline?'Deadline '+entry.meta.deadline:entry.meta.preorder?.enabled?'Preorder':'Not planned'}</small></span>
      <MarketBadge source={entry.marketSource}/>
      <span className="vxw-row-buttons" onClick={event=>event.stopPropagation()}>{entry.meta.archived?<button onClick={()=>onRestore(entry)}>Restore</button>:<><button onClick={()=>onPlan(entry)}><CalendarDays/></button><button onClick={()=>onEdit(entry)}><Pencil/></button></>}<ChevronRight/></span>
    </button>)}
  </section>;
}

function WishlistGrid({entries,onOpen,onEdit,onPlan,onRestore}:{entries:WishlistEntry[];onOpen:(entry:WishlistEntry)=>void;onEdit:(entry:WishlistEntry)=>void;onPlan:(entry:WishlistEntry)=>void;onRestore:(entry:WishlistEntry)=>void}){
  return <section className="vxw-grid">{entries.map(entry=><article className="vxw-card" key={entry.id} onClick={()=>onOpen(entry)}>
    <div className="vxw-card-top"><PriorityBadge priority={entry.meta.priority}/><MarketBadge source={entry.marketSource}/></div>
    <ItemArt entry={entry}/>
    <div className="vxw-card-copy"><span>{entry.category} · {entry.line}</span><h3>{entry.name}</h3>{entry.ownedQuantity>0?<small className="warning"><AlertTriangle/>Already own {entry.ownedQuantity}</small>:null}</div>
    <div className="vxw-card-values"><span><small>Target</small><b>{money(entry.meta.targetPrice)}</b></span><span><small>Market</small><b>{money(entry.market)}</b></span></div>
    <div className="vxw-card-footer" onClick={event=>event.stopPropagation()}>{entry.meta.archived?<button onClick={()=>onRestore(entry)}>Restore</button>:<><button onClick={()=>onPlan(entry)}><CalendarDays/>Plan</button><button onClick={()=>onEdit(entry)}><Pencil/>Edit</button></>}<button onClick={()=>onOpen(entry)}><Eye/>Open</button></div>
  </article>)}</section>;
}

function EmptyState({tab,filtered}:{tab:MainTab;filtered:boolean}){
  const text=filtered?'No wishlist items match the current filters.':tab==='Opportunities'?'Nothing is currently at or below a saved target price.':tab==='Grails'?'No items are marked Grail yet.':tab==='Preorders'?'No preorder commitments have been added yet.':tab==='Planned'?'No purchases are planned yet.':tab==='Archive'?'Purchased and removed wishlist items will appear here.':'Your wishlist is empty. Add products from Search to begin.';
  return <section className="vxw-empty"><Star/><strong>{filtered?'No matches':tab+' is empty'}</strong><p>{text}</p></section>;
}

function DetailDrawer({entry,tab,setTab,onClose,onEdit,onPlan,onPurchase,onArchive,onRestore}:{entry:WishlistEntry;tab:DetailTab;setTab:(tab:DetailTab)=>void;onClose:()=>void;onEdit:()=>void;onPlan:()=>void;onPurchase:()=>void;onArchive:()=>void;onRestore:()=>void}){
  const plannedAmount=(entry.meta.preorder?.enabled?(entry.meta.preorder.balance??entry.meta.preorder.price):entry.market??entry.meta.targetPrice);
  const grailGoal=entry.meta.grail;
  const grailPct=grailGoal?.goalAmount?Math.min(100,Math.round(((grailGoal.savedAmount||0)/grailGoal.goalAmount)*100)):0;
  return <div className="vxw-drawer-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)onClose()}}>
    <aside className="vxw-drawer">
      <header><div><span>WISHLIST ITEM</span><h2>{entry.name}</h2><p>{entry.line} · {entry.category}</p></div><button onClick={onClose}><X/></button></header>
      <div className="vxw-detail-summary"><ItemArt entry={entry}/><div><PriorityBadge priority={entry.meta.priority}/><strong>{money(entry.market)}</strong><MarketBadge source={entry.marketSource}/>{entry.ownedQuantity>0?<span className="vxw-duplicate"><AlertTriangle/>You already own {entry.ownedQuantity}. Buying this adds another copy.</span>:null}</div></div>
      <div className="vxw-detail-tabs">{(['Overview','Market','Availability','Planning','History'] as DetailTab[]).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name}</button>)}</div>
      <div className="vxw-detail-body">
        {tab==='Overview'?<div className="vxw-detail-stack">
          <InfoGrid rows={[
            ['Canonical product ID',entry.productId],
            ['Manufacturer',entry.manufacturer],
            ['Priority',entry.meta.priority],
            ['Quantity wanted',String(entry.meta.quantity)],
            ['Desired condition',entry.meta.desiredCondition],
            ['Deadline',entry.meta.deadline||'None'],
            ['Retailer preferences',entry.meta.retailers.length?entry.meta.retailers.join(', '):'None'],
            ['Alerts',Object.entries(entry.meta.alerts).filter(([,enabled])=>enabled).map(([key])=>ALERT_LABELS[key as AlertKey]).join(', ')||'None']
          ]}/>
          {entry.meta.notes?<section className="vxw-note"><span>Notes</span><p>{entry.meta.notes}</p></section>:null}
        </div>:null}
        {tab==='Market'?<div className="vxw-detail-stack">
          <section className={'vxw-provider-state '+availabilityClass(entry.marketSource)}><CircleDollarSign/><div><strong>{sourceLabel(entry.marketSource)}</strong><p>{entry.marketSource==='demo'?'This value is VEXUM demo data for interface testing. It is not a live market quote.':entry.marketSource==='saved'?'This is the value stored on your existing item. It is not a live external quote.':'No market provider is supplying a current value for this product.'}</p></div></section>
          <div className="vxw-market-cards"><span><small>Current</small><b>{money(entry.market)}</b></span><span><small>Target</small><b>{money(entry.meta.targetPrice)}</b></span><span><small>Maximum</small><b>{money(entry.meta.maxPrice)}</b></span><span><small>MSRP</small><b>{money(entry.msrp)}</b></span></div>
          <p className="vxw-neutral">{typeof entry.market==='number'&&typeof entry.meta.targetPrice==='number'?(entry.market<=entry.meta.targetPrice?'Current labeled value is '+money(entry.meta.targetPrice-entry.market)+' below your target.':'Current labeled value is '+money(entry.market-entry.meta.targetPrice)+' above your target.'):'Set a target price and connect market data later to enable price-gap analysis.'}</p>
        </div>:null}
        {tab==='Availability'?<div className="vxw-detail-stack">
          <section className="vxw-provider-state unavailable"><Store/><div><strong>Retail and local inventory provider unavailable</strong><p>Wishlist Phase 1 stores your retailer preferences and alert rules, but does not fabricate stock status.</p></div></section>
          <InfoGrid rows={[
            ['Preferred retailers',entry.meta.retailers.length?entry.meta.retailers.join(', '):'None'],
            ['Desired condition',entry.meta.desiredCondition],
            ['Local alerts',entry.meta.alerts.local?'Enabled':'Off'],
            ['Restock alerts',entry.meta.alerts.restock?'Enabled':'Off'],
            ['Marketplace alerts',entry.meta.alerts.marketplace?'Enabled':'Off']
          ]}/>
        </div>:null}
        {tab==='Planning'?<div className="vxw-detail-stack">
          <section className="vxw-intelligence"><WalletCards/><div><span>PURCHASE INTELLIGENCE</span><strong>{plannedAmount?money(plannedAmount*entry.meta.quantity):'Amount not set'}</strong><p>{plannedAmount?'Known planned amount for '+entry.meta.quantity+' item'+(entry.meta.quantity===1?'':'s')+'.':'Set a target, market value, or preorder balance to calculate the known purchase amount.'}</p></div></section>
          <div className="vxw-neutral-grid"><span><small>Planned month</small><b>{entry.meta.plannedMonth||'Not planned'}</b></span><span><small>Maximum exposure</small><b>{entry.meta.maxPrice?money(entry.meta.maxPrice*entry.meta.quantity):'Not set'}</b></span><span><small>Financial budget impact</small><b>Unavailable</b><em>Financial data is not connected to Wishlist Phase 1.</em></span></div>
          {entry.meta.priority==='Grail'?<section className="vxw-goal-block"><header><div><Star/><strong>Grail savings goal</strong></div><b>{grailPct}%</b></header><div className="vxw-progress"><i style={{width:String(grailPct)+'%'}}/></div><p>{money(grailGoal?.savedAmount)} saved of {money(grailGoal?.goalAmount)} · {grailGoal?.status||'Saving'}{grailGoal?.deadline?' · '+grailGoal.deadline:''}</p></section>:null}
          {entry.meta.preorder?.enabled?<section className="vxw-preorder-block"><header><PackageCheck/><strong>Preorder commitment</strong><span>{entry.meta.preorder.status}</span></header><InfoGrid rows={[
            ['Price',money(entry.meta.preorder.price)],
            ['Deposit',money(entry.meta.preorder.deposit)],
            ['Remaining balance',money(entry.meta.preorder.balance)],
            ['Charge date',entry.meta.preorder.chargeDate||'Unknown'],
            ['Release date',entry.meta.preorder.releaseDate||'Unknown']
          ]}/></section>:null}
          <button className="vxw-primary wide" onClick={onPlan}><CalendarDays/>Plan Purchase</button>
        </div>:null}
        {tab==='History'?<div className="vxw-history">{entry.meta.history.length?entry.meta.history.map((row,index)=><div key={row.at+index}><History/><span><strong>{row.event}</strong><small>{new Date(row.at).toLocaleString()}</small></span></div>):<div><History/><span><strong>Added to Wishlist</strong><small>History begins when Wishlist Phase 1 records a change.</small></span></div>}</div>:null}
      </div>
      <footer>{entry.meta.archived?<><button onClick={onRestore}>Restore to Wishlist</button><button className="vxw-primary" onClick={onClose}>Close</button></>:<><button onClick={onArchive}><Archive/>Archive</button><span/><button onClick={onEdit}><Pencil/>Edit</button><button onClick={onPlan}><CalendarDays/>Plan Purchase</button><button className="vxw-primary" onClick={onPurchase}><PackageCheck/>Mark Purchased</button></>}</footer>
    </aside>
  </div>;
}

function InfoGrid({rows}:{rows:Array<[string,string]>}){
  return <div className="vxw-info-grid">{rows.map(([label,value])=><span key={label}><small>{label}</small><b>{value}</b></span>)}</div>;
}

function EditModal({entry,onClose,onSave}:{entry:WishlistEntry;onClose:()=>void;onSave:(meta:WishlistMeta,relation:UserProductRelationship)=>void}){
  const [priority,setPriority]=useState<Priority>(entry.meta.priority);
  const [target,setTarget]=useState(entry.meta.targetPrice===undefined?'':String(entry.meta.targetPrice));
  const [max,setMax]=useState(entry.meta.maxPrice===undefined?'':String(entry.meta.maxPrice));
  const [desiredCondition,setDesiredCondition]=useState(entry.meta.desiredCondition);
  const [retailers,setRetailers]=useState(entry.meta.retailers.join(', '));
  const [quantity,setQuantity]=useState(entry.meta.quantity);
  const [deadline,setDeadline]=useState(entry.meta.deadline||'');
  const [plannedMonth,setPlannedMonth]=useState(entry.meta.plannedMonth||'');
  const [notes,setNotes]=useState(entry.meta.notes);
  const [alerts,setAlerts]=useState(entry.meta.alerts);
  const [grailGoal,setGrailGoal]=useState(entry.meta.grail?.goalAmount===undefined?'':String(entry.meta.grail.goalAmount));
  const [grailSaved,setGrailSaved]=useState(entry.meta.grail?.savedAmount===undefined?'':String(entry.meta.grail.savedAmount));
  const [grailDeadline,setGrailDeadline]=useState(entry.meta.grail?.deadline||'');
  const [grailStatus,setGrailStatus]=useState<GrailGoal['status']>(entry.meta.grail?.status||'Saving');
  const [preorderEnabled,setPreorderEnabled]=useState(Boolean(entry.meta.preorder?.enabled));
  const [preorderPrice,setPreorderPrice]=useState(entry.meta.preorder?.price===undefined?'':String(entry.meta.preorder.price));
  const [deposit,setDeposit]=useState(entry.meta.preorder?.deposit===undefined?'':String(entry.meta.preorder.deposit));
  const [balance,setBalance]=useState(entry.meta.preorder?.balance===undefined?'':String(entry.meta.preorder.balance));
  const [chargeDate,setChargeDate]=useState(entry.meta.preorder?.chargeDate||'');
  const [releaseDate,setReleaseDate]=useState(entry.meta.preorder?.releaseDate||'');
  const [preorderStatus,setPreorderStatus]=useState<PreorderPlan['status']>(entry.meta.preorder?.status||'Planned');

  function submit(){
    const targetPrice=num(target),maxPrice=num(max);
    const price=num(preorderPrice),depositValue=num(deposit),balanceValue=num(balance)??(price!==undefined?Math.max(0,price-(depositValue||0)):undefined);
    const nextMeta:WishlistMeta={
      ...entry.meta,
      priority,targetPrice,maxPrice,desiredCondition,
      retailers:retailers.split(',').map(value=>value.trim()).filter(Boolean),
      quantity:Math.max(1,quantity||1),
      deadline:deadline||undefined,
      plannedMonth:plannedMonth||undefined,
      notes,
      alerts,
      grail:priority==='Grail'?{goalAmount:num(grailGoal),savedAmount:num(grailSaved),deadline:grailDeadline||undefined,status:grailStatus}:undefined,
      preorder:preorderEnabled?{enabled:true,price,deposit:depositValue,balance:balanceValue,chargeDate:chargeDate||undefined,releaseDate:releaseDate||undefined,status:preorderStatus}:undefined
    };
    const tracked=Object.values(alerts).some(Boolean);
    onSave(nextMeta,{...entry.relation,wishlisted:!entry.meta.archived,grail:priority==='Grail',targetPrice,maxPrice,conditionRequirement:desiredCondition,tracked});
  }

  return <div className="vxw-modal-backdrop"><div className="vxw-modal vxw-edit-modal">
    <header><div><span>EDIT WISHLIST ITEM</span><h2>{entry.name}</h2><p>Product identity stays in Search. These fields describe how you want to acquire it.</p></div><button onClick={onClose}><X/></button></header>
    <div className="vxw-modal-scroll">
      <section className="vxw-form-section"><h3>Acquisition</h3><div className="vxw-form-grid">
        <label>Priority<select value={priority} onChange={event=>setPriority(event.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option><option>Grail</option></select></label>
        <label>Quantity<input type="number" min="1" value={quantity} onChange={event=>setQuantity(Math.max(1,Number(event.target.value)))}/></label>
        <label>Target price<input inputMode="decimal" value={target} onChange={event=>setTarget(event.target.value)} placeholder="Optional"/></label>
        <label>Maximum price<input inputMode="decimal" value={max} onChange={event=>setMax(event.target.value)} placeholder="Optional"/></label>
        <label>Desired condition<select value={desiredCondition} onChange={event=>setDesiredCondition(event.target.value)}><option>Any</option><option>Sealed</option><option>Opened Complete</option><option>Opened Incomplete</option><option>Loose</option><option>Used Excellent</option></select></label>
        <label>Deadline<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label>
        <label>Planned month<input type="month" value={plannedMonth} onChange={event=>setPlannedMonth(event.target.value)}/></label>
        <label>Retailers<input value={retailers} onChange={event=>setRetailers(event.target.value)} placeholder="BBTS, Target, eBay"/></label>
        <label className="wide">Notes<textarea value={notes} onChange={event=>setNotes(event.target.value)} rows={3} placeholder="Condition details, edition, seller preferences…"/></label>
      </div></section>
      <section className="vxw-form-section"><h3>Alerts</h3><div className="vxw-alert-grid">{(Object.keys(ALERT_LABELS) as AlertKey[]).map(key=><label key={key}><input type="checkbox" checked={alerts[key]} onChange={event=>setAlerts(current=>({...current,[key]:event.target.checked}))}/><span>{ALERT_LABELS[key]}</span></label>)}</div></section>
      {priority==='Grail'?<section className="vxw-form-section"><h3>Grail savings goal</h3><div className="vxw-form-grid"><label>Goal amount<input value={grailGoal} onChange={event=>setGrailGoal(event.target.value)}/></label><label>Saved amount<input value={grailSaved} onChange={event=>setGrailSaved(event.target.value)}/></label><label>Goal deadline<input type="date" value={grailDeadline} onChange={event=>setGrailDeadline(event.target.value)}/></label><label>Status<select value={grailStatus} onChange={event=>setGrailStatus(event.target.value as GrailGoal['status'])}><option>Saving</option><option>Paused</option><option>Funded</option></select></label></div></section>:null}
      <section className="vxw-form-section"><div className="vxw-section-toggle"><h3>Preorder commitment</h3><label><input type="checkbox" checked={preorderEnabled} onChange={event=>setPreorderEnabled(event.target.checked)}/><span>{preorderEnabled?'Enabled':'Off'}</span></label></div>{preorderEnabled?<div className="vxw-form-grid"><label>Preorder price<input value={preorderPrice} onChange={event=>setPreorderPrice(event.target.value)}/></label><label>Deposit<input value={deposit} onChange={event=>setDeposit(event.target.value)}/></label><label>Remaining balance<input value={balance} onChange={event=>setBalance(event.target.value)} placeholder="Auto if blank"/></label><label>Status<select value={preorderStatus} onChange={event=>setPreorderStatus(event.target.value as PreorderPlan['status'])}><option>Planned</option><option>Preordered</option><option>Charging Soon</option><option>Released</option><option>Cancelled</option></select></label><label>Charge date<input type="date" value={chargeDate} onChange={event=>setChargeDate(event.target.value)}/></label><label>Release date<input type="date" value={releaseDate} onChange={event=>setReleaseDate(event.target.value)}/></label></div>:null}</section>
    </div>
    <footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={submit}><Check/>Save Changes</button></footer>
  </div></div>;
}

function PlanModal({entry,onClose,onSave}:{entry:WishlistEntry;onClose:()=>void;onSave:(month:string,deadline:string,quantity:number)=>void}){
  const [month,setMonth]=useState(entry.meta.plannedMonth||currentMonth());
  const [deadline,setDeadline]=useState(entry.meta.deadline||'');
  const [quantity,setQuantity]=useState(entry.meta.quantity);
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>PLAN PURCHASE</span><h2>{entry.name}</h2><p>This plans timing only. It does not tell you whether to buy.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll"><div className="vxw-form-grid"><label>Planned month<input type="month" value={month} onChange={event=>setMonth(event.target.value)}/></label><label>Quantity<input type="number" min="1" value={quantity} onChange={event=>setQuantity(Math.max(1,Number(event.target.value)))}/></label><label className="wide">Deadline<input type="date" value={deadline} onChange={event=>setDeadline(event.target.value)}/></label></div><section className="vxw-provider-state unavailable compact"><WalletCards/><div><strong>Financial impact unavailable</strong><p>Wishlist Phase 1 preserves the plan without inventing a budget balance.</p></div></section></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={()=>onSave(month,deadline,quantity)}><CalendarDays/>Save Plan</button></footer></div></div>;
}

function PurchaseModal({entry,busy,onClose,onConfirm}:{entry:WishlistEntry;busy:boolean;onClose:()=>void;onConfirm:(price:number,date:string,condition:string,quantity:number)=>void}){
  const [price,setPrice]=useState(String(entry.meta.preorder?.price??entry.market??entry.meta.targetPrice??0));
  const [date,setDate]=useState(today());
  const [condition,setCondition]=useState(entry.meta.desiredCondition==='Any'?'Opened Complete':entry.meta.desiredCondition);
  const [quantity,setQuantity]=useState(entry.meta.quantity);
  const priceValue=Math.max(0,Number(price)||0);
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>MARK PURCHASED</span><h2>{entry.name}</h2><p>This converts the wishlist item into an owned Portfolio item and stops its wishlist alerts.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll">{entry.ownedQuantity>0?<div className="vxw-purchase-warning"><AlertTriangle/><span>You already own {entry.ownedQuantity}. Confirming adds another owned copy.</span></div>:null}<div className="vxw-form-grid"><label>Price paid<input inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)}/></label><label>Quantity<input type="number" min="1" value={quantity} onChange={event=>setQuantity(Math.max(1,Number(event.target.value)))}/></label><label>Purchase date<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label>Condition<select value={condition} onChange={event=>setCondition(event.target.value)}><option>Sealed</option><option>Opened Complete</option><option>Opened Incomplete</option><option>Loose</option><option>Used Excellent</option></select></label></div></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" disabled={busy} onClick={()=>onConfirm(priceValue,date,condition,quantity)}><PackageCheck/>{busy?'Saving…':'Mark Purchased'}</button></footer></div></div>;
}

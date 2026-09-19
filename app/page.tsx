'use client';

import {useState} from 'react';
import {
  Bell,ChevronLeft,ChevronRight,Cloud,Heart,LineChart,Package,Pencil,Plus,Search,Settings,
  SlidersHorizontal,TrendingDown,TrendingUp,Wallet,X
} from 'lucide-react';
import {Collection,Item,LibraryGroup,Store,money,libraryTypeGroupKey,libraryLineGroupKey} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import CloudPanel from './CloudPanel';
import ItemDetail from './ItemDetail';
import ValueChart from './ValueChart';

const RED='#ff1f2d';
type MainView='portfolio'|'collections'|'watchlist'|'gains'|'budget';
type Trail={type?:string;line?:string;collection?:string};

function typeEntries(data:Store){
  return Object.entries(data.libraryGroups||{}).filter(([k])=>k.startsWith('type::')).map(([k,g])=>({id:k.slice(6),group:g}));
}
function lineEntries(data:Store,type:string){
  const prefix=`line::${type}::`;
  return Object.entries(data.libraryGroups||{}).filter(([k])=>k.startsWith(prefix)).map(([k,g])=>({id:k.slice(prefix.length),group:g}));
}
function groupName(data:Store,level:'type'|'line',type:string,line=''){
  const key=level==='type'?libraryTypeGroupKey(type):libraryLineGroupKey(type,line);
  return data.libraryGroups?.[key]?.name||'Untitled';
}
function itemsForCollections(data:Store,collections:Collection[]){
  const ids=new Set(collections.map(c=>c.id));
  return data.items.filter(i=>ids.has(i.collectionId));
}
function owned(items:Item[]){return items.filter(i=>i.status==='owned')}
function totalValue(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.currentValue*i.quantity,0)}
function totalCost(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.purchasePrice*i.quantity,0)}
function uniqueOwned(items:Item[]){return new Set(owned(items).map(i=>i.identity?.collectorNumber||i.identity?.upc||i.id)).size}
function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}
function collectionImage(c:Collection){return c.coverLogo||c.coverImage||c.logo||''}
function groupImage(g?:LibraryGroup){return g?.coverLogo||g?.coverImage||''}
function releaseDate(c:Collection){return c.name.match(/\b(20\d{2})\b/)?.[1]||''}
function setTarget(collection:Collection,lineName:string){
  const custom=Number(collection.name.match(/\[(\d+)\s*cards?\]/i)?.[1]||0);
  if(custom>0)return custom;
  const s=`${collection.name} ${lineName}`.toLowerCase();
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*1|volume\s*1|jjk-1|ue03bt)/.test(s))return 106;
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*2|volume\s*2|jjk-2|uex02bt)/.test(s))return 90;
  return 0;
}
function pct(have:number,target:number){return target?Math.min(100,(have/target)*100):0}
function recentChange(i:Item){
  const points=(i.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return 0;
  return points.at(-1)!.value-points[Math.max(0,points.length-8)].value;
}

export default function Home(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [view,setView]=useState<MainView>('portfolio');
  const [trail,setTrail]=useState<Trail>({});
  const [detail,setDetail]=useState<Item|null>(null);
  const [query,setQuery]=useState('');
  const [cloudOpen,setCloudOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const [editingCollection,setEditingCollection]=useState<Collection|null>(null);
  const [editingGroup,setEditingGroup]=useState<{level:'type'|'line';type:string;line?:string}|null>(null);
  const prefs=data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false};
  const currentCollection=trail.collection?data.collections.find(c=>c.id===trail.collection):undefined;

  function update(next:Store){cloud.update(next)}
  function saveItem(item:Item){
    update({...data,items:data.items.some(i=>i.id===item.id)?data.items.map(i=>i.id===item.id?item:i):[item,...data.items]});
    setEditingItem(null);
    if(detail?.id===item.id)setDetail(item);
  }
  function removeItem(item:Item){
    if(!confirm(`Delete “${item.name}”?`))return;
    update({...data,items:data.items.filter(i=>i.id!==item.id)});
    setDetail(null);
  }
  function increment(item:Item){
    saveItem({...item,status:'owned',quantity:item.status==='owned'?item.quantity+1:1,updatedAt:new Date().toISOString()});
  }
  function toggleWatch(item:Item){
    const cf={...(item.customFields||{})};
    if(watched(item)) delete cf.__watchlist; else cf.__watchlist='true';
    saveItem({...item,customFields:cf,updatedAt:new Date().toISOString()});
  }
  function go(v:MainView){setView(v);setTrail({});setDetail(null);setQuery('')}
  function downloadBackup(){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='collector-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  }

  if(!ready)return <div className="cl-loading">Loading Collector…</div>;

  const chrome=<TopNav view={view} go={go} cloud={cloud.status} onCloud={()=>setCloudOpen(true)} onSettings={()=>setSettingsOpen(true)}/>;
  if(detail){
    const live=data.items.find(i=>i.id===detail.id)||detail;
    return <div className="cl-app" style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
      {chrome}
      <ItemDetail item={live} collection={data.collections.find(c=>c.id===live.collectionId)} close={()=>setDetail(null)} edit={()=>{setEditingItem(live);setDetail(null)}} remove={()=>removeItem(live)} save={saveItem}/>
      {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
      {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
      {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    </div>
  }

  return <div className={`cl-app density-${prefs.density} cards-${prefs.cardSize}`} style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
    {chrome}
    <main className="cl-main">
      {view==='portfolio'&&<Portfolio data={data} openItem={setDetail} goWatchlist={()=>go('watchlist')}/>} 
      {view==='collections'&&<CollectionsView data={data} trail={trail} setTrail={setTrail} query={query} setQuery={setQuery} openItem={setDetail} addItem={()=>setEditingItem(blankItem(currentCollection?.id||''))} editCollection={setEditingCollection} editGroup={setEditingGroup} createGroup={(level,type)=>setEditingGroup(level==='type'?{level:'type',type:crypto.randomUUID()}:{level:'line',type:type!,line:crypto.randomUUID()})} createCollection={(type,line)=>setEditingCollection({id:crypto.randomUUID(),name:'New Collection',icon:'Layers',color:RED,libraryType:type,libraryLine:line})} increment={increment}/>} 
      {view==='watchlist'&&<Watchlist data={data} openItem={setDetail} toggleWatch={toggleWatch}/>} 
      {view==='gains'&&<Gains data={data} openItem={setDetail}/>} 
      {view==='budget'&&<Budget data={data}/>} 
    </main>
    {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
    {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
    {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    {editingCollection&&<CollectionEditor collection={editingCollection} close={()=>setEditingCollection(null)} save={c=>{const exists=data.collections.some(x=>x.id===c.id);update({...data,collections:exists?data.collections.map(x=>x.id===c.id?c:x):[...data.collections,c]});setEditingCollection(null)}}/>}
    {editingGroup&&<GroupEditor target={editingGroup} data={data} close={()=>setEditingGroup(null)} save={(key,g)=>{update({...data,libraryGroups:{...(data.libraryGroups||{}),[key]:g}});setEditingGroup(null)}}/>}
  </div>
}

function TopNav({view,go,cloud,onCloud,onSettings}:{view:MainView;go:(v:MainView)=>void;cloud:string;onCloud:()=>void;onSettings:()=>void}){
  return <header className="cl-header">
    <div className="cl-nav-inner">
      <button className="cl-wordmark" onClick={()=>go('portfolio')} aria-label="Collector home">COLLECTR<span>COLLECT · TRACK · PROFIT</span></button>
      <nav className="cl-nav" aria-label="Main navigation">
        <button className={view==='collections'?'active':''} onClick={()=>go('collections')}>Collections</button>
        <button className={view==='portfolio'?'active':''} onClick={()=>go('portfolio')}>Portfolio</button>
        <button className={view==='watchlist'?'active':''} onClick={()=>go('watchlist')}>Watchlist</button>
        <button className={view==='gains'?'active':''} onClick={()=>go('gains')}>Gains</button>
        <button className={view==='budget'?'active':''} onClick={()=>go('budget')}>Budget</button>
      </nav>
      <div className="cl-header-actions">
        <button className="cl-global-search" onClick={()=>go('collections')} aria-label="Search collection"><Search size={13}/><span>Search</span></button>
        <button className="cl-sync" onClick={onCloud}><Cloud size={14}/><span>{cloud}</span></button>
        <b>USD</b>
        <button aria-label="Notifications"><Bell size={17}/></button>
        <button aria-label="Customize Collector" onClick={onSettings}><Settings size={17}/></button>
      </div>
    </div>
  </header>
}

function Portfolio({data,openItem,goWatchlist}:{data:Store;openItem:(i:Item)=>void;goWatchlist:()=>void}){
  const [tab,setTab]=useState<'overview'|'products'|'performance'>('overview');
  const value=totalValue(data.items),cost=totalCost(data.items),watch=data.items.filter(watched).slice(0,5);
  const top=[...owned(data.items)].sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).slice(0,5);
  const breakdown=typeEntries(data).map(t=>{const cols=data.collections.filter(c=>c.libraryType===t.id),items=itemsForCollections(data,cols);return {name:t.group.name||'Untitled',value:totalValue(items),count:owned(items).reduce((n,i)=>n+i.quantity,0)}}).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const sum=Math.max(1,breakdown.reduce((n,x)=>n+x.value,0));
  return <div className="cl-content cl-portfolio">
    <div className="cl-pill-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}>Products</button><button className={tab==='performance'?'active':''} onClick={()=>setTab('performance')}>Performance</button></div>
    {tab==='overview'&&<div className="cl-portfolio-grid">
      <div className="cl-portfolio-left">
        <section className="cl-card cl-portfolio-chart"><ValueChart data={data} collectionId="all" value={value} cost={cost}/></section>
        <section className="cl-card cl-watch-preview"><div className="cl-card-title"><h2>Your Watchlist</h2><button onClick={goWatchlist}>View All</button></div><div className="cl-watch-cards">{watch.map(i=><button key={i.id} onClick={()=>openItem(i)} className="cl-watch-card"><div className="cl-watch-img"><img src={i.image||'/art/empty.svg'} alt=""/></div><b>{i.name}</b><small>{i.identity?.series||i.category}</small><strong>{money(i.currentValue)}</strong><span className={recentChange(i)>=0?'gain':'loss'}>{recentChange(i)>=0?'+':''}{money(recentChange(i))}</span></button>)}{!watch.length&&<div className="cl-empty-inline">Watch an item to track it here.</div>}</div></section>
      </div>
      <div className="cl-portfolio-rail">
        <section className="cl-card"><div className="cl-card-title"><h2>Holdings Breakdown</h2></div><div className="cl-holdings">{breakdown.slice(0,7).map(x=><div key={x.name}><div><span>{x.name} <small>({Math.round(x.value/sum*100)}%)</small></span><b>{x.count}</b></div><i><em style={{width:`${Math.max(3,x.value/sum*100)}%`}}/></i></div>)}</div></section>
        <section className="cl-card"><div className="cl-card-title"><h2>Most Valuable</h2><button>View All</button></div><div className="cl-most-list">{top.map(i=><button key={i.id} onClick={()=>openItem(i)}><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span><strong>{money(i.currentValue*i.quantity)}</strong></button>)}</div></section>
      </div>
    </div>}
    {tab==='products'&&<AllProducts data={data} openItem={openItem}/>} 
    {tab==='performance'&&<Performance data={data}/>} 
  </div>
}

function AllProducts({data,openItem}:{data:Store;openItem:(i:Item)=>void}){
  const [q,setQ]=useState('');
  const items=owned(data.items).filter(i=>`${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(q.toLowerCase()));
  return <section className="cl-product-page"><div className="cl-search-panel"><h2>Find a Product</h2><div><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search any product..."/></div></div><div className="cl-product-grid">{items.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>{}} hideAdd/>)}</div></section>
}

function Performance({data}:{data:Store}){
  const rows=owned(data.items).map(i=>({...i,gain:(i.currentValue-i.purchasePrice)*i.quantity})).sort((a,b)=>b.gain-a.gain).slice(0,12);
  return <div className="cl-card cl-performance"><div className="cl-card-title"><h2>Performance</h2></div>{rows.map(i=><div className="cl-performance-row" key={i.id}><span>{i.name}</span><b className={i.gain>=0?'gain':'loss'}>{i.gain>=0?'+':''}{money(i.gain)}</b></div>)}</div>
}

function CollectionsView({data,trail,setTrail,query,setQuery,openItem,addItem,editCollection,editGroup,createGroup,createCollection,increment}:{data:Store;trail:Trail;setTrail:(t:Trail)=>void;query:string;setQuery:(s:string)=>void;openItem:(i:Item)=>void;addItem:()=>void;editCollection:(c:Collection)=>void;editGroup:(g:{level:'type'|'line';type:string;line?:string})=>void;createGroup:(level:'type'|'line',type?:string)=>void;createCollection:(type:string,line:string)=>void;increment:(i:Item)=>void}){
  const types=typeEntries(data);
  const lines=trail.type?lineEntries(data,trail.type):[];
  const collections=trail.type&&trail.line?data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===trail.line):[];
  const current=trail.collection?data.collections.find(c=>c.id===trail.collection):undefined;
  if(current)return <CollectionDetail data={data} collection={current} type={trail.type!} line={trail.line!} query={query} setQuery={setQuery} back={()=>setTrail({type:trail.type,line:trail.line})} openItem={openItem} edit={()=>editCollection(current)} addItem={addItem} increment={increment}/>;

  if(!trail.type){
    return <div className="cl-content cl-type-page">
      <div className="cl-type-toolbar"><div/><button className="cl-edit-btn" onClick={()=>createGroup('type')}><Plus size={14}/> New Collection Type</button></div>
      <div className="cl-type-grid">{types.map(t=>{const img=groupImage(t.group);return <article className="cl-type-tile" key={t.id}><button className="cl-type-open" onClick={()=>setTrail({type:t.id})}>{img?<img src={img} alt={t.group.name||''}/>:<span>{t.group.name||'Untitled'}</span>}</button><button className="cl-mini-edit" onClick={()=>editGroup({level:'type',type:t.id})}><Pencil size={12}/> Edit</button></article>})}</div>
    </div>
  }

  if(trail.type&&!trail.line){
    const typeName=groupName(data,'type',trail.type);
    return <div className="cl-content cl-set-browser">
      <div className="cl-browser-top"><button className="cl-back-square" onClick={()=>setTrail({})}><ChevronLeft size={18}/></button><h1>{typeName} Lines</h1><div className="cl-browser-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by line..."/></div></div>
      <div className="cl-browser-controls"><button className="cl-edit-btn" onClick={()=>editGroup({level:'type',type:trail.type!})}><Pencil size={13}/> Edit {typeName}</button><button className="cl-edit-btn" onClick={()=>createGroup('line',trail.type)}><Plus size={13}/> New Line</button></div>
      <div className="cl-line-grid">{lines.filter(l=>(l.group.name||'').toLowerCase().includes(query.toLowerCase())).map(l=>{const cols=data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===l.id),items=itemsForCollections(data,cols),img=groupImage(l.group);return <article className="cl-line-tile" key={l.id}><button className="cl-line-open" onClick={()=>{setQuery('');setTrail({type:trail.type,line:l.id})}}><div className="cl-line-art">{img?<img src={img} alt=""/>:<span>{l.group.name||'Line'}</span>}</div><h2>{l.group.name||'Untitled Line'}</h2><p>{cols.length} collections</p><p>Total value: {money(totalValue(items))}</p></button><button className="cl-mini-edit" onClick={()=>editGroup({level:'line',type:trail.type!,line:l.id})}><Pencil size={12}/> Edit</button></article>})}</div>
    </div>
  }

  const typeName=groupName(data,'type',trail.type!);
  const lineName=groupName(data,'line',trail.type!,trail.line!);
  return <div className="cl-content cl-set-browser">
    <div className="cl-browser-top"><button className="cl-back-square" onClick={()=>setTrail({type:trail.type})}><ChevronLeft size={18}/></button><h1>{lineName} Collections</h1><div className="cl-browser-search"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search collections..."/></div></div>
    <div className="cl-browser-controls"><button className="cl-edit-btn" onClick={()=>editGroup({level:'line',type:trail.type!,line:trail.line})}><Pencil size={13}/> Edit {lineName}</button><button className="cl-edit-btn" onClick={()=>createCollection(trail.type!,trail.line!)}><Plus size={13}/> New Collection</button></div>
    <div className="cl-line-grid">{collections.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).map(c=>{const items=data.items.filter(i=>i.collectionId===c.id),target=setTarget(c,lineName),have=uniqueOwned(items),percent=pct(have,target),img=collectionImage(c);return <article className="cl-line-tile" key={c.id}><button className="cl-line-open" onClick={()=>{setQuery('');setTrail({type:trail.type,line:trail.line,collection:c.id})}}><div className="cl-line-art">{img?<img src={img} alt=""/>:<span>{c.name}</span>}<small className="cl-date-badge">{releaseDate(c)||'Collection'}</small>{target>0&&<i className="cl-image-progress"><em style={{width:`${percent}%`}}/></i>}</div><h2>{c.name}</h2><p>{target?`Progress: ${have} / ${target}`:`Items: ${owned(items).reduce((n,i)=>n+i.quantity,0)}`}</p><p>Total value: {money(totalValue(items))}</p></button><button className="cl-mini-edit" onClick={()=>editCollection(c)}><Pencil size={12}/> Edit</button></article>})}</div>
    <div className="cl-browser-footnote">{typeName} → {lineName}</div>
  </div>
}

function CollectionDetail({data,collection,type,line,query,setQuery,back,openItem,edit,addItem,increment}:{data:Store;collection:Collection;type:string;line:string;query:string;setQuery:(s:string)=>void;back:()=>void;openItem:(i:Item)=>void;edit:()=>void;addItem:()=>void;increment:(i:Item)=>void}){
  const [tab,setTab]=useState<'overview'|'products'|'performance'>('overview');
  const [sort,setSort]=useState<'best'|'name'|'value'>('best');
  const items=data.items.filter(i=>i.collectionId===collection.id);
  const shown=items.filter(i=>`${i.name} ${i.identity?.series||''} ${i.identity?.collectorNumber||''} ${i.identity?.upc||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='value'?b.currentValue-a.currentValue:b.updatedAt.localeCompare(a.updatedAt));
  const lineName=groupName(data,'line',type,line),typeName=groupName(data,'type',type);
  const have=uniqueOwned(items),target=setTarget(collection,lineName),percent=pct(have,target),value=totalValue(items),cost=totalCost(items),img=collectionImage(collection);

  return <div className="cl-content cl-collection-page">
    <div className="cl-breadcrumbs"><button onClick={back}>Collections</button><ChevronRight size={12}/><span>{typeName}</span><ChevronRight size={12}/><span>{lineName}</span><ChevronRight size={12}/><b>{collection.name}</b></div>
    <div className="cl-pill-tabs cl-collection-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}>Products</button><button className={tab==='performance'?'active':''} onClick={()=>setTab('performance')}>Performance</button></div>

    {tab==='overview'&&<section className="cl-card cl-collection-chart"><ValueChart data={data} collectionId={collection.id} value={value} cost={cost}/></section>}
    {tab==='performance'&&<section className="cl-card cl-collection-chart"><ValueChart data={data} collectionId={collection.id} value={value} cost={cost}/></section>}

    {tab!=='performance'&&<>
      <section className="cl-search-panel cl-collection-search"><h2>Find a Product in {collection.name}</h2><div className="cl-search-row"><label><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search any product..."/></label><button>Search</button><button className="cl-clear" onClick={()=>setQuery('')}>Clear</button></div></section>
      <div className="cl-edit-strip"><div><button onClick={edit}><Pencil size={13}/> Edit Collection</button><button onClick={addItem}><Plus size={13}/> Add Item</button></div><div><button><SlidersHorizontal size={13}/> Filters</button><select value={sort} onChange={e=>setSort(e.target.value as any)}><option value="best">Sort by: Best Match</option><option value="value">Sort by: Value</option><option value="name">Sort by: Name</option></select></div></div>
      <section className="cl-collection-summary"><div className="cl-summary-art">{img?<img src={img} alt=""/>:<Package size={36}/>}</div><div className="cl-summary-copy"><h2>{collection.name}</h2><p>{target?`Progress: ${have} / ${target}`:`Items owned: ${owned(items).reduce((n,i)=>n+i.quantity,0)}`}</p><p>Total Value: {money(value)}</p>{target>0&&<><div className="cl-summary-progress"><i style={{width:`${percent}%`}}/></div><small>{percent.toFixed(1)}% complete</small></>}</div></section>
      <div className="cl-product-grid">{shown.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div>
      {!shown.length&&<div className="cl-empty"><Package size={32}/><h3>No products found</h3><p>Add an item or clear your search.</p></div>}
    </>}
  </div>
}

function ProductCard({item,open,add,hideAdd=false}:{item:Item;open:()=>void;add:()=>void;hideAdd?:boolean}){
  const change=recentChange(item);
  return <article className="cl-product-card"><button className="cl-product-open" onClick={open}><div className="cl-product-image"><img src={item.image||'/art/empty.svg'} alt={item.name}/>{watched(item)&&<Heart className="cl-watch-heart" size={14} fill="currentColor"/>}</div><div className="cl-product-copy"><h3>{item.name}</h3><a>{item.identity?.series||item.category||'Collectible'}</a><strong>{money(item.currentValue)}</strong><small className={change>=0?'gain':'loss'}>{change>=0?'+':''}{money(change)} {change===0?'(0.00%)':''}</small><span>Qty: {item.status==='owned'?item.quantity:0}</span></div></button>{!hideAdd&&<button className="cl-plus" onClick={e=>{e.stopPropagation();add()}} aria-label={`Add one ${item.name}`}><Plus size={18}/></button>}</article>
}

function Watchlist({data,openItem,toggleWatch}:{data:Store;openItem:(i:Item)=>void;toggleWatch:(i:Item)=>void}){
  const [q,setQ]=useState('');
  const items=data.items.filter(watched).filter(i=>`${i.name} ${i.identity?.series||''}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>b.currentValue-a.currentValue);
  return <div className="cl-content cl-watchlist-page"><div className="cl-pill-tabs"><button className="active">Watchlist</button></div><section className="cl-search-panel"><h2>Track Watched Products</h2><div className="cl-search-row"><label><Search size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search your watchlist..."/></label><button>Search</button><button className="cl-clear" onClick={()=>setQ('')}>Clear</button></div></section><div className="cl-watch-table"><div className="cl-watch-head"><span>Product</span><span>Current Price</span><span>Recent Change</span><span>Quantity</span><span/></div>{items.map(i=>{const ch=recentChange(i);return <div className="cl-watch-row" key={i.id}><button className="cl-watch-name" onClick={()=>openItem(i)}><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span></button><strong>{money(i.currentValue)}</strong><b className={ch>=0?'gain':'loss'}>{ch>=0?'+':''}{money(ch)}</b><span>{i.status==='owned'?i.quantity:0}</span><button className="cl-unwatch" onClick={()=>toggleWatch(i)}>Unwatch</button></div>})}{!items.length&&<div className="cl-empty"><Heart size={30}/><h3>Your watchlist is empty</h3><p>Add items from any product page.</p></div>}</div></div>
}

function Gains({data,openItem}:{data:Store;openItem:(i:Item)=>void}){
  const rows=owned(data.items).map(i=>({...i,gain:(i.currentValue-i.purchasePrice)*i.quantity})).sort((a,b)=>b.gain-a.gain);
  return <div className="cl-content"><div className="cl-pill-tabs"><button className="active">Performance</button></div><section className="cl-card cl-table-card"><div className="cl-card-title"><h2>Gains & Losses</h2></div>{rows.map(i=><button className="cl-gain-row" key={i.id} onClick={()=>openItem(i)}><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>Paid {money(i.purchasePrice*i.quantity)} · Value {money(i.currentValue*i.quantity)}</small></span><strong className={i.gain>=0?'gain':'loss'}>{i.gain>=0?'+':''}{money(i.gain)}</strong></button>)}</section></div>
}

function Budget({data}:{data:Store}){
  const spent=totalCost(data.items),value=totalValue(data.items),difference=value-spent;
  return <div className="cl-content"><div className="cl-pill-tabs"><button className="active">Budget</button></div><div className="cl-budget-grid"><section className="cl-card"><Wallet/><small>Total paid</small><strong>{money(spent)}</strong></section><section className="cl-card"><LineChart/><small>Current value</small><strong>{money(value)}</strong></section><section className="cl-card">{difference>=0?<TrendingUp/>:<TrendingDown/>}<small>Unrealized gain / loss</small><strong className={difference>=0?'gain':'loss'}>{difference>=0?'+':''}{money(difference)}</strong></section></div></div>
}

function blankItem(collectionId:string):Item{
  const now=new Date().toISOString();
  return {id:crypto.randomUUID(),collectionId,name:'',category:'',status:'owned',purchasePrice:0,currentValue:0,quantity:1,image:'',condition:'Excellent / Like New',purchaseDate:'',location:'',notes:'',customFields:{},createdAt:now,updatedAt:now};
}

function ImageInput({value,onChange}:{value:string;onChange:(v:string)=>void}){
  return <div className="cl-image-input"><div className="cl-image-preview">{value?<img src={value} alt="Preview"/>:<Package size={24}/>}</div><div><input value={value.startsWith('data:')?'':value} onChange={e=>onChange(e.target.value)} placeholder="Image URL"/><label className="cl-file-btn">Upload image<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>onChange(String(r.result||''));r.readAsDataURL(f)}}/></label></div></div>
}

function ItemEditor({item,collections,close,save}:{item:Item;collections:Collection[];close:()=>void;save:(i:Item)=>void}){
  const [draft,setDraft]=useState(item);
  const setIdentity=(key:string,value:string)=>setDraft({...draft,identity:{...(draft.identity||{}),[key]:value}});
  return <div className="overlay"><form className="modal cl-editor-modal" onSubmit={e=>{e.preventDefault();save({...draft,updatedAt:new Date().toISOString()})}}><div className="modal-header"><div><small>{item.name?'EDIT PRODUCT':'ADD PRODUCT'}</small><h2>{item.name||'New Product'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.image} onChange={image=>setDraft({...draft,image})}/><div className="cl-form-grid"><label className="wide">Product name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Collection<select value={draft.collectionId} onChange={e=>setDraft({...draft,collectionId:e.target.value})}><option value="">No collection</option>{collections.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Item['status']})}><option value="owned">Owned</option><option value="wishlist">Wishlist</option><option value="sold">Sold</option></select></label><label>Category<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Condition<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label><label>Purchase price<input type="number" min="0" step="0.01" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)})}/></label><label>Current value<input type="number" min="0" step="0.01" value={draft.currentValue} onChange={e=>setDraft({...draft,currentValue:Number(e.target.value)})}/></label><label>Quantity<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value)||1)})}/></label><label>Purchase date<input type="date" value={draft.purchaseDate} onChange={e=>setDraft({...draft,purchaseDate:e.target.value})}/></label><label>Brand<input value={draft.identity?.brand||''} onChange={e=>setIdentity('brand',e.target.value)}/></label><label>Line / Series<input value={draft.identity?.series||''} onChange={e=>setIdentity('series',e.target.value)}/></label><label>Model / Number<input value={draft.identity?.modelNumber||draft.identity?.collectorNumber||''} onChange={e=>setIdentity('modelNumber',e.target.value)}/></label><label>UPC / Barcode<input value={draft.identity?.upc||''} onChange={e=>setIdentity('upc',e.target.value)}/></label><label>SKU<input value={draft.identity?.sku||''} onChange={e=>setIdentity('sku',e.target.value)}/></label><label>Edition / Variant<input value={draft.identity?.edition||''} onChange={e=>setIdentity('edition',e.target.value)}/></label><label>Year<input value={draft.identity?.year||''} onChange={e=>setIdentity('year',e.target.value)}/></label><label>Location<input value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></label><label className="wide">Description<textarea rows={3} value={draft.identity?.description||''} onChange={e=>setIdentity('description',e.target.value)}/></label><label className="wide">Notes<textarea rows={4} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save Product</button></div></form></div>
}

function CollectionEditor({collection,close,save}:{collection:Collection;close:()=>void;save:(c:Collection)=>void}){
  const [draft,setDraft]=useState(collection);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save(draft)}}><div className="modal-header"><div><small>COLLECTION</small><h2>Edit Collection</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.coverImage||draft.coverLogo||''} onChange={coverImage=>setDraft({...draft,coverImage,coverLogo:undefined})}/><div className="cl-form-grid"><label className="wide">Name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Highlight<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label></div><p className="cl-help">For a measurable collection, add a total with <b>[100 cards]</b> in the collection name. Jujutsu Kaisen Union Arena Vol. 1 and Vol. 2 are detected automatically.</p></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

function GroupEditor({target,data,close,save}:{target:{level:'type'|'line';type:string;line?:string};data:Store;close:()=>void;save:(key:string,g:LibraryGroup)=>void}){
  const key=target.level==='type'?libraryTypeGroupKey(target.type):libraryLineGroupKey(target.type,target.line||'');
  const [draft,setDraft]=useState<LibraryGroup>(data.libraryGroups?.[key]||{name:'',color:RED});
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save(key,draft)}}><div className="modal-header"><div><small>{target.level.toUpperCase()}</small><h2>{data.libraryGroups?.[key]?'Edit':'Create'} {target.level==='type'?'Collection Type':'Line'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.coverImage||draft.coverLogo||''} onChange={coverImage=>setDraft({...draft,coverImage,coverLogo:undefined})}/><div className="cl-form-grid"><label className="wide">Name<input required value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Highlight<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

function SettingsModal({data,close,save}:{data:Store;close:()=>void;save:(d:Store)=>void}){
  const prefs=data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false};
  const [accent,setAccent]=useState(prefs.accentColor||RED),[density,setDensity]=useState(prefs.density),[cardSize,setCardSize]=useState(prefs.cardSize),[reduced,setReduced]=useState(prefs.reducedMotion);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save({...data,preferences:{accentColor:accent,density,cardSize,reducedMotion:reduced}})}}><div className="modal-header"><div><small>CUSTOMIZE</small><h2>Appearance</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><div className="cl-form-grid"><label>Highlight color<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Density<select value={density} onChange={e=>setDensity(e.target.value as typeof density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Product card size<select value={cardSize} onChange={e=>setCardSize(e.target.value as typeof cardSize)}><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="cl-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

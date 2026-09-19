'use client';

import {useMemo,useState} from 'react';
import {
  Bell,Camera,ChevronLeft,ChevronRight,Cloud,Heart,Home as HomeIcon,Landmark,Library,
  Package,Pencil,PieChart,Plus,Search,Settings,SlidersHorizontal,Star,TrendingDown,
  TrendingUp,UserCircle,X
} from 'lucide-react';
import {Collection,Item,LibraryGroup,Store,money,libraryTypeGroupKey,libraryLineGroupKey} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import CloudPanel from './CloudPanel';
import ItemDetail from './ItemDetail';
import ValueChart from './ValueChart';

const RED='#ff1f2d';
type MainView='home'|'collections'|'portfolio'|'finance'|'profile';
type Trail={type?:string;line?:string;collection?:string};
type CollectionMeta=Collection&{targetCount?:number;releaseDate?:string};

type ScopeOption={id:string;label:string};

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
function collectionImage(c:Collection){return c.coverImage||c.coverLogo||c.logo||''}
function groupImage(g?:LibraryGroup){return g?.coverImage||g?.coverLogo||''}
function releaseDate(c:Collection,items:Item[]=[]){
  const meta=c as CollectionMeta;
  if(meta.releaseDate?.trim())return meta.releaseDate.trim();
  const keys=['Released Date','Release Date','Release date','Date Released','Set Release Date','Released'];
  for(const item of items){for(const key of keys){const v=item.customFields?.[key];if(v?.trim())return v.trim()}}
  const year=items.map(i=>i.identity?.year).find(Boolean);
  return c.name.match(/\b(20\d{2})\b/)?.[1]||year||'—';
}
function setTarget(collection:Collection,lineName:string,items:Item[]=[]){
  const meta=collection as CollectionMeta;
  if(Number(meta.targetCount)>0)return Number(meta.targetCount);
  const custom=Number(collection.name.match(/\[(\d+)\s*(?:cards?|items?)\]/i)?.[1]||0);
  if(custom>0)return custom;
  const totalKeys=['Set Total','Total Cards','Cards in Set','Checklist Total','Total in Set','Total Items'];
  for(const item of items){for(const key of totalKeys){const n=Number((item.customFields?.[key]||'').replace(/[^0-9]/g,''));if(n>0)return n}}
  const itemHints=items.map(i=>[i.identity?.setCode,i.identity?.series,i.identity?.description,i.identity?.collectorNumber].filter(Boolean).join(' ')).join(' ');
  const s=`${collection.name} ${lineName} ${itemHints}`.toLowerCase();
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*2|volume\s*2|jjk-2|uex02bt|uex02)/.test(s))return 90;
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*1|volume\s*1|jjk-1|ue03bt|ue03)/.test(s))return 106;
  return 0;
}
function pct(have:number,target:number){return target?Math.min(100,(have/target)*100):0}
function recentChange(i:Item){
  const points=(i.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return 0;
  return points.at(-1)!.value-points[Math.max(0,points.length-8)].value;
}
function monthKey(d=new Date()){return d.toISOString().slice(0,7)}
function itemSpend(item:Item){return item.purchasePrice*Math.max(1,item.quantity)}
function median(values:number[]){
  if(!values.length)return 0;
  const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function valueScore(item:Item){
  const compPrices=(item.comparables||[]).map(c=>c.price+c.shipping).filter(n=>Number.isFinite(n)&&n>0);
  const compMedian=median(compPrices);
  const discount=compMedian>0?(compMedian-item.currentValue)/compMedian:0;
  const momentum=item.currentValue>0?recentChange(item)/item.currentValue:0;
  return Math.round(Math.max(1,Math.min(99,50+discount*60+momentum*35)));
}

export default function Home(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [view,setView]=useState<MainView>('home');
  const [trail,setTrail]=useState<Trail>({});
  const [detail,setDetail]=useState<Item|null>(null);
  const [query,setQuery]=useState('');
  const [cloudOpen,setCloudOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const [editingCollection,setEditingCollection]=useState<Collection|null>(null);
  const [editingGroup,setEditingGroup]=useState<{level:'type'|'line';type:string;line?:string}|null>(null);
  const prefs=(data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false}) as NonNullable<Store['preferences']>&{monthlyCollectingBudget?:number};
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
    return <div className="cc-app" style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
      {chrome}
      <ItemDetail item={live} collection={data.collections.find(c=>c.id===live.collectionId)} close={()=>setDetail(null)} edit={()=>{setEditingItem(live);setDetail(null)}} remove={()=>removeItem(live)} save={saveItem}/>
      {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
      {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
      {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    </div>
  }

  return <div className={`cc-app density-${prefs.density} cards-${prefs.cardSize}`} style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
    {chrome}
    <main className="cc-main">
      {view==='home'&&<HomeDashboard data={data} openItem={setDetail}/>} 
      {view==='collections'&&<CollectionsView data={data} trail={trail} setTrail={setTrail} query={query} setQuery={setQuery} openItem={setDetail} addItem={()=>setEditingItem(blankItem(currentCollection?.id||''))} editCollection={setEditingCollection} editGroup={setEditingGroup} createGroup={(level,type)=>setEditingGroup(level==='type'?{level:'type',type:crypto.randomUUID()}:{level:'line',type:type!,line:crypto.randomUUID()})} createCollection={(type,line)=>setEditingCollection({id:crypto.randomUUID(),name:'New Collection',icon:'Layers',color:RED,libraryType:type,libraryLine:line})} increment={increment}/>} 
      {view==='portfolio'&&<PortfolioProducts data={data} openItem={setDetail} increment={increment}/>} 
      {view==='finance'&&<Finance data={data} update={update} openItem={setDetail}/>} 
      {view==='profile'&&<ProfilePage data={data} update={update} onCloud={()=>setCloudOpen(true)} onSettings={()=>setSettingsOpen(true)}/>} 
    </main>
    {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
    {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
    {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    {editingCollection&&<CollectionEditor collection={editingCollection} close={()=>setEditingCollection(null)} save={c=>{const exists=data.collections.some(x=>x.id===c.id);update({...data,collections:exists?data.collections.map(x=>x.id===c.id?c:x):[...data.collections,c]});setEditingCollection(null)}}/>}
    {editingGroup&&<GroupEditor target={editingGroup} data={data} close={()=>setEditingGroup(null)} save={(key,g)=>{update({...data,libraryGroups:{...(data.libraryGroups||{}),[key]:g}});setEditingGroup(null)}}/>}
  </div>
}

function TopNav({view,go,cloud,onCloud,onSettings}:{view:MainView;go:(v:MainView)=>void;cloud:string;onCloud:()=>void;onSettings:()=>void}){
  const tabs:[MainView,string,React.ReactNode][]=[
    ['home','Home',<HomeIcon key="h" size={21}/>],['collections','Collections',<Library key="c" size={21}/>],['portfolio','Portfolio',<PieChart key="p" size={21}/>],['finance','Finance',<Landmark key="f" size={21}/>],['profile','Profile',<UserCircle key="u" size={21}/>]
  ];
  return <header className="cc-header"><div className="cc-nav-inner">
    <button className="cc-wordmark" onClick={()=>go('home')} aria-label="Collector home">COLLECTOR<span>COLLECT · TRACK · VALUE</span></button>
    <nav className="cc-nav" aria-label="Main navigation">{tabs.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>go(id)}><span className="cc-nav-icon">{icon}</span><span>{label}</span></button>)}</nav>
    <div className="cc-header-actions"><button className="cc-sync" onClick={onCloud}><Cloud size={14}/><span>{cloud}</span></button><b>USD</b><button aria-label="Notifications"><Bell size={17}/></button><button aria-label="Customize Collector" onClick={onSettings}><Settings size={17}/></button></div>
  </div></header>
}

function HomeDashboard({data,openItem}:{data:Store;openItem:(i:Item)=>void}){
  const [scope,setScope]=useState('all');
  const options:ScopeOption[]=[{id:'all',label:'Collecting'},...data.collections.map(c=>({id:c.id,label:c.name}))];
  const scoped=scope==='all'?data.items:data.items.filter(i=>i.collectionId===scope);
  const value=totalValue(scoped),cost=totalCost(scoped);
  const top=[...owned(scoped)].sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).slice(0,5);
  return <div className="cc-content cc-home-page">
    <section className="cc-home-chart"><ValueChart data={data} collectionId={scope} value={value} cost={cost} scopeId={scope} scopeOptions={options} onScopeChange={setScope}/></section>
    <section className="cc-most-card"><div className="cc-section-head"><h2>Most Valuable</h2></div><div className="cc-most-list">{top.map(i=><button key={i.id} onClick={()=>openItem(i)}><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span><strong>{money(i.currentValue*i.quantity)}</strong></button>)}</div></section>
  </div>
}

function PortfolioProducts({data,openItem,increment}:{data:Store;openItem:(i:Item)=>void;increment:(i:Item)=>void}){
  const [q,setQ]=useState('');
  const [sort,setSort]=useState<'value'|'name'|'recent'>('value');
  const items=owned(data.items).filter(i=>`${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='recent'?b.updatedAt.localeCompare(a.updatedAt):b.currentValue*b.quantity-a.currentValue*a.quantity);
  return <div className="cc-content cc-portfolio-page">
    <CollectionSearch value={q} onChange={setQ}/>
    <section className="cc-portfolio-hero"><div><span>Portfolio: <b>Collecting</b></span><strong>{money(totalValue(data.items))}</strong><small>{owned(data.items).reduce((n,i)=>n+i.quantity,0)} items owned</small></div><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="value">Sort: Value</option><option value="recent">Sort: Recent</option><option value="name">Sort: Name</option></select></section>
    <div className="cc-product-grid">{items.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div>
  </div>
}

function CollectionSearch({value,onChange}:{value:string;onChange:(v:string)=>void}){
  return <div className="cc-collection-search"><button className="cc-camera" aria-label="Camera search"><Camera size={22}/></button><label><Search size={23}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search your collection"/>{value&&<button type="button" onClick={()=>onChange('')} aria-label="Clear search"><X size={22}/></button>}</label><button aria-label="Favorites"><Star size={22}/></button><button aria-label="Filters"><SlidersHorizontal size={22}/></button></div>
}

function CollectionsView({data,trail,setTrail,query,setQuery,openItem,addItem,editCollection,editGroup,createGroup,createCollection,increment}:{data:Store;trail:Trail;setTrail:(t:Trail)=>void;query:string;setQuery:(s:string)=>void;openItem:(i:Item)=>void;addItem:()=>void;editCollection:(c:Collection)=>void;editGroup:(g:{level:'type'|'line';type:string;line?:string})=>void;createGroup:(level:'type'|'line',type?:string)=>void;createCollection:(type:string,line:string)=>void;increment:(i:Item)=>void}){
  const types=typeEntries(data);
  const lines=trail.type?lineEntries(data,trail.type):[];
  const collections=trail.type&&trail.line?data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===trail.line):[];
  const current=trail.collection?data.collections.find(c=>c.id===trail.collection):undefined;
  if(current)return <CollectionDetail data={data} collection={current} type={trail.type!} line={trail.line!} query={query} setQuery={setQuery} back={()=>setTrail({type:trail.type,line:trail.line})} openItem={openItem} edit={()=>editCollection(current)} addItem={addItem} increment={increment}/>;

  if(!trail.type){
    const shown=types.filter(t=>(t.group.name||'').toLowerCase().includes(query.toLowerCase()));
    return <div className="cc-content cc-collections-page"><CollectionSearch value={query} onChange={setQuery}/><h1>Quick Filters</h1><div className="cc-type-toolbar"><button onClick={()=>createGroup('type')}><Plus size={15}/> New Collection Type</button></div><div className="cc-cover-grid">{shown.map(t=>{const img=groupImage(t.group);return <article className="cc-cover-tile" key={t.id}><button className="cc-cover" onClick={()=>{setQuery('');setTrail({type:t.id})}}>{img?<img src={img} alt={t.group.name||''}/>:<span>{t.group.name||'Untitled'}</span>}</button><div className="cc-cover-meta"><b>{t.group.name||'Untitled'}</b><button onClick={()=>editGroup({level:'type',type:t.id})}><Pencil size={12}/> Edit</button></div></article>})}</div></div>
  }

  if(trail.type&&!trail.line){
    const typeName=groupName(data,'type',trail.type);
    return <div className="cc-content cc-lines-page"><div className="cc-page-head"><button className="cc-back" onClick={()=>setTrail({})}><ChevronLeft/></button><h1>{typeName} Lines</h1></div><CollectionSearch value={query} onChange={setQuery}/><div className="cc-inline-actions"><button onClick={()=>editGroup({level:'type',type:trail.type!})}><Pencil size={13}/> Edit {typeName}</button><button onClick={()=>createGroup('line',trail.type)}><Plus size={13}/> New Line</button></div><div className="cc-cover-grid">{lines.filter(l=>(l.group.name||'').toLowerCase().includes(query.toLowerCase())).map(l=>{const cols=data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===l.id),items=itemsForCollections(data,cols),img=groupImage(l.group);return <article className="cc-cover-tile" key={l.id}><button className="cc-cover" onClick={()=>{setQuery('');setTrail({type:trail.type,line:l.id})}}>{img?<img src={img} alt=""/>:<span>{l.group.name||'Line'}</span>}</button><div className="cc-cover-copy"><h2>{l.group.name||'Untitled Line'}</h2><p>{cols.length} collections</p><p>Total value: {money(totalValue(items))}</p></div><button className="cc-mini-edit" onClick={()=>editGroup({level:'line',type:trail.type!,line:l.id})}><Pencil size={12}/> Edit</button></article>})}</div></div>
  }

  const lineName=groupName(data,'line',trail.type!,trail.line!);
  return <div className="cc-content cc-lines-page"><div className="cc-page-head"><button className="cc-back" onClick={()=>setTrail({type:trail.type})}><ChevronLeft/></button><h1>{lineName} Collections</h1></div><CollectionSearch value={query} onChange={setQuery}/><div className="cc-inline-actions"><button onClick={()=>editGroup({level:'line',type:trail.type!,line:trail.line})}><Pencil size={13}/> Edit {lineName}</button><button onClick={()=>createCollection(trail.type!,trail.line!)}><Plus size={13}/> New Collection</button></div><div className="cc-cover-grid">{collections.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).map(c=>{const items=data.items.filter(i=>i.collectionId===c.id),target=setTarget(c,lineName,items),have=uniqueOwned(items),percent=pct(have,target),img=collectionImage(c);return <article className="cc-cover-tile" key={c.id}><button className="cc-cover cc-collection-cover" onClick={()=>{setQuery('');setTrail({type:trail.type,line:trail.line,collection:c.id})}}>{img?<img src={img} alt=""/>:<span>{c.name}</span>}<small className="cc-date">{releaseDate(c,items)}</small>{target>0&&<i className="cc-cover-progress"><em style={{width:`${percent}%`}}/><span>{percent.toFixed(0)}%</span></i>}</button><div className="cc-cover-copy"><h2>{c.name}</h2><p>{target?`Progress: ${have} / ${target}`:`Items: ${owned(items).reduce((n,i)=>n+i.quantity,0)}`}</p><p>Total value: {money(totalValue(items))}</p></div><button className="cc-mini-edit" onClick={()=>editCollection(c)}><Pencil size={12}/> Edit</button></article>})}</div></div>
}

function CollectionDetail({data,collection,type,line,query,setQuery,back,openItem,edit,addItem,increment}:{data:Store;collection:Collection;type:string;line:string;query:string;setQuery:(s:string)=>void;back:()=>void;openItem:(i:Item)=>void;edit:()=>void;addItem:()=>void;increment:(i:Item)=>void}){
  const [tab,setTab]=useState<'overview'|'products'>('overview');
  const [sort,setSort]=useState<'best'|'name'|'value'>('best');
  const items=data.items.filter(i=>i.collectionId===collection.id);
  const shown=items.filter(i=>`${i.name} ${i.identity?.series||''} ${i.identity?.collectorNumber||''} ${i.identity?.upc||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='value'?b.currentValue-a.currentValue:b.updatedAt.localeCompare(a.updatedAt));
  const lineName=groupName(data,'line',type,line);
  const have=uniqueOwned(items),target=setTarget(collection,lineName,items),percent=pct(have,target),value=totalValue(items),cost=totalCost(items),img=collectionImage(collection),released=releaseDate(collection,items);
  return <div className="cc-content cc-collection-detail"><div className="cc-page-head"><button className="cc-back" onClick={back}><ChevronLeft/></button><h1>{collection.name}</h1></div><div className="cc-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}>Products</button></div>{tab==='overview'&&<section className="cc-collection-chart"><ValueChart data={data} collectionId={collection.id} value={value} cost={cost}/></section>}<CollectionSearch value={query} onChange={setQuery}/><div className="cc-inline-actions cc-detail-actions"><div><button onClick={edit}><Pencil size={13}/> Edit Collection</button><button onClick={addItem}><Plus size={13}/> Add Item</button></div><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="best">Sort: Best Match</option><option value="value">Sort: Value</option><option value="name">Sort: Name</option></select></div><section className="cc-summary"><div className="cc-summary-art">{img?<img src={img} alt=""/>:<Package size={34}/>}</div><div><h2>{collection.name}</h2><p>{target?`Progress: ${have} / ${target}`:`Items owned: ${owned(items).reduce((n,i)=>n+i.quantity,0)}`}</p><p>Total Value: {money(value)}</p><p>Released Date: {released}</p>{target>0&&<><i><em style={{width:`${percent}%`}}/></i><small>{percent.toFixed(1)}% complete</small></>}</div></section><div className="cc-product-grid">{shown.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div></div>
}

function ProductCard({item,open,add}:{item:Item;open:()=>void;add:()=>void}){
  const change=recentChange(item);
  return <article className="cc-product-card"><button className="cc-product-open" onClick={open}><div className="cc-product-image"><img src={item.image||'/art/empty.svg'} alt={item.name}/>{watched(item)&&<Heart className="cc-watch-heart" size={14} fill="currentColor"/>}</div><div className="cc-product-copy"><h3>{item.name}</h3><a>{item.identity?.series||item.category||'Collectible'}</a><strong>{money(item.currentValue)}</strong><small className={change>=0?'gain':'loss'}>{change>=0?'▲ ':'▼ '}{money(Math.abs(change))} {change===0?'(0.00%)':''}</small><span>Qty: {item.status==='owned'?item.quantity:0}</span></div></button><button className="cc-plus" onClick={e=>{e.stopPropagation();add()}} aria-label={`Add one ${item.name}`}><Plus size={19}/></button></article>
}

function Finance({data,update,openItem}:{data:Store;update:(d:Store)=>void;openItem:(i:Item)=>void}){
  const [month,setMonth]=useState(monthKey());
  const prefs=(data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false}) as NonNullable<Store['preferences']>&{monthlyCollectingBudget?:number};
  const budget=Number(prefs.monthlyCollectingBudget||0);
  const purchased=owned(data.items).filter(i=>i.purchaseDate?.startsWith(month));
  const spent=purchased.reduce((sum,i)=>sum+itemSpend(i),0);
  const remaining=Math.max(0,budget-spent),used=budget?Math.min(100,spent/budget*100):0;
  const wishlist=data.items.filter(i=>i.status==='wishlist').map(i=>({item:i,score:valueScore(i),fits:remaining>0&&i.currentValue<=remaining})).sort((a,b)=>(Number(b.fits)-Number(a.fits))||(b.score-a.score)).slice(0,8);
  const lastSix=useMemo(()=>Array.from({length:6},(_,idx)=>{const d=new Date();d.setMonth(d.getMonth()-idx);const key=d.toISOString().slice(0,7);const value=owned(data.items).filter(i=>i.purchaseDate?.startsWith(key)).reduce((sum,i)=>sum+itemSpend(i),0);return {key,label:d.toLocaleDateString(undefined,{month:'short',year:'numeric'}),value}}),[data.items]);
  function saveBudget(n:number){update({...data,preferences:{...prefs,monthlyCollectingBudget:Math.max(0,n)} as Store['preferences']})}
  return <div className="cc-content cc-finance-page"><div className="cc-finance-head"><div><small>COLLECTING FINANCE</small><h1>Monthly Budget</h1></div><input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></div><section className="cc-finance-overview"><div className="cc-budget-ring"><span>Budget</span><strong>{money(budget)}</strong><label>Monthly limit<input type="number" min="0" step="10" value={budget} onChange={e=>saveBudget(Number(e.target.value)||0)}/></label></div><div className="cc-budget-metrics"><article><span>Spent this month</span><b>{money(spent)}</b></article><article><span>Remaining</span><b className={remaining>0?'gain':''}>{money(remaining)}</b></article><div className="cc-budget-bar"><i><em style={{width:`${used}%`}}/></i><span>{used.toFixed(0)}% used</span></div></div></section><section className="cc-finance-grid"><div className="cc-finance-card"><div className="cc-section-head"><h2>6-Month Spend</h2></div><div className="cc-month-bars">{lastSix.toReversed().map(m=>{const max=Math.max(1,...lastSix.map(x=>x.value));return <div key={m.key}><span>{m.label}</span><i><em style={{width:`${m.value/max*100}%`}}/></i><b>{money(m.value)}</b></div>})}</div></div><div className="cc-finance-card"><div className="cc-section-head"><h2>Wishlist Buy Planner</h2></div><p className="cc-finance-note">Collector Value Score uses recent price movement, sold-comparable discount, and your remaining monthly budget. It is a collection-planning signal, not a guaranteed return.</p><div className="cc-buy-list">{wishlist.map(({item,score,fits},idx)=><button key={item.id} onClick={()=>openItem(item)}><img src={item.image||'/art/empty.svg'} alt=""/><span><b>{item.name}</b><small>{fits?(idx===0?'Best fit this month':'Fits remaining budget'):'Over remaining budget'} · Score {score}/99</small></span><strong>{money(item.currentValue)}</strong></button>)}{!wishlist.length&&<div className="cc-empty">Add items to your Wishlist to activate the planner.</div>}</div></div></section></div>
}

function ProfilePage({data,update,onCloud,onSettings}:{data:Store;update:(d:Store)=>void;onCloud:()=>void;onSettings:()=>void}){
  const [name,setName]=useState(data.profile?.name||'Collector');
  const [image,setImage]=useState(data.profile?.image||'');
  return <div className="cc-content cc-profile-page"><section className="cc-profile-card"><div className="cc-profile-avatar">{image?<img src={image} alt=""/>:<UserCircle size={70}/>}</div><div><h1>{name||'Collector'}</h1><p>{owned(data.items).reduce((n,i)=>n+i.quantity,0)} items · {money(totalValue(data.items))}</p></div></section><section className="cc-profile-form"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Profile image URL<input value={image} onChange={e=>setImage(e.target.value)}/></label><button onClick={()=>update({...data,profile:{name,image}})}>Save Profile</button><button className="secondary" onClick={onCloud}><Cloud size={16}/> Cloud Sync</button><button className="secondary" onClick={onSettings}><Settings size={16}/> Appearance</button></section></div>
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
  const [draft,setDraft]=useState<CollectionMeta>(collection as CollectionMeta);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save(draft)}}><div className="modal-header"><div><small>COLLECTION</small><h2>Edit Collection</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.coverImage||draft.coverLogo||''} onChange={coverImage=>setDraft({...draft,coverImage,coverLogo:undefined})}/><div className="cl-form-grid"><label className="wide">Name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Highlight<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label><label>Released date<input type="date" value={draft.releaseDate||''} onChange={e=>setDraft({...draft,releaseDate:e.target.value})}/></label><label>Total possible items<input type="number" min="0" step="1" value={draft.targetCount||''} placeholder="Leave blank if not measurable" onChange={e=>setDraft({...draft,targetCount:Number(e.target.value)||undefined})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

function GroupEditor({target,data,close,save}:{target:{level:'type'|'line';type:string;line?:string};data:Store;close:()=>void;save:(key:string,g:LibraryGroup)=>void}){
  const key=target.level==='type'?libraryTypeGroupKey(target.type):libraryLineGroupKey(target.type,target.line||'');
  const [draft,setDraft]=useState<LibraryGroup>(data.libraryGroups?.[key]||{name:'',color:RED});
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save(key,draft)}}><div className="modal-header"><div><small>{target.level.toUpperCase()}</small><h2>{data.libraryGroups?.[key]?'Edit':'Create'} {target.level==='type'?'Collection Type':'Line'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.coverImage||draft.coverLogo||''} onChange={coverImage=>setDraft({...draft,coverImage,coverLogo:undefined})}/><div className="cl-form-grid"><label className="wide">Name<input required value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Highlight<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

function SettingsModal({data,close,save}:{data:Store;close:()=>void;save:(d:Store)=>void}){
  const prefs=(data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false}) as NonNullable<Store['preferences']>&{monthlyCollectingBudget?:number};
  const [accent,setAccent]=useState(prefs.accentColor||RED),[density,setDensity]=useState(prefs.density),[cardSize,setCardSize]=useState(prefs.cardSize),[reduced,setReduced]=useState(prefs.reducedMotion);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save({...data,preferences:{...prefs,accentColor:accent,density,cardSize,reducedMotion:reduced}})}}><div className="modal-header"><div><small>CUSTOMIZE</small><h2>Appearance</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><div className="cl-form-grid"><label>Highlight color<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Density<select value={density} onChange={e=>setDensity(e.target.value as typeof density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Product card size<select value={cardSize} onChange={e=>setCardSize(e.target.value as typeof cardSize)}><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="cl-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

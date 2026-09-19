'use client';

import {useMemo,useState} from 'react';
import {
  Bell,Check,ChevronRight,Cloud,Download,Heart,LayoutGrid,LineChart,
  MoreHorizontal,Package,Pencil,Plus,Search,Settings,TrendingUp,Wallet,X
} from 'lucide-react';
import {Collection,Item,LibraryGroup,Store,money,libraryTypeGroupKey,libraryLineGroupKey} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import CloudPanel from './CloudPanel';
import ItemDetail from './ItemDetail';
import ValueChart from './ValueChart';

const RED='#ff2727';

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
function setTarget(collection:Collection,lineName:string){
  const s=`${collection.name} ${lineName}`.toLowerCase();
  // Official Bandai base checklists: JJK Vol.1 = 100 numbered + 6 AP; Vol.2 = 85 card types + 5 AP.
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*1|volume\s*1|jjk-1|ue03bt)/.test(s))return 106;
  if(/jujutsu|jjk/.test(s)&&/(vol\.?\s*2|volume\s*2|jjk-2|uex02bt)/.test(s))return 90;
  return 0;
}
function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}
function collectionImage(c:Collection){return c.coverImage||c.coverLogo||c.logo||''}
function groupImage(g?:LibraryGroup){return g?.coverImage||g?.coverLogo||''}

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
  const lineName=trail.type&&trail.line?groupName(data,'line',trail.type,trail.line):'';
  const allOwned=owned(data.items);
  const portfolioValue=totalValue(data.items),portfolioCost=totalCost(data.items);

  function update(next:Store){cloud.update(next)}
  function saveItem(item:Item){
    update({...data,items:data.items.some(i=>i.id===item.id)?data.items.map(i=>i.id===item.id?item:i):[item,...data.items]});
    setEditingItem(null);
    if(detail?.id===item.id)setDetail(item);
  }
  function removeItem(item:Item){
    if(!confirm(`Delete “${item.name}”?`))return;
    update({...data,items:data.items.filter(i=>i.id!==item.id)});setDetail(null);
  }
  function increment(item:Item,delta=1){
    const now=new Date().toISOString();
    const next={...item,status:'owned' as const,quantity:Math.max(1,item.quantity+delta),updatedAt:now};
    saveItem(next);
  }
  function toggleWatch(item:Item){
    const cf={...(item.customFields||{})};
    if(watched(item)&&item.status!=='wishlist')delete cf.__watchlist; else cf.__watchlist='true';
    saveItem({...item,customFields:cf,status:item.status==='wishlist'?'owned':item.status,updatedAt:new Date().toISOString()});
  }
  function openCollections(){setView('collections');setTrail({});setDetail(null)}
  function downloadBackup(){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='collector-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  }

  if(!ready)return <div className="cx-loading">Loading Collector…</div>;
  if(detail){
    const c=data.collections.find(x=>x.id===detail.collectionId);
    return <div className="cx-shell" style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
      <TopNav view={view} setView={v=>{setView(v);setDetail(null)}} cloud={cloud.status} openCollections={openCollections} onCloud={()=>setCloudOpen(true)} onSettings={()=>setSettingsOpen(true)}/>
      <ItemDetail item={data.items.find(i=>i.id===detail.id)||detail} collection={c} close={()=>setDetail(null)} edit={()=>{setEditingItem(detail);setDetail(null)}} remove={()=>removeItem(detail)} save={saveItem}/>
      {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
      {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
      {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    </div>
  }

  return <div className={'cx-shell density-'+prefs.density+' cards-'+prefs.cardSize} style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
    <TopNav view={view} setView={v=>{setView(v);if(v!=='collections')setTrail({})}} cloud={cloud.status} openCollections={openCollections} onCloud={()=>setCloudOpen(true)} onSettings={()=>setSettingsOpen(true)}/>
    <main className="cx-main">
      {view==='portfolio'&&<Portfolio data={data} value={portfolioValue} cost={portfolioCost} openItem={setDetail} goWatchlist={()=>setView('watchlist')}/>} 
      {view==='collections'&&<CollectionsView data={data} trail={trail} setTrail={setTrail} query={query} setQuery={setQuery} openItem={setDetail} addItem={()=>setEditingItem(blankItem(currentCollection?.id||''))} editCollection={setEditingCollection} editGroup={setEditingGroup} createGroup={(level,type)=>setEditingGroup(level==='type'?{level:'type',type:crypto.randomUUID()}:{level:'line',type:type!,line:crypto.randomUUID()})} createCollection={(type,line)=>setEditingCollection({id:crypto.randomUUID(),name:'New Collection',icon:'Layers',color:RED,libraryType:type,libraryLine:line})} increment={increment}/>} 
      {view==='watchlist'&&<Watchlist data={data} openItem={setDetail} toggleWatch={toggleWatch}/>} 
      {view==='gains'&&<Gains data={data} openItem={setDetail}/>} 
      {view==='budget'&&<Budget data={data}/>} 
    </main>
    {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
    {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
    {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>} 
    {editingCollection&&<CollectionEditor collection={editingCollection} data={data} close={()=>setEditingCollection(null)} save={c=>{const exists=data.collections.some(x=>x.id===c.id);update({...data,collections:exists?data.collections.map(x=>x.id===c.id?c:x):[...data.collections,c]});setEditingCollection(null)}}/>}
    {editingGroup&&<GroupEditor target={editingGroup} data={data} close={()=>setEditingGroup(null)} save={(key,g)=>{update({...data,libraryGroups:{...(data.libraryGroups||{}),[key]:g}});setEditingGroup(null)}}/>}
  </div>
}

function TopNav({view,setView,cloud,openCollections,onCloud,onSettings}:{view:MainView;setView:(v:MainView)=>void;cloud:string;openCollections:()=>void;onCloud:()=>void;onSettings:()=>void}){
  return <header className="cx-topbar">
    <button className="cx-brand" onClick={()=>setView('portfolio')} aria-label="Collector home"><span className="cx-logo-mark">C</span><span>COLLECTOR</span></button>
    <nav className="cx-nav" aria-label="Main">
      <button className={view==='portfolio'?'active':''} onClick={()=>setView('portfolio')}>Portfolio</button>
      <button className={view==='collections'?'active':''} onClick={openCollections}>Collections</button>
      <button className={view==='watchlist'?'active':''} onClick={()=>setView('watchlist')}>Watchlist</button>
      <button className={view==='gains'?'active':''} onClick={()=>setView('gains')}>Gains</button>
      <button className={view==='budget'?'active':''} onClick={()=>setView('budget')}>Budget</button>
    </nav>
    <div className="cx-actions">
      <button className="cx-sync" onClick={onCloud}><Cloud size={15}/><span>{cloud}</span></button>
      <span className="cx-currency">USD</span>
      <button aria-label="Notifications"><Bell size={18}/></button>
      <button aria-label="Settings" onClick={onSettings}><Settings size={18}/></button>
    </div>
  </header>
}

function Portfolio({data,value,cost,openItem,goWatchlist}:{data:Store;value:number;cost:number;openItem:(i:Item)=>void;goWatchlist:()=>void}){
  const top=[...owned(data.items)].sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).slice(0,5);
  const watch=data.items.filter(watched).slice(0,6);
  const breakdown=typeEntries(data).map(t=>{const cols=data.collections.filter(c=>c.libraryType===t.id);const items=itemsForCollections(data,cols);return {name:t.group.name||'Untitled',value:totalValue(items)}}).filter(x=>x.value>0).sort((a,b)=>b.value-a.value);
  const max=Math.max(1,...breakdown.map(x=>x.value));
  return <div className="cx-page cx-portfolio">
    <div className="cx-page-title"><div><small>MY PORTFOLIO</small><h1>Overview</h1></div></div>
    <div className="cx-portfolio-layout">
      <section className="cx-chart-card"><ValueChart data={data} collectionId="all" value={value} cost={cost}/></section>
      <aside className="cx-portfolio-side">
        <section className="cx-panel"><div className="cx-panel-head"><h2>Holdings Breakdown</h2><MoreHorizontal size={18}/></div><div className="cx-breakdown">{breakdown.slice(0,7).map(x=><div key={x.name}><div><span>{x.name}</span><b>{money(x.value)}</b></div><i><em style={{width:`${Math.max(4,x.value/max*100)}%`}}/></i></div>)}{!breakdown.length&&<p>No owned holdings yet.</p>}</div></section>
        <section className="cx-panel"><div className="cx-panel-head"><h2>Most Valuable</h2><span>{top.length}</span></div><div className="cx-ranked">{top.map((i,n)=><button key={i.id} onClick={()=>openItem(i)}><span className="cx-rank">{n+1}</span><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span><strong>{money(i.currentValue*i.quantity)}</strong></button>)}</div></section>
      </aside>
    </div>
    <section className="cx-watch-strip"><div className="cx-panel-head"><h2>Watchlist</h2><button onClick={goWatchlist}>VIEW ALL <ChevronRight size={14}/></button></div><div className="cx-watch-grid">{watch.map(i=><button key={i.id} className="cx-watch-card" onClick={()=>openItem(i)}><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span><strong>{money(i.currentValue)}</strong></button>)}{!watch.length&&<div className="cx-empty-inline">Watch items from any product page to track them here.</div>}</div></section>
  </div>
}

function CollectionsView({data,trail,setTrail,query,setQuery,openItem,addItem,editCollection,editGroup,createGroup,createCollection,increment}:{data:Store;trail:Trail;setTrail:(t:Trail)=>void;query:string;setQuery:(s:string)=>void;openItem:(i:Item)=>void;addItem:()=>void;editCollection:(c:Collection)=>void;editGroup:(g:{level:'type'|'line';type:string;line?:string})=>void;createGroup:(level:'type'|'line',type?:string)=>void;createCollection:(type:string,line:string)=>void;increment:(i:Item)=>void}){
  const types=typeEntries(data);
  const lines=trail.type?lineEntries(data,trail.type):[];
  const collections=trail.type&&trail.line?data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===trail.line):[];
  const current=trail.collection?data.collections.find(c=>c.id===trail.collection):undefined;
  if(current)return <CollectionDetail data={data} collection={current} type={trail.type!} line={trail.line!} query={query} setQuery={setQuery} back={()=>setTrail({type:trail.type,line:trail.line})} openItem={openItem} edit={()=>editCollection(current)} addItem={addItem} increment={increment}/>;
  const title=trail.line?groupName(data,'line',trail.type!,trail.line):trail.type?groupName(data,'type',trail.type):'Collections';
  return <div className="cx-page">
    <div className="cx-crumbs"><button onClick={()=>setTrail({})}>Collections</button>{trail.type&&<><ChevronRight size={14}/><button onClick={()=>setTrail({type:trail.type})}>{groupName(data,'type',trail.type)}</button></>}{trail.line&&<><ChevronRight size={14}/><b>{groupName(data,'line',trail.type!,trail.line)}</b></>}</div>
    <div className="cx-page-title"><div><small>{trail.line?'COLLECTIONS':trail.type?'LINES':'YOUR LIBRARY'}</small><h1>{title}</h1></div><button className="cx-primary" onClick={()=>!trail.type?createGroup('type'):!trail.line?createGroup('line',trail.type):createCollection(trail.type,trail.line)}><Plus size={15}/> {!trail.type?'New Type':!trail.line?'New Line':'New Collection'}</button></div>
    {!trail.type&&<div className="cx-category-grid">{types.map(t=>{const cols=data.collections.filter(c=>c.libraryType===t.id),items=itemsForCollections(data,cols),img=groupImage(t.group);return <article className="cx-category-card" key={t.id}><button className="cx-category-open" onClick={()=>setTrail({type:t.id})}>{img?<img src={img} alt=""/>:<div className="cx-fallback-logo">{(t.group.name||'C')[0]}</div>}<div><h2>{t.group.name||'Untitled'}</h2><span>{lineEntries(data,t.id).length} Lines</span><strong>{money(totalValue(items))}</strong></div></button><button className="cx-edit-float" onClick={()=>editGroup({level:'type',type:t.id})}><Pencil size={13}/> Edit</button></article>})}</div>}
    {trail.type&&!trail.line&&<div className="cx-line-grid">{lines.map(l=>{const cols=data.collections.filter(c=>c.libraryType===trail.type&&c.libraryLine===l.id),items=itemsForCollections(data,cols),img=groupImage(l.group);return <article className="cx-line-card" key={l.id}><button onClick={()=>setTrail({type:trail.type,line:l.id})}>{img?<img src={img} alt=""/>:<div className="cx-line-fallback">{(l.group.name||'L').slice(0,2)}</div>}<div><h2>{l.group.name||'Untitled Line'}</h2><span>{cols.length} collections</span><strong>{money(totalValue(items))}</strong></div></button><button className="cx-edit-float" onClick={()=>editGroup({level:'line',type:trail.type!,line:l.id})}><Pencil size={13}/> Edit</button></article>})}</div>}
    {trail.type&&trail.line&&<div className="cx-set-grid">{collections.map(c=>{const items=data.items.filter(i=>i.collectionId===c.id),target=setTarget(c,groupName(data,'line',trail.type!,trail.line!)),have=uniqueOwned(items),pct=target?Math.min(100,have/target*100):0,img=collectionImage(c);return <article className="cx-set-card" key={c.id}><button className="cx-set-open" onClick={()=>setTrail({...trail,collection:c.id})}><div className="cx-set-art">{img?<img src={img} alt=""/>:<Package size={42}/>}</div><div className="cx-set-copy"><h2>{c.name}</h2><div className="cx-set-meta"><span>{target?`Progress: ${have} / ${target}`:`${owned(items).reduce((n,i)=>n+i.quantity,0)} owned`}</span><b>Total value: {money(totalValue(items))}</b></div>{target>0&&<><div className="cx-progress"><i style={{width:`${pct}%`}}/></div><small>{pct.toFixed(1)}% complete</small></>}</div></button><button className="cx-edit-float" onClick={()=>editCollection(c)}><Pencil size={13}/> Edit</button></article>})}</div>}
  </div>
}

function CollectionDetail({data,collection,type,line,query,setQuery,back,openItem,edit,addItem,increment}:{data:Store;collection:Collection;type:string;line:string;query:string;setQuery:(s:string)=>void;back:()=>void;openItem:(i:Item)=>void;edit:()=>void;addItem:()=>void;increment:(i:Item)=>void}){
  const [tab,setTab]=useState<'overview'|'items'>('overview');
  const [sort,setSort]=useState<'name'|'value'|'recent'>('recent');
  const items=data.items.filter(i=>i.collectionId===collection.id);
  const shown=items.filter(i=>`${i.name} ${i.identity?.series||''} ${i.identity?.collectorNumber||''} ${i.identity?.upc||''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='value'?b.currentValue-a.currentValue:b.updatedAt.localeCompare(a.updatedAt));
  const have=uniqueOwned(items),target=setTarget(collection,groupName(data,'line',type,line)),pct=target?Math.min(100,have/target*100):0;
  const value=totalValue(items),cost=totalCost(items);
  return <div className="cx-page cx-collection-detail">
    <div className="cx-crumbs"><button onClick={back}>Collections</button><ChevronRight size={14}/><span>{groupName(data,'type',type)}</span><ChevronRight size={14}/><span>{groupName(data,'line',type,line)}</span><ChevronRight size={14}/><b>{collection.name}</b></div>
    <div className="cx-collection-heading"><div className="cx-collection-identity">{collectionImage(collection)?<img src={collectionImage(collection)} alt=""/>:<Package size={36}/>}<div><h1>{collection.name}</h1><span>{groupName(data,'line',type,line)}</span></div></div><div className="cx-collection-actions"><button className="cx-ghost" onClick={edit}><Pencil size={14}/> Edit Collection</button><button className="cx-primary" onClick={addItem}><Plus size={15}/> Add Item</button></div></div>
    <div className="cx-subtabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='items'?'active':''} onClick={()=>setTab('items')}>Items <span>{items.length}</span></button></div>
    {tab==='overview'&&<><section className="cx-chart-card cx-collection-chart"><ValueChart data={data} collectionId={collection.id} value={value} cost={cost}/></section><section className="cx-collection-statbar"><div><small>COLLECTION VALUE</small><b>{money(value)}</b></div><div><small>OWNED</small><b>{owned(items).reduce((n,i)=>n+i.quantity,0)}</b></div>{target>0&&<div className="cx-completion"><small>COMPLETION</small><b>{have} / {target} · {pct.toFixed(1)}%</b><div className="cx-progress"><i style={{width:`${pct}%`}}/></div></div>}</section></>}
    <div className="cx-products-head"><label className="cx-search"><Search size={17}/><input placeholder="Search this collection..." value={query} onChange={e=>setQuery(e.target.value)}/></label><select value={sort} onChange={e=>setSort(e.target.value as any)}><option value="recent">Recently updated</option><option value="value">Highest value</option><option value="name">Name A–Z</option></select></div>
    <div className="cx-product-grid">{shown.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div>
    {!shown.length&&<div className="cx-empty"><Package size={34}/><h3>No items found</h3><p>Add an item or clear the search.</p></div>}
  </div>
}

function ProductCard({item,open,add}:{item:Item;open:()=>void;add:()=>void}){
  const gain=item.currentValue-item.purchasePrice;
  return <article className="cx-product-card"><button className="cx-product-open" onClick={open}><div className="cx-product-image"><img src={item.image||'/art/empty.svg'} alt={item.name}/>{watched(item)&&<span className="cx-watch-badge"><Heart size={12} fill="currentColor"/></span>}</div><div className="cx-product-copy"><h3>{item.name}</h3><p>{item.identity?.series||item.category||'Collectible'}</p><strong>{money(item.currentValue)}</strong><small className={gain>=0?'up':'down'}>{gain>=0?'+':''}{money(gain)} vs paid</small></div></button><button className="cx-qty-plus" onClick={e=>{e.stopPropagation();add()}} aria-label={`Add one ${item.name}`}><Plus size={20}/></button><span className="cx-card-qty">{item.status==='owned'?`×${item.quantity}`:'Not owned'}</span></article>
}

function Watchlist({data,openItem,toggleWatch}:{data:Store;openItem:(i:Item)=>void;toggleWatch:(i:Item)=>void}){
  const items=data.items.filter(watched).sort((a,b)=>b.currentValue-a.currentValue);
  return <div className="cx-page"><div className="cx-page-title"><div><small>PRICE TRACKING</small><h1>Watchlist</h1><p>Keep an eye on anything you are considering, whether you own it or not.</p></div></div><div className="cx-watch-table"><div className="cx-watch-table-head"><span>Item</span><span>Current value</span><span>Recent change</span><span>Tracking</span></div>{items.map(i=>{const history=(i.priceHistory||[]).filter(p=>p.kind!=='sale').slice(-8),first=history[0]?.value??i.currentValue,last=history.at(-1)?.value??i.currentValue,change=last-first;return <div className="cx-watch-row" key={i.id}><button className="cx-watch-product" onClick={()=>openItem(i)}><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span></button><strong>{money(i.currentValue)}</strong><span className={change>=0?'up':'down'}>{change>=0?'+':''}{money(change)}</span><button className="cx-unwatch" onClick={()=>toggleWatch(i)}>Unwatch</button></div>})}{!items.length&&<div className="cx-empty"><Heart size={32}/><h3>Your watchlist is empty</h3><p>Open any product and choose Add to Watchlist.</p></div>}</div></div>
}

function Gains({data,openItem}:{data:Store;openItem:(i:Item)=>void}){
  const rows=owned(data.items).map(i=>({...i,gain:(i.currentValue-i.purchasePrice)*i.quantity})).sort((a,b)=>b.gain-a.gain);
  return <div className="cx-page"><div className="cx-page-title"><div><small>PERFORMANCE</small><h1>Gains</h1></div></div><div className="cx-list-panel">{rows.map(i=><button key={i.id} className="cx-gain-row" onClick={()=>openItem(i)}><img src={i.image||'/art/empty.svg'} alt=""/><span><b>{i.name}</b><small>Paid {money(i.purchasePrice*i.quantity)} · Value {money(i.currentValue*i.quantity)}</small></span><strong className={i.gain>=0?'up':'down'}>{i.gain>=0?'+':''}{money(i.gain)}</strong></button>)}</div></div>
}

function Budget({data}:{data:Store}){
  const spent=totalCost(data.items),value=totalValue(data.items),difference=value-spent;
  return <div className="cx-page"><div className="cx-page-title"><div><small>COLLECTION FINANCES</small><h1>Budget</h1></div></div><div className="cx-budget-grid"><section className="cx-panel"><Wallet size={22}/><small>Total paid</small><strong>{money(spent)}</strong></section><section className="cx-panel"><LineChart size={22}/><small>Current value</small><strong>{money(value)}</strong></section><section className="cx-panel"><TrendingUp size={22}/><small>Unrealized gain / loss</small><strong className={difference>=0?'up':'down'}>{difference>=0?'+':''}{money(difference)}</strong></section></div></div>
}

function blankItem(collectionId:string):Item{const now=new Date().toISOString();return {id:crypto.randomUUID(),collectionId,name:'',category:'',status:'owned',purchasePrice:0,currentValue:0,quantity:1,image:'',condition:'Excellent / Like New',purchaseDate:'',location:'',notes:'',customFields:{},createdAt:now,updatedAt:now}}

function ItemEditor({item,collections,close,save}:{item:Item;collections:Collection[];close:()=>void;save:(i:Item)=>void}){
  const [draft,setDraft]=useState(item);
  return <div className="cx-modal-backdrop"><form className="cx-modal cx-editor" onSubmit={e=>{e.preventDefault();save({...draft,updatedAt:new Date().toISOString()})}}><div className="cx-modal-head"><div><small>{item.name?'EDIT ITEM':'ADD ITEM'}</small><h2>{item.name||'New collectible'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cx-form-grid"><label className="wide">Item name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Collection<select value={draft.collectionId} onChange={e=>setDraft({...draft,collectionId:e.target.value})}><option value="">No collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as any})}><option value="owned">Owned</option><option value="wishlist">Wishlist</option><option value="sold">Sold</option></select></label><label>Purchase price<input type="number" min="0" step="0.01" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)})}/></label><label>Current value<input type="number" min="0" step="0.01" value={draft.currentValue} onChange={e=>setDraft({...draft,currentValue:Number(e.target.value)})}/></label><label>Quantity<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value))})}/></label><label>Condition<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label><label className="wide">Image URL<input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="https://..."/></label><label>Brand<input value={draft.identity?.brand||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),brand:e.target.value}})}/></label><label>Line / Series<input value={draft.identity?.series||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),series:e.target.value}})}/></label><label>UPC / Barcode<input value={draft.identity?.upc||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),upc:e.target.value}})}/></label><label>Model / Number<input value={draft.identity?.modelNumber||draft.identity?.collectorNumber||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),modelNumber:e.target.value}})}/></label><label className="wide">Notes<textarea rows={4} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></div><div className="cx-modal-actions"><button type="button" className="cx-ghost" onClick={close}>Cancel</button><button className="cx-primary">Save Item</button></div></form></div>
}

function CollectionEditor({collection,data,close,save}:{collection:Collection;data:Store;close:()=>void;save:(c:Collection)=>void}){
  const [draft,setDraft]=useState(collection);
  return <div className="cx-modal-backdrop"><form className="cx-modal" onSubmit={e=>{e.preventDefault();save(draft)}}><div className="cx-modal-head"><div><small>EDIT COLLECTION</small><h2>{collection.name}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cx-form-grid"><label className="wide">Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Accent<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label><label className="wide">Cover image URL<input value={draft.coverImage||''} onChange={e=>setDraft({...draft,coverImage:e.target.value})}/></label></div><div className="cx-modal-actions"><button type="button" className="cx-ghost" onClick={close}>Cancel</button><button className="cx-primary">Save Collection</button></div></form></div>
}

function GroupEditor({target,data,close,save}:{target:{level:'type'|'line';type:string;line?:string};data:Store;close:()=>void;save:(key:string,g:LibraryGroup)=>void}){
  const key=target.level==='type'?libraryTypeGroupKey(target.type):libraryLineGroupKey(target.type,target.line||'');
  const [draft,setDraft]=useState<LibraryGroup>(data.libraryGroups?.[key]||{});
  return <div className="cx-modal-backdrop"><form className="cx-modal" onSubmit={e=>{e.preventDefault();save(key,draft)}}><div className="cx-modal-head"><div><small>EDIT {target.level.toUpperCase()}</small><h2>{draft.name||'Untitled'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cx-form-grid"><label className="wide">Name<input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Accent<input type="color" value={draft.color||RED} onChange={e=>setDraft({...draft,color:e.target.value})}/></label><label className="wide">Cover image URL<input value={draft.coverImage||''} onChange={e=>setDraft({...draft,coverImage:e.target.value})}/></label><label className="wide">Transparent logo URL<input value={draft.coverLogo||''} onChange={e=>setDraft({...draft,coverLogo:e.target.value})}/></label></div><div className="cx-modal-actions"><button type="button" className="cx-ghost" onClick={close}>Cancel</button><button className="cx-primary">Save</button></div></form></div>
}

function SettingsModal({data,close,save}:{data:Store;close:()=>void;save:(d:Store)=>void}){
  const [accent,setAccent]=useState(data.preferences?.accentColor||RED),[density,setDensity]=useState(data.preferences?.density||'comfortable'),[cardSize,setCardSize]=useState(data.preferences?.cardSize||'standard'),[reduced,setReduced]=useState(data.preferences?.reducedMotion||false);
  return <div className="cx-modal-backdrop"><form className="cx-modal" onSubmit={e=>{e.preventDefault();save({...data,preferences:{accentColor:accent,density: density as any,cardSize:cardSize as any,reducedMotion:reduced}})}}><div className="cx-modal-head"><div><small>APPEARANCE</small><h2>Customize Collector</h2></div><button type="button" onClick={close}><X/></button></div><div className="cx-form-grid"><label>Highlight color<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Density<select value={density} onChange={e=>setDensity(e.target.value as any)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Card size<select value={cardSize} onChange={e=>setCardSize(e.target.value as any)}><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="cx-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label></div><div className="cx-modal-actions"><button type="button" className="cx-ghost" onClick={close}>Cancel</button><button className="cx-primary">Save Appearance</button></div></form></div>
}

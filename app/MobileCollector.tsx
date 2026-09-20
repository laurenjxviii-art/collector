'use client';

import {useId,useMemo,useRef,useState} from 'react';
import {
  ArrowDownUp,ArrowLeft,CircleDollarSign,Download,Eye,FileUp,Heart,Home,
  Layers3,Minus,MoreHorizontal,Package,Pencil,Plus,RefreshCw,Search,Settings,Share2,
  ShoppingBag,SlidersHorizontal,Star,Store as StoreIcon,Upload,UserCircle,Users,X
} from 'lucide-react';
import type {Item,Store as StoreData} from '../lib/model';
import type {CloudConfig,Session} from '../lib/cloud';
import {CommunityProfile,CommunitySocial,CommunityWishlist,MobileCommunitySync} from './MobileCommunity';
import {itemLibraryLine,money} from '../lib/model';
import {marketQuery,variantKey} from '../lib/market';

type MobileView='home'|'search'|'shop'|'social'|'portfolio'|'profile';
type SearchScreen='root'|'sets'|'set';
type Sheet='portfolio'|'filters'|'sort'|'picker'|'edit'|'create'|'progress'|null;
type RangeKey='1D'|'7D'|'1M'|'3M'|'6M'|'MAX';

type Props={status:string;profileName:string;data:StoreData;update:(next:StoreData)=>void;config:CloudConfig|null;session:Session|null};
type CategoryGroup={key:string;rawName:string;name:string;items:Item[];cover:string};
type SetGroup={key:string;rawName:string;name:string;items:Item[];cover:string;collectionId?:string};
type EditTarget=
  |{kind:'category';key:string;rawName:string;name:string}
  |{kind:'collection';key:string;rawName:string;name:string;collectionId?:string}
  |{kind:'product';itemId:string};
type CreateKind='category'|'collection'|'product';

const sortOptions=[
  'Price: Low to High','Price: High to Low','Price Change: Low to High','Price Change: High to Low',
  'Product Name: A to Z','Product Name: Z to A','Date Added: Oldest First','Date Added: Newest First'
];

const slug=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const categoryKey=(name:string)=>`mobile-category::${slug(name)}`;
const setKey=(category:string,name:string)=>`mobile-set::${slug(category)}::${slug(name)}`;
const nowIso=()=>new Date().toISOString();

function groupMeta(data:StoreData,key:string){return data.libraryGroups?.[key]||{}}
function displayGroupName(data:StoreData,key:string,fallback:string){return groupMeta(data,key).name?.trim()||fallback}
function displayGroupCover(data:StoreData,key:string){return groupMeta(data,key).coverImage||''}
function itemCollection(data:StoreData,item:Item){return data.collections.find(c=>c.id===item.collectionId)}
function itemCategory(data:StoreData,item:Item){return itemLibraryLine(item,itemCollection(data,item))||'Other'}
function derivedSetName(data:StoreData,item:Item){
  const c=itemCollection(data,item);
  if(c&&c.id!=='unlabeled-system'&&c.name.trim()&&!/^unlabeled$/i.test(c.name))return c.name.trim();
  const cf=item.customFields||{};
  return cf.Set||cf.set||cf.Series||cf.series||cf.Collection||cf.collection||item.identity?.series||item.identity?.brand||item.category||'Unsorted';
}
function productNumber(item:Item){return item.customFields?.Number||item.customFields?.number||item.identity?.collectorNumber||item.identity?.sku||''}
function ownedQty(item:Item){return item.status==='owned'?item.quantity:0}
function isWishlisted(item:Item){return item.status==='wishlist'||item.customFields?.__wishlist==='true'}
function holdingValue(item:Item){return item.status==='owned'?item.currentValue*item.quantity:0}
function itemChange(item:Item){
  const pts=(item.priceHistory||[]).filter(p=>p.kind!=='sale').slice(-2);
  if(pts.length<2)return {delta:0,pct:0};
  const a=pts[0].value,b=pts[1].value,delta=b-a;
  return {delta,pct:a?delta/a*100:0};
}
function fmtChange(delta:number,pct:number){const sign=delta>=0?'+':'';return `${sign}${money(delta)} (${sign}${pct.toFixed(2)}%)`}
function rangeMs(range:RangeKey){return range==='1D'?864e5:range==='7D'?6048e5:range==='1M'?2592e6:range==='3M'?7776e6:range==='6M'?15552e6:Infinity}

export default function MobileCollector({status,profileName,data,update,config,session}:Props){
  const [view,setView]=useState<MobileView>('home');
  const [searchScreen,setSearchScreen]=useState<SearchScreen>('root');
  const [sheet,setSheet]=useState<Sheet>(null);
  const [detailId,setDetailId]=useState<string|null>(null);
  const [homeTab,setHomeTab]=useState<'overview'|'performance'>('overview');
  const [query,setQuery]=useState('');
  const [portfolioId,setPortfolioId]=useState('all');
  const [sort,setSort]=useState(sortOptions[0]);
  const [filterCards,setFilterCards]=useState(false);
  const [filterSealed,setFilterSealed]=useState(false);
  const [watchOnly,setWatchOnly]=useState(false);
  const [selected,setSelected]=useState<string[]>([]);
  const [selectMode,setSelectMode]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [editTarget,setEditTarget]=useState<EditTarget|null>(null);
  const [createKind,setCreateKind]=useState<CreateKind>('product');
  const [selectedCategory,setSelectedCategory]=useState<string>('');
  const [selectedSet,setSelectedSet]=useState<SetGroup|null>(null);
  const [pickerSelected,setPickerSelected]=useState<string[]>([]);
  const [toast,setToast]=useState('');

  const visibleCollections=useMemo(()=>data.collections.filter(c=>c.id!=='unlabeled-system'&&!/^unlabeled$/i.test(c.name)),[data.collections]);
  const portfolioName=portfolioId==='all'?'Collecting':(data.collections.find(c=>c.id===portfolioId)?.name||'Collecting');
  const portfolioItems=useMemo(()=>data.items.filter(i=>i.status==='owned'&&(portfolioId==='all'||i.collectionId===portfolioId)),[data.items,portfolioId]);
  const portfolioValue=useMemo(()=>portfolioItems.reduce((sum,i)=>sum+holdingValue(i),0),[portfolioItems]);

  const categories=useMemo<CategoryGroup[]>(()=>{
    const map=new Map<string,Item[]>();
    for(const item of data.items){const n=itemCategory(data,item);map.set(n,[...(map.get(n)||[]),item])}
    const groups:Array<CategoryGroup>=Array.from(map.entries()).map(([rawName,items])=>{const key=categoryKey(rawName);return {key,rawName,name:displayGroupName(data,key,rawName),items,cover:displayGroupCover(data,key)}});
    for(const [key,meta] of Object.entries(data.libraryGroups||{})){
      if(!key.startsWith('mobile-category::')||!meta.name||groups.some(g=>g.key===key))continue;
      groups.push({key,rawName:key,name:meta.name,items:[],cover:meta.coverImage||''});
    }
    return groups.sort((a,b)=>a.name.localeCompare(b.name));
  },[data]);

  const setGroups=useMemo<SetGroup[]>(()=>{
    if(!selectedCategory)return [];
    const category=categories.find(c=>c.rawName===selectedCategory);
    const map=new Map<string,SetGroup>();
    for(const item of category?.items||[]){
      const c=itemCollection(data,item);
      if(c&&c.id!=='unlabeled-system'&&!/^unlabeled$/i.test(c.name)){
        const key=`collection::${c.id}`;
        const existing=map.get(key);if(existing)existing.items.push(item);else map.set(key,{key,rawName:c.name,name:c.name,items:[item],cover:c.coverImage||'',collectionId:c.id});
      }else{
        const raw=derivedSetName(data,item),key=setKey(selectedCategory,raw),existing=map.get(key);
        if(existing)existing.items.push(item);else map.set(key,{key,rawName:raw,name:displayGroupName(data,key,raw),items:[item],cover:displayGroupCover(data,key)});
      }
    }
    for(const c of visibleCollections){
      if(c.libraryLine===selectedCategory&&!map.has(`collection::${c.id}`))map.set(`collection::${c.id}`,{key:`collection::${c.id}`,rawName:c.name,name:c.name,items:[],cover:c.coverImage||'',collectionId:c.id});
    }
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[categories,data,selectedCategory,visibleCollections]);

  const notify=(msg:string)=>{setToast(msg);window.setTimeout(()=>setToast(''),1800)};
  const patchData=(fn:(draft:StoreData)=>StoreData)=>update(fn(data));
  const addOne=(itemId:string)=>patchData(d=>({...d,items:d.items.map(i=>i.id===itemId?{...i,status:'owned',quantity:i.status==='owned'?i.quantity+1:1,updatedAt:nowIso()}:i)}));
  const toggleWishlist=(itemId:string)=>patchData(d=>({...d,items:d.items.map(i=>{if(i.id!==itemId)return i;const cf={...(i.customFields||{})};if(cf.__wishlist==='true')delete cf.__wishlist;else cf.__wishlist='true';return {...i,customFields:cf,updatedAt:nowIso()}})}));
  const setOwnedQty=(itemId:string,next:number)=>patchData(d=>({...d,items:d.items.map(i=>i.id===itemId?{...i,status:next>0?'owned':'wishlist',quantity:Math.max(1,Math.floor(next)),updatedAt:nowIso()}:i)}));
  const openEdit=(target:EditTarget)=>{setEditTarget(target);setSheet('edit')};
  const openCreate=(kind:CreateKind)=>{setCreateKind(kind);setSheet('create')};

  const setViewAndReset=(next:MobileView)=>{setView(next);if(next!=='search')setSearchScreen('root');setDetailId(null);setSheet(null);setEditMode(false)};
  const detail=data.items.find(i=>i.id===detailId)||null;
  const activeSet=selectedSet?(setGroups.find(s=>s.key===selectedSet.key)||selectedSet):null;

  if(detail){
    return <div className="mobile-collector-shell mobile-app-active">
      <MobileCommunitySync config={config} session={session} data={data} fallbackName={profileName}/>
      <main className="mc-screen-wrap mc-detail-scroll">
        <MobileProductDetail item={detail} data={data} update={update} close={()=>setDetailId(null)} onAdd={()=>addOne(detail.id)} onSetQty={(n)=>setOwnedQty(detail.id,n)} openEdit={()=>openEdit({kind:'product',itemId:detail.id})} notify={notify}/>
      </main>
      <MobileBottomNav view={view} setView={setViewAndReset}/>
      {sheet==='edit'&&editTarget&&<EditSheet data={data} target={editTarget} update={update} close={()=>{setSheet(null);setEditTarget(null)}} notify={notify}/>}
      {toast&&<div className="mc-toast">{toast}</div>}
    </div>;
  }

  return <div className="mobile-collector-shell mobile-app-active">
    <MobileCommunitySync config={config} session={session} data={data} fallbackName={profileName}/>
    <main className="mc-screen-wrap">
      {view==='home'&&<MobileHome data={data} items={portfolioItems} value={portfolioValue} tab={homeTab} setTab={setHomeTab} portfolioName={portfolioName} portfolioId={portfolioId} choosePortfolio={()=>setSheet('portfolio')}/>} 
      {view==='search'&&<MobileSearchFlow data={data} update={update} categories={categories} sets={setGroups} screen={searchScreen} setScreen={setSearchScreen} query={query} setQuery={setQuery} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} selectedSet={activeSet} setSelectedSet={setSelectedSet} openCard={setDetailId} openFilters={()=>setSheet('filters')} openSort={()=>setSheet('sort')} openProgress={()=>setSheet('progress')} editMode={editMode} toggleEdit={()=>setEditMode(v=>!v)} openEdit={openEdit} addCategory={()=>openCreate('category')} addCollection={()=>openCreate('collection')} addToCollection={()=>{setPickerSelected([]);setSheet('picker')}} onAdd={addOne} onWishlist={toggleWishlist}/>} 
      {view==='shop'&&<CommunityWishlist data={data} update={update} openProduct={setDetailId} onAdd={addOne} editMode={editMode} toggleEdit={()=>setEditMode(v=>!v)} openEdit={openEdit} notify={notify}/>} 
      {view==='social'&&<CommunitySocial config={config} session={session} data={data} fallbackName={profileName} notify={notify}/>} 
      {view==='portfolio'&&<MobilePortfolio items={portfolioItems} value={portfolioValue} portfolioName={portfolioName} query={query} setQuery={setQuery} openCard={setDetailId} openFilters={()=>setSheet('filters')} openSort={()=>setSheet('sort')} selectMode={selectMode} setSelectMode={setSelectMode} selected={selected} setSelected={setSelected} onAdd={addOne} editMode={editMode} toggleEdit={()=>setEditMode(v=>!v)} openEdit={openEdit} data={data} importData={(file)=>importFile(file,data,update,notify)} exportData={()=>exportStore(data)} sort={sort} onWishlist={toggleWishlist}/>} 
      {view==='profile'&&<CommunityProfile config={config} session={session} data={data} update={update} openProduct={setDetailId} fallbackName={profileName} notify={notify}/>} 
    </main>

    <MobileBottomNav view={view} setView={setViewAndReset}/>
    {sheet==='portfolio'&&<PortfolioSheet data={data} selected={portfolioId} choose={(id)=>{setPortfolioId(id);setSheet(null)}} close={()=>setSheet(null)}/>} 
    {sheet==='filters'&&<FilterSheet watch={watchOnly} setWatch={setWatchOnly} cards={filterCards} setCards={setFilterCards} sealed={filterSealed} setSealed={setFilterSealed} close={()=>setSheet(null)}/>} 
    {sheet==='sort'&&<SortSheet value={sort} choose={(v)=>{setSort(v);setSheet(null)}} close={()=>setSheet(null)}/>} 
    {sheet==='edit'&&editTarget&&<EditSheet data={data} target={editTarget} update={update} close={()=>{setSheet(null);setEditTarget(null)}} notify={notify}/>} 
    {sheet==='create'&&<CreateSheet data={data} kind={createKind} selectedCategory={selectedCategory} selectedSet={selectedSet} update={update} close={()=>setSheet(null)} notify={notify}/>} 
    {sheet==='picker'&&activeSet&&<ItemPickerSheet data={data} target={activeSet} category={selectedCategory} selected={pickerSelected} setSelected={setPickerSelected} close={()=>setSheet(null)} commit={()=>{assignItemsToSet(data,update,activeSet,selectedCategory,pickerSelected);setSheet(null);notify(`${pickerSelected.length} item${pickerSelected.length===1?'':'s'} added`)}}/>}
    {sheet==='progress'&&activeSet&&<ProgressSheet data={data} target={activeSet} update={update} close={()=>setSheet(null)} notify={notify}/>}
    {selectMode&&view==='portfolio'&&<div className="mc-selection-bar"><span>{selected.length} products selected</span><button onClick={()=>{setSelected([]);setSelectMode(false)}}>Cancel</button><button className="primary" onClick={()=>setSelectMode(false)}>Done</button></div>}
    {toast&&<div className="mc-toast">{toast}</div>}
  </div>;
}

function EditToggle({active,onClick}:{active:boolean;onClick:()=>void}){return <button className={`mc-edit-pill ${active?'active':''}`} aria-label={active?'Finish editing':'Edit'} title={active?'Done':'Edit'} onClick={onClick}><Pencil/></button>}
function AddAnother({label,onClick}:{label:string;onClick:()=>void}){return <button className="mc-add-another" onClick={onClick}><Plus/>Add another {label}</button>}

function MobileTopSearch({placeholder,value,setValue,onFilter,onSort,onBack,editMode,onEdit}:{placeholder:string;value:string;setValue:(v:string)=>void;onFilter?:()=>void;onSort?:()=>void;onBack?:()=>void;editMode:boolean;onEdit:()=>void}){
  return <div className="mc-top-search">
    {onBack?<button className="mc-circle" onClick={onBack}><ArrowLeft/></button>:<EditToggle active={editMode} onClick={onEdit}/>} 
    <label className="mc-search-pill"><Search/><input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>{value&&<button onClick={()=>setValue('')}><X/></button>}</label>
    {onSort&&<button className="mc-circle" onClick={onSort}><ArrowDownUp/></button>}
    {onFilter&&<button className="mc-circle" onClick={onFilter}><SlidersHorizontal/></button>}
    {onBack&&<EditToggle active={editMode} onClick={onEdit}/>} 
  </div>;
}

function MobileHome({data,items,value,tab,setTab,portfolioName,portfolioId,choosePortfolio}:{data:StoreData;items:Item[];value:number;tab:'overview'|'performance';setTab:(t:'overview'|'performance')=>void;portfolioName:string;portfolioId:string;choosePortfolio:()=>void}){
  const [range,setRange]=useState<RangeKey>('1M');
  const delta=portfolioDelta(data,portfolioId,value,30);
  const most=[...items].sort((a,b)=>holdingValue(b)-holdingValue(a)).slice(0,10);
  return <section className="mc-page mc-home">
    <div className="mc-home-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='performance'?'active':''} onClick={()=>setTab('performance')}>Performance</button><span className="mc-currency-dot"/>USD</div>
    {tab==='overview'?<>
      <div className="mc-portfolio-head"><span>Portfolio: <button className="mc-portfolio-word" onClick={choosePortfolio}>{portfolioName}</button></span><strong>{money(value)}</strong><small className={delta.delta>=0?'gain':'loss'}>{delta.delta>=0?'+':''}{money(delta.delta)} in the last 30 days</small></div>
      <LiveChart data={data} portfolioId={portfolioId} currentValue={value} range={range}/><RangeRow range={range} setRange={setRange}/>
      <section className="mc-panel mc-most-valuable"><div className="mc-panel-title"><h3>Most Valuable</h3></div><ValueRows items={most}/></section>
    </>:<section className="mc-performance-card"><h2>Your Performance</h2><p>Current portfolio value and historical changes are calculated from your synced collection.</p><LiveChart data={data} portfolioId={portfolioId} currentValue={value} range={range} compact/><RangeRow range={range} setRange={setRange}/><button>View Transaction Logs</button></section>}
  </section>;
}

function LiveChart({data,portfolioId,currentValue,range,compact=false}:{data:StoreData;portfolioId:string;currentValue:number;range:RangeKey;compact?:boolean}){
  const id=useId().replace(/:/g,'');
  const pts=useMemo(()=>chartPoints(data,portfolioId,currentValue,range),[data,portfolioId,currentValue,range]);
  const w=390,h=170,p=8,min=Math.min(...pts.map(x=>x.value)),max=Math.max(...pts.map(x=>x.value));
  const span=Math.max(1,max-min),x=(i:number)=>pts.length===1?w/2:(i/(pts.length-1))*w,y=(v:number)=>p+(1-(v-min)/span)*(h-p*2);
  const line=pts.map((pt,i)=>`${i?'L':'M'}${x(i).toFixed(1)} ${y(pt.value).toFixed(1)}`).join(' ');
  const area=`${line} L${w} ${h} L0 ${h} Z`;
  return <div className={`mc-chart ${compact?'compact':''}`}><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff1f2d" stopOpacity=".38"/><stop offset="1" stopColor="#ff1f2d" stopOpacity="0"/></linearGradient></defs><path d={area} fill={`url(#${id})`}/><path d={line} fill="none" stroke="#ff1f2d" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/></svg></div>;
}
function RangeRow({range,setRange}:{range:RangeKey;setRange:(r:RangeKey)=>void}){return <div className="mc-ranges">{(['1D','7D','1M','3M','6M','MAX'] as RangeKey[]).map(r=><button key={r} className={r===range?'active':''} onClick={()=>setRange(r)}>{r}</button>)}</div>}
function ValueRows({items}:{items:Item[]}){return <div className="mc-value-list">{items.length?items.map(item=>{const ch=itemChange(item);return <div key={item.id}><span>{item.name}<small>{item.condition||'Unspecified'}{item.customFields?.Finish?` • ${item.customFields.Finish}`:''}</small></span><span className="mc-value-right"><b>{money(holdingValue(item)||item.currentValue)}</b><small className={ch.delta>=0?'gain':'loss'}>{ch.pct.toFixed(2)}%</small></span></div>}):<div className="mc-empty-row">No owned products yet</div>}</div>}

function MobileSearchFlow({data,update,categories,sets,screen,setScreen,query,setQuery,selectedCategory,setSelectedCategory,selectedSet,setSelectedSet,openCard,openFilters,openSort,openProgress,editMode,toggleEdit,openEdit,addCategory,addCollection,addToCollection,onAdd,onWishlist}:{data:StoreData;update:(s:StoreData)=>void;categories:CategoryGroup[];sets:SetGroup[];screen:SearchScreen;setScreen:(s:SearchScreen)=>void;query:string;setQuery:(v:string)=>void;selectedCategory:string;setSelectedCategory:(v:string)=>void;selectedSet:SetGroup|null;setSelectedSet:(s:SetGroup|null)=>void;openCard:(id:string)=>void;openFilters:()=>void;openSort:()=>void;openProgress:()=>void;editMode:boolean;toggleEdit:()=>void;openEdit:(t:EditTarget)=>void;addCategory:()=>void;addCollection:()=>void;addToCollection:()=>void;onAdd:(id:string)=>void;onWishlist:(id:string)=>void}){
  if(screen==='root')return <section className="mc-page"><MobileTopSearch placeholder="Search for products" value={query} setValue={setQuery} onFilter={openFilters} onSort={openSort} editMode={editMode} onEdit={toggleEdit}/>{editMode&&<div className="mc-add-under-edit"><AddAnother label="category" onClick={addCategory}/></div>}<h3 className="mc-heading">Quick Filters</h3><div className="mc-quick-grid">{categories.filter(c=>!query||c.name.toLowerCase().includes(query.toLowerCase())).map(c=><div key={c.key} className="mc-cover-card" role="button" tabIndex={0} style={coverStyle(c.cover)} onClick={()=>{setSelectedCategory(c.rawName);setScreen('sets')}}><span>{c.name}</span>{editMode&&<button className="mc-card-edit" onClick={e=>{e.stopPropagation();openEdit({kind:'category',key:c.key,rawName:c.rawName,name:c.name})}}><Pencil/></button>}</div>)}</div></section>;
  if(screen==='sets')return <MobileSets data={data} sets={sets} query={query} setQuery={setQuery} back={()=>setScreen('root')} openSet={(s)=>{setSelectedSet(s);setScreen('set')}} openFilters={openFilters} editMode={editMode} toggleEdit={toggleEdit} openEdit={openEdit} addAnother={addCollection}/>;
  return <MobileSetProducts data={data} update={update} group={selectedSet} query={query} setQuery={setQuery} back={()=>setScreen('sets')} openCard={openCard} openFilters={openFilters} openSort={openSort} editMode={editMode} toggleEdit={toggleEdit} openEdit={openEdit} addToCollection={addToCollection} onAdd={onAdd} onWishlist={onWishlist} openProgress={openProgress}/>;
}

function MobileSets({data,sets,query,setQuery,back,openSet,openFilters,editMode,toggleEdit,openEdit,addAnother}:{data:StoreData;sets:SetGroup[];query:string;setQuery:(v:string)=>void;back:()=>void;openSet:(s:SetGroup)=>void;openFilters:()=>void;editMode:boolean;toggleEdit:()=>void;openEdit:(t:EditTarget)=>void;addAnother:()=>void}){
  const shown=sets.filter(s=>!query||s.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="mc-page mc-sets"><div className="mc-title-row"><button className="mc-circle" onClick={back}><ArrowLeft/></button><h2>Sets</h2><span/></div><MobileTopSearch placeholder="Search sets" value={query} setValue={setQuery} onFilter={openFilters} editMode={editMode} onEdit={toggleEdit}/>{editMode&&<div className="mc-add-under-edit"><AddAnother label="collection" onClick={addAnother}/></div>}<div className="mc-set-grid">{shown.map(s=>{const progress=getProgress(data,s);return <div className="mc-set-card mc-cover-card" role="button" tabIndex={0} style={coverStyle(s.cover)} key={s.key} onClick={()=>openSet(s)}><div className="mc-set-logo">{s.name.toUpperCase()}</div>{progress.enabled?<><small>Progress: {progress.owned}/{progress.target} ({progress.percent}%)</small><div className="mc-set-card-progress"><i style={{width:`${progress.percent}%`}}/></div></>:<small>{s.items.reduce((n,i)=>n+ownedQty(i),0)} items</small>}<small>Total Value: {money(s.items.reduce((n,i)=>n+holdingValue(i),0))}</small>{editMode&&<button className="mc-card-edit" onClick={e=>{e.stopPropagation();openEdit({kind:'collection',key:s.key,rawName:s.rawName,name:s.name,collectionId:s.collectionId})}}><Pencil/></button>}</div>})}</div></section>;
}

function MobileSetProducts({data,update,group,query,setQuery,back,openCard,openFilters,openSort,editMode,toggleEdit,openEdit,addToCollection,onAdd,openProgress,onWishlist}:{data:StoreData;update:(s:StoreData)=>void;group:SetGroup|null;query:string;setQuery:(v:string)=>void;back:()=>void;openCard:(id:string)=>void;openFilters:()=>void;openSort:()=>void;editMode:boolean;toggleEdit:()=>void;openEdit:(t:EditTarget)=>void;addToCollection:()=>void;onAdd:(id:string)=>void;openProgress:()=>void;onWishlist:(id:string)=>void}){
  const items=(group?.items||[]).filter(i=>!query||i.name.toLowerCase().includes(query.toLowerCase()));
  const progress=group?getProgress(data,group):null;
  return <section className="mc-page"><MobileTopSearch placeholder="Search for products" value={query} setValue={setQuery} onBack={back} onFilter={openFilters} onSort={openSort} editMode={editMode} onEdit={toggleEdit}/>{editMode&&<div className="mc-add-to-collection-row"><button onClick={addToCollection}>Add to Collection</button></div>}<div className="mc-set-summary"><div className="mc-set-logo small" style={coverStyle(group?.cover||'')}>{group?.name.slice(0,8).toUpperCase()||'SET'}</div><div className="mc-set-summary-copy"><b>{group?.name||'Collection'}</b>{progress?.enabled?<><small>Progress: {progress.owned}/{progress.target} ({progress.percent}%)</small><div className="mc-set-progress"><i style={{width:`${progress.percent}%`}}/></div></>:<small>{group?.items.reduce((n,i)=>n+ownedQty(i),0)||0} owned</small>}<small>Total Value: {money(group?.items.reduce((n,i)=>n+holdingValue(i),0)||0)}</small></div><button onClick={()=>group&&openProgress()}>Update</button></div><div className="mc-product-grid">{items.map(item=><MobileProductCard key={item.id} item={item} data={data} open={()=>openCard(item.id)} onAdd={()=>onAdd(item.id)} editMode={editMode} openEdit={()=>openEdit({kind:'product',itemId:item.id})} wishlisted={isWishlisted(item)} onWishlist={()=>onWishlist(item.id)}/>)}</div></section>;
}

function MobileProductCard({item,data,open,onAdd,selected=false,toggle,editMode=false,openEdit,wishlisted=false,onWishlist}:{item:Item;data:StoreData;open:()=>void;onAdd:()=>void;selected?:boolean;toggle?:()=>void;editMode?:boolean;openEdit?:()=>void;wishlisted?:boolean;onWishlist?:()=>void}){
  const ch=itemChange(item),set=derivedSetName(data,item),num=productNumber(item);
  return <article className={`mc-product-card ${selected?'selected':''}`} onClick={toggle||open}><div className="mc-product-image">{item.image?<img src={item.image} alt=""/>:<span>{item.name.slice(0,1)}</span>}{selected&&<i>✓</i>}{onWishlist&&<button className={`mc-wishlist-star ${wishlisted?'active':''}`} aria-label={wishlisted?'On wishlist':'Add to wishlist'} onClick={e=>{e.stopPropagation();onWishlist()}}><Star fill={wishlisted?'currentColor':'none'}/></button>}{editMode&&openEdit&&<button className="mc-card-edit product" onClick={e=>{e.stopPropagation();openEdit()}}><Pencil/></button>}</div><h4>{item.name}</h4><p>{set}</p><small>{num}</small><footer><div><b>{money(item.currentValue)}</b><em className={ch.delta>=0?'gain':'loss'}>{fmtChange(ch.delta,ch.pct)}</em><span>Qty: {ownedQty(item)}</span></div><button onClick={e=>{e.stopPropagation();onAdd()}}><Plus/></button></footer></article>;
}

function MobilePortfolio({items,value,portfolioName,query,setQuery,openCard,openFilters,openSort,selectMode,setSelectMode,selected,setSelected,onAdd,editMode,toggleEdit,openEdit,data,importData,exportData,sort,onWishlist}:{items:Item[];value:number;portfolioName:string;query:string;setQuery:(v:string)=>void;openCard:(id:string)=>void;openFilters:()=>void;openSort:()=>void;selectMode:boolean;setSelectMode:(v:boolean)=>void;selected:string[];setSelected:(v:string[])=>void;onAdd:(id:string)=>void;editMode:boolean;toggleEdit:()=>void;openEdit:(t:EditTarget)=>void;data:StoreData;importData:(f:File)=>void;exportData:()=>void;sort:string;onWishlist:(id:string)=>void}){
  const input=useRef<HTMLInputElement|null>(null),toggle=(id:string)=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
  const shown=sortItems(items.filter(i=>!query||i.name.toLowerCase().includes(query.toLowerCase())),sort);
  return <section className="mc-page"><MobileTopSearch placeholder="Search your collection" value={query} setValue={setQuery} onFilter={openFilters} onSort={openSort} editMode={editMode} onEdit={toggleEdit}/><div className="mc-portfolio-value"><span>Portfolio: <b>{portfolioName}</b></span><strong>{money(value)} <Eye/></strong></div><div className="mc-tool-icons three"><button onClick={()=>input.current?.click()}><FileUp/><span>Import</span></button><button onClick={()=>setSelectMode(!selectMode)} className={selectMode?'active':''}><Layers3/><span>Bulk Actions</span></button><button onClick={exportData}><Download/><span>Export</span></button></div><input ref={input} hidden type="file" accept=".json,.csv,application/json,text/csv" onChange={e=>{const f=e.target.files?.[0];if(f)importData(f);e.currentTarget.value=''}}/><div className="mc-product-grid">{shown.map(item=><MobileProductCard key={item.id} item={item} data={data} open={()=>openCard(item.id)} onAdd={()=>onAdd(item.id)} selected={selected.includes(item.id)} toggle={selectMode?()=>toggle(item.id):undefined} editMode={editMode} openEdit={()=>openEdit({kind:'product',itemId:item.id})} wishlisted={isWishlisted(item)} onWishlist={()=>onWishlist(item.id)}/>)}</div></section>;
}

function MobileShop({items,openCard,onAdd,editMode,toggleEdit,openEdit,data}:{items:Item[];openCard:(id:string)=>void;onAdd:(id:string)=>void;editMode:boolean;toggleEdit:()=>void;openEdit:(t:EditTarget)=>void;data:StoreData}){return <section className="mc-page"><div className="mc-page-edit-title"><h2>Shop</h2><EditToggle active={editMode} onClick={toggleEdit}/></div><h3 className="mc-heading">Your Products</h3><div className="mc-product-grid">{items.map(i=><MobileProductCard key={i.id} item={i} data={data} open={()=>openCard(i.id)} onAdd={()=>onAdd(i.id)} editMode={editMode} openEdit={()=>openEdit({kind:'product',itemId:i.id})}/>)}</div></section>}
function MobileSocial({editMode,toggleEdit}:{editMode:boolean;toggleEdit:()=>void}){return <section className="mc-page"><div className="mc-page-edit-title"><h2>Social</h2><EditToggle active={editMode} onClick={toggleEdit}/></div>{editMode&&<div className="mc-add-under-edit"><button className="mc-add-another" disabled><Plus/>Add another post</button></div>}<div className="mc-social-tabs"><button className="active">Following</button><button>For You</button><button>Your Posts</button></div><article className="mc-social-post"><header><div className="mc-avatar">C</div><div><b>Collector</b><small>Your private feed</small></div><button>Following</button><MoreHorizontal/></header><div className="mc-social-image">COLLECTOR<br/><span>Your collection, your way.</span></div><div className="mc-social-actions"><Heart/> Likes</div></article></section>}

function MobileProfile({name,status,tab,setTab,portfolioName,items,value,editMode,toggleEdit,addAnother}:{name:string;status:string;tab:'stats'|'settings'|'support';setTab:(t:'stats'|'settings'|'support')=>void;portfolioName:string;items:Item[];value:number;editMode:boolean;toggleEdit:()=>void;addAnother:()=>void}){
  const cards=items.filter(i=>/card/i.test(i.category)).reduce((n,i)=>n+i.quantity,0),sealed=items.filter(i=>i.packagingState==='sealed').reduce((n,i)=>n+i.quantity,0),graded=items.filter(i=>i.grading?.graded).reduce((n,i)=>n+i.quantity,0);
  return <section className="mc-page"><div className="mc-page-edit-title"><span/><EditToggle active={editMode} onClick={toggleEdit}/></div>{editMode&&<div className="mc-add-under-edit"><AddAnother label="collection" onClick={addAnother}/></div>}<div className="mc-profile-head"><div className="mc-profile-avatar">{(name||'C')[0]?.toUpperCase()}</div><h2>{name||'Collector'}</h2><small>{status}</small><div className="mc-profile-counts"><span><b>{cards}</b>Total Cards</span><span><b>{sealed}</b>Total Sealed</span><span><b>{graded}</b>Total Graded</span><span><b>{money(value)}</b>Total Value</span></div><div className="mc-profile-buttons"><button>View Social Profile</button><button>Edit Background</button></div></div><div className="mc-profile-tabs">{(['stats','settings','support'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>{tab==='stats'?<><h3 className="mc-heading">Portfolio: <b>{portfolioName}</b></h3><div className="mc-stat-grid"><span><b>{items.length}</b>Products</span><span><b>{sealed}</b>Sealed</span><span><b>{graded}</b>Graded</span><span><b>{money(value)}</b>Value</span></div></>:tab==='settings'?<div className="mc-settings-list"><button><Settings/>Account Settings</button><button><CircleDollarSign/>Currency: USD</button><button><Share2/>Share Profile</button></div>:<div className="mc-settings-list"><button>Help Center</button><button>Contact Support</button><button>About Collector</button></div>}</section>;
}

function MobileProductDetail({item,data,update,close,onAdd,onSetQty,openEdit,notify}:{item:Item;data:StoreData;update:(s:StoreData)=>void;close:()=>void;onAdd:()=>void;onSetQty:(n:number)=>void;openEdit:()=>void;notify:(s:string)=>void}){
  const [grade,setGrade]=useState<'RAW'|'GRADED'|'POP'>('RAW');
  const [range,setRange]=useState<RangeKey>('1M');
  const [marketBusy,setMarketBusy]=useState(false);
  const [marketMessage,setMarketMessage]=useState('');
  const ch=itemChange(item),qty=ownedQty(item);
  const soldUrl='https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:marketQuery(item),LH_Sold:'1',LH_Complete:'1'});
  async function checkMarket(){
    setMarketBusy(true);setMarketMessage('');
    try{
      const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});
      const result=await r.json();
      if(!r.ok)throw new Error(result.error||'Market lookup unavailable');
      const value=Number(result.value);if(!Number.isFinite(value)||value<=0)throw new Error('No usable market value returned.');
      const date=new Date().toISOString(),source=String(result.source||'Market'),query=String(result.searchQuery||marketQuery(item));
      const point={date,value,variant:variantKey(item),source,url:String(result.url||''),kind:'provider' as const};
      const next:Item={...item,currentValue:value,updatedAt:date,identity:{...(item.identity||{}),...(result.identifiers||{})},marketLink:{provider:source,query,linkedAt:item.marketLink?.linkedAt||date,lastRefresh:date},customFields:{...(item.customFields||{}),'Market source':source,'Market updated':date},priceHistory:[...(item.priceHistory||[]),point].slice(-3000)};
      update({...data,items:data.items.map(i=>i.id===item.id?next:i)});
      setMarketMessage(`${source} • ${money(value)}`);notify('Market value updated');
    }catch(err){setMarketMessage(err instanceof Error?err.message:'Market lookup unavailable');}
    finally{setMarketBusy(false)}
  }
  return <section className="mc-page mc-product-detail">
    <div className="mc-detail-top"><button className="mc-circle mc-detail-control" onClick={close} aria-label="Back"><ArrowLeft/></button><button className="mc-circle mc-detail-control mc-detail-edit-button" onClick={openEdit} aria-label="Edit product"><Pencil/></button><button className="mc-circle mc-detail-control" onClick={()=>{if(navigator.share)navigator.share({title:item.name,url:window.location.href}).catch(()=>{});else navigator.clipboard?.writeText(window.location.href).catch(()=>{})}} aria-label="Share product"><Share2/></button></div>
    <div className="mc-detail-image">{item.image&&<div className="mc-detail-blur" style={{backgroundImage:`url(${item.image})`}}/>}{item.image?<img src={item.image} alt={item.name}/>:<span>{item.name}</span>}</div>
    <div className="mc-detail-body"><div className="mc-detail-title"><div><h2>{item.name}</h2><p>{derivedSetName(data,item)} {productNumber(item)&&`• ${productNumber(item)}`}</p></div></div><div className="mc-detail-price"><strong>{money(item.currentValue)}</strong><small className={ch.delta>=0?'gain':'loss'}>{fmtChange(ch.delta,ch.pct)}</small></div>
      <div className="mc-detail-action-row"><button className="mc-sold-button" onClick={()=>window.open(soldUrl,'_blank','noopener,noreferrer')}><ShoppingBag/>View Sold Listings</button><div className="mc-qty-stepper"><button onClick={()=>onSetQty(qty-1)} aria-label="Decrease quantity"><Minus/></button><span>{qty}</span><button onClick={()=>onSetQty(qty+1)} aria-label="Increase quantity"><Plus/></button></div></div>
      <div className="mc-grade-tabs">{(['RAW','GRADED','POP'] as const).map(x=><button className={grade===x?'active':''} key={x} onClick={()=>setGrade(x)}>{x}</button>)}</div>
      <div className="mc-history-card"><div className="mc-history-head"><span>{item.condition||'Current Value'}</span><strong>{money(item.currentValue)}</strong></div><ItemChart item={item} range={range}/><RangeRow range={range} setRange={setRange}/></div>
      <button className="mc-market-main" disabled={marketBusy} onClick={checkMarket}><RefreshCw/>{marketBusy?'Checking Market…':'Check Market Value'}</button>{marketMessage&&<div className="mc-market-message">{marketMessage}</div>}
      <button className="mc-share-main mc-add-one-main" onClick={onAdd}><Plus/> Add 1 to collection</button>
    </div>
  </section>;
}

function ItemChart({item,range}:{item:Item;range:RangeKey}){const id=useId().replace(/:/g,''),cut=Date.now()-rangeMs(range),raw=(item.priceHistory||[]).filter(p=>p.kind!=='sale'&&(range==='MAX'||new Date(p.date).getTime()>=cut)).map(p=>p.value),vals=raw.length?raw:[item.currentValue,item.currentValue],w=390,h=140,min=Math.min(...vals),max=Math.max(...vals),span=Math.max(1,max-min),line=vals.map((v,i)=>`${i?'L':'M'}${vals.length===1?w/2:(i/(vals.length-1))*w} ${8+(1-(v-min)/span)*(h-16)}`).join(' ');return <div className="mc-chart compact"><svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><defs><linearGradient id={id}><stop stopColor="#ff1f2d" stopOpacity=".35"/><stop offset="1" stopColor="#ff1f2d" stopOpacity="0"/></linearGradient></defs><path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`}/><path d={line} fill="none" stroke="#ff1f2d" strokeWidth="2.5"/></svg></div>}

function PortfolioSheet({data,selected,choose,close}:{data:StoreData;selected:string;choose:(s:string)=>void;close:()=>void}){return <BottomSheet title="Choose Portfolio" close={close}><button className="mc-portfolio-row" onClick={()=>choose('all')}><i className="mc-red-dot"/><span><b>Collecting</b><small>{data.items.filter(i=>i.status==='owned').length} Products</small></span><Star className={selected==='all'?'selected':''}/><MoreHorizontal/></button>{data.collections.filter(c=>c.id!=='unlabeled-system'&&!/^unlabeled$/i.test(c.name)).map(c=><button className="mc-portfolio-row" key={c.id} onClick={()=>choose(c.id)}><i className="mc-red-dot"/><span><b>{c.name}</b><small>{data.items.filter(i=>i.collectionId===c.id&&i.status==='owned').length} Products</small></span><Star className={selected===c.id?'selected':''}/><MoreHorizontal/></button>)}</BottomSheet>}
function FilterSheet({watch,setWatch,cards,setCards,sealed,setSealed,close}:{watch:boolean;setWatch:(v:boolean)=>void;cards:boolean;setCards:(v:boolean)=>void;sealed:boolean;setSealed:(v:boolean)=>void;close:()=>void}){return <BottomSheet title="Filters" close={close} tall><FilterBlock title="Watchlist" copy="Show only products on your Watchlist."><SheetCheck label="Watchlist" checked={watch} setChecked={setWatch}/></FilterBlock><FilterBlock title="Product Type" copy="Filter by type of product."><SheetCheck label="Cards Only" checked={cards} setChecked={setCards}/><SheetCheck label="Sealed Only" checked={sealed} setChecked={setSealed}/></FilterBlock><FilterBlock title="Price Range" copy="Show all products within a price range."><div className="mc-price-row"><input placeholder="Min."/><span>to</span><input placeholder="Max."/></div></FilterBlock><FilterBlock title="Category" copy="Select a category below."/></BottomSheet>}
function SortSheet({value,choose,close}:{value:string;choose:(v:string)=>void;close:()=>void}){return <BottomSheet title="Sort By" close={close} tall>{sortOptions.map(x=><button className="mc-sort-row" key={x} onClick={()=>choose(x)}><span>{x}</span><i className={value===x?'selected':''}/></button>)}</BottomSheet>}

function EditSheet({data,target,update,close,notify}:{data:StoreData;target:EditTarget;update:(s:StoreData)=>void;close:()=>void;notify:(s:string)=>void}){
  const item=target.kind==='product'?data.items.find(i=>i.id===target.itemId):undefined;
  const collection=target.kind==='collection'&&target.collectionId?data.collections.find(c=>c.id===target.collectionId):undefined;
  const meta=target.kind!=='product'?groupMeta(data,target.key):{};
  const [name,setName]=useState(item?.name||collection?.name||(target.kind!=='product'?target.name:''));
  const [image,setImage]=useState(item?.image||collection?.coverImage||meta.coverImage||'');
  const [value,setValue]=useState(String(item?.currentValue??''));
  const [pricePaid,setPricePaid]=useState(String(item?.purchasePrice??''));
  const [condition,setCondition]=useState(item?.condition||'');
  const save=()=>{
    if(target.kind==='product'&&item){update({...data,items:data.items.map(i=>i.id===item.id?{...i,name:name.trim()||i.name,image,currentValue:Math.max(0,Number(value)||0),purchasePrice:Math.max(0,Number(pricePaid)||0),condition,updatedAt:nowIso()}:i)});notify('Product updated')}
    else if(target.kind==='collection'&&collection){update({...data,collections:data.collections.map(c=>c.id===collection.id?{...c,name:name.trim()||c.name,coverImage:image}:c)});notify('Collection updated')}
    else if(target.kind!=='product'){update({...data,libraryGroups:{...(data.libraryGroups||{}),[target.key]:{...(data.libraryGroups?.[target.key]||{}),name:name.trim()||target.rawName,coverImage:image,coverMode:'full'}}});notify(target.kind==='category'?'Category updated':'Collection updated')}
    close();
  };
  return <BottomSheet title={`Edit ${target.kind}`} close={close}><div className="mc-edit-form"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><ImagePicker value={image} setValue={setImage}/>{target.kind==='product'&&<><label>Current value<input inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)}/></label><label>Price paid<input inputMode="decimal" value={pricePaid} onChange={e=>setPricePaid(e.target.value)}/></label><label>Condition<input value={condition} onChange={e=>setCondition(e.target.value)}/></label></>}<button className="mc-form-save" onClick={save}>Save Changes</button></div></BottomSheet>;
}

function CreateSheet({data,kind,selectedCategory,selectedSet,update,close,notify}:{data:StoreData;kind:CreateKind;selectedCategory:string;selectedSet:SetGroup|null;update:(s:StoreData)=>void;close:()=>void;notify:(s:string)=>void}){
  const [name,setName]=useState(''),[image,setImage]=useState(''),[value,setValue]=useState(''),[qty,setQty]=useState('1');
  const save=()=>{const clean=name.trim();if(!clean)return;
    if(kind==='category'){const key=categoryKey(clean);update({...data,libraryGroups:{...(data.libraryGroups||{}),[key]:{name:clean,coverImage:image,coverMode:'full'}}});notify('Category added')}
    if(kind==='collection'){const id=`collection-${Date.now().toString(36)}`;update({...data,collections:[...data.collections,{id,name:clean,icon:'Layers',color:'#ff1f2d',coverMode:'full',coverImage:image,libraryLine:selectedCategory||undefined}]});notify('Collection added')}
    if(kind==='product'){const col=selectedSet?.collectionId||data.collections.find(c=>c.id!=='unlabeled-system')?.id||data.collections[0]?.id||'';const item:Item={id:`item-${Date.now().toString(36)}`,collectionId:col,name:clean,category:selectedCategory||'Other',status:'owned',purchasePrice:0,currentValue:Math.max(0,Number(value)||0),quantity:Math.max(1,Math.floor(Number(qty)||1)),image,condition:'',purchaseDate:new Date().toISOString().slice(0,10),location:'',notes:'',customFields:{},createdAt:nowIso(),updatedAt:nowIso()};update({...data,items:[...data.items,item]});notify('Product added')}
    close();
  };
  return <BottomSheet title={`Add ${kind}`} close={close}><div className="mc-edit-form"><label>Name<input value={name} onChange={e=>setName(e.target.value)} autoFocus/></label><ImagePicker value={image} setValue={setImage}/>{kind==='product'&&<><label>Current value<input inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)}/></label><label>Quantity<input inputMode="numeric" value={qty} onChange={e=>setQty(e.target.value)}/></label></>}<button className="mc-form-save" onClick={save}>Add {kind}</button></div></BottomSheet>;
}

function ImagePicker({value,setValue}:{value:string;setValue:(v:string)=>void}){const input=useRef<HTMLInputElement|null>(null);return <div className="mc-image-picker">{value?<div className="mc-image-preview" style={{backgroundImage:`url(${value})`}}/>:<div className="mc-image-preview empty">No image</div>}<button onClick={()=>input.current?.click()}><Upload/>Upload image</button><input ref={input} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>setValue(String(reader.result||''));reader.readAsDataURL(f);e.currentTarget.value=''}}/></div>}

function ItemPickerSheet({data,target,category,selected,setSelected,close,commit}:{data:StoreData;target:SetGroup;category:string;selected:string[];setSelected:(v:string[])=>void;close:()=>void;commit:()=>void}){const [q,setQ]=useState('');const candidates=data.items.filter(i=>!target.items.some(x=>x.id===i.id)&&(!q||i.name.toLowerCase().includes(q.toLowerCase())));return <BottomSheet title={`Add to ${target.name}`} close={close} tall><label className="mc-picker-search"><Search/><input placeholder="Search your collection" value={q} onChange={e=>setQ(e.target.value)}/></label><div className="mc-picker-list">{candidates.map(i=><button key={i.id} onClick={()=>setSelected(selected.includes(i.id)?selected.filter(x=>x!==i.id):[...selected,i.id])}><span>{i.name}<small>{itemCategory(data,i)}</small></span><i className={selected.includes(i.id)?'checked':''}>{selected.includes(i.id)?'✓':''}</i></button>)}</div><button className="mc-form-save sticky" disabled={!selected.length} onClick={commit}>Add {selected.length||''} item{selected.length===1?'':'s'}</button></BottomSheet>}

function ProgressSheet({data,target,update,close,notify}:{data:StoreData;target:SetGroup;update:(s:StoreData)=>void;close:()=>void;notify:(s:string)=>void}){
  const current=getProgress(data,target),[enabled,setEnabled]=useState(current.enabled),[targetCount,setTargetCount]=useState(String(current.target||Math.max(target.items.length,1)));
  const save=()=>{const n=Math.max(1,Math.floor(Number(targetCount)||1));const groups={...(data.libraryGroups||{})};groups[target.key]={...(groups[target.key]||{}),progressEnabled:enabled,progressTarget:n} as any;update({...data,libraryGroups:groups});notify('Progress settings updated');close()};
  return <BottomSheet title="Set Progress" close={close}><div className="mc-edit-form"><button className="mc-progress-toggle" onClick={()=>setEnabled(v=>!v)}><span><b>Track progression</b><small>Show completion progress for this set.</small></span><i className={enabled?'on':''}/></button><label>Items needed to complete set<input inputMode="numeric" min="1" value={targetCount} onChange={e=>setTargetCount(e.target.value.replace(/[^0-9]/g,''))}/></label><div className="mc-progress-preview"><span>Progress: {current.owned}/{Math.max(1,Number(targetCount)||1)}</span><b>{Math.min(100,Math.round(current.owned/Math.max(1,Number(targetCount)||1)*100))}%</b><div><i style={{width:`${Math.min(100,Math.round(current.owned/Math.max(1,Number(targetCount)||1)*100))}%`}}/></div></div><button className="mc-form-save" onClick={save}>Save Progress</button></div></BottomSheet>;
}

function BottomSheet({title,close,children,tall=false}:{title:string;close:()=>void;children:React.ReactNode;tall?:boolean}){return <div className="mc-sheet-overlay" onClick={close}><section className={`mc-bottom-sheet ${tall?'tall':''}`} onClick={e=>e.stopPropagation()}><div className="mc-sheet-handle"/><header><span/><h3>{title}</h3><button onClick={close}><X/></button></header><div className="mc-sheet-scroll">{children}</div></section></div>}
function FilterBlock({title,copy,children}:{title:string;copy:string;children?:React.ReactNode}){return <section className="mc-filter-block"><h4>{title}</h4><p>{copy}</p><div>{children}</div></section>}
function SheetCheck({label,checked,setChecked}:{label:string;checked:boolean;setChecked:(v:boolean)=>void}){return <button className="mc-sheet-check" onClick={()=>setChecked(!checked)}><span>{label}</span><i className={checked?'checked':''}>{checked?'✓':''}</i></button>}

function MobileBottomNav({view,setView}:{view:MobileView;setView:(v:MobileView)=>void}){const tabs:[MobileView,string,React.ReactNode][]=[['home','Home',<Home key="h"/>],['portfolio','Portfolio',<Package key="p"/>],['search','Search',<Search key="s"/>],['shop','Wishlist',<Heart key="sh"/>],['social','Social',<Users key="so"/>],['profile','Profile',<UserCircle key="u"/>]];return <nav className="mc-bottom-nav">{tabs.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{icon}<span>{label}</span></button>)}</nav>}

function getProgress(data:StoreData,target:SetGroup){const meta=(data.libraryGroups?.[target.key]||{}) as any;const enabled=Boolean(meta.progressEnabled),targetCount=Math.max(1,Number(meta.progressTarget)||Math.max(target.items.length,1)),owned=target.items.filter(i=>ownedQty(i)>0).length,percent=Math.min(100,Math.round(owned/targetCount*100));return {enabled,target:targetCount,owned,percent}}
function coverStyle(url:string){return url?{backgroundImage:`linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.45)),url(${url})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}
function chartPoints(data:StoreData,portfolioId:string,currentValue:number,range:RangeKey){const cutoff=Date.now()-rangeMs(range);let pts=(data.history||[]).map(h=>({date:new Date(h.date).getTime(),value:portfolioId==='all'?Object.values(h.values).reduce((a,b)=>a+b,0):(h.values[portfolioId]||0)})).filter(p=>Number.isFinite(p.date)&&(range==='MAX'||p.date>=cutoff)).sort((a,b)=>a.date-b.date);const now=Date.now();if(!pts.length)pts=[{date:now-(Number.isFinite(rangeMs(range))?rangeMs(range):864e5),value:currentValue},{date:now,value:currentValue}];else if(Math.abs(pts[pts.length-1].value-currentValue)>.01)pts=[...pts,{date:now,value:currentValue}];if(pts.length===1)pts=[{date:pts[0].date-3600e3,value:pts[0].value},...pts];return pts}
function portfolioDelta(data:StoreData,portfolioId:string,currentValue:number,days:number){const points=chartPoints(data,portfolioId,currentValue,'MAX');const target=Date.now()-days*864e5;let base=points[0];for(const p of points){if(p.date<=target)base=p;else break}const delta=currentValue-base.value;return {delta,pct:base.value?delta/base.value*100:0}}
function sortItems(items:Item[],sort:string){const out=[...items];if(sort==='Price: Low to High')return out.sort((a,b)=>a.currentValue-b.currentValue);if(sort==='Price: High to Low')return out.sort((a,b)=>b.currentValue-a.currentValue);if(sort==='Product Name: A to Z')return out.sort((a,b)=>a.name.localeCompare(b.name));if(sort==='Product Name: Z to A')return out.sort((a,b)=>b.name.localeCompare(a.name));if(sort==='Date Added: Oldest First')return out.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));if(sort==='Date Added: Newest First')return out.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));if(sort.startsWith('Price Change'))return out.sort((a,b)=>{const av=itemChange(a).pct,bv=itemChange(b).pct;return sort.includes('Low')?av-bv:bv-av});return out}
function assignItemsToSet(data:StoreData,update:(s:StoreData)=>void,target:SetGroup,category:string,ids:string[]){let collectionId=target.collectionId,collections=data.collections;if(!collectionId){collectionId=`collection-${Date.now().toString(36)}`;collections=[...collections,{id:collectionId,name:target.name,icon:'Layers',color:'#ff1f2d',coverMode:'full',coverImage:target.cover,libraryLine:category}]}update({...data,collections,items:data.items.map(i=>ids.includes(i.id)?{...i,collectionId:collectionId!,updatedAt:nowIso()}:i)})}
function exportStore(data:StoreData){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`collector-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url)}
async function importFile(file:File,data:StoreData,update:(s:StoreData)=>void,notify:(s:string)=>void){try{const text=await file.text();if(file.name.toLowerCase().endsWith('.json')){const parsed=JSON.parse(text);const incoming:Array<Partial<Item>>=Array.isArray(parsed)?parsed:(Array.isArray(parsed.items)?parsed.items:[]);if(!incoming.length)throw new Error('No products found');const fallback=data.collections[0]?.id||'';const existing=new Map(data.items.map(i=>[i.id,i]));for(const raw of incoming){const id=String(raw.id||`item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`);existing.set(id,{id,collectionId:data.collections.some(c=>c.id===String(raw.collectionId))?String(raw.collectionId):fallback,name:String(raw.name||'Imported product'),category:String(raw.category||'Other'),status:raw.status==='wishlist'||raw.status==='sold'?raw.status:'owned',purchasePrice:Number(raw.purchasePrice)||0,currentValue:Number(raw.currentValue)||0,quantity:Math.max(1,Math.floor(Number(raw.quantity)||1)),image:String(raw.image||''),condition:String(raw.condition||''),purchaseDate:String(raw.purchaseDate||new Date().toISOString().slice(0,10)),location:String(raw.location||''),notes:String(raw.notes||''),customFields:raw.customFields&&typeof raw.customFields==='object'?raw.customFields as Record<string,string>:{},createdAt:String(raw.createdAt||nowIso()),updatedAt:nowIso()})}update({...data,items:Array.from(existing.values())});notify(`${incoming.length} products imported`);return}
    const lines=text.split(/\r?\n/).filter(Boolean),headers=parseCsvLine(lines.shift()||'').map(h=>h.trim().toLowerCase());if(!headers.length)throw new Error('Invalid CSV');const fallback=data.collections[0]?.id||'';const added:Item[]=[];for(const line of lines){const cols=parseCsvLine(line),row:Object=Object.fromEntries(headers.map((h,i)=>[h,cols[i]||''])),r=row as Record<string,string>,name=r.name||r.product||r.title;if(!name)continue;added.push({id:`item-${Date.now().toString(36)}-${added.length}`,collectionId:fallback,name,category:r.category||'Other',status:'owned',purchasePrice:Number(r['price paid']||r.purchaseprice)||0,currentValue:Number(r['current value']||r.currentvalue||r.price)||0,quantity:Math.max(1,Math.floor(Number(r.quantity)||1)),image:r.image||r.imageurl||'',condition:r.condition||'',purchaseDate:r['purchase date']||new Date().toISOString().slice(0,10),location:'',notes:'',customFields:{},createdAt:nowIso(),updatedAt:nowIso()})}update({...data,items:[...data.items,...added]});notify(`${added.length} products imported`)}catch(e){notify(e instanceof Error?e.message:'Import failed')}}
function parseCsvLine(line:string){const out:string[]=[],re=/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;let m;while((m=re.exec(line)))out.push((m[1]||'').replace(/^"|"$/g,'').replace(/""/g,'"'));return out}

'use client';

import {useMemo,useState} from 'react';
import {
  Bell,Check,ChevronDown,ChevronLeft,Cloud,DollarSign,Edit3,FolderInput,
  Heart,Home as HomeIcon,ImagePlus,Layers3,ListChecks,Package,Plus,Search,
  Settings,SlidersHorizontal,Star,Trash2,UserCircle,X
} from 'lucide-react';
import {Item,Store,money} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import CloudPanel from './CloudPanel';
import ItemDetail from './ItemDetail';
import ValueChart from './ValueChart';

const UNLABELED_COLLECTION='unlabeled-system';
const SYS_BRAND='__unlabeled_brand__';
const SYS_CATEGORY='__unlabeled_category__';
const RED='#ff1f2d';

type View='home'|'collections'|'portfolio'|'watchlist'|'finance'|'profile';
type Screen={brandId?:string;categoryId?:string};
type BrandDef={id:string;name:string;image:string;group:string};
type CategoryDef={
  id:string;brandId:string;name:string;image:string;
  progressBased:boolean;target:number;releaseDate:string;
};
type Organizer={brands:BrandDef[];categories:CategoryDef[]};
type ExtendedPrefs=NonNullable<Store['preferences']>&{
  organizerV2?:Organizer;
  monthlyCollectingBudget?:number;
};

const defaultBrand:BrandDef={id:SYS_BRAND,name:'Unlabeled',image:'',group:'Other'};
const defaultCategory:CategoryDef={
  id:SYS_CATEGORY,brandId:SYS_BRAND,name:'Unlabeled',image:'',
  progressBased:false,target:0,releaseDate:''
};

function prefs(data:Store):ExtendedPrefs{
  return (data.preferences||{
    accentColor:RED,
    density:'comfortable',
    cardSize:'standard',
    reducedMotion:false
  }) as ExtendedPrefs;
}
function organizer(data:Store):Organizer{
  const saved=prefs(data).organizerV2;
  const brands=[defaultBrand,...(saved?.brands||[]).filter(b=>b.id!==SYS_BRAND)];
  const categories=[defaultCategory,...(saved?.categories||[]).filter(c=>c.id!==SYS_CATEGORY)];
  return {brands,categories};
}
function brandId(item:Item){return item.customFields?.__v2BrandId||SYS_BRAND}
function categoryId(item:Item){return item.customFields?.__v2CategoryId||SYS_CATEGORY}
function owned(items:Item[]){return items.filter(i=>i.status==='owned')}
function totalValue(items:Item[]){return owned(items).reduce((s,i)=>s+i.currentValue*Math.max(1,i.quantity),0)}
function totalCost(items:Item[]){return owned(items).reduce((s,i)=>s+i.purchasePrice*Math.max(1,i.quantity),0)}
function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}
function recentChange(item:Item){
  const pts=(item.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(pts.length<2)return 0;
  return (pts.at(-1)?.value||item.currentValue)-(pts[Math.max(0,pts.length-8)]?.value||item.currentValue);
}
function recentPct(item:Item){
  const pts=(item.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(pts.length<2)return 0;
  const prev=pts[Math.max(0,pts.length-8)]?.value||0;
  const now=pts.at(-1)?.value||item.currentValue;
  return prev?((now-prev)/prev)*100:0;
}
function identifier(item:Item){
  const rarity=(item.customFields?.Rarity||'').trim();
  const number=(item.identity?.collectorNumber||item.customFields?.['Card #']||item.identity?.modelNumber||'').trim();
  const edition=(item.identity?.edition||'').trim();
  const bits:string[]=[];
  if(rarity)bits.push(rarity);
  else if(edition&&edition.toLowerCase()!=='normal')bits.push(edition);
  if(number)bits.push(number);
  return bits.join(' • ');
}
function uniqueOwned(items:Item[]){
  return new Set(owned(items).map(i=>i.identity?.collectorNumber||i.identity?.upc||i.id)).size;
}
function uid(prefix:string){return `${prefix}-${crypto.randomUUID()}`}
function assign(item:Item,bid:string,cid:string):Item{
  return {
    ...item,
    collectionId:UNLABELED_COLLECTION,
    customFields:{...(item.customFields||{}),__v2BrandId:bid,__v2CategoryId:cid},
    updatedAt:new Date().toISOString()
  };
}
function removeAssignment(item:Item):Item{
  const cf={...(item.customFields||{})};
  delete cf.__v2BrandId;
  delete cf.__v2CategoryId;
  return {...item,collectionId:UNLABELED_COLLECTION,customFields:cf,updatedAt:new Date().toISOString()};
}
function structureItems(data:Store,bid:string,cid?:string){
  return data.items.filter(i=>brandId(i)===bid&&(!cid||categoryId(i)===cid));
}
function sanitizeName(v:string){return v.trim().replace(/\s+/g,' ')}
async function imageToDataUrl(file:File,width=1600,height=900){
  const src=await new Promise<string>((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result||''));
    r.onerror=()=>reject(r.error);
    r.readAsDataURL(file);
  });
  const img=await new Promise<HTMLImageElement>((resolve,reject)=>{
    const x=new Image();
    x.onload=()=>resolve(x);x.onerror=reject;x.src=src;
  });
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)return src;
  ctx.clearRect(0,0,width,height);
  const scale=Math.min(width/img.width,height/img.height);
  const w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,(width-w)/2,(height-h)/2,w,h);
  return canvas.toDataURL('image/webp',.9);
}

export default function Page(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [view,setView]=useState<View>('home');
  const [screen,setScreen]=useState<Screen>({});
  const [detail,setDetail]=useState<Item|null>(null);
  const [cloudOpen,setCloudOpen]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const org=organizer(data);
  const p=prefs(data);

  function update(next:Store){cloud.update(next)}
  function saveItem(item:Item){
    const exists=data.items.some(i=>i.id===item.id);
    update({...data,items:exists?data.items.map(i=>i.id===item.id?item:i):[item,...data.items]});
    setEditingItem(null);
    if(detail?.id===item.id)setDetail(item);
  }
  function deleteItem(item:Item){
    if(!confirm(`Delete "${item.name}"?`))return;
    update({...data,items:data.items.filter(i=>i.id!==item.id)});
    setDetail(null);
  }
  function increment(item:Item){
    saveItem({...item,status:'owned',quantity:item.status==='owned'?item.quantity+1:1,updatedAt:new Date().toISOString()});
  }
  function setOrganizer(next:Organizer){
    update({...data,preferences:{...p,organizerV2:next} as Store['preferences']});
  }
  function go(next:View){setView(next);setScreen({});setDetail(null)}

  if(!ready)return <div className="cr-loading">Loading Collector…</div>;

  if(detail){
    const live=data.items.find(i=>i.id===detail.id)||detail;
    return <div className="cr-app" style={{'--accent':p.accentColor||RED} as React.CSSProperties}>
      <DesktopHeader view={view} go={go} status={cloud.status} openCloud={()=>setCloudOpen(true)}/>
      <ItemDetail
        item={live}
        collection={data.collections.find(c=>c.id===live.collectionId)}
        close={()=>setDetail(null)}
        edit={()=>{setEditingItem(live);setDetail(null)}}
        remove={()=>deleteItem(live)}
        save={saveItem}
      />
      <MobileNav view={view} go={go}/>
      {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={()=>{}} recovery={()=>{}}/>}
      {editingItem&&<ProductEditor item={editingItem} close={()=>setEditingItem(null)} save={saveItem}/>}
    </div>
  }

  return <div className="cr-app" style={{'--accent':p.accentColor||RED} as React.CSSProperties}>
    <DesktopHeader view={view} go={go} status={cloud.status} openCloud={()=>setCloudOpen(true)}/>
    <main className="cr-main">
      {view==='home'&&<Home data={data} org={org} openItem={setDetail} openCollections={()=>go('collections')}/>}
      {view==='collections'&&<Collections
        data={data} org={org} screen={screen} setScreen={setScreen}
        update={update} setOrganizer={setOrganizer}
        openItem={setDetail} addItem={()=>setEditingItem(blankItem())} increment={increment}
      />}
      {view==='portfolio'&&<ProductsPage
        title="Portfolio" subtitle="Collecting" data={data} items={owned(data.items)}
        org={org} update={update} openItem={setDetail} increment={increment}
      />}
      {view==='watchlist'&&<ProductsPage
        title="Watchlist" subtitle="Watched Products" data={data} items={data.items.filter(watched)}
        org={org} update={update} openItem={setDetail} increment={increment}
      />}
      {view==='finance'&&<Finance data={data} update={update}/>}
      {view==='profile'&&<Profile data={data} update={update} openCloud={()=>setCloudOpen(true)}/>}
    </main>
    <MobileNav view={view} go={go}/>
    {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={()=>{}} recovery={()=>{}}/>}
    {editingItem&&<ProductEditor item={editingItem} close={()=>setEditingItem(null)} save={saveItem}/>}
  </div>
}

function DesktopHeader({view,go,status,openCloud}:{view:View;go:(v:View)=>void;status:string;openCloud:()=>void}){
  const tabs:[View,string][]=[
    ['home','Home'],['collections','Collections'],['portfolio','Portfolio'],
    ['watchlist','Watchlist'],['finance','Finance'],['profile','Profile']
  ];
  return <header className="cr-header"><div className="cr-header-inner">
    <button className="cr-wordmark" onClick={()=>go('home')}>COLLECTOR<span>COLLECT · TRACK · VALUE</span></button>
    <nav>{tabs.map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>go(id)}>{label}</button>)}</nav>
    <div className="cr-header-right">
      <button className="cr-cloud" onClick={openCloud}><Cloud size={14}/><span>{status}</span></button>
      <b>USD</b><button><Bell size={16}/></button>
    </div>
  </div></header>
}

function MobileNav({view,go}:{view:View;go:(v:View)=>void}){
  const tabs:[View,string,React.ReactNode][]=[
    ['home','Home',<HomeIcon key="h"/>],
    ['collections','Collections',<Layers3 key="c"/>],
    ['portfolio','Portfolio',<Package key="p"/>],
    ['finance','Finance',<DollarSign key="f"/>],
    ['profile','Profile',<UserCircle key="u"/>]
  ];
  return <nav className="cr-mobile-nav">{tabs.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>go(id)}>{icon}<span>{label}</span></button>)}</nav>
}

function Home({data,org,openItem,openCollections}:{data:Store;org:Organizer;openItem:(i:Item)=>void;openCollections:()=>void}){
  const value=totalValue(data.items),cost=totalCost(data.items);
  const top=[...owned(data.items)].sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).slice(0,4);
  const brandRows=org.brands.map(b=>({brand:b,items:structureItems(data,b.id)})).filter(x=>x.items.length||x.brand.id===SYS_BRAND);
  return <div className="cr-page cr-home">
    <section className="cr-chart-shell"><ValueChart data={data} collectionId="all" value={value} cost={cost}/></section>
    <section className="cr-panel cr-most">
      <div className="cr-panel-title"><h2>Most Valuable</h2></div>
      {top.map(i=><button className="cr-most-row" key={i.id} onClick={()=>openItem(i)}>
        <div><b>{i.name}</b><small>{i.identity?.series||i.category||'Collectible'}</small></div>
        <strong>{money(i.currentValue*i.quantity)}</strong>
      </button>)}
    </section>
    <section className="cr-home-collections">
      <div className="cr-panel-title"><h2>Collections</h2><button onClick={openCollections}>View All</button></div>
      {brandRows.slice(0,6).map(({brand,items})=><button className="cr-home-collection-row" onClick={openCollections} key={brand.id}>
        <div className="cr-home-collection-img">{brand.image?<img src={brand.image} alt=""/>:<span>{brand.name.slice(0,2).toUpperCase()}</span>}</div>
        <b>{brand.name}</b><strong>{money(totalValue(items))}</strong>
      </button>)}
    </section>
  </div>
}

function Collections({
  data,org,screen,setScreen,update,setOrganizer,openItem,addItem,increment
}:{
  data:Store;org:Organizer;screen:Screen;setScreen:(s:Screen)=>void;
  update:(d:Store)=>void;setOrganizer:(o:Organizer)=>void;
  openItem:(i:Item)=>void;addItem:()=>void;increment:(i:Item)=>void;
}){
  const [query,setQuery]=useState('');
  const [starOnly,setStarOnly]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [editBrand,setEditBrand]=useState<BrandDef|null>(null);
  const [editCategory,setEditCategory]=useState<CategoryDef|null>(null);
  const [manageCategory,setManageCategory]=useState<CategoryDef|null>(null);
  const [moving,setMoving]=useState<Item|null>(null);
  const [group,setGroup]=useState('All');
  const brand=org.brands.find(b=>b.id===screen.brandId);
  const category=org.categories.find(c=>c.id===screen.categoryId);

  function saveOrg(next:Organizer){setOrganizer(next)}
  function updateItems(nextItems:Item[]){
    const map=new Map(nextItems.map(i=>[i.id,i]));
    update({...data,items:data.items.map(i=>map.get(i.id)||i)});
  }

  if(!brand){
    const groups=['All',...Array.from(new Set(org.brands.map(b=>b.group||'Other')))];
    const shown=org.brands.filter(b=>{
      const items=structureItems(data,b.id);
      return (group==='All'||b.group===group)&&
        b.name.toLowerCase().includes(query.toLowerCase())&&
        (!starOnly||items.some(watched));
    });
    return <div className="cr-page cr-collections">
      <CollectrSearch
        title="Collections"
        query={query} setQuery={setQuery} placeholder="Search collections..."
        star={starOnly} toggleStar={()=>setStarOnly(v=>!v)}
        editing={editMode} toggleEdit={()=>setEditMode(v=>!v)}
        filterOpen={filterOpen} toggleFilter={()=>setFilterOpen(v=>!v)}
        filter={<>{groups.map(g=><button key={g} className={group===g?'active':''} onClick={()=>{setGroup(g);setFilterOpen(false)}}>{g}</button>)}</>}
      />
      <div className="cr-toolbar-line">
        <span>{group==='All'?'Quick Filters':group}</span>
        {editMode&&<button className="cr-add-ghost" onClick={()=>setEditBrand({id:uid('brand'),name:'',image:'',group:'Collectible Brands'})}><Plus size={15}/> New Brand</button>}
      </div>
      <div className="cr-brand-grid">{shown.map(b=><article key={b.id} className="cr-brand-wrap">
        <button className="cr-brand-tile" onClick={()=>{setScreen({brandId:b.id});setQuery('')}}>
          {b.image?<img src={b.image} alt=""/>:<span>{b.name}</span>}
        </button>
        {editMode&&<button className="cr-tile-edit" onClick={()=>setEditBrand(b)}><Edit3 size={13}/> Edit</button>}
      </article>)}</div>
      {editBrand&&<BrandEditor brand={editBrand} close={()=>setEditBrand(null)} save={next=>{
        const exists=org.brands.some(b=>b.id===next.id);
        saveOrg({...org,brands:exists?org.brands.map(b=>b.id===next.id?next:b):[...org.brands,next]});
        setEditBrand(null);
      }} remove={editBrand.id===SYS_BRAND?undefined:()=>{
        saveOrg({...org,brands:org.brands.filter(b=>b.id!==editBrand.id),categories:org.categories.filter(c=>c.brandId!==editBrand.id)});
        update({...data,items:data.items.map(i=>brandId(i)===editBrand.id?removeAssignment(i):i)});
        setEditBrand(null);
      }}/>}
    </div>;
  }

  if(!category){
    const cats=org.categories.filter(c=>c.brandId===brand.id);
    const shown=cats.filter(c=>{
      const items=structureItems(data,brand.id,c.id);
      return c.name.toLowerCase().includes(query.toLowerCase())&&(!starOnly||items.some(watched));
    });
    return <div className="cr-page cr-collections">
      <Breadcrumb onBack={()=>setScreen({})} label={brand.name}/>
      <CollectrSearch
        title={`${brand.name} Collections`}
        query={query} setQuery={setQuery} placeholder="Search by collection..."
        star={starOnly} toggleStar={()=>setStarOnly(v=>!v)}
        editing={editMode} toggleEdit={()=>setEditMode(v=>!v)}
        filterOpen={filterOpen} toggleFilter={()=>setFilterOpen(v=>!v)}
        filter={<><button className="active" onClick={()=>setFilterOpen(false)}>All Collections</button></>}
      />
      <div className="cr-toolbar-line">
        <span>Collections</span>
        {editMode&&<button className="cr-add-ghost" onClick={()=>setEditCategory({
          id:uid('category'),brandId:brand.id,name:'',image:'',progressBased:false,target:0,releaseDate:''
        })}><Plus size={15}/> New Collection</button>}
      </div>
      <div className="cr-category-grid">{shown.map(c=>{
        const items=structureItems(data,brand.id,c.id);
        const progress=c.progressBased&&c.target>0?Math.min(100,uniqueOwned(items)/c.target*100):0;
        return <article className="cr-category-wrap" key={c.id}>
          <button className="cr-category-card" onClick={()=>{setScreen({brandId:brand.id,categoryId:c.id});setQuery('')}}>
            <div className="cr-category-media">
              {c.image?<img src={c.image} alt=""/>:<span>{c.name}</span>}
              {c.releaseDate&&<em>{new Date(c.releaseDate).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</em>}
              {c.progressBased&&c.target>0&&<div className="cr-progress-strip"><i style={{width:`${progress}%`}}/><b>{progress.toFixed(0)}%</b></div>}
            </div>
            <h3>{c.name}</h3>
            <p>{c.progressBased&&c.target>0?`Progress: ${uniqueOwned(items)} / ${c.target}`:`Items: ${owned(items).reduce((n,i)=>n+i.quantity,0)}`}</p>
            <p>Total value: {money(totalValue(items))}</p>
          </button>
          {editMode&&<button className="cr-tile-edit" onClick={()=>setEditCategory(c)}><Edit3 size={13}/> Edit</button>}
        </article>;
      })}</div>
      {editCategory&&<CategoryEditor category={editCategory} close={()=>setEditCategory(null)} save={next=>{
        const exists=org.categories.some(c=>c.id===next.id);
        saveOrg({...org,categories:exists?org.categories.map(c=>c.id===next.id?next:c):[...org.categories,next]});
        setEditCategory(null);
      }} remove={editCategory.id===SYS_CATEGORY?undefined:()=>{
        saveOrg({...org,categories:org.categories.filter(c=>c.id!==editCategory.id)});
        update({...data,items:data.items.map(i=>categoryId(i)===editCategory.id?removeAssignment(i):i)});
        setEditCategory(null);
      }}/>}
    </div>;
  }

  const items=structureItems(data,brand.id,category.id).filter(i=>
    `${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(query.toLowerCase())&&
    (!starOnly||watched(i))
  );

  return <div className="cr-page cr-collections">
    <Breadcrumb onBack={()=>setScreen({brandId:brand.id})} label={category.name}/>
    <CollectrSearch
      title={`Find a Product in ${category.name}`}
      query={query} setQuery={setQuery} placeholder="Search any product..."
      star={starOnly} toggleStar={()=>setStarOnly(v=>!v)}
      editing={editMode} toggleEdit={()=>setEditMode(v=>!v)}
      filterOpen={filterOpen} toggleFilter={()=>setFilterOpen(v=>!v)}
      extra={<button className="cr-round" onClick={()=>setManageCategory(category)} title="Add or remove items"><FolderInput size={18}/></button>}
      filter={<><button className="active" onClick={()=>setFilterOpen(false)}>All Products</button></>}
    />

    <CategorySummary category={category} items={items}/>

    <div className="cr-list-toolbar">
      <div><button className="active">All</button></div>
      <button className="cr-add-item" onClick={addItem}><Plus size={15}/> Add Item</button>
    </div>

    <ProductGrid
      items={items} editMode={editMode} openItem={openItem} increment={increment}
      move={setMoving}
    />

    {manageCategory&&<MembershipModal
      data={data} org={org} category={manageCategory}
      close={()=>setManageCategory(null)}
      save={changed=>{updateItems(changed);setManageCategory(null)}}
    />}
    {moving&&<MoveModal item={moving} org={org} close={()=>setMoving(null)} save={next=>{updateItems([next]);setMoving(null)}}/>}
  </div>;
}

function Breadcrumb({onBack,label}:{onBack:()=>void;label:string}){
  return <div className="cr-breadcrumb"><button onClick={onBack}><ChevronLeft size={17}/></button><span>Collections</span><b>›</b><strong>{label}</strong></div>
}

function CollectrSearch({
  title,query,setQuery,placeholder,star,toggleStar,editing,toggleEdit,
  filterOpen,toggleFilter,filter,extra
}:{
  title:string;query:string;setQuery:(s:string)=>void;placeholder:string;
  star:boolean;toggleStar:()=>void;editing:boolean;toggleEdit:()=>void;
  filterOpen:boolean;toggleFilter:()=>void;filter:React.ReactNode;extra?:React.ReactNode
}){
  return <section className="cr-search-panel">
    <h2>{title}</h2>
    <div className="cr-search-row">
      <label><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder}/>{query&&<button onClick={()=>setQuery('')}><X size={15}/></button>}</label>
      <button className="cr-search-action" onClick={toggleStar}><Star size={17} fill={star?'currentColor':'none'}/></button>
      <button className={`cr-search-action ${editing?'active':''}`} onClick={toggleEdit}><Edit3 size={17}/></button>
      {extra}
      <div className="cr-filter-wrap">
        <button className="cr-search-action" onClick={toggleFilter}><SlidersHorizontal size={17}/></button>
        {filterOpen&&<div className="cr-filter-menu">{filter}</div>}
      </div>
    </div>
  </section>
}

function CategorySummary({category,items}:{category:CategoryDef;items:Item[]}){
  const progress=category.progressBased&&category.target>0?Math.min(100,uniqueOwned(items)/category.target*100):0;
  return <section className="cr-category-summary">
    <div className="cr-category-summary-img">{category.image?<img src={category.image} alt=""/>:<span>{category.name}</span>}</div>
    <div>
      <h2>{category.name}</h2>
      <p>{category.progressBased&&category.target>0?<>Progress: <b>{uniqueOwned(items)} / {category.target}</b></>:<>Items: <b>{owned(items).reduce((n,i)=>n+i.quantity,0)}</b></>}</p>
      <p>Total Value: <b>{money(totalValue(items))}</b></p>
      <p>Released Date: <span>{category.releaseDate?new Date(category.releaseDate).toLocaleDateString():'—'}</span></p>
      {category.progressBased&&category.target>0&&<div className="cr-summary-progress"><i style={{width:`${progress}%`}}/></div>}
    </div>
  </section>
}

function ProductGrid({
  items,editMode,openItem,increment,move
}:{
  items:Item[];editMode:boolean;openItem:(i:Item)=>void;increment:(i:Item)=>void;move:(i:Item)=>void
}){
  return <div className="cr-product-grid">{items.map(item=><ProductCard
    key={item.id} item={item} editMode={editMode} open={()=>openItem(item)}
    add={()=>increment(item)} move={()=>move(item)}
  />)}</div>
}

function ProductCard({item,editMode,open,add,move}:{item:Item;editMode:boolean;open:()=>void;add:()=>void;move:()=>void}){
  const change=recentChange(item),pct=recentPct(item);
  return <article className="cr-product-card">
    <button className="cr-product-open" onClick={open}>
      <div className="cr-product-media">
        <img src={item.image||'/art/empty.svg'} alt={item.name}/>
        {watched(item)&&<Heart className="cr-heart" size={13} fill="currentColor"/>}
      </div>
      <div className="cr-product-info">
        <h3>{item.name}</h3>
        <a>{item.identity?.series||item.category||'Collectible'}</a>
        {identifier(item)&&<p>{identifier(item)}</p>}
        <strong>{money(item.currentValue)}</strong>
        <small className={change>=0?'gain':'loss'}>{change>=0?'▲':'▼'} {change>=0?'+':'-'}{money(Math.abs(change))} ({pct>=0?'+':''}{pct.toFixed(2)}%)</small>
        <span>Qty: {item.status==='owned'?item.quantity:0}</span>
      </div>
    </button>
    {editMode&&<button className="cr-move-product" onClick={move}><FolderInput size={14}/></button>}
    <button className="cr-add-one" onClick={add}><Plus size={16}/></button>
  </article>
}

function ProductsPage({
  title,subtitle,data,items,org,update,openItem,increment
}:{
  title:string;subtitle:string;data:Store;items:Item[];org:Organizer;update:(d:Store)=>void;
  openItem:(i:Item)=>void;increment:(i:Item)=>void
}){
  const [q,setQ]=useState('');
  const [star,setStar]=useState(false);
  const [edit,setEdit]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);
  const [moving,setMoving]=useState<Item|null>(null);
  const shown=items.filter(i=>`${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(q.toLowerCase())&&(!star||watched(i)));
  function updateOne(next:Item){update({...data,items:data.items.map(i=>i.id===next.id?next:i)})}
  return <div className="cr-page">
    <CollectrSearch title={title} query={q} setQuery={setQ} placeholder="Search your collection..."
      star={star} toggleStar={()=>setStar(v=>!v)} editing={edit} toggleEdit={()=>setEdit(v=>!v)}
      filterOpen={filterOpen} toggleFilter={()=>setFilterOpen(v=>!v)}
      filter={<><button className="active" onClick={()=>setFilterOpen(false)}>All Products</button></>}/>
    <section className="cr-portfolio-heading"><div><small>{subtitle}</small><h1>{money(totalValue(items))}</h1><p>{owned(items).reduce((n,i)=>n+i.quantity,0)} items</p></div></section>
    <ProductGrid items={shown} editMode={edit} openItem={openItem} increment={increment} move={setMoving}/>
    {moving&&<MoveModal item={moving} org={org} close={()=>setMoving(null)} save={next=>{updateOne(next);setMoving(null)}}/>}
  </div>
}

function Finance({data,update}:{data:Store;update:(d:Store)=>void}){
  const p=prefs(data);
  const budget=Number(p.monthlyCollectingBudget||0);
  const month=new Date().toISOString().slice(0,7);
  const spent=owned(data.items).filter(i=>i.purchaseDate?.startsWith(month)).reduce((s,i)=>s+i.purchasePrice*i.quantity,0);
  const left=Math.max(0,budget-spent);
  return <div className="cr-page">
    <section className="cr-finance-head"><small>FINANCE</small><h1>Monthly Collecting Budget</h1></section>
    <div className="cr-finance-grid">
      <section className="cr-panel"><span>Budget</span><h2>{money(budget)}</h2><input type="number" min="0" value={budget} onChange={e=>update({...data,preferences:{...p,monthlyCollectingBudget:Number(e.target.value)||0} as Store['preferences']})}/></section>
      <section className="cr-panel"><span>Spent this month</span><h2>{money(spent)}</h2></section>
      <section className="cr-panel"><span>Remaining</span><h2 className="gain">{money(left)}</h2></section>
    </div>
  </div>
}

function Profile({data,update,openCloud}:{data:Store;update:(d:Store)=>void;openCloud:()=>void}){
  const [name,setName]=useState(data.profile?.name||'Collector');
  return <div className="cr-page"><section className="cr-profile-card">
    <UserCircle size={72}/><div><h1>{name}</h1><p>{owned(data.items).length} products · {money(totalValue(data.items))}</p></div>
  </section><section className="cr-panel cr-profile-form">
    <label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <button onClick={()=>update({...data,profile:{name,image:data.profile?.image||''}})}>Save</button>
    <button onClick={openCloud}><Cloud size={15}/> Cloud Sync</button>
  </section></div>
}

function BrandEditor({brand,close,save,remove}:{brand:BrandDef;close:()=>void;save:(b:BrandDef)=>void;remove?:()=>void}){
  const [draft,setDraft]=useState(brand);
  return <Modal title="Edit Brand" close={close}>
    <div className="cr-form">
      <label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Group<input value={draft.group} onChange={e=>setDraft({...draft,group:e.target.value})}/></label>
      <DirectImage value={draft.image} setValue={image=>setDraft({...draft,image})} width={1600} height={900}/>
    </div>
    <div className="cr-modal-actions">{remove&&<button className="danger" onClick={remove}><Trash2 size={14}/> Delete</button>}<span/><button onClick={close}>Cancel</button><button className="primary" onClick={()=>save({...draft,name:sanitizeName(draft.name)||'Untitled'})}>Save</button></div>
  </Modal>
}

function CategoryEditor({category,close,save,remove}:{category:CategoryDef;close:()=>void;save:(c:CategoryDef)=>void;remove?:()=>void}){
  const [draft,setDraft]=useState(category);
  return <Modal title="Edit Collection" close={close}>
    <div className="cr-form">
      <label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <DirectImage value={draft.image} setValue={image=>setDraft({...draft,image})} width={1600} height={900}/>
      <label>Release date<input type="date" value={draft.releaseDate} onChange={e=>setDraft({...draft,releaseDate:e.target.value})}/></label>
      <label className="cr-check"><input type="checkbox" checked={draft.progressBased} onChange={e=>setDraft({...draft,progressBased:e.target.checked})}/><span><b>Progress-based collection</b><small>Show completion percentage and progress bar.</small></span></label>
      {draft.progressBased&&<label>Items needed to complete<input type="number" min="1" value={draft.target||''} onChange={e=>setDraft({...draft,target:Math.max(0,Number(e.target.value)||0)})}/></label>}
    </div>
    <div className="cr-modal-actions">{remove&&<button className="danger" onClick={remove}><Trash2 size={14}/> Delete</button>}<span/><button onClick={close}>Cancel</button><button className="primary" onClick={()=>save({...draft,name:sanitizeName(draft.name)||'Untitled'})}>Save</button></div>
  </Modal>
}

function DirectImage({value,setValue,width,height}:{value:string;setValue:(s:string)=>void;width:number;height:number}){
  const [busy,setBusy]=useState(false);
  return <label>Cover image
    <div className="cr-upload-preview">{value?<img src={value} alt=""/>:<ImagePlus size={26}/>}</div>
    <div className="cr-upload-actions">
      <span className="cr-upload-button"><ImagePlus size={14}/> Upload from computer
        <input hidden type="file" accept="image/*" onChange={async e=>{
          const file=e.target.files?.[0];if(!file)return;
          setBusy(true);try{setValue(await imageToDataUrl(file,width,height))}finally{setBusy(false)}
        }}/>
      </span>
      {value&&<button type="button" onClick={()=>setValue('')}>Remove</button>}
    </div>
    {busy&&<small>Optimizing image…</small>}
  </label>
}

function MembershipModal({data,org,category,close,save}:{data:Store;org:Organizer;category:CategoryDef;close:()=>void;save:(items:Item[])=>void}){
  const [q,setQ]=useState('');
  const current=new Set<string>(data.items.filter((i:Item)=>categoryId(i)===category.id).map((i:Item)=>i.id));
  const [selected,setSelected]=useState<Set<string>>(new Set(current));
  const visible=data.items.filter(i=>`${i.name} ${i.identity?.series||''}`.toLowerCase().includes(q.toLowerCase()));
  return <Modal title={`Manage ${category.name}`} close={close} wide>
    <div className="cr-membership-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search all products..."/></div>
    <div className="cr-membership-actions"><button onClick={()=>setSelected(new Set(visible.map(i=>i.id)))}><ListChecks size={14}/> Select All</button><button onClick={()=>setSelected(new Set())}>Clear</button></div>
    <div className="cr-membership-list">{visible.map(i=><label key={i.id}>
      <input type="checkbox" checked={selected.has(i.id)} onChange={()=>setSelected(prev=>{const n=new Set(prev);n.has(i.id)?n.delete(i.id):n.add(i.id);return n})}/>
      <img src={i.image||'/art/empty.svg'} alt=""/>
      <span><b>{i.name}</b><small>{i.identity?.series||i.category||'Collectible'}</small></span>
    </label>)}</div>
    <div className="cr-modal-actions"><span/><button onClick={close}>Cancel</button><button className="primary" onClick={()=>{
      const changed=data.items.filter(i=>current.has(i.id)!==selected.has(i.id)).map(i=>{
        if(selected.has(i.id))return assign(i,category.brandId,category.id);
        return removeAssignment(i);
      });
      save(changed);
    }}>Save</button></div>
  </Modal>
}

function MoveModal({item,org,close,save}:{item:Item;org:Organizer;close:()=>void;save:(i:Item)=>void}){
  const [q,setQ]=useState('');
  return <Modal title="Move Product" close={close} wide>
    <div className="cr-membership-search"><Search size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search collections..."/></div>
    <div className="cr-destination-list">
      {org.brands.map(b=>{
        const cats=org.categories.filter(c=>c.brandId===b.id&&`${b.name} ${c.name}`.toLowerCase().includes(q.toLowerCase()));
        if(!cats.length)return null;
        return <section key={b.id}><h3>{b.name}</h3>{cats.map(c=><button key={c.id} onClick={()=>save(assign(item,b.id,c.id))}><span>{c.name}</span><ChevronDown size={14}/></button>)}</section>;
      })}
    </div>
    <div className="cr-modal-actions"><button className="danger" onClick={()=>save(removeAssignment(item))}>Remove from Collections</button><span/><button onClick={close}>Cancel</button></div>
  </Modal>
}

function ProductEditor({item,close,save}:{item:Item;close:()=>void;save:(i:Item)=>void}){
  const [draft,setDraft]=useState(item);
  return <Modal title={item.name?'Edit Product':'Add Product'} close={close} wide>
    <div className="cr-form">
      <label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <DirectImage value={draft.image} setValue={image=>setDraft({...draft,image})} width={1200} height={1200}/>
      <label>Current value<input type="number" min="0" step=".01" value={draft.currentValue} onChange={e=>setDraft({...draft,currentValue:Number(e.target.value)||0})}/></label>
      <label>Price paid<input type="number" min="0" step=".01" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)||0})}/></label>
      <label>Quantity<input type="number" min="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value)||1)})}/></label>
      <label>Series / Set<input value={draft.identity?.series||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),series:e.target.value}})}/></label>
      <label>Identifier<input value={draft.identity?.collectorNumber||''} onChange={e=>setDraft({...draft,identity:{...(draft.identity||{}),collectorNumber:e.target.value}})}/></label>
      <label>Condition<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label>
    </div>
    <div className="cr-modal-actions"><span/><button onClick={close}>Cancel</button><button className="primary" onClick={()=>save({...draft,collectionId:UNLABELED_COLLECTION,name:sanitizeName(draft.name)||'Untitled',updatedAt:new Date().toISOString()})}>Save</button></div>
  </Modal>
}

function Modal({title,close,children,wide}:{title:string;close:()=>void;children:React.ReactNode;wide?:boolean}){
  return <div className="cr-overlay"><section className={`cr-modal ${wide?'wide':''}`}>
    <header><h2>{title}</h2><button onClick={close}><X size={18}/></button></header>{children}
  </section></div>
}

function blankItem():Item{
  const now=new Date().toISOString();
  return {
    id:crypto.randomUUID(),collectionId:UNLABELED_COLLECTION,name:'',category:'',
    status:'owned',purchasePrice:0,currentValue:0,quantity:1,image:'',
    condition:'Excellent / Like New',purchaseDate:'',location:'',notes:'',
    customFields:{},createdAt:now,updatedAt:now
  };
}

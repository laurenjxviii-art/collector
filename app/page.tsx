'use client';

import {useMemo,useState} from 'react';
import {
  Bell,Check,ChevronLeft,Cloud,FolderInput,FolderMinus,Heart,Home as HomeIcon,
  Landmark,Library,ListChecks,Package,Pencil,PieChart,Plus,Search,Settings,
  SlidersHorizontal,Star,UserCircle,X
} from 'lucide-react';
import {
  Collection,Item,Store,money,itemLibraryType
} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import CloudPanel from './CloudPanel';
import ItemDetail from './ItemDetail';
import ValueChart from './ValueChart';

const RED='#ff1f2d';
const UNLABELED='unlabeled-system';

type MainView='home'|'collections'|'portfolio'|'finance'|'profile';
type BrandStep={brand?:string;category?:string};
type BrandGroup='All Brands'|'TCG Brands'|'Sports Card Brands'|'Collectible Brands'|'Comic Brands'|'Model & Building Brands'|'Other Brands';

type CategoryConfig={
  coverImage?:string;
  progressBased?:boolean;
  target?:number;
};
type ExtendedPrefs=NonNullable<Store['preferences']>&{
  monthlyCollectingBudget?:number;
  brandCovers?:Record<string,string>;
  categoryConfigs?:Record<string,CategoryConfig>;
};

function prefsOf(data:Store):ExtendedPrefs{
  return (data.preferences||{
    accentColor:RED,
    density:'comfortable',
    cardSize:'standard',
    reducedMotion:false
  }) as ExtendedPrefs;
}
function owned(items:Item[]){return items.filter(i=>i.status==='owned')}
function totalValue(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.currentValue*i.quantity,0)}
function totalCost(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.purchasePrice*i.quantity,0)}
function recentChange(i:Item){
  const points=(i.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return 0;
  return points.at(-1)!.value-points[Math.max(0,points.length-8)].value;
}
function recentPct(i:Item){
  const points=(i.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return 0;
  const current=points.at(-1)!.value;
  const previous=points[Math.max(0,points.length-8)].value;
  return previous?(current-previous)/previous*100:0;
}
function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}
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
function norm(v:unknown){
  return String(v||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}
function itemBrand(item:Item){
  const forced=(item.customFields?.__collectionBrand||'').trim();
  if(forced==='__none')return 'Unlabeled Brand';
  if(forced)return forced;
  return (item.identity?.brand||item.customFields?.Brand||'Unlabeled Brand').trim()||'Unlabeled Brand';
}
function displayBrand(brand:string){
  if(brand==='McFarlane')return 'McFarlane Toys';
  if(brand==='POP MART')return 'Pop Mart';
  return brand;
}
function brandGroup(item:Item):BrandGroup{
  const brand=itemBrand(item);
  const type=itemLibraryType(item);
  if(type==='Trading Cards'){
    if(['Topps','Panini','Bowman','Skybox'].includes(brand)||/basketball|football|baseball|hockey/i.test(item.category))return 'Sports Card Brands';
    return 'TCG Brands';
  }
  if(type==='Comics'||brand==='Marvel Comics')return 'Comic Brands';
  if(type==='LEGO & Models'||['LEGO','BLDR','Blokees'].includes(brand))return 'Model & Building Brands';
  if(['Action Figures','Designer & Vinyl Figures','Other Collectibles'].includes(type)||['Funko','Hasbro','McFarlane','ZD Toys','Jazwares','Bandai','POP MART','CultureFly','Royal Bobbles','Pop Creations'].includes(brand))return 'Collectible Brands';
  return 'Other Brands';
}
function isCardBrand(brand:string){
  return ['Magic: The Gathering','Union Arena','Pokémon','Topps','Panini','Bowman','Skybox'].includes(brand);
}
function categoryForItem(item:Item,brand:string){
  const forced=(item.customFields?.__collectionCategory||'').trim();
  if(forced==='__none')return 'Unassigned';
  if(forced)return forced;

  const series=(item.identity?.series||'').trim();
  const set=(item.customFields?.Set||'').trim();
  if(isCardBrand(brand))return series||set||item.category||'Other';
  if(brand==='Marvel Comics')return series||'Marvel Comics';

  const text=norm([
    item.name,series,item.customFields?.['Source / Title'],item.customFields?.Franchise
  ].filter(Boolean).join(' '));

  if(/doctor strange/.test(text))return 'Doctor Strange';
  if(/miles morales/.test(text))return 'Spider-Man';
  if(/spider man|spiderman|iron spider/.test(text))return 'Spider-Man';
  if(/venom|eddie brock/.test(text))return 'Venom';
  if(/ghost face|scream/.test(text))return 'Scream';
  if(/jujutsu kaisen|sukuna|gojo|megumi|itadori/.test(text))return 'Jujutsu Kaisen';
  if(/wicked|glinda/.test(text))return 'Wicked';
  if(/sanrio|cinnamoroll/.test(text))return 'Sanrio';
  if(/new york knicks|nba/.test(text))return 'NBA';
  if(/new york jets|nfl/.test(text))return 'NFL';
  if(/mlb|yankees/.test(text))return 'MLB';

  const franchise=(item.customFields?.Franchise||'').trim();
  if(franchise&&!['Marvel','Marvel Universe'].includes(franchise))return franchise;
  return series||franchise||item.category||'Other';
}
function itemKind(item:Item){
  const type=itemLibraryType(item);
  const brand=itemBrand(item);
  if(type==='Trading Cards'){
    if(['Topps','Panini','Bowman','Skybox'].includes(brand)||/basketball|football|baseball|hockey/i.test(item.category))return 'Sports Cards';
    return 'Trading Cards';
  }
  if(type==='Comics')return 'Comics';
  if(type==='Action Figures')return 'Action Figures';
  if(type==='Designer & Vinyl Figures')return 'Collectible Figures';
  if(type==='LEGO & Models')return 'Models & Building';
  if(type==='Skateboards')return 'Skateboards';
  if(type==='Art & Decor')return 'Art & Decor';
  if(type==='Games')return 'Games';
  if(brand==='Squier')return 'Music Gear';
  return 'Other Collectibles';
}
function groupLogo(data:Store,brand:string,items:Item[]){
  const custom=prefsOf(data).brandCovers?.[brand];
  if(custom)return custom;

  const groups=Object.values(data.libraryGroups||{});
  const aliases=[displayBrand(brand),brand];
  if(brand==='Funko')aliases.push('Funko Pop!');
  if(brand==='Hasbro')aliases.push('Marvel Legends');
  if(brand==='McFarlane')aliases.push('McFarlane Toys');
  if(brand==='Magic: The Gathering')aliases.push('Magic The Gathering');
  if(brand==='Panini')aliases.push('Panini Prizm');
  if(brand==='Bowman')aliases.push('Bowman Chrome University');
  if(brand==='Skybox')aliases.push('Skybox Premium');
  if(brand==='Squier')aliases.push('Fender');

  const direct=groups.find(g=>aliases.some(a=>norm(g.name)===norm(a)));
  const directImage=direct?.coverImage||direct?.coverLogo;
  if(directImage)return directImage;

  for(const item of items){
    const typeId=item.customFields?.__legacyLibraryType;
    const lineId=item.customFields?.__legacyLibraryLine;
    if(!typeId||!lineId)continue;
    const g=data.libraryGroups?.[`line::${typeId}::${lineId}`];
    const img=g?.coverImage||g?.coverLogo;
    if(img)return img;
  }
  return '';
}
function legacyCollectionCover(data:Store,items:Item[]){
  for(const item of items){
    const id=item.customFields?.__legacyCollectionId;
    const c=id?data.collections.find(x=>x.id===id):undefined;
    const img=c?.coverImage||c?.coverLogo||c?.logo;
    if(img)return img;
  }
  return items.find(i=>i.image)?.image||'';
}
function categoryKey(brand:string,category:string){
  return `${norm(brand)}::${norm(category)}`;
}
function inferredTarget(brand:string,category:string,items:Item[]){
  for(const item of items){
    for(const key of ['Set Total','Total Cards','Cards in Set','Checklist Total','Total in Set','Total Items']){
      const n=Number((item.customFields?.[key]||'').replace(/[^0-9]/g,''));
      if(n>0)return n;
    }
  }
  const s=norm(`${brand} ${category} ${items.map(i=>`${i.identity?.setCode||''} ${i.identity?.series||''}`).join(' ')}`);
  if(/union arena/.test(s)&&/vol 2|uex02/.test(s))return 90;
  if(/union arena/.test(s)&&/jujutsu kaisen|ue03/.test(s))return 106;
  return 0;
}
function categoryConfig(data:Store,brand:string,category:string,items:Item[]){
  const saved=prefsOf(data).categoryConfigs?.[categoryKey(brand,category)];
  if(saved)return {
    coverImage:saved.coverImage||'',
    progressBased:!!saved.progressBased,
    target:Math.max(0,Number(saved.target)||0)
  };
  const target=inferredTarget(brand,category,items);
  return {coverImage:'',progressBased:target>0,target};
}
function distinctOwnedCount(items:Item[]){
  return new Set(owned(items).map(i=>i.identity?.collectorNumber||i.identity?.upc||i.id)).size;
}
function itemIdentifier(item:Item){
  const rarity=(item.customFields?.Rarity||'').trim();
  const number=(item.identity?.collectorNumber||item.customFields?.['Card #']||item.identity?.modelNumber||'').trim();
  const edition=(item.identity?.edition||'').trim();
  const bits:string[]=[];
  if(rarity)bits.push(rarity);
  else if(edition&&edition.toLowerCase()!=='normal')bits.push(edition);
  if(number)bits.push(number);
  return bits.join(' • ');
}
function brandEntries(data:Store){
  const map=new Map<string,Item[]>();
  for(const item of data.items){
    const brand=itemBrand(item);
    const list=map.get(brand)||[];
    list.push(item);map.set(brand,list);
  }
  return [...map.entries()].map(([brand,items])=>({
    brand,items,group:brandGroup(items[0]),logo:groupLogo(data,brand,items)
  })).sort((a,b)=>totalValue(b.items)-totalValue(a.items));
}
function categoriesForBrand(data:Store,brand:string){
  const map=new Map<string,Item[]>();
  for(const item of data.items.filter(i=>itemBrand(i)===brand)){
    const cat=categoryForItem(item,brand);
    const list=map.get(cat)||[];
    list.push(item);map.set(cat,list);
  }
  return [...map.entries()].map(([name,items])=>({name,items}));
}
function assignTo(item:Item,brand:string,category:string):Item{
  const customFields={
    ...(item.customFields||{}),
    __collectionBrand:brand,
    __collectionCategory:category
  };
  return {...item,customFields,updatedAt:new Date().toISOString()};
}
function removeFromCollections(item:Item):Item{
  const customFields={
    ...(item.customFields||{}),
    __collectionBrand:'__none',
    __collectionCategory:'__none'
  };
  return {...item,customFields,updatedAt:new Date().toISOString()};
}

export default function Home(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [view,setView]=useState<MainView>('home');
  const [detail,setDetail]=useState<Item|null>(null);
  const [cloudOpen,setCloudOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const prefs=prefsOf(data);

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
  function go(v:MainView){setView(v);setDetail(null)}
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
      <ItemDetail
        item={live}
        collection={data.collections.find(c=>c.id===live.collectionId)}
        close={()=>setDetail(null)}
        edit={()=>{setEditingItem(live);setDetail(null)}}
        remove={()=>removeItem(live)}
        save={saveItem}
      />
      {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
      {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
      {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>}
    </div>
  }

  return <div className={`cc-app density-${prefs.density} cards-${prefs.cardSize}`} style={{'--accent':prefs.accentColor||RED} as React.CSSProperties}>
    {chrome}
    <main className="cc-main">
      {view==='home'&&<HomeDashboard data={data} openItem={setDetail} goCollections={()=>go('collections')}/>}
      {view==='collections'&&<BrandCollections data={data} update={update} openItem={setDetail} increment={increment} addItem={()=>setEditingItem(blankItem(UNLABELED))}/>}
      {view==='portfolio'&&<PortfolioProducts data={data} update={update} openItem={setDetail} increment={increment}/>}
      {view==='finance'&&<Finance data={data} update={update} openItem={setDetail}/>}
      {view==='profile'&&<ProfilePage data={data} update={update} onCloud={()=>setCloudOpen(true)} onSettings={()=>setSettingsOpen(true)}/>}
    </main>
    {cloudOpen&&<CloudPanel {...cloud} close={()=>setCloudOpen(false)} backup={downloadBackup} recovery={()=>{}}/>}
    {settingsOpen&&<SettingsModal data={data} close={()=>setSettingsOpen(false)} save={next=>{update(next);setSettingsOpen(false)}}/>}
    {editingItem&&<ItemEditor item={editingItem} collections={data.collections} close={()=>setEditingItem(null)} save={saveItem}/>}
  </div>
}

function TopNav({view,go,cloud,onCloud,onSettings}:{view:MainView;go:(v:MainView)=>void;cloud:string;onCloud:()=>void;onSettings:()=>void}){
  const tabs:[MainView,string,React.ReactNode][]=[
    ['home','Home',<HomeIcon key="h" size={21}/>],
    ['collections','Collections',<Library key="c" size={21}/>],
    ['portfolio','Portfolio',<PieChart key="p" size={21}/>],
    ['finance','Finance',<Landmark key="f" size={21}/>],
    ['profile','Profile',<UserCircle key="u" size={21}/>]
  ];
  return <header className="cc-header"><div className="cc-nav-inner">
    <button className="cc-wordmark" onClick={()=>go('home')} aria-label="Collector home">COLLECTOR<span>COLLECT · TRACK · VALUE</span></button>
    <nav className="cc-nav" aria-label="Main navigation">{tabs.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>go(id)}><span className="cc-nav-icon">{icon}</span><span>{label}</span></button>)}</nav>
    <div className="cc-header-actions">
      <button className="cc-sync" onClick={onCloud}><Cloud size={14}/><span>{cloud}</span></button><b>USD</b>
      <button aria-label="Notifications"><Bell size={17}/></button>
      <button aria-label="Customize Collector" onClick={onSettings}><Settings size={17}/></button>
    </div>
  </div></header>
}

function HomeDashboard({data,openItem,goCollections}:{data:Store;openItem:(i:Item)=>void;goCollections:()=>void}){
  const value=totalValue(data.items),cost=totalCost(data.items);
  const top=[...owned(data.items)].sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity).slice(0,4);
  const brands=brandEntries(data).slice(0,6);
  return <div className="cc-content cc-home-page">
    <section className="cc-home-chart"><ValueChart data={data} collectionId="all" value={value} cost={cost}/></section>
    <section className="cc-most-card">
      <div className="cc-section-head"><h2>Most Valuable</h2></div>
      <div className="cc-most-list">{top.map(i=><button key={i.id} onClick={()=>openItem(i)}><span><b>{i.name}</b><small>{i.identity?.series||i.category}</small></span><strong>{money(i.currentValue*i.quantity)}</strong></button>)}</div>
    </section>
    <section className="brand-home-list">
      <div className="cc-section-head"><h2>Collections</h2></div>
      {brands.map(b=><button key={b.brand} onClick={goCollections}>
        <div className="brand-home-logo">{b.logo?<img src={b.logo} alt=""/>:<span>{displayBrand(b.brand)}</span>}</div>
        <div className="brand-home-name"><b>{displayBrand(b.brand)}</b><small>{b.items.length} items</small></div>
        <div className="brand-home-value"><strong>{money(totalValue(b.items))}</strong></div>
      </button>)}
    </section>
  </div>
}

function BrandCollections({data,update,openItem,increment,addItem}:{data:Store;update:(d:Store)=>void;openItem:(i:Item)=>void;increment:(i:Item)=>void;addItem:()=>void}){
  const [step,setStep]=useState<BrandStep>({});
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState<BrandGroup>('All Brands');
  const [filterOpen,setFilterOpen]=useState(false);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [kind,setKind]=useState('All');
  const [statusFilter,setStatusFilter]=useState<'all'|'owned'|'wishlist'>('all');
  const [categoryFilter,setCategoryFilter]=useState<'all'|'progress'|'value'>('all');
  const [manageTarget,setManageTarget]=useState<{kind:'brand'|'category';brand:string;category?:string}|null>(null);
  const [editTarget,setEditTarget]=useState<{kind:'brand'|'category';brand:string;category?:string}|null>(null);
  const [moving,setMoving]=useState<Item[]>([]);
  const [selectMode,setSelectMode]=useState(false);
  const [selected,setSelected]=useState<Set<string>>(new Set());

  const brands=brandEntries(data);
  const prefs=prefsOf(data);
  const brand=step.brand;
  const brandItems=brand?data.items.filter(i=>itemBrand(i)===brand):[];
  const category=step.category;
  const categoryItems=brand&&category?brandItems.filter(i=>categoryForItem(i,brand)===category):[];

  function savePrefs(next:Partial<ExtendedPrefs>){
    update({...data,preferences:{...prefs,...next} as Store['preferences']});
  }
  function updateItems(nextItems:Item[]){
    const map=new Map(nextItems.map(i=>[i.id,i]));
    update({...data,items:data.items.map(i=>map.get(i.id)||i)});
  }
  function toggleSelected(id:string){
    setSelected(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n});
  }

  if(!brand){
    const shown=brands.filter(b=>{
      const matchesGroup=group==='All Brands'||b.group===group;
      const matchesQuery=displayBrand(b.brand).toLowerCase().includes(query.toLowerCase());
      const matchesFav=!favoritesOnly||b.items.some(watched);
      return matchesGroup&&matchesQuery&&matchesFav;
    });
    const groups:BrandGroup[]=['All Brands','TCG Brands','Sports Card Brands','Collectible Brands','Comic Brands','Model & Building Brands','Other Brands'];
    return <div className="cc-content brand-page">
      <div className="brand-topbar native-tools">
        <label><Search size={21}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search brands"/>{query&&<button onClick={()=>setQuery('')}><X size={19}/></button>}</label>
        <button className={favoritesOnly?'active':''} onClick={()=>setFavoritesOnly(v=>!v)} aria-label="Watched brands"><Star size={20} fill={favoritesOnly?'currentColor':'none'}/></button>
        <button className={editMode?'active':''} onClick={()=>setEditMode(v=>!v)} aria-label="Edit brands"><Pencil size={19}/></button>
        <div className="brand-filter-wrap">
          <button className={filterOpen?'active':''} onClick={()=>setFilterOpen(v=>!v)} aria-label="Filter brands"><SlidersHorizontal size={20}/></button>
          {filterOpen&&<div className="brand-filter-menu">{groups.map(g=><button key={g} className={group===g?'active':''} onClick={()=>{setGroup(g);setFilterOpen(false)}}>{g}</button>)}</div>}
        </div>
      </div>
      <div className="brand-filter-chip">{group}</div>
      <div className="brand-grid native-brand-grid">{shown.map(b=>{
        const custom=prefs.brandCovers?.[b.brand];
        return <article className="brand-tile-shell" key={b.brand}>
          <button className="brand-tile" aria-label={displayBrand(b.brand)} title={displayBrand(b.brand)} onClick={()=>{setStep({brand:b.brand});setQuery('')}}>
            {(custom||b.logo)?<img src={custom||b.logo} alt=""/>:<span>{displayBrand(b.brand)}</span>}
          </button>
          <button className="collection-manage-btn" onClick={()=>setManageTarget({kind:'brand',brand:b.brand})} title="Add or remove items"><FolderInput size={15}/></button>
          {editMode&&<button className="collection-edit-btn" onClick={()=>setEditTarget({kind:'brand',brand:b.brand})}><Pencil size={13}/> Edit</button>}
        </article>;
      })}</div>
      {!shown.length&&<div className="brand-empty">No brands match this filter.</div>}
      {manageTarget&&<MembershipModal target={manageTarget} data={data} close={()=>setManageTarget(null)} save={items=>{updateItems(items);setManageTarget(null)}}/>}
      {editTarget&&<CollectionEditModal target={editTarget} data={data} close={()=>setEditTarget(null)} save={(cover,progress,target)=>{
        const brandCovers={...(prefs.brandCovers||{})};
        if(editTarget.kind==='brand'){
          if(cover)brandCovers[editTarget.brand]=cover;else delete brandCovers[editTarget.brand];
          savePrefs({brandCovers});
        }else{
          const categoryConfigs={...(prefs.categoryConfigs||{})};
          categoryConfigs[categoryKey(editTarget.brand,editTarget.category||'')]={coverImage:cover,progressBased:progress,target:progress?Math.max(1,target):0};
          savePrefs({categoryConfigs});
        }
        setEditTarget(null);
      }}/>}
    </div>;
  }

  if(!category){
    const cats=categoriesForBrand(data,brand).map(c=>{
      const config=categoryConfig(data,brand,c.name,c.items);
      return {
        ...c,
        value:totalValue(c.items),
        config,
        cover:config.coverImage||legacyCollectionCover(data,c.items)
      };
    }).filter(c=>{
      const matchesQuery=c.name.toLowerCase().includes(query.toLowerCase());
      const matchesFav=!favoritesOnly||c.items.some(watched);
      const matchesFilter=categoryFilter==='all'||(categoryFilter==='progress'&&c.config.progressBased)||(categoryFilter==='value'&&c.value>0);
      return matchesQuery&&matchesFav&&matchesFilter;
    }).sort((a,b)=>b.value-a.value);

    return <div className="cc-content brand-page">
      <div className="brand-page-head"><button onClick={()=>{setStep({});setQuery('');setFilterOpen(false)}}><ChevronLeft size={20}/></button><div><small>{displayBrand(brand)}</small><h1>Categories</h1></div></div>
      <SearchActions
        query={query}
        setQuery={setQuery}
        placeholder={`Search ${displayBrand(brand)}`}
        starred={favoritesOnly}
        toggleStar={()=>setFavoritesOnly(v=>!v)}
        editing={editMode}
        toggleEdit={()=>setEditMode(v=>!v)}
        filterOpen={filterOpen}
        toggleFilter={()=>setFilterOpen(v=>!v)}
      >
        <button className={categoryFilter==='all'?'active':''} onClick={()=>{setCategoryFilter('all');setFilterOpen(false)}}>All collections</button>
        <button className={categoryFilter==='progress'?'active':''} onClick={()=>{setCategoryFilter('progress');setFilterOpen(false)}}>Progress-based</button>
        <button className={categoryFilter==='value'?'active':''} onClick={()=>{setCategoryFilter('value');setFilterOpen(false)}}>Has value</button>
      </SearchActions>

      <div className="brand-category-grid native-category-grid">{cats.map(c=>{
        const ownedCount=distinctOwnedCount(c.items);
        const progress=c.config.progressBased&&c.config.target?Math.min(100,ownedCount/c.config.target*100):0;
        return <article className="brand-category-card" key={c.name}>
          <button className="brand-category-main" onClick={()=>{setStep({brand,category:c.name});setQuery('');setKind('All');setStatusFilter('all');setFilterOpen(false)}}>
            <div className="brand-category-cover">
              {c.cover?<img className={c.config.coverImage?'custom-cover':''} src={c.cover} alt=""/>:<span>{c.name}</span>}
              {c.config.progressBased&&c.config.target>0&&<span className="native-progress"><i><em style={{width:`${progress}%`}}/></i><b>{progress.toFixed(0)}%</b></span>}
            </div>
            <div className="brand-category-copy">
              <h2>{c.name}</h2>
              <p>{c.config.progressBased&&c.config.target>0?`Progress: ${ownedCount} / ${c.config.target}`:`Items: ${owned(c.items).reduce((n,i)=>n+i.quantity,0)}`}</p>
              <p>Total value: {money(c.value)}</p>
            </div>
          </button>
          <button className="collection-manage-btn" onClick={()=>setManageTarget({kind:'category',brand,category:c.name})} title="Add or remove items"><FolderInput size={15}/></button>
          {editMode&&<button className="collection-edit-btn" onClick={()=>setEditTarget({kind:'category',brand,category:c.name})}><Pencil size={13}/> Edit</button>}
        </article>;
      })}</div>

      {manageTarget&&<MembershipModal target={manageTarget} data={data} close={()=>setManageTarget(null)} save={items=>{updateItems(items);setManageTarget(null)}}/>}
      {editTarget&&<CollectionEditModal target={editTarget} data={data} close={()=>setEditTarget(null)} save={(cover,progress,target)=>{
        const categoryConfigs={...(prefs.categoryConfigs||{})};
        categoryConfigs[categoryKey(editTarget.brand,editTarget.category||'')]={coverImage:cover,progressBased:progress,target:progress?Math.max(1,target):0};
        savePrefs({categoryConfigs});setEditTarget(null);
      }}/>}
    </div>;
  }

  const kinds=['All',...Array.from(new Set(categoryItems.map(itemKind))).sort()];
  const shown=categoryItems.filter(i=>{
    const matchesQuery=`${i.name} ${i.identity?.series||''} ${i.category} ${i.customFields?.Franchise||''}`.toLowerCase().includes(query.toLowerCase());
    const matchesKind=kind==='All'||itemKind(i)===kind;
    const matchesStatus=statusFilter==='all'||i.status===statusFilter;
    const matchesStar=!favoritesOnly||watched(i);
    return matchesQuery&&matchesKind&&matchesStatus&&matchesStar;
  }).sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity);

  const selectedItems=shown.filter(i=>selected.has(i.id));

  return <div className="cc-content brand-page">
    <div className="brand-page-head"><button onClick={()=>{setStep({brand});setQuery('');setSelectMode(false);setSelected(new Set())}}><ChevronLeft size={20}/></button><div><small>{displayBrand(brand)}</small><h1>{category}</h1></div></div>

    <SearchActions
      query={query}
      setQuery={setQuery}
      placeholder="Search products"
      starred={favoritesOnly}
      toggleStar={()=>setFavoritesOnly(v=>!v)}
      editing={selectMode}
      toggleEdit={()=>{setSelectMode(v=>!v);setSelected(new Set())}}
      filterOpen={filterOpen}
      toggleFilter={()=>setFilterOpen(v=>!v)}
    >
      <button className={statusFilter==='all'?'active':''} onClick={()=>{setStatusFilter('all');setFilterOpen(false)}}>All products</button>
      <button className={statusFilter==='owned'?'active':''} onClick={()=>{setStatusFilter('owned');setFilterOpen(false)}}>Owned</button>
      <button className={statusFilter==='wishlist'?'active':''} onClick={()=>{setStatusFilter('wishlist');setFilterOpen(false)}}>Wishlist</button>
    </SearchActions>

    <div className="product-toolbar">
      <div className="brand-kind-filters">{kinds.map(k=><button key={k} className={kind===k?'active':''} onClick={()=>setKind(k)}>{k}</button>)}</div>
      <button className="brand-add" onClick={addItem}><Plus size={17}/> <span>Add Item</span></button>
    </div>

    {selectMode&&<div className="bulk-toolbar">
      <button onClick={()=>setSelected(new Set(shown.map(i=>i.id)))}><ListChecks size={15}/> Select All</button>
      <button onClick={()=>setSelected(new Set())}>Clear</button>
      <button disabled={!selectedItems.length} onClick={()=>setMoving(selectedItems)}><FolderInput size={15}/> Move Selected ({selectedItems.length})</button>
    </div>}

    <div className="cc-product-grid">{shown.map(i=><ProductCard
      key={i.id}
      item={i}
      open={()=>openItem(i)}
      add={()=>increment(i)}
      move={()=>setMoving([i])}
      selectMode={selectMode}
      selected={selected.has(i.id)}
      toggleSelected={()=>toggleSelected(i.id)}
    />)}</div>
    {!shown.length&&<div className="brand-empty">No products match these filters.</div>}

    {moving.length>0&&<MoveProductModal items={moving} data={data} close={()=>setMoving([])} save={items=>{updateItems(items);setMoving([]);setSelected(new Set())}}/>}
  </div>;
}

function SearchActions({
  query,setQuery,placeholder,starred,toggleStar,editing,toggleEdit,filterOpen,toggleFilter,children
}:{
  query:string;
  setQuery:(v:string)=>void;
  placeholder:string;
  starred:boolean;
  toggleStar:()=>void;
  editing:boolean;
  toggleEdit:()=>void;
  filterOpen:boolean;
  toggleFilter:()=>void;
  children:React.ReactNode;
}){
  return <div className="universal-search-row">
    <label><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder}/>{query&&<button onClick={()=>setQuery('')}><X size={18}/></button>}</label>
    <button className={starred?'active':''} onClick={toggleStar} aria-label="Show watched only"><Star size={19} fill={starred?'currentColor':'none'}/></button>
    <button className={editing?'active':''} onClick={toggleEdit} aria-label="Edit or select"><Pencil size={18}/></button>
    <div className="universal-filter-wrap">
      <button className={filterOpen?'active':''} onClick={toggleFilter} aria-label="Filter"><SlidersHorizontal size={19}/></button>
      {filterOpen&&<div className="universal-filter-menu">{children}</div>}
    </div>
  </div>;
}

function ProductCard({
  item,open,add,move,selectMode,selected,toggleSelected
}:{
  item:Item;
  open:()=>void;
  add:()=>void;
  move:()=>void;
  selectMode?:boolean;
  selected?:boolean;
  toggleSelected?:()=>void;
}){
  const change=recentChange(item),pct=recentPct(item),identifier=itemIdentifier(item);
  const trading=itemLibraryType(item)==='Trading Cards';
  return <article className={`cc-product-card native-product-card ${trading?'is-trading-card':''}`}>
    <button className="cc-product-open" onClick={()=>selectMode?toggleSelected?.():open()}>
      <div className="cc-product-image">
        <img src={item.image||'/art/empty.svg'} alt={item.name}/>
        {watched(item)&&<Heart className="cc-watch-heart" size={14} fill="currentColor"/>}
        {selectMode&&<span className={`product-select-check ${selected?'selected':''}`}>{selected?<Check size={14}/>:''}</span>}
      </div>
      <div className="cc-product-copy">
        <h3>{item.name}</h3>
        <a>{item.identity?.series||item.category||'Collectible'}</a>
        {identifier&&<div className="product-identifier">{identifier}</div>}
        <div className="product-market-block">
          <strong>{money(item.currentValue)}</strong>
          <small className={change>=0?'gain':'loss'}>{change>=0?'▲':'▼'} {change>=0?'+':'-'}{money(Math.abs(change))} ({pct>=0?'+':''}{pct.toFixed(2)}%)</small>
          <span>Qty: {item.status==='owned'?item.quantity:0}</span>
        </div>
      </div>
    </button>
    <button className="product-move-btn" onClick={e=>{e.stopPropagation();move()}} title="Move or remove from collection"><FolderInput size={15}/></button>
    <button className="cc-plus" onClick={e=>{e.stopPropagation();add()}} aria-label={`Add one ${item.name}`}><Plus size={18}/></button>
  </article>;
}

function PortfolioProducts({data,update,openItem,increment}:{data:Store;update:(d:Store)=>void;openItem:(i:Item)=>void;increment:(i:Item)=>void}){
  const [q,setQ]=useState('');
  const [sort,setSort]=useState<'value'|'name'|'recent'>('value');
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);
  const [statusFilter,setStatusFilter]=useState<'all'|'owned'|'wishlist'>('owned');
  const [selectMode,setSelectMode]=useState(false);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [moving,setMoving]=useState<Item[]>([]);

  const items=data.items.filter(i=>{
    const matchesQ=`${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(q.toLowerCase());
    const matchesStar=!favoritesOnly||watched(i);
    const matchesStatus=statusFilter==='all'||i.status===statusFilter;
    return matchesQ&&matchesStar&&matchesStatus;
  }).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='recent'?b.updatedAt.localeCompare(a.updatedAt):b.currentValue*b.quantity-a.currentValue*a.quantity);

  const selectedItems=items.filter(i=>selected.has(i.id));
  function updateItems(nextItems:Item[]){
    const map=new Map(nextItems.map(i=>[i.id,i]));
    update({...data,items:data.items.map(i=>map.get(i.id)||i)});
  }
  function toggle(id:string){setSelected(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n})}

  return <div className="cc-content cc-portfolio-page">
    <SearchActions
      query={q}
      setQuery={setQ}
      placeholder="Search your collection"
      starred={favoritesOnly}
      toggleStar={()=>setFavoritesOnly(v=>!v)}
      editing={selectMode}
      toggleEdit={()=>{setSelectMode(v=>!v);setSelected(new Set())}}
      filterOpen={filterOpen}
      toggleFilter={()=>setFilterOpen(v=>!v)}
    >
      <button className={statusFilter==='all'?'active':''} onClick={()=>{setStatusFilter('all');setFilterOpen(false)}}>All products</button>
      <button className={statusFilter==='owned'?'active':''} onClick={()=>{setStatusFilter('owned');setFilterOpen(false)}}>Owned</button>
      <button className={statusFilter==='wishlist'?'active':''} onClick={()=>{setStatusFilter('wishlist');setFilterOpen(false)}}>Wishlist</button>
    </SearchActions>

    <section className="cc-portfolio-hero"><div><span>Portfolio: <b>Collecting</b></span><strong>{money(totalValue(data.items))}</strong><small>{owned(data.items).reduce((n,i)=>n+i.quantity,0)} items owned</small></div><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="value">Sort: Value</option><option value="recent">Sort: Recent</option><option value="name">Sort: Name</option></select></section>

    {selectMode&&<div className="bulk-toolbar">
      <button onClick={()=>setSelected(new Set(items.map(i=>i.id)))}><ListChecks size={15}/> Select All</button>
      <button onClick={()=>setSelected(new Set())}>Clear</button>
      <button disabled={!selectedItems.length} onClick={()=>setMoving(selectedItems)}><FolderInput size={15}/> Move Selected ({selectedItems.length})</button>
    </div>}

    <div className="cc-product-grid">{items.map(i=><ProductCard
      key={i.id}
      item={i}
      open={()=>openItem(i)}
      add={()=>increment(i)}
      move={()=>setMoving([i])}
      selectMode={selectMode}
      selected={selected.has(i.id)}
      toggleSelected={()=>toggle(i.id)}
    />)}</div>

    {moving.length>0&&<MoveProductModal items={moving} data={data} close={()=>setMoving([])} save={items=>{updateItems(items);setMoving([]);setSelected(new Set())}}/>}
  </div>;
}

function MembershipModal({
  target,data,close,save
}:{
  target:{kind:'brand'|'category';brand:string;category?:string};
  data:Store;
  close:()=>void;
  save:(items:Item[])=>void;
}){
  const [q,setQ]=useState('');
  const currently=useMemo(()=>new Set(data.items.filter(i=>{
    if(target.kind==='brand')return itemBrand(i)===target.brand;
    return itemBrand(i)===target.brand&&categoryForItem(i,target.brand)===target.category;
  }).map(i=>i.id)),[data.items,target]);

  const [selected,setSelected]=useState<Set<string>>(new Set(currently));
  const visible=data.items.filter(i=>`${i.name} ${itemBrand(i)} ${i.identity?.series||''}`.toLowerCase().includes(q.toLowerCase()));

  function submit(){
    const changed=data.items.filter(i=>{
      const isCurrent=currently.has(i.id),isSelected=selected.has(i.id);
      return isCurrent!==isSelected;
    }).map(i=>{
      const wasCurrent=currently.has(i.id),isSelected=selected.has(i.id);
      if(isSelected){
        return assignTo(i,target.brand,target.kind==='category'?(target.category||'Other'):categoryForItem(i,target.brand));
      }
      if(wasCurrent)return removeFromCollections(i);
      return i;
    });
    save(changed);
  }

  return <div className="overlay native-overlay"><div className="modal membership-modal">
    <div className="modal-header"><div><small>MANAGE ITEMS</small><h2>{target.kind==='brand'?displayBrand(target.brand):target.category}</h2></div><button onClick={close}><X/></button></div>
    <div className="membership-tools">
      <label><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search all products"/></label>
      <button onClick={()=>setSelected(new Set(visible.map(i=>i.id)))}><ListChecks size={14}/> Select All</button>
      <button onClick={()=>setSelected(new Set())}>Clear</button>
    </div>
    <div className="membership-list">{visible.map(i=><label key={i.id}>
      <input type="checkbox" checked={selected.has(i.id)} onChange={()=>setSelected(prev=>{const n=new Set(prev);if(n.has(i.id))n.delete(i.id);else n.add(i.id);return n})}/>
      <img src={i.image||'/art/empty.svg'} alt=""/>
      <span><b>{i.name}</b><small>{displayBrand(itemBrand(i))} · {categoryForItem(i,itemBrand(i))}</small></span>
    </label>)}</div>
    <div className="modal-actions"><button className="secondary" onClick={close}>Cancel</button><button className="primary" onClick={submit}>Save Membership</button></div>
  </div></div>;
}

function MoveProductModal({items,data,close,save}:{items:Item[];data:Store;close:()=>void;save:(items:Item[])=>void}){
  const brands=brandEntries(data).map(b=>b.brand).filter(b=>b!=='Unlabeled Brand');
  const initialBrand=items.length===1?itemBrand(items[0]):(brands[0]||'');
  const [brand,setBrand]=useState(initialBrand);
  const categories=brand?categoriesForBrand(data,brand).map(c=>c.name):[];
  const initialCategory=items.length===1&&brand===itemBrand(items[0])?categoryForItem(items[0],brand):(categories[0]||'Other');
  const [category,setCategory]=useState(initialCategory);

  return <div className="overlay native-overlay"><form className="modal move-modal" onSubmit={e=>{e.preventDefault();save(items.map(i=>assignTo(i,brand||'Unlabeled Brand',category||'Other')))}}><div className="modal-header"><div><small>MOVE PRODUCT{items.length>1?'S':''}</small><h2>{items.length===1?items[0].name:`${items.length} products`}</h2></div><button type="button" onClick={close}><X/></button></div>
    <div className="move-modal-body">
      <label>Brand<input list="move-brand-list" value={brand} onChange={e=>{setBrand(e.target.value);setCategory('')}}/><datalist id="move-brand-list">{brands.map(b=><option key={b} value={b}>{displayBrand(b)}</option>)}</datalist></label>
      <label>Collection / Category<input list="move-category-list" value={category} onChange={e=>setCategory(e.target.value)}/><datalist id="move-category-list">{categories.map(c=><option value={c} key={c}/>)}</datalist></label>
      <button type="button" className="remove-membership-btn" onClick={()=>save(items.map(removeFromCollections))}><FolderMinus size={15}/> Remove from collections</button>
    </div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Move</button></div>
  </form></div>;
}

function CollectionEditModal({
  target,data,close,save
}:{
  target:{kind:'brand'|'category';brand:string;category?:string};
  data:Store;
  close:()=>void;
  save:(coverImage:string,progressBased:boolean,targetCount:number)=>void;
}){
  const prefs=prefsOf(data);
  const items=target.kind==='category'?data.items.filter(i=>itemBrand(i)===target.brand&&categoryForItem(i,target.brand)===target.category):[];
  const config=target.kind==='category'?categoryConfig(data,target.brand,target.category||'',items):{coverImage:prefs.brandCovers?.[target.brand]||'',progressBased:false,target:0};
  const [coverImage,setCoverImage]=useState(config.coverImage||'');
  const [progressBased,setProgressBased]=useState(config.progressBased);
  const [targetCount,setTargetCount]=useState(config.target||0);

  function upload(file?:File){
    if(!file)return;
    const r=new FileReader();r.onload=()=>setCoverImage(String(r.result||''));r.readAsDataURL(file);
  }

  return <div className="overlay native-overlay"><form className="modal collection-edit-modal" onSubmit={e=>{e.preventDefault();save(coverImage,progressBased,targetCount)}}><div className="modal-header"><div><small>{target.kind==='brand'?'EDIT BRAND':'EDIT COLLECTION'}</small><h2>{target.kind==='brand'?displayBrand(target.brand):target.category}</h2></div><button type="button" onClick={close}><X/></button></div>
    <div className="collection-edit-body">
      <label>Cover image<div className="collection-cover-preview">{coverImage?<img src={coverImage} alt=""/>:<span>Automatic cover</span>}</div><input value={coverImage.startsWith('data:')?'':coverImage} onChange={e=>setCoverImage(e.target.value)} placeholder="Image URL"/><span className="upload-cover">Upload image<input hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/></span></label>
      {target.kind==='category'&&<>
        <label className="progress-toggle"><input type="checkbox" checked={progressBased} onChange={e=>setProgressBased(e.target.checked)}/><span><b>Progress-based collection</b><small>Show percentage and completion bar.</small></span></label>
        {progressBased&&<label>Items needed to finish<input type="number" min="1" value={targetCount||''} onChange={e=>setTargetCount(Math.max(0,Number(e.target.value)||0))}/><small>Currently owned: {distinctOwnedCount(items)}</small></label>}
      </>}
    </div>
    <div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div>
  </form></div>;
}

function Finance({data,update,openItem}:{data:Store;update:(d:Store)=>void;openItem:(i:Item)=>void}){
  const [month,setMonth]=useState(monthKey());
  const prefs=prefsOf(data);
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
  return <div className="overlay"><form className="modal cl-editor-modal" onSubmit={e=>{e.preventDefault();save({...draft,collectionId:draft.collectionId||UNLABELED,updatedAt:new Date().toISOString()})}}><div className="modal-header"><div><small>{item.name?'EDIT PRODUCT':'ADD PRODUCT'}</small><h2>{item.name||'New Product'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.image} onChange={image=>setDraft({...draft,image})}/><div className="cl-form-grid"><label className="wide">Product name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Brand<input value={draft.identity?.brand||''} onChange={e=>setIdentity('brand',e.target.value)}/></label><label>Line / Series<input value={draft.identity?.series||''} onChange={e=>setIdentity('series',e.target.value)}/></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Item['status']})}><option value="owned">Owned</option><option value="wishlist">Wishlist</option><option value="sold">Sold</option></select></label><label>Category / Item Type<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Franchise<input value={draft.customFields?.Franchise||''} onChange={e=>setDraft({...draft,customFields:{...(draft.customFields||{}),Franchise:e.target.value}})}/></label><label>Condition<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label><label>Purchase price<input type="number" min="0" step="0.01" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)})}/></label><label>Current value<input type="number" min="0" step="0.01" value={draft.currentValue} onChange={e=>setDraft({...draft,currentValue:Number(e.target.value)})}/></label><label>Quantity<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value)||1)})}/></label><label>Purchase date<input type="date" value={draft.purchaseDate} onChange={e=>setDraft({...draft,purchaseDate:e.target.value})}/></label><label>Model / Number<input value={draft.identity?.modelNumber||draft.identity?.collectorNumber||''} onChange={e=>setIdentity('modelNumber',e.target.value)}/></label><label>UPC / Barcode<input value={draft.identity?.upc||''} onChange={e=>setIdentity('upc',e.target.value)}/></label><label>SKU<input value={draft.identity?.sku||''} onChange={e=>setIdentity('sku',e.target.value)}/></label><label>Edition / Variant<input value={draft.identity?.edition||''} onChange={e=>setIdentity('edition',e.target.value)}/></label><label>Year<input value={draft.identity?.year||''} onChange={e=>setIdentity('year',e.target.value)}/></label><label>Location<input value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></label><label className="wide">Description<textarea rows={3} value={draft.identity?.description||''} onChange={e=>setIdentity('description',e.target.value)}/></label><label className="wide">Notes<textarea rows={4} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save Product</button></div></form></div>
}

function SettingsModal({data,close,save}:{data:Store;close:()=>void;save:(d:Store)=>void}){
  const prefs=prefsOf(data);
  const [accent,setAccent]=useState(prefs.accentColor||RED),[density,setDensity]=useState(prefs.density),[cardSize,setCardSize]=useState(prefs.cardSize),[reduced,setReduced]=useState(prefs.reducedMotion);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save({...data,preferences:{...prefs,accentColor:accent,density,cardSize,reducedMotion:reduced} as Store['preferences']})}}><div className="modal-header"><div><small>CUSTOMIZE</small><h2>Appearance</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><div className="cl-form-grid"><label>Highlight color<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Density<select value={density} onChange={e=>setDensity(e.target.value as typeof density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Product card size<select value={cardSize} onChange={e=>setCardSize(e.target.value as typeof cardSize)}><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="cl-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

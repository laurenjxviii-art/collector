'use client';

import {useMemo,useState} from 'react';
import {
  Bell,ChevronLeft,Cloud,Heart,Home as HomeIcon,Landmark,Library,
  Package,Pencil,PieChart,Plus,Search,Settings,SlidersHorizontal,Star,
  TrendingDown,TrendingUp,UserCircle,X
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

function owned(items:Item[]){return items.filter(i=>i.status==='owned')}
function totalValue(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.currentValue*i.quantity,0)}
function totalCost(items:Item[]){return owned(items).reduce((sum,i)=>sum+i.purchasePrice*i.quantity,0)}
function recentChange(i:Item){
  const points=(i.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return 0;
  return points.at(-1)!.value-points[Math.max(0,points.length-8)].value;
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
function targetForCategory(brand:string,category:string,items:Item[]){
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

export default function Home(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [view,setView]=useState<MainView>('home');
  const [detail,setDetail]=useState<Item|null>(null);
  const [cloudOpen,setCloudOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [editingItem,setEditingItem]=useState<Item|null>(null);
  const prefs=(data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false}) as NonNullable<Store['preferences']>&{monthlyCollectingBudget?:number};

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
      {view==='collections'&&<BrandCollections data={data} openItem={setDetail} increment={increment} addItem={()=>setEditingItem(blankItem(UNLABELED))}/>}
      {view==='portfolio'&&<PortfolioProducts data={data} openItem={setDetail} increment={increment}/>}
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
      <button className="cc-most-view-all" onClick={()=>{}}>View All</button>
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

function BrandCollections({data,openItem,increment,addItem}:{data:Store;openItem:(i:Item)=>void;increment:(i:Item)=>void;addItem:()=>void}){
  const [step,setStep]=useState<BrandStep>({});
  const [query,setQuery]=useState('');
  const [group,setGroup]=useState<BrandGroup>('All Brands');
  const [filterOpen,setFilterOpen]=useState(false);
  const [favoritesOnly,setFavoritesOnly]=useState(false);
  const [kind,setKind]=useState('All');

  const brands=brandEntries(data);
  const brand=step.brand;
  const brandItems=brand?data.items.filter(i=>itemBrand(i)===brand):[];
  const category=step.category;
  const categoryItems=brand&&category?brandItems.filter(i=>categoryForItem(i,brand)===category):[];

  if(!brand){
    const shown=brands.filter(b=>{
      const matchesGroup=group==='All Brands'||b.group===group;
      const matchesQuery=displayBrand(b.brand).toLowerCase().includes(query.toLowerCase());
      const matchesFav=!favoritesOnly||b.items.some(watched);
      return matchesGroup&&matchesQuery&&matchesFav;
    });
    const groups:BrandGroup[]=['All Brands','TCG Brands','Sports Card Brands','Collectible Brands','Comic Brands','Model & Building Brands','Other Brands'];
    return <div className="cc-content brand-page">
      <div className="brand-topbar">
        <label><Search size={22}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search brands"/>{query&&<button onClick={()=>setQuery('')}><X size={20}/></button>}</label>
        <button className={favoritesOnly?'active':''} onClick={()=>setFavoritesOnly(v=>!v)} aria-label="Watched brands"><Star size={22} fill={favoritesOnly?'currentColor':'none'}/></button>
        <div className="brand-filter-wrap">
          <button className={filterOpen?'active':''} onClick={()=>setFilterOpen(v=>!v)} aria-label="Filter brands"><SlidersHorizontal size={22}/></button>
          {filterOpen&&<div className="brand-filter-menu">{groups.map(g=><button key={g} className={group===g?'active':''} onClick={()=>{setGroup(g);setFilterOpen(false)}}>{g}</button>)}</div>}
        </div>
      </div>
      <div className="brand-filter-chip">{group}</div>
      <div className="brand-grid">{shown.map(b=><button key={b.brand} className="brand-tile" aria-label={displayBrand(b.brand)} title={displayBrand(b.brand)} onClick={()=>{setStep({brand:b.brand});setQuery('')}}>
        {b.logo?<img src={b.logo} alt=""/>:<span>{displayBrand(b.brand)}</span>}
      </button>)}</div>
      {!shown.length&&<div className="brand-empty">No brands match this filter.</div>}
    </div>
  }

  if(!category){
    const map=new Map<string,Item[]>();
    for(const item of brandItems){
      const cat=categoryForItem(item,brand);
      const list=map.get(cat)||[];list.push(item);map.set(cat,list);
    }
    const cats=[...map.entries()].map(([name,items])=>({
      name,items,value:totalValue(items),cover:legacyCollectionCover(data,items),
      target:targetForCategory(brand,name,items)
    })).filter(c=>c.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.value-a.value);

    return <div className="cc-content brand-page">
      <div className="brand-page-head"><button onClick={()=>{setStep({});setQuery('')}}><ChevronLeft size={20}/></button><div><small>{displayBrand(brand)}</small><h1>Categories</h1></div></div>
      <div className="brand-sub-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${displayBrand(brand)}`}/>{query&&<button onClick={()=>setQuery('')}><X size={18}/></button>}</div>
      <div className="brand-category-grid">{cats.map(c=>{
        const ownedCount=new Set(owned(c.items).map(i=>i.identity?.collectorNumber||i.identity?.upc||i.id)).size;
        const progress=c.target?Math.min(100,ownedCount/c.target*100):0;
        return <button key={c.name} className="brand-category-card" onClick={()=>{setStep({brand,category:c.name});setQuery('');setKind('All')}}>
          <div className="brand-category-cover">{c.cover?<img src={c.cover} alt=""/>:<span>{c.name}</span>}{c.target>0&&<i><em style={{width:`${progress}%`}}/></i>}</div>
          <div className="brand-category-copy"><h2>{c.name}</h2><p>{c.target?`Progress: ${ownedCount} / ${c.target}`:`Items: ${owned(c.items).reduce((n,i)=>n+i.quantity,0)}`}</p><p>Total value: {money(c.value)}</p></div>
        </button>
      })}</div>
    </div>
  }

  const kinds=['All',...Array.from(new Set(categoryItems.map(itemKind))).sort()];
  const shown=categoryItems.filter(i=>{
    const matchesQuery=`${i.name} ${i.identity?.series||''} ${i.category} ${i.customFields?.Franchise||''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery&&(kind==='All'||itemKind(i)===kind);
  }).sort((a,b)=>b.currentValue*b.quantity-a.currentValue*a.quantity);

  return <div className="cc-content brand-page">
    <div className="brand-page-head"><button onClick={()=>{setStep({brand});setQuery('')}}><ChevronLeft size={20}/></button><div><small>{displayBrand(brand)}</small><h1>{category}</h1></div></div>
    <div className="brand-product-tools">
      <div className="brand-sub-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products"/>{query&&<button onClick={()=>setQuery('')}><X size={18}/></button>}</div>
      <button className="brand-add" onClick={addItem}><Plus size={17}/> Add Item</button>
    </div>
    <div className="brand-kind-filters">{kinds.map(k=><button key={k} className={kind===k?'active':''} onClick={()=>setKind(k)}>{k}</button>)}</div>
    <div className="cc-product-grid">{shown.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div>
    {!shown.length&&<div className="brand-empty">No products match these filters.</div>}
  </div>
}

function PortfolioProducts({data,openItem,increment}:{data:Store;openItem:(i:Item)=>void;increment:(i:Item)=>void}){
  const [q,setQ]=useState('');
  const [sort,setSort]=useState<'value'|'name'|'recent'>('value');
  const items=owned(data.items).filter(i=>`${i.name} ${i.identity?.series||''} ${i.category}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='recent'?b.updatedAt.localeCompare(a.updatedAt):b.currentValue*b.quantity-a.currentValue*a.quantity);
  return <div className="cc-content cc-portfolio-page">
    <div className="brand-sub-search"><Search size={19}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search your collection"/>{q&&<button onClick={()=>setQ('')}><X size={18}/></button>}</div>
    <section className="cc-portfolio-hero"><div><span>Portfolio: <b>Collecting</b></span><strong>{money(totalValue(data.items))}</strong><small>{owned(data.items).reduce((n,i)=>n+i.quantity,0)} items owned</small></div><select value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="value">Sort: Value</option><option value="recent">Sort: Recent</option><option value="name">Sort: Name</option></select></section>
    <div className="cc-product-grid">{items.map(i=><ProductCard key={i.id} item={i} open={()=>openItem(i)} add={()=>increment(i)}/>)}</div>
  </div>
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
  return <div className="overlay"><form className="modal cl-editor-modal" onSubmit={e=>{e.preventDefault();save({...draft,collectionId:draft.collectionId||UNLABELED,updatedAt:new Date().toISOString()})}}><div className="modal-header"><div><small>{item.name?'EDIT PRODUCT':'ADD PRODUCT'}</small><h2>{item.name||'New Product'}</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><ImageInput value={draft.image} onChange={image=>setDraft({...draft,image})}/><div className="cl-form-grid"><label className="wide">Product name<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Brand<input value={draft.identity?.brand||''} onChange={e=>setIdentity('brand',e.target.value)}/></label><label>Line / Series<input value={draft.identity?.series||''} onChange={e=>setIdentity('series',e.target.value)}/></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as Item['status']})}><option value="owned">Owned</option><option value="wishlist">Wishlist</option><option value="sold">Sold</option></select></label><label>Category / Item Type<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label><label>Franchise<input value={draft.customFields?.Franchise||''} onChange={e=>setDraft({...draft,customFields:{...(draft.customFields||{}),Franchise:e.target.value}})}/></label><label>Condition<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/></label><label>Purchase price<input type="number" min="0" step="0.01" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)})}/></label><label>Current value<input type="number" min="0" step="0.01" value={draft.currentValue} onChange={e=>setDraft({...draft,currentValue:Number(e.target.value)})}/></label><label>Quantity<input type="number" min="1" step="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value)||1)})}/></label><label>Purchase date<input type="date" value={draft.purchaseDate} onChange={e=>setDraft({...draft,purchaseDate:e.target.value})}/></label><label>Model / Number<input value={draft.identity?.modelNumber||draft.identity?.collectorNumber||''} onChange={e=>setIdentity('modelNumber',e.target.value)}/></label><label>UPC / Barcode<input value={draft.identity?.upc||''} onChange={e=>setIdentity('upc',e.target.value)}/></label><label>SKU<input value={draft.identity?.sku||''} onChange={e=>setIdentity('sku',e.target.value)}/></label><label>Edition / Variant<input value={draft.identity?.edition||''} onChange={e=>setIdentity('edition',e.target.value)}/></label><label>Year<input value={draft.identity?.year||''} onChange={e=>setIdentity('year',e.target.value)}/></label><label>Location<input value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></label><label className="wide">Description<textarea rows={3} value={draft.identity?.description||''} onChange={e=>setIdentity('description',e.target.value)}/></label><label className="wide">Notes<textarea rows={4} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save Product</button></div></form></div>
}

function SettingsModal({data,close,save}:{data:Store;close:()=>void;save:(d:Store)=>void}){
  const prefs=(data.preferences||{accentColor:RED,density:'comfortable' as const,cardSize:'standard' as const,reducedMotion:false}) as NonNullable<Store['preferences']>&{monthlyCollectingBudget?:number};
  const [accent,setAccent]=useState(prefs.accentColor||RED),[density,setDensity]=useState(prefs.density),[cardSize,setCardSize]=useState(prefs.cardSize),[reduced,setReduced]=useState(prefs.reducedMotion);
  return <div className="overlay"><form className="modal cl-editor-modal small" onSubmit={e=>{e.preventDefault();save({...data,preferences:{...prefs,accentColor:accent,density,cardSize,reducedMotion:reduced}})}}><div className="modal-header"><div><small>CUSTOMIZE</small><h2>Appearance</h2></div><button type="button" onClick={close}><X/></button></div><div className="cl-editor-body"><div className="cl-form-grid"><label>Highlight color<input type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label><label>Density<select value={density} onChange={e=>setDensity(e.target.value as typeof density)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Product card size<select value={cardSize} onChange={e=>setCardSize(e.target.value as typeof cardSize)}><option value="standard">Standard</option><option value="large">Large</option></select></label><label className="cl-check"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce motion</label></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save</button></div></form></div>
}

'use client';

import {useMemo,useState} from 'react';
import {
  ArrowDownUp,ArrowLeft,BarChart3,Camera,ChevronDown,CircleDollarSign,
  Download,Eye,Filter,Heart,Home,Layers3,Menu,MoreHorizontal,Package,
  Plus,Search,Settings,Share2,ShoppingBag,SlidersHorizontal,Star,
  Store,Trash2,UserCircle,Users,X
} from 'lucide-react';

type MobileView='home'|'search'|'shop'|'social'|'portfolio'|'profile';
type SearchScreen='root'|'sets'|'set';
type Sheet='portfolio'|'filters'|'sort'|null;

type Props={status:string;profileName:string};

type DemoCard={name:string;set:string;number:string;price:string;change:string;qty:string};

const quickFilters=[
  'POKÉMON','MAGIC','YU-GI-OH!','ONE PIECE','LORCANA','FLESH & BLOOD',
  'RIFTBOUND','DRAGON BALL','PALWORLD','UNION ARENA','STAR WARS','SORCERY',
  'GRAND ARCHIVE','TRANSFORMERS'
];

const demoSets=[
  ['30th Celebration','0/300'],['30th Classic','0/151'],['Prismatic Evolutions','0/347'],
  ['Stellar Crown','0/175'],['Trick or Trade','0/30'],['March Battle','0/15'],
  ['Obsidian Flames','0/230'],['Paldea Evolved','0/279'],['Surging Sparks','0/252'],
  ['Twilight Masquerade','0/226'],['Temporal Forces','0/218'],['Paldean Fates','0/245']
];

const demoCards:DemoCard[]=[
  {name:'Charizard',set:'30th Celebration: Classic Collection',number:'#4/102',price:'$186.50',change:'+$0.33 (0.18%)',qty:'Qty: 1'},
  {name:'Delcatty',set:'30th Celebration: Classic Collection',number:'#5/109',price:'$5.31',change:'+$0.02 (0.38%)',qty:'Qty: 0'},
  {name:'Genesect EX (Team Plasma)',set:'30th Celebration: Classic Collection',number:'#97',price:'$5.01',change:'+$0.01 (0.20%)',qty:'Qty: 0'},
  {name:'Metagross (Delta Species)',set:'30th Celebration: Classic Collection',number:'#113',price:'$15.30',change:'-$0.06 (-0.39%)',qty:'Qty: 0'}
];

const sortOptions=[
  'Price: Low to High','Price: High to Low','Price Change: Low to High','Price Change: High to Low',
  'Card Number: Low to High','Card Number: High to Low','Product Name: A to Z','Product Name: Z to A',
  'Date Added: Oldest First','Date Added: Newest First','Percent Change: Low to High','Percent Change: High to Low','Trending Today'
];

export default function MobileCollector({status,profileName}:Props){
  const [view,setView]=useState<MobileView>('home');
  const [searchScreen,setSearchScreen]=useState<SearchScreen>('root');
  const [sheet,setSheet]=useState<Sheet>(null);
  const [detail,setDetail]=useState<DemoCard|null>(null);
  const [homeTab,setHomeTab]=useState<'overview'|'performance'>('overview');
  const [query,setQuery]=useState('');
  const [portfolioName,setPortfolioName]=useState('Collecting');
  const [sort,setSort]=useState(sortOptions[0]);
  const [filterCards,setFilterCards]=useState(true);
  const [filterSealed,setFilterSealed]=useState(false);
  const [watchOnly,setWatchOnly]=useState(false);
  const [selected,setSelected]=useState<string[]>([]);
  const [selectMode,setSelectMode]=useState(false);
  const [profileTab,setProfileTab]=useState<'stats'|'settings'|'support'>('stats');

  const setViewAndReset=(next:MobileView)=>{
    setView(next);
    if(next!=='search')setSearchScreen('root');
    setDetail(null);
    setSheet(null);
  };

  if(detail){
    return <div className="mobile-collector-shell mobile-app-active">
      <MobileProductDetail card={detail} close={()=>setDetail(null)}/>
      <MobileBottomNav view={view} setView={setViewAndReset}/>
    </div>;
  }

  return <div className="mobile-collector-shell mobile-app-active">
    <main className="mc-screen-wrap">
      {view==='home'&&<MobileHome tab={homeTab} setTab={setHomeTab} portfolioName={portfolioName} choosePortfolio={()=>setSheet('portfolio')}/>} 
      {view==='search'&&<MobileSearchFlow screen={searchScreen} setScreen={setSearchScreen} query={query} setQuery={setQuery} openCard={setDetail} openFilters={()=>setSheet('filters')} openSort={()=>setSheet('sort')}/>} 
      {view==='shop'&&<MobileShop openCard={setDetail}/>} 
      {view==='social'&&<MobileSocial/>}
      {view==='portfolio'&&<MobilePortfolio portfolioName={portfolioName} query={query} setQuery={setQuery} openCard={setDetail} openFilters={()=>setSheet('filters')} openSort={()=>setSheet('sort')} selectMode={selectMode} setSelectMode={setSelectMode} selected={selected} setSelected={setSelected}/>} 
      {view==='profile'&&<MobileProfile name={profileName} status={status} tab={profileTab} setTab={setProfileTab} portfolioName={portfolioName}/>} 
    </main>

    <MobileBottomNav view={view} setView={setViewAndReset}/>

    {sheet==='portfolio'&&<PortfolioSheet selected={portfolioName} choose={(name)=>{setPortfolioName(name);setSheet(null)}} close={()=>setSheet(null)}/>} 
    {sheet==='filters'&&<FilterSheet watch={watchOnly} setWatch={setWatchOnly} cards={filterCards} setCards={setFilterCards} sealed={filterSealed} setSealed={setFilterSealed} close={()=>setSheet(null)}/>} 
    {sheet==='sort'&&<SortSheet value={sort} choose={(v)=>{setSort(v);setSheet(null)}} close={()=>setSheet(null)}/>} 

    {selectMode&&view==='portfolio'&&<div className="mc-selection-bar"><span>{selected.length} products selected</span><button onClick={()=>{setSelected([]);setSelectMode(false)}}>Cancel</button><button className="primary">Select Items</button></div>}
  </div>;
}

function MobileTopSearch({placeholder,value,setValue,onFilter,onSort,onBack}:{placeholder:string;value:string;setValue:(v:string)=>void;onFilter?:()=>void;onSort?:()=>void;onBack?:()=>void}){
  return <div className="mc-top-search">
    {onBack?<button className="mc-circle" onClick={onBack}><ArrowLeft/></button>:<button className="mc-circle"><Camera/></button>}
    <label className="mc-search-pill"><Search/><input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>{value&&<button onClick={()=>setValue('')}><X/></button>}</label>
    <button className="mc-circle"><Star/></button>
    {onSort&&<button className="mc-circle" onClick={onSort}><ArrowDownUp/></button>}
    {onFilter&&<button className="mc-circle" onClick={onFilter}><SlidersHorizontal/></button>}
  </div>;
}

function MobileHome({tab,setTab,portfolioName,choosePortfolio}:{tab:'overview'|'performance';setTab:(t:'overview'|'performance')=>void;portfolioName:string;choosePortfolio:()=>void}){
  return <section className="mc-page mc-home">
    <div className="mc-home-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='performance'?'active':''} onClick={()=>setTab('performance')}>Performance</button><span className="mc-currency-dot"/>USD</div>
    {tab==='overview'?<>
      <div className="mc-portfolio-head"><button onClick={choosePortfolio}>Portfolio: <b>{portfolioName}</b><ChevronDown/></button><strong>$770.26</strong><small className="loss">-$12.00 in the last 30 days</small></div>
      <MiniChart/>
      <RangeRow/>
      <section className="mc-panel"><div className="mc-panel-title"><h3>Most Valuable</h3></div><ValueRows/><button className="mc-view-all">View All</button></section>
      <section className="mc-section"><h3>Just For You</h3><div className="mc-promo-row"><div className="mc-promo-card">CELEBRATE<br/><b>30 YEARS</b></div><div className="mc-promo-card alt">25% OFF<br/><b>YOUR FIRST PACK</b></div></div></section>
      <section className="mc-section"><h3>Trending Today</h3><div className="mc-trending-row"><div className="mc-trend-thumb"/><div><b>Collector 101</b><small>Trending now</small></div><strong>+$0.74</strong></div></section>
    </>:<section className="mc-performance-card"><h2>Your Performance</h2><p>Collector helps you track the performance of your products by showing their current value and returns.</p><MiniChart compact/><button>View Transaction Logs</button></section>}
  </section>;
}

function MiniChart({compact=false}:{compact?:boolean}){
  return <div className={`mc-chart ${compact?'compact':''}`}><svg viewBox="0 0 390 170" preserveAspectRatio="none"><defs><linearGradient id="mcRedFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff1f2d" stopOpacity=".38"/><stop offset="1" stopColor="#ff1f2d" stopOpacity="0"/></linearGradient></defs><path d="M0 84 L18 55 L36 50 L50 116 L68 109 L82 126 L104 112 L126 117 L152 92 L172 79 L195 63 L214 70 L235 83 L258 72 L279 75 L300 89 L322 97 L342 79 L365 80 L390 82 L390 170 L0 170Z" fill="url(#mcRedFade)"/><path d="M0 84 L18 55 L36 50 L50 116 L68 109 L82 126 L104 112 L126 117 L152 92 L172 79 L195 63 L214 70 L235 83 L258 72 L279 75 L300 89 L322 97 L342 79 L365 80 L390 82" fill="none" stroke="#ff1f2d" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/></svg></div>;
}
function RangeRow(){return <div className="mc-ranges">{['1D','7D','1M','3M','6M','MAX'].map(r=><button key={r} className={r==='1M'?'active':''}>{r}</button>)}</div>}
function ValueRows(){return <div className="mc-value-list">{[['Sukuna (F) (SR)','$180'],['Satoru Gojo (SR)','$32.50'],['Parallel Lives (Borderless)','$28.96'],['Venom, Eddie Brock','$18.85']].map(([a,b])=><div key={a}><span>{a}<small>Near Mint • Foil</small></span><b>{b}</b></div>)}</div>}

function MobileSearchFlow({screen,setScreen,query,setQuery,openCard,openFilters,openSort}:{screen:SearchScreen;setScreen:(s:SearchScreen)=>void;query:string;setQuery:(v:string)=>void;openCard:(c:DemoCard)=>void;openFilters:()=>void;openSort:()=>void}){
  if(screen==='root')return <section className="mc-page"><MobileTopSearch placeholder="Search for products" value={query} setValue={setQuery} onFilter={openFilters} onSort={openSort}/><h3 className="mc-heading">Quick Filters</h3><div className="mc-quick-grid">{quickFilters.map((x,i)=><button key={x} onClick={()=>i===0&&setScreen('sets')}><span>{x}</span></button>)}</div></section>;
  if(screen==='sets')return <MobileSets query={query} setQuery={setQuery} back={()=>setScreen('root')} openSet={()=>setScreen('set')}/>;
  return <MobileSetProducts query={query} setQuery={setQuery} back={()=>setScreen('sets')} openCard={openCard} openFilters={openFilters} openSort={openSort}/>;
}

function MobileSets({query,setQuery,back,openSet}:{query:string;setQuery:(v:string)=>void;back:()=>void;openSet:()=>void}){
  return <section className="mc-page mc-sets"><div className="mc-title-row"><button className="mc-circle" onClick={back}><ArrowLeft/></button><h2>Pokemon Sets</h2></div><MobileTopSearch placeholder="Search by sets" value={query} setValue={setQuery}/><div className="mc-language-tabs"><button className="active">English</button><button>Japanese</button><button>Chinese</button><button>PullDex</button></div><div className="mc-set-grid">{demoSets.map(([name,progress])=><button className="mc-set-card" key={name} onClick={openSet}><div className="mc-set-logo">{name.toUpperCase()}</div><small>Progress: {progress}</small><small>Total Value: $0</small></button>)}</div></section>;
}

function MobileSetProducts({query,setQuery,back,openCard,openFilters,openSort}:{query:string;setQuery:(v:string)=>void;back:()=>void;openCard:(c:DemoCard)=>void;openFilters:()=>void;openSort:()=>void}){
  return <section className="mc-page"><MobileTopSearch placeholder="Search for products" value={query} setValue={setQuery} onBack={back} onFilter={openFilters} onSort={openSort}/><div className="mc-adding-line"><span>Adding to: <b>Dupes</b></span><button>Set Analytics</button></div><div className="mc-active-filter">Cards <X/></div><div className="mc-set-summary"><div className="mc-set-logo small">30TH</div><div><b>30th Celebration: Classic Collection</b><small>Progress: 0/300</small><small>Total Value: $0</small></div><button>Update</button></div><div className="mc-product-grid">{demoCards.map(c=><MobileProductCard key={c.name} card={c} open={()=>openCard(c)}/>)}</div></section>;
}

function MobileProductCard({card,open,selected=false,toggle}:{card:DemoCard;open:()=>void;selected?:boolean;toggle?:()=>void}){
  return <article className={`mc-product-card ${selected?'selected':''}`} onClick={toggle||open}><div className="mc-product-image"><span>{card.name.slice(0,1)}</span>{selected&&<i>✓</i>}</div><h4>{card.name}</h4><p>{card.set}</p><small>{card.number}</small><footer><div><b>{card.price}</b><em>{card.change}</em><span>{card.qty}</span></div><button onClick={e=>{e.stopPropagation();if(!toggle)open()}}><Plus/></button></footer></article>;
}

function MobilePortfolio({portfolioName,query,setQuery,openCard,openFilters,openSort,selectMode,setSelectMode,selected,setSelected}:{portfolioName:string;query:string;setQuery:(v:string)=>void;openCard:(c:DemoCard)=>void;openFilters:()=>void;openSort:()=>void;selectMode:boolean;setSelectMode:(v:boolean)=>void;selected:string[];setSelected:(v:string[])=>void}){
  const toggle=(name:string)=>setSelected(selected.includes(name)?selected.filter(x=>x!==name):[...selected,name]);
  return <section className="mc-page"><MobileTopSearch placeholder="Search your collection" value={query} setValue={setQuery} onFilter={openFilters} onSort={openSort}/><div className="mc-portfolio-value"><span>Portfolio: <b>{portfolioName}</b></span><strong>$223.65 <Eye/></strong><small className="gain">+$0.00</small></div><div className="mc-tool-icons"><button><BarChart3/><span>Market<br/>Movers</span></button><button><ArrowDownUp/><span>Trade<br/>Analyzer</span></button><button onClick={()=>setSelectMode(!selectMode)} className={selectMode?'active':''}><Layers3/><span>Bulk Actions</span></button><button><Download/><span>Export</span></button></div><div className="mc-product-grid">{demoCards.map(c=><MobileProductCard key={c.name} card={c} open={()=>openCard(c)} selected={selected.includes(c.name)} toggle={selectMode?()=>toggle(c.name):undefined}/>)}</div></section>;
}

function MobileShop({openCard}:{openCard:(c:DemoCard)=>void}){return <section className="mc-page"><div className="mc-page-title"><h2>Shop</h2></div><div className="mc-shop-banner"><span>Shop</span><b>View all listings</b><strong>Free<br/>$185.00</strong></div><h3 className="mc-heading">Check Out These Listings</h3><div className="mc-product-grid">{demoCards.slice(0,2).map(c=><MobileProductCard key={c.name} card={c} open={()=>openCard(c)}/>)}</div></section>}

function MobileSocial(){return <section className="mc-page"><MobileTopSearch placeholder="Search users and hashtags" value="" setValue={()=>{}}/><div className="mc-social-tabs"><button className="active">Following</button><button>For You</button><button>Your Posts</button></div><article className="mc-social-post"><header><div className="mc-avatar">C</div><div><b>Collector</b><small>3 days ago</small></div><button>Following</button><MoreHorizontal/></header><div className="mc-social-image">GIVEAWAY<br/><span>30th Celebration Set Boxes</span></div><div className="mc-social-actions"><Heart/>1.8K Likes <span>♡ 352</span></div><p><b>collector</b> Collector EPIC exclusive giveaway is here! This is a community showcase preview.</p></article></section>}

function MobileProfile({name,status,tab,setTab,portfolioName}:{name:string;status:string;tab:'stats'|'settings'|'support';setTab:(t:'stats'|'settings'|'support')=>void;portfolioName:string}){
  return <section className="mc-page"><div className="mc-profile-head"><div className="mc-profile-avatar">{(name||'C')[0]?.toUpperCase()}</div><h2>{name||'Collector'}</h2><small>{status}</small><div className="mc-profile-counts"><span><b>617</b>Total Cards</span><span><b>0</b>Total Sealed</span><span><b>0</b>Total Graded</span><span><b>$599.31</b>Total Value</span></div><div className="mc-profile-buttons"><button>View Social Profile</button><button>Edit Background</button></div></div><div className="mc-profile-tabs">{(['stats','settings','support'] as const).map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}</div>{tab==='stats'?<><h3 className="mc-heading">Portfolio: <b>{portfolioName}</b></h3><div className="mc-stat-grid"><span><b>21</b>Cards</span><span><b>0</b>Sealed</span><span><b>0</b>Graded</span><span><b>$223.65</b>Value</span></div><div className="mc-performance-card"><h3>Your Performance</h3><p>Collector helps you track the performance of your products by showing the current value and returns.</p><MiniChart compact/><button>View Transaction Logs</button></div></>:tab==='settings'?<div className="mc-settings-list"><button><Settings/>Account Settings</button><button><CircleDollarSign/>Currency: USD</button><button><Share2/>Share Profile</button></div>:<div className="mc-settings-list"><button>Help Center</button><button>Contact Support</button><button>About Collector</button></div>}</section>;
}

function MobileProductDetail({card,close}:{card:DemoCard;close:()=>void}){
  const [grade,setGrade]=useState<'RAW'|'GRADED'|'POP'>('RAW');
  return <section className="mc-page mc-product-detail"><div className="mc-detail-top"><button className="mc-circle" onClick={close}><ArrowLeft/></button><button className="mc-circle"><Share2/></button></div><div className="mc-detail-image"><span>{card.name}</span></div><div className="mc-detail-body"><div className="mc-detail-title"><div><h2>{card.name}</h2><p>{card.set} • {card.number}</p></div><button><Star/></button></div><div className="mc-detail-price"><strong>{card.price}</strong><small className="gain">{card.change}</small></div><button className="mc-sold-button"><ShoppingBag/>View Sold Listings</button><div className="mc-grade-tabs">{(['RAW','GRADED','POP'] as const).map(x=><button className={grade===x?'active':''} key={x} onClick={()=>setGrade(x)}>{x}</button>)}</div><div className="mc-history-card"><div className="mc-history-head"><span>Holofoil</span><strong>$99.99</strong></div><MiniChart/><RangeRow/></div><button className="mc-share-main">Share</button></div></section>;
}

function PortfolioSheet({selected,choose,close}:{selected:string;choose:(s:string)=>void;close:()=>void}){
  return <BottomSheet title="Choose Portfolio" close={close}><div className="mc-sheet-heading"><span>All Portfolios</span><button>Add New</button></div><p className="mc-sheet-copy">Switch between your collections. Product-based actions are disabled in this preview.</p>{['Collecting','Dupes'].map(x=><button className="mc-portfolio-row" key={x} onClick={()=>choose(x)}><i className="mc-red-dot"/><span><b>{x}</b><small>{x==='Collecting'?'616 Products':'21 Products'}</small></span><Star className={selected===x?'selected':''}/><MoreHorizontal/></button>)}</BottomSheet>;
}

function FilterSheet({watch,setWatch,cards,setCards,sealed,setSealed,close}:{watch:boolean;setWatch:(v:boolean)=>void;cards:boolean;setCards:(v:boolean)=>void;sealed:boolean;setSealed:(v:boolean)=>void;close:()=>void}){
  return <BottomSheet title="Filters" close={close} tall><FilterBlock title="Watchlist" copy="Show only products on your Watchlist."><SheetCheck label="Watchlist" checked={watch} setChecked={setWatch}/></FilterBlock><FilterBlock title="Product Type" copy="Filter by type of product."><SheetCheck label="Cards Only" checked={cards} setChecked={setCards}/><SheetCheck label="Sealed Only" checked={sealed} setChecked={setSealed}/></FilterBlock><FilterBlock title="Product Status within Portfolio" copy="Filter by inventory status within your currently selected portfolio."><SheetCheck label="Products Owned" checked={false} setChecked={()=>{}}/></FilterBlock><FilterBlock title="Price Range" copy="Show all products within a price range (inclusive)."><div className="mc-price-row"><input placeholder="Min."/><span>to</span><input placeholder="Max."/></div></FilterBlock><FilterBlock title="Language" copy="Filters by language.">{['English','Japanese','Chinese'].map(x=><SheetCheck key={x} label={x} checked={false} setChecked={()=>{}}/>)}</FilterBlock><FilterBlock title="Category" copy="Select a category below."/></BottomSheet>;
}

function SortSheet({value,choose,close}:{value:string;choose:(v:string)=>void;close:()=>void}){return <BottomSheet title="Sort By" close={close} tall>{sortOptions.map(x=><button className="mc-sort-row" key={x} onClick={()=>choose(x)}><span>{x}</span><i className={value===x?'selected':''}/></button>)}</BottomSheet>}

function BottomSheet({title,close,children,tall=false}:{title:string;close:()=>void;children:React.ReactNode;tall?:boolean}){return <div className="mc-sheet-overlay" onClick={close}><section className={`mc-bottom-sheet ${tall?'tall':''}`} onClick={e=>e.stopPropagation()}><div className="mc-sheet-handle"/><header><span/><h3>{title}</h3><button onClick={close}><X/></button></header><div className="mc-sheet-scroll">{children}</div></section></div>}
function FilterBlock({title,copy,children}:{title:string;copy:string;children?:React.ReactNode}){return <section className="mc-filter-block"><h4>{title}</h4><p>{copy}</p><div>{children}</div></section>}
function SheetCheck({label,checked,setChecked}:{label:string;checked:boolean;setChecked:(v:boolean)=>void}){return <button className="mc-sheet-check" onClick={()=>setChecked(!checked)}><span>{label}</span><i className={checked?'checked':''}>{checked?'✓':''}</i></button>}

function MobileBottomNav({view,setView}:{view:MobileView;setView:(v:MobileView)=>void}){
  const tabs:[MobileView,string,React.ReactNode][]=[['home','Home',<Home key="h"/>],['search','Search',<Search key="s"/>],['shop','Shop',<Store key="sh"/>],['social','Social',<Users key="so"/>],['portfolio','Portfolio',<Package key="p"/>],['profile','Profile',<UserCircle key="u"/>]];
  return <nav className="mc-bottom-nav">{tabs.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{icon}<span>{label}</span></button>)}</nav>;
}

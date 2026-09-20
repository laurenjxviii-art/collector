'use client';

import {useMemo,useState} from 'react';
import {
  Bell,ChevronDown,Command,Download,ExternalLink,Filter,Heart,Menu,
  Plus,Search,SlidersHorizontal,Star,Upload,UserCircle,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import MobileCollector from './MobileCollector';

type MainView='explore'|'sets'|'shop'|'portfolio'|'showcase';
type PortfolioTab='overview'|'products'|'performance';

type ToggleProps={checked:boolean;onChange:()=>void;label:string};

const navItems:[MainView,string][]=[
  ['explore','Explore'],['sets','Sets'],['shop','Shop'],['portfolio','Portfolio'],['showcase','Showcase']
];

export default function Page(){
  const cloud=useWorkspace();
  const [view,setView]=useState<MainView>('portfolio');
  const [tab,setTab]=useState<PortfolioTab>('products');
  const [commandOpen,setCommandOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const [eventOpen,setEventOpen]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);

  if(!cloud.ready){
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Loading Collector…</div>;
  }

  return <>
    <MobileCollector status={cloud.status} profileName={cloud.data.profile?.name||'XVIIITCG'} data={cloud.data} update={cloud.update} config={cloud.config} session={cloud.session}/>
    <div className="min-h-screen bg-background text-foreground source-clone-root desktop-source-shell">
    <header className="sticky top-0 z-50 transition-all duration-150 bg-background/95 backdrop-blur-sm">
      <div className="px-2 mx-auto md:px-6 xl:px-8 max-w-(--breakpoint-2xl)">
        <div className="relative flex items-center gap-3 sm:h-20 h-16">
          <div className="flex items-center xl:hidden">
            <button className="source-icon-button" aria-label="Open main menu" onClick={()=>setMobileMenu(v=>!v)}><Menu className="size-5"/></button>
          </div>

          <div className="flex sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2 xl:left-0 xl:translate-x-0 items-center gap-6">
            <button className="source-wordmark" onClick={()=>setView('explore')}>COLLECTOR</button>
            <nav className="hidden xl:flex items-center gap-6 text-sm font-medium">
              {navItems.map(([id,label])=><button key={id} className={`source-nav-link ${view===id?'active':''}`} onClick={()=>setView(id)}>{label}</button>)}
              <a className="source-nav-link" href="https://getcollectr.com/" target="_blank" rel="noreferrer">About Us</a>
            </nav>
          </div>

          <button className="relative select-none cursor-pointer outline-none focus-visible:ring-ring/50 source-event-pill hidden lg:flex" onClick={()=>setEventOpen(v=>!v)}>
            <span>CELEBRATING POKÉMON 30TH ERA</span><ChevronDown className="size-4"/>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="source-command-trigger hidden md:flex" onClick={()=>setCommandOpen(true)}>
              <kbd>⌘ K</kbd><Search className="size-4"/><span>Search sealed or unsealed products...</span>
            </button>
            <button className="source-header-plain">USD</button>
            <div className="relative">
              <button className="source-account" onClick={()=>setAccountOpen(v=>!v)}><UserCircle className="size-5"/><span className="hidden sm:inline">Account</span><ChevronDown className="size-4"/></button>
              {accountOpen&&<Popup className="right-0 top-[calc(100%+8px)] w-64">
                <div className="px-3 py-2"><div className="text-sm font-semibold">XVIIITCG</div><div className="text-xs text-muted-foreground">Collector profile</div></div>
                <div className="bg-border h-px"/>
                <button className="source-popup-row">Profile</button>
                <button className="source-popup-row">Settings</button>
                <button className="source-popup-row">Cloud: {cloud.status}</button>
              </Popup>}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-border shrink-0 h-px w-full"/>

      {mobileMenu&&<div className="xl:hidden bg-card border-b border-input px-4 py-3 grid gap-1 animate-in fade-in duration-150">
        {navItems.map(([id,label])=><button key={id} className="source-mobile-row" onClick={()=>{setView(id);setMobileMenu(false)}}>{label}</button>)}
      </div>}
      {eventOpen&&<div className="source-event-menu animate-in fade-in duration-150"><div className="text-sm font-semibold">Pokémon 30th Era</div><div className="text-xs text-muted-foreground mt-1">Collector event shortcut</div></div>}
    </header>

    {view==='portfolio'?<Portfolio tab={tab} setTab={setTab}/>:<GenericPage view={view}/>} 

    {commandOpen&&<CommandPalette close={()=>setCommandOpen(false)} setView={(v)=>{setView(v);setCommandOpen(false)}}/>}
    </div>
  </>
}

function Portfolio({tab,setTab}:{tab:PortfolioTab;setTab:(t:PortfolioTab)=>void}){
  return <div className="flex flex-col xl:flex-nowrap xl:flex-col mx-auto w-full px-2 sm:px-6 xl:px-8 pb-6 max-w-(--breakpoint-2xl)">
    <div className="flex md:justify-start justify-center py-3 md:py-6">
      <div className="flex flex-col gap-2">
        <div className="dark:bg-muted bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-full p-[3px]">
          {(['overview','products','performance'] as PortfolioTab[]).map(t=><button key={t} className={`source-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>)}
        </div>
      </div>
    </div>
    {tab==='products'?<PortfolioProducts/>:tab==='overview'?<PortfolioOverview/>:<PortfolioPerformance/>}
  </div>
}

function PortfolioProducts(){
  const [query,setQuery]=useState('');
  const [watchlist,setWatchlist]=useState(false);
  const [type,setType]=useState<'all'|'cards'|'sealed'>('all');
  const [graded,setGraded]=useState<'all'|'graded'|'raw'>('all');
  const [sortOpen,setSortOpen]=useState(false);
  const [addingOpen,setAddingOpen]=useState(false);

  return <>
    <div className="flex flex-col w-full mx-auto lg:flex-nowrap lg:flex-col max-w-screen-2xl">
      <div className="flex justify-center">
        <div className="border dark:border-input w-full bg-card text-card-foreground px-4 lg:px-5 py-5 rounded-md mx-auto shadow-xs">
          <div className="flex flex-row items-center mb-3"><h3 className="text-xl font-semibold">Find a Product</h3></div>
          <form className="relative" onSubmit={e=>e.preventDefault()}>
            <div className="flex flex-col xl:flex-row">
              <div className="relative w-full">
                <input className="source-search-input" placeholder="Search any sealed or unsealed product..." type="search" value={query} onChange={e=>setQuery(e.target.value)}/>
                <div className="absolute top-3 left-3"><Search className="w-4 h-4 text-muted-foreground"/></div>
                {query&&<button className="absolute top-2 right-2 source-clear" onClick={()=>setQuery('')} type="button"><X className="size-4"/></button>}
              </div>
              <button className="source-search-button" type="submit">Search</button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 mt-5 md:mt-6 items-center gap-3">
        <div className="flex items-center justify-center md:justify-start relative">
          <button className="source-adding-button" onClick={()=>setAddingOpen(v=>!v)}><span>Adding to:</span><b>Collecting</b><ChevronDown className="size-4"/></button>
          {addingOpen&&<Popup className="left-0 top-[calc(100%+8px)] w-64"><button className="source-popup-row active">Collecting</button><button className="source-popup-row">Wishlist</button></Popup>}
        </div>
        <div/>
        <div className="flex items-center justify-center mt-2 md:mt-0 md:justify-end space-x-2.5">
          <button className="source-tool-button">Market Movers</button>
          <button className="source-tool-button">Trade Analyzer</button>
          <button className="source-icon-square" title="Export"><Download className="size-4"/></button>
          <div className="relative"><button className="source-sort-button" onClick={()=>setSortOpen(v=>!v)}>Sort by: <b>Best Match</b><ChevronDown className="size-4"/></button>{sortOpen&&<Popup className="right-0 top-[calc(100%+8px)] w-52"><button className="source-popup-row active">Best Match</button><button className="source-popup-row">Highest Value</button><button className="source-popup-row">Lowest Value</button></Popup>}</div>
        </div>
      </div>
    </div>

    <div className="flex flex-col w-full pb-6 mx-auto xl:flex-nowrap xl:flex-row mt-5 max-w-screen-2xl">
      <div className="w-3/13 hidden xl:block mr-4">
        <aside className="flex flex-col w-full px-4 py-5 bg-card rounded-md border dark:border-input shadow-sm transition-all duration-300">
          <FilterSection title="Watchlist" copy="Show only products on your Watchlist."><CheckToggle checked={watchlist} onChange={()=>setWatchlist(v=>!v)} label="Watchlist"/></FilterSection>
          <FilterSection title="Product Type" copy="Filter by type of product."><Radio label="Cards Only" checked={type==='cards'} onChange={()=>setType(type==='cards'?'all':'cards')}/><Radio label="Sealed Only" checked={type==='sealed'} onChange={()=>setType(type==='sealed'?'all':'sealed')}/></FilterSection>
          <FilterSection title="Graded Cards" copy="Filter by type of cards that are graded."><Radio label="Graded Cards" checked={graded==='graded'} onChange={()=>setGraded(graded==='graded'?'all':'graded')}/><Radio label="Raw Cards" checked={graded==='raw'} onChange={()=>setGraded(graded==='raw'?'all':'raw')}/></FilterSection>
          <FilterSection title="Price" copy="Filter products by market price."><div className="grid grid-cols-2 gap-2"><input className="source-filter-input" placeholder="Min"/><input className="source-filter-input" placeholder="Max"/></div></FilterSection>
          <FilterSection title="Quantity" copy="Filter products by quantity owned."><input className="source-filter-input" placeholder="Any quantity"/></FilterSection>
          <FilterSection title="Language" copy="Filter by product language."><button className="source-select-full">Any Language<ChevronDown className="size-4"/></button></FilterSection>
          <FilterSection title="Category" copy="Filter by collectible category."><button className="source-select-full">All Categories<ChevronDown className="size-4"/></button></FilterSection>
        </aside>
        <FooterCard/>
      </div>

      <div className="flex flex-col w-full min-w-0">
        <div className="flex xl:hidden mb-4 gap-2 overflow-x-auto pb-1">
          <button className="source-tool-button"><Filter className="size-4"/> Filters</button>
          <button className="source-tool-button"><Heart className="size-4"/> Watchlist</button>
          <button className="source-tool-button"><SlidersHorizontal className="size-4"/> Sort</button>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 mb-6 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 h-min">
          <EmptyProductCard/><EmptyProductCard/><EmptyProductCard/><EmptyProductCard/><EmptyProductCard/>
        </div>
        <div className="source-empty-notice">Your products are safely stored in the backend and hidden while we rebuild the frontend.</div>
      </div>
    </div>
  </>
}

function PortfolioOverview(){
  const [scopeOpen,setScopeOpen]=useState(false);
  return <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 max-w-screen-2xl mx-auto w-full">
    <div className="grid gap-5">
      <section className="bg-card border border-input rounded-md shadow-sm p-5 min-h-[470px]">
        <div className="flex justify-between items-start gap-4">
          <div><div className="relative inline-flex items-center gap-1 text-xl font-semibold">Portfolio: <button className="text-collectr-brand-primary flex items-center gap-1" onClick={()=>setScopeOpen(v=>!v)}>Collecting<ChevronDown className="size-4"/></button>{scopeOpen&&<Popup className="left-20 top-8 w-56"><button className="source-popup-row active">Collecting</button></Popup>}</div><div className="text-4xl font-semibold mt-3">$0.00</div><div className="text-sm text-muted-foreground mt-1">+$0.00 (0.00%)</div></div>
          <div className="text-right text-sm text-muted-foreground">Combined Value<br/><span className="text-foreground font-semibold">$0.00</span></div>
        </div>
        <div className="source-chart-placeholder"><svg viewBox="0 0 1000 260" preserveAspectRatio="none"><defs><linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--collectr-brand-primary)" stopOpacity=".22"/><stop offset="1" stopColor="var(--collectr-brand-primary)" stopOpacity="0"/></linearGradient></defs><path d="M0 210 C180 200,240 145,350 160 C520 185,620 80,760 115 C850 136,920 80,1000 88 L1000 260 L0 260Z" fill="url(#chartFade)"/><path d="M0 210 C180 200,240 145,350 160 C520 185,620 80,760 115 C850 136,920 80,1000 88" fill="none" stroke="var(--collectr-brand-primary)" strokeWidth="3"/></svg></div>
        <div className="flex justify-center gap-1 mt-2">{['1D','7D','1M','3M','6M','MAX'].map((r,i)=><button key={r} className={`source-range ${i===2?'active':''}`}>{r}</button>)}</div>
      </section>
      <section className="bg-card border border-input rounded-md shadow-sm p-5 min-h-48"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Trending Today</h3><button className="text-sm text-collectr-brand-primary">View All</button></div><p className="text-xs text-muted-foreground mt-1">Products trending in the market today</p><div className="source-empty-center">No results</div></section>
    </div>
    <div className="grid gap-5 content-start">
      <section className="bg-card border border-input rounded-md shadow-sm p-5"><h3 className="text-xl font-semibold">Holdings Breakdown</h3><p className="text-xs text-muted-foreground mt-1 mb-5">Breakdown of your portfolio by category</p>{['cards','sealed','graded'].map(x=><div className="source-holding" key={x}><span>{x}</span><i><em style={{width:'0%'}}/></i><b>(0%)</b><strong>0</strong></div>)}</section>
      <section className="bg-card border border-input rounded-md shadow-sm p-5 min-h-64"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Most Valuable</h3><button className="text-sm text-collectr-brand-primary">View All</button></div><p className="text-xs text-muted-foreground mt-1">List of your most valuable products</p><div className="source-empty-center">No results</div></section>
    </div>
  </div>
}

function PortfolioPerformance(){
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-screen-2xl mx-auto w-full">
    <section className="bg-card border border-input rounded-md p-5 min-h-80"><h3 className="text-xl font-semibold">Portfolio Performance</h3><p className="text-xs text-muted-foreground mt-1">Performance data will reconnect after the shell is approved.</p><div className="source-empty-center">No results</div></section>
    <section className="bg-card border border-input rounded-md p-5 min-h-80"><h3 className="text-xl font-semibold">Gains & Losses</h3><p className="text-xs text-muted-foreground mt-1">Performance breakdown by product.</p><div className="source-empty-center">No results</div></section>
  </div>
}

function GenericPage({view}:{view:Exclude<MainView,'portfolio'>}){
  const title={explore:'Explore',sets:'Sets',shop:'Shop',showcase:'Showcase'}[view];
  const copy={explore:'Search the entire collectible market.',sets:'Browse collectible sets and collections.',shop:'Browse marketplace listings.',showcase:'Showcase your collection.'}[view];
  return <main className="px-2 mx-auto md:px-6 xl:px-8 pb-8 max-w-(--breakpoint-2xl)">
    <div className="py-6"><h1 className="text-3xl font-bold">{title}</h1><p className="text-sm text-muted-foreground mt-1">{copy}</p></div>
    <section className="border border-input bg-card rounded-md shadow-xs p-5"><div className="relative"><input className="source-search-input" placeholder={`Search ${title.toLowerCase()}...`}/><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/></div></section>
    <div className="source-empty-page"><div className="size-12 rounded-full bg-muted grid place-items-center"><Star className="size-5 text-muted-foreground"/></div><h2 className="text-lg font-semibold mt-3">Clean shell ready</h2><p className="text-sm text-muted-foreground mt-1 max-w-md text-center">This section is intentionally empty while your existing products and categories remain tucked away in the backend.</p></div>
  </main>
}

function FilterSection({title,copy,children}:{title:string;copy:string;children:React.ReactNode}){
  return <div className="w-full mb-5"><div className="mb-3"><div className="flex flex-row justify-between items-center"><h4 className="font-semibold">{title}</h4></div><p className="text-xs text-muted-foreground">{copy}</p></div><div className="grid gap-2">{children}</div></div>
}

function CheckToggle({checked,onChange,label}:ToggleProps){
  return <label className="flex items-center gap-2 cursor-pointer"><button aria-checked={checked} className={`source-checkbox ${checked?'checked':''}`} onClick={onChange} type="button">{checked?<span>✓</span>:null}</button><span className="text-sm font-medium text-muted-foreground">{label}</span></label>
}
function Radio({checked,onChange,label}:ToggleProps){
  return <label className="flex items-center gap-2 cursor-pointer"><button aria-checked={checked} className={`source-radio ${checked?'checked':''}`} onClick={onChange} type="button"><i/></button><span className="text-sm font-medium text-muted-foreground">{label}</span></label>
}

function EmptyProductCard(){
  return <div className="product-card flex flex-col px-3 py-3 bg-card border-input shadow-sm rounded-md border h-full source-product-placeholder">
    <div className="relative w-full h-fit ratio-card overflow-hidden mx-auto rounded-md source-product-image-placeholder"/>
    <span className="mt-3 text-lg mb-1 leading-tight font-bold text-card-foreground">Product</span>
    <div className="leading-tight"><span className="sm:text-sm text-xs underline text-muted-foreground">Collection</span><div className="text-muted-foreground sm:text-sm text-xs">Identifier • Number</div></div>
    <div className="flex flex-row flex-wrap justify-between items-center mt-auto gap-x-2 gap-y-1"><div className="flex flex-col items-start"><div className="text-base sm:text-lg font-bold leading-tight">$0.00</div><div className="text-xs text-muted-foreground">+$0.00 (0.00%)</div><div className="text-collectr-brand-primary text-xs mt-1">Qty: 0</div></div><button className="group flex size-8 items-center justify-center rounded-full border-collectr-brand-primary border-[1.5px] hover:bg-collectr-brand-primary"><Plus className="size-5 stroke-collectr-brand-primary group-hover:stroke-white"/></button></div>
  </div>
}

function FooterCard(){
  return <div className="bg-card text-card-foreground flex flex-col gap-5 border-input border rounded-md shadow-sm mt-4 px-4 py-5"><div className="font-semibold">Connect With Us</div><div className="grid gap-2 text-sm text-muted-foreground"><span>Discord</span><span>Instagram</span><span>Facebook</span></div><div className="text-xs text-muted-foreground">Collector © 2026. Personal collection manager.</div></div>
}

function Popup({children,className}:{children:React.ReactNode;className:string}){
  return <div className={`absolute z-[200] rounded-md border border-input bg-popover text-popover-foreground shadow-xl p-1 animate-in fade-in duration-150 ${className}`}>{children}</div>
}

function CommandPalette({close,setView}:{close:()=>void;setView:(v:MainView)=>void}){
  const [q,setQ]=useState('');
  const choices=useMemo(()=>navItems.filter(([,l])=>l.toLowerCase().includes(q.toLowerCase())),[q]);
  return <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm grid place-items-start pt-[12vh] px-4" onMouseDown={close}><section className="w-full max-w-2xl bg-popover border border-input rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-150" onMouseDown={e=>e.stopPropagation()}><div className="h-14 px-4 flex items-center gap-3 border-b border-input"><Search className="size-5 text-muted-foreground"/><input autoFocus className="flex-1 bg-transparent outline-none text-base" placeholder="Search for a command to run..." value={q} onChange={e=>setQ(e.target.value)}/><button onClick={close}><X className="size-5"/></button></div><div className="p-2 max-h-80 overflow-auto">{choices.map(([id,label])=><button key={id} className="source-command-row" onClick={()=>setView(id)}><Command className="size-4"/><span>{label}</span><span className="ml-auto text-xs text-muted-foreground">Open</span></button>)}</div></section></div>
}

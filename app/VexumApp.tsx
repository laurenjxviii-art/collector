'use client';

import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {
  CircleDollarSign,Eye,FileUp,Layers3,Plus,Search,Share2,ShoppingBag,
  SlidersHorizontal,Star
} from 'lucide-react';
import VexumPortfolio from './VexumPortfolio';
import VexumSearch from './search/VexumSearch';
import VexumWishlist from './VexumWishlist';
import VexumFinancial from './VexumFinancial';
import VexumSetup from './VexumSetup';
import {useWorkspace} from '../lib/useWorkspace';

type View='home'|'portfolio'|'search'|'wishlist'|'sell'|'setup'|'financial'|'social';
type Tone='red'|'green'|'orange'|'muted';

const RED='#ff2338';

const NAV:Array<{id:View;label:string;icon:ReactNode}>=[
  {id:'home',label:'Home',icon:<Layers3/>},
  {id:'portfolio',label:'Portfolio',icon:<Layers3/>},
  {id:'search',label:'Search',icon:<Search/>},
  {id:'wishlist',label:'Wishlist',icon:<Star/>},
  {id:'sell',label:'Sell',icon:<ShoppingBag/>},
  {id:'setup',label:'Setup',icon:<SlidersHorizontal/>},
  {id:'financial',label:'Financial',icon:<CircleDollarSign/>},
  {id:'social',label:'Social',icon:<Share2/>},
];

function Logo(){
  return <div className="vx-logo"><span className="vx-vmark">V</span><strong>VEXUM</strong></div>;
}

function Sidebar({view,setView}:{view:View;setView:(v:View)=>void}){
  return <aside className="vx-sidebar">
    <Logo/>
    <nav className="vx-nav">
      {NAV.map(item=><button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}>{item.icon}<span>{item.label}</span></button>)}
    </nav>
    <div className="vx-quick">
      <span>Quick Add</span>
      <button onClick={()=>setView('search')}><Search/><span>Scan Item</span></button>
      <button><Plus/><span>Add Manually</span></button>
      <button><FileUp/><span>Import Receipt</span></button>
      <button onClick={()=>setView('wishlist')}><Star/><span>Add to Wishlist</span></button>
    </div>
    <div className="vx-user"><div className="vx-avatar">J</div><div><strong>Jordan</strong><span>Collector · Level 12</span></div><i/></div>
  </aside>;
}

function Topbar({hero}:{hero:string}){
  return <div className={'vx-topbar hero-'+hero}>
    <button className="vx-searchbox"><Search/><span>Search for anything...</span><kbd>⌘ K</kbd></button>
    <div className="vx-topicons"><button><Star/></button><button><Eye/></button><button><Layers3/></button><button><Star/></button><button className="vx-top-avatar">J</button></div>
  </div>;
}

function PageFrame({hero,children}:{hero:string;children:ReactNode}){
  return <main className={'vx-content page-'+hero}><Topbar hero={hero}/>{children}</main>;
}

function HeroMeta({text='“Discipline today. A bigger collection tomorrow.”'}:{text?:string}){
  return <div className="vx-hero-meta"><span>Mon, Jan 27</span><q>{text}</q></div>;
}

function Tabs({items}:{items:string[]}){
  return <div className="vx-tabs">{items.map((item,index)=><button key={item} className={index===0?'active':''}>{item}</button>)}</div>;
}

function Stat({label,value,change,tone='red'}:{label:string;value:string;change:string;tone?:Tone}){
  return <div className="vx-stat"><span className="vx-stat-label">{label}</span><strong>{value}</strong><span className={'tone-'+tone}>{change}</span></div>;
}

function PanelHead({title,action}:{title:string;action?:string}){
  return <div className="vx-panel-head"><h3>{title}</h3>{action?<button>{action}</button>:null}</div>;
}

function Range(){
  return <div className="vx-ranges">{['1W','1M','3M','1Y','ALL'].map((item,index)=><button key={item} className={index===2?'active':''}>{item}</button>)}</div>;
}

function BigChart(){
  return <svg className="vx-big-chart" viewBox="0 0 700 260" preserveAspectRatio="none">
    <defs><linearGradient id="vxg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={RED} stopOpacity=".34"/><stop offset="1" stopColor={RED} stopOpacity="0"/></linearGradient></defs>
    <path d="M0 215 L45 190 L82 196 L120 172 L158 145 L195 120 L225 128 L262 103 L300 82 L337 92 L372 70 L410 60 L445 78 L480 56 L520 42 L555 48 L590 32 L630 20 L700 14 L700 260 L0 260 Z" fill="url(#vxg1)"/>
    <path d="M0 215 L45 190 L82 196 L120 172 L158 145 L195 120 L225 128 L262 103 L300 82 L337 92 L372 70 L410 60 L445 78 L480 56 L520 42 L555 48 L590 32 L630 20 L700 14" fill="none" stroke={RED} strokeWidth="4"/>
    <circle cx="410" cy="60" r="7" fill={RED}/><line x1="410" y1="60" x2="410" y2="245" stroke={RED} strokeDasharray="3 4" opacity=".55"/>
    <g className="vx-chart-labels"><text x="0" y="252">Jan 2</text><text x="110" y="252">Jan 16</text><text x="235" y="252">Jan 30</text><text x="360" y="252">Feb 13</text><text x="490" y="252">Feb 27</text><text x="625" y="252">Mar 12</text></g>
  </svg>;
}

function DoubleChart(){
  return <svg className="vx-double-chart" viewBox="0 0 650 245" preserveAspectRatio="none">
    {[40,85,130,175,220].map(y=><line key={y} x1="0" y1={y} x2="650" y2={y} stroke="#232429"/>)}
    <path d="M0 210 L25 192 L52 180 L80 165 L110 172 L140 148 L170 142 L200 120 L230 126 L260 108 L290 112 L320 95 L350 101 L380 84 L410 72 L440 77 L470 56 L500 61 L530 42 L560 48 L590 34 L620 39 L650 24" fill="none" stroke={RED} strokeWidth="3"/>
    <path d="M0 225 L25 218 L52 204 L80 198 L110 201 L140 184 L170 176 L200 163 L230 169 L260 148 L290 151 L320 139 L350 144 L380 126 L410 119 L440 123 L470 105 L500 111 L530 92 L560 98 L590 82 L620 86 L650 72" fill="none" stroke="#c8c8cc" strokeWidth="2.5"/>
  </svg>;
}

function SmallChart(){
  return <svg className="vx-small-chart" viewBox="0 0 360 110" preserveAspectRatio="none"><path d="M0 73 L20 66 L42 70 L65 61 L88 64 L110 56 L132 60 L152 51 L174 55 L196 48 L218 52 L240 44 L262 48 L284 42 L306 47 L330 41 L360 44" fill="none" stroke={RED} strokeWidth="2.5"/><line x1="0" y1="90" x2="360" y2="90" stroke="#2a2b30"/></svg>;
}

type HomeWidgetId=
  'collectionValue'|'costBasis'|'profitLoss'|'monthlySpend'|'brief'|'wishlist'|'drops'|'changes'|
  'finance'|'capacity'|'progress'|'purchases'|'sales'|'social'|'calendar'|'alerts';
type HomeWidgetSize='small'|'medium'|'large'|'wide'|'full';

const HOME_WIDGET_ORDER:HomeWidgetId[]=[
  'collectionValue','costBasis','profitLoss','monthlySpend','brief','alerts','wishlist','drops',
  'changes','finance','capacity','progress','purchases','sales','social','calendar'
];
const HOME_WIDGET_SIZES:Record<HomeWidgetId,HomeWidgetSize>={
  collectionValue:'small',costBasis:'small',profitLoss:'small',monthlySpend:'small',
  brief:'wide',alerts:'medium',wishlist:'medium',drops:'medium',changes:'medium',
  finance:'medium',capacity:'medium',progress:'medium',purchases:'large',sales:'large',
  social:'medium',calendar:'wide'
};
const HOME_SIZE_CYCLE:HomeWidgetSize[]=['small','medium','large','wide','full'];

function HomeSpark({tone='red'}:{tone?:'red'|'green'}){
  const stroke=tone==='green'?'#25e2a0':RED;
  return <svg className="vx-widget-spark" viewBox="0 0 120 38" preserveAspectRatio="none"><polyline points="0,30 12,27 22,29 34,22 45,24 56,16 67,19 79,12 91,15 103,8 120,3" fill="none" stroke={stroke} strokeWidth="2.2"/></svg>;
}

function HomeWidgetShell({
  id,title,icon,size,customizing,children,onHide,onResize,onDragStart,onDrop
}:{
  id:HomeWidgetId;title:string;icon:ReactNode;size:HomeWidgetSize;customizing:boolean;children:ReactNode;
  onHide:(id:HomeWidgetId)=>void;onResize:(id:HomeWidgetId)=>void;onDragStart:(id:HomeWidgetId)=>void;onDrop:(id:HomeWidgetId)=>void;
}){
  return <section
    className={'vx-panel vx-home-widget size-'+size+(customizing?' is-customizing':'')}
    draggable={customizing}
    onDragStart={()=>onDragStart(id)}
    onDragOver={event=>{if(customizing)event.preventDefault()}}
    onDrop={()=>onDrop(id)}
  >
    <div className="vx-home-widget-head">
      <div className="vx-home-widget-title"><span>{icon}</span><h3>{title}</h3></div>
      {customizing?<div className="vx-widget-controls"><button title="Resize widget" onClick={()=>onResize(id)}>↔ {size[0].toUpperCase()}</button><button title="Hide widget" onClick={()=>onHide(id)}>×</button><i title="Drag to reorder">⠿</i></div>:<button className="vx-widget-more">•••</button>}
    </div>
    {children}
  </section>;
}

function HomePage(){
  const [customizing,setCustomizing]=useState(false);
  const [order,setOrder]=useState<HomeWidgetId[]>(HOME_WIDGET_ORDER);
  const [hidden,setHidden]=useState<HomeWidgetId[]>([]);
  const [sizes,setSizes]=useState<Record<HomeWidgetId,HomeWidgetSize>>(HOME_WIDGET_SIZES);
  const [dragged,setDragged]=useState<HomeWidgetId|null>(null);

  useEffect(()=>{
    try{
      const saved=localStorage.getItem('vexum.home.layout.v1');
      if(!saved)return;
      const parsed=JSON.parse(saved) as {order?:HomeWidgetId[];hidden?:HomeWidgetId[];sizes?:Partial<Record<HomeWidgetId,HomeWidgetSize>>};
      if(Array.isArray(parsed.order)&&parsed.order.length)setOrder(parsed.order.filter(id=>HOME_WIDGET_ORDER.includes(id)));
      if(Array.isArray(parsed.hidden))setHidden(parsed.hidden.filter(id=>HOME_WIDGET_ORDER.includes(id)));
      if(parsed.sizes)setSizes({...HOME_WIDGET_SIZES,...parsed.sizes});
    }catch{}
  },[]);
  useEffect(()=>{
    try{localStorage.setItem('vexum.home.layout.v1',JSON.stringify({order,hidden,sizes}))}catch{}
  },[order,hidden,sizes]);

  const hideWidget=(id:HomeWidgetId)=>setHidden(list=>list.includes(id)?list:[...list,id]);
  const addWidget=(id:HomeWidgetId)=>setHidden(list=>list.filter(item=>item!==id));
  const resizeWidget=(id:HomeWidgetId)=>setSizes(current=>{
    const index=HOME_SIZE_CYCLE.indexOf(current[id]||HOME_WIDGET_SIZES[id]);
    return {...current,[id]:HOME_SIZE_CYCLE[(index+1)%HOME_SIZE_CYCLE.length]};
  });
  const dropWidget=(target:HomeWidgetId)=>{
    if(!dragged||dragged===target)return;
    setOrder(current=>{
      const next=current.filter(id=>id!==dragged);
      const index=next.indexOf(target);
      next.splice(index,0,dragged);
      return next;
    });
    setDragged(null);
  };
  const resetLayout=()=>{setOrder(HOME_WIDGET_ORDER);setHidden([]);setSizes(HOME_WIDGET_SIZES)};

  const briefItems=[
    {tone:'green',text:'Your portfolio increased $42.18 yesterday.'},
    {tone:'red',text:'3 wishlist items dropped in price overnight.'},
    {tone:'green',text:'Marvel Legends Spider-Man is back in stock at MSRP.'},
    {tone:'orange',text:'You have spent $182 of your $250 September hobby budget.'},
    {tone:'red',text:'2 preorders release within the next 14 days.'},
    {tone:'green',text:'Your Action Figures collection is 73% complete.'},
    {tone:'orange',text:'1 possible duplicate was detected in your inventory.'},
    {tone:'green',text:'2 packages are arriving today.'},
    {tone:'muted',text:'4 relevant emails came in this morning.'},
    {tone:'red',text:'3 tracked drops are happening today.'},
  ];
  const alerts=[
    {title:'Restock',text:'Spider-Man Final Swing · MSRP $24.99',time:'8m ago',tone:'green'},
    {title:'Price Drop',text:'Nike SB Dunk Low · down 12%',time:'26m ago',tone:'red'},
    {title:'Preorder',text:'Hot Toys Venom charges in 7 days',time:'1h ago',tone:'orange'},
    {title:'Bill',text:'Internet bill due Sep 24',time:'2h ago',tone:'muted'},
  ];
  const wishlist=[
    {name:'Spider-Man Final Swing',price:'$24.99',meta:'Back at MSRP',tone:'green'},
    {name:'Pokémon 151 ETB',price:'$89',meta:'$11 below target',tone:'green'},
    {name:'Nike SB Dunk Low',price:'$118',meta:'2% below target',tone:'green'},
  ];
  const drops=[
    {name:'Marvel Legends Wave 3',when:'Today · 12:00 PM',tag:'DROP'},
    {name:'Supreme x Marvel',when:'Tomorrow · 11:00 AM',tag:'RELEASE'},
    {name:'Pokémon Mega Evolution',when:'Sep 26',tag:'PREORDER'},
  ];
  const changes=[
    {name:'ASM2 Spider-Man',delta:'+$18.40',tone:'green'},
    {name:'Charizard ex',delta:'+$12.05',tone:'green'},
    {name:'Hot Toys Batman',delta:'-$9.20',tone:'red'},
    {name:'Jordan 1 Chicago',delta:'+$7.75',tone:'green'},
  ];
  const purchases=[
    {name:'Marvel Legends Final Swing',price:'$24.99',time:'Today'},
    {name:'Amazing Spider-Man #1',price:'$18.50',time:'Yesterday'},
    {name:'Nike SB Dunk Low',price:'$118',time:'Sep 19'},
  ];
  const sales=[
    {name:'Funko Pop! Miles Morales',price:'$38',gain:'+$14'},
    {name:'Pokémon ETB',price:'$105',gain:'+$22'},
    {name:'Marvel Legends Venom',price:'$54',gain:'+$9'},
  ];
  const calendar=[
    {day:'21',month:'SEP',title:'Marvel Legends Wave 3',meta:'Release · 12:00 PM'},
    {day:'22',month:'SEP',title:'Supreme x Marvel',meta:'Drop · 11:00 AM'},
    {day:'25',month:'SEP',title:'Hot Toys Venom',meta:'Preorder window closes'},
    {day:'26',month:'SEP',title:'Pokémon Mega Evolution',meta:'Preorders open'},
  ];

  const widgetTitle:Record<HomeWidgetId,string>={
    collectionValue:'Total Collection Value',costBasis:'Cost Basis',profitLoss:'P / L',monthlySpend:'Monthly Hobby Spend',
    brief:'Morning VEXUM Brief',wishlist:'Wishlist Opportunities',drops:'Drop Radar',changes:'Recent Collection Changes',
    finance:'Debt / Savings Snapshot',capacity:'Setup Capacity',progress:'Collection Progress',
    purchases:'Recent Purchases',sales:'Recent Sales',social:'Social Activity',calendar:'Release Calendar',alerts:'Alerts'
  };
  const widgetIcon:Record<HomeWidgetId,ReactNode>={
    collectionValue:<CircleDollarSign/>,costBasis:<ShoppingBag/>,profitLoss:<Star/>,monthlySpend:<CircleDollarSign/>,
    brief:<Star/>,wishlist:<Star/>,drops:<Eye/>,changes:<Layers3/>,finance:<CircleDollarSign/>,
    capacity:<SlidersHorizontal/>,progress:<Layers3/>,purchases:<ShoppingBag/>,sales:<Share2/>,
    social:<Share2/>,calendar:<Eye/>,alerts:<Star/>
  };

  const renderWidget=(id:HomeWidgetId)=>{
    const frame=(body:ReactNode)=><HomeWidgetShell key={id} id={id} title={widgetTitle[id]} icon={widgetIcon[id]} size={sizes[id]} customizing={customizing} onHide={hideWidget} onResize={resizeWidget} onDragStart={setDragged} onDrop={dropWidget}>{body}</HomeWidgetShell>;
    if(id==='collectionValue')return frame(<div className="vx-home-metric"><strong>$12,480</strong><span className="tone-green">↑ $42.18 yesterday</span><HomeSpark tone="green"/></div>);
    if(id==='costBasis')return frame(<div className="vx-home-metric"><strong>$8,714</strong><span className="tone-muted">$3,766 unrealized gain</span><HomeSpark/></div>);
    if(id==='profitLoss')return frame(<div className="vx-home-metric"><strong className="tone-green">+$3,766</strong><span className="tone-green">+43.2% overall</span><HomeSpark tone="green"/></div>);
    if(id==='monthlySpend')return frame(<div className="vx-home-metric"><strong>$182</strong><span className="tone-orange">$68 remaining of $250</span><div className="vx-home-progress"><i style={{width:'73%'}}/></div></div>);
    if(id==='brief')return frame(<div className="vx-morning-brief"><div className="vx-brief-intro"><span>VEXUM Intelligence</span><strong>Good morning, Jordan.</strong><p>Here’s what changed, what needs attention, and what’s happening next.</p></div><div className="vx-brief-list">{briefItems.map((item,index)=><div key={item.text}><i className={'tone-'+item.tone}>{index+1}</i><span>{item.text}</span></div>)}</div><footer><button>Open Intelligence</button><span>Updated 7:42 AM</span></footer></div>);
    if(id==='alerts')return frame(<div className="vx-home-alerts">{alerts.map(item=><div key={item.text}><i className={'alert-'+item.tone}/><div><strong>{item.title}</strong><span>{item.text}</span></div><time>{item.time}</time></div>)}</div>);
    if(id==='wishlist')return frame(<div className="vx-home-compact-list">{wishlist.map(item=><div key={item.name}><div className="vx-home-mini-art"><Star/></div><span><strong>{item.name}</strong><small className={'tone-'+item.tone}>{item.meta}</small></span><b>{item.price}</b></div>)}<button className="vx-home-inline-action">View all 11 opportunities →</button></div>);
    if(id==='drops')return frame(<div className="vx-home-drop-list">{drops.map(item=><div key={item.name}><time>{item.when}</time><strong>{item.name}</strong><em>{item.tag}</em></div>)}<button className="vx-home-inline-action">Open Drop Radar →</button></div>);
    if(id==='changes')return frame(<div className="vx-home-change-list">{changes.map(item=><div key={item.name}><div className="vx-home-mini-art"><Layers3/></div><strong>{item.name}</strong><span className={'tone-'+item.tone}>{item.delta}</span></div>)}</div>);
    if(id==='finance')return frame(<div className="vx-home-finance"><div><span>Total Debt</span><strong>$4,220</strong><small className="tone-green">↓ $160 this month</small></div><div><span>Savings</span><strong>$2,470</strong><small className="tone-green">↑ $320 this month</small></div><div className="vx-home-finance-bars"><i style={{height:'72%'}}/><i style={{height:'51%'}}/><i style={{height:'63%'}}/><i style={{height:'44%'}}/><i style={{height:'58%'}}/></div></div>);
    if(id==='capacity')return frame(<div className="vx-home-capacity"><div className="vx-capacity-ring"><strong>68%</strong><span>used</span></div><div><strong>32% display capacity remaining</strong><p>2 open shelves · 1 empty display case · 4 storage bins available</p><button className="vx-home-inline-action">Open Setup Planner →</button></div></div>);
    if(id==='progress')return frame(<div className="vx-home-progress-list">{[
      ['Action Figures','73%'],['Spider-Man Movie Legends','88%'],['JJK Union Arena Vol. 2','61%']
    ].map(row=><div key={row[0]}><span><strong>{row[0]}</strong><b>{row[1]}</b></span><div className="vx-home-progress"><i style={{width:row[1]}}/></div></div>)}</div>);
    if(id==='purchases')return frame(<div className="vx-home-table"><div className="vx-home-table-head"><span>Item</span><span>Price</span><span>Added</span></div>{purchases.map(item=><div key={item.name}><span><i className="vx-home-mini-art"><ShoppingBag/></i><strong>{item.name}</strong></span><b>{item.price}</b><time>{item.time}</time></div>)}</div>);
    if(id==='sales')return frame(<div className="vx-home-table"><div className="vx-home-table-head"><span>Item</span><span>Sold</span><span>P/L</span></div>{sales.map(item=><div key={item.name}><span><i className="vx-home-mini-art"><Share2/></i><strong>{item.name}</strong></span><b>{item.price}</b><em className="tone-green">{item.gain}</em></div>)}</div>);
    if(id==='social')return frame(<div className="vx-home-social"><div><span className="vx-avatar small">C</span><p><strong>Collector Talk</strong><br/><span>12 new posts · 4 replies to your threads</span></p></div><div><span className="vx-avatar small">V</span><p><strong>Spider-Man Collectors</strong><br/><span>New display setup trending today</span></p></div><div><span className="vx-avatar small">M</span><p><strong>Marketplace</strong><br/><span>3 offers on items you follow</span></p></div></div>);
    if(id==='calendar')return frame(<div className="vx-home-calendar">{calendar.map(item=><div key={item.title}><time><b>{item.day}</b><span>{item.month}</span></time><div><strong>{item.title}</strong><span>{item.meta}</span></div><button>›</button></div>)}</div>);
    return frame(<div/>);
  };

  return <PageFrame hero="home">
    <section className="vx-home-hero">
      <div><h1>Good Evening, Jordan.</h1><p>Your command center for everything you care about.</p></div>
      <HeroMeta/>
    </section>
    <div className="vx-home-commandbar">
      <Tabs items={['Overview','Collection','Financial','Activity']}/>
      <div className="vx-home-custom-actions">
        {customizing&&<><button onClick={resetLayout}>Reset Layout</button>{hidden.length>0&&<div className="vx-home-add-menu"><span>Add widgets:</span>{hidden.map(id=><button key={id} onClick={()=>addWidget(id)}><Plus/>{widgetTitle[id]}</button>)}</div>}</>}
        <button className={customizing?'active':''} onClick={()=>setCustomizing(value=>!value)}><SlidersHorizontal/>{customizing?'Done':'Customize Dashboard'}</button>
      </div>
    </div>
    {customizing&&<div className="vx-home-custom-tip"><span>Drag widgets to reorder · use ↔ to resize · × hides a widget · hidden widgets can be added back above.</span></div>}
    <div className="vx-command-grid">{order.filter(id=>!hidden.includes(id)).map(renderWidget)}</div>
  </PageFrame>;
}

function WishlistPage(){return <PageFrame hero="wishlist"><VexumWishlist/></PageFrame>;}
function SearchPage({initialQuery='',initialProductId=''}:{initialQuery?:string;initialProductId?:string}){
  return <PageFrame hero="search"><VexumSearch initialQuery={initialQuery} initialProductId={initialProductId}/></PageFrame>;
}
function SetupPage(){return <PageFrame hero="setup"><VexumSetup/></PageFrame>;}
function fmtMoney(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
}
function SellPage(){
  const workspace=useWorkspace();
  const owned=workspace.data.items.filter(item=>item.status==='owned');
  const wishlist=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived);
  return <PageFrame hero="plain">
    <section className="vx-page-title"><div><h1>Sell</h1><p>Turn owned items into supply without creating duplicate product identities.</p></div><HeroMeta text="“One catalog. Ownership, wants, and supply stay linked.”"/></section>
    <div className="vx-fin-stats">
      <Stat label="Owned Products" value={String(owned.length)} change="Portfolio source of truth" tone="muted"/>
      <Stat label="Wishlist Demand Context" value={String(wishlist.length)} change="Private user data only" tone="muted"/>
      <Stat label="Community Listings" value="Unavailable" change="Marketplace provider not connected" tone="muted"/>
      <Stat label="Trade Matches" value="Unavailable" change="Social marketplace not connected" tone="muted"/>
      <Stat label="Sell Revenue" value="Unavailable" change="No listing ledger connected" tone="muted"/>
    </div>
    <div className="vx-fin-bottom">
      <section className="vx-panel vx-truth-panel"><PanelHead title="Sell Integration Boundary"/><div className="vx-fin-empty"><ShoppingBag/><strong>Canonical supply path is ready</strong><p>Owned Portfolio items already carry the product identity Sell should reuse. Listing creation, seller reputation, community demand matching, offers, shipping, and payment settlement are not connected yet, so VEXUM does not invent them.</p></div></section>
      <section className="vx-panel"><PanelHead title="Recently Owned"/>{owned.slice(0,6).map(item=><div className="vx-preorder-fin" key={item.id}><div className="vx-mini-product"><Layers3/></div><div><strong>{item.name}</strong><span>{item.category} · {item.condition}</span></div><b>{fmtMoney(item.currentValue)}</b><em>{item.quantity} owned</em></div>)}{!owned.length?<div className="vx-fin-empty"><span>No owned items available.</span></div>:null}</section>
    </div>
  </PageFrame>;
}

function FinancialPage(){return <PageFrame hero="financial"><VexumFinancial/></PageFrame>;}
function PortfolioPage(){return <PageFrame hero="plain"><VexumPortfolio/></PageFrame>;}
function SocialPage(){
  return <PageFrame hero="plain"><section className="vx-page-title"><div><h1>Social</h1><p>Collectors, communities, drops, and setups.</p></div><HeroMeta text="“Collect together. Build bigger.”"/></section><Tabs items={['For You','Following','Communities','Drops','Marketplace']}/><div className="vx-social-grid"><section className="vx-panel vx-feed"><article><header><div className="vx-avatar small">J</div><div><strong>jordan</strong><span>@jordan · 2h</span></div></header><p>The setup is finally starting to feel right. Red lighting was absolutely the move.</p><div className="vx-social-photo"><Star/></div><footer>♡ 248 &nbsp;&nbsp; ◇ 31 &nbsp;&nbsp; ↗ Share</footer></article><article><header><div className="vx-avatar small">C</div><div><strong>collectorfall</strong><span>@collectorfall · 4h</span></div></header><p>Who else is hunting the Final Swing figure this week?</p></article></section><aside className="vx-panel"><PanelHead title="Trending"/>{['#MarvelLegends','#SpiderMan','#CollectionSetup','#Restock','#VEXUM'].map((name,index)=><div className="vx-trend-row" key={name}><b>{name}</b><span>{[32,28,21,18,15][index]}k posts</span></div>)}</aside></div></PageFrame>;
}

export default function VexumApp({
  initialView='home',
  initialSearchQuery='',
  initialProductId=''
}:{
  initialView?:View;
  initialSearchQuery?:string;
  initialProductId?:string;
}){
  const [view,setView]=useState<View>(initialView);

  const navigate=(next:View)=>{
    setView(next);
    if(typeof window==='undefined')return;
    const routes:Partial<Record<View,string>>={portfolio:'/portfolio',search:'/search',wishlist:'/wishlist',sell:'/sell',setup:'/setup',financial:'/financial',social:'/social'};
    const path=routes[next]||'/';
    if(next==='search'&&window.location.pathname.startsWith('/search'))return;
    if(window.location.pathname!==path)window.history.pushState({},'',path);
  };

  useEffect(()=>{
    const onPop=()=>{
      const path=window.location.pathname;
      if(path.startsWith('/search'))setView('search');
      else if(path==='/wishlist')setView('wishlist');
      else if(path==='/portfolio')setView('portfolio');
      else if(path==='/sell')setView('sell');
      else if(path==='/setup')setView('setup');
      else if(path==='/financial')setView('financial');
      else if(path==='/social')setView('social');
      else setView('home');
    };
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[]);

  let content:ReactNode=<HomePage/>;
  if(view==='portfolio')content=<PortfolioPage/>;
  else if(view==='search')content=<SearchPage initialQuery={initialSearchQuery} initialProductId={initialProductId}/>;
  else if(view==='wishlist')content=<WishlistPage/>;
  else if(view==='sell')content=<SellPage/>;
  else if(view==='setup')content=<SetupPage/>;
  else if(view==='financial')content=<FinancialPage/>;
  else if(view==='social')content=<SocialPage/>;
  return <div className="vx-app"><Sidebar view={view} setView={navigate}/>{content}</div>;
}

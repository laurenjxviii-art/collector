'use client';

import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {
  CircleDollarSign,Eye,FileUp,Layers3,Plus,Search,Share2,ShoppingBag,
  SlidersHorizontal,Star
} from 'lucide-react';
import VexumPortfolio from './VexumPortfolio';
import VexumHome from './VexumHome';
import VexumSearch from './search/VexumSearch';
import VexumWishlist from './VexumWishlist';
import VexumFinancial from './VexumFinancial';
import VexumSetup from './VexumSetup';
import VexumSell from './VexumSell';
import VexumSocial from './VexumSocial';

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

function HomePage(){return <PageFrame hero="home"><VexumHome/></PageFrame>;}

function WishlistPage(){return <PageFrame hero="wishlist"><VexumWishlist/></PageFrame>;}
function SearchPage({initialQuery='',initialProductId=''}:{initialQuery?:string;initialProductId?:string}){
  return <PageFrame hero="search"><VexumSearch initialQuery={initialQuery} initialProductId={initialProductId}/></PageFrame>;
}
function SetupPage(){return <PageFrame hero="setup"><VexumSetup/></PageFrame>;}
function SellPage(){return <PageFrame hero="sell"><VexumSell/></PageFrame>;}

function FinancialPage(){return <PageFrame hero="financial"><VexumFinancial/></PageFrame>;}
function PortfolioPage(){return <PageFrame hero="plain"><VexumPortfolio/></PageFrame>;}
function SocialPage(){return <PageFrame hero="social"><VexumSocial/></PageFrame>;}

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

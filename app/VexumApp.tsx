'use client';

import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {
  CircleDollarSign,Eye,FileUp,Layers3,Plus,Search,Share2,ShoppingBag,
  SlidersHorizontal,Star
} from 'lucide-react';
import VexumPortfolio from './VexumPortfolio';
import VexumSearch from './search/VexumSearch';

type View='home'|'portfolio'|'search'|'wishlist'|'setup'|'financial'|'social';
type Tone='red'|'green'|'orange'|'muted';

const RED='#ff2338';

const NAV:Array<{id:View;label:string;icon:ReactNode}>=[
  {id:'home',label:'Home',icon:<Layers3/>},
  {id:'portfolio',label:'Portfolio',icon:<Layers3/>},
  {id:'search',label:'Search',icon:<Search/>},
  {id:'wishlist',label:'Wishlist',icon:<Star/>},
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

function WishlistPage(){
  const rows=[
    {name:'Spider-Man Final Swing',sub:'Marvel Legends',cat:'Action Figures',priority:'Grail',target:'$120',market:'$185',msrp:'$120',stock:'In Stock',retailer:'BBTS',change:'+54%'},
    {name:'Nike SB Dunk Low Spider-Man',sub:'Sneakers',cat:'Sneakers',priority:'High',target:'$120',market:'$148',msrp:'$120',stock:'In Stock',retailer:'StockX',change:'+23%'},
    {name:'Pokémon 151 ETB',sub:'Scarlet & Violet',cat:'Trading Cards',priority:'Medium',target:'$90',market:'$134',msrp:'$60',stock:'In Stock',retailer:'TCGPlayer',change:'+49%'},
    {name:'Hot Toys Spider-Man Advanced Suit 2.0',sub:'Collectibles',cat:'Action Figures',priority:'High',target:'$250',market:'$310',msrp:'$250',stock:'Preorder',retailer:'Sideshow',change:'+24%'},
    {name:'Venom (Comic Ver.)',sub:'MAFEX',cat:'Action Figures',priority:'Low',target:'$80',market:'$92',msrp:'$75',stock:'Limited Stock',retailer:'AmiAmi',change:'+15%'},
    {name:'PlayStation 5 Pro',sub:'Console',cat:'Gaming',priority:'Medium',target:'$650',market:'$699',msrp:'$699',stock:'In Stock',retailer:'Best Buy',change:'+8%'},
  ];
  return <PageFrame hero="wishlist">
    <section className="vx-page-title"><div><h1>My Wishlist</h1><p>Track. Target. Collect.</p></div><HeroMeta/></section>
    <Tabs items={['Overview','All Items','On Sale','Grails','Preorders','Price Drops']}/>
    <div className="vx-wish-stats">
      <Stat label="Total Wishlist Items" value="27" change="↑ +4 this month" tone="green"/>
      <Stat label="Items On Sale" value="8" change="↓ 3 new deals" tone="green"/>
      <Stat label="Grails" value="5" change="◷ 18% of wishlist" tone="muted"/>
      <Stat label="Price Drop Opportunities" value="11" change="↓ Potential buys" tone="green"/>
      <Stat label="Potential Savings" value="$1,342" change="◷ Based on target prices" tone="muted"/>
    </div>
    <div className="vx-wishlist-layout">
      <section className="vx-panel vx-wishlist-table">
        <div className="vx-table-headline"><h3>Wishlist Items (27)</h3><div><button>Sort: Priority</button><button><SlidersHorizontal/>Filter</button><button><Layers3/></button></div></div>
        <div className="vx-table-cols"><span/><span>Item</span><span>Priority</span><span>Target Price</span><span>Current Market</span><span>MSRP</span><span>Availability</span><span>Alerts</span><span>Actions</span></div>
        {rows.map((row,index)=><div className="vx-wish-row" key={row.name}>
          <button className="vx-check"/>
          <div className="vx-wish-item"><div className={'vx-wish-pic p'+index}><Layers3/></div><span><strong>{row.name}</strong><small>{row.sub}</small><em>{row.cat}</em></span></div>
          <span className={'vx-priority '+row.priority.toLowerCase()}><Star/>{row.priority}</span>
          <b>{row.target}</b><span><b>{row.market}</b><em className="tone-red">↑ {row.change}</em></span><b>{row.msrp}</b>
          <span className={'vx-stock '+row.stock.toLowerCase().replace(' ','-')}><i/>{row.stock}<small>{row.retailer}</small></span>
          <span className="vx-row-actions"><button><Star/></button><button><Eye/></button><button><Layers3/></button><button><ShoppingBag/></button></span>
          <button className="vx-more">•••</button>
        </div>)}
      </section>
      <aside className="vx-wishlist-side">
        <section className="vx-panel"><PanelHead title="Hobby Budget" action="Manage"/><div className="vx-budget-number"><strong>$286 <small>/ $500</small></strong><span>57%</span></div><div className="vx-progress"><i style={{width:'57%'}}/></div><div className="vx-budget-cards"><div><b>$214</b><span>Remaining</span></div><div><b>$1,034</b><span>Planned Purchases</span></div><div><b className="tone-red">-$748</b><span>Over Budget</span></div></div></section>
        <section className="vx-panel"><PanelHead title="Preorder Commitments" action="View All"/><div className="vx-side-total"><span>4 Active Preorders</span><b>$620</b></div>{['Hot Toys Venom','SHF Gojo (Reissue)','LEGO Rivendell'].map((name,index)=><div className="vx-preorder" key={name}><div className="vx-mini-product"><Layers3/></div><strong>{name}</strong><span>{['Q2 2025','Q1 2025','Mar 2055'][index]}</span><b>{['$280','$90','$250'][index]}</b></div>)}</section>
        <section className="vx-panel"><PanelHead title="Grail Savings Progress" action="View All"/><div className="vx-grail"><div className="vx-mini-product red"><Layers3/></div><div><strong>Spider-Man Final Swing</strong><span>$86 / $120</span><small>Target: $120</small><div className="vx-progress"><i style={{width:'72%'}}/></div></div><b>72%</b></div></section>
      </aside>
    </div>
    <section className="vx-opportunities"><PanelHead title="Recommended Opportunities" action="View All Opportunities →"/><div className="vx-op-grid">{[
      {title:'Items Under Target (3)',sub:'Great time to buy',item:'Nike SB Dunk Low',price:'$118',pct:'-2%'},
      {title:'In Stock Locally (2)',sub:'At nearby retailers',item:'Funko Pop! Miles Morales',price:'$14.99',pct:'-0%'},
      {title:'Best Deals Right Now (5)',sub:'Highest savings vs target',item:'Pokémon 151 ETB',price:'$89',pct:'-1%'},
    ].map(card=><div className="vx-op-card" key={card.title}><div><strong>{card.title}</strong><span>{card.sub}</span></div><div className="vx-mini-product"><Layers3/></div><b>{card.item}</b><strong>{card.price}</strong><em>{card.pct}</em><span>›</span></div>)}</div></section>
  </PageFrame>;
}

function SearchPage({initialQuery='',initialProductId=''}:{initialQuery?:string;initialProductId?:string}){
  return <PageFrame hero="search"><VexumSearch initialQuery={initialQuery} initialProductId={initialProductId}/></PageFrame>;
}
function SetupPage(){
  const library=[
    {a:'Display Case',b:'Single'},{a:'Display Case',b:'Large'},{a:'Shelf Unit',b:'Medium'},
    {a:'Wall Shelf',b:'Floating'},{a:'Desk',b:'Gaming'},{a:'Storage Bin',b:'Standard'},
    {a:'Comic Box',b:'Short'},{a:'Rug',b:'VEXUM'},{a:'Plant',b:'Decor'},
  ];
  return <PageFrame hero="setup">
    <section className="vx-page-title"><div><h1>Setup Planner</h1><p>Design. Organize. Display a bigger tomorrow.</p></div><HeroMeta/></section>
    <div className="vx-setup-tabs"><Tabs items={['Planner','My Rooms','Templates']}/><select defaultValue="room"><option value="room">Gaming / Collection Room</option></select><button><Plus/>Save</button><button><Share2/>Export</button><button className="red"><Layers3/>3D View</button></div>
    <div className="vx-setup-main">
      <section className="vx-panel vx-planner">
        <div className="vx-planner-tools"><button className="active"><Plus/>Select</button><button><SlidersHorizontal/>Pan</button><button><Search/>Zoom</button><button><SlidersHorizontal/>Measure</button><button><Layers3/>Grid</button></div>
        <div className="vx-room-canvas"><div className="vx-room-reference"/></div>
        <div className="vx-library-tabs"><Tabs items={['Library','Display','Furniture','Storage','Decor','Electronics','All']}/><button className="vx-element-search"><Search/>Search elements...</button></div>
        <div className="vx-library">{library.map((item,index)=><button className={index===1?'active':''} key={item.a+item.b}><div className={'vx-library-art a'+index}><Layers3/></div><strong>{item.a}</strong><span>{item.b}</span></button>)}</div>
      </section>
      <aside className="vx-panel vx-properties">
        <div className="vx-prop-product"><div className="vx-case-thumb"><Layers3/></div><div><h3>Display Case (Large)</h3><span>Display Case</span></div><button>×</button></div>
        <Tabs items={['Properties','Items (12)','Notes']}/>
        <label><span>Name</span><input value="Display Case (Large)" readOnly/></label>
        <label><span>Dimensions (inches)</span><div className="vx-three-fields"><i>W <b>48</b></i><i>H <b>72</b></i><i>D <b>18</b></i></div></label>
        <label><span>Capacity</span><div className="vx-capacity"><i>▣ 24 figures</i><div className="vx-progress"><b style={{width:'50%'}}/></div><strong>12 / 24 (50%)</strong></div></label>
        <label><span>Shelves</span><div className="vx-counter"><button>−</button><b>4</b><button>+</button></div></label>
        <label><span>Placement</span><div className="vx-place-fields"><i>X <b>192</b></i><i>Y <b>48</b></i><i>Rotation <b>0°</b></i></div></label>
        <section className="vx-fit"><div><h3>Fit Analysis</h3><strong>✓ Fits in room</strong></div><p>✓ Clearance (front)<b>36"</b></p><p>✓ Clearance (sides)<b>6"</b></p><p>✓ Clearance (top)<b>12"</b></p></section>
      </aside>
    </div>
  </PageFrame>;
}

function FinancialPage(){
  const debts=[
    {name:'Chase Credit Card',value:'$1,240',detail:'$40 min · 24.9% APR',due:'Due Feb 5'},
    {name:'Auto Loan',value:'$2,180',detail:'$320 min · 5.9% APR',due:'Due Feb 12'},
    {name:'Student Loan',value:'$800',detail:'$80 min · 4.5% APR',due:'Due Feb 18'},
  ];
  const budgets=[
    {name:'Collectibles',amount:'$286 / $500',pct:'57%',width:57},
    {name:'Bills & Utilities',amount:'$220 / $220',pct:'100%',width:100},
    {name:'Food & Dining',amount:'$182 / $300',pct:'61%',width:61},
    {name:'Subscriptions',amount:'$34 / $100',pct:'34%',width:34},
    {name:'Savings',amount:'$0 / $200',pct:'0%',width:0},
  ];
  return <PageFrame hero="financial">
    <section className="vx-fin-hero"><div><h1>Good Evening, Jordan.</h1><p>Smart collecting builds a richer tomorrow.</p></div><HeroMeta/></section>
    <Tabs items={['Overview','Spending','Budget','Debt','Goals','Insights']}/>
    <div className="vx-fin-stats">
      <Stat label="Net Worth" value="$17,392" change="♢ +12.4%  vs last month" tone="green"/>
      <Stat label="Collection Estimated Value" value="$12,480" change="♠ +18.4%  vs last month" tone="green"/>
      <Stat label="Monthly Hobby Spend" value="$286" change="♦ -23.1%  vs last month"/>
      <Stat label="Total Debt" value="$4,220" change="♥ -5.2%  vs last month"/>
      <div className="vx-stat vx-budget-ring-card"><div><span>Budget Remaining</span><strong>$314</strong><em>42%<small>of $750 monthly</small></em></div><div className="vx-ring"><b>42%</b></div></div>
    </div>
    <div className="vx-fin-mid">
      <section className="vx-panel vx-net-chart"><div className="vx-chart-head"><div><h3>Net Worth vs Collection Value</h3><p><i className="red"/>Net Worth (Total) <i className="white"/>Collection Value</p></div><Range/></div><DoubleChart/></section>
      <section className="vx-panel vx-breakdown"><PanelHead title="Value Breakdown" action="View Details ›"/><div className="vx-donut"><div><strong>$20,892</strong><span>Total Assets</span></div></div><div className="vx-break-list">{[
        {name:'Collection Estimated Value',value:'$12,480',pct:'59.8%',tone:'red'},
        {name:'Cash & Bank Accounts',value:'$5,420',pct:'25.9%',tone:'gray'},
        {name:'Investments',value:'$2,210',pct:'10.6%',tone:'light'},
        {name:'Other Assets',value:'$782',pct:'3.7%',tone:'dark'},
      ].map(row=><p key={row.name}><i className={row.tone}/><span>{row.name}</span><b>{row.value}</b><em>{row.pct}</em></p>)}</div></section>
      <section className="vx-panel vx-spend-debt"><h3>Hobby Spend vs Debt Paydown</h3><p><i className="red"/>Hobby Spend <i className="white"/>Debt Paydown</p><div className="vx-bar-chart">{[
        {m:'Aug',a:52,b:30},{m:'Sep',a:58,b:36},{m:'Oct',a:65,b:42},{m:'Nov',a:63,b:39},{m:'Dec',a:55,b:47},{m:'Jan',a:42,b:59},
      ].map(row=><div key={row.m}><span><i style={{height:String(row.a)+'%'}}/><em style={{height:String(row.b)+'%'}}/></span><small>{row.m}</small></div>)}</div></section>
    </div>
    <div className="vx-fin-bottom">
      <section className="vx-panel"><PanelHead title="Debt Overview" action="View All ›"/>{debts.map(row=><div className="vx-debt-row" key={row.name}><span><CircleDollarSign/></span><div><strong>{row.name}</strong><small>{row.detail}</small></div><b>{row.value}</b><em>{row.due}</em></div>)}</section>
      <section className="vx-panel"><PanelHead title="Monthly Budget" action="Edit ›"/>{budgets.map(row=><div className="vx-budget-row" key={row.name}><span><ShoppingBag/></span><strong>{row.name}</strong><b>{row.amount}</b><em>{row.pct}</em><div><i style={{width:String(row.width)+'%'}}/></div></div>)}</section>
      <section className="vx-panel"><PanelHead title="Savings Goals" action="Add Goal +"/>{[
        {name:'Emergency Fund',amount:'$1,200 / $5,000',pct:'24%'},{name:'Grail Fund',amount:'$850 / $3,000',pct:'28%'},{name:'New Setup Fund',amount:'$420 / $2,000',pct:'21%'},
      ].map(row=><div className="vx-goal" key={row.name}><div className="vx-goal-icon"><Star/></div><div><strong>{row.name}</strong><span>{row.amount}</span><div className="vx-progress"><i style={{width:row.pct}}/></div></div><b>{row.pct}</b></div>)}</section>
      <section className="vx-panel"><PanelHead title="Preorder Commitments" action="View All ›"/>{[
        {name:'Hot Toys Venom',value:'$320',time:'In 7 days'},{name:'SHF Naruto (Reissue)',value:'$85',time:'In 14 days'},{name:'Prime 1 Batman',value:'$750',time:'In 33 days'},
      ].map(row=><div className="vx-preorder-fin" key={row.name}><div className="vx-mini-product"><Layers3/></div><div><strong>{row.name}</strong><span>Charges Feb 3, 2025</span></div><b>{row.value}</b><em>{row.time}</em></div>)}</section>
      <section className="vx-panel vx-intel"><PanelHead title="Collector Intelligence"/>{[
        'You spent $243 on collectibles this month.','2 preorders will charge within 14 days ($405 total).','Your hobby spend is 23% lower than last month. Keep it up!','You’re on track to reach your Grail Fund goal by Nov 2025.',
      ].map(text=><div key={text}><span><Star/></span><p>{text}</p></div>)}</section>
    </div>
    <div className="vx-bottom-banners"><div className="vx-story-banner"><div className="vx-story-art"/><strong>DISCIPLINE FUELS<br/>BIGGER COLLECTIONS.</strong><span>VEXUM</span></div><div className="vx-quote-banner">“A more organized you.<br/>A bigger tomorrow.”</div></div>
  </PageFrame>;
}

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
    if(next==='search'){
      if(!window.location.pathname.startsWith('/search'))window.history.pushState({},'','/search');
    }else if(window.location.pathname.startsWith('/search')){
      window.history.pushState({},'','/');
    }
  };

  useEffect(()=>{
    const onPop=()=>setView(window.location.pathname.startsWith('/search')?'search':'home');
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  },[]);

  let content:ReactNode=<HomePage/>;
  if(view==='portfolio')content=<PortfolioPage/>;
  else if(view==='search')content=<SearchPage initialQuery={initialSearchQuery} initialProductId={initialProductId}/>;
  else if(view==='wishlist')content=<WishlistPage/>;
  else if(view==='setup')content=<SetupPage/>;
  else if(view==='financial')content=<FinancialPage/>;
  else if(view==='social')content=<SocialPage/>;
  return <div className="vx-app"><Sidebar view={view} setView={navigate}/>{content}</div>;
}

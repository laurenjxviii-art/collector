'use client';

import {useMemo,useState} from 'react';
import {
  Bell,Box,BriefcaseBusiness,CalendarDays,Camera,Car,Check,ChevronDown,ChevronRight,
  CircleDollarSign,CreditCard,Crown,DollarSign,FileText,GraduationCap,Grid3X3,Hand,
  Heart,Home,Image as ImageIcon,LayoutGrid,List,MapPin,Menu,MessageCircle,MoreHorizontal,
  MousePointer2,Package,Plus,ReceiptText,RefreshCw,Ruler,Save,ScanLine,Search,Settings,
  Share2,Shield,ShoppingBag,SlidersHorizontal,Sparkles,Star,Store,Target,Trash2,
  TrendingDown,TrendingUp,Upload,Utensils,WalletCards,ZoomIn
} from 'lucide-react';

type View='home'|'portfolio'|'search'|'wishlist'|'setup'|'financial'|'social';

const RED='#ff2338';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

const navItems:[View,string,React.ReactNode][]=[
  ['home','Home',<Home key="h"/>],
  ['portfolio','Portfolio',<BriefcaseBusiness key="p"/>],
  ['search','Search',<Search key="s"/>],
  ['wishlist','Wishlist',<Shield key="w"/>],
  ['setup','Setup',<Settings key="st"/>],
  ['financial','Financial',<WalletCards key="f"/>],
  ['social','Social',<MessageCircle key="so"/>],
];

function AppLogo(){
  return <div className="vx-logo"><span className="vx-vmark">V</span><strong>VEXUM</strong></div>;
}

function Sidebar({view,setView}:{view:View;setView:(v:View)=>void}){
  return <aside className="vx-sidebar">
    <AppLogo/>
    <nav className="vx-nav">
      {navItems.map(([id,label,icon])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}>{icon}<span>{label}</span></button>)}
    </nav>
    <div className="vx-quick">
      <span>Quick Add</span>
      <button><ScanLine/>Scan Item</button>
      <button><Plus/>Add Manually</button>
      <button><ReceiptText/>Import Receipt</button>
      <button onClick={()=>setView('wishlist')}><Sparkles/>Add to Wishlist</button>
    </div>
    <div className="vx-user">
      <div className="vx-avatar">J</div>
      <div><strong>Jordan</strong><span>Collector · Level 12</span></div>
      <i/>
    </div>
  </aside>;
}

function Topbar({hero='home'}:{hero?:'home'|'search'|'wishlist'|'financial'|'setup'|'plain'}){
  return <div className={'vx-topbar hero-'+hero}>
    <button className="vx-searchbox"><Search/><span>Search for anything...</span><kbd>⌘ K</kbd></button>
    <div className="vx-topicons">
      <button><Bell/></button><button><MessageCircle/></button><button><Shield/></button><button><Settings/></button><button className="vx-top-avatar">J</button>
    </div>
  </div>;
}

function HeroMeta({quote='“Discipline today. A bigger collection tomorrow.”'}:{quote?:string}){
  return <div className="vx-hero-meta"><span>Mon, Jan 27</span><q>{quote}</q></div>;
}

function StatCard({label,value,change,tone='red',icon}:{label:string;value:string;change:string;tone?:'red'|'green'|'orange'|'muted';icon?:React.ReactNode}){
  return <div className="vx-stat">
    <div className="vx-stat-label">{icon}{label}</div>
    <strong>{value}</strong>
    <span className={'tone-'+tone}>{change}</span>
  </div>;
}

function MiniLine({tone='red'}:{tone?:'red'|'green'|'white'}){
  const stroke=tone==='green'?'#1fe19d':tone==='white'?'#c8c8cc':RED;
  return <svg className="vx-miniline" viewBox="0 0 120 42" preserveAspectRatio="none"><polyline points="0,32 10,28 18,31 27,22 35,25 46,18 55,21 63,13 75,17 84,10 93,15 104,8 120,2" fill="none" stroke={stroke} strokeWidth="2"/></svg>;
}

function HomePage(){
  const recent=[
    ['Added','Collector Edition Figure','VEXUM Collectibles','2h ago'],
    ['Price Drop','Premium Trading Cards','Market Watch','4h ago'],
    ['Restock Alert','Limited Edition Statue','VEXUM Store','6h ago'],
    ['Added to Wishlist','Art Book Set','Collector Press','8h ago'],
    ['Community','New reply in Collector Talk','“Display shelf suggestions?”','12h ago'],
  ];
  const cats=[['Action Figures',28],['Trading Cards',18],['Sneakers',14],['Comics',12],['Anime',10],['Tech',8],['Other',10]];
  return <PageFrame hero="home">
    <section className="vx-home-hero">
      <div><h1>Good Evening, Jordan.</h1><p>Progress looks good today.</p></div>
      <HeroMeta/>
    </section>
    <TabRow tabs={['Overview','Collection','Financial','Activity']}/>
    <div className="vx-home-stats">
      <StatCard label="Total Collection Value" value="$12,480" change="◇  +12.4%"/>
      <StatCard label="Items Owned" value="487" change="◇  +18 this month"/>
      <StatCard label="Amount Spent (Jan)" value="$286" change="◆  -18%"/>
      <StatCard label="Wishlist Tracked" value="63" change="◉  12 on sale" tone="orange"/>
      <StatCard label="Portfolio Growth" value="+18.4%" change="◷  Past 6 Months" tone="muted"/>
    </div>
    <div className="vx-home-grid">
      <section className="vx-panel vx-recent">
        <PanelHead title="Recent Activity" action="View All"/>
        {recent.map((x,i)=><div className="vx-activity-row" key={x[1]}>
          <div className={'vx-thumb t'+i}><Package/></div>
          <div><em>{x[0]}</em><strong>{x[1]}</strong><span>{x[2]}</span></div><time>{x[3]}</time>
        </div>)}
      </section>
      <section className="vx-panel vx-value-chart">
        <div className="vx-chart-head"><h3>Collection Value</h3><RangeButtons/></div>
        <BigLineChart/>
        <footer><div><strong>$12,480</strong><span>Current Value</span></div><div><strong>$8,714</strong><span>Cost Basis</span></div><div><strong className="tone-red">+$3,766</strong><span>Unrealized Gain</span></div></footer>
      </section>
      <section className="vx-panel vx-categories">
        <PanelHead title="Top Categories"/>
        {cats.map(([name,pct],i)=><div className="vx-category" key={name as string}><div className="vx-cat-icon"><Box/></div><span>{name}</span><div className="vx-cat-track"><i style={{width:String(pct)+'%'}}/></div><b>{pct}%</b></div>)}
      </section>
    </div>
    <div className="vx-bottom-banners"><div className="vx-story-banner"><div className="vx-story-art"/><strong>TRACK MORE<br/>THAN ITEMS.<br/>TRACK YOUR STORY.</strong><span>VEXUM</span></div><div className="vx-quote-banner">“A more organized you.<br/>A bigger tomorrow.”</div></div>
  </PageFrame>;
}

function WishlistPage(){
  const rows=[
    ['Spider-Man Final Swing','Marvel Legends','Action Figures','Grail','$120','$185','$120','In Stock'],
    ['Nike SB Dunk Low Spider-Man','Sneakers','Sneakers','High','$120','$148','$120','In Stock'],
    ['Pokémon 151 ETB','Scarlet & Violet','Trading Cards','Medium','$90','$134','$60','In Stock'],
    ['Hot Toys Spider-Man Advanced Suit 2.0','Collectibles','Action Figures','High','$250','$310','$250','Preorder'],
    ['Venom (Comic Ver.)','MAFEX','Action Figures','Low','$80','$92','$75','Limited Stock'],
    ['PlayStation 5 Pro','Console','Gaming','Medium','$650','$699','$699','In Stock'],
  ];
  return <PageFrame hero="wishlist">
    <section className="vx-page-title"><div><h1>My Wishlist</h1><p>Track. Target. Collect.</p></div><HeroMeta/></section>
    <TabRow tabs={['Overview','All Items','On Sale','Grails','Preorders','Price Drops']}/>
    <div className="vx-wish-stats">
      <StatCard label="Total Wishlist Items" value="27" change="↑  +4 this month" tone="green" icon={<Shield/>}/>
      <StatCard label="Items On Sale" value="8" change="↓  3 new deals" tone="green" icon={<TagIcon/>}/>
      <StatCard label="Grails" value="5" change="◷ 18% of wishlist" tone="muted" icon={<Crown/>}/>
      <StatCard label="Price Drop Opportunities" value="11" change="↓ Potential buys" tone="green" icon={<TrendingDown/>}/>
      <StatCard label="Potential Savings" value="$1,342" change="◷ Based on target prices" tone="muted" icon={<CircleDollarSign/>}/>
    </div>
    <div className="vx-wishlist-layout">
      <section className="vx-panel vx-wishlist-table">
        <div className="vx-table-headline"><h3>Wishlist Items (27)</h3><div><button>Sort: Priority <ChevronDown/></button><button><SlidersHorizontal/>Filter</button><button><List/></button><button><Grid3X3/></button></div></div>
        <div className="vx-table-cols"><span/><span>Item</span><span>Priority</span><span>Target Price</span><span>Current Market</span><span>MSRP</span><span>Availability</span><span>Alerts</span><span>Actions</span></div>
        {rows.map((r,i)=><div className="vx-wish-row" key={r[0]}>
          <button className="vx-check"/>
          <div className="vx-wish-item"><div className={'vx-wish-pic p'+i}><Package/></div><span><strong>{r[0]}</strong><small>{r[1]}</small><em>{r[2]}</em></span></div>
          <span className={'vx-priority '+r[3].toLowerCase().replace(' ','-')}>{r[3]==='Grail'?<Crown/>:<Star/>}{r[3]}</span>
          <b>{r[4]}</b><span><b>{r[5]}</b><em className="tone-red">↑ +{[54,23,49,24,15,8][i]}%</em></span><b>{r[6]}</b>
          <span className={'vx-stock '+r[7].toLowerCase().replace(' ','-')}><i/>{r[7]}<small>{['BBTS','StockX','TCGPlayer','Sideshow','AmiAmi','Best Buy'][i]}</small></span>
          <span className="vx-row-actions"><button><Bell/></button><button><MapPin/></button><button><RefreshCw/></button><button><Store/></button></span>
          <button className="vx-more"><MoreHorizontal/></button>
        </div>)}
      </section>
      <aside className="vx-wishlist-side">
        <section className="vx-panel"><PanelHead title="Hobby Budget" action="Manage"/><div className="vx-budget-number"><strong>$286 <small>/ $500</small></strong><span>57%</span></div><div className="vx-progress"><i style={{width:'57%'}}/></div><div className="vx-budget-cards"><div><b>$214</b><span>Remaining</span></div><div><b>$1,034</b><span>Planned Purchases</span></div><div><b className="tone-red">-$748</b><span>Over Budget</span></div></div></section>
        <section className="vx-panel"><PanelHead title="Preorder Commitments" action="View All"/><div className="vx-side-total"><span>4 Active Preorders</span><b>$620</b></div>{[['Hot Toys Venom','Q2 2025','$280'],['SHF Gojo (Reissue)','Q1 2025','$90'],['LEGO Rivendell','Mar 2055','$250']].map(x=><div className="vx-preorder" key={x[0]}><div className="vx-mini-product"><Package/></div><strong>{x[0]}</strong><span>{x[1]}</span><b>{x[2]}</b></div>)}</section>
        <section className="vx-panel"><PanelHead title="Grail Savings Progress" action="View All"/><div className="vx-grail"><div className="vx-mini-product red"><Package/></div><div><strong>Spider-Man Final Swing</strong><span>$86 / $120</span><small>Target: $120</small><div className="vx-progress"><i style={{width:'72%'}}/></div></div><b>72%</b></div></section>
      </aside>
    </div>
    <section className="vx-opportunities"><PanelHead title="Recommended Opportunities" action="View All Opportunities →"/><div className="vx-op-grid"><Opportunity title="Items Under Target (3)" subtitle="Great time to buy" item="Nike SB Dunk Low" price="$118" pct="-2%"/><Opportunity title="In Stock Locally (2)" subtitle="At nearby retailers" item="Funko Pop! Miles Morales" price="$14.99" pct="-0%"/><Opportunity title="Best Deals Right Now (5)" subtitle="Highest savings vs target" item="Pokémon 151 ETB" price="$89" pct="-1%"/></div></section>
  </PageFrame>;
}

function SearchPage(){
  return <PageFrame hero="search">
    <section className="vx-search-title"><div className="vx-inline-query"><Search/><span>Spider-Man Marvel Legends Final Swing</span><button>×</button><button>‹</button></div><h1>Search</h1><p>Find, track, and collect what you love.</p><HeroMeta quote="“Collectors find more than items here. They find what’s next.”"/></section>
    <div className="vx-search-tabs"><TabRow tabs={['All Results','Figures','Trading Cards','Comics','Sneakers','Other']}/><span>About 342 results for “Spider-Man Marvel Legends Final Swing”</span><button>Most Relevant <ChevronDown/></button></div>
    <div className="vx-search-main">
      <section className="vx-panel vx-product-hero">
        <div className="vx-product-gallery"><div className="vx-gallery-thumbs">{[0,1,2].map(i=><button className={i===0?'active':''} key={i}><Package/></button>)}<button>+4</button></div><div className="vx-product-image"/></div>
        <div className="vx-product-copy"><div className="vx-pillrow"><span>Action Figure</span><span className="green">In Production</span></div><h2>Spider-Man Marvel Legends<br/>Final Swing</h2><p>Hasbro <i/> Marvel Legends <i/> 2024</p><small>UPC: 5010996283714 &nbsp;&nbsp; | &nbsp;&nbsp; SKU: F90715L00</small><div className="vx-product-values"><div><b>$24.99</b><span>MSRP</span></div><div><b>$42.68</b><span>Current Market Value</span><em>↗ +28%</em></div><div><MiniLine/><span>Market Trend (90d)</span><strong>+28%</strong></div></div></div>
        <div className="vx-product-actions"><button><Box/>You own: <b>1</b><ChevronRight/></button><button><Heart/>Wishlist: <b>No</b><Plus/></button></div>
      </section>
      <aside className="vx-search-right">
        <section className="vx-panel"><h3>Quick Add This Item</h3><p>Add to your collection in seconds.</p><div className="vx-quick-cards"><button><ScanLine/>Scan Barcode</button><button><FileText/>Upload Receipt</button><button><Camera/>Take Photo</button></div></section>
        <section className="vx-panel"><PanelHead title="AI Match Suggestions" action="View All →"/><p>Similar items you might like.</p>{['Spider-Man Retro Collection','Amazing Spider-Man 2-Pack','Symbiote Spider-Man'].map((x,i)=><div className="vx-ai-row" key={x}><div className="vx-mini-product"><Package/></div><span><strong>{x}</strong><small>Marvel Legends</small><b>{['$36.99','$54.99','$37.50'][i]}</b></span><button><Plus/></button></div>)}</section>
        <section className="vx-panel vx-trending"><PanelHead title="Trending Searches" action="View All →"/>{['Spider-Man Marvel Legends','Wolverine 97 Marvel Legends','Deadpool Marvel Legends','Venom Marvel Legends','X-Men 97'].map((x,i)=><div key={x}><i>{i+1}</i><span>{x}</span><TrendingUp/></div>)}</section>
      </aside>
    </div>
    <div className="vx-search-lower">
      <section className="vx-panel vx-details"><TabRow tabs={['Product','Market','Local','VEXUM','Radar']}/><h3>Product Details</h3>{[['Brand','Hasbro'],['Line','Marvel Legends'],['Character','Spider-Man'],['Series','Final Swing'],['Release Year','2024'],['Scale','6 inch (1:12)'],['UPC','5010996283714'],['SKU','F90715L00'],['MSRP','$24.99'],['Current Value','$42.68 (+28%)'],['Condition','New']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</section>
      <section className="vx-panel vx-market"><PanelHead title="Market Intelligence" action="View More →"/><div className="vx-market-cards"><div><span>eBay Sold</span><b>$40.12</b><em>↗ +22%</em><small>Last 30 days</small></div><div><span>Active Listings</span><b>$44.99+</b><small>23 listings<br/>Lowest price</small></div><div><span>Retailers</span><b>$24.99</b><em>In Stock (2)</em></div><div><span>Marketplace Offers</span><b>$38.00+</b><small>12 offers</small></div></div><h4>Recent Sales (eBay)</h4><SmallChart/></section>
      <section className="vx-panel vx-local"><h3>Local Inventory</h3><p>Check what's in stock near you.</p>{[['Target','In Stock','2.4 mi'],['Walmart','Low Stock','6.1 mi'],['GameStop','Out of Stock','8.3 mi'],['Best Buy','In Stock','12.6 mi']].map((x,i)=><div className="vx-store-row" key={x[0]}><div className="vx-store-icon">{i===0?'◎':i===1?'✦':i===2?'GS':'BB'}</div><strong>{x[0]}</strong><span className={i===2?'bad':i===1?'warn':'good'}>{x[1]}</span><small>{x[2]}</small><ChevronRight/></div>)}<div className="vx-location"><MapPin/>Austin, TX 78701<button>Change</button></div><div className="vx-map-fake"><i/><i/><i/></div></section>
    </div>
  </PageFrame>;
}

function SetupPage(){
  return <PageFrame hero="setup">
    <section className="vx-page-title"><div><h1>Setup Planner</h1><p>Design. Organize. Display a bigger tomorrow.</p></div><HeroMeta/></section>
    <div className="vx-setup-tabs"><TabRow tabs={['Planner','My Rooms','Templates']}/><select><option>Gaming / Collection Room</option></select><button><Save/>Save</button><button><Share2/>Export</button><button className="red"><Box/>3D View</button></div>
    <div className="vx-setup-main">
      <section className="vx-panel vx-planner">
        <div className="vx-planner-tools"><button className="active"><MousePointer2/>Select</button><button><Hand/>Pan</button><button><ZoomIn/>Zoom</button><button><Ruler/>Measure</button><button><Grid3X3/>Grid</button></div>
        <div className="vx-room-canvas"><div className="vx-room-reference"/></div>
        <div className="vx-library-tabs"><TabRow tabs={['Library','Display','Furniture','Storage','Decor','Electronics','All']}/><button className="vx-element-search"><Search/>Search elements...</button></div>
        <div className="vx-library">{[['Display Case','Single'],['Display Case','Large'],['Shelf Unit','Medium'],['Wall Shelf','Floating'],['Desk','Gaming'],['Storage Bin','Standard'],['Comic Box','Short'],['Rug','VEXUM'],['Plant','Decor']].map((x,i)=><button className={i===1?'active':''} key={i}><div className={'vx-library-art a'+i}><Box/></div><strong>{x[0]}</strong><span>{x[1]}</span></button>)}</div>
      </section>
      <aside className="vx-panel vx-properties">
        <div className="vx-prop-product"><div className="vx-case-thumb"><Box/></div><div><h3>Display Case (Large)</h3><span>Display Case</span></div><button><Trash2/></button></div>
        <TabRow tabs={['Properties','Items (12)','Notes']}/>
        <label>Name<input value="Display Case (Large)" readOnly/></label>
        <label>Dimensions (inches)<div className="vx-three-fields"><span>W <b>48</b></span><span>H <b>72</b></span><span>D <b>18</b></span></div></label>
        <label>Capacity<div className="vx-capacity"><span>▣ 24 figures</span><div className="vx-progress"><i style={{width:'50%'}}/></div><b>12 / 24 (50%)</b></div></label>
        <label>Shelves<div className="vx-counter"><button>−</button><b>4</b><button>+</button></div></label>
        <label>Placement<div className="vx-place-fields"><span>X <b>192</b></span><span>Y <b>48</b></span><span>Rotation <b>0°</b><ChevronDown/></span></div></label>
        <section className="vx-fit"><div><h3>Fit Analysis</h3><strong><Check/>Fits in room</strong></div><p><Check/>Clearance (front)<b>36"</b></p><p><Check/>Clearance (sides)<b>6"</b></p><p><Check/>Clearance (top)<b>12"</b></p></section>
      </aside>
    </div>
  </PageFrame>;
}

function FinancialPage(){
  const debts=[['Chase Credit Card','$1,240','$40 min · 24.9% APR','Due Feb 5',<CreditCard key="c"/>],['Auto Loan','$2,180','$320 min · 5.9% APR','Due Feb 12',<Car key="a"/>],['Student Loan','$800','$80 min · 4.5% APR','Due Feb 18',<GraduationCap key="s"/>]];
  const budgets=[['Collectibles','$286 / $500','57%',57],['Bills & Utilities','$220 / $220','100%',100],['Food & Dining','$182 / $300','61%',61],['Subscriptions','$34 / $100','34%',34],['Savings','$0 / $200','0%',0]];
  return <PageFrame hero="financial">
    <section className="vx-fin-hero"><div><h1>Good Evening, Jordan.</h1><p>Smart collecting builds a richer tomorrow.</p></div><HeroMeta/></section>
    <TabRow tabs={['Overview','Spending','Budget','Debt','Goals','Insights']}/>
    <div className="vx-fin-stats">
      <StatCard label="Net Worth" value="$17,392" change="♢ +12.4%  vs last month" tone="green" icon={<MiniLine tone="green"/>}/>
      <StatCard label="Collection Estimated Value" value="$12,480" change="♠ +18.4%  vs last month" tone="green" icon={<MiniLine/>}/>
      <StatCard label="Monthly Hobby Spend" value="$286" change="♦ -23.1%  vs last month" tone="red" icon={<MiniLine/>}/>
      <StatCard label="Total Debt" value="$4,220" change="♥ -5.2%  vs last month" tone="red" icon={<MiniLine/>}/>
      <div className="vx-stat vx-budget-ring-card"><div><span>Budget Remaining</span><strong>$314</strong><em>42%<small>of $750 monthly</small></em></div><div className="vx-ring"><b>42%</b></div></div>
    </div>
    <div className="vx-fin-mid">
      <section className="vx-panel vx-net-chart"><div className="vx-chart-head"><div><h3>Net Worth vs Collection Value</h3><p><i className="red"/>Net Worth (Total) <i className="white"/>Collection Value</p></div><RangeButtons/></div><DoubleChart/></section>
      <section className="vx-panel vx-breakdown"><PanelHead title="Value Breakdown" action="View Details ›"/><div className="vx-donut"><div><strong>$20,892</strong><span>Total Assets</span></div></div><div className="vx-break-list">{[['Collection Estimated Value','$12,480','59.8%','red'],['Cash & Bank Accounts','$5,420','25.9%','gray'],['Investments','$2,210','10.6%','light'],['Other Assets','$782','3.7%','dark']].map(x=><p key={x[0]}><i className={x[3]}/><span>{x[0]}</span><b>{x[1]}</b><em>{x[2]}</em></p>)}</div></section>
      <section className="vx-panel vx-spend-debt"><h3>Hobby Spend vs Debt Paydown</h3><p><i className="red"/>Hobby Spend <i className="white"/>Debt Paydown</p><BarChart/></section>
    </div>
    <div className="vx-fin-bottom">
      <section className="vx-panel"><PanelHead title="Debt Overview" action="View All ›"/>{debts.map((d,i)=><div className="vx-debt-row" key={d[0]}><span>{d[4]}</span><div><strong>{d[0]}</strong><small>{d[2]}</small></div><b>{d[1]}</b><em>{d[3]}</em></div>)}</section>
      <section className="vx-panel"><PanelHead title="Monthly Budget" action="Edit ›"/>{budgets.map((b,i)=><div className="vx-budget-row" key={b[0]}><span>{[<ShoppingBag key="0"/>,<ReceiptText key="1"/>,<Utensils key="2"/>,<RefreshCw key="3"/>,<DollarSign key="4"/>][i]}</span><strong>{b[0]}</strong><b>{b[1]}</b><em>{b[2]}</em><div><i style={{width:String(b[3])+'%'}}/></div></div>)}</section>
      <section className="vx-panel"><PanelHead title="Savings Goals" action="Add Goal +"/>{[['Emergency Fund','$1,200 / $5,000','24%'],['Grail Fund','$850 / $3,000','28%'],['New Setup Fund','$420 / $2,000','21%']].map((x,i)=><div className="vx-goal" key={x[0]}><div className="vx-goal-icon">{i===1?<Crown/>:<Shield/>}</div><div><strong>{x[0]}</strong><span>{x[1]}</span><div className="vx-progress"><i style={{width:x[2]}}/></div></div><b>{x[2]}</b></div>)}</section>
      <section className="vx-panel"><PanelHead title="Preorder Commitments" action="View All ›"/>{[['Hot Toys Venom','$320','In 7 days'],['SHF Naruto (Reissue)','$85','In 14 days'],['Prime 1 Batman','$750','In 33 days']].map(x=><div className="vx-preorder-fin" key={x[0]}><div className="vx-mini-product"><Package/></div><div><strong>{x[0]}</strong><span>Charges Feb 3, 2025</span></div><b>{x[1]}</b><em>{x[2]}</em></div>)}</section>
      <section className="vx-panel vx-intel"><PanelHead title="Collector Intelligence"/>{['You spent $243 on collectibles this month.','2 preorders will charge within 14 days ($405 total).','Your hobby spend is 23% lower than last month. Keep it up!','You’re on track to reach your Grail Fund goal by Nov 2025.'].map((x,i)=><div key={x}><span>{[<TrendingUp key="0"/>,<CalendarDays key="1"/>,<TrendingDown key="2"/>,<Target key="3"/>][i]}</span><p>{x}</p></div>)}</section>
    </div>
    <div className="vx-bottom-banners"><div className="vx-story-banner"><div className="vx-story-art"/><strong>DISCIPLINE FUELS<br/>BIGGER COLLECTIONS.</strong><span>VEXUM</span></div><div className="vx-quote-banner">“A more organized you.<br/>A bigger tomorrow.”</div></div>
  </PageFrame>;
}

function PortfolioPage(){
  const cards=['Spider-Man Final Swing','Charizard','AJ1 Chicago','Batman','Luffy Gear 5','Pikachu','Goku','iPhone 15 Pro'];
  return <PageFrame hero="plain"><section className="vx-page-title"><div><h1>Portfolio</h1><p>Everything you own, organized your way.</p></div><HeroMeta/></section><TabRow tabs={['All Items','Action Figures','Sneakers','Trading Cards','Comics','Tech']}/><div className="vx-portfolio-toolbar"><span>487 items · $12,480 estimated value</span><div><button><SlidersHorizontal/>Filter</button><button><List/></button><button className="active"><Grid3X3/></button><button className="red"><Plus/>Add Item</button></div></div><div className="vx-portfolio-grid">{cards.map((x,i)=><button className="vx-portfolio-card" key={x}><div className={'vx-card-art a'+i}><Package/></div><strong>{x}</strong><span>{['Marvel Legends','Pokémon','Nike','Hot Toys','SH Figuarts','Pokémon','SH Figuarts','Apple'][i]}</span><footer><b>{['$42.68','$185','$310','$220','$68','$95','$72','$699'][i]}</b><em>+{[28,14,8,11,4,7,3,2][i]}%</em></footer></button>)}</div></PageFrame>;
}

function SocialPage(){
  return <PageFrame hero="plain"><section className="vx-page-title"><div><h1>Social</h1><p>Collectors, communities, drops, and setups.</p></div><HeroMeta quote="“Collect together. Build bigger.”"/></section><TabRow tabs={['For You','Following','Communities','Drops','Marketplace']}/><div className="vx-social-grid"><section className="vx-panel vx-feed"><article><header><div className="vx-avatar small">J</div><div><strong>jordan</strong><span>@jordan · 2h</span></div></header><p>The setup is finally starting to feel right. Red lighting was absolutely the move.</p><div className="vx-social-photo"><Sparkles/></div><footer>♡ 248 &nbsp;&nbsp; ◇ 31 &nbsp;&nbsp; ↗ Share</footer></article><article><header><div className="vx-avatar small">C</div><div><strong>collectorfall</strong><span>@collectorfall · 4h</span></div></header><p>Who else is hunting the Final Swing figure this week?</p></article></section><aside className="vx-panel"><PanelHead title="Trending"/>{['#MarvelLegends','#SpiderMan','#CollectionSetup','#Restock','#VEXUM'].map((x,i)=><div className="vx-trend-row" key={x}><b>{x}</b><span>{[32,28,21,18,15][i]}k posts</span></div>)}</aside></div></PageFrame>;
}

function PageFrame({children,hero='plain'}:{children:React.ReactNode;hero?:'home'|'search'|'wishlist'|'financial'|'setup'|'plain'}){
  return <main className={'vx-content page-'+hero}><Topbar hero={hero}/>{children}</main>;
}

function TabRow({tabs}:{tabs:string[]}){return <div className="vx-tabs">{tabs.map((x,i)=><button key={x} className={i===0?'active':''}>{x}</button>)}</div>}
function PanelHead({title,action}:{title:string;action?:string}){return <div className="vx-panel-head"><h3>{title}</h3>{action&&<button>{action}</button>}</div>}
function RangeButtons(){return <div className="vx-ranges">{['1W','1M','3M','1Y','ALL'].map((x,i)=><button key={x} className={i===2?'active':''}>{x}</button>)}</div>}
function BigLineChart(){return <svg className="vx-big-chart" viewBox="0 0 700 260" preserveAspectRatio="none"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={RED} stopOpacity=".34"/><stop offset="1" stopColor={RED} stopOpacity="0"/></linearGradient></defs><path d="M0 215 L45 190 L82 196 L120 172 L158 145 L195 120 L225 128 L262 103 L300 82 L337 92 L372 70 L410 60 L445 78 L480 56 L520 42 L555 48 L590 32 L630 20 L700 14 L700 260 L0 260 Z" fill="url(#g1)"/><path d="M0 215 L45 190 L82 196 L120 172 L158 145 L195 120 L225 128 L262 103 L300 82 L337 92 L372 70 L410 60 L445 78 L480 56 L520 42 L555 48 L590 32 L630 20 L700 14" fill="none" stroke={RED} strokeWidth="4"/><circle cx="410" cy="60" r="7" fill={RED}/><line x1="410" y1="60" x2="410" y2="245" stroke={RED} strokeDasharray="3 4" opacity=".55"/><g className="vx-chart-labels"><text x="0" y="252">Jan 2</text><text x="110" y="252">Jan 16</text><text x="235" y="252">Jan 30</text><text x="360" y="252">Feb 13</text><text x="490" y="252">Feb 27</text><text x="625" y="252">Mar 12</text><text x="-2" y="205">5K</text><text x="-2" y="142">10K</text><text x="-2" y="78">15K</text></g></svg>}
function SmallChart(){return <svg className="vx-small-chart" viewBox="0 0 360 110" preserveAspectRatio="none"><path d="M0 73 L20 66 L42 70 L65 61 L88 64 L110 56 L132 60 L152 51 L174 55 L196 48 L218 52 L240 44 L262 48 L284 42 L306 47 L330 41 L360 44" fill="none" stroke={RED} strokeWidth="2.5"/><line x1="0" y1="90" x2="360" y2="90" stroke="#2a2b30"/><line x1="0" y1="55" x2="360" y2="55" stroke="#202126" strokeDasharray="4 4"/></svg>}
function DoubleChart(){return <svg className="vx-double-chart" viewBox="0 0 650 245" preserveAspectRatio="none"><path d="M0 210 L25 192 L52 180 L80 165 L110 172 L140 148 L170 142 L200 120 L230 126 L260 108 L290 112 L320 95 L350 101 L380 84 L410 72 L440 77 L470 56 L500 61 L530 42 L560 48 L590 34 L620 39 L650 24" fill="none" stroke={RED} strokeWidth="3"/><path d="M0 225 L25 218 L52 204 L80 198 L110 201 L140 184 L170 176 L200 163 L230 169 L260 148 L290 151 L320 139 L350 144 L380 126 L410 119 L440 123 L470 105 L500 111 L530 92 L560 98 L590 82 L620 86 L650 72" fill="none" stroke="#c8c8cc" strokeWidth="2.5"/><g className="vx-gridlines">{[40,85,130,175,220].map(y=><line key={y} x1="0" y1={y} x2="650" y2={y} stroke="#232429"/>)}</g></svg>}
function BarChart(){return <div className="vx-bar-chart">{[['Aug',52,30],['Sep',58,36],['Oct',65,42],['Nov',63,39],['Dec',55,47],['Jan',42,59]].map(x=><div key={x[0] as string}><span><i style={{height:String(x[1])+'%'}}/><em style={{height:String(x[2])+'%'}}/></span><small>{x[0]}</small></div>)}</div>}
function Opportunity({title,subtitle,item,price,pct}:{title:string;subtitle:string;item:string;price:string;pct:string}){return <div className="vx-op-card"><div><strong>{title}</strong><span>{subtitle}</span></div><div className="vx-mini-product"><Package/></div><b>{item}</b><strong>{price}</strong><em>{pct}</em><ChevronRight/></div>}
function TagIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/></svg>}

export default function VexumApp(){
  const [view,setView]=useState<View>('home');
  const page=useMemo(()=>{
    if(view==='home')return <HomePage/>;
    if(view==='portfolio')return <PortfolioPage/>;
    if(view==='search')return <SearchPage/>;
    if(view==='wishlist')return <WishlistPage/>;
    if(view==='setup')return <SetupPage/>;
    if(view==='financial')return <FinancialPage/>;
    return <SocialPage/>;
  },[view]);
  return <div className="vx-app"><Sidebar view={view} setView={setView}/>{page}</div>;
}

'use client';

import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {Bell,Check,CircleDollarSign,Eye,FileUp,Layers3,MapPin,Plus,Search,Share2,ShoppingBag,Star} from 'lucide-react';
import type {NormalizedProduct,UserProductRelationship} from '../../lib/search/types';
import {useWorkspace} from '../../lib/useWorkspace';
import {wishlistEvent,type WishlistAlertFrequency,type WishlistRecord} from '../../lib/wishlist';

type Tab='product'|'market'|'local'|'vexum'|'radar';
type RadarState={price:boolean;target:number;msrp:boolean;restock:boolean;local:boolean;radius:number;marketplace:boolean;release:boolean;variant:boolean;priority:string};
type Props={
  product:NormalizedProduct;
  relationship?:UserProductRelationship;
  onBack:()=>void;
  onAddPortfolio:(product:NormalizedProduct)=>void;
  onAddWishlist:(product:NormalizedProduct)=>void;
  onRemoveWishlist:(product:NormalizedProduct)=>void;
  onRelationshipChange:(next:UserProductRelationship)=>void;
};

const money=(value?:number)=>typeof value==='number'?'$'+value.toFixed(2):'—';

function Metric({label,value,sub,tone}:{label:string;value:string;sub?:string;tone?:'green'|'red'|'muted'}){
  return <div className="vxs-intel-metric"><span>{label}</span><strong className={tone?'tone-'+tone:''}>{value}</strong>{sub?<small>{sub}</small>:null}</div>;
}

function DemoChart(){
  return <svg className="vxs-price-chart" viewBox="0 0 760 260" preserveAspectRatio="none">
    <defs><linearGradient id="vxs-price-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff2338" stopOpacity=".28"/><stop offset="1" stopColor="#ff2338" stopOpacity="0"/></linearGradient></defs>
    {[45,95,145,195,245].map(y=><line key={y} x1="0" y1={y} x2="760" y2={y} stroke="#202227"/>)}
    <path d="M0 205 L55 198 L110 183 L165 190 L220 165 L275 153 L330 161 L385 130 L440 121 L495 104 L550 111 L605 78 L660 72 L715 48 L760 40 L760 260 L0 260Z" fill="url(#vxs-price-fill)"/>
    <path d="M0 205 L55 198 L110 183 L165 190 L220 165 L275 153 L330 161 L385 130 L440 121 L495 104 L550 111 L605 78 L660 72 L715 48 L760 40" fill="none" stroke="#ff2338" strokeWidth="3.5"/>
  </svg>;
}

export default function ProductIntelligence({product,relationship,onBack,onAddPortfolio,onAddWishlist,onRemoveWishlist,onRelationshipChange}:Props){
  const workspace=useWorkspace();
  const wishlistRecord=workspace.data.wishlist?.[product.id];
  const [tab,setTab]=useState<Tab>('product');
  const [range,setRange]=useState('30D');
  const [location,setLocation]=useState('');
  const [radar,setRadar]=useState<RadarState>({
    price:wishlistRecord?.alerts.priceTarget.enabled??Boolean(relationship?.tracked),
    target:wishlistRecord?.targetPrice||relationship?.targetPrice||30,
    msrp:wishlistRecord?.alerts.msrp.enabled??true,
    restock:wishlistRecord?.alerts.restock.enabled??true,
    local:wishlistRecord?.alerts.localStock.enabled??false,
    radius:wishlistRecord?.alerts.localStock.radiusMiles||25,
    marketplace:wishlistRecord?.alerts.marketplace.enabled??false,
    release:wishlistRecord?.alerts.releaseChange.enabled??true,
    variant:wishlistRecord?.alerts.newVariant.enabled??false,
    priority:wishlistRecord?.priority==='Grail'?'Grail':wishlistRecord?.priority==='High'?'Important':'Normal'
  });

  useEffect(()=>{
    if(wishlistRecord){
      setRadar({
        price:wishlistRecord.alerts.priceTarget.enabled,target:wishlistRecord.targetPrice||30,
        msrp:wishlistRecord.alerts.msrp.enabled,restock:wishlistRecord.alerts.restock.enabled,
        local:wishlistRecord.alerts.localStock.enabled,radius:wishlistRecord.alerts.localStock.radiusMiles||25,
        marketplace:wishlistRecord.alerts.marketplace.enabled,release:wishlistRecord.alerts.releaseChange.enabled,
        variant:wishlistRecord.alerts.newVariant.enabled,
        priority:wishlistRecord.priority==='Grail'?'Grail':wishlistRecord.priority==='High'?'Important':'Normal'
      });
      return;
    }
    try{
      const saved=localStorage.getItem('vexum.radar.'+product.id);
      if(saved)setRadar(current=>({...current,...JSON.parse(saved)}));
    }catch{}
  },[product.id,wishlistRecord?.updatedAt]);

  useEffect(()=>{
    if(!wishlistRecord){
      try{localStorage.setItem('vexum.radar.'+product.id,JSON.stringify(radar))}catch{}
      return;
    }
    const frequency:WishlistAlertFrequency=wishlistRecord.priority==='Grail'||wishlistRecord.priority==='High'?'Immediate':'Daily Digest';
    const ruleFrequency=(enabled:boolean):WishlistAlertFrequency=>enabled?frequency:'Off';
    const alerts={...wishlistRecord.alerts,
      priceTarget:{...wishlistRecord.alerts.priceTarget,enabled:radar.price,frequency:ruleFrequency(radar.price)},
      msrp:{...wishlistRecord.alerts.msrp,enabled:radar.msrp,frequency:ruleFrequency(radar.msrp)},
      restock:{...wishlistRecord.alerts.restock,enabled:radar.restock,frequency:ruleFrequency(radar.restock)},
      localStock:{...wishlistRecord.alerts.localStock,enabled:radar.local,frequency:ruleFrequency(radar.local),radiusMiles:[5,10,25,50].includes(radar.radius)?radar.radius as 5|10|25|50:25},
      marketplace:{...wishlistRecord.alerts.marketplace,enabled:radar.marketplace,frequency:ruleFrequency(radar.marketplace)},
      releaseChange:{...wishlistRecord.alerts.releaseChange,enabled:radar.release,frequency:ruleFrequency(radar.release)},
      newVariant:{...wishlistRecord.alerts.newVariant,enabled:radar.variant,frequency:ruleFrequency(radar.variant)}
    };
    const target=radar.price&&radar.target>0?radar.target:wishlistRecord.targetPrice;
    const signature=JSON.stringify([alerts.priceTarget,alerts.msrp,alerts.restock,alerts.localStock,alerts.marketplace,alerts.releaseChange,alerts.newVariant,target]);
    const current=JSON.stringify([wishlistRecord.alerts.priceTarget,wishlistRecord.alerts.msrp,wishlistRecord.alerts.restock,wishlistRecord.alerts.localStock,wishlistRecord.alerts.marketplace,wishlistRecord.alerts.releaseChange,wishlistRecord.alerts.newVariant,wishlistRecord.targetPrice]);
    if(signature===current)return;
    const updated=wishlistEvent(wishlistRecord,'alert','Radar rules updated from Product Intelligence',{alerts,targetPrice:target});
    workspace.update({...workspace.data,wishlist:{...(workspace.data.wishlist||{}),[product.id]:updated}});
  // Workspace intentionally excluded: only user Radar changes should persist this effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[product.id,radar]);

  const demo=product.demoMarket;
  const confidence=demo?.confidence||'unavailable';
  const relation:UserProductRelationship=relationship??{productId:product.id,ownedQuantity:0,wishlisted:false,tracked:false,grail:false};

  const track=()=>{
    const next={...relation,tracked:!relation.tracked};
    onRelationshipChange(next);
    setRadar(current=>({...current,price:next.tracked}));
  };

  const releaseRows=[
    ['Status',product.releaseStatus],
    ['Announcement','Catalog date unavailable'],
    ['Preorder','Catalog date unavailable'],
    ['Release',product.releaseDate||'Unknown'],
    ['Expected Ship','Not connected'],
    ['Retirement','Unknown']
  ];

  return <div className="vxs-intelligence">
    <div className="vxs-intel-topline">
      <button onClick={onBack}>← Search Results</button>
      <span>{product.category} / {product.manufacturer} / {product.line||product.brand}</span>
      <div><button><Share2/>Share</button><button><Eye/>Ask VEXUM</button></div>
    </div>

    <section className="vx-panel vxs-product-header">
      <div className="vxs-product-visual"><Layers3/>{product.demo?<span>DEMO PRODUCT</span>:null}</div>
      <div className="vxs-product-identity">
        <div className="vxs-pill-row"><span>{product.category}</span><span className="status">{product.releaseStatus}</span>{relation.tracked?<span className="tracking">TRACKING</span>:null}</div>
        <h1>{product.canonicalName}</h1>
        <p>{product.manufacturer}<i/> {product.line||product.brand}<i/> {product.releaseYear}</p>
        <div className="vxs-identifiers">{product.upc?<span>UPC <b>{product.upc}</b></span>:null}{product.sku?<span>SKU <b>{product.sku}</b></span>:null}{product.modelNumber?<span>MODEL <b>{product.modelNumber}</b></span>:null}</div>
        <div className="vxs-product-actions">
          {relation.ownedQuantity?<button className="active"><Layers3/>You own: {relation.ownedQuantity}</button>:<button className="primary" onClick={()=>onAddPortfolio(product)}><Plus/>Add to Collection</button>}
          {relation.wishlisted?<button className="active" onClick={()=>onRemoveWishlist(product)}><Star/>Remove from Wishlist</button>:<button onClick={()=>onAddWishlist(product)}><Star/>Add to Wishlist</button>}
          <button className={relation.tracked?'active':''} onClick={track}><Bell/>{relation.tracked?'Tracking':'Track'}</button>
          {relation.ownedQuantity?<button><ShoppingBag/>Sell This Item</button>:null}
        </div>
      </div>
      <aside className="vxs-user-relationship">
        <span>YOUR VEXUM</span>
        <div><strong>{relation.ownedQuantity||0}</strong><small>Owned</small></div>
        <div><strong>{relation.wishlisted?'Yes':'No'}</strong><small>Wishlist</small></div>
        <div><strong>{relation.tracked?'On':'Off'}</strong><small>Radar</small></div>
        {relation.targetPrice?<p>Target: <b>{money(relation.targetPrice)}</b></p>:null}
      </aside>
    </section>

    <div className="vxs-summary-metrics">
      <Metric label="MSRP" value={money(product.msrp)} sub="Catalog metadata"/>
      <Metric label="Current Market" value={demo?money(demo.current):'—'} sub={demo?'Demo estimate':'Source not connected'}/>
      <Metric label="Last Sold" value={demo?money(demo.lastSold):'—'} sub={demo?'Demo sale':'Source not connected'}/>
      <Metric label="30-Day Average" value={demo?money(demo.average30d):'—'} sub={demo?'Demo sample':'Source not connected'}/>
      <Metric label="Market Trend" value={demo?(demo.trend30d>=0?'+':'')+demo.trend30d.toFixed(1)+'%':'—'} tone={demo&&demo.trend30d<0?'red':'green'} sub="30-day"/>
      <Metric label="Market Confidence" value={confidence==='unavailable'?'Unavailable':confidence[0].toUpperCase()+confidence.slice(1)} tone={confidence==='high'?'green':confidence==='low'?'red':'muted'} sub={demo?'Demo confidence':'No comparable-sales source'}/>
    </div>

    <div className="vxs-intel-tabs">{(['product','market','local','vexum','radar'] as Tab[]).map(id=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id==='vexum'?'VEXUM':id[0].toUpperCase()+id.slice(1)}</button>)}</div>

    {tab==='product'?<div className="vxs-product-tab">
      <section className="vx-panel vxs-product-details">
        <div className="vxs-panel-head"><div><h3>Product Details</h3><p>Flexible category-specific metadata.</p></div><span>{product.category}</span></div>
        <div className="vxs-detail-grid">
          {product.attributes.map(attribute=><div key={attribute.key}><span>{attribute.key}</span><strong>{attribute.value}</strong></div>)}
          <div><span>Brand</span><strong>{product.brand||'—'}</strong></div>
          <div><span>Franchise</span><strong>{product.franchise||'—'}</strong></div>
          <div><span>Dimensions</span><strong>{product.dimensions||'—'}</strong></div>
          <div><span>Release Status</span><strong>{product.releaseStatus}</strong></div>
        </div>
      </section>
      <section className="vx-panel vxs-variants"><div className="vxs-panel-head"><div><h3>Variants</h3><p>Variants remain separate product entities.</p></div></div>
        {product.variants.length?product.variants.map(variant=><button key={variant.id}><div className="vxs-small-art"><Layers3/></div><span><strong>{variant.name}</strong><small>{variant.type} · {variant.status||'Unknown'}</small></span><b>›</b></button>):<div className="vxs-source-empty"><span>No variants in catalog</span><p>VEXUM will keep future variants linked to this canonical product family without merging their identities.</p></div>}
      </section>
      <section className="vx-panel vxs-release"><div className="vxs-panel-head"><div><h3>Release Information</h3><p>Catalog-backed status and dates.</p></div></div>{releaseRows.map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</section>
      <section className="vx-panel vxs-ai-actions"><div className="vxs-panel-head"><div><h3>VEXUM Intelligence</h3><p>AI lives inside Search instead of becoming another app tab.</p></div><Eye/></div>{['Show me every Spider-Man figure related to this one.','Do I already own another version?','What am I missing from this line?','Find this below MSRP.','Compare sealed vs opened prices.'].map(text=><button key={text}>{text}<b>›</b></button>)}<small>AI answers will use real catalog/Portfolio/provider data when the AI layer is connected. No answer is fabricated here.</small></section>
    </div>:null}

    {tab==='market'?<div className="vxs-market-tab">
      <section className="vx-panel vxs-market-chart">
        <div className="vxs-chart-head"><div><h3>Price History</h3><p>{demo?'Demo chart — not live market data':'No market provider connected'}</p></div><div>{['7D','30D','3M','6M','1Y','ALL'].map(item=><button key={item} className={range===item?'active':''} onClick={()=>setRange(item)}>{item}</button>)}</div></div>
        {demo?<DemoChart/>:<div className="vxs-source-empty tall"><span>No recent comparable sales found.</span><p>Connect a market provider to populate sold averages, median, high, low, and confidence.</p></div>}
        <footer><label><input type="checkbox" defaultChecked/>Sold average</label><label><input type="checkbox" defaultChecked/>Current market</label><label><input type="checkbox"/>MSRP</label><span>Snapshot: {demo?'demo':'unavailable'}</span></footer>
      </section>
      <section className="vx-panel vxs-market-stats"><div className="vxs-panel-head"><div><h3>Market Statistics</h3><p>Provider-normalized metrics.</p></div></div>{[
        ['Recent average',demo?money(demo.average30d):'—'],['Median','—'],['30-day high','—'],['30-day low','—'],['30-day change',demo?(demo.trend30d>=0?'+':'')+demo.trend30d+'%':'—'],['Comparable sales','—'],['Sell-through rate','Future'],['Quick-sale estimate','Future']
      ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</section>
      <section className="vx-panel vxs-provider-panel"><div className="vxs-panel-head"><div><h3>Recent Sold Listings</h3><p>Normalized source adapters.</p></div></div><div className="vxs-provider-unavailable"><span>Live market source not connected</span><p>No fake completed sales are shown. When eBay/other authorized providers are connected, comparable sales will load independently here.</p></div></section>
      <section className="vx-panel vxs-provider-panel"><div className="vxs-panel-head"><div><h3>Active Listings & Retail Offers</h3><p>Marketplace and retail providers fail independently.</p></div></div><div className="vxs-provider-unavailable"><span>Marketplace source not connected</span><p>Active listings, shipping, seller, price, and retailer availability remain hidden until a provider returns real data.</p></div></section>
    </div>:null}

    {tab==='local'?<div className="vxs-local-tab">
      <section className="vx-panel vxs-local-control"><div><MapPin/><span><h3>Local Inventory</h3><p>Location is optional. Search remains fully usable without it.</p></span></div><label><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="ZIP or City"/><button>Set location</button></label></section>
      <section className="vx-panel vxs-local-results"><div className="vxs-panel-head"><div><h3>Nearby Retailers</h3><p>{location?'Waiting for a connected local inventory provider.':'Set a location to enable local checks.'}</p></div><button>List / Map</button></div><div className="vxs-source-empty tall"><MapPin/><span>{location?'No participating retailer data available.':'Location not set'}</span><p>VEXUM will show retailer, distance, availability, price, store, and last-checked time here. It will never invent quantities or stock states.</p></div></section>
    </div>:null}

    {tab==='vexum'?<div className="vxs-vexum-tab">
      <section className="vx-panel"><div className="vxs-panel-head"><div><h3>Your Collection</h3><p>Private ownership context.</p></div></div>{relation.ownedQuantity?<><div className="vxs-own-card"><div className="vxs-small-art"><Layers3/></div><div><strong>Owned: {relation.ownedQuantity}</strong><span>Condition: Opened Complete</span><small>Location: {relation.setupLocation||'Not assigned'}</small></div><button>Open in Portfolio →</button></div></>:<div className="vxs-source-empty"><span>You do not own this demo product.</span><button onClick={()=>onAddPortfolio(product)}>Add to Collection</button></div>}</section>
      <section className="vx-panel"><div className="vxs-panel-head"><div><h3>Wishlist</h3><p>Your private acquisition preferences.</p></div></div>{relation.wishlisted?<div className="vxs-wishlist-context"><div><span>Priority</span><b>{relation.grail?'Grail':'Medium'}</b></div><div><span>Target</span><b>{money(relation.targetPrice)}</b></div><button>Open Wishlist →</button></div>:<div className="vxs-source-empty"><span>Not on your wishlist.</span><button onClick={()=>onAddWishlist(product)}>Add to Wishlist</button></div>}</section>
      <section className="vx-panel"><div className="vxs-panel-head"><div><h3>Community Ownership</h3><p>Privacy-aware VEXUM network layer.</p></div></div><div className="vxs-demo-community"><span>DEMO PREVIEW</span><strong>1,284</strong><p>Example collector-count presentation. No real user ownership is exposed until authenticated privacy-aware aggregation is connected.</p></div></section>
      <section className="vx-panel"><div className="vxs-panel-head"><div><h3>Community & Marketplace</h3><p>Canonical product-linked activity.</p></div></div><div className="vxs-provider-unavailable"><span>Social marketplace data not connected</span><p>Future content: friends owning, people selling, trades, tagged posts, reviews, setup photos, discussions and questions.</p></div></section>
      <section className="vx-panel vxs-cross-system"><div className="vxs-panel-head"><div><h3>Connected Context</h3><p>Same product identity across VEXUM.</p></div></div><div><CircleDollarSign/><span><strong>Financial</strong><small>{workspace.data.financialPreferences?.monthlyHobbyBudget!==undefined?'Monthly hobby target: '+money(workspace.data.financialPreferences.monthlyHobbyBudget):'Hobby budget not configured'}</small></span><button>View →</button></div><div><Layers3/><span><strong>Setup</strong><small>{relation.setupLocation||'No physical location assigned'}</small></span><button>Check fit →</button></div><div><ShoppingBag/><span><strong>Sell</strong><small>{relation.ownedQuantity?'Preload this product into Sell':'Browse VEXUM marketplace listings'}</small></span><button>Open →</button></div></section>
    </div>:null}

    {tab==='radar'?<div className="vxs-radar-tab">
      <section className="vx-panel vxs-radar-hero"><div><Bell/><span><h3>Radar for this product</h3><p>Monitor only the signals you care about.</p></span></div><button className={relation.tracked?'active':''} onClick={track}>{relation.tracked?<><Check/>Tracking</>:<><Plus/>Start Tracking</>}</button></section>
      <section className="vx-panel vxs-radar-rules"><div className="vxs-panel-head"><div><h3>Alert Rules</h3><p>{wishlistRecord?'Synced with this item’s Wishlist alert rules.':'Standalone Radar preferences are local until the product is added to Wishlist.'}</p></div><select value={radar.priority} onChange={e=>setRadar(r=>({...r,priority:e.target.value}))}><option>Normal</option><option>Important</option><option>Grail</option></select></div>
        <RadarRow label="Target price" desc="Notify when price reaches your target." enabled={radar.price} onToggle={()=>setRadar(r=>({...r,price:!r.price}))}><input type="number" value={radar.target} onChange={e=>setRadar(r=>({...r,target:Number(e.target.value)}))}/><span>$</span></RadarRow>
        <RadarRow label="At or below MSRP" desc="Notify when a real offer appears at MSRP or less." enabled={radar.msrp} onToggle={()=>setRadar(r=>({...r,msrp:!r.msrp}))}/>
        <RadarRow label="Restock" desc="Notify when a connected retailer reports stock." enabled={radar.restock} onToggle={()=>setRadar(r=>({...r,restock:!r.restock}))}/>
        <RadarRow label="Local restock" desc="Monitor participating retailers within a radius." enabled={radar.local} onToggle={()=>setRadar(r=>({...r,local:!r.local}))}><input type="number" value={radar.radius} onChange={e=>setRadar(r=>({...r,radius:Number(e.target.value)}))}/><span>mi</span></RadarRow>
        <RadarRow label="New marketplace listing" desc="Notify for matching price/condition listings." enabled={radar.marketplace} onToggle={()=>setRadar(r=>({...r,marketplace:!r.marketplace}))}/>
        <RadarRow label="Release changes" desc="Announcement, preorder, ship or release date changes." enabled={radar.release} onToggle={()=>setRadar(r=>({...r,release:!r.release}))}/>
        <RadarRow label="New variant discovered" desc="Notify when the canonical catalog gains a related variant." enabled={radar.variant} onToggle={()=>setRadar(r=>({...r,variant:!r.variant}))}/>
      </section>
      <section className="vx-panel vxs-smart-radar"><div className="vxs-panel-head"><div><h3>Smart Radar Context</h3><p>Why VEXUM can be more useful than a generic stock tracker.</p></div><Star/></div><div><span>PORTFOLIO</span><p>{relation.ownedQuantity?'You already own '+relation.ownedQuantity+' cop'+(relation.ownedQuantity===1?'y.':'ies.'):'No owned copy is currently linked.'}</p></div><div><span>COMPLETION</span><p>Exact set-completion impact is unavailable until canonical set membership is connected; VEXUM will not invent a count.</p></div><div><span>WISHLIST</span><p>{relation.targetPrice?'Your target is '+money(relation.targetPrice)+'.':'Set a target price to make alerts contextual.'}</p></div><small>Ownership and Wishlist target context are real. Completion, local stock, and marketplace supply remain unavailable until their canonical providers are connected.</small></section>
    </div>:null}

    <div className="vxs-demo-note"><span>{product.demo?'DEMO PRODUCT':'PRODUCT'}</span><p>{product.demo?'Identity and example value fields are isolated demo data. Live sales, listings, retailer inventory, community counts, and AI answers are not represented as real.':'Live product record.'}</p></div>
  </div>;
}

function RadarRow({label,desc,enabled,onToggle,children}:{label:string;desc:string;enabled:boolean;onToggle:()=>void;children?:ReactNode}){
  return <div className="vxs-radar-row"><button className={'vxs-toggle '+(enabled?'on':'')} onClick={onToggle} aria-pressed={enabled}><i/></button><div><strong>{label}</strong><span>{desc}</span></div>{children?<aside>{children}</aside>:null}</div>;
}

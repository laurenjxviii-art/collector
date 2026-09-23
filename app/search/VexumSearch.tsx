'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {Camera,FileText,Image as ImageIcon,Link2,Plus,ScanLine,Search,SlidersHorizontal,Star,X} from 'lucide-react';
import SearchDiscovery from './SearchDiscovery';
import SearchResults from './SearchResults';
import ProductIntelligence from './ProductIntelligence';
import IdentifyItem from './IdentifyItem';
import {DEMO_PRODUCTS,DEMO_RECENT_IDS,DEMO_RELATIONSHIPS} from '../../lib/search/demo';
import {resolveSearch} from '../../lib/search/providers';
import type {NormalizedProduct,UserProductRelationship} from '../../lib/search/types';
import {useWorkspace} from '../../lib/useWorkspace';
import {VexumDialog} from '../VexumUi';
import {alertDefaults,conditionOptions,newWishlistRecord,snapshotFromProduct,wishlistEvent,type WishlistPriority,type WishlistRecord} from '../../lib/wishlist';
import type {Item} from '../../lib/model';
import {newPortfolioId,normalizePortfolioPreferences} from '../../lib/portfolio';

type IdentifyMethod='camera'|'image'|'barcode'|'receipt'|'url';
type PortfolioCopyInput={
  price:number;date:string;condition:string;quantity:number;collectionId:string;
  retailer:string;box:string;accessories:string;receipt:string;notes:string;
};

type Props={
  initialQuery?:string;
  initialProductId?:string;
};

const REL_KEY='vexum.search.relationships.v1';
const RECENT_KEY='vexum.search.recent-products.v1';
const HISTORY_KEY='vexum.search.history.v1';

function loadRelationships(){
  if(typeof window==='undefined')return DEMO_RELATIONSHIPS;
  try{
    const saved=localStorage.getItem(REL_KEY);
    return saved?{...DEMO_RELATIONSHIPS,...JSON.parse(saved)}:{...DEMO_RELATIONSHIPS};
  }catch{return {...DEMO_RELATIONSHIPS}}
}
function saveRelationships(value:Record<string,UserProductRelationship>){
  try{localStorage.setItem(REL_KEY,JSON.stringify(value))}catch{}
}
function money(n?:number){return typeof n==='number'?'$'+n.toFixed(2):'—'}

export default function VexumSearch({initialQuery='',initialProductId=''}:Props){
  const workspace=useWorkspace();
  const [query,setQuery]=useState(initialQuery);
  const [submittedQuery,setSubmittedQuery]=useState(initialQuery);
  const [results,setResults]=useState<NormalizedProduct[]>([]);
  const [selected,setSelected]=useState<NormalizedProduct|null>(()=>DEMO_PRODUCTS.find(p=>p.id===initialProductId)||null);
  const [loading,setLoading]=useState(Boolean(initialQuery&&!initialProductId));
  const [error,setError]=useState('');
  const [identify,setIdentify]=useState<IdentifyMethod|null>(null);
  const [relationships,setRelationships]=useState<Record<string,UserProductRelationship>>(()=>loadRelationships());
  const [recentIds,setRecentIds]=useState<string[]>(DEMO_RECENT_IDS);
  const [history,setHistory]=useState<string[]>([]);
  const [portfolioModal,setPortfolioModal]=useState<NormalizedProduct|null>(null);
  const [wishlistModal,setWishlistModal]=useState<NormalizedProduct|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{
    try{
      const recent=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');
      if(Array.isArray(recent)&&recent.length)setRecentIds(recent);
      const savedHistory=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
      if(Array.isArray(savedHistory))setHistory(savedHistory);
    }catch{}
  },[]);

  useEffect(()=>{
    if(initialQuery&&!initialProductId)void performSearch(initialQuery,false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[]);

  useEffect(()=>{
    const onPop=()=>{
      const url=new URL(window.location.href);
      const parts=url.pathname.split('/').filter(Boolean);
      const productId=parts[0]==='search'&&parts[1]==='product'?parts[2]:'';
      const nextProduct=productId?DEMO_PRODUCTS.find(p=>p.id===productId)||null:null;
      setSelected(nextProduct);
      const nextQuery=url.searchParams.get('q')||'';
      setQuery(nextQuery);
      setSubmittedQuery(nextQuery);
      if(nextQuery&&!nextProduct)void performSearch(nextQuery,false);
    };
    window.addEventListener('popstate',onPop);
    return ()=>window.removeEventListener('popstate',onPop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const effectiveRelationships=useMemo(()=>{
    const next={...relationships};
    const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    for(const product of DEMO_PRODUCTS){
      const matchedOwned=workspace.data.items.filter(item=>item.status==='owned'&&(
        normalize(item.name)===normalize(product.canonicalName)||
        (!!product.upc&&item.identity?.upc===product.upc)||
        (!!product.sku&&item.identity?.sku===product.sku)||
        (!!product.modelNumber&&item.identity?.modelNumber===product.modelNumber)
      ));
      const owned=matchedOwned.reduce((sum,item)=>sum+item.quantity,0);
      if(owned>0){
        const current=next[product.id]||{productId:product.id,ownedQuantity:0,wishlisted:false,tracked:false,grail:false};
        const setupLocation=matchedOwned.find(item=>item.location.trim())?.location||current.setupLocation;
        next[product.id]={...current,ownedQuantity:Math.max(current.ownedQuantity||0,owned),setupLocation};
      }
    }
    Object.entries(workspace.data.wishlist||{}).forEach(([productId,record])=>{
      if(record.source!=='catalog')return;
      const owned=next[productId]?.ownedQuantity||0;
      next[productId]={
        productId,ownedQuantity:owned,wishlisted:!record.archived,
        tracked:Object.values(record.alerts).some(rule=>rule.enabled&&rule.frequency!=='Off'),
        grail:record.priority==='Grail',targetPrice:record.targetPrice,maxPrice:record.maximumPrice,
        conditionRequirement:record.desiredCondition,setupLocation:next[productId]?.setupLocation
      };
    });
    return next;
  },[relationships,workspace.data.wishlist,workspace.data.items]);

  const relationFor=(product:NormalizedProduct)=>effectiveRelationships[product.id]||{
    productId:product.id,ownedQuantity:0,wishlisted:false,tracked:false,grail:false
  };

  const setRelation=(next:UserProductRelationship)=>{
    setRelationships(current=>{
      const value={...current,[next.productId]:next};
      saveRelationships(value);
      return value;
    });
  };

  const saveWishlistRecord=(record:WishlistRecord)=>{
    workspace.update({...workspace.data,wishlist:{...(workspace.data.wishlist||{}),[record.productId]:record}});
  };

  const savePortfolioCopy=(product:NormalizedProduct,relation:UserProductRelationship,input:PortfolioCopyInput)=>{
    const now=new Date().toISOString();
    const preferences=normalizePortfolioPreferences(workspace.data.portfolioPreferences);
    const collection=workspace.data.collections.find(row=>row.id===input.collectionId);
    const template=preferences.templates.find(row=>row.id===collection?.customFieldTemplateId);
    const customFields:Record<string,string>=Object.fromEntries((template?.fields||[]).map(field=>[field.label,field.defaultValue||'']));
    if(input.retailer)customFields['Purchased From']=input.retailer;
    if(input.box)customFields['Box']=input.box;
    if(input.accessories)customFields['Accessories']=input.accessories;
    if(product.msrp!==undefined)customFields['MSRP']=String(product.msrp);
    const currentValue=product.demoMarket?.current??0;
    const item:Item={
      id:newPortfolioId('item'),productId:product.id,collectionId:input.collectionId,
      name:product.canonicalName,category:product.category,status:'owned',
      purchasePrice:Math.max(0,input.price),currentValue:Math.max(0,currentValue),quantity:Math.max(1,Math.round(input.quantity)),
      image:product.imageUrl||'',condition:input.condition,purchaseDate:input.date,location:'',notes:input.notes,
      customFields,
      packagingState:/sealed/i.test(input.condition)?'sealed':/loose/i.test(input.condition)?'loose':'opened-box',
      identity:{
        brand:product.manufacturer||product.brand,series:product.line,year:product.releaseYear,
        upc:product.upc||'',sku:product.sku||'',modelNumber:product.modelNumber||'',
        description:product.description||''
      },
      documents:input.receipt?[{id:newPortfolioId('doc'),kind:'Receipt',name:'Purchase Receipt',url:input.receipt,createdAt:now}]:[],
      historyEvents:[
        {id:newPortfolioId('history'),at:now,type:'added',label:'Added from canonical Search',detail:product.id},
        ...(input.date?[{id:newPortfolioId('history'),at:input.date,type:'purchased' as const,label:'Purchased',detail:input.retailer||undefined}]:[])
      ],
      createdAt:now,updatedAt:now
    };
    workspace.update({...workspace.data,items:[...workspace.data.items,item]});
    setRelation({...relation,ownedQuantity:(relation.ownedQuantity||0)+item.quantity});
  };

  const removeWishlistRecord=(product:NormalizedProduct)=>{
    const existing=workspace.data.wishlist?.[product.id];
    if(existing){
      const disabled=Object.fromEntries(Object.entries(existing.alerts).map(([key,rule])=>[key,{...rule,enabled:false,frequency:'Off'}])) as WishlistRecord['alerts'];
      const archived=wishlistEvent(existing,'archive','Removed from Wishlist from Search',{archived:true,archiveReason:'removed',alerts:disabled});
      workspace.update({...workspace.data,wishlist:{...(workspace.data.wishlist||{}),[product.id]:archived}});
    }
    const relation=relationFor(product);
    setRelation({...relation,wishlisted:false,tracked:false,grail:false});
  };

  const syncUrl=(nextQuery:string,product?:NormalizedProduct|null,replace=false)=>{
    if(typeof window==='undefined')return;
    const suffix=nextQuery?'?q='+encodeURIComponent(nextQuery):'';
    const path=product?'/search/product/'+encodeURIComponent(product.id)+suffix:'/search'+suffix;
    window.history[replace?'replaceState':'pushState']({},'',path);
  };

  async function performSearch(value=query,push=true){
    const clean=value.trim();
    setQuery(clean);
    setSubmittedQuery(clean);
    setSelected(null);
    setError('');
    if(!clean){
      setResults([]);
      if(push)syncUrl('',null);
      return;
    }
    setLoading(true);
    try{
      const found=await resolveSearch(clean);
      setResults(found);
      setHistory(current=>{
        const next=[clean,...current.filter(x=>x.toLowerCase()!==clean.toLowerCase())].slice(0,10);
        try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next))}catch{}
        return next;
      });
      if(push)syncUrl(clean,null);
    }catch{
      setError('Search could not complete. The rest of VEXUM remains available.');
      setResults([]);
    }finally{setLoading(false)}
  }

  const selectProduct=(product:NormalizedProduct)=>{
    setSelected(product);
    setRecentIds(current=>{
      const next=[product.id,...current.filter(id=>id!==product.id)].slice(0,12);
      try{localStorage.setItem(RECENT_KEY,JSON.stringify(next))}catch{}
      return next;
    });
    syncUrl(submittedQuery||query,product);
  };

  const closeProduct=()=>{
    setSelected(null);
    syncUrl(submittedQuery||query,null);
  };

  const clearSearch=()=>{
    setQuery('');
    setSubmittedQuery('');
    setResults([]);
    setSelected(null);
    syncUrl('',null);
    inputRef.current?.focus();
  };

  return <div className="vxs-page">
    <section className="vxs-search-hero">
      <div className="vxs-search-heading"><span>03 — SEARCH</span><h1>{selected?'Product Intelligence':'Search'}</h1><p>{selected?'Everything VEXUM knows about this product.':'Find, identify, research, track, and collect what you love.'}</p></div>
      <aside><span>VEXUM DISCOVERY ENGINE</span><q>Tell me everything VEXUM knows about this thing.</q></aside>
    </section>

    {!selected?<div className="vxs-search-command">
      <form onSubmit={e=>{e.preventDefault();void performSearch()}}>
        <Search/>
        <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, UPCs, SKUs, brands, lines, sets, characters..." aria-label="Search VEXUM catalog"/>
        {query?<button type="button" className="clear" onClick={clearSearch}><X/></button>:null}
        <kbd>Ctrl K</kbd>
        <button className="submit" type="submit">Search</button>
      </form>
      <div className="vxs-input-actions">
        <button onClick={()=>setIdentify('camera')}><Camera/><span>Camera</span></button>
        <button onClick={()=>setIdentify('image')}><ImageIcon/><span>Image</span></button>
        <button onClick={()=>setIdentify('barcode')}><ScanLine/><span>Barcode</span></button>
        <button onClick={()=>setIdentify('receipt')}><FileText/><span>Receipt</span></button>
        <button onClick={()=>setIdentify('url')}><Link2/><span>URL</span></button>
      </div>
    </div>:null}

    {!selected&&history.length>0&&!submittedQuery?<div className="vxs-history">
      <span>Recent searches</span>{history.slice(0,6).map(item=><button key={item} onClick={()=>void performSearch(item)}>{item}</button>)}<button className="clear-history" onClick={()=>{setHistory([]);try{localStorage.removeItem(HISTORY_KEY)}catch{}}}>Clear</button>
    </div>:null}

    {loading?<SearchSkeleton/>:error?<div className="vxs-search-error"><strong>Search unavailable</strong><p>{error}</p><button onClick={()=>void performSearch(submittedQuery)}>Try again</button></div>:selected?
      <ProductIntelligence product={selected} relationship={effectiveRelationships[selected.id]} onBack={closeProduct} onAddPortfolio={setPortfolioModal} onAddWishlist={setWishlistModal} onRemoveWishlist={removeWishlistRecord} onRelationshipChange={setRelation}/>:
      submittedQuery?<SearchResults query={submittedQuery} products={results} relationships={effectiveRelationships} onSelect={selectProduct} onAddPortfolio={setPortfolioModal} onAddWishlist={setWishlistModal} onRemoveWishlist={removeWishlistRecord} onIdentify={()=>setIdentify('camera')}/>:
      <SearchDiscovery recentIds={recentIds} relationships={effectiveRelationships} onSelect={selectProduct} onSearch={value=>void performSearch(value)} onIdentify={()=>setIdentify('camera')}/>
    }

    {identify?<IdentifyItem initialMethod={identify} onClose={()=>setIdentify(null)} onConfirm={product=>{setIdentify(null);selectProduct(product)}}/>:null}
    {portfolioModal?<AddPortfolioModal product={portfolioModal} relation={relationFor(portfolioModal)} collections={workspace.data.collections.filter(collection=>!collection.archivedAt)} templates={normalizePortfolioPreferences(workspace.data.portfolioPreferences).templates} onClose={()=>setPortfolioModal(null)} onSave={(next,input)=>{savePortfolioCopy(portfolioModal,next,input);setPortfolioModal(null)}}/>:null}
    {wishlistModal?<WishlistModal product={wishlistModal} relation={relationFor(wishlistModal)} record={workspace.data.wishlist?.[wishlistModal.id]} onClose={()=>setWishlistModal(null)} onSave={(next,record)=>{setRelation(next);saveWishlistRecord(record);setWishlistModal(null)}}/>:null}
  </div>;
}

function AddPortfolioModal({product,relation,collections,templates,onClose,onSave}:{product:NormalizedProduct;relation:UserProductRelationship;collections:Array<{id:string;name:string;customFieldTemplateId?:string}>;templates:Array<{id:string;name:string}>;onClose:()=>void;onSave:(r:UserProductRelationship,input:PortfolioCopyInput)=>void}){
  const [price,setPrice]=useState(product.msrp?String(product.msrp):'');
  const [date,setDate]=useState('');
  const [condition,setCondition]=useState('Opened Complete');
  const [quantity,setQuantity]=useState(1);
  const [collectionId,setCollectionId]=useState('');
  const [retailer,setRetailer]=useState('');
  const [box,setBox]=useState('Yes');
  const [accessories,setAccessories]=useState('Complete');
  const [receipt,setReceipt]=useState('');
  const [notes,setNotes]=useState('');
  const selectedCollection=collections.find(collection=>collection.id===collectionId);
  const selectedTemplate=templates.find(template=>template.id===selectedCollection?.customFieldTemplateId);
  return <VexumDialog open onClose={onClose} title={product.canonicalName} eyebrow="ADD TO PORTFOLIO" description="Catalog metadata is already known. This creates your specific physical copy in the synced Portfolio." size="lg" className="vxs-shared-dialog">
    <div className="vxs-known-metadata"><span><b>Manufacturer</b>{product.manufacturer}</span><span><b>Line</b>{product.line||'—'}</span><span><b>Year</b>{product.releaseYear}</span><span><b>UPC</b>{product.upc||'—'}</span><span><b>SKU</b>{product.sku||'—'}</span><span><b>MSRP</b>{money(product.msrp)}</span></div>
    {relation.ownedQuantity>0?<div className="vxs-owned-warning"><Star/><span>You already own {relation.ownedQuantity} cop{relation.ownedQuantity===1?'y':'ies'}. Adding here creates another owned quantity intentionally.</span></div>:null}
    <div className="vxs-owner-fields">
      <label>Price Paid<input value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></label>
      <label>Purchase Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option>Sealed</option><option>Opened Complete</option><option>Opened Incomplete</option><option>Loose</option><option>Used Excellent</option></select></label>
      <label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)||1))}/></label>
      <label>Collection<select value={collectionId} onChange={e=>setCollectionId(e.target.value)}><option value="">All Items</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
      <label>Purchased From<input value={retailer} onChange={e=>setRetailer(e.target.value)} placeholder="Target"/></label>
      <label>Box<select value={box} onChange={e=>setBox(e.target.value)}><option>Yes</option><option>No</option><option>Unknown</option></select></label>
      <label>Accessories<select value={accessories} onChange={e=>setAccessories(e.target.value)}><option>Complete</option><option>Incomplete</option><option>Unknown</option></select></label>
      <label className="wide">Receipt URL<input value={receipt} onChange={e=>setReceipt(e.target.value)} placeholder="Optional document link"/></label>
      <label className="wide">Notes<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Copy-specific notes"/></label>
    </div>
    <div className="vxs-owned-warning"><LayersIcon/><span>Physical location is assigned in Setup, not duplicated here.{selectedTemplate?' Collection template "'+selectedTemplate.name+'" will apply default ownership fields.':''}</span></div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave(relation,{price:Number(price)||0,date,condition,quantity,collectionId,retailer,box,accessories,receipt,notes})}><Plus/>Add Owned Copy</button></footer>
  </VexumDialog>;
}

function LayersIcon(){return <span style={{fontWeight:800}}>◇</span>}

function WishlistModal({product,relation,record,onClose,onSave}:{product:NormalizedProduct;relation:UserProductRelationship;record?:WishlistRecord;onClose:()=>void;onSave:(r:UserProductRelationship,record:WishlistRecord)=>void}){
  const [priority,setPriority]=useState<WishlistPriority>(record?.priority||(relation.grail?'Grail':'Medium'));
  const [target,setTarget]=useState(record?.targetPrice!==undefined?String(record.targetPrice):relation.targetPrice?String(relation.targetPrice):product.msrp?String(product.msrp):'');
  const [max,setMax]=useState(record?.maximumPrice!==undefined?String(record.maximumPrice):relation.maxPrice?String(relation.maxPrice):'');
  const [condition,setCondition]=useState(record?.desiredCondition||relation.conditionRequirement||'Any');
  const [msrpAlert,setMsrpAlert]=useState(record?.alerts.msrp.enabled??true);
  const [localAlert,setLocalAlert]=useState(record?.alerts.localStock.enabled??false);
  const [marketAlert,setMarketAlert]=useState(record?.alerts.marketplace.enabled??true);
  const [frequency,setFrequency]=useState(record?.alerts.priceTarget.frequency||'Daily Digest');

  const save=()=>{
    const targetPrice=Number(target)||undefined,maxPrice=Number(max)||undefined;
    const base=record||newWishlistRecord({
      productId:product.id,priority,source:'catalog',snapshot:snapshotFromProduct(product),targetPrice,
      maximumPrice:maxPrice,desiredCondition:condition,initialMarket:product.demoMarket?.current
    });
    const alerts={...alertDefaults(priority)};
    alerts.priceTarget={...alerts.priceTarget,enabled:Boolean(targetPrice),frequency:targetPrice?frequency as any:'Off'};
    alerts.msrp={...alerts.msrp,enabled:msrpAlert,frequency:msrpAlert?frequency as any:'Off'};
    alerts.localStock={...alerts.localStock,enabled:localAlert,frequency:localAlert?frequency as any:'Off',radiusMiles:record?.alerts.localStock.radiusMiles||25};
    alerts.marketplace={...alerts.marketplace,enabled:marketAlert,frequency:marketAlert?frequency as any:'Off'};
    const nextRecord=wishlistEvent(base,'updated','Wishlist preferences saved from Search',{
      priority,targetPrice,maximumPrice:maxPrice,desiredCondition:condition,alerts,archived:false,
      snapshot:snapshotFromProduct(product)
    });
    onSave({...relation,wishlisted:true,grail:priority==='Grail',targetPrice,maxPrice,conditionRequirement:condition,tracked:Object.values(alerts).some(rule=>rule.enabled)},nextRecord);
  };

  return <VexumDialog open onClose={onClose} title={product.canonicalName} eyebrow="ADD TO WISHLIST" description="Configure how VEXUM should treat this acquisition. Product identity stays canonical." size="lg" className="vxs-shared-dialog">
    {relation.ownedQuantity>0?<div className="vxs-owned-warning"><Star/><span>You already own {relation.ownedQuantity} cop{relation.ownedQuantity===1?'y':'ies'}. You can still wishlist another intentionally.</span></div>:null}
    <div className="vxs-owner-fields">
      <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as WishlistPriority)}><option>Low</option><option>Medium</option><option>High</option><option>Grail</option></select></label>
      <label>Target Price<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="0.00"/></label>
      <label>Maximum Price<input value={max} onChange={e=>setMax(e.target.value)} placeholder="Optional"/></label>
      <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}>{conditionOptions(product.category).map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Alert Frequency<select value={frequency} onChange={e=>setFrequency(e.target.value as 'Immediate'|'Daily Digest'|'Weekly Digest')}><option>Immediate</option><option>Daily Digest</option><option>Weekly Digest</option></select></label>
    </div>
    <div className="vxs-alert-options"><label><input type="checkbox" checked={msrpAlert} onChange={e=>setMsrpAlert(e.target.checked)}/>At / below MSRP</label><label><input type="checkbox" checked={localAlert} onChange={e=>setLocalAlert(e.target.checked)}/>Local stock</label><label><input type="checkbox" checked={marketAlert} onChange={e=>setMarketAlert(e.target.checked)}/>Marketplace listings</label></div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={save}><Star/>Save Wishlist</button></footer>
  </VexumDialog>;
}
function SearchSkeleton(){
  return <div className="vxs-skeleton">
    <div className="vxs-skeleton-row">{[1,2,3,4].map(i=><i key={i}/>)}</div>
    <div className="vxs-skeleton-grid">{[1,2,3,4,5,6,7,8].map(i=><span key={i}/>)}</div>
  </div>;
}

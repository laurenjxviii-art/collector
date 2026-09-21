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

type IdentifyMethod='camera'|'image'|'barcode'|'receipt'|'url';

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

  const relationFor=(product:NormalizedProduct)=>relationships[product.id]||{
    productId:product.id,ownedQuantity:0,wishlisted:false,tracked:false,grail:false
  };

  const setRelation=(next:UserProductRelationship)=>{
    setRelationships(current=>{
      const value={...current,[next.productId]:next};
      saveRelationships(value);
      return value;
    });
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
      <ProductIntelligence product={selected} relationship={relationships[selected.id]} onBack={closeProduct} onAddPortfolio={setPortfolioModal} onAddWishlist={setWishlistModal} onRelationshipChange={setRelation}/>:
      submittedQuery?<SearchResults query={submittedQuery} products={results} relationships={relationships} onSelect={selectProduct} onAddPortfolio={setPortfolioModal} onAddWishlist={setWishlistModal}/>:
      <SearchDiscovery recentIds={recentIds} relationships={relationships} onSelect={selectProduct} onSearch={value=>void performSearch(value)} onIdentify={()=>setIdentify('camera')}/>
    }

    {identify?<IdentifyItem initialMethod={identify} onClose={()=>setIdentify(null)} onConfirm={product=>{setIdentify(null);selectProduct(product)}}/>:null}
    {portfolioModal?<AddPortfolioModal product={portfolioModal} relation={relationFor(portfolioModal)} onClose={()=>setPortfolioModal(null)} onSave={next=>{setRelation(next);setPortfolioModal(null)}}/>:null}
    {wishlistModal?<WishlistModal product={wishlistModal} relation={relationFor(wishlistModal)} onClose={()=>setWishlistModal(null)} onSave={next=>{setRelation(next);setWishlistModal(null)}}/>:null}
  </div>;
}

function AddPortfolioModal({product,relation,onClose,onSave}:{product:NormalizedProduct;relation:UserProductRelationship;onClose:()=>void;onSave:(r:UserProductRelationship)=>void}){
  const [price,setPrice]=useState(product.msrp?String(product.msrp):'');
  const [date,setDate]=useState('');
  const [condition,setCondition]=useState('Opened Complete');
  const [quantity,setQuantity]=useState(1);
  const [location,setLocation]=useState('');
  return <div className="vxs-modal-backdrop" role="dialog" aria-modal="true"><div className="vxs-quick-modal">
    <header><div><span>ADD TO PORTFOLIO</span><h2>{product.canonicalName}</h2><p>Catalog metadata is already known. Only tell VEXUM about your physical copy.</p></div><button onClick={onClose}><X/></button></header>
    <div className="vxs-known-metadata"><span><b>Manufacturer</b>{product.manufacturer}</span><span><b>Line</b>{product.line||'—'}</span><span><b>Year</b>{product.releaseYear}</span><span><b>UPC</b>{product.upc||'—'}</span><span><b>SKU</b>{product.sku||'—'}</span><span><b>MSRP</b>{money(product.msrp)}</span></div>
    <div className="vxs-owner-fields">
      <label>Price Paid<input value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></label>
      <label>Purchase Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
      <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option>Sealed</option><option>Opened Complete</option><option>Opened Incomplete</option><option>Loose</option><option>Used Excellent</option></select></label>
      <label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label>
      <label className="wide">Storage Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Display Case 2 / Shelf 3"/></label>
    </div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave({...relation,ownedQuantity:quantity,setupLocation:location||relation.setupLocation})}><Plus/>Add to Portfolio</button></footer>
  </div></div>;
}

function WishlistModal({product,relation,onClose,onSave}:{product:NormalizedProduct;relation:UserProductRelationship;onClose:()=>void;onSave:(r:UserProductRelationship)=>void}){
  const [priority,setPriority]=useState(relation.grail?'Grail':'Medium');
  const [target,setTarget]=useState(relation.targetPrice?String(relation.targetPrice):product.msrp?String(product.msrp):'');
  const [max,setMax]=useState(relation.maxPrice?String(relation.maxPrice):'');
  const [condition,setCondition]=useState(relation.conditionRequirement||'Any');
  const [msrpAlert,setMsrpAlert]=useState(true);
  const [localAlert,setLocalAlert]=useState(false);
  const [marketAlert,setMarketAlert]=useState(true);
  return <div className="vxs-modal-backdrop" role="dialog" aria-modal="true"><div className="vxs-quick-modal">
    <header><div><span>ADD TO WISHLIST</span><h2>{product.canonicalName}</h2><p>Set acquisition preferences now; providers can use them later.</p></div><button onClick={onClose}><X/></button></header>
    <div className="vxs-owner-fields">
      <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Grail</option></select></label>
      <label>Target Price<input value={target} onChange={e=>setTarget(e.target.value)} placeholder="0.00"/></label>
      <label>Maximum Price<input value={max} onChange={e=>setMax(e.target.value)} placeholder="Optional"/></label>
      <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option>Any</option><option>Sealed</option><option>Opened Complete</option><option>Loose</option></select></label>
    </div>
    <div className="vxs-alert-options"><label><input type="checkbox" checked={msrpAlert} onChange={e=>setMsrpAlert(e.target.checked)}/>Notify at MSRP</label><label><input type="checkbox" checked={localAlert} onChange={e=>setLocalAlert(e.target.checked)}/>Notify locally</label><label><input type="checkbox" checked={marketAlert} onChange={e=>setMarketAlert(e.target.checked)}/>Marketplace alerts</label></div>
    <footer><button onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave({...relation,wishlisted:true,grail:priority==='Grail',targetPrice:Number(target)||undefined,maxPrice:Number(max)||undefined,conditionRequirement:condition,tracked:relation.tracked||msrpAlert||localAlert||marketAlert})}><Star/>Save Wishlist</button></footer>
  </div></div>;
}

function SearchSkeleton(){
  return <div className="vxs-skeleton">
    <div className="vxs-skeleton-row">{[1,2,3,4].map(i=><i key={i}/>)}</div>
    <div className="vxs-skeleton-grid">{[1,2,3,4,5,6,7,8].map(i=><span key={i}/>)}</div>
  </div>;
}

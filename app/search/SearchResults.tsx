'use client';

import {Layers3,Search,SlidersHorizontal,Star} from 'lucide-react';
import type {NormalizedProduct,UserProductRelationship} from '../../lib/search/types';

type Props={
  query:string;
  products:NormalizedProduct[];
  relationships:Record<string,UserProductRelationship>;
  onSelect:(product:NormalizedProduct)=>void;
  onAddPortfolio:(product:NormalizedProduct)=>void;
  onAddWishlist:(product:NormalizedProduct)=>void;
};

type SortMode='relevance'|'market-high'|'market-low'|'msrp'|'release-new';

const CATEGORIES=['All','Action Figures','Trading Cards','Comics','Sneakers','Games','Technology','Collectible Figures','Other'];

export default function SearchResults({query,products,relationships,onSelect,onAddPortfolio,onAddWishlist}:Props){
  const [category,setCategory]=useStateSafe('All');
  const [sort,setSort]=useStateSafe<SortMode>('relevance');
  const [filtersOpen,setFiltersOpen]=useStateSafe(false);
  const [owned,setOwned]=useStateSafe<'all'|'owned'|'not-owned'>('all');
  const [wishlist,setWishlist]=useStateSafe<'all'|'wishlisted'|'not-wishlisted'>('all');

  let visible=products.filter(product=>{
    if(category!=='All'&&product.category!==category)return false;
    const rel=relationships[product.id];
    if(owned==='owned'&&!rel?.ownedQuantity)return false;
    if(owned==='not-owned'&&rel?.ownedQuantity)return false;
    if(wishlist==='wishlisted'&&!rel?.wishlisted)return false;
    if(wishlist==='not-wishlisted'&&rel?.wishlisted)return false;
    return true;
  });
  visible=[...visible].sort((a,b)=>{
    if(sort==='market-high')return (b.demoMarket?.current||-1)-(a.demoMarket?.current||-1);
    if(sort==='market-low')return (a.demoMarket?.current||Number.MAX_SAFE_INTEGER)-(b.demoMarket?.current||Number.MAX_SAFE_INTEGER);
    if(sort==='msrp')return (a.msrp||Number.MAX_SAFE_INTEGER)-(b.msrp||Number.MAX_SAFE_INTEGER);
    if(sort==='release-new')return Number(b.releaseYear||0)-Number(a.releaseYear||0);
    return 0;
  });

  return <div className="vxs-results">
    <div className="vxs-results-top">
      <div><h1>Search</h1><p>{visible.length} demo catalog result{visible.length===1?'':'s'} for “{query}”</p></div>
      <div><button onClick={()=>setFiltersOpen(v=>!v)} className={filtersOpen?'active':''}><SlidersHorizontal/>Filters</button><select value={sort} onChange={e=>setSort(e.target.value as SortMode)} aria-label="Sort search results"><option value="relevance">Relevance</option><option value="market-high">Market value: high to low</option><option value="market-low">Market value: low to high</option><option value="msrp">MSRP: low to high</option><option value="release-new">Release date: newest</option></select></div>
    </div>

    <div className="vxs-category-tabs">{CATEGORIES.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>

    {filtersOpen?<div className="vxs-filter-drawer">
      <div><span>Ownership</span><select value={owned} onChange={e=>setOwned(e.target.value as typeof owned)}><option value="all">All</option><option value="owned">Owned</option><option value="not-owned">Not owned</option></select></div>
      <div><span>Wishlist</span><select value={wishlist} onChange={e=>setWishlist(e.target.value as typeof wishlist)}><option value="all">All</option><option value="wishlisted">Wishlisted</option><option value="not-wishlisted">Not wishlisted</option></select></div>
      <div className="vxs-filter-placeholder"><span>More filters</span><p>Manufacturer, line, franchise, character, release year, condition, price range, availability, and retailer are structured for later catalog-backed filtering.</p></div>
    </div>:null}

    {!visible.length?<div className="vxs-no-results"><Search/><h3>No exact product match found.</h3><p>Try a broader name, UPC, SKU, model number, brand, line, or character.</p><button>Identify Item Instead</button></div>:<div className="vxs-result-grid">
      {visible.map(product=>{
        const rel=relationships[product.id];
        return <article className="vxs-result-card" key={product.id}>
          <button className="vxs-result-main" onClick={()=>onSelect(product)}>
            <div className="vxs-result-art"><Layers3/>{product.demo?<span>DEMO</span>:null}</div>
            <div className="vxs-result-copy">
              <div className="vxs-result-badges">{rel?.ownedQuantity?<em>OWNED ×{rel.ownedQuantity}</em>:null}{rel?.wishlisted?<em>WISHLIST</em>:null}{rel?.tracked?<em>TRACKING</em>:null}</div>
              <h3>{product.canonicalName}</h3>
              <p>{product.manufacturer} · {product.line||product.category} · {product.releaseYear}</p>
              <small>{product.category}{product.upc?' · UPC '+product.upc:''}</small>
            </div>
            <div className="vxs-result-price">
              <span>Demo market</span>
              <strong>{product.demoMarket?'$'+product.demoMarket.current.toFixed(2):'—'}</strong>
              <small>MSRP {product.msrp?'$'+product.msrp.toFixed(2):'—'}</small>
            </div>
          </button>
          <footer>
            {rel?.ownedQuantity?<button onClick={()=>onSelect(product)}>View in Portfolio</button>:<button onClick={()=>onAddPortfolio(product)}>+ Portfolio</button>}
            {rel?.wishlisted?<button className="active"><Star/>Wishlisted</button>:<button onClick={()=>onAddWishlist(product)}><Star/>Wishlist</button>}
            <button onClick={()=>onSelect(product)}>Research →</button>
          </footer>
        </article>;
      })}
    </div>}
    <div className="vxs-demo-note"><span>DEMO CATALOG</span><p>These results use isolated example product records so the Search experience can be designed before the live catalog is populated. They are not presented as live inventory.</p></div>
  </div>;
}

function useStateSafe<T>(initial:T){
  const React=require('react') as typeof import('react');
  return React.useState<T>(initial);
}

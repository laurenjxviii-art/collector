'use client';

import {useMemo,useState} from 'react';
import {Layers3,Search,SlidersHorizontal,Star} from 'lucide-react';
import type {NormalizedProduct,UserProductRelationship} from '../../lib/search/types';

type Props={
  query:string;
  products:NormalizedProduct[];
  relationships:Record<string,UserProductRelationship>;
  onSelect:(product:NormalizedProduct)=>void;
  onAddPortfolio:(product:NormalizedProduct)=>void;
  onAddWishlist:(product:NormalizedProduct)=>void;
  onIdentify:()=>void;
};

type SortMode='relevance'|'market-high'|'market-low'|'msrp'|'release-new'|'trend-up'|'trend-down';
type OwnershipMode='all'|'owned'|'not-owned';
type WishlistMode='all'|'wishlisted'|'not-wishlisted';
type ViewMode='grid'|'list';

const unique=(values:string[])=>Array.from(new Set(values.filter(Boolean))).sort((a,b)=>a.localeCompare(b));

export default function SearchResults({query,products,relationships,onSelect,onAddPortfolio,onAddWishlist,onIdentify}:Props){
  const [category,setCategory]=useState('All');
  const [sort,setSort]=useState<SortMode>('relevance');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [owned,setOwned]=useState<OwnershipMode>('all');
  const [wishlist,setWishlist]=useState<WishlistMode>('all');
  const [manufacturer,setManufacturer]=useState('All');
  const [line,setLine]=useState('All');
  const [franchise,setFranchise]=useState('All');
  const [character,setCharacter]=useState('All');
  const [year,setYear]=useState('All');
  const [status,setStatus]=useState('All');
  const [minPrice,setMinPrice]=useState('');
  const [maxPrice,setMaxPrice]=useState('');
  const [view,setView]=useState<ViewMode>('grid');

  const categories=useMemo(()=>['All',...unique(products.map(product=>product.category))],[products]);
  const manufacturers=useMemo(()=>['All',...unique(products.map(product=>product.manufacturer))],[products]);
  const lines=useMemo(()=>['All',...unique(products.map(product=>product.line))],[products]);
  const franchises=useMemo(()=>['All',...unique(products.map(product=>product.franchise))],[products]);
  const characters=useMemo(()=>['All',...unique(products.map(product=>product.character))],[products]);
  const years=useMemo(()=>['All',...unique(products.map(product=>product.releaseYear)).sort((a,b)=>Number(b)-Number(a))],[products]);
  const statuses=useMemo(()=>['All',...unique(products.map(product=>product.releaseStatus))],[products]);

  let visible=products.filter(product=>{
    if(category!=='All'&&product.category!==category)return false;
    if(manufacturer!=='All'&&product.manufacturer!==manufacturer)return false;
    if(line!=='All'&&product.line!==line)return false;
    if(franchise!=='All'&&product.franchise!==franchise)return false;
    if(character!=='All'&&product.character!==character)return false;
    if(year!=='All'&&product.releaseYear!==year)return false;
    if(status!=='All'&&product.releaseStatus!==status)return false;

    const market=product.demoMarket?.current;
    if(minPrice&&typeof market==='number'&&market<Number(minPrice))return false;
    if(maxPrice&&typeof market==='number'&&market>Number(maxPrice))return false;

    const rel=relationships[product.id];
    if(owned==='owned'&&!rel?.ownedQuantity)return false;
    if(owned==='not-owned'&&rel?.ownedQuantity)return false;
    if(wishlist==='wishlisted'&&!rel?.wishlisted)return false;
    if(wishlist==='not-wishlisted'&&rel?.wishlisted)return false;
    return true;
  });

  visible=[...visible].sort((a,b)=>{
    if(sort==='market-high')return (b.demoMarket?.current??-1)-(a.demoMarket?.current??-1);
    if(sort==='market-low')return (a.demoMarket?.current??Number.MAX_SAFE_INTEGER)-(b.demoMarket?.current??Number.MAX_SAFE_INTEGER);
    if(sort==='msrp')return (a.msrp??Number.MAX_SAFE_INTEGER)-(b.msrp??Number.MAX_SAFE_INTEGER);
    if(sort==='release-new')return Number(b.releaseYear||0)-Number(a.releaseYear||0);
    if(sort==='trend-up')return (b.demoMarket?.trend30d??-999)-(a.demoMarket?.trend30d??-999);
    if(sort==='trend-down')return (a.demoMarket?.trend30d??999)-(b.demoMarket?.trend30d??999);
    return 0;
  });

  const clearFilters=()=>{
    setCategory('All');
    setOwned('all');
    setWishlist('all');
    setManufacturer('All');
    setLine('All');
    setFranchise('All');
    setCharacter('All');
    setYear('All');
    setStatus('All');
    setMinPrice('');
    setMaxPrice('');
  };

  const filterCount=[
    category!=='All',owned!=='all',wishlist!=='all',manufacturer!=='All',line!=='All',
    franchise!=='All',character!=='All',year!=='All',status!=='All',Boolean(minPrice),Boolean(maxPrice)
  ].filter(Boolean).length;

  return <div className="vxs-results">
    <div className="vxs-results-top">
      <div>
        <h1>Search</h1>
        <p>{visible.length} demo catalog result{visible.length===1?'':'s'} for “{query}”</p>
      </div>
      <div className="vxs-results-controls">
        <button onClick={()=>setFiltersOpen(v=>!v)} className={filtersOpen?'active':''}><SlidersHorizontal/>Filters{filterCount?<em>{filterCount}</em>:null}</button>
        <select value={sort} onChange={e=>setSort(e.target.value as SortMode)} aria-label="Sort search results">
          <option value="relevance">Relevance</option>
          <option value="market-high">Market value: high to low</option>
          <option value="market-low">Market value: low to high</option>
          <option value="msrp">MSRP: low to high</option>
          <option value="release-new">Release date: newest</option>
          <option value="trend-up">Price increase: largest</option>
          <option value="trend-down">Price decrease: largest</option>
          <option disabled>Popularity — provider pending</option>
          <option disabled>Recently added — catalog timestamp pending</option>
        </select>
        <div className="vxs-view-toggle" aria-label="Result view">
          <button className={view==='grid'?'active':''} onClick={()=>setView('grid')} title="Grid view"><Layers3/></button>
          <button className={view==='list'?'active':''} onClick={()=>setView('list')} title="List view">≡</button>
        </div>
      </div>
    </div>

    <div className="vxs-category-tabs">
      {categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}
    </div>

    {filtersOpen?<div className="vxs-filter-drawer vxs-filter-drawer-expanded">
      <div><span>Ownership</span><select value={owned} onChange={e=>setOwned(e.target.value as OwnershipMode)}><option value="all">All</option><option value="owned">Owned</option><option value="not-owned">Not owned</option></select></div>
      <div><span>Wishlist</span><select value={wishlist} onChange={e=>setWishlist(e.target.value as WishlistMode)}><option value="all">All</option><option value="wishlisted">Wishlisted</option><option value="not-wishlisted">Not wishlisted</option></select></div>
      <div><span>Manufacturer</span><select value={manufacturer} onChange={e=>setManufacturer(e.target.value)}>{manufacturers.map(item=><option key={item}>{item}</option>)}</select></div>
      <div><span>Product line</span><select value={line} onChange={e=>setLine(e.target.value)}>{lines.map(item=><option key={item}>{item}</option>)}</select></div>
      <div><span>Franchise</span><select value={franchise} onChange={e=>setFranchise(e.target.value)}>{franchises.map(item=><option key={item}>{item}</option>)}</select></div>
      <div><span>Character</span><select value={character} onChange={e=>setCharacter(e.target.value)}>{characters.map(item=><option key={item}>{item}</option>)}</select></div>
      <div><span>Release year</span><select value={year} onChange={e=>setYear(e.target.value)}>{years.map(item=><option key={item}>{item}</option>)}</select></div>
      <div><span>Release status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(item=><option key={item}>{item}</option>)}</select></div>
      <div className="vxs-filter-price"><span>Demo market range</span><label><input inputMode="decimal" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="Min"/><i>—</i><input inputMode="decimal" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Max"/></label></div>
      <div className="vxs-filter-disabled"><span>Availability / retailer</span><p>Live inventory provider required.</p></div>
      <div className="vxs-filter-disabled"><span>Condition</span><p>User-item/provider condition data will plug in here.</p></div>
      <div className="vxs-filter-actions"><button onClick={clearFilters}>Clear filters</button><span>{visible.length} matching result{visible.length===1?'':'s'}</span></div>
    </div>:null}

    {!visible.length?<div className="vxs-no-results"><Search/><h3>No exact product match found.</h3><p>Try a broader name, UPC, SKU, model number, brand, line, or character.</p><button onClick={onIdentify}>Identify Item Instead</button></div>:<div className={'vxs-result-grid '+(view==='list'?'is-list':'')}>
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
              {product.demoMarket?<em className={product.demoMarket.trend30d>=0?'tone-green':'tone-red'}>{product.demoMarket.trend30d>=0?'+':''}{product.demoMarket.trend30d.toFixed(1)}% / 30D</em>:null}
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

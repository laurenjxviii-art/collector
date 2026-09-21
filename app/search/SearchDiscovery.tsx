'use client';

import {Bell,Eye,Layers3,MapPin,Search,Star,TrendingDown} from 'lucide-react';
import {DEMO_PRODUCTS} from '../../lib/search/demo';
import type {NormalizedProduct,UserProductRelationship} from '../../lib/search/types';

type Props={
  recentIds:string[];
  relationships:Record<string,UserProductRelationship>;
  onSelect:(product:NormalizedProduct)=>void;
  onSearch:(query:string)=>void;
  onIdentify:()=>void;
};

const find=(id:string)=>DEMO_PRODUCTS.find(p=>p.id===id);

function ProductMini({product,onSelect,relationship}:{product:NormalizedProduct;onSelect:(p:NormalizedProduct)=>void;relationship?:UserProductRelationship}){
  return <button className="vxs-mini-product" onClick={()=>onSelect(product)}>
    <div className="vxs-mini-art"><Layers3/></div>
    <div><strong>{product.canonicalName}</strong><span>{product.manufacturer} · {product.line||product.category}</span></div>
    <aside>{relationship?.ownedQuantity?<em>OWNED</em>:relationship?.wishlisted?<em>WISHLIST</em>:null}<b>›</b></aside>
  </button>;
}

export default function SearchDiscovery({recentIds,relationships,onSelect,onSearch,onIdentify}:Props){
  const recent=recentIds.map(find).filter(Boolean) as NormalizedProduct[];
  const recommended=DEMO_PRODUCTS.filter(p=>['ml-friendly-neighborhood','ml-amazing-spiderman','pokemon-151-etb'].includes(p.id));
  const releases=DEMO_PRODUCTS.filter(p=>p.releaseDate).slice(0,3);
  return <div className="vxs-discovery">
    <div className="vxs-discovery-banner">
      <div><span>VEXUM SEARCH</span><h1>Discover anything.</h1><p>Search, identify, research, track, wishlist, and eventually acquire almost anything collectible.</p></div>
      <button onClick={onIdentify}><Eye/>Identify Item</button>
    </div>

    <div className="vxs-discovery-grid">
      <section className="vx-panel vxs-discovery-panel wide">
        <div className="vxs-panel-head"><div><h3>Recently Viewed</h3><p>Continue where you left off.</p></div><button>Clear history</button></div>
        <div className="vxs-mini-list">{(recent.length?recent:DEMO_PRODUCTS.slice(0,3)).map(product=><ProductMini key={product.id} product={product} onSelect={onSelect} relationship={relationships[product.id]}/>)}</div>
      </section>

      <section className="vx-panel vxs-discovery-panel">
        <div className="vxs-panel-head"><div><h3>VEXUM Radar</h3><p>Relevant things worth your attention.</p></div><Bell/></div>
        <div className="vxs-radar-list">
          <button onClick={()=>onSearch('Spider-Man Marvel Legends')}><i className="green"/><span><strong>Collection gap</strong><small>3 Spider-Man products in the demo catalog match your interests.</small></span><b>›</b></button>
          <button onClick={()=>onSearch('Pokémon 151')}><i className="red"/><span><strong>Wishlist movement</strong><small>One tracked demo item is below its example target.</small></span><b>›</b></button>
          <button><i className="orange"/><span><strong>Live stock not connected</strong><small>Connect inventory providers before Radar can report real restocks.</small></span><b>›</b></button>
        </div>
      </section>

      <section className="vx-panel vxs-discovery-panel">
        <div className="vxs-panel-head"><div><h3>Trending In Your Interests</h3><p>Demo recommendations based on collection themes.</p></div><Star/></div>
        <div className="vxs-mini-list compact">{recommended.map(product=><ProductMini key={product.id} product={product} onSelect={onSelect} relationship={relationships[product.id]}/>)}</div>
      </section>

      <section className="vx-panel vxs-discovery-panel">
        <div className="vxs-panel-head"><div><h3>Upcoming & Release Watch</h3><p>Catalog dates, not live retailer inventory.</p></div><Eye/></div>
        <div className="vxs-release-list">{releases.map(product=><button key={product.id} onClick={()=>onSelect(product)}><time>{product.releaseDate||'TBD'}</time><span><strong>{product.canonicalName}</strong><small>{product.releaseStatus}</small></span><b>›</b></button>)}</div>
      </section>

      <section className="vx-panel vxs-discovery-panel">
        <div className="vxs-panel-head"><div><h3>Recently Restocked</h3><p>Live retail source required.</p></div><TrendingDown/></div>
        <div className="vxs-source-empty"><span>Source not connected</span><p>VEXUM will show real restocks here once a participating inventory provider is attached.</p></div>
      </section>

      <section className="vx-panel vxs-discovery-panel">
        <div className="vxs-panel-head"><div><h3>Local Stock Highlights</h3><p>Location is optional.</p></div><MapPin/></div>
        <div className="vxs-source-empty"><button><MapPin/>Set location</button><p>No location is required for normal Search. Local inventory appears only after the user opts in.</p></div>
      </section>
    </div>
    <div className="vxs-demo-note"><span>DEMO CATALOG</span><p>Product cards and example values on this screen are isolated demo data. Live market, retailer, marketplace, and local inventory providers are not presented as real until connected.</p></div>
  </div>;
}

'use client';

import {useMemo,useState} from 'react';
import {VexumLineChart} from '../VexumLineChart';
import {VexumMetricTrend} from '../VexumMetricTrend';
import {variantKey} from '../../lib/market';
import {ArrowLeft,FileText,Heart,Image as ImageIcon,Layers3,MoreHorizontal,Plus,Share2,ShoppingBag,Star} from 'lucide-react';
import type {Collection,Item,Store} from '../../lib/model';
import {newPortfolioId} from '../../lib/portfolio';
import {collectionPath,itemLocation,portfolioMoney} from './portfolioUtils';

type Tab='overview'|'market'|'history'|'ownership'|'media'|'documents';

function linePath(item:Item,collections:Collection[]){
  const path=collectionPath(item.collectionId,collections).map(collection=>collection.name);
  return path.length?path.join(' → '):'All Items';
}

function MarketChart({item}:{item:Item}){
  const points=(item.priceHistory||[]).filter(point=>point.kind!=='sale'&&point.variant===variantKey(item)&&Number.isFinite(point.value)&&Number.isFinite(Date.parse(point.date))).toSorted((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  if(points.length<2)return <div className="vxp2-empty compact">Market history unavailable. Ownership data remains available.</div>;
  return <VexumLineChart values={points.map(point=>point.value)} dates={points.map(point=>point.date)} label={item.name+' · unit value'} references={[{label:'Price paid per unit',value:item.purchasePrice,tone:'comparison'}]}/>;
}

export default function PortfolioItemDetail({store,item,onBack,onChange,onSell}:{store:Store;item:Item;onBack:()=>void;onChange:(item:Item)=>void;onSell:(item:Item)=>void}){
  const [tab,setTab]=useState<Tab>('overview');
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<Item>(item);

  const setupLabel=itemLocation(store,item);
  const path=linePath(item,store.collections);
  const profit=item.currentValue*item.quantity-item.purchasePrice*item.quantity;
  const sourceMarket=(item.priceHistory||[]).filter(point=>point.kind==='provider').length;
  const comparableCount=(item.comparables||[]).length;

  const history=useMemo(()=>{
    const synthetic=[
      {id:'created',at:item.createdAt,type:'added' as const,label:'Added to VEXUM',detail:item.condition},
      ...(item.purchaseDate?[{id:'purchase',at:item.purchaseDate,type:'purchased' as const,label:'Purchased',detail:portfolioMoney(item.purchasePrice)}]:[])
    ];
    return [...(item.historyEvents||[]),...synthetic].filter(event=>Number.isFinite(Date.parse(event.at))).toSorted((a,b)=>b.at.localeCompare(a.at));
  },[item]);

  const save=()=>{
    const now=new Date().toISOString();
    const changed={...draft,updatedAt:now,historyEvents:[...(item.historyEvents||[]),{id:newPortfolioId('history'),at:now,type:'note' as const,label:'Item record updated'}]};
    onChange(changed);setEditing(false);
  };
  const addField=()=>{
    const label=window.prompt('Custom field name');if(!label)return;
    const value=window.prompt('Value')||'';
    const next={...item,customFields:{...item.customFields,[label]:value},updatedAt:new Date().toISOString()};
    onChange(next);setDraft(next);
  };
  const addMedia=()=>{
    const url=window.prompt('Owned-copy image URL');if(!url)return;
    const label=window.prompt('Image label','Owned copy')||'Owned copy';
    onChange({...item,media:[...(item.media||[]),{id:newPortfolioId('media'),kind:'owned',url,label,createdAt:new Date().toISOString()}],updatedAt:new Date().toISOString()});
  };
  const addDocument=()=>{
    const url=window.prompt('Document URL');if(!url)return;
    const name=window.prompt('Document name','Receipt')||'Document';
    onChange({...item,documents:[...(item.documents||[]),{id:newPortfolioId('doc'),kind:name.toLowerCase().includes('receipt')?'Receipt':'Other',name,url,createdAt:new Date().toISOString()}],updatedAt:new Date().toISOString()});
  };

  return <div className="vxp2-detail">
    <div className="vxp2-detail-top"><button onClick={onBack}><ArrowLeft/>Portfolio</button><span>{path}</span><div><button onClick={()=>navigator.clipboard?.writeText(location.href)}><Share2/>Share</button><button onClick={()=>onChange({...item,favorite:!item.favorite,updatedAt:new Date().toISOString()})}>{item.favorite?<Star fill="currentColor"/>:<Star/>}{item.favorite?'Favorited':'Favorite'}</button><button className="red" onClick={()=>onSell(item)}><ShoppingBag/>Sell</button></div></div>
    <section className="vxp2-detail-hero vx-panel">
      <div className="vxp2-detail-art" style={item.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item.image?'':<Layers3/>}</div>
      <div className="vxp2-detail-title"><span>{item.category||'Uncategorized'}</span><h1>{item.name}</h1><p>{path}</p><div><em>{item.condition||'Condition missing'}</em><em>{item.status}</em><em>×{item.quantity}</em>{item.favorite?<em>Favorite</em>:null}</div></div>
      <aside><span>Current Value</span><strong>{portfolioMoney(item.currentValue*item.quantity)}</strong><small>Price paid {portfolioMoney(item.purchasePrice*item.quantity)}</small><b className={profit>=0?'tone-green':'tone-red'}>{profit>=0?'+':''}{portfolioMoney(profit)} P/L</b><VexumMetricTrend values={[item.purchasePrice*item.quantity,item.currentValue*item.quantity]} label="Cost → current value" negative={profit<0}/></aside>
    </section>
    <nav className="vxp2-detail-tabs">{(['overview','market','history','ownership','media','documents'] as Tab[]).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name[0].toUpperCase()+name.slice(1)}</button>)}</nav>

    {tab==='overview'?<div className="vxp2-detail-grid">
      <section className="vx-panel vxp2-detail-section"><header><div><h3>Owned Copy</h3><p>User-specific information for this physical copy.</p></div><div><button onClick={addField}><Plus/>Field</button><button className={editing?'active':''} onClick={()=>editing?save():setEditing(true)}>{editing?'Save':'Edit'}</button></div></header>
        <div className="vxp2-fields">
          <DetailField label="Price Paid" value={editing?<input type="number" value={draft.purchasePrice} onChange={e=>setDraft({...draft,purchasePrice:Number(e.target.value)||0})}/>:portfolioMoney(item.purchasePrice)}/>
          <DetailField label="Purchase Date" value={editing?<input type="date" value={draft.purchaseDate.slice(0,10)} onChange={e=>setDraft({...draft,purchaseDate:e.target.value})}/>:item.purchaseDate?new Date(item.purchaseDate).toLocaleDateString():'Missing'}/>
          <DetailField label="Condition" value={editing?<input value={draft.condition} onChange={e=>setDraft({...draft,condition:e.target.value})}/>:item.condition||'Missing'}/>
          <DetailField label="Quantity" value={editing?<input type="number" min="1" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:Math.max(1,Number(e.target.value)||1)})}/>:String(item.quantity)}/>
          <DetailField label="Setup Location" value={setupLabel}/>
          <DetailField label="Notes" value={editing?<input value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/>:item.notes||'—'}/>
          {Object.entries(item.customFields||{}).map(([label,value])=><DetailField key={label} label={label} value={editing?<input value={draft.customFields[label]??value} onChange={e=>setDraft({...draft,customFields:{...draft.customFields,[label]:e.target.value}})}/>:value||'—'}/>)}
        </div>
      </section>
      <aside className="vxp2-side-stack">
        <section className="vx-panel"><header><h3>Canonical Product</h3></header><div className="vxp2-side-rows">
          <Side label="Manufacturer" value={item.identity?.brand||item.customFields?.Manufacturer||'Unknown'}/>
          <Side label="Line / Series" value={item.identity?.series||item.customFields?.Line||'Unknown'}/>
          <Side label="Year" value={item.identity?.year||item.customFields?.Year||'Unknown'}/>
          <Side label="UPC" value={item.identity?.upc||'Unknown'}/>
          <Side label="SKU" value={item.identity?.sku||'Unknown'}/>
          <Side label="Model" value={item.identity?.modelNumber||'Unknown'}/>
        </div><footer><button onClick={()=>location.assign('/search?q='+encodeURIComponent(item.name))}><SearchIcon/>Open Search Intelligence</button></footer></section>
        <section className="vx-panel"><header><h3>Ownership State</h3></header><div className="vxp2-side-rows"><Side label="Status" value={item.status}/><Side label="Collection" value={path}/><Side label="Setup" value={setupLabel}/><Side label="Market Source" value={item.marketLink?.provider||'No provider linked'}/></div></section>
      </aside>
    </div>:null}

    {tab==='market'?<div className="vxp2-market-grid"><section className="vx-panel"><header><div><h3>Market</h3><p>Portfolio reuses this owned copy's existing market history. It does not invent a second valuation.</p></div></header><MarketChart item={item}/><div className="vxp2-market-metrics"><div><span>Current</span><strong>{portfolioMoney(item.currentValue)}</strong></div><div><span>Paid</span><strong>{portfolioMoney(item.purchasePrice)}</strong></div><div><span>P/L</span><strong className={profit>=0?'tone-green':'tone-red'}>{profit>=0?'+':''}{portfolioMoney(profit)}</strong></div><div><span>Provider points</span><strong>{sourceMarket}</strong></div></div></section><section className="vx-panel"><header><h3>Recent Sold / Comparables</h3></header><div className="vxp2-comps">{(item.comparables||[]).toSorted((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(comp=><a href={comp.url} target="_blank" rel="noreferrer" key={comp.id}><span><strong>{comp.title}</strong><small>{comp.source} · {comp.date}</small></span><b>{portfolioMoney(comp.price+comp.shipping)}</b></a>)}{!comparableCount?<div className="vxp2-empty compact">No provider-backed sold comparables are stored for this copy.</div>:null}</div></section></div>:null}

    {tab==='history'?<section className="vx-panel vxp2-history"><header><div><h3>Item Timeline</h3><p>Ownership and provenance events for this exact copy.</p></div></header>{history.map(event=><div key={event.id}><time>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(event.at))}</time><i/><span><strong>{event.label}</strong><small>{event.detail||event.type}</small></span></div>)}</section>:null}

    {tab==='ownership'?<div className="vxp2-market-grid"><section className="vx-panel"><header><h3>Acquisition</h3></header><div className="vxp2-side-rows"><Side label="Purchased From" value={item.customFields?.['Purchased From']||item.customFields?.Retailer||'Unknown'}/><Side label="Purchase Date" value={item.purchaseDate||'Unknown'}/><Side label="Cost Basis" value={portfolioMoney(item.purchasePrice*item.quantity)}/><Side label="Quantity" value={String(item.quantity)}/><Side label="Receipt" value={item.documents?.some(doc=>doc.kind==='Receipt')?'Attached':'Not attached'}/></div></section><section className="vx-panel"><header><h3>Current Ownership</h3></header><div className="vxp2-side-rows"><Side label="State" value={item.status}/><Side label="Condition" value={item.condition||'Missing'}/><Side label="Setup Location" value={setupLabel}/><Side label="Collection" value={path}/><Side label="Favorite" value={item.favorite?'Yes':'No'}/></div></section></div>:null}

    {tab==='media'?<section className="vx-panel vxp2-detail-section"><header><div><h3>Media</h3><p>Catalog imagery and photos of your actual copy remain distinct.</p></div><button onClick={addMedia}><Plus/>Add Owned Photo</button></header><div className="vxp2-media-grid">{item.image?<article><div style={{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}}/><strong>Catalog / primary image</strong><span>Product imagery</span></article>:null}{(item.media||[]).map(media=><article key={media.id}><div style={{backgroundImage:'url("'+media.url.replaceAll('"','')+'")'}}/><strong>{media.label}</strong><span>{media.kind} photo</span></article>)}{!item.image&&!(item.media||[]).length?<div className="vxp2-empty"><ImageIcon/>No media attached.</div>:null}</div></section>:null}

    {tab==='documents'?<section className="vx-panel vxp2-detail-section"><header><div><h3>Documents</h3><p>Receipts, authentication, warranty, appraisals, grading, repair, and insurance files.</p></div><button onClick={addDocument}><Plus/>Add Document</button></header><div className="vxp2-doc-list">{(item.documents||[]).map(document=><a href={document.url} target="_blank" rel="noreferrer" key={document.id}><FileText/><span><strong>{document.name}</strong><small>{document.kind} · {new Date(document.createdAt).toLocaleDateString()}</small></span><MoreHorizontal/></a>)}{!(item.documents||[]).length?<div className="vxp2-empty compact">No documents attached.</div>:null}</div></section>:null}
  </div>;
}

function DetailField({label,value}:{label:string;value:React.ReactNode}){return <div><span>{label}</span><strong>{value}</strong></div>}
function Side({label,value}:{label:string;value:string}){return <div><span>{label}</span><b>{value}</b></div>}
function SearchIcon(){return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>}

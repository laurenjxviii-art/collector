'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,Check,ExternalLink,Heart,Minus,Pencil,Plus,RefreshCw,Trash2} from 'lucide-react';
import {Collection,Item,money} from '../lib/model';
import {PricePoint,marketQuery,variantKey,variantLabel} from '../lib/market';

type Quote={name:string;series:string;value:number;tier:string;source:string;url:string;warning?:string;searchQuery?:string};

function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}

export default function ItemDetail({item,collection,close,edit,remove,save}:{item:Item;collection?:Collection;close:()=>void;edit:()=>void;remove:()=>void;save:(item:Item)=>void}){
  const [busy,setBusy]=useState(false),[quote,setQuote]=useState<Quote|null>(null),[message,setMessage]=useState('');
  const [range,setRange]=useState('1Y');
  const isWatch=watched(item);
  const gain=item.currentValue-item.purchasePrice;
  const key=variantKey(item);
  const points=(item.priceHistory||[]).filter(p=>p.variant===key&&p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  const visible=filterRange(points,range);
  const query=item.marketLink?.query||marketQuery(item);
  const ebay='https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:query,LH_Sold:'1',LH_Complete:'1'});

  function updateQuantity(delta:number){save({...item,status:'owned',quantity:Math.max(1,item.quantity+delta),updatedAt:new Date().toISOString()})}
  function toggleWatch(){
    const customFields={...(item.customFields||{})};
    if(isWatch&&item.status!=='wishlist')delete customFields.__watchlist; else customFields.__watchlist='true';
    save({...item,customFields,status:item.status==='wishlist'?'owned':item.status,updatedAt:new Date().toISOString()});
  }
  async function marketLookup(){
    setBusy(true);setMessage('');setQuote(null);
    try{
      const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});
      const result=await r.json();
      if(!r.ok){setMessage(result.error||'Market lookup unavailable.');return}
      setQuote(result);
    }catch{setMessage('Market lookup unavailable. Your saved price was not changed.')}finally{setBusy(false)}
  }
  function applyQuote(){
    if(!quote)return;
    const date=new Date().toISOString();
    save({...item,currentValue:quote.value,updatedAt:date,marketLink:{provider:quote.source,query:quote.searchQuery||query,linkedAt:item.marketLink?.linkedAt||date,lastRefresh:date},priceHistory:[...(item.priceHistory||[]),{date,value:quote.value,variant:key,source:quote.source,url:quote.url,kind:'provider'}]});
    setMessage('Market value updated.');setQuote(null);
  }

  const detailRows=Object.entries({
    'Brand':item.identity?.brand,
    'Line / Series':item.identity?.series,
    'Model / Number':item.identity?.modelNumber||item.identity?.collectorNumber,
    'UPC / Barcode':item.identity?.upc,
    'SKU':item.identity?.sku,
    'Edition / Variant':item.identity?.edition,
    'Year':item.identity?.year,
    'Condition':item.condition,
    'Packaging':item.packagingState,
    ...item.customFields
  }).filter(([k,v])=>v&&k!=='__watchlist');

  return <main className="ci-page">
    <div className="ci-breadcrumb"><button onClick={close}><ArrowLeft size={15}/> Back</button><span>/</span><span>{collection?.name||'Collection'}</span><span>/</span><b>{item.name}</b></div>
    <div className="ci-title-row"><div><h1>{item.name}</h1><p>{item.identity?.series||collection?.name||item.category} {item.identity?.modelNumber||item.identity?.collectorNumber?`• #${item.identity?.modelNumber||item.identity?.collectorNumber}`:''}</p><button className={'ci-watch'+(isWatch?' active':'')} onClick={toggleWatch}><Heart size={15} fill={isWatch?'currentColor':'none'}/>{isWatch?'Watching':'Add to Watchlist'}</button></div><div className="ci-price"><strong>{money(item.currentValue)}</strong><span className={gain>=0?'up':'down'}>{gain>=0?'+':''}{money(gain)} vs paid</span><small>Per item</small></div></div>

    <div className="ci-layout">
      <section className="ci-media"><div className="ci-image-stage"><img src={item.image||'/art/empty.svg'} alt={item.name}/></div></section>

      <section className="ci-center">
        <article className="ci-panel ci-history"><div className="ci-panel-head"><h2>Price History</h2><div className="ci-ranges">{['1M','3M','6M','1Y','MAX'].map(r=><button key={r} className={range===r?'active':''} onClick={()=>setRange(r)}>{r}</button>)}</div></div><PriceChart points={visible} fallback={item.currentValue}/><div className="ci-history-foot"><span><i className="ci-dot"/> {variantLabel(item)}</span><strong>{money(visible.at(-1)?.value??item.currentValue)}</strong></div></article>
        <article className="ci-panel ci-details"><div className="ci-panel-head"><h2>Details</h2><button className="ci-text" onClick={edit}><Pencil size={13}/> Edit</button></div><div className="ci-detail-grid">{detailRows.map(([k,v])=><div key={k}><span>{k}</span><b>{String(v)}</b></div>)}</div>{item.identity?.description&&<p className="ci-description">{item.identity.description}</p>}{item.notes&&<p className="ci-description">{item.notes}</p>}</article>
      </section>

      <aside className="ci-side">
        <article className="ci-panel"><div className="ci-panel-head"><h2>My Collection</h2><strong>{money(item.currentValue*item.quantity)}</strong></div><div className="ci-owned-row"><div><b>{variantLabel(item)}</b><small>{item.status==='owned'?'Owned':'Not owned'}</small></div><div className="ci-stepper"><button onClick={()=>updateQuantity(-1)} aria-label="Subtract one"><Minus size={15}/></button><span>{item.status==='owned'?item.quantity:0}</span><button onClick={()=>updateQuantity(1)} aria-label="Add one"><Plus size={15}/></button></div><strong>{money(item.currentValue*item.quantity)}</strong></div><div className="ci-summary-row"><span>Purchase price</span><b>{money(item.purchasePrice)}</b></div><div className="ci-summary-row"><span>Quantity</span><b>{item.quantity}</b></div><div className="ci-summary-row"><span>Total value</span><b>{money(item.currentValue*item.quantity)}</b></div></article>

        <article className="ci-panel"><div className="ci-panel-head"><h2>Market</h2><span className="ci-live">LIVE</span></div><button className="ci-market-refresh" disabled={busy} onClick={marketLookup}><RefreshCw size={14}/>{busy?'Checking market…':'Refresh market price'}</button>{quote&&<div className="ci-quote"><small>{quote.source}</small><b>{quote.name}</b><strong>{money(quote.value)}</strong><span>{quote.tier}</span><button onClick={applyQuote}><Check size={14}/> Use this value</button></div>}{message&&<p className="ci-message">{message}</p>}<a href={ebay} target="_blank" rel="noreferrer" className="ci-market-link">eBay sold listings <ExternalLink size={13}/></a><a href={'https://www.pricecharting.com/search-products?'+new URLSearchParams({q:[item.name,item.identity?.series,item.identity?.edition].filter(Boolean).join(' '),type:'prices'})} target="_blank" rel="noreferrer" className="ci-market-link">PriceCharting <ExternalLink size={13}/></a></article>

        <article className="ci-panel ci-danger-zone"><button onClick={edit}><Pencil size={14}/> Edit item</button><button onClick={remove}><Trash2 size={14}/> Delete</button></article>
      </aside>
    </div>
  </main>
}

function filterRange(points:PricePoint[],range:string){
  const days:Record<string,number>={'1M':30,'3M':90,'6M':180,'1Y':365,MAX:Infinity};
  if(days[range]===Infinity)return points;
  const cutoff=Date.now()-days[range]*86400000;
  return points.filter(p=>Date.parse(p.date)>=cutoff);
}

function PriceChart({points,fallback}:{points:PricePoint[];fallback:number}){
  const values=points.length?points:[{date:new Date().toISOString(),value:fallback,variant:'',source:'Saved',url:'',kind:'manual' as const}];
  const min=Math.min(...values.map(p=>p.value)),max=Math.max(...values.map(p=>p.value));
  const lo=Math.max(0,min-Math.max(1,(max-min)*.2)),hi=Math.max(lo+1,max+Math.max(1,(max-min)*.2));
  const x=(i:number)=>values.length===1?720:50+i/(values.length-1)*670;
  const y=(v:number)=>250-(v-lo)/(hi-lo)*190;
  const line=values.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.value)}`).join(' ');
  return <svg className="ci-chart" viewBox="0 0 780 300" role="img" aria-label="Item price history"><defs><linearGradient id="ci-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff2727" stopOpacity=".28"/><stop offset="1" stopColor="#ff2727" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3,4].map(n=><line key={n} x1="50" x2="720" y1={40+n*52.5} y2={40+n*52.5} stroke="#24262d"/>)}{values.length>1?<><path d={`${line} L720,250 L50,250 Z`} fill="url(#ci-area)"/><path d={line} fill="none" stroke="#ff2727" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>:<line x1="50" x2="720" y1={y(values[0].value)} y2={y(values[0].value)} stroke="#ff2727" strokeWidth="3"/>}{values.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.value)} r="4" fill="#ff2727"><title>{new Date(p.date).toLocaleDateString()} · {money(p.value)}</title></circle>)}</svg>
}

'use client';

import {useState} from 'react';
import {
  ArrowLeft,Check,ExternalLink,Heart,Maximize2,Minus,MoreVertical,
  Pencil,Plus,RefreshCw,Tag,Trash2
} from 'lucide-react';
import {Collection,Item,money} from '../lib/model';
import {PricePoint,marketQuery,variantKey,variantLabel} from '../lib/market';

type Quote={name:string;series:string;value:number;tier:string;source:string;url:string;warning?:string;searchQuery?:string};

function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}

export default function ItemDetail({item,collection,close,edit,remove,save}:{item:Item;collection?:Collection;close:()=>void;edit:()=>void;remove:()=>void;save:(item:Item)=>void}){
  const [busy,setBusy]=useState(false);
  const [quote,setQuote]=useState<Quote|null>(null);
  const [message,setMessage]=useState('');
  const [range,setRange]=useState('1Y');

  const isWatch=watched(item),key=variantKey(item),query=item.marketLink?.query||marketQuery(item);
  const gain=item.currentValue-item.purchasePrice;
  const points=(item.priceHistory||[]).filter(p=>p.variant===key&&p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  const visible=filterRange(points,range);
  const ebay='https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:query,LH_Sold:'1',LH_Complete:'1'});
  const priceCharting='https://www.pricecharting.com/search-products?'+new URLSearchParams({q:[item.name,item.identity?.series,item.identity?.edition].filter(Boolean).join(' '),type:'prices'});

  const displaySeries=
    item.identity?.series||
    item.customFields?.__legacyCollectionName||
    (collection?.name==='Unlabeled'?'':collection?.name)||
    item.category||
    'Collectible';

  const displayMeta=[
    item.identity?.brand,
    item.customFields?.Franchise,
    item.identity?.modelNumber||item.identity?.collectorNumber
  ].filter(Boolean).join(' • ');

  function updateQuantity(delta:number){
    const current=item.status==='owned'?item.quantity:0,next=Math.max(0,current+delta);
    save({...item,status:next>0?'owned':item.status,quantity:Math.max(1,next),updatedAt:new Date().toISOString()});
  }
  function toggleWatch(){
    const cf={...(item.customFields||{})};
    if(isWatch)delete cf.__watchlist;else cf.__watchlist='true';
    save({...item,customFields:cf,status:isWatch&&item.status==='wishlist'?'owned':item.status,updatedAt:new Date().toISOString()});
  }
  async function marketLookup(){
    setBusy(true);setMessage('');setQuote(null);
    try{
      const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});
      const result=await r.json();
      if(!r.ok){setMessage(result.error||'Market lookup unavailable.');return}
      setQuote(result);
    }catch{
      setMessage('Market lookup unavailable. Your saved value was not changed.');
    }finally{setBusy(false)}
  }
  function applyQuote(){
    if(!quote)return;
    const date=new Date().toISOString();
    save({...item,currentValue:quote.value,updatedAt:date,marketLink:{provider:quote.source,query:quote.searchQuery||query,linkedAt:item.marketLink?.linkedAt||date,lastRefresh:date},priceHistory:[...(item.priceHistory||[]),{date,value:quote.value,variant:key,source:quote.source,url:quote.url,kind:'provider'}]});
    setMessage('Market value updated.');setQuote(null);
  }

  const rows=Object.entries({
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
  }).filter(([k,v])=>v&&k!=='__watchlist'&&!k.startsWith('__legacy'));

  return <main className="cl-item-page">
    <div className="cl-mobile-item">
      <div className="cl-mobile-item-toolbar">
        <button onClick={close} aria-label="Back"><ArrowLeft size={20}/></button>
        <div>
          <button aria-label="More options"><MoreVertical size={19}/></button>
          <button aria-label="Expand image"><Maximize2 size={18}/></button>
        </div>
      </div>

      <section className="cl-mobile-item-image">
        <img src={item.image||'/art/empty.svg'} alt={item.name}/>
      </section>

      <section className="cl-mobile-item-card">
        <div className="cl-mobile-title-row">
          <div>
            <h1>{item.name}</h1>
            <p>{displaySeries}</p>
            <small>{displayMeta}</small>
          </div>
          <button className={isWatch?'active':''} onClick={toggleWatch} aria-label={isWatch?'Remove from watchlist':'Add to watchlist'}>
            <Heart size={18} fill={isWatch?'currentColor':'none'}/>
          </button>
        </div>

        <div className="cl-mobile-market-row">
          <a href={ebay} target="_blank" rel="noreferrer"><Tag size={14}/> View Sold Listings</a>
          <div>
            <strong>{money(item.currentValue)}</strong>
            <span className={gain>=0?'gain':'loss'}>
              {gain>=0?'+':''}{money(gain)} {item.purchasePrice?`(${(gain/item.purchasePrice*100).toFixed(2)}%)`:'(—)'}
            </span>
          </div>
        </div>

        <div className="cl-mobile-condition-tabs">
          <button className={!item.grading?.graded?'active':''}>RAW</button>
          <button className={item.grading?.graded?'active':''}>GRADED</button>
          <button>POP</button>
        </div>

        <div className="cl-mobile-variant-label">
          <i/>
          <span>{variantLabel(item)}</span>
        </div>

        <ItemPriceChart points={visible} fallback={item.currentValue}/>

        <div className="cl-mobile-range-row">
          {['1M','3M','6M','1Y','MAX'].map(r=><button className={r===range?'active':''} onClick={()=>setRange(r)} key={r}>{r}</button>)}
        </div>

        <div className="cl-mobile-owned-row">
          <div>
            <span>Qty</span>
            <b>{item.status==='owned'?item.quantity:0}</b>
          </div>
          <div className="cl-mobile-stepper">
            <button onClick={()=>updateQuantity(-1)}><Minus size={16}/></button>
            <button onClick={()=>updateQuantity(1)}><Plus size={17}/></button>
          </div>
          <strong>{money(item.currentValue*(item.status==='owned'?item.quantity:0))}</strong>
        </div>

        <div className="cl-mobile-detail-actions">
          <button onClick={edit}><Pencil size={14}/> Edit</button>
          <button disabled={busy} onClick={marketLookup}><RefreshCw size={14}/>{busy?'Checking…':'Refresh Price'}</button>
        </div>

        {quote&&<div className="cl-mobile-market-quote">
          <small>{quote.source}</small><b>{quote.name}</b><strong>{money(quote.value)}</strong>
          <button onClick={applyQuote}><Check size={13}/> Use this value</button>
        </div>}
        {message&&<p className="cl-market-message">{message}</p>}
      </section>
    </div>

    <div className="cl-desktop-item">
      <section className="cl-item-hero">
        <div className="cl-item-hero-inner">
          <div className="cl-item-crumbs"><button onClick={close}>Collections</button><span>›</span><span>{displaySeries}</span><span>›</span><b>{item.name}</b></div>
          <div className="cl-item-title-row">
            <div><h1>{item.name}</h1><a>{displaySeries}</a><p>{displayMeta}</p></div>
            <div className="cl-item-price"><strong>{money(item.currentValue)}</strong><span className={gain>=0?'gain':'loss'}>{gain>=0?'+':''}{money(gain)} ({item.purchasePrice?`${(gain/item.purchasePrice*100).toFixed(2)}%`:'—'})</span></div>
          </div>
        </div>
      </section>
      <div className="cl-item-watch-row"><div/><button className={isWatch?'active':''} onClick={toggleWatch}><Heart size={14} fill={isWatch?'currentColor':'none'}/>{isWatch?'Watching':'Add to Watchlist'}</button></div>

      <div className="cl-item-grid">
        <section className="cl-item-media"><img src={item.image||'/art/empty.svg'} alt={item.name}/></section>

        <div className="cl-item-center">
          <section className="cl-item-panel cl-history-panel"><div className="cl-item-panel-head"><h2>{item.grading?.graded?'Graded':'Ungraded'} Price History</h2><div className="cl-history-ranges">{['1M','3M','6M','1Y','MAX'].map(r=><button className={r===range?'active':''} onClick={()=>setRange(r)} key={r}>{r}</button>)}</div></div><ItemPriceChart points={visible} fallback={item.currentValue}/><div className="cl-chart-legend"><span><i/>{variantLabel(item)}</span></div></section>
          <section className="cl-item-panel cl-details-panel"><div className="cl-item-panel-head"><h2>Details</h2><button onClick={edit}><Pencil size={13}/> Edit</button></div>{item.identity?.description&&<p className="cl-detail-description">{item.identity.description}</p>}<div className="cl-detail-list">{rows.map(([k,v])=><div key={k}><span>{k}</span><b>{String(v)}</b></div>)}</div>{item.notes&&<p className="cl-detail-description">{item.notes}</p>}</section>
        </div>

        <div className="cl-item-right">
          <section className="cl-item-panel"><div className="cl-item-panel-head"><h2>My Collection</h2><strong>{money(item.currentValue*(item.status==='owned'?item.quantity:0))}</strong></div><h3>{item.grading?.graded?'Graded':'Ungraded'}</h3><div className="cl-owned-line"><div><b>{variantLabel(item)}</b><small>{item.status==='owned'?'Owned':'Not owned'}</small></div><div className="cl-stepper"><button onClick={()=>updateQuantity(-1)}><Minus size={14}/></button><span>{item.status==='owned'?item.quantity:0}</span><button onClick={()=>updateQuantity(1)}><Plus size={14}/></button></div><div><strong>{money(item.currentValue)}</strong><small className={gain>=0?'gain':'loss'}>{gain>=0?'+':''}{money(gain)}</small></div></div><div className="cl-owned-summary"><span>Purchase price <b>{money(item.purchasePrice)}</b></span><span>Total value <b>{money(item.currentValue*(item.status==='owned'?item.quantity:0))}</b></span></div></section>

          <section className="cl-item-panel"><div className="cl-item-panel-head"><h2>Market</h2><span className="cl-live">LIVE</span></div><button className="cl-market-refresh" disabled={busy} onClick={marketLookup}><RefreshCw size={14}/>{busy?'Checking market…':'Refresh market price'}</button>{quote&&<div className="cl-market-quote"><small>{quote.source}</small><b>{quote.name}</b><strong>{money(quote.value)}</strong><span>{quote.tier}</span><button onClick={applyQuote}><Check size={13}/> Use this value</button></div>}{message&&<p className="cl-market-message">{message}</p>}<a href={ebay} target="_blank" rel="noreferrer">eBay sold listings <ExternalLink size={12}/></a><a href={priceCharting} target="_blank" rel="noreferrer">PriceCharting <ExternalLink size={12}/></a></section>
          <section className="cl-item-panel cl-item-actions"><button onClick={edit}><Pencil size={13}/> Edit Product</button><button onClick={remove}><Trash2 size={13}/> Delete</button></section>
        </div>
      </div>
    </div>
  </main>
}

function filterRange(points:PricePoint[],range:string){
  const days:Record<string,number>={'1M':30,'3M':90,'6M':180,'1Y':365,MAX:Infinity};
  if(days[range]===Infinity)return points;
  const cutoff=Date.now()-days[range]*86400000;
  return points.filter(p=>Date.parse(p.date)>=cutoff);
}

function ItemPriceChart({points,fallback}:{points:PricePoint[];fallback:number}){
  const values=points.length?points:[{date:new Date().toISOString(),value:fallback,variant:'',source:'Saved',url:'',kind:'manual' as const}];
  const min=Math.min(...values.map(p=>p.value)),max=Math.max(...values.map(p=>p.value)),pad=Math.max((max-min)*.2,max*.05,1),lo=Math.max(0,min-pad),hi=Math.max(lo+1,max+pad);
  const x=(i:number)=>values.length===1?720:55+i/(values.length-1)*665,y=(v:number)=>245-(v-lo)/(hi-lo)*190;
  const line=values.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.value)}`).join(' ');
  return <svg className="cl-item-chart" viewBox="0 0 780 285" role="img" aria-label="Price history"><defs><linearGradient id="itemArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".16"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>{[0,1,2,3,4].map(n=><line key={n} x1="55" x2="720" y1={45+n*50} y2={45+n*50} stroke="#26282c"/>)}{values.length>1?<><path d={`${line} L720,245 L55,245 Z`} fill="url(#itemArea)"/><path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></>:<line x1="55" x2="720" y1={y(values[0].value)} y2={y(values[0].value)} stroke="var(--accent)" strokeWidth="2.5"/>}{values.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="var(--accent)"><title>{new Date(p.date).toLocaleDateString()} · {money(p.value)}</title></circle>)}</svg>
}

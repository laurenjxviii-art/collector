 'use client';

import {useMemo,useState} from 'react';
import {ArrowLeft,Check,Heart,Minus,MoreVertical,Pencil,Plus,RefreshCw,Trash2,X} from 'lucide-react';
import {Collection,Item,money} from '../lib/model';
import {marketQuery,variantKey,variantLabel} from '../lib/market';

function watched(item:Item){return item.status==='wishlist'||item.customFields?.__watchlist==='true'}
function gain(item:Item){return item.currentValue-item.purchasePrice}

export default function ItemDetail({
  item,collection,close,edit,remove,save
}:{
  item:Item;collection?:Collection;close:()=>void;edit:()=>void;remove:()=>void;save:(i:Item)=>void
}){
  const [range,setRange]=useState('1Y');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const key=variantKey(item);
  const points=useMemo(()=>{
    const all=(item.priceHistory||[]).filter(p=>p.variant===key&&p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
    const days:Record<string,number>={'1M':30,'3M':90,'6M':180,'1Y':365,MAX:Infinity};
    if(days[range]===Infinity)return all;
    const cutoff=Date.now()-days[range]*86400000;
    return all.filter(p=>Date.parse(p.date)>=cutoff);
  },[item.priceHistory,key,range]);

  function setQty(next:number){
    const qty=Math.max(0,next);
    save({...item,status:qty>0?'owned':item.status,quantity:Math.max(1,qty),updatedAt:new Date().toISOString()});
  }
  function toggleWatch(){
    const cf={...(item.customFields||{})};
    if(watched(item))delete cf.__watchlist;else cf.__watchlist='true';
    save({...item,customFields:cf,updatedAt:new Date().toISOString()});
  }
  async function refreshPrice(){
    setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item})});
      const result=await r.json();
      if(!r.ok)throw new Error(result.error||'Market lookup unavailable');
      if(Number.isFinite(result.value)){
        const date=new Date().toISOString();
        save({...item,currentValue:result.value,updatedAt:date,priceHistory:[...(item.priceHistory||[]),{date,value:result.value,variant:key,source:result.source||'Market',url:result.url||'',kind:'provider'}]});
        setMessage('Market value updated.');
      }
    }catch(err){setMessage(err instanceof Error?err.message:'Market lookup unavailable.')}
    finally{setBusy(false)}
  }

  return <main className="cr-detail">
    <section className="cr-detail-hero">
      <div className="cr-detail-inner">
        <div className="cr-detail-crumb"><button onClick={close}>Collections</button><span>›</span><span>{item.identity?.series||collection?.name||'Collection'}</span><span>›</span><b>{item.name}</b></div>
        <div className="cr-detail-title">
          <div><h1>{item.name}</h1><a>{item.identity?.series||collection?.name||'Collection'}</a><p>{[item.customFields?.Rarity,item.identity?.collectorNumber].filter(Boolean).join(' • ')}</p></div>
          <div><strong>{money(item.currentValue)}</strong><small className={gain(item)>=0?'gain':'loss'}>{gain(item)>=0?'+':''}{money(gain(item))}</small></div>
        </div>
      </div>
    </section>

    <div className="cr-detail-watch"><button className={watched(item)?'active':''} onClick={toggleWatch}><Heart size={15} fill={watched(item)?'currentColor':'none'}/> {watched(item)?'Watching':'Add to Watchlist'}</button></div>

    <section className="cr-detail-grid">
      <div className="cr-detail-image"><img src={item.image||'/art/empty.svg'} alt={item.name}/></div>

      <div className="cr-detail-center">
        <section className="cr-detail-panel">
          <div className="cr-detail-panel-head"><h2>Ungraded Price History</h2><div>{['1M','3M','6M','1Y','MAX'].map(r=><button key={r} className={range===r?'active':''} onClick={()=>setRange(r)}>{r}</button>)}</div></div>
          <PriceChart points={points} fallback={item.currentValue}/>
          <div className="cr-detail-legend"><i/><span>{variantLabel(item)}</span></div>
        </section>
        <section className="cr-detail-panel">
          <div className="cr-detail-panel-head"><h2>Details</h2><button onClick={edit}><Pencil size={13}/> Edit</button></div>
          <div className="cr-detail-list">
            {[
              ['Brand',item.identity?.brand],
              ['Series',item.identity?.series],
              ['Number',item.identity?.collectorNumber||item.identity?.modelNumber],
              ['UPC',item.identity?.upc],
              ['Edition',item.identity?.edition],
              ['Year',item.identity?.year],
              ['Condition',item.condition]
            ].filter(([,v])=>v).map(([k,v])=><div key={k}><span>{k}</span><b>{String(v)}</b></div>)}
          </div>
          {item.notes&&<p className="cr-detail-note">{item.notes}</p>}
        </section>
      </div>

      <aside className="cr-detail-right">
        <section className="cr-detail-panel">
          <div className="cr-detail-panel-head"><h2>Collection</h2><strong>{money(item.currentValue*(item.status==='owned'?item.quantity:0))}</strong></div>
          <div className="cr-inventory-row">
            <div><b>{variantLabel(item)}</b><small>{item.status==='owned'?'Owned':'Not owned'}</small></div>
            <div className="cr-stepper"><button onClick={()=>setQty((item.status==='owned'?item.quantity:0)-1)}><Minus size={14}/></button><span>{item.status==='owned'?item.quantity:0}</span><button onClick={()=>setQty((item.status==='owned'?item.quantity:0)+1)}><Plus size={14}/></button></div>
            <strong>{money(item.currentValue)}</strong>
          </div>
        </section>
        <section className="cr-detail-panel">
          <div className="cr-detail-panel-head"><h2>Market</h2></div>
          <button className="cr-market-refresh" disabled={busy} onClick={refreshPrice}><RefreshCw size={14}/>{busy?'Checking…':'Refresh market price'}</button>
          {message&&<p className="cr-market-message">{message}</p>}
          <a href={'https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:marketQuery(item),LH_Sold:'1',LH_Complete:'1'})} target="_blank" rel="noreferrer">View sold listings</a>
        </section>
        <section className="cr-detail-panel cr-detail-actions"><button onClick={edit}><Pencil size={13}/> Edit Product</button><button onClick={remove}><Trash2 size={13}/> Delete</button></section>
      </aside>
    </section>

    <button className="cr-mobile-detail-back" onClick={close}><ArrowLeft size={18}/></button>
  </main>
}

function PriceChart({points,fallback}:{points:any[];fallback:number}){
  const vals=points.length?points:[{date:new Date().toISOString(),value:fallback}];
  const min=Math.min(...vals.map(p=>p.value)),max=Math.max(...vals.map(p=>p.value));
  const pad=Math.max((max-min)*.2,max*.04,1),lo=Math.max(0,min-pad),hi=Math.max(lo+1,max+pad);
  const x=(i:number)=>vals.length===1?710:50+i/(vals.length-1)*660;
  const y=(v:number)=>235-(v-lo)/(hi-lo)*185;
  const line=vals.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.value)}`).join(' ');
  return <svg className="cr-price-chart" viewBox="0 0 760 260"><defs><linearGradient id="detailArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".20"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></linearGradient></defs>{vals.length>1?<><path d={`${line} L710,235 L50,235 Z`} fill="url(#detailArea)"/><path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></>:<line x1="50" x2="710" y1={y(vals[0].value)} y2={y(vals[0].value)} stroke="var(--accent)" strokeWidth="2.5"/>}</svg>
}

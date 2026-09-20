'use client';

import {useEffect,useMemo,useState} from 'react';
import {Store,money} from '../lib/model';

type ScopeOption={id:string;label:string};

export default function ValueChart({
  data,collectionId,value,cost,scopeId,scopeOptions,onScopeChange
}:{
  data:Store;
  collectionId:string;
  value:number;
  cost:number;
  scopeId?:string;
  scopeOptions?:ScopeOption[];
  onScopeChange?:(id:string)=>void;
}){
  const [range,setRange]=useState('1M');
  const [hover,setHover]=useState<number|null>(null);
  const [compact,setCompact]=useState(false);
  const [scopeOpen,setScopeOpen]=useState(false);

  useEffect(()=>{
    const media=window.matchMedia('(max-width:760px)');
    const sync=()=>setCompact(media.matches);
    sync();
    media.addEventListener?.('change',sync);
    return()=>media.removeEventListener?.('change',sync);
  },[]);

  const days:Record<string,number>={'1D':1,'7D':7,'1M':30,'3M':90,'6M':180,MAX:Infinity};

  const points=useMemo(()=>{
    const cutoff=days[range]===Infinity?-Infinity:Date.now()-days[range]*86400000;
    const all=(data.history||[])
      .map(s=>({
        date:s.date,
        value:collectionId==='all'
          ?Object.values(s.values).reduce((a,b)=>a+b,0)
          :s.values[collectionId]||0
      }))
      .filter(p=>Date.parse(p.date)>=cutoff);
    if(!all.length)return [{date:new Date().toISOString(),value}];
    return all;
  },[data.history,collectionId,range,value]);

  const collection=data.collections.find(c=>c.id===collectionId);
  const selected=(hover===null?undefined:points[hover])||points.at(-1)!;
  const first=points[0]?.value??value;
  const last=points.at(-1)?.value??value;
  const periodChange=last-first;
  const periodPct=first?periodChange/first*100:0;

  const W=compact?680:980;
  const H=compact?300:260;
  const left=compact?4:8;
  const right=compact?676:972;
  const top=compact?22:28;
  const bottom=compact?252:220;

  const min=Math.min(...points.map(p=>p.value));
  const max=Math.max(...points.map(p=>p.value));
  const pad=Math.max((max-min)*.22,max*.025,1);
  const lo=Math.max(0,min-pad);
  const hi=Math.max(lo+1,max+pad);
  const plotY=(v:number)=>Math.min(bottom-4,Math.max(top+4,bottom-(v-lo)/(hi-lo)*(bottom-top-8)));
  const x=(i:number)=>points.length===1?right:left+i/(points.length-1)*(right-left);
  const line=points.map((p,i)=>`${i?'L':'M'}${x(i)},${plotY(p.value)}`).join(' ');
  const single=points.length===1;
  const singleY=value===0?bottom-12:plotY(value);
  const label=collectionId==='all'?'Portfolio':collection?.name||'Collection';
  const sublabel=collectionId==='all'?'Collecting':'Overview';
  const currentScope=scopeOptions?.find(o=>o.id===(scopeId||collectionId))?.label||sublabel;

  return <section className="value-chart">
    <div className="chart-head">
      <div>
        <div className="chart-label">
          <b>{scopeOptions?'Portfolio:':label}</b>
          {scopeOptions&&onScopeChange
            ?<div className="chart-scope">
                <button className="chart-scope-button" type="button" onClick={()=>setScopeOpen(v=>!v)}>
                  {currentScope}
                </button>
                {scopeOpen&&<div className="chart-scope-menu">
                  {scopeOptions.map(o=><button
                    type="button"
                    className={o.id===(scopeId||collectionId)?'active':''}
                    key={o.id}
                    onClick={()=>{onScopeChange(o.id);setScopeOpen(false)}}
                  >{o.label}</button>)}
                </div>}
              </div>
            :<span>{sublabel}</span>}
        </div>
        <div className="chart-total">
          {money(value)}
          <span>{collectionId==='all'?`Combined Value: ${money(value)}`:`Purchase Total: ${money(cost)}`}</span>
        </div>
        <div className={periodChange>=0?'chart-gain':'chart-gain loss'}>
          {periodChange>=0?'+':''}{money(periodChange)} ({periodChange>=0?'+':''}{periodPct.toFixed(2)}%)
          <span> in selected range</span>
        </div>
      </div>
      <div className="chart-current">
        <small>{new Date(selected.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small>
        <b>{money(selected.value)}</b>
      </div>
    </div>

    <div className="chart-canvas">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Collection value history"
        onMouseLeave={()=>setHover(null)}
      >
        <defs>
          <linearGradient id={`red-area-${collectionId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".28"/>
            <stop offset="72%" stopColor="var(--accent)" stopOpacity=".07"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {!single&&<>
          <path d={`${line} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#red-area-${collectionId})`}/>
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth={compact?3.1:2.8} strokeLinecap="round" strokeLinejoin="round"/>
        </>}

        {single&&<>
          <path d={`M${left},${singleY} L${right},${singleY} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#red-area-${collectionId})`}/>
          <line x1={left} x2={right} y1={singleY} y2={singleY} stroke="var(--accent)" strokeWidth="2.8"/>
          <circle cx={right} cy={singleY} r="4" fill="var(--accent)"/>
        </>}

        {!single&&points.map((p,i)=><g key={`${p.date}-${i}`} onMouseEnter={()=>setHover(i)}>
          <circle cx={x(i)} cy={plotY(p.value)} r={hover===i?4:0} fill="var(--accent)"/>
          <circle cx={x(i)} cy={plotY(p.value)} r="18" fill="transparent"/>
        </g>)}
      </svg>
    </div>

    <div className="chart-bottom">
      <div className="chart-ranges">
        {Object.keys(days).map(r=><button
          key={r}
          className={r===range?'active':''}
          onClick={()=>{setRange(r);setHover(null)}}
        >{r}</button>)}
      </div>
    </div>
  </section>
}

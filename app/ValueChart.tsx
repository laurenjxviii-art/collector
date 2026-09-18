'use client';
import {useMemo,useState} from 'react';
import {Store,money} from '../lib/model';

export default function ValueChart({data,collectionId,value,cost}:{data:Store;collectionId:string;value:number;cost:number}){
  const [range,setRange]=useState('1M'),[hover,setHover]=useState<number|null>(null);
  const days:Record<string,number>={'1D':1,'7D':7,'1M':30,'3M':90,'6M':180,MAX:Infinity};
  const points=useMemo(()=>{
    const cutoff=days[range]===Infinity?-Infinity:Date.now()-days[range]*86400000;
    const all=(data.history||[]).map(s=>({date:s.date,value:collectionId==='all'?Object.values(s.values).reduce((a,b)=>a+b,0):s.values[collectionId]||0})).filter(p=>Date.parse(p.date)>=cutoff);
    if(!all.length)return [{date:new Date().toISOString(),value}];
    return all;
  },[data.history,collectionId,range,value]);
  const min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value));
  const pad=Math.max((max-min)*.22,max*.045,1),lo=Math.max(0,min-pad),hi=Math.max(lo+1,max+pad);
  const plotY=(v:number)=>Math.min(216,Math.max(54,220-(v-lo)/(hi-lo)*170));
  const x=(i:number)=>points.length===1?500:60+i/(points.length-1)*880;
  const line=points.map((p,i)=>`${i?'L':'M'}${x(i)},${plotY(p.value)}`).join(' ');
  const selected=(hover===null?undefined:points[hover])||points.at(-1)!;
  const single=points.length===1;
  const singleY=value===0?205:plotY(value);
  return <section className="value-chart">
    <div className="chart-head"><div><div className="chart-label">PORTFOLIO <span>• {collectionId==='all'?'All collections':data.collections.find(c=>c.id===collectionId)?.name}</span></div><div className="chart-total">{money(value)} <span>Purchase total: {money(cost)}</span></div><div className={value>=cost?"chart-gain":"chart-gain loss"}>{value>=cost?'+':''}{money(value-cost)} <span>vs. purchase price</span></div></div><div className="chart-current"><small>{new Date(selected.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small><b>{money(selected.value)}</b></div></div>
    <div className="chart-canvas">
      <svg viewBox="0 0 980 260" preserveAspectRatio="none" role="img" aria-label="Owned collection value history" onMouseLeave={()=>setHover(null)}>
        <defs><linearGradient id={`red-area-${collectionId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff0000" stopOpacity=".25"/><stop offset="100%" stopColor="#ff0000" stopOpacity="0"/></linearGradient><filter id={`red-glow-${collectionId}`}><feGaussianBlur stdDeviation="3"/></filter></defs>
        {Array.from({length:5},(_,i)=>{const v=lo+(hi-lo)*i/4;return <g key={i}><line x1="60" x2="940" y1={plotY(v)} y2={plotY(v)} stroke="#2a2a2a"/><text x="49" y={plotY(v)+4} textAnchor="end" fill="#777780" fontSize="10">{Math.round(v)}</text></g>})}
        {Array.from({length:12},(_,i)=><line key={i} x1={60+i*80} x2={60+i*80} y1="50" y2="220" stroke="#202020"/>)}
        {!single&&<><path d={`${line} L940,220 L60,220 Z`} fill={`url(#red-area-${collectionId})`}/><path d={line} fill="none" stroke="#ff0000" strokeWidth="6" opacity=".32" filter={`url(#red-glow-${collectionId})`}/><path d={line} fill="none" stroke="#ff1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></>}
        {single&&<><path d={`M60,${singleY} L940,${singleY} L940,220 L60,220 Z`} fill={`url(#red-area-${collectionId})`}/><line x1="60" x2="940" y1={singleY} y2={singleY} stroke="#ff1a1a" strokeWidth="3"/><circle cx="940" cy={singleY} r="5" fill="#ff1a1a"/></>}
        {!single&&points.map((p,i)=><g key={`${p.date}-${i}`} onMouseEnter={()=>setHover(i)}><circle cx={x(i)} cy={plotY(p.value)} r="4" fill="#ff1a1a"/><circle cx={x(i)} cy={plotY(p.value)} r="18" fill="transparent"/></g>)}
        <text x="60" y="245" fill="#777780" fontSize="10">{new Date(points[0].date).toLocaleDateString()}</text><text x="940" y="245" textAnchor="end" fill="#777780" fontSize="10">Today</text>
      </svg>
    </div>
    <div className="chart-bottom"><div className="chart-ranges">{Object.keys(days).map(r=><button key={r} className={r===range?'active':''} onClick={()=>{setRange(r);setHover(null)}}>{r}</button>)}</div></div>
  </section>
}

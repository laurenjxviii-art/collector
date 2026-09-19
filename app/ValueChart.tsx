'use client';
import {useEffect,useMemo,useState} from 'react';
import {Store,money} from '../lib/model';

export default function ValueChart({data,collectionId,value,cost}:{data:Store;collectionId:string;value:number;cost:number}){
  const [range,setRange]=useState('1M'),[hover,setHover]=useState<number|null>(null),[compact,setCompact]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width:760px)');const sync=()=>setCompact(media.matches);sync();media.addEventListener?.('change',sync);return()=>media.removeEventListener?.('change',sync)},[]);
  const days:Record<string,number>={'1D':1,'7D':7,'1M':30,'3M':90,'6M':180,MAX:Infinity};
  const points=useMemo(()=>{
    const cutoff=days[range]===Infinity?-Infinity:Date.now()-days[range]*86400000;
    const all=(data.history||[]).map(s=>({date:s.date,value:collectionId==='all'?Object.values(s.values).reduce((a,b)=>a+b,0):s.values[collectionId]||0})).filter(p=>Date.parse(p.date)>=cutoff);
    if(!all.length)return [{date:new Date().toISOString(),value}];
    return all;
  },[data.history,collectionId,range,value]);
  const W=compact?640:980,H=compact?320:260,left=compact?54:60,right=compact?615:940,top=compact?38:50,bottom=compact?270:220,labelY=compact?306:245;
  const min=Math.min(...points.map(p=>p.value)),max=Math.max(...points.map(p=>p.value));
  const pad=Math.max((max-min)*.22,max*.045,1),lo=Math.max(0,min-pad),hi=Math.max(lo+1,max+pad);
  const plotY=(v:number)=>Math.min(bottom-4,Math.max(top+4,bottom-(v-lo)/(hi-lo)*(bottom-top-8)));
  const x=(i:number)=>points.length===1?right:left+i/(points.length-1)*(right-left);
  const line=points.map((p,i)=>`${i?'L':'M'}${x(i)},${plotY(p.value)}`).join(' ');
  const selected=(hover===null?undefined:points[hover])||points.at(-1)!;
  const single=points.length===1,singleY=value===0?bottom-15:plotY(value),verticals=compact?7:12;
  return <section className="value-chart">
    <div className="chart-head"><div><div className="chart-label">PORTFOLIO <span>• {collectionId==='all'?'All collections':data.collections.find(c=>c.id===collectionId)?.name}</span></div><div className="chart-total">{money(value)} <span>Purchase total: {money(cost)}</span></div><div className={value>=cost?"chart-gain":"chart-gain loss"}>{value>=cost?'+':''}{money(value-cost)} <span>vs. purchase price</span></div></div><div className="chart-current"><small>{new Date(selected.date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small><b>{money(selected.value)}</b></div></div>
    <div className="chart-canvas">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Owned collection value history" onMouseLeave={()=>setHover(null)}>
        <defs><linearGradient id={`red-area-${collectionId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff0000" stopOpacity=".25"/><stop offset="100%" stopColor="#ff0000" stopOpacity="0"/></linearGradient><filter id={`red-glow-${collectionId}`}><feGaussianBlur stdDeviation="3"/></filter></defs>
        {Array.from({length:5},(_,i)=>{const v=lo+(hi-lo)*i/4;return <g key={i}><line x1={left} x2={right} y1={plotY(v)} y2={plotY(v)} stroke="#2a2a2a"/><text x={left-11} y={plotY(v)+4} textAnchor="end" fill="#777780" fontSize={compact?12:10}>{Math.round(v)}</text></g>})}
        {Array.from({length:verticals},(_,i)=>{const gx=left+i/(verticals-1)*(right-left);return <line key={i} x1={gx} x2={gx} y1={top} y2={bottom} stroke="#202020"/>})}
        {!single&&<><path d={`${line} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#red-area-${collectionId})`}/><path d={line} fill="none" stroke="#ff0000" strokeWidth={compact?5:6} opacity=".32" filter={`url(#red-glow-${collectionId})`}/><path d={line} fill="none" stroke="#ff1a1a" strokeWidth={compact?2.5:3} strokeLinecap="round" strokeLinejoin="round"/></>}
        {single&&<><path d={`M${left},${singleY} L${right},${singleY} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#red-area-${collectionId})`}/><line x1={left} x2={right} y1={singleY} y2={singleY} stroke="#ff1a1a" strokeWidth="3"/><circle cx={right} cy={singleY} r="5" fill="#ff1a1a"/></>}
        {!single&&points.map((p,i)=><g key={`${p.date}-${i}`} onMouseEnter={()=>setHover(i)}><circle cx={x(i)} cy={plotY(p.value)} r="4" fill="#ff1a1a"/><circle cx={x(i)} cy={plotY(p.value)} r="18" fill="transparent"/></g>)}
        <text x={left} y={labelY} fill="#777780" fontSize={compact?12:10}>{new Date(points[0].date).toLocaleDateString()}</text><text x={right} y={labelY} textAnchor="end" fill="#777780" fontSize={compact?12:10}>Today</text>
      </svg>
    </div>
    <div className="chart-bottom"><div className="chart-ranges">{Object.keys(days).map(r=><button key={r} className={r===range?'active':''} onClick={()=>{setRange(r);setHover(null)}}>{r}</button>)}</div></div>
  </section>
}

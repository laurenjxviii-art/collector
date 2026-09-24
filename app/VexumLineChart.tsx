'use client';

import {useId,useState} from 'react';

type ReferenceLine={label:string;value:number;tone:'comparison'|'positive'};

/** 02 Components / Line chart. Callers own values, filters and empty states. */
export function VexumLineChart({values,dates,label='Value',references=[],className=''}:{
  values:number[];dates?:string[];label?:string;references?:ReferenceLine[];className?:string;
}){
  const id=useId().replace(/:/g,'');
  const [hover,setHover]=useState<number|null>(null);
  const rows=values.map((value,index)=>({value,date:dates?.[index]})).filter(row=>Number.isFinite(row.value)&&(!dates||!!row.date&&Number.isFinite(Date.parse(row.date))));
  if(dates)rows.sort((a,b)=>Date.parse(a.date!)-Date.parse(b.date!));
  if(!rows.length)return null;
  const referenceRows=references.filter(row=>Number.isFinite(row.value));
  const numbers=[...rows.map(row=>row.value),...referenceRows.map(row=>row.value)];
  const min=Math.min(...numbers),max=Math.max(...numbers),padding=Math.max(1,(max-min)*.12);
  const low=min<0?min-padding:0,high=Math.max(low+1,max+padding);
  const left=48,right=516,top=18,bottom=164;
  const firstTime=dates?Date.parse(rows[0].date!):0;
  const timeSpan=dates?Date.parse(rows.at(-1)!.date!)-firstTime:0;
  const x=(index:number)=>rows.length===1?(left+right)/2:left+(timeSpan?(Date.parse(rows[index].date!)-firstTime)/timeSpan:index/(rows.length-1))*(right-left);
  const y=(value:number)=>bottom-(value-low)/(high-low)*(bottom-top);
  const path=rows.map((row,index)=>`${index?'L':'M'}${x(index).toFixed(2)} ${y(row.value).toFixed(2)}`).join(' ');
  const area=`${path} L${x(rows.length-1)} ${bottom} L${x(0)} ${bottom} Z`;
  const selected=hover===null?rows.length-1:Math.min(hover,rows.length-1);
  const format=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
  const compact=(value:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value);
  const dateLabel=(index:number)=>{
    const date=rows[index].date;
    return date&&Number.isFinite(Date.parse(date))?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(date)):`${index+1}`;
  };
  const tickCandidates=[...new Set(Array.from({length:Math.min(7,rows.length)},(_,index)=>Math.round(index*(rows.length-1)/Math.max(1,Math.min(7,rows.length)-1))))];
  const ticks=tickCandidates.reduceRight<number[]>((selected,index)=>{
    if(!selected.length||x(selected.at(-1)!)-x(index)>=58)selected.push(index);
    return selected;
  },[]).reverse();
  return <div className={'vxds-line-chart '+className}>
    <div className="vxds-chart-legend"><span><i/>{label}</span>{referenceRows.map(row=><span key={row.label}><i className={row.tone}/>{row.label}</span>)}</div>
    <svg viewBox="0 0 604 204" role="img" aria-label={`${label}: ${rows.length} observations; latest ${format(rows.at(-1)!.value)}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--vx-chart-primary)" stopOpacity=".2"/><stop offset="1" stopColor="var(--vx-chart-primary)" stopOpacity="0"/></linearGradient></defs>
      {Array.from({length:6},(_,index)=>{const value=low+(high-low)*index/5,py=y(value);return <g key={index}><line className="vxds-grid" x1={left} x2={right} y1={py} y2={py}/><text x="8" y={py+4}>{compact(value)}</text></g>})}
      {ticks.map(index=><g key={index}><line className="vxds-grid vertical" x1={x(index)} x2={x(index)} y1={top} y2={bottom}/><text x={x(index)} y="186" textAnchor="middle">{dateLabel(index)}</text></g>)}
      <path d={area} fill={`url(#${id})`}/>
      {referenceRows.map(row=><line key={row.label} className={'vxds-reference '+row.tone} x1={left} x2={right} y1={y(row.value)} y2={y(row.value)}/>) }
      <path className="vxds-series" d={path}/>
      <circle className="vxds-point" cx={x(selected)} cy={y(rows[selected].value)} r="3"/>
      <g transform={`translate(526 ${Math.max(8,Math.min(151,y(rows[selected].value)-10))})`}><rect className="vxds-endpoint" width="72" height="20" rx="3"/><text className="vxds-endpoint-text" x="36" y="14" textAnchor="middle">{compact(rows[selected].value)}</text></g>
      {rows.map((row,index)=>{const start=index?(x(index-1)+x(index))/2:left;const end=index<rows.length-1?(x(index)+x(index+1))/2:right;return <rect key={index} x={start} y={top} width={Math.max(1,end-start)} height={bottom-top} fill="transparent" tabIndex={0} aria-label={`${dateLabel(index)} · ${label}: ${format(row.value)}`} onFocus={()=>setHover(index)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(index)} onMouseLeave={()=>setHover(null)}><title>{`${dateLabel(index)} · ${label}: ${format(row.value)}`}</title></rect>})}
    </svg>
  </div>;
}

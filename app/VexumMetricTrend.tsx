'use client';

import {useId} from 'react';

/** 02 Components: compact metric plot. Series must describe the named metric. */
export function VexumMetricTrend({values=[],label,negative=false}:{values?:number[];label:string;negative?:boolean}) {
  const id=useId().replace(/:/g,'');
  const rows=values.filter(Number.isFinite);
  if(rows.length<2)return <span className="vxds-trend-empty">Trend unavailable</span>;
  const low=Math.min(...rows),range=Math.max(...rows)-low;
  const path=rows.map((value,index)=>`${index?'L':'M'}${(index/(rows.length-1)*104+2).toFixed(2)} ${(range?34-(value-low)/range*28:20).toFixed(2)}`).join(' ');
  return <figure className={'vxds-metric-trend '+(negative?'negative':'positive')}>
    <svg viewBox="0 0 108 40" role="img" aria-label={label}>
      <title>{`${label}: ${rows.map(value=>value.toLocaleString('en-US',{maximumFractionDigits:2})).join(' → ')}`}</title>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".18"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
      <path d={`${path} L106 40 L2 40 Z`} fill={`url(#${id})`}/><path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg><figcaption>{label}</figcaption>
  </figure>;
}

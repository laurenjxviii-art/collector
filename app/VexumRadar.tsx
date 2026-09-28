'use client';

import {useMemo,useState} from 'react';
import {Bell,RefreshCw,SlidersHorizontal,Star,Target,TrendingDown,PackageCheck,Radar as RadarIcon} from 'lucide-react';
import {normalizePlatformState} from '../lib/platform';
import {useWorkspace} from '../lib/useWorkspace';
import {VexumBadge,pushVexumToast} from './VexumUi';
import type {WishlistRecord} from '../lib/wishlist';

type RadarFilter='All'|'Targets'|'Price Drops'|'Preorders'|'Grails';
type Signal={id:string;kind:'TARGET'|'PRICE DROP'|'PREORDER'|'GRAIL';name:string;detail:string;value:string;updated:string;filter:RadarFilter};

function money(value:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<100?2:0}).format(value)}
function ageLabel(value?:string){
  if(!value)return 'Saved signal';
  const ms=Date.now()-Date.parse(value);if(!Number.isFinite(ms))return 'Saved signal';
  const minutes=Math.max(0,Math.floor(ms/60000));
  if(minutes<1)return 'Just now';if(minutes<60)return minutes+'m ago';
  const hours=Math.floor(minutes/60);if(hours<24)return hours+'h ago';
  const days=Math.floor(hours/24);return days+'d ago';
}
function recordName(record:WishlistRecord){return record.snapshot?.name||record.productId}
function signalsFor(record:WishlistRecord):Signal[]{
  if(record.archived)return [];
  const rows:Signal[]=[];
  const market=record.currentMarket;
  if(typeof market==='number'&&typeof record.targetPrice==='number'&&market<=record.targetPrice){
    rows.push({id:record.productId+'-target',kind:'TARGET',name:recordName(record),detail:'At or below your '+money(record.targetPrice)+' target',value:money(market),updated:ageLabel(record.marketUpdatedAt),filter:'Targets'});
  }
  const history=record.marketHistory||[];
  if(typeof market==='number'&&history.length>=2){
    const previous=history.at(-2)?.value;
    if(typeof previous==='number'&&previous>market){
      const drop=(previous-market)/previous*100;
      if(drop>=3)rows.push({id:record.productId+'-drop',kind:'PRICE DROP',name:recordName(record),detail:drop.toFixed(1)+'% below the previous saved market value',value:money(market),updated:ageLabel(record.marketUpdatedAt),filter:'Price Drops'});
    }
  }
  if(record.preorder?.enabled&&!['Delivered','Cancelled'].includes(record.preorder.status)){
    const balance=record.preorder.remainingBalance;
    rows.push({id:record.productId+'-preorder',kind:'PREORDER',name:recordName(record),detail:record.preorder.estimatedReleaseDate?'Estimated release '+new Date(record.preorder.estimatedReleaseDate+'T12:00:00').toLocaleDateString():'Active preorder · '+record.preorder.status,value:typeof balance==='number'?money(balance)+' due':record.preorder.status,updated:record.preorder.retailer||'Wishlist',filter:'Preorders'});
  }
  if(record.priority==='Grail'){
    rows.push({id:record.productId+'-grail',kind:'GRAIL',name:recordName(record),detail:record.grail?.status||'Grail priority',value:typeof market==='number'?money(market):'No market value',updated:ageLabel(record.marketUpdatedAt||record.updatedAt),filter:'Grails'});
  }
  return rows;
}

export default function VexumRadar(){
  const workspace=useWorkspace();
  const platform=normalizePlatformState(workspace.data.platform,true);
  const interests=[...platform.collectorCategories,...platform.collectorInterests];
  const [filter,setFilter]=useState<RadarFilter>('All');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const allSignals=useMemo(()=>Object.values(workspace.data.wishlist||{}).flatMap(record=>signalsFor(record as WishlistRecord)).toSorted((a,b)=>a.name.localeCompare(b.name)),[workspace.data.wishlist]);
  const visible=filter==='All'?allSignals:allSignals.filter(signal=>signal.filter===filter);

  const refresh=async()=>{
    if(refreshing)return;
    setRefreshing(true);
    try{
      await workspace.refresh();
      pushVexumToast({title:'Radar refreshed',message:'VEXUM reloaded the latest synced workspace signals.',kind:'success'});
    }catch(error){
      pushVexumToast({title:'Radar refresh failed',message:error instanceof Error?error.message:'Unable to refresh synced workspace data.',kind:'error'});
    }finally{setRefreshing(false)}
  };

  return <div className="vxr-page">
    <section className="vxr-title vxp-simple-title"><div><span>RADAR</span><h1>Radar</h1></div><div className="vxr-actions"><button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal/>Filters</button><button disabled={refreshing} onClick={()=>void refresh()}><RefreshCw/>{refreshing?'Refreshing…':'Refresh'}</button></div></section>

    <section className="vxr-context vx-panel"><RadarIcon/><div><strong>{interests.length?interests.slice(0,5).join(' · '):'No collection niches selected yet'}</strong><span>{interests.length?'Signals below come only from data already stored in your synced VEXUM workspace.':'Choose collecting niches in onboarding or Settings to personalize future provider signals.'}</span></div><b>{allSignals.length}</b></section>

    {filtersOpen?<div className="vxr-filterbar" role="group" aria-label="Radar filters">{(['All','Targets','Price Drops','Preorders','Grails'] as RadarFilter[]).map(name=><button key={name} className={filter===name?'active':''} onClick={()=>setFilter(name)}>{name}<small>{name==='All'?allSignals.length:allSignals.filter(signal=>signal.filter===name).length}</small></button>)}</div>:null}

    {visible.length?<div className="vxr-grid">{visible.map(signal=><article className="vx-panel vxr-card" key={signal.id}>
      <header><VexumBadge tone={signal.kind==='TARGET'?'success':signal.kind==='PRICE DROP'?'info':signal.kind==='PREORDER'?'warning':'danger'}>{signal.kind}</VexumBadge><span>{signal.updated}</span></header>
      <div><strong>{signal.name}</strong><span>{signal.detail}</span></div><b>{signal.value}</b>
      <i aria-hidden="true">{signal.kind==='TARGET'?<Target/>:signal.kind==='PRICE DROP'?<TrendingDown/>:signal.kind==='PREORDER'?<PackageCheck/>:<Star/>}</i>
    </article>)}</div>:<section className="vxr-empty vx-panel"><Bell/><div><strong>{allSignals.length?'No signals match this filter.':'No real Radar signals yet.'}</strong><span>{allSignals.length?'Choose another filter to view your saved signals.':'Radar will surface target hits, saved price drops, active preorders, and Grails from your real Wishlist data. External restock/drop providers remain empty until connected.'}</span></div></section>}
  </div>;
}

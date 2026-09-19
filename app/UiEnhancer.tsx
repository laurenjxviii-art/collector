'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';

type MiniGroup={name?:string;coverImage?:string;coverLogo?:string};
type MiniCollection={id:string;name:string;libraryType?:string;libraryLine?:string;coverImage?:string;coverLogo?:string;logo?:string};
type MiniPoint={date:string;value:number;kind?:string};
type MiniItem={
  id:string;
  collectionId:string;
  name:string;
  status:string;
  quantity:number;
  currentValue:number;
  priceHistory?:MiniPoint[];
};
type MiniStore={
  collections:MiniCollection[];
  items:MiniItem[];
  libraryGroups?:Record<string,MiniGroup>;
};

function readStore():MiniStore|null{
  try{
    const cloudKeys=Object.keys(localStorage).filter(k=>k.startsWith('collector.cloud.'));
    let best:{revision:number;data:MiniStore}|null=null;
    for(const key of cloudKeys){
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'null');
        if(parsed?.data?.items&&parsed?.data?.collections){
          const revision=Number(parsed.revision)||0;
          if(!best||revision>=best.revision)best={revision,data:parsed.data};
        }
      }catch{}
    }
    if(best)return best.data;
    const local=JSON.parse(localStorage.getItem('shelf.collection.v1')||'null');
    if(local?.items&&local?.collections)return local;
  }catch{}
  return null;
}

function itemRecentChange(item:MiniItem){
  const points=(item.priceHistory||[])
    .filter(p=>p.kind!=='sale')
    .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(points.length<2)return 0;
  const a=points[Math.max(0,points.length-8)]?.value||0;
  const b=points.at(-1)?.value||0;
  return b-a;
}

function money(n:number){
  return new Intl.NumberFormat('en-US',{
    style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2
  }).format(n||0);
}

function clickNav(label:string){
  const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.cc-nav button'));
  buttons.find(b=>b.textContent?.trim()===label)?.click();
}

export default function UiEnhancer(){
  const [store,setStore]=useState<MiniStore|null>(null);
  const [collectionsHost,setCollectionsHost]=useState<HTMLElement|null>(null);
  const [mostHost,setMostHost]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    const sync=()=>setStore(readStore());
    sync();
    const timer=window.setInterval(sync,2500);
    window.addEventListener('storage',sync);
    return()=>{window.clearInterval(timer);window.removeEventListener('storage',sync)};
  },[]);

  useEffect(()=>{
    let collectionsEl:HTMLElement|null=null;
    let mostEl:HTMLElement|null=null;

    const attach=()=>{
      const card=document.querySelector<HTMLElement>('.cc-most-card');

      if(card){
        if(!card.querySelector('.cc-most-footer-host')){
          mostEl=document.createElement('div');
          mostEl.className='cc-most-footer-host';
          card.appendChild(mostEl);
        }else{
          mostEl=card.querySelector<HTMLElement>('.cc-most-footer-host');
        }

        const existing=card.parentElement?.querySelector<HTMLElement>(':scope > .cc-home-collections-host');
        if(existing){
          collectionsEl=existing;
        }else if(card.parentElement){
          collectionsEl=document.createElement('div');
          collectionsEl.className='cc-home-collections-host';
          card.insertAdjacentElement('afterend',collectionsEl);
        }

        setMostHost(mostEl);
        setCollectionsHost(collectionsEl);
      }else{
        setMostHost(null);
        setCollectionsHost(null);
      }
    };

    attach();
    const observer=new MutationObserver(attach);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  const rows=useMemo(()=>{
    if(!store)return [];
    const groups=store.libraryGroups||{};
    const result:{id:string;name:string;image:string;value:number;change:number;count:number}[]=[];

    for(const [key,group] of Object.entries(groups)){
      if(!key.startsWith('line::'))continue;
      const [,typeId,lineId]=key.split('::');
      if(!typeId||!lineId)continue;

      const collections=store.collections.filter(c=>c.libraryType===typeId&&c.libraryLine===lineId);
      if(!collections.length)continue;

      const ids=new Set(collections.map(c=>c.id));
      const items=store.items.filter(i=>ids.has(i.collectionId)&&i.status==='owned');
      const value=items.reduce((n,i)=>n+(Number(i.currentValue)||0)*Math.max(1,Number(i.quantity)||1),0);
      const change=items.reduce((n,i)=>n+itemRecentChange(i)*Math.max(1,Number(i.quantity)||1),0);
      const image=group.coverImage||group.coverLogo||
        collections.map(c=>c.coverImage||c.coverLogo||c.logo||'').find(Boolean)||'';
      result.push({
        id:key,
        name:group.name||collections[0]?.name||'Collection',
        image,
        value,
        change,
        count:items.reduce((n,i)=>n+Math.max(1,Number(i.quantity)||1),0)
      });
    }

    return result
      .filter(r=>r.value>0||r.count>0)
      .sort((a,b)=>b.value-a.value)
      .slice(0,6);
  },[store]);

  const collectionsPortal=collectionsHost?createPortal(
    <section className="cc-home-collections-card">
      <div className="cc-section-head">
        <h2>Collections</h2>
      </div>
      <div className="cc-home-collection-list">
        {rows.map(row=>{
          const prior=row.value-row.change;
          const pct=prior?row.change/prior*100:0;
          return <button key={row.id} onClick={()=>clickNav('Collections')}>
            <div className="cc-home-collection-image">
              {row.image?<img src={row.image} alt=""/>:<span/>}
            </div>
            <div className="cc-home-collection-name">
              <b>{row.name}</b>
              <small>{row.count} item{row.count===1?'':'s'}</small>
            </div>
            <div className="cc-home-collection-value">
              <strong className={row.change<0?'loss':'gain'}>
                <i>{row.change<0?'▼':'▲'}</i> {money(row.value)}
              </strong>
              <span className={row.change<0?'loss':'gain'}>
                {row.change>=0?'+':''}{money(row.change)} ({row.change>=0?'+':''}{pct.toFixed(2)}%)
              </span>
            </div>
          </button>
        })}
        {!rows.length&&<div className="cc-home-collections-empty">Your collection groups will appear here.</div>}
      </div>
    </section>,
    collectionsHost
  ):null;

  const mostPortal=mostHost?createPortal(
    <button className="cc-most-view-all" onClick={()=>clickNav('Portfolio')}>View All</button>,
    mostHost
  ):null;

  return <>{mostPortal}{collectionsPortal}</>;
}

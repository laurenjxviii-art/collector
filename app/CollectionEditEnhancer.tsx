'use client';

import {createPortal} from 'react-dom';
import {useEffect,useMemo,useState} from 'react';
import {Check,Pencil,X} from 'lucide-react';
import {Item,Store,itemLibraryType} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';

type CategoryConfig={
  coverImage?:string;
  progressBased?:boolean;
  target?:number;
};

type UiPreferences={
  brandCovers?:Record<string,string>;
  categoryConfigs?:Record<string,CategoryConfig>;
};

type EditTarget=
  |{kind:'brand';brand:string}
  |{kind:'category';brand:string;category:string};

type BrandHost={host:HTMLElement;brand:string};
type CategoryHost={host:HTMLElement;copy:HTMLElement|null;brand:string;category:string};
type ProductHost={host:HTMLElement;item:Item};

const DEFAULT_PREFS={
  accentColor:'#ff1f2d',
  density:'comfortable' as const,
  cardSize:'standard' as const,
  reducedMotion:false
};

function norm(v:unknown){
  return String(v||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}
function displayBrand(brand:string){
  if(brand==='McFarlane')return 'McFarlane Toys';
  if(brand==='POP MART')return 'Pop Mart';
  return brand;
}
function itemBrand(item:Item){
  return (item.identity?.brand||item.customFields?.Brand||'Unlabeled Brand').trim()||'Unlabeled Brand';
}
function isCardBrand(brand:string){
  return ['Magic: The Gathering','Union Arena','Pokémon','Topps','Panini','Bowman','Skybox'].includes(brand);
}
function categoryForItem(item:Item,brand:string){
  const series=(item.identity?.series||'').trim();
  const set=(item.customFields?.Set||'').trim();
  if(isCardBrand(brand))return series||set||item.category||'Other';
  if(brand==='Marvel Comics')return series||'Marvel Comics';

  const text=norm([
    item.name,series,item.customFields?.['Source / Title'],item.customFields?.Franchise
  ].filter(Boolean).join(' '));

  if(/doctor strange/.test(text))return 'Doctor Strange';
  if(/miles morales/.test(text))return 'Spider-Man';
  if(/spider man|spiderman|iron spider/.test(text))return 'Spider-Man';
  if(/venom|eddie brock/.test(text))return 'Venom';
  if(/ghost face|scream/.test(text))return 'Scream';
  if(/jujutsu kaisen|sukuna|gojo|megumi|itadori/.test(text))return 'Jujutsu Kaisen';
  if(/wicked|glinda/.test(text))return 'Wicked';
  if(/sanrio|cinnamoroll/.test(text))return 'Sanrio';
  if(/new york knicks|nba/.test(text))return 'NBA';
  if(/new york jets|nfl/.test(text))return 'NFL';
  if(/mlb|yankees/.test(text))return 'MLB';

  const franchise=(item.customFields?.Franchise||'').trim();
  if(franchise&&!['Marvel','Marvel Universe'].includes(franchise))return franchise;
  return series||franchise||item.category||'Other';
}
function categoryKey(brand:string,category:string){
  return `${norm(brand)}::${norm(category)}`;
}
function getPrefs(data:Store){
  const base=(data.preferences||DEFAULT_PREFS) as NonNullable<Store['preferences']>&UiPreferences;
  return base;
}
function distinctOwnedCount(items:Item[]){
  return new Set(items.filter(i=>i.status==='owned').map(i=>i.identity?.collectorNumber||i.identity?.upc||i.id)).size;
}
function ownedQuantity(items:Item[]){
  return items.filter(i=>i.status==='owned').reduce((n,i)=>n+Math.max(1,i.quantity),0);
}
function inferredTarget(brand:string,category:string,items:Item[]){
  for(const item of items){
    for(const key of ['Set Total','Total Cards','Cards in Set','Checklist Total','Total in Set','Total Items']){
      const n=Number((item.customFields?.[key]||'').replace(/[^0-9]/g,''));
      if(n>0)return n;
    }
  }
  const s=norm(`${brand} ${category} ${items.map(i=>`${i.identity?.setCode||''} ${i.identity?.series||''} ${i.identity?.collectorNumber||''}`).join(' ')}`);
  if(/union arena/.test(s)&&/vol 2|uex02/.test(s))return 90;
  if(/union arena/.test(s)&&/vol 1|ue03|jujutsu kaisen/.test(s))return 106;
  return 0;
}
function effectiveCategoryConfig(data:Store,brand:string,category:string,items:Item[]){
  const prefs=getPrefs(data);
  const saved=prefs.categoryConfigs?.[categoryKey(brand,category)];
  if(saved)return {
    coverImage:saved.coverImage||'',
    progressBased:!!saved.progressBased,
    target:Math.max(0,Number(saved.target)||0)
  };
  const target=inferredTarget(brand,category,items);
  return {coverImage:'',progressBased:target>0,target};
}
function identifier(item:Item){
  const rarity=(item.customFields?.Rarity||'').trim();
  const number=(item.identity?.collectorNumber||item.customFields?.['Card #']||item.identity?.modelNumber||'').trim();
  const edition=(item.identity?.edition||'').trim();

  const bits:string[]=[];
  if(rarity)bits.push(rarity);
  else if(edition&&edition.toLowerCase()!=='normal')bits.push(edition);
  if(number)bits.push(number);
  return bits.join(' • ');
}
function pctChange(item:Item){
  const points=(item.priceHistory||[]).filter(p=>p.kind!=='sale').toSorted((a,b)=>a.date.localeCompare(b.date));
  if(points.length<2)return {change:0,pct:0};
  const current=points.at(-1)?.value??item.currentValue;
  const previous=points[Math.max(0,points.length-8)]?.value??current;
  const change=current-previous;
  return {change,pct:previous?change/previous*100:0};
}
function findActualBrand(data:Store,label:string){
  const brands=Array.from(new Set(data.items.map(itemBrand)));
  return brands.find(b=>norm(displayBrand(b))===norm(label))||label;
}
function sameElements<T extends {host:HTMLElement}>(a:T[],b:T[]){
  return a.length===b.length&&a.every((x,i)=>x.host===b[i]?.host);
}

export default function CollectionEditEnhancer(){
  const cloud=useWorkspace();
  const {data,ready}=cloud;
  const [editMode,setEditMode]=useState(false);
  const [target,setTarget]=useState<EditTarget|null>(null);
  const [penHost,setPenHost]=useState<HTMLElement|null>(null);
  const [pagePenHost,setPagePenHost]=useState<HTMLElement|null>(null);
  const [brandHosts,setBrandHosts]=useState<BrandHost[]>([]);
  const [categoryHosts,setCategoryHosts]=useState<CategoryHost[]>([]);
  const [productHosts,setProductHosts]=useState<ProductHost[]>([]);

  const prefs=getPrefs(data);

  function savePreferences(nextUi:UiPreferences){
    const base=(data.preferences||DEFAULT_PREFS) as NonNullable<Store['preferences']>&UiPreferences;
    cloud.update({
      ...data,
      preferences:{
        ...base,
        ...nextUi
      } as Store['preferences']
    });
  }

  useEffect(()=>{
    if(!ready)return;

    let raf=0;
    const scan=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const topbar=document.querySelector<HTMLElement>('.brand-topbar');
        let nextPen:HTMLElement|null=null;
        if(topbar){
          nextPen=topbar.querySelector<HTMLElement>(':scope > .ce-pen-host');
          if(!nextPen){
            nextPen=document.createElement('span');
            nextPen.className='ce-pen-host';
            const filter=topbar.querySelector('.brand-filter-wrap');
            topbar.insertBefore(nextPen,filter||null);
          }
        }
        setPenHost(prev=>prev===nextPen?prev:nextPen);

        const pageHead=document.querySelector<HTMLElement>('.brand-page-head');
        const categoryGrid=document.querySelector('.brand-category-grid');
        let nextPagePen:HTMLElement|null=null;
        if(pageHead&&categoryGrid){
          nextPagePen=pageHead.querySelector<HTMLElement>(':scope > .ce-page-pen-host');
          if(!nextPagePen){
            nextPagePen=document.createElement('span');
            nextPagePen.className='ce-page-pen-host';
            pageHead.appendChild(nextPagePen);
          }
        }
        setPagePenHost(prev=>prev===nextPagePen?prev:nextPagePen);

        const nextBrands:BrandHost[]=[];
        document.querySelectorAll<HTMLElement>('.brand-grid .brand-tile').forEach(tile=>{
          const label=tile.getAttribute('aria-label')||tile.getAttribute('title')||'';
          const brand=findActualBrand(data,label);
          let host=tile.querySelector<HTMLElement>(':scope > .ce-brand-host');
          if(!host){
            host=document.createElement('span');
            host.className='ce-brand-host';
            tile.appendChild(host);
          }
          nextBrands.push({host,brand});
        });
        setBrandHosts(prev=>sameElements(prev,nextBrands)?prev:nextBrands);

        const brandLabel=document.querySelector<HTMLElement>('.brand-page-head small')?.textContent?.trim()||'';
        const actualBrand=findActualBrand(data,brandLabel);
        const nextCategories:CategoryHost[]=[];
        document.querySelectorAll<HTMLElement>('.brand-category-card').forEach(card=>{
          const category=card.querySelector<HTMLElement>('.brand-category-copy h2')?.textContent?.trim()||'';
          const cover=card.querySelector<HTMLElement>('.brand-category-cover');
          if(!cover||!category)return;
          let host=cover.querySelector<HTMLElement>(':scope > .ce-category-host');
          if(!host){
            host=document.createElement('span');
            host.className='ce-category-host';
            cover.appendChild(host);
          }
          nextCategories.push({
            host,
            copy:card.querySelector<HTMLElement>('.brand-category-copy'),
            brand:actualBrand,
            category
          });
        });
        setCategoryHosts(prev=>sameElements(prev,nextCategories)?prev:nextCategories);

        const nextProducts:ProductHost[]=[];
        document.querySelectorAll<HTMLElement>('.cc-product-card').forEach(card=>{
          const name=card.querySelector<HTMLElement>('h3')?.textContent?.trim()||'';
          const series=card.querySelector<HTMLElement>('.cc-product-copy a')?.textContent?.trim()||'';
          const item=data.items.find(i=>i.name===name&&(norm(i.identity?.series||i.category)===norm(series)||!series))
            ||data.items.find(i=>i.name===name);
          const copy=card.querySelector<HTMLElement>('.cc-product-copy');
          if(!item||!copy)return;

          let host=copy.querySelector<HTMLElement>(':scope > .ce-product-meta-host');
          if(!host){
            host=document.createElement('div');
            host.className='ce-product-meta-host';
            const link=copy.querySelector('a');
            if(link?.nextSibling)copy.insertBefore(host,link.nextSibling);
            else copy.appendChild(host);
          }
          nextProducts.push({host,item});
        });
        setProductHosts(prev=>sameElements(prev,nextProducts)?prev:nextProducts);
      });
    };

    scan();
    const observer=new MutationObserver(scan);
    const root=document.querySelector('.cc-main')||document.body;
    observer.observe(root,{childList:true,subtree:true});
    return()=>{observer.disconnect();cancelAnimationFrame(raf)};
  },[ready,data,editMode]);

  useEffect(()=>{
    for(const entry of categoryHosts){
      const items=data.items.filter(i=>itemBrand(i)===entry.brand&&categoryForItem(i,entry.brand)===entry.category);
      const config=effectiveCategoryConfig(data,entry.brand,entry.category,items);
      const firstP=entry.copy?.querySelector<HTMLElement>('p');
      if(firstP){
        const owned=config.progressBased?distinctOwnedCount(items):ownedQuantity(items);
        const text=config.progressBased&&config.target>0
          ?`Progress: ${owned} / ${config.target}`
          :`Items: ${ownedQuantity(items)}`;
        if(firstP.textContent!==text)firstP.textContent=text;
      }
    }
  },[categoryHosts,data]);

  const portals=[
    penHost&&createPortal(
      <button
        type="button"
        className={`ce-pen-button ${editMode?'active':''}`}
        onClick={()=>setEditMode(v=>!v)}
        aria-label={editMode?'Exit collection edit mode':'Edit collections'}
        title={editMode?'Done editing':'Edit collections'}
      >
        {editMode?<Check size={21}/>:<Pencil size={20}/>}
      </button>,
      penHost
    ),
    pagePenHost&&createPortal(
      <button
        type="button"
        className={`ce-page-pen-button ${editMode?'active':''}`}
        onClick={()=>setEditMode(v=>!v)}
        aria-label={editMode?'Exit collection edit mode':'Edit collections'}
      >
        {editMode?<Check size={18}/>:<Pencil size={17}/>}
      </button>,
      pagePenHost
    ),
    ...brandHosts.map(({host,brand})=>{
      const custom=prefs.brandCovers?.[brand]||'';
      return createPortal(
        <>
          {custom&&<img className="ce-custom-cover" src={custom} alt=""/>}
          {editMode&&<span
            className="ce-edit-overlay"
            role="button"
            tabIndex={0}
            onClick={e=>{e.preventDefault();e.stopPropagation();setTarget({kind:'brand',brand})}}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();setTarget({kind:'brand',brand})}}}
          ><Pencil size={13}/> Edit</span>}
        </>,
        host,
        `brand-${brand}`
      );
    }),
    ...categoryHosts.map(({host,brand,category})=>{
      const items=data.items.filter(i=>itemBrand(i)===brand&&categoryForItem(i,brand)===category);
      const config=effectiveCategoryConfig(data,brand,category,items);
      const owned=config.progressBased?distinctOwnedCount(items):0;
      const pct=config.progressBased&&config.target>0?Math.min(100,owned/config.target*100):0;
      return createPortal(
        <>
          {config.coverImage&&<img className="ce-custom-cover ce-category-custom-cover" src={config.coverImage} alt=""/>}
          {config.progressBased&&config.target>0&&<span className="ce-progress">
            <i><em style={{width:`${pct}%`}}/></i>
            <b>{pct.toFixed(0)}%</b>
          </span>}
          {editMode&&<span
            className="ce-edit-overlay"
            role="button"
            tabIndex={0}
            onClick={e=>{e.preventDefault();e.stopPropagation();setTarget({kind:'category',brand,category})}}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();setTarget({kind:'category',brand,category})}}}
          ><Pencil size={13}/> Edit</span>}
        </>,
        host,
        `category-${brand}-${category}`
      );
    }),
    ...productHosts.map(({host,item})=>createPortal(
      <ProductMeta item={item}/>,
      host,
      `product-${item.id}`
    ))
  ].filter(Boolean);

  return <>
    {portals}
    {target&&<EditModal
      target={target}
      data={data}
      close={()=>setTarget(null)}
      save={(coverImage,progressBased,targetCount)=>{
        if(target.kind==='brand'){
          const brandCovers={...(prefs.brandCovers||{})};
          if(coverImage)brandCovers[target.brand]=coverImage;
          else delete brandCovers[target.brand];
          savePreferences({brandCovers});
        }else{
          const categoryConfigs={...(prefs.categoryConfigs||{})};
          categoryConfigs[categoryKey(target.brand,target.category)]={
            coverImage,
            progressBased,
            target:progressBased?Math.max(1,targetCount):0
          };
          savePreferences({categoryConfigs});
        }
        setTarget(null);
      }}
    />}
  </>;
}

function ProductMeta({item}:{item:Item}){
  const id=identifier(item);
  const {change,pct}=pctChange(item);
  return <div className="ce-card-meta">
    {id&&<div className="ce-card-identifier">{id}</div>}
    <div className="ce-card-market">
      <strong>{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(item.currentValue)}</strong>
      <small className={change>=0?'gain':'loss'}>
        {change>=0?'▲':'▼'} {change>=0?'+':'-'}{new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(Math.abs(change))} ({pct>=0?'+':''}{pct.toFixed(2)}%)
      </small>
      <span>Qty: {item.status==='owned'?item.quantity:0}</span>
    </div>
  </div>;
}

function EditModal({
  target,data,close,save
}:{
  target:EditTarget;
  data:Store;
  close:()=>void;
  save:(coverImage:string,progressBased:boolean,target:number)=>void;
}){
  const prefs=getPrefs(data);
  const categoryItems=target.kind==='category'
    ?data.items.filter(i=>itemBrand(i)===target.brand&&categoryForItem(i,target.brand)===target.category)
    :[];
  const current=target.kind==='category'
    ?effectiveCategoryConfig(data,target.brand,target.category,categoryItems)
    :{coverImage:prefs.brandCovers?.[target.brand]||'',progressBased:false,target:0};

  const [coverImage,setCoverImage]=useState(current.coverImage||'');
  const [progressBased,setProgressBased]=useState(!!current.progressBased);
  const [targetCount,setTargetCount]=useState(Math.max(0,current.target||0));

  function upload(file?:File){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>setCoverImage(String(reader.result||''));
    reader.readAsDataURL(file);
  }

  return <div className="overlay ce-overlay">
    <form className="modal ce-modal" onSubmit={e=>{
      e.preventDefault();
      save(coverImage,progressBased,targetCount);
    }}>
      <div className="modal-header">
        <div>
          <small>{target.kind==='brand'?'EDIT BRAND':'EDIT COLLECTION'}</small>
          <h2>{target.kind==='brand'?displayBrand(target.brand):target.category}</h2>
        </div>
        <button type="button" onClick={close}><X/></button>
      </div>

      <div className="ce-modal-body">
        <label className="ce-cover-label">Cover image
          <div className="ce-cover-preview">
            {coverImage?<img src={coverImage} alt="Cover preview"/>:<span>No custom cover</span>}
          </div>
          <input
            type="text"
            value={coverImage.startsWith('data:')?'':coverImage}
            onChange={e=>setCoverImage(e.target.value)}
            placeholder="Image URL"
          />
          <span className="ce-file-button">
            Upload image
            <input hidden type="file" accept="image/*" onChange={e=>upload(e.target.files?.[0])}/>
          </span>
          {coverImage&&<button type="button" className="ce-remove-cover" onClick={()=>setCoverImage('')}>Use automatic cover</button>}
        </label>

        {target.kind==='category'&&<>
          <label className="ce-progress-check">
            <input
              type="checkbox"
              checked={progressBased}
              onChange={e=>setProgressBased(e.target.checked)}
            />
            <span><b>Progress-based collection</b><small>Show Collectr-style completion progress on this collection.</small></span>
          </label>

          {progressBased&&<label className="ce-target-input">
            Items needed to complete
            <input
              type="number"
              min="1"
              step="1"
              value={targetCount||''}
              onChange={e=>setTargetCount(Math.max(0,Number(e.target.value)||0))}
              required
            />
            <small>Currently owned: {distinctOwnedCount(categoryItems)} unique items</small>
          </label>}
        </>}
      </div>

      <div className="modal-actions">
        <button type="button" className="secondary" onClick={close}>Cancel</button>
        <button className="primary">Save</button>
      </div>
    </form>
  </div>;
}

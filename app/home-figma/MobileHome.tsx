'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type ReactNode,type RefObject} from 'react';
import {Bell,CalendarCheck,Check,CircleDollarSign,House,Layers,Minus,Monitor,Plus,Radar,Search,Share2,ShoppingBag,Star,X} from 'lucide-react';
import type {VexumModuleId,WidgetPlacement} from '../../lib/platform';
import {VexumDialog} from '../VexumUi';
import {MOBILE_WIDGETS,geometry,mobileCategory,mobileSelection,mobileSizes,packMobile,span,toPlacements,usesFit,type MobileRow,type MobileSize} from './mobile-layout';

type Nav=(module:VexumModuleId,section?:string)=>void;
type Props={
 stageRef:RefObject<HTMLDivElement|null>;
 saved:WidgetPlacement[]|undefined;
 onSave:(rows:WidgetPlacement[])=>void;
 renderWidget:(id:string,fit:boolean,preview?:boolean)=>ReactNode;
 menu:string|null;setMenu:(id:string|null)=>void;
 title:(id:string)=>string;destination:(name:string)=>{module:VexumModuleId;section?:string};
 navigate:Nav;now:Date;unread:number;displayName:string;
 onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void;
 /** Called after widgets mount or move so long live values can be refitted. */
 onLayout?:()=>void;
};
const SIZE_LABEL:Record<MobileSize,string>={small:'Small',medium:'Medium',large:'Large'};
const CHIPS=['All','Collect','Money','Life','Wishlist','Setup','Social'];
const NAV:Array<[VexumModuleId,string,typeof House]>=[['home','Home',House],['life','Life',CalendarCheck],['portfolio','Portfolio',Layers],['search','Search',Search],['wishlist','Wishlist',Star],['radar','Radar',Radar],['sell','Sell',ShoppingBag],['setup','Setup',Monitor],['financial','Financial',CircleDollarSign],['social','Social',Share2]];
const reduced=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Measures a grid's width so each widget can scale from its native Figma size. */
function useWidth(ref:RefObject<HTMLElement|null>,active=true){
 const [width,setWidth]=useState(0);
 useEffect(()=>{const el=ref.current;if(!el||!active)return;const on=()=>setWidth(el.clientWidth);on();const o=new ResizeObserver(on);o.observe(el);return()=>o.disconnect()},[ref,active]);
 return width;
}

function WidgetFrame({id,size,colWidth,renderWidget,preview=false}:{id:string;size:MobileSize;colWidth:number;renderWidget:Props['renderWidget'];preview?:boolean}){
 const g=geometry(colWidth),{w,h}=span(size),box=g.place(0,0,w,h),fit=usesFit(id,size);
 return <div className={'vxm-frame'+(fit?' vxm-fit':'')} data-fit={fit?id:undefined} style={{width:box.width/g.scale,height:box.height/g.scale,transform:`scale(${g.scale})`}}>{renderWidget(id,fit,preview)}</div>;
}

export default function MobileHome(p:Props){
 const saved=useMemo(()=>mobileSelection(p.saved),[p.saved]);
 const [draft,setDraft]=useState<MobileRow[]|null>(null),[sheet,setSheet]=useState(false),[announce,setAnnounce]=useState('');
 const rows=draft||saved,editing=!!draft;
 const grid=useRef<HTMLDivElement>(null),width=useWidth(grid);
 const colWidth=Math.max(120,(width-12)/2),g=geometry(colWidth),packed=packMobile(rows);
 const [drag,setDrag]=useState<{id:string;x:number;y:number}|null>(null);
 const gesture=useRef<{el:HTMLElement;id:string;pointerId:number;startX:number;startY:number;grabX:number;grabY:number;timer:number;active:boolean;target:string|null;clientX:number;clientY:number}|null>(null);
 const suppressClick=useRef(false),frame=useRef(0),rowsRef=useRef(rows);rowsRef.current=rows;

 const commit=(next:MobileRow[])=>{if(draft)setDraft(next);else p.onSave(toPlacements(next));};
 const enterEdit=()=>{if(!draft){setDraft(saved.map(r=>({...r})));setAnnounce('Editing Home. Drag to reorder, tap minus to remove.');try{navigator.vibrate?.(12)}catch{}}};
 const done=()=>{if(draft)p.onSave(toPlacements(draft));setDraft(null);setDrag(null);setAnnounce('Home saved.');};
 const remove=(id:string)=>{commit(rows.filter(r=>r.id!==id));setAnnounce(p.title(id)+' removed.');};
 const resize=(id:string,size:MobileSize)=>commit(rows.map(r=>r.id===id?{...r,size}:r));
 const add=(id:string,size:MobileSize)=>{commit([...rows.filter(r=>r.id!==id),{id,size}]);setAnnounce(p.title(id)+' added to Home.');};

 // Touch scrolling stays native until a drag has actually started.
 useEffect(()=>{const el=grid.current;if(!el)return;const block=(e:TouchEvent)=>{if(gesture.current?.active)e.preventDefault()};el.addEventListener('touchmove',block,{passive:false});return()=>el.removeEventListener('touchmove',block)},[]);
 const layoutKey=rows.map(r=>r.id+r.size).join();
 useEffect(()=>{if(width>0)p.onLayout?.()},[width,layoutKey]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>()=>{cancelAnimationFrame(frame.current);if(gesture.current)clearTimeout(gesture.current.timer)},[]);

 function track(clientX:number,clientY:number){
  const gs=gesture.current,el=grid.current;if(!gs?.active||!el)return;
  const r=el.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;
  setDrag({id:gs.id,x:x-gs.grabX,y:y-gs.grabY});
  const current=rowsRef.current,layout=packMobile(current).items;
  const hit=layout.find(it=>{if(it.id===gs.id)return false;const b=g.place(it.x,it.y,it.w,it.h);return x>=b.left&&x<=b.left+b.width&&y>=b.top&&y<=b.top+b.height;});
  if(!hit){gs.target=null;return}
  if(hit.id===gs.target)return;gs.target=hit.id;
  const from=current.findIndex(r=>r.id===gs.id),to=current.findIndex(r=>r.id===hit.id),next=[...current],[moved]=next.splice(from,1);next.splice(to,0,moved);setDraft(next);
 }
 function beginDrag(){const gs=gesture.current;if(!gs)return;gs.active=true;try{gs.el.setPointerCapture(gs.pointerId)}catch{}suppressClick.current=true;try{navigator.vibrate?.(8)}catch{}
  const tick=()=>{const s=gesture.current;if(!s?.active)return;const y=s.clientY;if(y>window.innerHeight-110)window.scrollBy(0,9);else if(y<90)window.scrollBy(0,-9);track(s.clientX,y);frame.current=requestAnimationFrame(tick)};frame.current=requestAnimationFrame(tick);
 }
 function onDown(e:ReactPointerEvent<HTMLElement>,id:string){
  if(e.button!==0||sheet)return;
  const el=grid.current;if(!el)return;const r=el.getBoundingClientRect(),it=packed.items.find(i=>i.id===id)!,b=g.place(it.x,it.y,it.w,it.h);
  if(gesture.current)clearTimeout(gesture.current.timer);
  const wasEditing=editing;
  gesture.current={el:e.currentTarget,id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,clientX:e.clientX,clientY:e.clientY,grabX:e.clientX-r.left-b.left,grabY:e.clientY-r.top-b.top,active:false,target:null,
   timer:window.setTimeout(()=>{if(!wasEditing)enterEdit();beginDrag();},wasEditing?160:450)};
 }
 function onMove(e:ReactPointerEvent<HTMLElement>){
  const gs=gesture.current;if(!gs||gs.pointerId!==e.pointerId)return;gs.clientX=e.clientX;gs.clientY=e.clientY;
  if(!gs.active){if(Math.hypot(e.clientX-gs.startX,e.clientY-gs.startY)>8){clearTimeout(gs.timer);gesture.current=null;}return}
  track(e.clientX,e.clientY);
 }
 function onUp(){const gs=gesture.current;if(!gs)return;clearTimeout(gs.timer);cancelAnimationFrame(frame.current);if(gs.active){setAnnounce(p.title(gs.id)+' moved.');setTimeout(()=>{suppressClick.current=false},0);}gesture.current=null;setDrag(null);}

 const hour=p.now.getHours(),greeting=hour<5?'Good evening.':hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
 const date=p.now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
 const menuId=p.menu,menuRoute=menuId?p.destination(p.title(menuId)):null,menuRow=rows.find(r=>r.id===menuId);

 return <>
  <div className="vxf-home vxm-home" ref={p.stageRef} id="vexum-main" tabIndex={-1}>
   <header className="vxm-top">
    <button className="vxm-logo" aria-label="VEXUM Home" onClick={()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'})}><img src="/home-figma/9df8b061-725b-46d6-a8a0-aaec0d946ecd.png" alt="VEXUM" draggable={false}/></button>
    <div className="vxm-top-actions">
     <button className="vxm-round" aria-label="Quick add" onClick={p.onQuick}><Plus size={18}/></button>
     <button className="vxm-round" aria-label={p.unread?`Notifications, ${p.unread} unread`:'Notifications'} onClick={p.onNotifications}><Bell size={18}/>{p.unread?<span className="vxm-dot"/>:null}</button>
     <button className="vxm-round vxm-avatar" aria-label="Profile" onClick={p.onProfile}>{p.displayName[0]?.toUpperCase()||'V'}</button>
    </div>
   </header>
   <p className="vxm-date">{date}</p>
   <h1 className="vxm-greeting">{greeting}</h1>
   {editing?<div className="vxm-editbar"><span>Drag to reorder · tap − to remove</span><button onClick={done}>Done</button></div>:null}
   <p className="vxm-sr" role="status" aria-live="polite">{announce}</p>
   <div ref={grid} className={'vxm-grid'+(editing?' is-editing':'')} style={{height:packed.rows?packed.rows*(g.row+12)-12:0}} onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}>
    {width>0&&packed.items.map((it,i)=>{const b=g.place(it.x,it.y,it.w,it.h),dragging=drag?.id===it.id,sizes=mobileSizes(it.id);
     const style:CSSProperties={width:b.width,height:b.height,transform:`translate(${dragging?drag.x:b.left}px,${dragging?drag.y:b.top}px)`,zIndex:dragging?20:1,['--i' as string]:i%4};
     return <section key={it.id} className={'vxm-widget'+(dragging?' is-dragging':'')} style={style} aria-label={p.title(it.id)} data-widget-id={it.id} data-size={it.size}
      onPointerDown={e=>onDown(e,it.id)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onContextMenu={e=>e.preventDefault()}>
      <div className="vxm-clip" inert={editing}><WidgetFrame id={it.id} size={it.size} colWidth={colWidth} renderWidget={p.renderWidget}/></div>
      {editing?<>
       <button className="vxm-remove" aria-label={'Remove '+p.title(it.id)} onPointerDown={e=>e.stopPropagation()} onClick={()=>remove(it.id)}><Minus size={12} strokeWidth={3}/></button>
       {sizes.length>1?<button className="vxm-size" aria-label={p.title(it.id)+' size: '+SIZE_LABEL[it.size]+'. Change size'} onPointerDown={e=>e.stopPropagation()} onClick={()=>resize(it.id,sizes[(sizes.indexOf(it.size)+1)%sizes.length])}>{SIZE_LABEL[it.size]}</button>:null}
      </>:null}
     </section>;})}
   </div>
   {!rows.length?<div className="vxm-empty"><strong>Make room for what matters.</strong><span>Add a few widgets to build your Home.</span></div>:null}
   <button className="vxm-add" onClick={()=>setSheet(true)}><Plus size={16}/>Add widget</button>
   <nav className="vxm-dock" aria-label="Sections">
    {NAV.map(([id,label,Icon])=><button key={id} className={id==='home'?'is-active':''} aria-label={label} aria-current={id==='home'?'page':undefined} onClick={()=>id==='home'?window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'}):p.navigate(id)}><Icon size={18}/>{id==='home'?<span>Home</span>:null}</button>)}
   </nav>
  </div>
  {sheet?<AddSheet rows={rows} onClose={()=>setSheet(false)} onAdd={add} onRemove={remove} renderWidget={p.renderWidget} title={p.title}/>:null}
  <VexumDialog open={!!menuId} onClose={()=>p.setMenu(null)} title={menuId?p.title(menuId):'Widget'} size="sm">
   <div className="vxm-menu">
    {menuRoute?<button onClick={()=>{p.setMenu(null);p.navigate(menuRoute.module,menuRoute.section)}}>Open {menuRoute.module[0].toUpperCase()+menuRoute.module.slice(1)}</button>:null}
    {menuId&&menuRow&&mobileSizes(menuId).length>1?<div className="vxm-menu-sizes" role="group" aria-label="Size">{mobileSizes(menuId).map(s=><button key={s} aria-pressed={menuRow.size===s} onClick={()=>resize(menuId,s)}>{SIZE_LABEL[s]}</button>)}</div>:null}
    <button onClick={()=>{p.setMenu(null);enterEdit()}}>Edit Home</button>
    <button onClick={()=>{p.setMenu(null);setSheet(true)}}>Add widget</button>
    {menuId?<button className="danger" onClick={()=>{remove(menuId);p.setMenu(null)}}>Remove from Home</button>:null}
   </div>
  </VexumDialog>
 </>;
}

function AddSheet({rows,onClose,onAdd,onRemove,renderWidget,title}:{rows:MobileRow[];onClose:()=>void;onAdd:(id:string,size:MobileSize)=>void;onRemove:(id:string)=>void;renderWidget:Props['renderWidget'];title:(id:string)=>string}){
 const [query,setQuery]=useState(''),[chip,setChip]=useState('All'),[size,setSize]=useState<MobileSize>('small'),[closing,setClosing]=useState(false);
 const panel=useRef<HTMLDivElement>(null),list=useRef<HTMLDivElement>(null),width=useWidth(list),colWidth=Math.max(120,(width-12)/2);
 const pull=useRef<{y:number;dy:number}|null>(null),[pullY,setPullY]=useState(0);
 const close=()=>{if(reduced()){onClose();return}setClosing(true);setTimeout(onClose,200)};
 useEffect(()=>{panel.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};document.addEventListener('keydown',key);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow}},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const onHome=new Map(rows.map(r=>[r.id,r.size]));
 const available=MOBILE_WIDGETS.filter(w=>mobileSizes(w.id).includes(size));
 const shown=available.filter(w=>(chip==='All'||mobileCategory(title(w.id))===chip)&&title(w.id).toLowerCase().includes(query.trim().toLowerCase())).toSorted((a,b)=>Number(onHome.has(a.id))-Number(onHome.has(b.id)));
 const g=geometry(colWidth);
 return <div className={'vxm-sheet-root'+(closing?' is-closing':'')}>
  <div className="vxm-scrim" onClick={close}/>
  <div ref={panel} className="vxm-sheet" role="dialog" aria-modal="true" aria-label="Add widget" tabIndex={-1} style={pullY?{transform:`translateY(${pullY}px)`,transition:'none'}:undefined}>
   <div className="vxm-grabber" onPointerDown={e=>{pull.current={y:e.clientY,dy:0};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(pull.current){pull.current.dy=Math.max(0,e.clientY-pull.current.y);setPullY(pull.current.dy)}}} onPointerUp={()=>{const d=pull.current?.dy||0;pull.current=null;setPullY(0);if(d>90)close()}}><span/></div>
   <div className="vxm-sheet-head"><h2>Add widget</h2><button className="vxm-close" aria-label="Close" onClick={close}><X size={16}/></button></div>
   <label className="vxm-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${available.length} widgets`} aria-label="Search widgets" enterKeyHint="search"/>{query?<button aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>:null}</label>
   <div className="vxm-chips" role="group" aria-label="Categories">{CHIPS.map(c=><button key={c} aria-pressed={chip===c} onClick={()=>setChip(c)}>{c}</button>)}</div>
   <div className="vxm-seg" role="group" aria-label="Widget size">{(['small','medium','large'] as MobileSize[]).map(s=><button key={s} aria-pressed={size===s} onClick={()=>setSize(s)}>{SIZE_LABEL[s]}</button>)}</div>
   <div className="vxm-sheet-sub"><strong>{query||chip!=='All'?'Results':'Suggested for you'}</strong><span>{shown.length} {shown.length===1?'widget':'widgets'}</span></div>
   <div className="vxm-sheet-scroll"><div ref={list} className="vxm-sheet-grid">
    {width>0&&shown.map(w=>{const current=onHome.get(w.id),here=current===size,{w:cols,h}=span(size),b=g.place(0,0,cols,h);
     return <div key={w.id} className={'vxm-card'+(here?' is-added':'')} style={{gridColumn:cols===2?'span 2':undefined,height:b.height}}>
      <div className="vxf-home vxm-home vxm-preview" aria-hidden="true" inert><WidgetFrame id={w.id} size={size} colWidth={colWidth} renderWidget={renderWidget} preview/></div>
      <button className="vxm-card-add" aria-pressed={here} aria-label={(here?'Remove ':current?'Change to '+SIZE_LABEL[size]+' ':'Add ')+title(w.id)} onClick={()=>here?onRemove(w.id):onAdd(w.id,size)}>{here?<Check size={14} strokeWidth={3}/>:<Plus size={14} strokeWidth={3}/>}</button>
     </div>;})}
    {!shown.length?<p className="vxm-none">No {SIZE_LABEL[size].toLowerCase()} widgets match. Try another size or category.</p>:null}
   </div></div>
  </div>
 </div>;
}

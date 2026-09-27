'use client';

import {createElement,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import ControlCenter from './ControlCenter';
import MobileHome from './MobileHome';
import {MOBILE_FITS,MOBILE_LAYOUT_KEY} from './mobile-layout';
import rawNodes from './nodes.json';
import widgets from './widgets.json';
import {homeBindings,type Auxiliary,type Series} from './data';
import {HOME_LAYOUT_KEY,homeWidgetSelection,packHomeWidgets} from './widget-layout';
import type {useWorkspace} from '../../lib/useWorkspace';
import {normalizePlatformState,type VexumModuleId,type WidgetPlacement} from '../../lib/platform';
import {normalizeLifeData,todayKey} from '../../lib/life';
import {loadSellWorkspace} from '../../lib/sellCloud';
import {loadSocialFeed,listDropEvents} from '../../lib/socialCloud';
import {profileStats} from '../../lib/social';
import {VexumDialog} from '../VexumUi';

type Node={tag:string;id:string;className:string;name?:string;children:Array<Node|string>;src?:string;alt?:string;style?:CSSProperties};
const nodes=rawNodes as unknown as Record<string,Node>;
type Workspace=ReturnType<typeof useWorkspace>;
export type HomeProps={workspace:Workspace;displayName:string;unread:number;onCommand:()=>void;onAsk:()=>void;onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void;onSettings:()=>void;navigate:(module:VexumModuleId,section?:string)=>void};
const EMPTY_AUX:Auxiliary={sell:null,posts:null,drops:null,stats:null};
const title=(id:string)=>widgets.find(w=>w.id===id)?.name.split(' / ').at(-1)||'Widget';
function destination(name:string):{module:VexumModuleId;section?:string}{
 if(/Calendar|Upcoming Events|Next Up/.test(name))return {module:'life',section:'Calendar'};
 if(/Focus/.test(name))return {module:'life',section:'Focus'};
 if(/Habit/.test(name))return {module:'life',section:'Habits'};
 if(/Workouts/.test(name))return {module:'life',section:'Fitness'};
 if(/Task|Today|Daily Note|Goal Progress/.test(name))return {module:'life',section:'Today'};
 if(/Wishlist|Grail/.test(name))return {module:'wishlist'};
 if(/Radar|Tracking|Price|Drop/.test(name))return {module:'radar'};
 if(/Setup|Space|Spot|Shelf/.test(name))return {module:'setup'};
 if(/Bill/.test(name))return {module:'financial',section:'Bills'};
 if(/Debt/.test(name))return {module:'financial',section:'Debt'};
 if(/Saving/.test(name))return {module:'financial',section:'Goals'};
 if(/Budget/.test(name))return {module:'financial',section:'Budget'};
 if(/Spend|Cash|Net Worth/.test(name))return {module:'financial'};
 if(/Offers/.test(name))return {module:'sell',section:'Offers'};
 if(/Listings/.test(name))return {module:'sell',section:'Listings'};
 if(/Sell|Revenue|Realized|Payout/.test(name))return {module:'sell'};
 if(/Social|Post|Followers|Rep/.test(name))return {module:'social'};
 return {module:'portfolio'};
}

function LiveChart({series}: {series:Series}){
 const uid=useId().replaceAll(':',''),color=series.color||'#00e5a1';
 if(series.ring!==undefined)return <svg className="vxf-chart" viewBox="0 0 100 100" aria-label={'Progress '+Math.round(series.ring)+'%'}><circle cx="50" cy="50" r="43" fill="none" stroke="#222628" strokeWidth="9"/><circle cx="50" cy="50" r="43" fill="none" stroke={color} strokeWidth="9" pathLength="100" strokeDasharray={series.ring+' 100'} transform="rotate(-90 50 50)"/></svg>;
 if(series.segments){let offset=0;const total=series.segments.reduce((s,n)=>s+n,0);return <svg className="vxf-chart" viewBox="0 0 100 100" aria-label="Allocation"><circle cx="50" cy="50" r="43" fill="none" stroke="#222628" strokeWidth="13"/>{series.segments.map((n,i)=>{const length=total?n/total*100:0;const start=offset;offset+=length;return <circle key={i} cx="50" cy="50" r="43" fill="none" stroke={series.palette?.[i]||color} strokeWidth="13" pathLength="100" strokeDasharray={length+' '+(100-length)} strokeDashoffset={-start} transform="rotate(-90 50 50)"/>})}</svg>}
 const values=series.values.filter(Number.isFinite);if(values.length<2)return <span className="vxf-no-series" aria-label="Not enough recorded history"/>;
 const domain=series.baseline===undefined?values:[...values,series.baseline];const min=Math.min(...domain),max=Math.max(...domain),span=max-min||1;const points=values.map((n,i)=>[i/(values.length-1)*100,96-(n-min)/span*90]);const d=points.map(([x,y],i)=>(i?'L':'M')+x+','+y).join(' ');
 return <svg className="vxf-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Recorded history"><defs><linearGradient id={uid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".24"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>{series.area?<path d={d+' L100,100 L0,100 Z'} fill={'url(#'+uid+')'}/>:null}{series.baseline!==undefined?<path d={'M0,'+(96-(series.baseline-min)/span*90)+' H100'} fill="none" stroke="#8f9498" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke"/>:null}<path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg>;
}

/** Phones get the separately designed Figma mobile Home; wider screens keep the desktop port untouched. */
const PHONE_QUERY='(max-width: 700px)';
function usePhone(){
 const [phone,setPhone]=useState(false);
 useLayoutEffect(()=>{const q=window.matchMedia(PHONE_QUERY),on=()=>setPhone(q.matches);on();q.addEventListener('change',on);return()=>q.removeEventListener('change',on)},[]);
 return phone;
}
const MOBILE_HIDDEN=Object.fromEntries(Object.entries(MOBILE_FITS).map(([id,fit])=>[id,new Set(fit.hidden)]));

export default function FigmaHome(props:HomeProps){
 const phone=usePhone(),[fitTick,setFitTick]=useState(0);
 const {workspace}=props,store=workspace.data,platform=normalizePlatformState(store.platform,true);
 const [aux,setAux]=useState<Auxiliary>(EMPTY_AUX),[now,setNow]=useState(()=>new Date()),[ranges,setRanges]=useState<Record<string,string>>({overall:'6M',portfolio:'1M',radar:'30D',sell:'30D'});
 const [cursor,setCursor]=useState(()=>new Date()),[menu,setMenu]=useState<string|null>(null),[libraryRequest,setLibraryRequest]=useState(0),[contentWidth,setContentWidth]=useState(1614);
 const stage=useRef<HTMLDivElement>(null),life=normalizeLifeData(store.life);
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{const el=stage.current;if(!el||phone)return;const resize=()=>{const css=getComputedStyle(el);setContentWidth(Math.max(200,el.clientWidth-parseFloat(css.getPropertyValue('--vxf-sidebar-width'))-2*parseFloat(css.getPropertyValue('--vxf-gutter'))))};resize();const observer=new ResizeObserver(resize);observer.observe(el);return()=>observer.disconnect()},[phone]);
 useEffect(()=>{let live=true;setAux(EMPTY_AUX);const config=workspace.config,session=workspace.session;if(!config?.configured||!session)return;const tasks=[loadSellWorkspace(config,session),loadSocialFeed(config,session,'following'),listDropEvents(config,session),profileStats(config,session.user.id)] as const;
 Promise.allSettled(tasks).then(([sell,posts,drops,stats])=>{if(live)setAux({sell:sell.status==='fulfilled'?sell.value:null,posts:posts.status==='fulfilled'?posts.value:null,drops:drops.status==='fulfilled'?drops.value:null,stats:stats.status==='fulfilled'?stats.value:null})});return()=>{live=false};
 },[workspace.config,workspace.session?.user.id,workspace.session?.access_token]);
 const bindings=useMemo(()=>homeBindings(store,aux,now,ranges),[store,aux,now,ranges]);
 useLayoutEffect(()=>{stage.current?.querySelectorAll<HTMLElement>('[data-live-text]').forEach(el=>{el.style.removeProperty('font-size');const width=el.clientWidth;if(width>0&&el.scrollWidth>width+1){const size=parseFloat(getComputedStyle(el).fontSize);el.style.setProperty('font-size',Math.max(8,size*width/el.scrollWidth)+'px','important');}})},[bindings,contentWidth,phone,fitTick]);
 const layouts=homeWidgetSelection(platform.dashboardLayouts[HOME_LAYOUT_KEY]);
 const hidden=new Set(layouts.filter(w=>!w.visible).map(w=>w.id)),packed=packHomeWidgets(contentWidth,layouts);
 function toggleWidget(id:string){const rows=layouts.map(w=>w.id===id?{...w,visible:!w.visible}:w);workspace.update({...store,platform:{...platform,dashboardLayouts:{...platform.dashboardLayouts,[HOME_LAYOUT_KEY]:rows}}});}
 const go=(module:VexumModuleId,section?:string)=>props.navigate(module,section);
 const actions:Partial<Record<string,()=>void>>={
 '2:8':props.onCommand,'2:19':props.onAsk,'2:30':props.onQuick,'2:34':props.onNotifications,'2:38':props.onSettings,'2:42':props.onProfile,'2:1135':props.onProfile,'2:996':()=>go('home'),'175:16':()=>go('home'),'2:1013':()=>go('life'),'2:1032':()=>go('portfolio'),'2:1044':()=>go('search'),'2:1052':()=>go('wishlist'),'2:1059':()=>go('radar'),'2:1073':()=>go('sell'),'2:1085':()=>go('setup'),'2:1102':()=>go('financial'),'2:1119':()=>go('social'),'2:61':()=>setLibraryRequest(n=>n+1),'248:3570':props.onAsk,'248:3470':props.onNotifications,'248:3146':props.onNotifications,
 '248:3433':()=>{workspace.update({...store,platform:{...platform,notifications:{...platform.notifications,readIds:[...new Set([...(platform.notifications.readIds||[]),...(bindings.alertIds||[])])]}}});},
 '248:3200':()=>setCursor(new Date()),'248:3201':()=>setCursor(new Date()),'248:3324':()=>go('life','Calendar'),'248:3571':props.onAsk,'248:3572':props.onAsk,'248:3573':props.onAsk
 };
 // Figma exports button fills and labels as siblings; keep one keyboard target.
 const buttonLabels:Record<string,string>={'248:3200':'Today','248:3570':'Ask VEXUM','2:61':'Add Widgets'};
 const decorativeControls=new Set(['248:3201','248:3571','248:3572','248:3573']);
 [3440,3447,3454,3461,3468].forEach(id=>{buttonLabels['248:'+id]='Review '+(bindings.text['248:'+(id-3)]||'alert');decorativeControls.add('248:'+(id+1))});
 const text={...bindings.text,'2:72':'Add Widgets','2:43':props.displayName[0]?.toUpperCase()||'V','2:1137':props.displayName[0]?.toUpperCase()||'V','2:1141':props.displayName,'248:3198':cursor.toLocaleDateString('en-US',{month:'long',year:'numeric'})};
 const chartRanges:Array<[string,string,string]>=[['248:3588','overall','All'],['248:3589','overall','1Y'],['248:3591','overall','6M'],['248:3592','overall','3M'],['248:3593','overall','1M'],['248:2462','portfolio','1Y'],['248:2463','portfolio','3M'],['248:2465','portfolio','1M'],['248:2466','portfolio','1W'],['248:3493','radar','90D'],['248:3495','radar','30D'],['248:3496','radar','7D'],['248:2947','sell','90D'],['248:2949','sell','30D'],['248:2950','sell','7D']];
 chartRanges.forEach(([id,key,value])=>actions[id]=()=>setRanges(r=>({...r,[key]:value})));
 const hiddenNodes=new Set([...bindings.hidden,'248:3590','248:2464','248:3494','248:2948']);
 for(const [id,route] of Object.entries(bindings.actions)){actions[id]=()=>go(route.module,route.section);if(id.startsWith('248:')&&[3440,3447,3454,3461,3468].includes(Number(id.split(':')[1])))actions['248:'+(Number(id.split(':')[1])+1)]=actions[id];}
 const tasksToday=life.tasks.filter(t=>t.status!=='cancelled'&&(t.dueDate===todayKey(now)||t.scheduledStart?.startsWith(todayKey(now))));
 [173,175].forEach((id,i)=>{const task=tasksToday[i];if(task)actions['177:'+id]=()=>{const completed=task.status!=='completed';workspace.update({...store,life:{...life,tasks:life.tasks.map(t=>t.id===task.id?{...t,status:completed?'completed':'todo',completedAt:completed?new Date().toISOString():undefined,updatedAt:new Date().toISOString()}:t)}})}});
 const first=new Date(cursor.getFullYear(),cursor.getMonth(),1),start=new Date(first);start.setDate(1-(first.getDay()+6)%7);const weeks=Math.ceil(((first.getDay()+6)%7+new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate())/7),days=Array.from({length:weeks*7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d});
 const eventsToday=life.events.filter(e=>e.start.slice(0,10)===todayKey(now)).toSorted((a,b)=>a.start.localeCompare(b.start));
 Object.assign(text,{'248:3290':life.events.filter(e=>e.start.slice(0,7)===todayKey(first).slice(0,7)).length+' events this month','248:3298':'Today · '+now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}),'248:3299':eventsToday.length+' events','248:3300':tasksToday.filter(t=>t.status!=='completed').length+' tasks due','248:3317':'Upcoming'});
 [0,1,2].forEach(i=>{const e=eventsToday[i];Object.assign(text,{['248:'+(3302+i*5)]:e?new Date(e.start).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'',['248:'+(3303+i*5)]:e?.title||(!i?'Nothing scheduled':''),['248:'+(3304+i*5)]:e?.location||'',['248:'+(3305+i*5)]:''})});
 const upcoming=life.events.filter(e=>e.start.slice(0,10)>todayKey(now)).toSorted((a,b)=>a.start.localeCompare(b.start));[0,1].forEach(i=>Object.assign(text,{['248:'+(3319+i*3)]:upcoming[i]?new Date(upcoming[i].start).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'',['248:'+(3320+i*3)]:upcoming[i]?.title||''}));

 function render(node:Node,root:string,inControl=false,preview=false,fit=false):ReactNode{
  if(hiddenNodes.has(node.id)||node.id==='2:61')return null;
  if(fit&&MOBILE_HIDDEN[root]?.has(node.id))return null;
  const number=Number(node.id.split(':')[1]);if(root==='248:3186'&&node.id.startsWith('248:')&&number>=3209&&number<=3289)return null;
  if(preview&&node.id==='248:3199')return <div key={node.id} className={node.className}>‹　›</div>;
  if(node.id==='248:3199')return <div key={node.id} className={node.className} data-node-id={node.id}><button aria-label="Previous month" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()-1,1))}>‹</button>{'      '}<button aria-label="Next month" onClick={()=>setCursor(new Date(cursor.getFullYear(),cursor.getMonth()+1,1))}>›</button></div>;
  let click:(()=>void)|undefined=decorativeControls.has(node.id)?undefined:actions[node.id];const ownText=node.children.filter(c=>typeof c==='string').join('');
  if(!click&&/^(Open |Adjust target)/.test(ownText)){const route=destination(title(root));click=()=>go(route.module,route.section)}
  if(node.name==='Ellipsis')click=()=>setMenu(root);
  let content:ReactNode=node.children.map((child,i)=>typeof child==='string'?child:render(child,root,inControl||!!click,preview,fit));
  if(Object.prototype.hasOwnProperty.call(text,node.id))content=text[node.id as keyof typeof text];
  let series=bindings.charts[node.id];
  if(!series&&node.name?.startsWith('Chart /')){const map:Record<string,string>={'175:35':'smallPortfolio','177:202':'smallFocus','177:177':'smallTasks','177:771':'smallTracker','177:439':'smallDrop'};series={values:bindings.series?.[map[root]]||[],color:root==='175:35'?'#ff171b':'#00e5a1'};}
  if(series)content=<LiveChart series={series}/>;
  if(bindings.images[node.id]&&node.tag!=='img')content=<img src={bindings.images[node.id]} alt="" className="vxf-item-image"/>;
  const shellStyles:Record<string,CSSProperties>={'2:995':{height:'100%',width:250},'2:998':{flex:1,height:'auto',overflowY:'auto'},'2:1135':{flexShrink:0},'2:18':{left:'auto',right:0},'2:61':{left:'auto',right:0},'2:60':{display:'none'},'2:7':{display:'none'},'2:74':{display:'none'},'2:8':{width:Math.min(475,Math.max(44,contentWidth-310))},'2:47':{width:'100%'},'2:56':{display:'none'},'2:50':{display:'none'}};
  const selected=chartRanges.find(([id])=>id===node.id);const bound=bindings.style[node.id],fitScale=fit?MOBILE_FITS[root]?.scale[node.id]:undefined;const style={...node.style,...(bound&&fitScale&&typeof bound.width==='number'?{...bound,width:bound.width*fitScale}:bound),...shellStyles[node.id],...(decorativeControls.has(node.id)?{pointerEvents:'none' as const}:{}),...(selected?{backgroundColor:ranges[selected[1]]===selected[2]?'#141618':'transparent',color:ranges[selected[1]]===selected[2]?'#f3f4f5':'#8f9498',borderRadius:5.76}: {})};
  const tag=node.tag==='img'?'img':click&&!inControl&&!preview?'button':node.tag;
  const base:Record<string,unknown>={key:node.id,className:node.className,'data-node-id':node.id,'data-name':node.name,style,'data-live-text':Object.prototype.hasOwnProperty.call(text,node.id)?'true':undefined};
  if(tag==='img')return createElement('img',{...base,src:bindings.images[node.id]||node.src,alt:node.alt||'',draggable:false});
  if(click&&!inControl&&!preview){base.type='button';base.onClick=click;base['aria-label']=buttonLabels[node.id]||(node.name==='Ellipsis'?'Open '+title(root)+' menu':(node.name?.startsWith('Button - ')?node.name.slice(9):ownText||node.name||'Open '+title(root)));if(selected)base['aria-pressed']=ranges[selected[1]]===selected[2];if(['177:173','177:175'].includes(node.id)){const task=tasksToday[node.id==='177:173'?0:1];base.role='checkbox';base['aria-checked']=task?.status==='completed';base['aria-label']='Complete '+task?.title;}}
  if(fit&&root==='248:3186'&&node.id===root){const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7);const fortnight=Array.from({length:14},(_,i)=>new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+i));
   content=<>{content}<div className="vxm-cal-cells">{fortnight.map(day=>{const key=todayKey(day),count=life.events.filter(e=>e.start.startsWith(key)).length;return <button key={key} type="button" disabled={preview} aria-label={day.toLocaleDateString('en-US',{dateStyle:'full'})+(count?`, ${count} event${count>1?'s':''}`:'')} onClick={()=>go('life','Calendar')} className={(day.getMonth()!==now.getMonth()?'muted ':'')+(key===todayKey(now)?'today':'')}><span>{day.getDate()}</span><i>{Array.from({length:Math.min(3,count)},(_,j)=><b key={j}/>)}</i></button>})}</div></>;}
  else if(root==='248:3186'&&node.id===root)content=<>{content}<div className="vxf-calendar-cells" style={{gridTemplateRows:'repeat('+weeks+',1fr)'}}>{days.map(day=>{const key=todayKey(day),events=life.events.filter(e=>e.start.startsWith(key));return <button key={key} disabled={preview} aria-label={day.toLocaleDateString('en-US',{dateStyle:'full'})} onClick={()=>go('life','Calendar')} className={(day.getMonth()!==cursor.getMonth()?'muted ':'')+(key===todayKey(now)?'today':'')}><span>{day.getDate()}</span>{events.slice(0,2).map(e=><small key={e.id}>{e.title}</small>)}</button>})}</div></>;
  return createElement(tag,base,content);
 }
 const menuRoute=menu?destination(title(menu)):null;
 if(phone)return <MobileHome stageRef={stage} saved={platform.dashboardLayouts[MOBILE_LAYOUT_KEY]} onSave={rows=>workspace.update({...store,platform:{...platform,dashboardLayouts:{...platform.dashboardLayouts,[MOBILE_LAYOUT_KEY]:rows}}})}
  renderWidget={(id,fit,preview)=>render(nodes[id],id,false,!!preview,fit)} menu={menu} setMenu={setMenu} title={title} destination={destination} navigate={go} now={now} unread={props.unread} displayName={props.displayName}
  onQuick={props.onQuick} onNotifications={props.onNotifications} onProfile={props.onProfile} onLayout={()=>setFitTick(n=>n+1)}/>;
 return <>
  <div className="vxf-home" ref={stage} id="vexum-main" tabIndex={-1}>
   <div className="vxf-canvas">
    <aside className="vxf-sidebar">{render(nodes['2:995'],'2:995')}</aside>
    <main className="vxf-main">
     <div className="vxf-topbar">{render(nodes['2:6'],'2:6')}</div>
     <div className="vxf-greeting">{render(nodes['2:45'],'2:45')}</div>
     <ControlCenter width={contentWidth} layouts={layouts} libraryRequest={libraryRequest} onChange={rows=>workspace.update({...store,platform:{...platform,dashboardLayouts:{...platform.dashboardLayouts,[HOME_LAYOUT_KEY]:rows}}})} renderWidget={(id,preview)=>render(nodes[id],id,false,preview)}/>
    </main>
   </div>
  </div>
  <VexumDialog open={!!menu} onClose={()=>setMenu(null)} title={menu?title(menu):'Widget'}><div className="vxf-dialog-actions"><button onClick={()=>{if(menuRoute)go(menuRoute.module,menuRoute.section);setMenu(null)}}>Open {menuRoute?.module}</button><button onClick={()=>{if(menu)toggleWidget(menu);setMenu(null)}}>Remove from Home</button><button onClick={()=>{setMenu(null);setLibraryRequest(n=>n+1)}}>Add Widgets</button></div></VexumDialog>

 </>;
}

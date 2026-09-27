'use client';

import {useMemo,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {
  AlertTriangle,Bell,CalendarCheck,CalendarDays,ChevronLeft,ChevronRight,CircleDollarSign,Clock3,
  Dumbbell,Ellipsis,Layers3,ListChecks,Monitor,PackageCheck,Radar,Share2,ShoppingBag,Sparkles,Star,
  Target,TrendingDown,TrendingUp,WalletCards
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {normalizeFinancialData} from '../lib/financial';
import {normalizeSetupData} from '../lib/setup';
import {normalizeLifeData,todayKey} from '../lib/life';
import {normalizePlatformState} from '../lib/platform';

type BadgeTone='live'|'demo'|'warn';
type MiniKind='metric'|'spark'|'bar'|'ring'|'list'|'split'|'countdown';

const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<100?2:0}).format(Number.isFinite(value)?value:0);
const compact=(value:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(Number.isFinite(value)?value:0);
const pct=(value:number)=>(value>=0?'+':'')+value.toFixed(1)+'%';
const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));

function greeting(){
  const hour=new Date().getHours();
  return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
}

function dateLabel(date=new Date()){
  return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(date);
}

function badgeText(tone:BadgeTone){return tone==='live'?'LIVE':tone==='demo'?'DEMO':'SYNC'}

function iconFor(name:string){
  if(/Calendar|Events|Next Up/i.test(name))return <CalendarDays/>;
  if(/Spend|Budget|Debt|Net Worth|Cash|Revenue|Profit|Value|Cost Basis|Payout/i.test(name))return <CircleDollarSign/>;
  if(/Wishlist|Grail|Goal/i.test(name))return <Star/>;
  if(/Setup|Space|Shelf/i.test(name))return <Monitor/>;
  if(/Radar|Drop|Price/i.test(name))return <Radar/>;
  if(/Sell|Listings|Offers|Purchases/i.test(name))return <ShoppingBag/>;
  if(/Social|Followers|Post|Rep/i.test(name))return <Share2/>;
  if(/Tasks|Today|Habit|Focus/i.test(name))return <ListChecks/>;
  if(/Workout/i.test(name))return <Dumbbell/>;
  if(/Alert|Attention/i.test(name))return <AlertTriangle/>;
  return <Layers3/>;
}

function Sparkline({values,tone='green'}:{values:number[];tone?:'green'|'red'|'gray'}){
  const clean=values.filter(Number.isFinite);
  if(clean.length<2)return <div className="vxh-exact-spark-empty"/>;
  const width=120,height=42;
  const min=Math.min(...clean),max=Math.max(...clean),range=Math.max(1,max-min);
  const points=clean.map((value,index)=>{
    const x=index/(clean.length-1)*width;
    const y=height-2-((value-min)/range)*(height-6);
    return [x,y] as const;
  });
  const line=points.map((point,index)=>(index?'L':'M')+point[0].toFixed(2)+' '+point[1].toFixed(2)).join(' ');
  const area=line+' L '+width+' '+height+' L 0 '+height+' Z';
  return <svg className={'vxh-exact-spark '+tone} viewBox={'0 0 '+width+' '+height} preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={'mini-'+tone} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={tone==='red'?'#ff171b':tone==='gray'?'#8f9498':'#00e5a1'} stopOpacity=".24"/><stop offset="1" stopColor={tone==='red'?'#ff171b':tone==='gray'?'#8f9498':'#00e5a1'} stopOpacity="0"/></linearGradient></defs>
    <path d={area} fill={'url(#mini-'+tone+')'}/><path d={line} fill="none" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

function MiniWidget({col,row,title,badge='live',kind='metric',value,sub,trend,trendTone='green',progress,values,secondary,route}:{
  col:number;row:number;title:string;badge?:BadgeTone;kind?:MiniKind;value:string;sub?:string;trend?:string;trendTone?:'green'|'red'|'muted';
  progress?:number;values?:number[];secondary?:string;route?:string;
}){
  const [open,setOpen]=useState(false);
  const style:CSSProperties={gridColumn:String(col),gridRow:String(row)};
  return <section className={'vxh-exact-widget vxh-exact-small kind-'+kind} style={style}>
    <header><span className="vxh-exact-icon">{iconFor(title)}</span><span className="vxh-exact-title">{title}</span><span className={'vxh-exact-badge '+badge}>{badgeText(badge)}</span>
      <div className="vxh-exact-menu-wrap"><button aria-label={'Open '+title+' menu'} onClick={()=>setOpen(value=>!value)}><Ellipsis/></button>{open?<div className="vxh-exact-menu">{route?<button onClick={()=>location.assign(route)}>Open</button>:null}<button onClick={()=>setOpen(false)}>Close</button></div>:null}</div>
    </header>
    <div className="vxh-exact-small-body">
      {kind==='ring'?<div className="vxh-mini-ring" style={{'--vxh-ring':String(clamp(progress||0))+'%'} as CSSProperties}><span>{value}</span></div>:<strong className="vxh-exact-small-value">{value}</strong>}
      {sub?<span className="vxh-exact-small-sub">{sub}</span>:null}
      {secondary?<span className="vxh-exact-small-secondary">{secondary}</span>:null}
      {trend?<span className={'vxh-exact-trend '+trendTone}><i>{trendTone==='red'?'↓':'↑'}</i>{trend}</span>:null}
      {kind==='bar'?<div className="vxh-mini-progress"><i style={{width:String(clamp(progress||0))+'%'}}/></div>:null}
      {kind==='spark'?<Sparkline values={values||[]} tone={trendTone==='red'?'red':'green'}/>:null}
    </div>
  </section>;
}

function MediumWidget({col,row,title,badge='live',children,route}:{col:number;row:number;title:string;badge?:BadgeTone;children:ReactNode;route?:string}){
  const [open,setOpen]=useState(false);
  return <section className="vxh-exact-widget vxh-exact-medium" style={{gridColumn:String(col)+' / span 2',gridRow:String(row)+' / span 2'}}>
    <header><span className="vxh-exact-icon">{iconFor(title)}</span><span className="vxh-exact-title">{title}</span><span className={'vxh-exact-badge '+badge}>{badgeText(badge)}</span><div className="vxh-exact-menu-wrap"><button aria-label={'Open '+title+' menu'} onClick={()=>setOpen(value=>!value)}><Ellipsis/></button>{open?<div className="vxh-exact-menu">{route?<button onClick={()=>location.assign(route)}>Open</button>:null}<button onClick={()=>setOpen(false)}>Close</button></div>:null}</div></header>
    <div className="vxh-exact-medium-body">{children}</div>
  </section>;
}

function LargeWidget({row,title,badge='live',children,route}:{row:number;title:string;badge?:BadgeTone;children:ReactNode;route?:string}){
  const [open,setOpen]=useState(false);
  return <section className="vxh-exact-widget vxh-exact-large" style={{gridColumn:'2 / span 4',gridRow:String(row)+' / span 4'}}>
    <header><span className="vxh-exact-icon">{iconFor(title)}</span><span className="vxh-exact-title">{title}</span><span className={'vxh-exact-badge '+badge}>{badgeText(badge)}</span><div className="vxh-exact-menu-wrap"><button aria-label={'Open '+title+' menu'} onClick={()=>setOpen(value=>!value)}><Ellipsis/></button>{open?<div className="vxh-exact-menu">{route?<button onClick={()=>location.assign(route)}>Open</button>:null}<button onClick={()=>setOpen(false)}>Close</button></div>:null}</div></header>
    {children}
  </section>;
}

function AreaChart({values,baseline}:{values:number[];baseline?:number}){
  const clean=values.filter(Number.isFinite);
  const width=670,height=258;
  if(clean.length<2)return <div className="vxh-exact-chart-empty">No portfolio history yet.</div>;
  const min=Math.min(...clean,baseline||Infinity),max=Math.max(...clean,baseline||-Infinity),range=Math.max(1,max-min);
  const point=(value:number,index:number)=>{
    const x=index/(clean.length-1)*width;
    const y=height-18-((value-min)/range)*(height-42);
    return [x,y] as const;
  };
  const points=clean.map(point);
  const line=points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
  const area=line+' L '+width+' '+height+' L 0 '+height+' Z';
  const baseY=baseline===undefined?null:height-18-((baseline-min)/range)*(height-42);
  return <svg className="vxh-exact-area-chart" viewBox={'0 0 '+width+' '+height} preserveAspectRatio="none" aria-label="Portfolio value chart">
    <defs><linearGradient id="overallFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff171b" stopOpacity=".22"/><stop offset="1" stopColor="#ff171b" stopOpacity="0"/></linearGradient></defs>
    {[0.16,0.36,0.56,0.76,0.96].map((n,i)=><line key={i} x1="0" x2={width} y1={height*n} y2={height*n} className="grid"/>)}
    {baseY!==null?<line x1="0" x2={width} y1={baseY} y2={baseY} className="baseline"/>:null}
    <path d={area} fill="url(#overallFill)"/><path d={line} className="value-line" fill="none"/>
  </svg>;
}

function Donut({segments,total}:{segments:Array<{name:string;value:number}>;total:number}){
  const palette=['#ff171b','#f35b36','#e1ae67','#46b98b','#8f9498'];
  const sum=Math.max(1,segments.reduce((s,x)=>s+x.value,0));
  let cursor=0;
  const gradient=segments.map((segment,index)=>{
    const start=cursor/sum*100;cursor+=segment.value;const end=cursor/sum*100;
    return palette[index%palette.length]+' '+start+'% '+end+'%';
  }).join(',');
  return <div className="vxh-exact-donut-wrap"><div className="vxh-exact-donut" style={{background:'conic-gradient('+gradient+')'}}><div><strong>{compact(total)}</strong><span>{segments.length} categories</span></div></div></div>;
}

function monthDelta(history:Array<{date:string;value:number}>){
  const cutoff=Date.now()-30*86400000;
  const recent=history.filter(row=>Date.parse(row.date)>=cutoff);
  if(recent.length<2||recent[0].value===0)return {amount:0,pct:0};
  const amount=recent.at(-1)!.value-recent[0].value;
  return {amount,pct:amount/recent[0].value*100};
}

function calendarCells(cursor:Date){
  const first=new Date(cursor.getFullYear(),cursor.getMonth(),1);
  const mondayIndex=(first.getDay()+6)%7;
  const start=new Date(first);start.setDate(first.getDate()-mondayIndex);
  return Array.from({length:42},(_,index)=>{const date=new Date(start);date.setDate(start.getDate()+index);return date});
}

export default function VexumHome(){
  const workspace=useWorkspace();
  const store=workspace.data;
  const financial=normalizeFinancialData(store.financial);
  const setup=normalizeSetupData(store.setup);
  const life=normalizeLifeData(store.life);
  const platform=normalizePlatformState(store.platform,true);
  const [editMode,setEditMode]=useState(false);
  const [range,setRange]=useState<'1M'|'3M'|'6M'|'1Y'|'ALL'>('6M');
  const [calendarCursor,setCalendarCursor]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)});

  const owned=store.items.filter(item=>item.status==='owned'&&!item.archivedAt);
  const sold=store.items.filter(item=>item.status==='sold');
  const units=owned.reduce((sum,item)=>sum+item.quantity,0);
  const currentValue=owned.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const costBasis=owned.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const unrealized=currentValue-costBasis;
  const unrealizedPct=costBasis?unrealized/costBasis*100:0;
  const realized=sold.reduce((sum,item)=>sum+(item.currentValue-item.purchasePrice)*item.quantity,0);
  const sellRevenue=sold.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const averageValue=units?currentValue/units:0;
  const activeCollections=store.collections.filter(collection=>!collection.archivedAt);
  const history=useMemo(()=>(store.history||[]).filter(row=>Number.isFinite(Date.parse(row.date))).toSorted((a,b)=>a.date.localeCompare(b.date)).map(row=>({date:row.date,value:Object.values(row.values).reduce((sum,value)=>sum+value,0)})),[store.history]);
  const delta=monthDelta(history);

  const month=new Date().toISOString().slice(0,7);
  const monthSpend=financial.transactions.filter(tx=>tx.direction==='expense'&&tx.isHobby&&tx.date.startsWith(month)).reduce((sum,tx)=>sum+tx.amount,0)+owned.filter(item=>item.purchaseDate.startsWith(month)).reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const budget=store.financialPreferences?.monthlyHobbyBudget||financial.budgets.find(entry=>entry.active&&entry.period==='monthly'&&(!entry.category||/hobby|collect/i.test(entry.category)))?.amount||0;
  const budgetRemaining=Math.max(0,budget-monthSpend);
  const weekCutoff=Date.now()-7*86400000;
  const weekSpend=financial.transactions.filter(tx=>tx.direction==='expense'&&tx.isHobby&&Date.parse(tx.date)>=weekCutoff).reduce((sum,tx)=>sum+tx.amount,0);
  const incomeMonth=financial.transactions.filter(tx=>tx.direction==='income'&&tx.date.startsWith(month)).reduce((sum,tx)=>sum+tx.amount,0);
  const expenseMonth=financial.transactions.filter(tx=>tx.direction==='expense'&&tx.date.startsWith(month)).reduce((sum,tx)=>sum+tx.amount,0);
  const cashFlow=incomeMonth-expenseMonth;
  const assetBalance=financial.accounts.filter(account=>['checking','savings','cash','investment','other_asset'].includes(account.type)).reduce((sum,account)=>sum+account.currentBalance,0);
  const debtAccounts=financial.accounts.filter(account=>['credit_card','student_loan','auto_loan','mortgage','personal_loan','other_liability'].includes(account.type));
  const debt=debtAccounts.reduce((sum,account)=>sum+Math.max(0,account.currentBalance),0);
  const netWorth=assetBalance-debt+currentValue;

  const wishlist=Object.values(store.wishlist||{}).filter(record=>!record.archived);
  const opportunities=wishlist.filter(record=>typeof record.currentMarket==='number'&&((typeof record.targetPrice==='number'&&record.currentMarket<=record.targetPrice)||(typeof record.maximumPrice==='number'&&record.currentMarket<=record.maximumPrice)));
  const grails=wishlist.filter(record=>record.priority==='Grail');
  const topGrail=grails[0]||wishlist[0];

  const capacities=setup.objects.filter(object=>object.capacityValue&&object.capacityValue>0).map(object=>{
    const used=setup.placements.filter(placement=>placement.setupObjectId===object.id).length;
    return {name:object.name,used,total:object.capacityValue||0,pct:clamp(used/(object.capacityValue||1)*100)};
  }).toSorted((a,b)=>b.pct-a.pct);
  const setupTop=capacities[0];
  const unplaced=owned.filter(item=>!setup.placements.some(placement=>placement.kind==='owned'&&placement.portfolioItemId===item.id)&&!item.location.trim()).length;

  const categoryValues=useMemo(()=>{
    const map=new Map<string,number>();
    for(const item of owned){const key=item.category||'Other';map.set(key,(map.get(key)||0)+item.currentValue*item.quantity)}
    return [...map.entries()].map(([name,value])=>({name,value})).toSorted((a,b)=>b.value-a.value).slice(0,5);
  },[owned]);

  const measurable=activeCollections.filter(collection=>collection.measurable&&collection.targetItemCount);
  const completionRows=measurable.map(collection=>{
    const count=owned.filter(item=>item.collectionId===collection.id).reduce((sum,item)=>sum+item.quantity,0);
    return {name:collection.name,count,total:collection.targetItemCount||0,pct:collection.targetItemCount?clamp(count/collection.targetItemCount*100):0};
  });
  const completionTotal=completionRows.length?completionRows.reduce((sum,row)=>sum+row.pct,0)/completionRows.length:0;

  const today=todayKey();
  const todayTasks=life.tasks.filter(task=>!['cancelled'].includes(task.status)&&(task.dueDate===today||task.scheduledStart?.startsWith(today)));
  const completedToday=todayTasks.filter(task=>task.status==='completed').length;
  const openToday=todayTasks.filter(task=>task.status!=='completed').length;
  const upcoming=useMemo(()=>{
    const rows:Array<{date:string;title:string;kind:string;sort:string}>=[];
    for(const event of life.events)if(event.start.slice(0,10)>=today)rows.push({date:event.start.slice(0,10),title:event.title,kind:'Event',sort:event.start});
    for(const task of life.tasks)if(task.dueDate&&task.dueDate>=today&&task.status!=='completed'&&task.status!=='cancelled')rows.push({date:task.dueDate,title:task.title,kind:'Task',sort:task.dueDate+'T'+(task.dueTime||'23:59')});
    return rows.toSorted((a,b)=>a.sort.localeCompare(b.sort)).slice(0,8);
  },[life.events,life.tasks,today]);

  const focusWeek=life.focusSessions.filter(session=>session.completed&&Date.parse(session.startedAt)>=weekCutoff).reduce((sum,session)=>sum+session.plannedMinutes,0);
  const focusBars=Array.from({length:7},(_,offset)=>{
    const day=new Date();day.setDate(day.getDate()-(6-offset));const key=todayKey(day);
    return life.focusSessions.filter(session=>session.completed&&session.startedAt.startsWith(key)).reduce((sum,session)=>sum+session.plannedMinutes,0);
  });
  const workoutsWeek=life.workoutSessions.filter(session=>session.completed&&Date.parse(session.date)>=weekCutoff).length;
  const activeHabits=life.habits.filter(habit=>habit.active);
  const habitChecksWeek=activeHabits.reduce((sum,habit)=>sum+habit.checks.filter(check=>Date.parse(check)>=weekCutoff).length,0);
  const habitTargetWeek=activeHabits.reduce((sum,habit)=>sum+Math.max(1,habit.frequency.targetPerWeek||7),0);

  const activeGoal=financial.goals.find(goal=>goal.status==='active');
  const lifeGoal=life.goals.find(goal=>goal.status==='active');
  const bills=financial.bills.filter(bill=>bill.active).toSorted((a,b)=>(a.nextDueDate||'9999').localeCompare(b.nextDueDate||'9999'));
  const nextBill=bills[0];
  const daysUntil=(date?:string)=>date?Math.max(0,Math.ceil((Date.parse(date)-Date.now())/86400000)):0;

  const duplicateKeys=new Map<string,number>();
  for(const item of owned){const key=(item.identity?.upc||item.identity?.sku||item.name).toLowerCase().replace(/[^a-z0-9]+/g,'');duplicateKeys.set(key,(duplicateKeys.get(key)||0)+1)}
  const duplicates=[...duplicateKeys.values()].filter(value=>value>1).length;
  const missingImages=owned.filter(item=>!item.image).length;
  const missingCost=owned.filter(item=>item.purchasePrice<=0).length;
  const alertCount=duplicates+missingImages+missingCost+unplaced+opportunities.length;

  const maxPriceItem=owned.toSorted((a,b)=>b.currentValue-a.currentValue)[0];
  const mostRecent=owned.toSorted((a,b)=>(b.purchaseDate||b.createdAt).localeCompare(a.purchaseDate||a.createdAt))[0];
  const soldThrough=owned.length+sold.length?sold.length/(owned.length+sold.length)*100:0;
  const rep=0;

  const filteredHistory=useMemo(()=>{
    const days:Record<string,number>={'1M':30,'3M':90,'6M':180,'1Y':365};
    if(range==='ALL')return history;
    const cutoff=Date.now()-days[range]*86400000;
    return history.filter(row=>Date.parse(row.date)>=cutoff);
  },[history,range]);

  const calendarDays=calendarCells(calendarCursor);
  const monthTitle=new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(calendarCursor);
  const agenda=upcoming.slice(0,4);
  const overallSeries=filteredHistory.length?filteredHistory.map(row=>row.value):[costBasis,currentValue];

  const alerts=[
    duplicates?{tone:'warn',label:'Possible duplicate',text:duplicates+' duplicate group'+(duplicates===1?'':'s')+' need review',route:'/portfolio'}:null,
    unplaced?{tone:'warn',label:'Space capacity',text:unplaced+' owned item'+(unplaced===1?' needs':'s need')+' a Setup location',route:'/setup'}:null,
    opportunities.length?{tone:'good',label:'Price target hit',text:opportunities.length+' Wishlist opportunit'+(opportunities.length===1?'y is':'ies are')+' at target',route:'/wishlist'}:null,
    missingImages?{tone:'warn',label:'Portfolio audit',text:missingImages+' owned item'+(missingImages===1?' is':'s are')+' missing images',route:'/portfolio'}:null,
    missingCost?{tone:'warn',label:'Portfolio audit',text:missingCost+' owned item'+(missingCost===1?' is':'s are')+' missing cost basis',route:'/portfolio'}:null
  ].filter(Boolean) as Array<{tone:string;label:string;text:string;route:string}>;

  const miniSpecs=[
    {col:1,row:1,title:'Collection Value',kind:'spark' as MiniKind,value:money(currentValue),sub:units+' owned units',trend:pct(delta.pct),trendTone:delta.pct<0?'red':'green',values:history.map(row=>row.value),route:'/portfolio'},
    {col:6,row:1,title:'Hobby Spend',kind:'bar' as MiniKind,value:money(monthSpend),sub:'Recorded hobby spend',progress:budget?monthSpend/budget*100:0,route:'/financial'},
    {col:1,row:2,title:'Calendar',kind:'countdown' as MiniKind,value:String(new Date().getDate()),sub:new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(new Date()),secondary:upcoming[0]?.title||'No upcoming events',route:'/life'},
    {col:6,row:2,title:'Opportunities',kind:'spark' as MiniKind,value:String(opportunities.length),sub:'At target price',trend:opportunities.length?'+0.0%':'0.0%',values:[0,opportunities.length],route:'/wishlist'},
    {col:1,row:3,title:'Setup Capacity',kind:'bar' as MiniKind,value:setupTop?Math.round(setupTop.pct)+'%':'0%',sub:setupTop?.name||'No capacity data',progress:setupTop?.pct||0,route:'/setup'},
    {col:6,row:3,title:'Sell Revenue',kind:'spark' as MiniKind,value:money(sellRevenue),sub:sold.length+' sold records',trend:realized>=0?money(realized):money(realized),trendTone:realized<0?'red':'green',values:[0,sellRevenue],route:'/sell'},
    {col:1,row:4,title:'Rep Level',kind:'ring' as MiniKind,value:'0/3',sub:'0 XP to Level 4',progress:0,route:'/social'},
    {col:6,row:4,title:'Unrealized P/L',kind:'spark' as MiniKind,value:money(unrealized),sub:'Current portfolio',trend:pct(unrealizedPct),trendTone:unrealized<0?'red':'green',values:[costBasis,currentValue],route:'/portfolio'},
    {col:1,row:5,title:'Debt',kind:'metric' as MiniKind,value:money(debt),sub:debtAccounts.length+' debt accounts',route:'/financial'},
    {col:6,row:5,title:'Tasks Completed',kind:'metric' as MiniKind,value:String(completedToday),sub:'Today',secondary:openToday+' left',route:'/life'},
    {col:1,row:6,title:'Grail Watch',kind:'list' as MiniKind,value:topGrail?.snapshot?.name||'No active Grail',sub:topGrail&&typeof topGrail.currentMarket==='number'?money(topGrail.currentMarket):'Wishlist',secondary:topGrail&&typeof topGrail.targetPrice==='number'?'Target '+money(topGrail.targetPrice):'',route:'/wishlist'},
    {col:6,row:6,title:'Net Worth',kind:'spark' as MiniKind,value:money(netWorth),sub:'Net connected + portfolio',trend:'0.0%',values:[netWorth,netWorth],route:'/financial'},
    {col:1,row:7,title:'Spaces',kind:'list' as MiniKind,value:String(setup.spaces.length),sub:'Setup spaces',secondary:setupTop?.name||'No active setup',route:'/setup'},
    {col:6,row:7,title:'Realized Profit',kind:'spark' as MiniKind,value:money(realized),sub:sold.length+' sold records',trend:realized>=0?'+0.0%':'0.0%',trendTone:realized<0?'red':'green',values:[0,realized],route:'/sell'},
    {col:1,row:8,title:'Tasks Completed',kind:'spark' as MiniKind,value:String(life.tasks.filter(task=>task.status==='completed').length),sub:'All completed tasks',trend:'0.0%',values:[0,life.tasks.filter(task=>task.status==='completed').length],route:'/life'},
    {col:6,row:8,title:'Price Tracker',kind:'spark' as MiniKind,value:topGrail&&typeof topGrail.currentMarket==='number'?money(topGrail.currentMarket):'$0',sub:topGrail?.snapshot?.name||'No tracked target',trend:'0.0%',values:topGrail?.marketHistory?.map(point=>point.value)||[],route:'/wishlist'},
    {col:1,row:9,title:'Upcoming Bills',kind:'list' as MiniKind,value:String(bills.length),sub:nextBill?nextBill.name:'No bills tracked',secondary:nextBill?money(nextBill.amount):'',route:'/financial'},
    {col:6,row:9,title:'Next Payout',kind:'countdown' as MiniKind,value:'—',sub:'No payout source connected',route:'/sell'},
    {col:1,row:10,title:'Completion',kind:'bar' as MiniKind,value:Math.round(completionTotal)+'%',sub:completionRows[0]?.name||'No measurable collections',progress:completionTotal,route:'/portfolio'},
    {col:6,row:10,title:'Recent Purchases',kind:'list' as MiniKind,value:mostRecent?.name||'No recent purchase',sub:mostRecent?money(mostRecent.purchasePrice):'',secondary:mostRecent?.purchaseDate||'',route:'/portfolio'},
    {col:1,row:11,title:'Tracking',kind:'split' as MiniKind,value:String(wishlist.length),sub:'Keywords',secondary:String(platform.collectorInterests.length)+' interests',route:'/radar'},
    {col:6,row:11,title:'Upcoming Events',kind:'list' as MiniKind,value:String(upcoming.length),sub:upcoming[0]?.title||'Nothing upcoming',secondary:upcoming[0]?.date||'',route:'/life'},
    {col:1,row:12,title:'Next Bill',kind:'countdown' as MiniKind,value:nextBill?String(daysUntil(nextBill.nextDueDate))+'d':'—',sub:nextBill?.name||'No bill scheduled',secondary:nextBill?money(nextBill.amount):'',route:'/financial'},
    {col:6,row:12,title:'Collection Stats',kind:'split' as MiniKind,value:String(units),sub:'items',secondary:activeCollections.length+' collections',route:'/portfolio'},
    {col:1,row:13,title:'Followers',kind:'split' as MiniKind,value:'0',sub:'Followers',secondary:'0 following',route:'/social'},
    {col:6,row:13,title:'Cost Basis',kind:'spark' as MiniKind,value:money(costBasis),sub:'Recorded cost',trend:'0.0%',values:[costBasis,costBasis],route:'/portfolio'},
    {col:1,row:14,title:'Next Up',kind:'countdown' as MiniKind,value:upcoming[0]?String(daysUntil(upcoming[0].date))+'d':'—',sub:upcoming[0]?.title||'Nothing scheduled',secondary:upcoming[0]?.date||'',route:'/life'},
    {col:6,row:14,title:'Next Drop',kind:'countdown' as MiniKind,value:'—',sub:'No live Radar drop',route:'/radar'},
    {col:1,row:15,title:'Price Drop',kind:'spark' as MiniKind,value:opportunities[0]&&typeof opportunities[0].currentMarket==='number'?money(opportunities[0].currentMarket):'$0',sub:opportunities[0]?.snapshot?.name||'No target hit',trend:'0.0%',values:opportunities[0]?.marketHistory?.map(point=>point.value)||[],route:'/wishlist'},
    {col:6,row:15,title:'Offers',kind:'countdown' as MiniKind,value:'0',sub:'No connected marketplace offers',route:'/sell'},
    {col:1,row:16,title:'Focus Time',kind:'spark' as MiniKind,value:Math.floor(focusWeek/60)+'h '+focusWeek%60+'m',sub:'This week',trend:'0.0%',values:focusBars,route:'/life'},
    {col:6,row:16,title:'Needs a Spot',kind:'countdown' as MiniKind,value:String(unplaced),sub:'Unplaced owned items',secondary:'Setup',route:'/setup'},
    {col:1,row:17,title:'Budget Left',kind:'bar' as MiniKind,value:budget?money(budgetRemaining):'—',sub:budget?'Monthly hobby budget':'No budget set',progress:budget?budgetRemaining/budget*100:0,route:'/financial'},
    {col:6,row:17,title:'VEXUM Rep',kind:'spark' as MiniKind,value:String(rep),sub:'Complete your first sale',trend:'0.0%',values:[0,rep],route:'/social'},
    {col:1,row:18,title:'Avg. Item Value',kind:'spark' as MiniKind,value:money(averageValue),sub:units+' owned units',trend:'0.0%',values:[averageValue,averageValue],route:'/portfolio'},
    {col:6,row:18,title:'Radar Feed',kind:'list' as MiniKind,value:String(opportunities.length),sub:opportunities[0]?.snapshot?.name||'No live signals',secondary:'Wishlist targets',route:'/radar'},
    {col:1,row:19,title:'Workouts',kind:'split' as MiniKind,value:String(workoutsWeek)+'/0',sub:'This week',secondary:'No workout goal set',route:'/life'},
    {col:6,row:19,title:'Sell-Through',kind:'ring' as MiniKind,value:Math.round(soldThrough)+'%',sub:sold.length+' of '+(owned.length+sold.length)+' sold',progress:soldThrough,route:'/sell'},
    {col:1,row:20,title:'Collection Mix',kind:'list' as MiniKind,value:String(categoryValues.length)+' categories',sub:categoryValues[0]?.name||'No category data',secondary:categoryValues[0]?money(categoryValues[0].value):'',route:'/portfolio'},
    {col:6,row:20,title:'Space Spotlight',kind:'list' as MiniKind,value:setup.spaces[0]?.name||'No active space',sub:setupTop?Math.round(setupTop.pct)+'% full':'Setup',secondary:setupTop?.name||'',route:'/setup'},
    {col:1,row:21,title:'Active Listings',kind:'list' as MiniKind,value:'0',sub:'No active listings',route:'/sell'},
    {col:2,row:21,title:'Wishlist Summary',kind:'split' as MiniKind,value:String(wishlist.length),sub:'Wishlist items',secondary:opportunities.length+' opportunities',route:'/wishlist'},
    {col:3,row:21,title:'Goal Progress',kind:'bar' as MiniKind,value:lifeGoal?Math.round(lifeGoal.progress)+'%':'—',sub:lifeGoal?.title||'No active Life goal',progress:lifeGoal?.progress||0,route:'/life'},
    {col:4,row:21,title:'Spend This Week',kind:'bar' as MiniKind,value:money(weekSpend),sub:'Recorded hobby spend',progress:budget?weekSpend/(budget/4)*100:0,route:'/financial'},
    {col:5,row:21,title:'Social Activity',kind:'list' as MiniKind,value:'0',sub:'No connected activity',route:'/social'},
    {col:6,row:21,title:'Top Grail',kind:'list' as MiniKind,value:topGrail?.snapshot?.name||'No Grail',sub:topGrail&&typeof topGrail.currentMarket==='number'?money(topGrail.currentMarket):'Wishlist',secondary:topGrail?.priority||'',route:'/wishlist'},
    {col:1,row:22,title:'Shelf Map',kind:'split' as MiniKind,value:String(setup.placements.length),sub:'placements',secondary:setup.spaces.length+' spaces',route:'/setup'},
    {col:2,row:22,title:'Top Item',kind:'list' as MiniKind,value:maxPriceItem?.name||'No owned items',sub:maxPriceItem?money(maxPriceItem.currentValue):'',secondary:maxPriceItem?.category||'',route:'/portfolio'},
    {col:3,row:22,title:'Savings Goal',kind:'ring' as MiniKind,value:activeGoal&&activeGoal.targetAmount?Math.round(activeGoal.currentAmount/activeGoal.targetAmount*100)+'%':'—',sub:activeGoal?.name||'No savings goal',progress:activeGoal&&activeGoal.targetAmount?activeGoal.currentAmount/activeGoal.targetAmount*100:0,route:'/financial'},
    {col:4,row:22,title:'Cash Flow',kind:'split' as MiniKind,value:money(incomeMonth),sub:'Income',secondary:money(expenseMonth)+' out',route:'/financial'},
    {col:5,row:22,title:'Habit Week',kind:'bar' as MiniKind,value:String(habitChecksWeek),sub:'habit checks',progress:habitTargetWeek?habitChecksWeek/habitTargetWeek*100:0,route:'/life'},
    {col:6,row:22,title:'Habit Streak',kind:'bar' as MiniKind,value:activeHabits.length?String(Math.max(...activeHabits.map(h=>h.checks.length))):'0',sub:'Best active habit',progress:habitTargetWeek?habitChecksWeek/habitTargetWeek*100:0,route:'/life'},
    {col:1,row:23,title:'Top Post',kind:'list' as MiniKind,value:'—',sub:'No connected social posts',route:'/social'},
    {col:6,row:23,title:'Biggest Mover',kind:'spark' as MiniKind,value:maxPriceItem?maxPriceItem.name:'No item history',sub:maxPriceItem?money(maxPriceItem.currentValue):'',trend:'0.0%',values:maxPriceItem?.priceHistory?.map(point=>point.value)||[],route:'/portfolio'},
    {col:1,row:24,title:'Today Progress',kind:'ring' as MiniKind,value:(todayTasks.length?completedToday+'/'+todayTasks.length:'0/0'),sub:'Tasks',progress:todayTasks.length?completedToday/todayTasks.length*100:0,route:'/life'},
    {col:6,row:24,title:'Daily Note',kind:'list' as MiniKind,value:'—',sub:'No daily note saved',route:'/life'}
  ];

  return <div className={'vxh-exact-page'+(editMode?' is-editing':'')}>
    <section className="vxh-exact-title">
      <div><h1>{greeting()}.</h1><p>{dateLabel()} · Your VEXUM command center.</p></div>
      <button className={editMode?'active':''} onClick={()=>setEditMode(value=>!value)}><ListChecks/>{editMode?'Done Editing':'Edit Widgets'}</button>
    </section>

    <div className="vxh-exact-grid" aria-label="VEXUM Home widgets">
      {miniSpecs.map(spec=><MiniWidget key={spec.title+'-'+spec.col+'-'+spec.row} {...spec} badge={spec.title==='Next Drop'||spec.title==='Offers'||spec.title==='Top Post'?'demo':'live'}/>)}

      <LargeWidget row={1} title="Overall Value" badge="live" route="/portfolio">
        <div className="vxh-overall">
          <div className="vxh-overall-left">
            <div className="vxh-overall-heading"><strong>{money(currentValue)}</strong><span className={delta.amount<0?'red':'green'}>{delta.amount>=0?'+':''}{money(delta.amount)} · {pct(delta.pct)} this month</span></div>
            <div className="vxh-overall-ranges">{(['1M','3M','6M','1Y','ALL'] as const).map(option=><button className={range===option?'active':''} key={option} onClick={()=>setRange(option)}>{option==='ALL'?'All':option}</button>)}</div>
            <div className="vxh-overall-metrics"><div><span>Items</span><strong>{units}</strong></div><div><span>Collections</span><strong>{activeCollections.length}</strong></div><div><span>Cost basis</span><strong>{money(costBasis)}</strong></div><div><span>Unrealized</span><strong className={unrealized<0?'red':'green'}>{unrealized>=0?'+':''}{money(unrealized)}</strong></div></div>
            <AreaChart values={overallSeries} baseline={costBasis}/>
            <div className="vxh-overall-legend"><span><i className="red"/>Value</span><span><i className="dash"/>Cost basis</span></div>
          </div>
          <div className="vxh-overall-allocation"><h4>ALLOCATION</h4><Donut segments={categoryValues} total={currentValue}/><div className="vxh-allocation-list">{categoryValues.map((entry,index)=><div key={entry.name}><i className={'c'+index}/><span>{entry.name}</span><b>{currentValue?Math.round(entry.value/currentValue*100):0}%</b><strong>{money(entry.value)}</strong></div>)}</div><p>{categoryValues[0]?categoryValues[0].name+' leads at '+Math.round(categoryValues[0].value/Math.max(1,currentValue)*100)+'% of value':'No category value yet'}</p></div>
        </div>
      </LargeWidget>

      <LargeWidget row={5} title="Calendar" badge="live" route="/life">
        <div className="vxh-large-calendar">
          <div className="vxh-calendar-month">
            <div className="vxh-calendar-controls"><h3>{monthTitle}</h3><div><button onClick={()=>setCalendarCursor(new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1))}>Today</button><button onClick={()=>setCalendarCursor(new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1))}><ChevronLeft/></button><button onClick={()=>setCalendarCursor(new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1))}><ChevronRight/></button></div></div>
            <div className="vxh-weekdays">{['M','T','W','T','F','S','S'].map((day,index)=><span key={day+index}>{day}</span>)}</div>
            <div className="vxh-calendar-grid">{calendarDays.map(day=>{const key=todayKey(day);const inMonth=day.getMonth()===calendarCursor.getMonth();const items=[...life.events.filter(event=>event.start.startsWith(key)),...life.tasks.filter(task=>task.dueDate===key&&task.status!=='cancelled')].slice(0,2);return <div className={(inMonth?'':'muted')+(key===today?' today':'')} key={key}><b>{day.getDate()}</b>{items.map((item,index)=><span key={index}>{'title' in item?item.title:'Event'}</span>)}</div>})}</div>
          </div>
          <div className="vxh-calendar-agenda"><span className="eyebrow">TODAY · {new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric'}).format(new Date()).toUpperCase()}</span><strong>{todayTasks.length+life.events.filter(event=>event.start.startsWith(today)).length} events</strong><small>{openToday} tasks due</small><div className="vxh-agenda-list">{agenda.map((row,index)=><div key={row.sort}><i/><time>{row.date}</time><strong>{row.title}</strong><small>{row.kind}</small><span>{index===0?'next':''}</span></div>)}</div><button onClick={()=>location.assign('/life')}>Open Calendar →</button></div>
        </div>
      </LargeWidget>

      <LargeWidget row={9} title="VEXUM Radar" badge="demo" route="/radar">
        <div className="vxh-radar-large">
          <div className="vxh-radar-chart"><h3>Signals worth watching</h3><p>Restocks, drops, preorders and price moves you track</p><div className="vxh-radar-focus"><strong>{topGrail?.snapshot?.name||'No tracked target yet'}</strong><small>{topGrail?.marketSource||'Wishlist'} · tracked</small><b>{topGrail&&typeof topGrail.currentMarket==='number'?money(topGrail.currentMarket):'$0'}</b><span>{topGrail&&typeof topGrail.targetPrice==='number'?'Target '+money(topGrail.targetPrice):'Set a target in Wishlist'}</span></div><Sparkline values={topGrail?.marketHistory?.map(point=>point.value)||[0,0]} tone="green"/><footer>Tracking {wishlist.length} items · {platform.collectorInterests.length} interests</footer></div>
          <div className="vxh-radar-signals"><span className="eyebrow">LIVE SIGNALS · {opportunities.length}</span>{opportunities.slice(0,4).map((record,index)=><div key={record.productId}><span className={'signal signal-'+index}>{index===0?'PRICE':'WATCH'}</span><time>{index?'':'Now'}</time><strong>{record.snapshot?.name||record.productId}</strong><small>{record.marketSource||'Wishlist'} · {record.currentMarket!==undefined?money(record.currentMarket):'—'}</small></div>)}{!opportunities.length?<div className="empty">No live Radar provider events are connected.</div>:null}<button onClick={()=>location.assign('/radar')}>Open Radar →</button></div>
        </div>
      </LargeWidget>

      <LargeWidget row={13} title="VEXUM Brief" badge="demo">
        <div className="vxh-brief-large"><div className="vxh-brief-top"><h3>{greeting()}.</h3><p>Here’s what changed across VEXUM since yesterday.</p><time>{new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric'}).format(new Date())}</time></div>
          {[
            ['PORTFOLIO','Collection value is '+money(currentValue)+'.',units+' owned units',pct(delta.pct),delta.pct<0?'red':'green'],
            ['WISHLIST',opportunities.length+' tracked item'+(opportunities.length===1?' is':'s are')+' below target.',topGrail?.snapshot?.name||'No active targets',String(opportunities.length),'green'],
            ['SETUP',setupTop?setupTop.name+' is nearing capacity.':'No measured Setup capacity.',setupTop?Math.round(setupTop.pct)+'% full':'Open Setup',setupTop?Math.round(setupTop.pct)+'%':'—','orange'],
            ['FINANCIAL',money(monthSpend)+' of hobby purchases recorded this month.',financial.transactions.length+' financial transactions',money(monthSpend),'muted']
          ].map(row=><div className="vxh-brief-row-exact" key={row[0]}><span>{row[0]}</span><div><strong>{row[1]}</strong><small>{row[2]}</small></div><b className={String(row[4])}>{row[3]}</b></div>)}
          <button className="vxh-brief-ask" onClick={()=>{const button=document.querySelector<HTMLButtonElement>('.vxp-ask');button?.click()}}><Sparkles/>Ask VEXUM about today’s brief… <span>↵</span></button>
        </div>
      </LargeWidget>

      <LargeWidget row={17} title="VEXUM Alerts" badge="live">
        <div className="vxh-alerts-large"><div className="vxh-alerts-summary"><h3>{alertCount} things need your attention</h3><p>Prioritized across your VEXUM workspace</p><div className="vxh-alert-counters"><div><strong>{duplicates+missingCost}</strong><span>Urgent</span></div><div><strong>{opportunities.length}</strong><span>Opportunities</span></div><div><strong>{missingImages+unplaced}</strong><span>Info</span></div></div><h4>By area</h4><dl><div><dt>Financial</dt><dd>{debtAccounts.length}</dd></div><div><dt>Wishlist</dt><dd>{opportunities.length}</dd></div><div><dt>Setup</dt><dd>{unplaced}</dd></div><div><dt>Portfolio</dt><dd>{duplicates+missingImages+missingCost}</dd></div></dl><button>Mark all as read</button></div>
          <div className="vxh-alert-feed"><span className="eyebrow">ALL ALERTS · NEWEST FIRST</span>{alerts.slice(0,5).map((alert,index)=><div key={alert.label+index} className={alert.tone}><i/><span><b>{alert.label}</b><strong>{alert.text}</strong><small>{index?'Earlier':'Today'}</small></span><button onClick={()=>location.assign(alert.route)}>{index?'View':'Review'}</button></div>)}{!alerts.length?<div className="empty">No alerts need attention.</div>:null}<button className="open-all" onClick={()=>location.assign('/portfolio')}>Open all alerts →</button></div>
        </div>
      </LargeWidget>

      <MediumWidget col={2} row={23} title="Portfolio Value" badge="live" route="/portfolio"><div className="vxm-portfolio"><div><strong>{money(currentValue)}</strong><span className={delta.pct<0?'red':'green'}>{pct(delta.pct)} this month</span></div><Sparkline values={history.map(row=>row.value)} tone="red"/><footer><span>Cost basis<b>{money(costBasis)}</b></span><span>Unrealized<b className={unrealized<0?'red':'green'}>{money(unrealized)}</b></span><span>Items<b>{units}</b></span><span>Collections<b>{activeCollections.length}</b></span></footer></div></MediumWidget>
      <MediumWidget col={4} row={23} title="Collection Progress" badge="live" route="/portfolio"><div className="vxm-progress-list"><div className="vxm-progress-head"><strong>{Math.round(completionTotal)}%</strong><span>{completionRows.length} measurable collections</span></div>{completionRows.slice(0,3).map(row=><div key={row.name}><span><b>{row.name}</b><em>{row.count}/{row.total}</em></span><i><b style={{width:row.pct+'%'}}/></i></div>)}</div></MediumWidget>

      <MediumWidget col={1} row={25} title="Monthly Budget" badge="live" route="/financial"><div className="vxm-budget"><strong>{budget?money(budgetRemaining):'—'}</strong><span>{budget?'remaining of '+money(budget):'No monthly hobby budget set'}</span><i><b style={{width:(budget?clamp(monthSpend/budget*100):0)+'%'}}/></i><div>{categoryValues.slice(0,4).map(row=><span key={row.name}><b>{row.name}</b><em>{money(row.value)}</em></span>)}</div></div></MediumWidget>
      <MediumWidget col={3} row={25} title="Debt Overview" badge="live" route="/financial"><div className="vxm-debt"><div className="vxm-debt-head"><strong>{money(debt)}</strong><span>{debtAccounts.length} debt accounts</span></div>{debtAccounts.slice(0,4).map(account=><div key={account.id}><span><b>{account.name}</b><em>{account.apr?account.apr.toFixed(1)+'% APR':'Balance'}</em></span><strong>{money(account.currentBalance)}</strong></div>)}</div></MediumWidget>
      <MediumWidget col={5} row={25} title="Savings Goal" badge="live" route="/financial"><div className="vxm-goal"><div className="vxm-goal-ring" style={{'--goal':(activeGoal&&activeGoal.targetAmount?clamp(activeGoal.currentAmount/activeGoal.targetAmount*100):0)+'%'} as CSSProperties}><strong>{activeGoal&&activeGoal.targetAmount?Math.round(activeGoal.currentAmount/activeGoal.targetAmount*100)+'%':'—'}</strong></div><h3>{activeGoal?.name||'No active savings goal'}</h3><span>{activeGoal?money(activeGoal.currentAmount)+' of '+money(activeGoal.targetAmount):'Create one in Financial'}</span></div></MediumWidget>

      <MediumWidget col={1} row={27} title="Today" badge="live" route="/life"><div className="vxm-today"><div className="vxm-today-ring"><strong>{completedToday}/{todayTasks.length}</strong><span>done</span></div><div>{todayTasks.slice(0,4).map(task=><p key={task.id}><i className={task.status==='completed'?'done':''}/><span>{task.title}</span><time>{task.dueTime||''}</time></p>)}</div></div></MediumWidget>
      <MediumWidget col={3} row={27} title="Focus Time" badge="live" route="/life"><div className="vxm-focus"><strong>{Math.floor(focusWeek/60)+'h '+focusWeek%60+'m'}</strong><span>this week</span><div>{focusBars.map((value,index)=><i key={index}><b style={{height:(Math.max(...focusBars,1)?value/Math.max(...focusBars,1)*100:0)+'%'}}/></i>)}</div></div></MediumWidget>
      <MediumWidget col={5} row={27} title="Wishlist Opportunities" badge={wishlist.length?'live':'demo'} route="/wishlist"><div className="vxm-list">{opportunities.slice(0,4).map(record=><div key={record.productId}><span><b>{record.snapshot?.name||record.productId}</b><small>{record.marketSource||'Wishlist'}</small></span><strong className="green">{record.currentMarket!==undefined?money(record.currentMarket):'—'}</strong></div>)}{!opportunities.length?<p className="empty">No tracked items are below target.</p>:null}<button onClick={()=>location.assign('/wishlist')}>Open Wishlist →</button></div></MediumWidget>

      <MediumWidget col={1} row={29} title="Top Grail" badge={topGrail?'live':'demo'} route="/wishlist"><div className="vxm-hero"><div className="vxm-hero-image">{topGrail?.snapshot?.imageUrl?<img src={topGrail.snapshot.imageUrl} alt=""/>:<Star/>}</div><div><h3>{topGrail?.snapshot?.name||'No Grail selected'}</h3><p>{topGrail?.snapshot?.category||'Wishlist'}</p><strong>{topGrail&&typeof topGrail.currentMarket==='number'?money(topGrail.currentMarket):'—'}</strong><small>{topGrail&&typeof topGrail.targetPrice==='number'?'Target '+money(topGrail.targetPrice):'Set a target'}</small></div></div></MediumWidget>
      <MediumWidget col={3} row={29} title="Setup Capacity" badge="live" route="/setup"><div className="vxm-progress-list">{capacities.slice(0,4).map(row=><div key={row.name}><span><b>{row.name}</b><em>{row.used}/{row.total} · {Math.round(row.pct)}%</em></span><i><b style={{width:row.pct+'%'}}/></i></div>)}{!capacities.length?<p className="empty">No measured Setup capacity.</p>:null}</div></MediumWidget>
      <MediumWidget col={5} row={29} title="Sell Revenue" badge="live" route="/sell"><div className="vxm-revenue"><strong>{money(sellRevenue)}</strong><span>{sold.length} sold records</span><Sparkline values={[0,sellRevenue]} tone="red"/><footer><b>Sales {sold.length}</b><b>Profit {money(realized)}</b></footer></div></MediumWidget>

      <MediumWidget col={1} row={31} title="Active Listings" badge="live" route="/sell"><div className="vxm-list"><p className="empty">No active marketplace listings are connected.</p><button onClick={()=>location.assign('/sell')}>Open Sell →</button></div></MediumWidget>
      <MediumWidget col={3} row={31} title="VEXUM Rep" badge="demo" route="/social"><div className="vxm-rep"><div className="vxm-rep-badge"><strong>{rep}</strong></div><div><h3>Level 1 · Collector</h3><p>Complete trusted activity to build VEXUM Rep.</p><i><b style={{width:'0%'}}/></i></div></div></MediumWidget>
      <MediumWidget col={5} row={31} title="Social Activity" badge="demo" route="/social"><div className="vxm-list"><p className="empty">No connected Social activity yet.</p><button onClick={()=>location.assign('/social')}>Open Social →</button></div></MediumWidget>

      <MediumWidget col={1} row={33} title="Radar Watch" badge="demo" route="/radar"><div className="vxm-list">{wishlist.slice(0,3).map(record=><div key={record.productId}><span><b>{record.snapshot?.name||record.productId}</b><small>{record.marketSource||'Wishlist'}</small></span><strong>{record.currentMarket!==undefined?money(record.currentMarket):'—'}</strong></div>)}{!wishlist.length?<p className="empty">No tracked Radar watch items.</p>:null}<button onClick={()=>location.assign('/radar')}>Open Radar →</button></div></MediumWidget>
      <MediumWidget col={3} row={33} title="Needs Attention" badge="live" route="/portfolio"><div className="vxm-list">{alerts.slice(0,4).map((alert,index)=><div key={index}><span><b>{alert.label}</b><small>{alert.text}</small></span><button onClick={()=>location.assign(alert.route)}>View</button></div>)}{!alerts.length?<p className="empty">Everything looks clear.</p>:null}</div></MediumWidget>
      <MediumWidget col={5} row={33} title="Upcoming Events" badge="live" route="/life"><div className="vxm-list">{upcoming.slice(0,4).map(row=><div key={row.sort}><span><b>{row.title}</b><small>{row.kind}</small></span><strong>{new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(row.date+'T12:00:00'))}</strong></div>)}{!upcoming.length?<p className="empty">No upcoming Life events.</p>:null}<button onClick={()=>location.assign('/life')}>Open Life →</button></div></MediumWidget>

      <MediumWidget col={3} row={35} title="Cash Flow" badge="live" route="/financial"><div className="vxm-cashflow"><strong className={cashFlow<0?'red':'green'}>{cashFlow>=0?'+':''}{money(cashFlow)}</strong><span>net this month</span><div>{[incomeMonth,expenseMonth,Math.max(0,incomeMonth-expenseMonth),expenseMonth*.7,incomeMonth*.8].map((value,index)=><i key={index}><b className={index===1||index===3?'red':''} style={{height:(Math.max(incomeMonth,expenseMonth,1)?value/Math.max(incomeMonth,expenseMonth,1)*100:0)+'%'}}/></i>)}</div><footer><span>Income {money(incomeMonth)}</span><span>Outflow {money(expenseMonth)}</span></footer></div></MediumWidget>
    </div>
  </div>;
}

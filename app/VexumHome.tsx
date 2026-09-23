'use client';

import {useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  AlertTriangle,Bell,CalendarDays,ChevronRight,CircleDollarSign,GripVertical,Layers3,
  MoreHorizontal,MoveDiagonal2,PackageCheck,Plus,RefreshCw,Settings2,ShoppingBag,SlidersHorizontal,
  Sparkles,Star,TrendingDown,TrendingUp,WalletCards,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {DEMO_HOME_DATA,HOME_WIDGET_TITLES,defaultHomeDashboard,normalizeHomeDashboard,type HomeWidgetId,type HomeWidgetLayout,type HomeWidgetSize} from '../lib/home';
import {normalizeFinancialData} from '../lib/financial';
import {normalizeSetupData} from '../lib/setup';
import {normalizePortfolioPreferences} from '../lib/portfolio';
import {habitMomentum,normalizeLifeData,todayKey} from '../lib/life';
import {normalizePlatformState,type VexumModuleId} from '../lib/platform';
import type {Collection,Item,Store} from '../lib/model';
import {VexumBadge,VexumConfirmDialog,VexumDialog,pushVexumToast} from './VexumUi';

type Tone='green'|'red'|'orange'|'muted';
type BriefLine={before:string;value?:string;after?:string;tone?:Tone};

const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<100?2:0}).format(value);
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(value));

function greeting(){
  const hour=new Date().getHours();
  return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
}

function DashboardChart({values}:{values:number[]}){
  const clean=values.filter(Number.isFinite);
  if(clean.length<2)return <div className="vxh-chart-empty">Portfolio history is not available yet.</div>;
  const min=Math.min(...clean),max=Math.max(...clean),range=Math.max(1,max-min);
  const points=clean.map((value,index)=>{
    const x=(index/(clean.length-1))*700;
    const y=220-((value-min)/range)*175;
    return [x,y] as const;
  });
  const line=points.map(([x,y],index)=>(index?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
  const fill=line+' L700 235 L0 235 Z';
  return <svg className="vxh-chart" viewBox="0 0 700 250" preserveAspectRatio="none">
    <defs><linearGradient id="vxh-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff2338" stopOpacity=".26"/><stop offset="1" stopColor="#ff2338" stopOpacity="0"/></linearGradient></defs>
    {[45,90,135,180,225].map(y=><line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#1d1f23"/>)}
    <path d={fill} fill="url(#vxh-chart-fill)"/><path d={line} fill="none" stroke="#ff2338" strokeWidth="3"/>
  </svg>;
}

function SourceBadge({source}:{source:'live'|'demo'|'mixed'}){
  return <VexumBadge className="vxh-source" tone={source==='live'?'success':source==='demo'?'warning':'danger'}>{source==='live'?'LIVE':source==='mixed'?'MIXED':'DEMO'}</VexumBadge>;
}

function WidgetShell({layout,editing,dragged,dragOver,onDragStart,onDragEnter,onDragEnd,onHide,onResize,onConfigure,menuFor,setMenuFor,source,children}:{
  layout:HomeWidgetLayout;editing:boolean;dragged:HomeWidgetId|null;dragOver:HomeWidgetId|null;onDragStart:(id:HomeWidgetId)=>void;onDragEnter:(id:HomeWidgetId)=>void;onDragEnd:()=>void;
  onHide:(id:HomeWidgetId)=>void;onResize:(id:HomeWidgetId)=>void;onConfigure:(id:HomeWidgetId)=>void;menuFor:HomeWidgetId|null;
  setMenuFor:(id:HomeWidgetId|null)=>void;source:'live'|'demo'|'mixed';children:ReactNode;
}){
  return <section className={'vxh-widget vx-panel size-'+layout.size+(editing?' editing':'')+(dragged===layout.id?' dragging':'')+(dragOver===layout.id&&dragged!==layout.id?' drag-over':'')} draggable={editing}
    onDragStart={event=>{if((event.target as HTMLElement).closest('button')){event.preventDefault();return}event.dataTransfer.effectAllowed='move';onDragStart(layout.id)}}
    onDragEnter={()=>editing&&onDragEnter(layout.id)} onDragOver={event=>{if(editing){event.preventDefault();event.dataTransfer.dropEffect='move'}}} onDrop={event=>editing&&event.preventDefault()} onDragEnd={onDragEnd}>
    <header><div><span className="vxh-widget-icon">{widgetIcon(layout.id)}</span><h3>{HOME_WIDGET_TITLES[layout.id]}</h3><SourceBadge source={source}/></div>
      {editing?<div className="vxh-edit-controls"><button onClick={()=>onConfigure(layout.id)} title="Configure widget" aria-label={'Configure '+HOME_WIDGET_TITLES[layout.id]}><Settings2/></button><button onClick={()=>onHide(layout.id)} title="Hide widget" aria-label={'Hide '+HOME_WIDGET_TITLES[layout.id]}><X/></button></div>:
      <div className="vxh-menu-wrap"><button onClick={()=>setMenuFor(menuFor===layout.id?null:layout.id)}><MoreHorizontal/></button>{menuFor===layout.id?<div className="vxh-widget-menu"><button onClick={()=>{onConfigure(layout.id);setMenuFor(null)}}>Configure</button><button onClick={()=>{onResize(layout.id);setMenuFor(null)}}>Resize</button><button onClick={()=>{onHide(layout.id);setMenuFor(null)}}>Hide</button></div>:null}</div>}
    </header>{children}
    {editing?<button className="vxh-resize-handle" onClick={()=>onResize(layout.id)} title="Resize widget" aria-label={'Resize '+HOME_WIDGET_TITLES[layout.id]}><MoveDiagonal2/></button>:null}
  </section>;
}

function widgetIcon(id:HomeWidgetId){
  if(['collectionValue','costBasis','profitLoss','monthlySpend','finance'].includes(id))return <CircleDollarSign/>;
  if(id==='portfolioPerformance')return <TrendingUp/>;
  if(id==='brief')return <Sparkles/>;
  if(id==='wishlist')return <Star/>;
  if(id==='radar'||id==='alerts')return <Bell/>;
  if(id==='progress'||id==='capacity')return <Layers3/>;
  if(id==='purchases'||id==='sales')return <ShoppingBag/>;
  if(id==='calendar')return <CalendarDays/>;
  return <PackageCheck/>;
}

function descendants(collectionId:string,collections:Collection[]){
  const result=new Set<string>([collectionId]);
  let changed=true;
  while(changed){
    changed=false;
    for(const collection of collections){
      if(collection.parentCollectionId&&result.has(collection.parentCollectionId)&&!result.has(collection.id)){result.add(collection.id);changed=true}
    }
  }
  return result;
}

function setupCapacityRows(store:Store){
  const setup=normalizeSetupData(store.setup);
  const rows=setup.objects.filter(object=>object.capacityValue&&object.capacityValue>0).map(object=>{
    const used=setup.placements.filter(placement=>placement.setupObjectId===object.id).length;
    const pct=Math.min(100,Math.round((used/(object.capacityValue||1))*100));
    return {name:object.name,pct,label:used+' / '+object.capacityValue};
  }).sort((a,b)=>b.pct-a.pct);
  return rows;
}

export default function VexumHome(){
  const workspace=useWorkspace();
  const state=normalizeHomeDashboard(workspace.data.homeDashboard);
  const platform=normalizePlatformState(workspace.data.platform,true);
  const [editing,setEditing]=useState(false);
  const [dragged,setDragged]=useState<HomeWidgetId|null>(null);
  const [dragOver,setDragOver]=useState<HomeWidgetId|null>(null);
  const [dragOrder,setDragOrder]=useState<HomeWidgetId[]|null>(null);
  const [menuFor,setMenuFor]=useState<HomeWidgetId|null>(null);
  const [libraryOpen,setLibraryOpen]=useState(false);
  const [configureTarget,setConfigureTarget]=useState<HomeWidgetId|null>(null);
  const [configureValue,setConfigureValue]=useState('');
  const [resetOpen,setResetOpen]=useState(false);

  const owned=workspace.data.items.filter(item=>item.status==='owned'&&!item.archivedAt);
  const sold=workspace.data.items.filter(item=>item.status==='sold');
  const hasPortfolio=owned.length>0;
  const currentValue=hasPortfolio?owned.reduce((sum,item)=>sum+item.currentValue*item.quantity,0):DEMO_HOME_DATA.portfolio.currentValue;
  const costBasis=hasPortfolio?owned.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0):DEMO_HOME_DATA.portfolio.costBasis;
  const pl=currentValue-costBasis;
  const plPct=costBasis?pl/costBasis*100:0;

  const financial=normalizeFinancialData(workspace.data.financial);
  const life=normalizeLifeData(workspace.data.life);
  const today=todayKey();
  const lifeOpenTasks=life.tasks.filter(task=>!['completed','cancelled'].includes(task.status));
  const lifeTodayTasks=lifeOpenTasks.filter(task=>task.dueDate===today||task.scheduledStart?.startsWith(today));
  const lifeTodayEvents=life.events.filter(event=>event.start.startsWith(today));
  const lifeCalendarRows=useMemo(()=>{
    const rows:Array<{date:string;title:string;kind:string;sort:string}>=[];
    for(const task of lifeOpenTasks.filter(task=>task.dueDate)){
      rows.push({date:task.dueDate!,title:task.title,kind:'Task',sort:task.dueDate!+'T'+(task.dueTime||'23:59')});
    }
    for(const event of life.events)rows.push({date:event.start.slice(0,10),title:event.title,kind:'Event',sort:event.start});
    if(platform.lifeSections.includes('Fitness'))for(let offset=0;offset<7;offset++){
      const d=new Date();d.setDate(d.getDate()+offset);
      for(const plan of life.workoutPlans.filter(plan=>plan.active&&plan.days.includes(d.getDay()))){
        const key=todayKey(d);rows.push({date:key,title:plan.name,kind:'Workout',sort:key+'T'+(plan.time||'23:00')});
      }
    }
    return rows.filter(row=>row.date>=today).toSorted((a,b)=>a.sort.localeCompare(b.sort)).slice(0,5);
  },[life.tasks,life.events,life.workoutPlans,today,platform.lifeSections]);
  const month=new Date().toISOString().slice(0,7);
  const liveMonthSpend=financial.transactions.filter(tx=>tx.direction==='expense'&&tx.isHobby&&tx.date.startsWith(month)).reduce((sum,tx)=>sum+tx.amount,0);
  const liveBudget=workspace.data.financialPreferences?.monthlyHobbyBudget||financial.budgets.find(budget=>budget.active&&budget.period==='monthly'&&(!budget.category||/hobby|collect/i.test(budget.category)))?.amount;
  const hasSpend=Boolean(liveBudget||liveMonthSpend);
  const monthSpend=hasSpend?liveMonthSpend:DEMO_HOME_DATA.monthlySpend.spent;
  const monthBudget=liveBudget||DEMO_HOME_DATA.monthlySpend.budget;

  const historyValues=useMemo(()=>{
    const rows=(workspace.data.history||[]).slice(-30).map(snapshot=>Object.values(snapshot.values).reduce((sum,value)=>sum+value,0)).filter(value=>value>0);
    return rows.length>=3?rows:[...DEMO_HOME_DATA.portfolio.chart];
  },[workspace.data.history]);

  const liveWishlist=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived&&typeof record.currentMarket==='number'&&(
    (typeof record.targetPrice==='number'&&record.currentMarket<=record.targetPrice)||
    (typeof record.maximumPrice==='number'&&record.currentMarket<=record.maximumPrice)
  )).sort((a,b)=>(a.currentMarket||0)-(b.currentMarket||0)).slice(0,12);

  const progressRows=workspace.data.collections.filter(collection=>collection.measurable&&collection.targetItemCount&&collection.targetItemCount>0).map(collection=>{
    const ids=descendants(collection.id,workspace.data.collections);
    const count=owned.filter(item=>ids.has(item.collectionId)).reduce((sum,item)=>sum+item.quantity,0);
    return {name:collection.name,count,total:collection.targetItemCount||0};
  }).slice(0,12);

  const recentPurchases=owned.toSorted((a,b)=>(b.purchaseDate||b.createdAt).localeCompare(a.purchaseDate||a.createdAt)).slice(0,12);
  const recentSales=sold.toSorted((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,12);
  const capacityRows=setupCapacityRows(workspace.data).slice(0,12);
  const auditCounts=useMemo(()=>{
    const setup=normalizeSetupData(workspace.data.setup);
    const placed=new Set(setup.placements.filter(p=>p.kind==='owned'&&p.portfolioItemId).map(p=>p.portfolioItemId!));
    const missingLocation=owned.filter(item=>!placed.has(item.id)&&!item.location.trim()).length;
    const missingImages=owned.filter(item=>!item.image).length;
    const missingCost=owned.filter(item=>item.purchasePrice<=0).length;
    const keys=new Map<string,number>();
    for(const item of owned){
      const key=(item.identity?.upc||item.identity?.sku||item.name).toLowerCase().replace(/[^a-z0-9]+/g,'');
      keys.set(key,(keys.get(key)||0)+1);
    }
    const duplicates=[...keys.values()].filter(value=>value>1).length;
    return {missingLocation,missingImages,missingCost,duplicates,total:missingLocation+missingImages+missingCost+duplicates};
  },[owned,workspace.data.setup]);

  const todayBills=financial.bills.filter(bill=>bill.active&&(bill.nextDueDate===today||(!bill.nextDueDate&&bill.dueDay===new Date().getDate())));
  const preorderSoon=wishlist.filter(record=>{
    const preorder=record.preorder;
    if(!preorder?.enabled||preorder.status==='Cancelled'||preorder.status==='Delivered')return false;
    const date=preorder.estimatedChargeDate;
    if(!date)return false;
    const delta=Date.parse(date+'T12:00:00')-Date.now();
    return Number.isFinite(delta)&&delta>=0&&delta<=14*86400000;
  });
  const portfolioSnapshots=(workspace.data.history||[]).slice(-2).map(snapshot=>Object.values(snapshot.values).reduce((sum,value)=>sum+value,0));
  const previousPortfolioValue=portfolioSnapshots.at(-2);
  const latestPortfolioValue=portfolioSnapshots.at(-1);
  const portfolioDeltaPct=typeof previousPortfolioValue==='number'&&previousPortfolioValue>0&&typeof latestPortfolioValue==='number'
    ?(latestPortfolioValue-previousPortfolioValue)/previousPortfolioValue*100:null;
  const leadingProgress=progressRows[0];
  const briefLines:BriefLine[]=[
    portfolioDeltaPct!==null?{
      before:'Your Portfolio ',value:(portfolioDeltaPct>=0?'increased +':'decreased ')+portfolioDeltaPct.toFixed(1)+'%',after:' since the previous snapshot.',tone:portfolioDeltaPct>=0?'green':'red'
    }:hasPortfolio?{before:'Your Portfolio is currently ',value:money(currentValue),after:'.'}:{before:'Your Portfolio is ready for your first owned item.'},
    liveWishlist.length?{before:'',value:String(liveWishlist.length)+' Wishlist item'+(liveWishlist.length===1?'':'s'),after:' '+(liveWishlist.length===1?'is':'are')+' at or below your target price.',tone:'green'}:{before:'No Wishlist items are currently below your target price.'},
    ...todayBills.slice(0,2).map(bill=>({before:bill.name+' of ',value:money(bill.amount),after:' is due today.',tone:'red' as Tone})),
    preorderSoon.length?{before:'',value:String(preorderSoon.length)+' preorder'+(preorderSoon.length===1?'':'s'),after:' '+(preorderSoon.length===1?'releases':'release')+' or may charge within 14 days.',tone:'orange'}:{before:'No preorder charges are scheduled within the next 14 days.'},
    leadingProgress?{before:'Your '+leadingProgress.name+' collection is now ',value:Math.min(100,Math.round(leadingProgress.count/Math.max(1,leadingProgress.total)*100))+'% complete',after:'.',tone:'green'}:{before:'Add a measurable collection to track completion here.'},
    lifeTodayTasks.length||lifeTodayEvents.length?{before:'Today you have ',value:lifeTodayTasks.length+' task'+(lifeTodayTasks.length===1?'':'s')+' and '+lifeTodayEvents.length+' event'+(lifeTodayEvents.length===1?'':'s'),after:'.'}:{before:'Your Life schedule is clear today.'},
    hasSpend?{before:'Hobby spending is at ',value:money(monthSpend)+' of '+money(monthBudget),after:' this month.',tone:monthSpend>monthBudget?'red':'orange'}:{before:'No hobby budget activity is recorded this month.'},
    capacityRows[0]?{before:capacityRows[0].name+' is ',value:capacityRows[0].pct+'% full',after:'.',tone:capacityRows[0].pct>=90?'red':capacityRows[0].pct>=75?'orange':'muted'}:{before:'No measured Setup capacity needs attention.'}
  ];


  const updateDashboard=(widgets:HomeWidgetLayout[])=>workspace.update({...workspace.data,homeDashboard:{version:1,widgets,updatedAt:new Date().toISOString()}});
  const hide=(id:HomeWidgetId)=>updateDashboard(state.widgets.map(widget=>widget.id===id?{...widget,visible:false}:widget));
  const show=(id:HomeWidgetId)=>updateDashboard(state.widgets.map(widget=>widget.id===id?{...widget,visible:true}:widget));
  const resize=(id:HomeWidgetId)=>{
    const cycle:HomeWidgetSize[]=['metric','medium','large','wide','full'];
    updateDashboard(state.widgets.map(widget=>{
      if(widget.id!==id)return widget;
      const next=cycle[(cycle.indexOf(widget.size)+1)%cycle.length];
      const width=next==='metric'?3:next==='medium'?4:next==='large'?6:next==='wide'?8:12;
      return {...widget,size:next,width};
    }));
  };
  const configure=(id:HomeWidgetId)=>{
    const widget=state.widgets.find(entry=>entry.id===id);if(!widget)return;
    if(id==='portfolioPerformance'){setConfigureTarget(id);setConfigureValue(String(widget.config.interval||'30D'));return}
    if(['brief','wishlist','radar','progress','purchases','sales','capacity','alerts','social','calendar'].includes(id)){
      const fallback=id==='brief'?6:id==='progress'?3:5;
      setConfigureTarget(id);setConfigureValue(String(widget.config.count||fallback));return;
    }
    pushVexumToast({title:'This widget uses automatic settings.',message:'More widget-specific controls are being added without changing your saved layout.',kind:'info'});
  };
  const saveConfigure=()=>{
    if(!configureTarget)return;
    if(configureTarget==='portfolioPerformance'){
      const value=configureValue.trim().toUpperCase();
      if(!['7D','30D','3M','6M','1Y','ALL'].includes(value)){pushVexumToast({title:'Choose a valid interval.',message:'Use 7D, 30D, 3M, 6M, 1Y, or ALL.',kind:'warning'});return}
      updateDashboard(state.widgets.map(entry=>entry.id===configureTarget?{...entry,config:{...entry.config,interval:value}}:entry));
    }else{
      const value=Number(configureValue);
      if(!Number.isFinite(value)||value<1){pushVexumToast({title:'Enter a valid row count.',message:'Choose a number from 1 to 12.',kind:'warning'});return}
      updateDashboard(state.widgets.map(entry=>entry.id===configureTarget?{...entry,config:{...entry.config,count:Math.min(12,Math.round(value))}}:entry));
    }
    setConfigureTarget(null);setConfigureValue('');
    pushVexumToast({title:'Widget updated.',kind:'success'});
  };
  const startDrag=(id:HomeWidgetId)=>{
    const ids=state.widgets.filter(widget=>widget.visible&&moduleAllows(widget.id)).map(widget=>widget.id);
    setDragged(id);setDragOver(id);setDragOrder(ids);
  };
  const previewDrag=(target:HomeWidgetId)=>{
    if(!dragged||dragged===target)return;
    setDragOver(target);
    setDragOrder(current=>{
      const ids=current?[...current]:state.widgets.filter(widget=>widget.visible&&moduleAllows(widget.id)).map(widget=>widget.id);
      const from=ids.indexOf(dragged),to=ids.indexOf(target);
      if(from<0||to<0||from===to)return ids;
      ids.splice(from,1);ids.splice(to,0,dragged);return ids;
    });
  };
  const finishDrag=()=>{
    if(dragged&&dragOrder){
      const order=new Map(dragOrder.map((id,index)=>[id,index]));
      const visibleWidgets=state.widgets.filter(widget=>widget.visible&&moduleAllows(widget.id)).toSorted((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
      const visibleIndex=new Map(visibleWidgets.map((widget,index)=>[widget.id,index]));
      updateDashboard(state.widgets.map(widget=>{
        const index=visibleIndex.get(widget.id);
        return index===undefined?widget:{...widget,x:index%4,y:Math.floor(index/4)};
      }).toSorted((a,b)=>{
        const ai=visibleIndex.get(a.id),bi=visibleIndex.get(b.id);
        if(ai!==undefined&&bi!==undefined)return ai-bi;
        if(ai!==undefined)return -1;if(bi!==undefined)return 1;return 0;
      }));
    }
    setDragged(null);setDragOver(null);setDragOrder(null);
  };
  const reset=()=>setResetOpen(true);
  const confirmReset=()=>{workspace.update({...workspace.data,homeDashboard:defaultHomeDashboard()});setResetOpen(false);pushVexumToast({title:'Home layout reset.',kind:'success'})};

  const widgetModule=(id:HomeWidgetId):VexumModuleId|undefined=>{
    if(['collectionValue','costBasis','profitLoss','portfolioPerformance','progress','purchases'].includes(id))return 'portfolio';
    if(['monthlySpend','finance'].includes(id))return 'financial';
    if(['wishlist','radar'].includes(id))return 'wishlist';
    if(id==='sales')return 'sell';
    if(id==='capacity')return 'setup';
    if(id==='social')return 'social';
    if(id==='calendar')return 'life';
    return undefined;
  };
  const moduleAllows=(id:HomeWidgetId)=>{const required=widgetModule(id);return !required||platform.enabledModules.includes(required)};
  const visibleBase=state.widgets.filter(widget=>widget.visible&&moduleAllows(widget.id));
  const visible=dragOrder?[...visibleBase].toSorted((a,b)=>dragOrder.indexOf(a.id)-dragOrder.indexOf(b.id)):visibleBase;
  const hidden=state.widgets.filter(widget=>!widget.visible&&moduleAllows(widget.id));
  const profileName=workspace.data.profile?.name?.trim();
  const dateLabel=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());

  const sourceFor=(id:HomeWidgetId):'live'|'demo'|'mixed'=> {
    if(['collectionValue','costBasis','profitLoss','portfolioPerformance'].includes(id))return hasPortfolio?'live':'demo';
    if(id==='monthlySpend'||id==='finance')return hasSpend?'live':'demo';
    if(id==='wishlist')return liveWishlist.length?'live':'demo';
    if(id==='progress')return progressRows.length?'live':'demo';
    if(id==='purchases')return recentPurchases.length?'live':'demo';
    if(id==='sales')return recentSales.length?'live':'demo';
    if(id==='capacity')return capacityRows.length?'live':'demo';
    if(id==='alerts')return auditCounts.total?'mixed':'demo';
    if(id==='brief')return 'mixed';
    if(id==='calendar')return lifeCalendarRows.length?'live':'demo';
    return 'demo';
  };

  const render=(layout:HomeWidgetLayout)=>{
    const source=sourceFor(layout.id);
    const shell=(body:ReactNode)=><WidgetShell key={layout.id} layout={layout} editing={editing} dragged={dragged} dragOver={dragOver} onDragStart={startDrag} onDragEnter={previewDrag} onDragEnd={finishDrag} onHide={hide} onResize={resize} onConfigure={configure} menuFor={menuFor} setMenuFor={setMenuFor} source={source}>{body}</WidgetShell>;
    if(layout.id==='collectionValue')return shell(<div className="vxh-metric"><strong>{money(currentValue)}</strong><span className={hasPortfolio?'tone-muted':'tone-green'}>{hasPortfolio?owned.reduce((s,i)=>s+i.quantity,0)+' owned units':'+'+money(DEMO_HOME_DATA.portfolio.changeYesterday)+' yesterday'}</span></div>);
    if(layout.id==='costBasis')return shell(<div className="vxh-metric"><strong>{money(costBasis)}</strong><span>{hasPortfolio?'Recorded acquisition cost':'Demo ownership basis'}</span></div>);
    if(layout.id==='profitLoss')return shell(<div className="vxh-metric"><strong className={pl>=0?'tone-green':'tone-red'}>{pl>=0?'+':''}{money(pl)}</strong><span className={pl>=0?'tone-green':'tone-red'}>{plPct>=0?'+':''}{plPct.toFixed(1)}%</span></div>);
    if(layout.id==='monthlySpend')return shell(<div className="vxh-metric"><strong>{money(monthSpend)} <small>/ {money(monthBudget)}</small></strong><span>{monthBudget?Math.round(monthSpend/monthBudget*100):0}% of monthly target</span><div className="vxh-progress"><i style={{width:Math.min(100,monthBudget?monthSpend/monthBudget*100:0)+'%'}}/></div></div>);
    if(layout.id==='portfolioPerformance')return shell(<div className="vxh-performance"><div className="vxh-chart-head"><div><strong>{money(currentValue)}</strong><span>{source==='live'?'Workspace value history':'Isolated dashboard demo history'}</span></div><div>{['7D','30D','3M','6M','1Y','ALL'].map(interval=><button className={(layout.config.interval||'30D')===interval?'active':''} key={interval} onClick={()=>updateDashboard(state.widgets.map(w=>w.id===layout.id?{...w,config:{...w.config,interval}}:w))}>{interval}</button>)}</div></div><DashboardChart values={historyValues}/><footer><span><i className="red"/>Market value</span><span><i/>Cost basis {money(costBasis)}</span></footer></div>);
    if(layout.id==='brief'){
      return shell(<div className="vxh-brief vxh-brief-feed"><div className="vxh-brief-lead"><Sparkles/><span><strong>{greeting()}{profileName?', '+profileName:''}.</strong><small>What changed and what needs attention.</small></span></div>{briefLines.slice(0,Number(layout.config.count)||6).map((line,index)=><p className="vxh-brief-sentence" key={index}>{line.before}{line.value?<strong className={line.tone?'tone-'+line.tone:''}>{line.value}</strong>:null}{line.after}</p>)}</div>);
    }
    if(layout.id==='wishlist')return shell(<div className="vxh-list">{(liveWishlist.length?liveWishlist.map(record=>({name:record.snapshot?.name||record.productId,sub:'Target '+money(record.targetPrice||record.maximumPrice||0),value:money(record.currentMarket||0),tone:'green' as Tone})):DEMO_HOME_DATA.wishlist.map(row=>({name:row[0],sub:'Target '+row[2]+' · '+row[4],value:row[3],tone:'green' as Tone}))).slice(0,Number(layout.config.count)||5).map(row=><div key={row.name}><Star/><span><strong>{row.name}</strong><small>{row.sub}</small></span><b className={'tone-'+row.tone}>{row.value}</b></div>)}<button onClick={()=>location.assign('/wishlist')}>Open Wishlist <ChevronRight/></button></div>);
    if(layout.id==='radar')return shell(<div className="vxh-radar">{DEMO_HOME_DATA.radar.slice(0,Number(layout.config.count)||5).map(row=><div key={row[1]}><VexumBadge tone={row[0]==='RESTOCK'?'success':row[0]==='DROP'?'danger':'info'}>{row[0]}</VexumBadge><span><strong>{row[1]}</strong><small>{row[3]}</small></span><b>{row[2]}</b></div>)}<p>Demo fixture until Radar/provider events are wired to Home.</p></div>);
    if(layout.id==='progress'){
      const rows=progressRows.length?progressRows:DEMO_HOME_DATA.progress.map(row=>({name:row[0],count:row[1],total:row[2]}));
      return shell(<div className="vxh-progress-list">{rows.slice(0,Number(layout.config.count)||3).map(row=>{const pct=row.total?Math.min(100,Math.round(row.count/row.total*100)):0;return <div key={row.name}><span><strong>{row.name}</strong><b>{row.count} / {row.total} · {pct}%</b></span><div className="vxh-progress"><i style={{width:pct+'%'}}/></div></div>})}</div>);
    }
    if(layout.id==='purchases'){
      const rows=recentPurchases.length?recentPurchases.map(item=>({name:item.name,date:item.purchaseDate||item.createdAt,paid:item.purchasePrice,market:item.currentValue,image:item.image})):DEMO_HOME_DATA.purchases.map(row=>({name:row[0],date:row[1],paid:row[2],market:row[3],image:''}));
      return shell(<HomeTable headers={['Product','Date','Paid','Market']} rows={rows.slice(0,Number(layout.config.count)||5).map(row=>[<ItemLabel key={row.name} name={row.name} image={row.image}/>,row.date.includes('-')?shortDate(row.date):row.date,money(row.paid),money(row.market)])}/>);
    }
    if(layout.id==='sales'){
      const rows=recentSales.length?recentSales.map(item=>[<ItemLabel key={item.id} name={item.name} image={item.image}/>,money(item.currentValue*item.quantity),money((item.currentValue-item.purchasePrice)*item.quantity),'Sold']):DEMO_HOME_DATA.sales.map(row=>[row[0],money(row[1]),'+'+money(row[2]),row[3]]);
      return shell(<HomeTable headers={['Product','Sold','Profit','Platform']} rows={rows.slice(0,Number(layout.config.count)||5)}/>);
    }
    if(layout.id==='capacity'){
      const rows=capacityRows.length?capacityRows:DEMO_HOME_DATA.capacity.map(row=>({name:row[0],pct:row[1],label:row[2]}));
      return shell(<div className="vxh-capacity-list">{rows.slice(0,Number(layout.config.count)||5).map(row=><div key={row.name}><span><strong>{row.name}</strong><b>{row.label}</b></span><div className="vxh-progress"><i style={{width:row.pct+'%'}}/></div></div>)}<button onClick={()=>location.assign('/setup')}>Open Setup <ChevronRight/></button></div>);
    }
    if(layout.id==='alerts'){
      const liveRows=auditCounts.total?[
        auditCounts.duplicates?['Possible duplicates',auditCounts.duplicates+' groups need review']:null,
        auditCounts.missingLocation?['Missing Setup location',auditCounts.missingLocation+' owned items']:null,
        auditCounts.missingImages?['Missing images',auditCounts.missingImages+' owned items']:null,
        auditCounts.missingCost?['Missing cost basis',auditCounts.missingCost+' owned items']:null
      ].filter(Boolean) as string[][]:DEMO_HOME_DATA.alerts.map(row=>[row[0],row[1]]);
      return shell(<div className="vxh-alert-list">{liveRows.slice(0,Number(layout.config.count)||5).map(row=><div key={row[0]}><AlertTriangle/><span><strong>{row[0]}</strong><small>{row[1]}</small></span></div>)}<button onClick={()=>location.assign('/portfolio')}>Review Portfolio Audit <ChevronRight/></button></div>);
    }
    if(layout.id==='finance'){
      const debt=financial.accounts.filter(a=>['credit_card','student_loan','auto_loan','mortgage','personal_loan','other_liability'].includes(a.type)).reduce((sum,a)=>sum+Math.max(0,a.currentBalance),0);
      const cash=financial.accounts.filter(a=>['checking','savings','cash'].includes(a.type)).reduce((sum,a)=>sum+a.currentBalance,0);
      return shell(<div className="vxh-finance"><div><span>Cash</span><strong>{source==='live'?money(cash):'$2,470'}</strong></div><div><span>Debt</span><strong>{source==='live'?money(debt):'$4,220'}</strong></div><div><span>Hobby spend</span><strong>{money(monthSpend)}</strong></div><button onClick={()=>location.assign('/financial')}>Open Financial <ChevronRight/></button></div>);
    }
    if(layout.id==='social')return shell(<div className="vxh-social-list">{DEMO_HOME_DATA.social.slice(0,Number(layout.config.count)||5).map(row=><div key={row[0]}><span className="vxh-avatar">{row[0][0]}</span><span><strong>{row[0]}</strong><small>{row[1]}</small></span></div>)}<p>Demo summary until a Social Home adapter is enabled.</p><button onClick={()=>location.assign('/social')}>Open Social <ChevronRight/></button></div>);
    if(layout.id==='calendar'){
      const rows=lifeCalendarRows.length?lifeCalendarRows.map(row=>[new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(row.date+'T12:00:00')),row.title,row.kind] as const):DEMO_HOME_DATA.calendar;
      return shell(<div className="vxh-calendar">{rows.slice(0,Number(layout.config.count)||5).map(row=><div key={row[0]+row[1]}><time>{row[0]}</time><span><strong>{row[1]}</strong><small>{row[2]}</small></span></div>)}<p>{lifeCalendarRows.length?'Live from Life tasks, events, and workout plans.':'Demo release fixture until Life has scheduled data.'}</p><button onClick={()=>location.assign('/life')}>Open Life <ChevronRight/></button></div>);
    }
    return shell(<div/>);
  };

  return <div className="vxh-page">
    <section className="vxh-title">
      <div><span>HOME</span><div className="vxh-greeting-row"><h1>{greeting()}{profileName?', '+profileName:''}.</h1><img className="vxh-wordmark" src="/vexum-wordmark.png" alt="VEXUM"/></div><p>{dateLabel} · Your VEXUM command center.</p></div>
      <div className="vxh-title-actions"><button className={editing?'active':''} onClick={()=>setEditing(value=>!value)}><SlidersHorizontal/>{editing?'Done Editing':'Edit Widgets'}</button></div>
    </section>
    <div className="vxh-editbar">
      {editing?<><span><GripVertical/>Grab any widget to move it. The grid previews the new position before you drop. Use the large corner control to resize.</span><button onClick={()=>setLibraryOpen(value=>!value)}><Plus/>Add Widget</button><button onClick={reset}><RefreshCw/>Reset Layout</button></>:<span>Each widget can move from DEMO → LIVE independently without rebuilding Home.</span>}
    </div>
    {libraryOpen&&editing?<section className="vxh-library vx-panel"><header><div><strong>Widget Library</strong><span>Hidden widgets can be restored. Widgets for disabled modules stay out of the way until that module is enabled.</span></div><button onClick={()=>setLibraryOpen(false)}><X/></button></header><div>{hidden.length?hidden.map(widget=><button key={widget.id} onClick={()=>show(widget.id)}><span>{widgetIcon(widget.id)}</span><strong>{HOME_WIDGET_TITLES[widget.id]}</strong><Plus/></button>):<p>Every current widget is visible.</p>}</div></section>:null}
    <div className="vxh-grid">{visible.map(render)}</div>
    <VexumDialog open={Boolean(configureTarget)} onClose={()=>{setConfigureTarget(null);setConfigureValue('')}} title="Configure Widget" eyebrow="HOME" description={configureTarget==='portfolioPerformance'?'Choose the default chart interval.':'Choose how many rows this widget should display.'} size="sm"
      footer={<><button className="vxui-button secondary" onClick={()=>{setConfigureTarget(null);setConfigureValue('')}}>Cancel</button><button className="vxui-button primary" onClick={saveConfigure}>Save</button></>}>
      <label className="vxh-config-field">{configureTarget==='portfolioPerformance'?'Chart interval':'Rows'}<input autoFocus value={configureValue} onChange={e=>setConfigureValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveConfigure()}} placeholder={configureTarget==='portfolioPerformance'?'30D':'5'}/></label>
      <small className="vxh-config-help">{configureTarget==='portfolioPerformance'?'Allowed: 7D, 30D, 3M, 6M, 1Y, ALL':'Allowed: 1–12 rows'}</small>
    </VexumDialog>
    <VexumConfirmDialog open={resetOpen} onClose={()=>setResetOpen(false)} onConfirm={confirmReset} title="Reset Home layout?" description="This restores the official VEXUM widget layout. Your Portfolio, Financial, Wishlist, Life, and other underlying data will not be deleted." confirmLabel="Reset Layout" danger/>
  </div>;
}

function ItemLabel({name,image}:{name:string;image:string}){
  return <span className="vxh-item-label"><i style={image?{backgroundImage:'url("'+image.replaceAll('"','')+'")'}:undefined}>{image?'':<Layers3/>}</i><strong>{name}</strong></span>;
}

function HomeTable({headers,rows}:{headers:string[];rows:Array<Array<ReactNode|string|number>>}){
  return <div className="vxh-table"><div className="head">{headers.map(header=><span key={header}>{header}</span>)}</div>{rows.map((row,index)=><div key={index}>{row.map((cell,cellIndex)=><span key={cellIndex}>{cell}</span>)}</div>)}</div>;
}

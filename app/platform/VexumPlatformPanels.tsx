'use client';

import {useEffect,useMemo,useState} from 'react';
import {
  Bell,CalendarDays,Check,ChevronRight,CircleDollarSign,Clock3,Dumbbell,FileText,Goal,Inbox,
  Layers3,ListTodo,Plus,Search,ShoppingBag,Sparkles,Star,Target,X
} from 'lucide-react';
import type {useWorkspace} from '../../lib/useWorkspace';
import {emptyLifeData,newLifeId,normalizeLifeData,parseNaturalTask,todayKey,type LifeEvent,type LifeGoal,type LifeHabit,type LifeTask,type WorkoutPlan} from '../../lib/life';
import {normalizeFinancialData,newFinancialId} from '../../lib/financial';
import {buildSellNotifications,buildVexumNotifications,completeNotificationTask,type VexumNotification,type VexumNotificationCategory} from '../../lib/platformNotifications';
import {loadSellWorkspace} from '../../lib/sellCloud';
import {normalizePlatformState,type PlatformState,type VexumModuleId} from '../../lib/platform';

type Workspace=ReturnType<typeof useWorkspace>;
type Navigate=(view:VexumModuleId|'settings')=>void;

export type QuickAddType='task'|'reminder'|'event'|'habit'|'goal'|'workout'|'collectible'|'wishlist'|'sale'|'expense'|'note';

const QUICK:Array<{id:QuickAddType;label:string;description:string;icon:React.ReactNode}>= [
  {id:'task',label:'Task',description:'Capture work with optional natural language.',icon:<ListTodo/>},
  {id:'reminder',label:'Reminder',description:'A task with a due date/time.',icon:<Clock3/>},
  {id:'event',label:'Event',description:'Put a scheduled event on Life Calendar.',icon:<CalendarDays/>},
  {id:'habit',label:'Habit',description:'Create a repeating behavior.',icon:<Target/>},
  {id:'goal',label:'Goal',description:'Create a larger objective.',icon:<Goal/>},
  {id:'workout',label:'Workout',description:'Create a Fitness plan.',icon:<Dumbbell/>},
  {id:'collectible',label:'Collectible',description:'Open canonical Search & Add.',icon:<Layers3/>},
  {id:'wishlist',label:'Wishlist Item',description:'Open Wishlist acquisition planning.',icon:<Star/>},
  {id:'sale',label:'Sale',description:'Open Sell for owned inventory.',icon:<ShoppingBag/>},
  {id:'expense',label:'Expense',description:'Record a manual Financial expense.',icon:<CircleDollarSign/>},
  {id:'note',label:'Note',description:'Drop an unorganized note into Life Inbox.',icon:<FileText/>}
];

export function QuickAddPanel({open,onClose,workspace,navigate,initialType}:{open:boolean;onClose:()=>void;workspace:Workspace;navigate:Navigate;initialType?:QuickAddType}){
  const [selected,setSelected]=useState<QuickAddType|undefined>(initialType);
  const [text,setText]=useState('');
  if(!open)return null;
  const platform=normalizePlatformState(workspace.data.platform,true);
  const life=normalizeLifeData(workspace.data.life||emptyLifeData());
  const available=QUICK.filter(item=>{
    if(['task','reminder','event','habit','goal','note'].includes(item.id))return platform.enabledModules.includes('life');
    if(item.id==='workout')return platform.enabledModules.includes('life')&&platform.lifeSections.includes('Fitness');
    if(item.id==='collectible')return platform.enabledModules.includes('search');
    if(item.id==='wishlist')return platform.enabledModules.includes('wishlist');
    if(item.id==='sale')return platform.enabledModules.includes('sell');
    if(item.id==='expense')return platform.enabledModules.includes('financial');
    return true;
  });
  const activeSelected=selected&&available.some(item=>item.id===selected)?selected:undefined;

  const saveSimple=()=>{
    const value=text.trim();if(!value)return;
    const now=new Date().toISOString();
    if(activeSelected==='task'||activeSelected==='reminder'){
      const parsed=parseNaturalTask(value);
      const task:LifeTask={id:newLifeId('task'),title:parsed.title,notes:'',status:'inbox',priority:'Medium',listId:'inbox',tags:[],subtasks:[],dueDate:parsed.dueDate,dueTime:parsed.dueTime,repeat:parsed.repeat,reminderMinutes:activeSelected==='reminder'?60:undefined,createdAt:now,updatedAt:now};
      workspace.update({...workspace.data,life:{...life,tasks:[task,...life.tasks]}});onClose();navigate('life');return;
    }
    if(activeSelected==='event'){
      const parsed=parseNaturalTask(value);const date=parsed.dueDate||todayKey();const time=parsed.dueTime||'09:00';
      const event:LifeEvent={id:newLifeId('event'),title:parsed.title,start:date+'T'+time+':00',allDay:false,location:'',notes:'',source:'manual',createdAt:now,updatedAt:now};
      workspace.update({...workspace.data,life:{...life,events:[...life.events,event]}});onClose();navigate('life');return;
    }
    if(activeSelected==='habit'){
      const habit:LifeHabit={id:newLifeId('habit'),name:value,notes:'',frequency:{mode:'daily',days:[0,1,2,3,4,5,6],targetPerWeek:7},checks:[],active:true,createdAt:now,updatedAt:now};
      workspace.update({...workspace.data,life:{...life,habits:[...life.habits,habit]}});onClose();navigate('life');return;
    }
    if(activeSelected==='goal'){
      const goal:LifeGoal={id:newLifeId('goal'),title:value,description:'',progress:0,status:'active',taskIds:[],habitIds:[],links:[],createdAt:now,updatedAt:now};
      workspace.update({...workspace.data,life:{...life,goals:[...life.goals,goal]}});onClose();navigate('life');return;
    }
    if(activeSelected==='workout'){
      const plan:WorkoutPlan={id:newLifeId('plan'),name:value,days:[],exercises:[],active:true,createdAt:now,updatedAt:now};
      workspace.update({...workspace.data,life:{...life,workoutPlans:[...life.workoutPlans,plan]}});onClose();navigate('life');return;
    }
    if(activeSelected==='note'){
      workspace.update({...workspace.data,life:{...life,captures:[{id:newLifeId('capture'),text:value,createdAt:now,organized:false},...life.captures]}});onClose();navigate('life');return;
    }
    if(activeSelected==='expense'){
      const amount=Number(window.prompt('Expense amount','0')||0);if(!(amount>0))return;
      const financial=normalizeFinancialData(workspace.data.financial);
      workspace.update({...workspace.data,financial:{...financial,transactions:[{id:newFinancialId('tx'),date:todayKey(),direction:'expense',amount,merchant:value,category:'Shopping',subcategory:'',description:'Quick Add expense',isRecurring:false,isHobby:false,createdAt:now,updatedAt:now},...financial.transactions]}});
      onClose();navigate('financial');return;
    }
  };

  const choose=(type:QuickAddType)=>{
    if(type==='collectible'){onClose();navigate('search');return}
    if(type==='wishlist'){onClose();navigate('wishlist');return}
    if(type==='sale'){onClose();navigate('sell');return}
    setSelected(type);setText('');
  };

  return <div className="vxp-platform-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><section className="vxp-quick-panel"><header><div><span>QUICK ADD</span><h2>{activeSelected?QUICK.find(x=>x.id===activeSelected)?.label:'What do you want to add?'}</h2></div><button onClick={onClose}><X/></button></header>
    {!activeSelected?<div className="vxp-quick-grid">{available.map(item=><button key={item.id} onClick={()=>choose(item.id)}>{item.icon}<span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight/></button>)}</div>:<div className="vxp-quick-entry"><label>{activeSelected==='expense'?'What did you spend on?':activeSelected==='note'?'Capture note':activeSelected==='event'?'Describe the event':activeSelected==='workout'?'Workout plan name':activeSelected==='habit'?'Habit name':activeSelected==='goal'?'Goal':'Describe the task'}<input autoFocus value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveSimple()}} placeholder={activeSelected==='task'||activeSelected==='reminder'?'pay electric bill friday at 8 pm':'Type and press Enter…'}/></label><p>{activeSelected==='task'||activeSelected==='reminder'||activeSelected==='event'?'VEXUM parses common dates, weekdays, and times locally. You can refine every field inside Life afterward.':'This creates the minimum viable record so capture stays fast.'}</p><footer><button onClick={()=>setSelected(undefined)}>Back</button><button className="primary" disabled={!text.trim()} onClick={saveSimple}>Add</button></footer></div>}
  </section></div>;
}

export function NotificationCenter({open,onClose,workspace,navigate}:{open:boolean;onClose:()=>void;workspace:Workspace;navigate:Navigate}){
  const platform=normalizePlatformState(workspace.data.platform,true);
  const [sellRows,setSellRows]=useState<VexumNotification[]>([]);
  const [tab,setTab]=useState<'All'|VexumNotificationCategory>('All');
  useEffect(()=>{
    if(!open||!platform.notifications.marketplace||!workspace.config?.configured||!workspace.session){setSellRows([]);return}
    let alive=true;
    loadSellWorkspace(workspace.config,workspace.session).then(data=>{if(alive)setSellRows(buildSellNotifications(data))}).catch(()=>{if(alive)setSellRows([])});
    return()=>{alive=false};
  },[open,platform.notifications.marketplace,workspace.config?.configured,workspace.session?.user.id]);
  const notifications=[...buildVexumNotifications(workspace.data,platform),...sellRows].toSorted((a,b)=>a.urgency===b.urgency?b.occurredAt.localeCompare(a.occurredAt):a.urgency==='high'?-1:1);
  if(!open)return null;
  const filtered=tab==='All'?notifications:notifications.filter(n=>n.category===tab);
  const read=new Set(platform.notifications.readIds);
  const mark=(ids:string[])=>workspace.update({...workspace.data,platform:{...platform,notifications:{...platform.notifications,readIds:[...new Set([...platform.notifications.readIds,...ids])].slice(-1000)}}});
  const snooze=(id:string)=>{
    const until=new Date(Date.now()+60*60*1000).toISOString();
    workspace.update({...workspace.data,platform:{...platform,notifications:{...platform.notifications,snoozed:{...platform.notifications.snoozed,[id]:until}}}});
  };
  const openNotification=(notification:typeof notifications[number])=>{mark([notification.id]);onClose();navigate(routeToView(notification.route))};
  const complete=(taskId:string,id:string)=>{const next=completeNotificationTask(workspace.data,taskId);const nextPlatform=normalizePlatformState(next.platform,true);workspace.update({...next,platform:{...nextPlatform,notifications:{...nextPlatform.notifications,readIds:[...new Set([...nextPlatform.notifications.readIds,id])]}}})};

  return <div className="vxp-flyout notification"><header><div><Bell/><span><strong>Notifications</strong><small>{notifications.filter(n=>!read.has(n.id)).length} unread</small></span></div><button onClick={onClose}><X/></button></header><nav>{(['All','Tasks','Radar','Sell','Financial','Social'] as const).map(name=><button className={tab===name?'active':''} onClick={()=>setTab(name as any)} key={name}>{name}</button>)}</nav>
    <div className="vxp-notification-list">{filtered.map(n=><article className={read.has(n.id)?'read':''} key={n.id}><i className={n.urgency}/><div><span>{n.category}</span><strong>{n.title}</strong><p>{n.detail}</p><footer>{n.taskId?<button onClick={()=>complete(n.taskId!,n.id)}><Check/>Complete</button>:null}<button onClick={()=>snooze(n.id)}><Clock3/>Snooze</button><button onClick={()=>openNotification(n)}>Open<ChevronRight/></button></footer></div></article>)}{!filtered.length?<div className="vxp-panel-empty"><Bell/><strong>No notifications in this category.</strong></div>:null}</div>
    <footer><button onClick={()=>mark(notifications.map(n=>n.id))}>Mark All Read</button><button onClick={()=>{onClose();navigate('settings')}}>Notification Settings</button></footer>
  </div>;
}

type SearchResult={id:string;kind:string;title:string;detail:string;route:VexumModuleId|'settings';keywords:string};
export function CommandCenter({open,onClose,workspace,navigate,onQuickAdd}:{open:boolean;onClose:()=>void;workspace:Workspace;navigate:Navigate;onQuickAdd:(type?:QuickAddType)=>void}){
  const [query,setQuery]=useState('');
  const life=normalizeLifeData(workspace.data.life);
  const financial=normalizeFinancialData(workspace.data.financial);
  const results=useMemo(()=>{
    const rows:SearchResult[]=[];
    for(const task of life.tasks)rows.push({id:'task:'+task.id,kind:'Task',title:task.title,detail:task.dueDate||task.status,route:'life',keywords:[task.title,task.notes,...task.tags].join(' ')});
    for(const event of life.events)rows.push({id:'event:'+event.id,kind:'Event',title:event.title,detail:event.start,route:'life',keywords:event.title+' '+event.location+' '+event.notes});
    for(const goal of life.goals)rows.push({id:'goal:'+goal.id,kind:'Goal',title:goal.title,detail:goal.progress+'%',route:'life',keywords:goal.title+' '+goal.description});
    for(const plan of life.workoutPlans)rows.push({id:'workout:'+plan.id,kind:'Workout',title:plan.name,detail:plan.exercises.length+' exercises',route:'life',keywords:plan.name+' '+plan.exercises.map(x=>x.name).join(' ')});
    for(const item of workspace.data.items.filter(i=>!i.archivedAt))rows.push({id:'item:'+item.id,kind:'Portfolio',title:item.name,detail:item.category,route:'portfolio',keywords:[item.name,item.category,item.condition,item.location,...Object.values(item.customFields||{})].join(' ')});
    for(const collection of workspace.data.collections.filter(c=>!c.archivedAt))rows.push({id:'collection:'+collection.id,kind:'Collection',title:collection.name,detail:'Portfolio collection',route:'portfolio',keywords:collection.name+' '+(collection.description||'')});
    for(const tx of financial.transactions)rows.push({id:'tx:'+tx.id,kind:'Transaction',title:tx.merchant||tx.category,detail:'$'+tx.amount.toFixed(2)+' · '+tx.date,route:'financial',keywords:[tx.merchant,tx.category,tx.subcategory,tx.description].join(' ')});
    for(const object of workspace.data.setup?.objects||[])rows.push({id:'setup:'+object.id,kind:'Setup',title:object.name,detail:object.type,route:'setup',keywords:object.name+' '+object.type});
    return rows;
  },[life,workspace.data.items,workspace.data.collections,workspace.data.setup,financial.transactions]);
  if(!open)return null;
  const clean=query.trim().toLowerCase();
  const commands=[
    {label:'Add task',type:'task' as QuickAddType},{label:'Add reminder',type:'reminder' as QuickAddType},{label:'Create goal',type:'goal' as QuickAddType},
    {label:'Start workout',route:'life' as const},{label:'Show Wishlist',route:'wishlist' as const},{label:'Add expense',type:'expense' as QuickAddType},
    {label:'Sell item',route:'sell' as const},{label:'Open Settings',route:'settings' as const}
  ].filter(c=>!clean||c.label.toLowerCase().includes(clean));
  const matches=!clean?results.slice(0,8):results.filter(row=>(row.title+' '+row.detail+' '+row.keywords+' '+row.kind).toLowerCase().includes(clean)).slice(0,12);

  const go=(route:VexumModuleId|'settings')=>{setQuery('');onClose();navigate(route)};
  return <div className="vxp-platform-backdrop command" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><section className="vxp-command"><header><Search/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search VEXUM or type a command…"/><kbd>ESC</kbd></header><div className="vxp-command-body"><section><span>COMMANDS</span>{commands.map(command=><button key={command.label} onClick={()=>'type'in command&&command.type?(onClose(),onQuickAdd(command.type)):go(command.route!)}><Sparkles/><strong>{command.label}</strong><ChevronRight/></button>)}</section><section><span>{clean?'RESULTS':'RECENT / RELEVANT'}</span>{matches.map(row=><button key={row.id} onClick={()=>go(row.route)}><ResultIcon kind={row.kind}/><span><strong>{row.title}</strong><small>{row.kind} · {row.detail}</small></span><ChevronRight/></button>)}{!matches.length?<div className="vxp-panel-empty compact">Nothing in your VEXUM workspace matches “{query}”.</div>:null}</section></div></section></div>;
}

function ResultIcon({kind}:{kind:string}){if(kind==='Task')return <ListTodo/>;if(kind==='Event')return <CalendarDays/>;if(kind==='Goal')return <Goal/>;if(kind==='Workout')return <Dumbbell/>;if(kind==='Transaction')return <CircleDollarSign/>;return <Layers3/>}
function routeToView(route:string):VexumModuleId|'settings'{const first=route.split('/').filter(Boolean)[0];return (['life','portfolio','search','wishlist','sell','setup','financial','social'].includes(first)?first:'home') as VexumModuleId}

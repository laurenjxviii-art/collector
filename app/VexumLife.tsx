'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  AlarmClock,Archive,CalendarDays,Check,ChevronLeft,ChevronRight,Circle,Clock3,Dumbbell,
  Flag,Focus,Goal,Inbox,Layers3,ListTodo,MoreHorizontal,Pause,Play,Plus,RotateCcw,
  Search,Sparkles,Square,Target,TimerReset,Trash2,Trophy,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {
  emptyLifeData,goalComputedProgress,habitMomentum,newLifeId,normalizeLifeData,parseNaturalTask,todayKey,
  type ExerciseDefinition,type LifeData,type LifeEvent,type LifeGoal,type LifeHabit,type LifeProject,type LifeTask,
  type LifeTab,type TaskPriority,type WorkoutPlan,type WorkoutSession
} from '../lib/life';
import {normalizeFinancialData} from '../lib/financial';

const money=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<100?2:0}).format(value);
const dateLabel=(value:string)=>{if(!value)return 'No date';const d=new Date(value.length===10?value+'T12:00:00':value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):value};
const timeLabel=(value?:string)=>{if(!value)return '';const [h,m]=value.split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(d)};
const nowIso=()=>new Date().toISOString();

function Metric({label,value,sub,tone='muted'}:{label:string;value:string;sub:string;tone?:'muted'|'green'|'red'|'orange'}){
  return <section className="vxl-metric vx-panel"><span>{label}</span><strong>{value}</strong><small className={'tone-'+tone}>{sub}</small></section>;
}

function priorityClass(priority:TaskPriority){return priority==='Urgent'?'urgent':priority==='High'?'high':priority==='Medium'?'medium':'low'}

export default function VexumLife(){
  const workspace=useWorkspace();
  const life=normalizeLifeData(workspace.data.life||emptyLifeData());
  const [tab,setTab]=useState<LifeTab>('Today');
  const [taskComposer,setTaskComposer]=useState(false);
  const [eventComposer,setEventComposer]=useState(false);
  const [habitComposer,setHabitComposer]=useState(false);
  const [goalComposer,setGoalComposer]=useState(false);
  const [workoutComposer,setWorkoutComposer]=useState(false);
  const [natural,setNatural]=useState('');
  const [query,setQuery]=useState('');
  const [taskFilter,setTaskFilter]=useState<'all'|'inbox'|'today'|'overdue'|'completed'>('all');
  const [calendarCursor,setCalendarCursor]=useState(()=>new Date());
  const [focusTaskId,setFocusTaskId]=useState('');
  const [focusRunning,setFocusRunning]=useState(false);
  const [focusSeconds,setFocusSeconds]=useState(25*60);
  const [focusStartedAt,setFocusStartedAt]=useState('');
  const [fitnessRange,setFitnessRange]=useState<'7'|'30'>('7');

  const persist=(next:LifeData)=>workspace.update({...workspace.data,life:next});
  const updateTask=(next:LifeTask)=>persist({...life,tasks:life.tasks.map(task=>task.id===next.id?next:task)});
  const updateHabit=(next:LifeHabit)=>persist({...life,habits:life.habits.map(habit=>habit.id===next.id?next:habit)});
  const updateGoal=(next:LifeGoal)=>persist({...life,goals:life.goals.map(goal=>goal.id===next.id?next:goal)});

  useEffect(()=>{
    if(!focusRunning)return;
    const timer=setInterval(()=>setFocusSeconds(value=>{
      if(value<=1){setFocusRunning(false);return 0}
      return value-1;
    }),1000);
    return()=>clearInterval(timer);
  },[focusRunning]);

  const today=todayKey();
  const todayDate=new Date();
  const todayTasks=life.tasks.filter(task=>task.status!=='completed'&&task.status!=='cancelled'&&(task.dueDate===today||task.scheduledStart?.startsWith(today)));
  const overdue=life.tasks.filter(task=>task.status!=='completed'&&task.status!=='cancelled'&&task.dueDate&&task.dueDate<today);
  const todaysEvents=life.events.filter(event=>event.start.startsWith(today)).toSorted((a,b)=>a.start.localeCompare(b.start));
  const todaysHabits=life.habits.filter(habit=>habit.active&&(habit.frequency.mode==='daily'||habit.frequency.days.includes(todayDate.getDay())));
  const todaysWorkoutPlans=life.workoutPlans.filter(plan=>plan.active&&plan.days.includes(todayDate.getDay()));
  const financial=normalizeFinancialData(workspace.data.financial);
  const billsDue=financial.bills.filter(bill=>bill.active&&bill.nextDueDate&&bill.nextDueDate>=today&&bill.nextDueDate<=dateKeyOffset(2));
  const preorders=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived&&record.preorder?.enabled&&record.preorder.estimatedChargeDate&&record.preorder.estimatedChargeDate>=today&&record.preorder.estimatedChargeDate<=dateKeyOffset(7));
  const activeGoals=life.goals.filter(goal=>goal.status==='active');
  const completedThisWeek=life.tasks.filter(task=>task.completedAt&&Date.now()-Date.parse(task.completedAt)<7*86400000).length;
  const habitMomentumAvg=life.habits.filter(h=>h.active).length?Math.round(life.habits.filter(h=>h.active).reduce((sum,h)=>sum+habitMomentum(h),0)/life.habits.filter(h=>h.active).length):0;

  const completeTask=(task:LifeTask)=>{
    const complete=task.status!=='completed';
    updateTask({...task,status:complete?'completed':'todo',completedAt:complete?nowIso():undefined,updatedAt:nowIso()});
  };
  const toggleHabit=(habit:LifeHabit,date=today)=>{
    const checks=new Set(habit.checks);
    if(checks.has(date))checks.delete(date);else checks.add(date);
    updateHabit({...habit,checks:[...checks].sort(),updatedAt:nowIso()});
  };
  const addNatural=()=>{
    if(!natural.trim())return;
    const parsed=parseNaturalTask(natural);
    const now=nowIso();
    const task:LifeTask={
      id:newLifeId('task'),title:parsed.title,notes:'',status:'inbox',priority:'Medium',listId:'inbox',
      tags:[],subtasks:[],dueDate:parsed.dueDate,dueTime:parsed.dueTime,repeat:parsed.repeat,createdAt:now,updatedAt:now
    };
    persist({...life,tasks:[task,...life.tasks]});setNatural('');
  };
  const scheduleTask=(task:LifeTask)=>{
    const date=window.prompt('Schedule date (YYYY-MM-DD)',task.dueDate||today);if(!date)return;
    const time=window.prompt('Start time (HH:MM)',task.dueTime||'09:00')||'09:00';
    const duration=task.durationMinutes||Number(window.prompt('Duration in minutes','30'))||30;
    const start=new Date(date+'T'+time+':00');if(!Number.isFinite(start.getTime()))return;
    const end=new Date(start.getTime()+duration*60000);
    updateTask({...task,dueDate:date,dueTime:time,durationMinutes:duration,scheduledStart:start.toISOString(),scheduledEnd:end.toISOString(),updatedAt:nowIso()});
  };

  if(!workspace.ready)return <div className="vxl-page"><div className="vxl-empty">Loading Life…</div></div>;

  return <div className="vxl-page">
    <section className="vxl-title">
      <div><span>LIFE</span><h1>Your day, without the noise.</h1><p>Capture first. Organize later. Tasks, time, habits, goals, focus, and fitness stay connected without forcing one productivity method.</p></div>
      <aside><strong>{workspace.status}</strong><span>{todayTasks.length} tasks today · {habitMomentumAvg}% momentum</span></aside>
    </section>

    <div className="vxl-quick-capture vx-panel">
      <Inbox/><input value={natural} onChange={e=>setNatural(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addNatural()}} placeholder="Quick capture — e.g. pay electric bill Friday at 8 pm"/>
      <button onClick={addNatural}><Plus/>Capture</button>
      <span>Inbox first. Organize when ready.</span>
    </div>

    <nav className="vxl-tabs">{(['Today','Tasks','Calendar','Habits','Goals','Focus','Fitness'] as LifeTab[]).map(name=><button className={tab===name?'active':''} key={name} onClick={()=>setTab(name)}>{tabIcon(name)}{name}</button>)}
      <div><button onClick={()=>setTaskComposer(true)}><Plus/>Task</button><button onClick={()=>setEventComposer(true)}><CalendarDays/>Event</button></div>
    </nav>

    {tab==='Today'?<TodayView life={life} tasks={todayTasks} events={todaysEvents} habits={todaysHabits} workouts={todaysWorkoutPlans} bills={billsDue} preorders={preorders} overdue={overdue} onCompleteTask={completeTask} onToggleHabit={toggleHabit} onOpenTasks={()=>setTab('Tasks')} onOpenCalendar={()=>setTab('Calendar')} onOpenFitness={()=>setTab('Fitness')} onOpenFinancial={()=>location.assign('/financial')} onOpenWishlist={()=>location.assign('/wishlist')}/>:null}

    {tab==='Tasks'?<TasksView life={life} query={query} setQuery={setQuery} filter={taskFilter} setFilter={setTaskFilter} onComplete={completeTask} onUpdate={updateTask} onSchedule={scheduleTask} onAdd={()=>setTaskComposer(true)} onPersist={persist}/>:null}

    {tab==='Calendar'?<CalendarView life={life} cursor={calendarCursor} setCursor={setCalendarCursor} onPersist={persist} onScheduleTask={scheduleTask}/>:null}

    {tab==='Habits'?<HabitsView life={life} onToggle={toggleHabit} onUpdate={updateHabit} onAdd={()=>setHabitComposer(true)}/>:null}

    {tab==='Goals'?<GoalsView life={life} onUpdate={updateGoal} onAdd={()=>setGoalComposer(true)}/>:null}

    {tab==='Focus'?<FocusView life={life} focusTaskId={focusTaskId} setFocusTaskId={setFocusTaskId} running={focusRunning} setRunning={setFocusRunning} seconds={focusSeconds} setSeconds={setFocusSeconds} startedAt={focusStartedAt} setStartedAt={setFocusStartedAt} onComplete={completeTask} onPersist={persist}/>:null}

    {tab==='Fitness'?<FitnessView life={life} range={fitnessRange} setRange={setFitnessRange} onAddPlan={()=>setWorkoutComposer(true)} onPersist={persist}/>:null}

    <div className="vxl-summary-footer">
      <span><strong>{completedThisWeek}</strong> tasks completed this week</span>
      <span><strong>{activeGoals.length}</strong> active goals</span>
      <span><strong>{life.workoutSessions.filter(s=>s.completed&&Date.now()-Date.parse(s.date)<7*86400000).length}</strong> workouts this week</span>
      <span><strong>{habitMomentumAvg}%</strong> 30-day habit momentum</span>
    </div>

    {taskComposer?<TaskModal life={life} onClose={()=>setTaskComposer(false)} onSave={task=>{persist({...life,tasks:[task,...life.tasks]});setTaskComposer(false)}}/>:null}
    {eventComposer?<EventModal onClose={()=>setEventComposer(false)} onSave={event=>{persist({...life,events:[...life.events,event]});setEventComposer(false)}}/>:null}
    {habitComposer?<HabitModal onClose={()=>setHabitComposer(false)} onSave={habit=>{persist({...life,habits:[...life.habits,habit]});setHabitComposer(false)}}/>:null}
    {goalComposer?<GoalModal life={life} onClose={()=>setGoalComposer(false)} onSave={goal=>{persist({...life,goals:[...life.goals,goal]});setGoalComposer(false)}}/>:null}
    {workoutComposer?<WorkoutModal onClose={()=>setWorkoutComposer(false)} onSave={plan=>{persist({...life,workoutPlans:[...life.workoutPlans,plan]});setWorkoutComposer(false)}}/>:null}
  </div>;
}

function TodayView({life,tasks,events,habits,workouts,bills,preorders,overdue,onCompleteTask,onToggleHabit,onOpenTasks,onOpenCalendar,onOpenFitness,onOpenFinancial,onOpenWishlist}:{
  life:LifeData;tasks:LifeTask[];events:LifeEvent[];habits:LifeHabit[];workouts:WorkoutPlan[];bills:Array<{id:string;name:string;amount:number;nextDueDate?:string}>;preorders:any[];overdue:LifeTask[];
  onCompleteTask:(task:LifeTask)=>void;onToggleHabit:(habit:LifeHabit)=>void;onOpenTasks:()=>void;onOpenCalendar:()=>void;onOpenFitness:()=>void;onOpenFinancial:()=>void;onOpenWishlist:()=>void;
}){
  const date=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
  return <div className="vxl-today">
    <div className="vxl-today-head"><div><span>TODAY</span><h2>{date}</h2></div><p>{overdue.length?overdue.length+' overdue item'+(overdue.length===1?'':'s')+' need rescheduling.':'Nothing overdue.'}</p></div>
    <div className="vxl-today-grid">
      <section className="vx-panel vxl-today-card wide"><CardHead title={tasks.length+' Tasks'} action="Open Tasks" onAction={onOpenTasks}/><div className="vxl-task-mini">{tasks.length?tasks.map(task=><button key={task.id} onClick={()=>onCompleteTask(task)}><span className={'priority '+priorityClass(task.priority)}/>{task.status==='completed'?<Check/>:<Circle/>}<span><strong>{task.title}</strong><small>{task.dueTime?timeLabel(task.dueTime):task.durationMinutes?task.durationMinutes+' min':''}</small></span></button>):<Empty compact text="No tasks scheduled today."/ >}</div></section>
      <section className="vx-panel vxl-today-card"><CardHead title="Calendar" action="Open" onAction={onOpenCalendar}/><div className="vxl-day-list">{events.length?events.map(event=><div key={event.id}><time>{event.allDay?'ALL DAY':new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(event.start))}</time><span><strong>{event.title}</strong><small>{event.location||event.source}</small></span></div>):<Empty compact text="No events today."/ >}</div></section>
      <section className="vx-panel vxl-today-card"><CardHead title="Habits"/><div className="vxl-habit-mini">{habits.length?habits.map(habit=>{const done=habit.checks.includes(todayKey());return <button key={habit.id} className={done?'done':''} onClick={()=>onToggleHabit(habit)}>{done?<Check/>:<Circle/>}<span><strong>{habit.name}</strong><small>{habitMomentum(habit)}% momentum</small></span></button>}):<Empty compact text="No habits due today."/ >}</div></section>
      <section className="vx-panel vxl-today-card"><CardHead title="Money" action="Financial" onAction={onOpenFinancial}/><div className="vxl-day-list">{bills.length?bills.map(bill=><div key={bill.id}><time>{bill.nextDueDate===todayKey()?'TODAY':dateLabel(bill.nextDueDate||'')}</time><span><strong>{bill.name}</strong><small>{money(bill.amount)}</small></span></div>):<Empty compact text="No recorded bills due in the next 48 hours."/ >}</div></section>
      <section className="vx-panel vxl-today-card"><CardHead title="Collecting" action="Wishlist" onAction={onOpenWishlist}/><div className="vxl-day-list">{preorders.length?preorders.map(record=><div key={record.productId}><time>{dateLabel(record.preorder?.estimatedChargeDate||'')}</time><span><strong>{record.snapshot?.name||record.productId}</strong><small>Preorder charge / release window</small></span></div>):<Empty compact text="No recorded preorder commitments this week."/ >}</div></section>
      <section className="vx-panel vxl-today-card"><CardHead title="Workout" action="Fitness" onAction={onOpenFitness}/><div className="vxl-workout-today">{workouts.length?workouts.map(plan=><button key={plan.id} onClick={onOpenFitness}><Dumbbell/><span><strong>{plan.name}</strong><small>{plan.exercises.length} exercises · {plan.time?timeLabel(plan.time):'unscheduled time'}</small></span><ChevronRight/></button>):<Empty compact text="No workout plan scheduled today."/ >}</div></section>
    </div>
    <section className="vx-panel vxl-inbox-strip"><header><div><Inbox/><span><strong>Inbox</strong><small>Capture first, organize later.</small></span></div><b>{life.tasks.filter(task=>task.status==='inbox').length+life.captures.filter(c=>!c.organized).length}</b></header></section>
  </div>;
}

function TasksView({life,query,setQuery,filter,setFilter,onComplete,onUpdate,onSchedule,onAdd,onPersist}:{life:LifeData;query:string;setQuery:(v:string)=>void;filter:'all'|'inbox'|'today'|'overdue'|'completed';setFilter:(v:'all'|'inbox'|'today'|'overdue'|'completed')=>void;onComplete:(t:LifeTask)=>void;onUpdate:(t:LifeTask)=>void;onSchedule:(t:LifeTask)=>void;onAdd:()=>void;onPersist:(d:LifeData)=>void}){
  const today=todayKey();
  let tasks=life.tasks.filter(task=>!query||[task.title,task.notes,task.tags.join(' ')].join(' ').toLowerCase().includes(query.toLowerCase()));
  if(filter==='inbox')tasks=tasks.filter(task=>task.status==='inbox');
  if(filter==='today')tasks=tasks.filter(task=>task.dueDate===today||task.scheduledStart?.startsWith(today));
  if(filter==='overdue')tasks=tasks.filter(task=>task.status!=='completed'&&!!task.dueDate&&task.dueDate<today);
  if(filter==='completed')tasks=tasks.filter(task=>task.status==='completed');
  else if(filter!=='completed')tasks=tasks.filter(task=>task.status!=='cancelled');
  tasks=tasks.toSorted((a,b)=>(a.status==='completed'?1:0)-(b.status==='completed'?1:0)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||priorityRank(b.priority)-priorityRank(a.priority));

  const [selected,setSelected]=useState('');
  const [listName,setListName]=useState('');
  const [projectName,setProjectName]=useState('');
  const selectedTask=life.tasks.find(t=>t.id===selected);

  const createList=()=>{if(!listName.trim())return;onPersist({...life,lists:[...life.lists,{id:newLifeId('list'),name:listName.trim(),color:'#ff2338'}]});setListName('')};
  const createProject=()=>{if(!projectName.trim())return;const now=nowIso();onPersist({...life,projects:[...life.projects,{id:newLifeId('project'),name:projectName.trim(),status:'active',notes:'',createdAt:now,updatedAt:now}]});setProjectName('')};

  return <div className="vxl-tasks-layout">
    <aside className="vx-panel vxl-task-nav"><header><div><h3>Tasks</h3><span>{life.tasks.filter(t=>t.status!=='completed'&&t.status!=='cancelled').length} open</span></div><button onClick={onAdd}><Plus/></button></header>
      {(['all','inbox','today','overdue','completed'] as const).map(name=><button key={name} className={filter===name?'active':''} onClick={()=>setFilter(name)}>{name==='inbox'?<Inbox/>:name==='today'?<CalendarDays/>:name==='overdue'?<AlarmClock/>:name==='completed'?<Check/>:<ListTodo/>}<span>{name[0].toUpperCase()+name.slice(1)}</span><b>{taskFilterCount(life.tasks,name)}</b></button>)}
      <div className="vxl-nav-section"><span>LISTS</span>{life.lists.filter(list=>!list.archived).map(list=><button key={list.id} onClick={()=>setQuery('list:'+list.id)}><i style={{background:list.color}}/><span>{list.name}</span><b>{life.tasks.filter(t=>t.listId===list.id&&t.status!=='completed').length}</b></button>)}<div className="inline-create"><input value={listName} onChange={e=>setListName(e.target.value)} placeholder="New list"/><button onClick={createList}>+</button></div></div>
      <div className="vxl-nav-section"><span>PROJECTS</span>{life.projects.filter(p=>p.status==='active').map(project=><button key={project.id} onClick={()=>setQuery('project:'+project.id)}><Layers3/><span>{project.name}</span><b>{life.tasks.filter(t=>t.projectId===project.id&&t.status!=='completed').length}</b></button>)}<div className="inline-create"><input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="New project"/><button onClick={createProject}>+</button></div></div>
    </aside>
    <main className="vx-panel vxl-task-main"><header><div><h3>{filter[0].toUpperCase()+filter.slice(1)}</h3><span>{tasks.length} records</span></div><label><Search/><input value={query.startsWith('list:')||query.startsWith('project:')?'':query} onChange={e=>setQuery(e.target.value)} placeholder="Search tasks…"/></label></header>
      <div className="vxl-task-table"><div className="head"><span/><span>Task</span><span>Due</span><span>Priority</span><span>List / Project</span><span>Duration</span><span/></div>{tasks.filter(task=>query.startsWith('list:')?task.listId===query.slice(5):query.startsWith('project:')?task.projectId===query.slice(8):true).map(task=><button className={selected===task.id?'selected':''} key={task.id} onClick={()=>setSelected(task.id)}><span onClick={e=>{e.stopPropagation();onComplete(task)}}>{task.status==='completed'?<Check/>:<Circle/>}</span><span><strong>{task.title}</strong><small>{task.subtasks.length?task.subtasks.filter(s=>s.completed).length+'/'+task.subtasks.length+' subtasks':''}{task.tags.length?' · '+task.tags.join(', '):''}</small></span><span>{task.dueDate?dateLabel(task.dueDate):'—'}{task.dueTime?<small>{timeLabel(task.dueTime)}</small>:null}</span><span><em className={priorityClass(task.priority)}>{task.priority}</em></span><span>{life.lists.find(l=>l.id===task.listId)?.name||'—'}{task.projectId?<small>{life.projects.find(p=>p.id===task.projectId)?.name}</small>:null}</span><span>{task.durationMinutes?task.durationMinutes+' min':'—'}</span><span><MoreHorizontal/></span></button>)}</div>
    </main>
    <aside className="vx-panel vxl-task-inspector">{selectedTask?<TaskInspector task={selectedTask} life={life} onUpdate={onUpdate} onSchedule={onSchedule} onDelete={()=>{onPersist({...life,tasks:life.tasks.filter(t=>t.id!==selectedTask.id)});setSelected('')}}/>:<Empty text="Select a task to edit its full details."/ >}</aside>
  </div>;
}

function TaskInspector({task,life,onUpdate,onSchedule,onDelete}:{task:LifeTask;life:LifeData;onUpdate:(t:LifeTask)=>void;onSchedule:(t:LifeTask)=>void;onDelete:()=>void}){
  const patch=(updates:Partial<LifeTask>)=>onUpdate({...task,...updates,updatedAt:nowIso()});
  const addSubtask=()=>{const title=window.prompt('Subtask');if(!title)return;patch({subtasks:[...task.subtasks,{id:newLifeId('subtask'),title,completed:false}]})};
  return <div className="vxl-inspector-body"><header><div><span>TASK</span><h3>{task.title}</h3></div><button onClick={onDelete}><Trash2/></button></header>
    <label>Title<input value={task.title} onChange={e=>patch({title:e.target.value})}/></label>
    <div className="two"><label>Status<select value={task.status} onChange={e=>patch({status:e.target.value as LifeTask['status']})}><option value="inbox">Inbox</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label><label>Priority<select value={task.priority} onChange={e=>patch({priority:e.target.value as TaskPriority})}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label></div>
    <div className="two"><label>Due Date<input type="date" value={task.dueDate||''} onChange={e=>patch({dueDate:e.target.value||undefined})}/></label><label>Due Time<input type="time" value={task.dueTime||''} onChange={e=>patch({dueTime:e.target.value||undefined})}/></label></div>
    <div className="two"><label>List<select value={task.listId||''} onChange={e=>patch({listId:e.target.value||undefined})}><option value="">None</option>{life.lists.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label><label>Project<select value={task.projectId||''} onChange={e=>patch({projectId:e.target.value||undefined})}><option value="">None</option>{life.projects.filter(p=>p.status==='active').map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label></div>
    <div className="two"><label>Duration<input type="number" min="0" value={task.durationMinutes||''} onChange={e=>patch({durationMinutes:Number(e.target.value)||undefined})}/></label><label>Reminder<input type="number" min="0" value={task.reminderMinutes||''} onChange={e=>patch({reminderMinutes:Number(e.target.value)||undefined})} placeholder="minutes before"/></label></div>
    <label>Repeat<input value={task.repeat||''} onChange={e=>patch({repeat:e.target.value||undefined})} placeholder="Every Wednesday"/></label>
    <label>Tags<input value={task.tags.join(', ')} onChange={e=>patch({tags:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
    <label>Notes<textarea value={task.notes} onChange={e=>patch({notes:e.target.value})}/></label>
    <section className="vxl-subtasks"><header><strong>Subtasks</strong><button onClick={addSubtask}><Plus/></button></header>{task.subtasks.map(sub=><button key={sub.id} onClick={()=>patch({subtasks:task.subtasks.map(x=>x.id===sub.id?{...x,completed:!x.completed}:x)})}>{sub.completed?<Check/>:<Circle/>}<span>{sub.title}</span></button>)}</section>
    <button className="vxl-primary" onClick={()=>onSchedule(task)}><CalendarDays/>Time Block</button>
  </div>;
}

function CalendarView({life,cursor,setCursor,onPersist,onScheduleTask}:{life:LifeData;cursor:Date;setCursor:(d:Date)=>void;onPersist:(d:LifeData)=>void;onScheduleTask:(t:LifeTask)=>void}){
  const pref=life.calendar;
  const view=pref.view;
  const setView=(next:LifeData['calendar']['view'])=>onPersist({...life,calendar:{...life.calendar,view:next}});
  const toggleLayer=(key:keyof LifeData['calendar']['layers'])=>onPersist({...life,calendar:{...life.calendar,layers:{...life.calendar.layers,[key]:!life.calendar.layers[key]}}});
  const monthStart=new Date(cursor.getFullYear(),cursor.getMonth(),1),gridStart=new Date(monthStart);gridStart.setDate(1-monthStart.getDay());
  const days=Array.from({length:42},(_,i)=>{const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);return d});
  const entriesFor=(key:string)=>{
    const rows:Array<{type:string;title:string;time?:string}>=[];
    if(pref.layers.tasks)life.tasks.filter(t=>t.status!=='completed'&&(t.dueDate===key||t.scheduledStart?.startsWith(key))).forEach(t=>rows.push({type:'task',title:t.title,time:t.dueTime}));
    if(pref.layers.events)life.events.filter(e=>e.start.startsWith(key)).forEach(e=>rows.push({type:'event',title:e.title,time:e.allDay?'':new Date(e.start).toTimeString().slice(0,5)}));
    if(pref.layers.workouts)life.workoutPlans.filter(p=>p.active&&p.days.includes(new Date(key+'T12:00:00').getDay())).forEach(p=>rows.push({type:'workout',title:p.name,time:p.time}));
    if(pref.layers.goals)life.goals.filter(g=>g.status==='active'&&g.deadline===key).forEach(g=>rows.push({type:'goal',title:g.title}));
    return rows;
  };
  return <div className="vxl-calendar">
    <section className="vx-panel vxl-calendar-main"><header><div><button onClick={()=>{const d=new Date(cursor);d.setMonth(d.getMonth()-1);setCursor(d)}}><ChevronLeft/></button><h3>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(cursor)}</h3><button onClick={()=>{const d=new Date(cursor);d.setMonth(d.getMonth()+1);setCursor(d)}}><ChevronRight/></button></div><div>{(['day','week','month','agenda'] as const).map(v=><button className={view===v?'active':''} key={v} onClick={()=>setView(v)}>{v}</button>)}</div></header>
      {view==='month'?<div className="vxl-month"><div className="week-head">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><span key={x}>{x}</span>)}</div><div className="month-grid">{days.map(d=>{const key=todayKey(d),rows=entriesFor(key);return <button key={key} className={(d.getMonth()!==cursor.getMonth()?'outside ':'')+(key===todayKey()?'today':'')} onClick={()=>{setCursor(d);setView('day')}}><time>{d.getDate()}</time>{rows.slice(0,4).map((row,i)=><span className={row.type} key={i}>{row.time?<b>{timeLabel(row.time)}</b>:null}{row.title}</span>)}{rows.length>4?<em>+{rows.length-4} more</em>:null}</button>})}</div></div>:<AgendaCalendar life={life} view={view} cursor={cursor} entriesFor={entriesFor} onScheduleTask={onScheduleTask}/>}
    </section>
    <aside className="vx-panel vxl-calendar-layers"><header><h3>Layers</h3><span>Toggle VEXUM systems</span></header>{Object.entries(pref.layers).map(([key,on])=><label key={key}><input type="checkbox" checked={on} onChange={()=>toggleLayer(key as keyof typeof pref.layers)}/><span>{key[0].toUpperCase()+key.slice(1)}</span></label>)}<section><strong>Unscheduled Tasks</strong>{life.tasks.filter(t=>t.status!=='completed'&&!t.scheduledStart).slice(0,8).map(task=><button key={task.id} onClick={()=>onScheduleTask(task)}><Clock3/><span>{task.title}</span><Plus/></button>)}</section></aside>
  </div>;
}

function AgendaCalendar({life,view,cursor,entriesFor,onScheduleTask}:{life:LifeData;view:'day'|'week'|'agenda';cursor:Date;entriesFor:(key:string)=>Array<{type:string;title:string;time?:string}>;onScheduleTask:(t:LifeTask)=>void}){
  const dayCount=view==='day'?1:view==='week'?7:14;
  const start=new Date(cursor);if(view==='week')start.setDate(cursor.getDate()-cursor.getDay());
  const days=Array.from({length:dayCount},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});
  return <div className={'vxl-agenda '+view}>{days.map(d=>{const key=todayKey(d),rows=entriesFor(key);return <section key={key}><header><time>{new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric'}).format(d)}</time>{key===todayKey()?<b>TODAY</b>:null}</header>{rows.length?rows.map((row,i)=><div className={row.type} key={i}><span>{row.time?timeLabel(row.time):'ALL DAY'}</span><strong>{row.title}</strong></div>):<p>No scheduled items.</p>}</section>})}</div>;
}

function HabitsView({life,onToggle,onUpdate,onAdd}:{life:LifeData;onToggle:(h:LifeHabit,d?:string)=>void;onUpdate:(h:LifeHabit)=>void;onAdd:()=>void}){
  const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(13-i));return d});
  return <div className="vxl-habits"><div className="vxl-section-head"><div><h2>Habits</h2><p>Consistency, not punishment. Momentum shows your recent pattern without destructive streak resets.</p></div><button onClick={onAdd}><Plus/>New Habit</button></div>
    <div className="vxl-habit-grid">{life.habits.filter(h=>h.active).map(habit=><article className="vx-panel" key={habit.id}><header><div><strong>{habit.name}</strong><span>{habit.frequency.mode==='daily'?'Daily':habit.frequency.targetPerWeek+'× weekly'}</span></div><b>{habitMomentum(habit)}%</b></header><div className="vxl-momentum"><strong>Momentum</strong><span>{habitMomentum(habit)}% consistency over the last 30 days</span><i><b style={{width:habitMomentum(habit)+'%'}}/></i></div><div className="vxl-habit-days">{days.map(d=>{const key=todayKey(d),done=habit.checks.includes(key);return <button className={done?'done':''} key={key} title={dateLabel(key)} onClick={()=>onToggle(habit,key)}><span>{new Intl.DateTimeFormat('en-US',{weekday:'narrow'}).format(d)}</span>{done?<Check/>:<Circle/>}</button>})}</div><footer><button onClick={()=>onUpdate({...habit,active:false,updatedAt:nowIso()})}><Archive/>Archive</button></footer></article>)}</div>
  </div>;
}

function GoalsView({life,onUpdate,onAdd}:{life:LifeData;onUpdate:(g:LifeGoal)=>void;onAdd:()=>void}){
  return <div className="vxl-goals"><div className="vxl-section-head"><div><h2>Goals</h2><p>Goals can span Life, Financial, Portfolio, Setup, Wishlist, and Fitness.</p></div><button onClick={onAdd}><Plus/>New Goal</button></div>
    <div className="vxl-goal-grid">{life.goals.filter(g=>g.status!=='archived').map(goal=>{const progress=goalComputedProgress(goal,life);return <article className="vx-panel" key={goal.id}><header><span>{goal.status}</span><button><MoreHorizontal/></button></header><Goal/><h3>{goal.title}</h3><p>{goal.description||'No description.'}</p><div className="vxl-goal-progress"><span><strong>{progress}%</strong><small>{goal.deadline?'Deadline '+dateLabel(goal.deadline):'No deadline'}</small></span><i><b style={{width:progress+'%'}}/></i></div><div className="vxl-goal-links"><span>{goal.taskIds.length} tasks</span><span>{goal.habitIds.length} habits</span>{goal.links.map(link=><span key={link.module+link.refId}>{link.module}: {link.label}</span>)}</div><footer><button onClick={()=>{const value=Number(window.prompt('Manual goal progress 0–100',String(goal.progress)));if(Number.isFinite(value))onUpdate({...goal,progress:Math.max(0,Math.min(100,value)),updatedAt:nowIso()})}}>Update Progress</button><button onClick={()=>onUpdate({...goal,status:goal.status==='completed'?'active':'completed',progress:goal.status==='completed'?goal.progress:100,updatedAt:nowIso()})}>{goal.status==='completed'?'Reopen':'Complete'}</button></footer></article>})}</div>
  </div>;
}

function FocusView({life,focusTaskId,setFocusTaskId,running,setRunning,seconds,setSeconds,startedAt,setStartedAt,onComplete,onPersist}:{life:LifeData;focusTaskId:string;setFocusTaskId:(v:string)=>void;running:boolean;setRunning:(v:boolean)=>void;seconds:number;setSeconds:(v:number|((n:number)=>number))=>void;startedAt:string;setStartedAt:(v:string)=>void;onComplete:(t:LifeTask)=>void;onPersist:(d:LifeData)=>void}){
  const task=life.tasks.find(t=>t.id===focusTaskId);
  const start=()=>{if(!focusTaskId&&life.tasks.find(t=>t.status!=='completed'))setFocusTaskId(life.tasks.find(t=>t.status!=='completed')!.id);if(!startedAt)setStartedAt(nowIso());setRunning(true)};
  const finish=()=>{
    const stamp=nowIso();const planned=Math.max(1,Math.round((25*60)/60));
    const session={id:newLifeId('focus'),title:task?.title||'Focus session',taskId:task?.id,plannedMinutes:planned,startedAt:startedAt||stamp,endedAt:stamp,notes:'',completed:true};
    onPersist({...life,focusSessions:[session,...life.focusSessions]});setRunning(false);setStartedAt('');setSeconds(25*60);
  };
  const mins=Math.floor(seconds/60),secs=seconds%60;
  return <div className="vxl-focus"><section className="vx-panel vxl-focus-stage"><span>FOCUS</span><select value={focusTaskId} onChange={e=>{setFocusTaskId(e.target.value);setRunning(false)}}><option value="">Choose a task…</option>{life.tasks.filter(t=>t.status!=='completed'&&t.status!=='cancelled').map(t=><option value={t.id} key={t.id}>{t.title}</option>)}</select><h2>{task?.title||'Choose what deserves your attention.'}</h2><strong className="timer">{String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</strong><div className="vxl-focus-presets">{[[25,5],[50,10],[90,15]].map(([work,rest])=><button key={work} disabled={running} onClick={()=>setSeconds(work*60)}>{work}/{rest}</button>)}<button disabled={running} onClick={()=>{const v=Number(window.prompt('Custom focus minutes','30'));if(v>0)setSeconds(v*60)}}>Custom</button></div><div className="vxl-focus-actions"><button className="primary" onClick={()=>running?setRunning(false):start()}>{running?<Pause/>:<Play/>}{running?'Pause':'Start'}</button><button onClick={finish}><TimerReset/>Finish Session</button>{task?<button onClick={()=>onComplete(task)}><Check/>Complete Task</button>:null}</div><button className="vxl-focus-capture" onClick={()=>{const text=window.prompt('Quick capture thought');if(!text)return;onPersist({...life,captures:[...life.captures,{id:newLifeId('capture'),text,createdAt:nowIso(),organized:false}]})}}><Plus/>Quick Capture</button></section>
    <aside className="vx-panel vxl-focus-history"><header><h3>Recent Focus</h3></header>{life.focusSessions.slice(0,8).map(session=><div key={session.id}><Focus/><span><strong>{session.title}</strong><small>{dateLabel(session.startedAt)} · {session.plannedMinutes} min</small></span></div>)}</aside>
  </div>;
}

function FitnessView({life,range,setRange,onAddPlan,onPersist}:{life:LifeData;range:'7'|'30';setRange:(v:'7'|'30')=>void;onAddPlan:()=>void;onPersist:(d:LifeData)=>void}){
  const cutoff=Date.now()-Number(range)*86400000;
  const sessions=life.workoutSessions.filter(s=>s.completed&&Date.parse(s.date)>=cutoff);
  const muscle=new Map<string,number>();
  for(const session of sessions)for(const log of session.exerciseLogs)for(const set of log.sets.filter(s=>s.completed))muscle.set(log.muscleGroup,(muscle.get(log.muscleGroup)||0)+Math.max(1,set.reps)*Math.max(1,set.weight||1));
  const max=Math.max(1,...muscle.values());
  const thisWeek=life.workoutSessions.filter(s=>s.completed&&Date.now()-Date.parse(s.date)<7*86400000).length;
  const scheduled=life.workoutPlans.filter(p=>p.active&&p.days.length).reduce((sum,p)=>sum+p.days.length,0);
  const prs=findPrs(life.workoutSessions);
  const next=nextWorkout(life.workoutPlans);
  const completePlan=(plan:WorkoutPlan)=>{
    const now=nowIso();
    const session:WorkoutSession={id:newLifeId('workout'),planId:plan.id,name:plan.name,date:todayKey(),startedAt:now,durationMinutes:0,completed:true,endedAt:now,notes:'',exerciseLogs:plan.exercises.map(ex=>({exerciseId:ex.id,name:ex.name,muscleGroup:ex.muscleGroup,notes:ex.notes,sets:Array.from({length:ex.sets},()=>({reps:ex.reps,weight:ex.weight||0,rpe:ex.rpe,completed:true}))}))};
    onPersist({...life,workoutSessions:[session,...life.workoutSessions]});
  };
  return <div className="vxl-fitness"><div className="vxl-section-head"><div><h2>Fitness</h2><p>Training activity, volume, consistency, and progression. The muscle map represents training load—not biological growth.</p></div><button onClick={onAddPlan}><Plus/>Workout Plan</button></div>
    <div className="vxl-metrics fitness"><Metric label="This Week" value={thisWeek+' / '+(scheduled||life.workoutPlans.length||0)} sub="completed / planned workouts"/><Metric label="Training Volume" value={formatCompact([...muscle.values()].reduce((a,b)=>a+b,0))} sub={'last '+range+' days'}/><Metric label="Personal Records" value={String(prs.length)} sub="exercise weight PRs"/><Metric label="Consistency" value={scheduled?Math.min(100,Math.round(thisWeek/Math.max(1,scheduled)*100))+'%':'—'} sub="weekly plan completion"/><Metric label="Next Workout" value={next?.name||'—'} sub={next?next.when:'No active schedule'}/></div>
    <div className="vxl-fitness-grid">
      <section className="vx-panel vxl-muscle-map"><header><div><h3>Training Load</h3><p>Completed set volume by muscle group.</p></div><div><button className={range==='7'?'active':''} onClick={()=>setRange('7')}>7D</button><button className={range==='30'?'active':''} onClick={()=>setRange('30')}>30D</button></div></header><div className="vxl-bodymap"><div className="silhouette front"><i className="head"/><i className="torso"/><i className="arm left"/><i className="arm right"/><i className="leg left"/><i className="leg right"/></div><div className="muscle-load">{['Chest','Back','Shoulders','Biceps','Triceps','Quads','Hamstrings','Glutes','Calves','Core'].map(name=>{const value=muscle.get(name)||0,pct=Math.round(value/max*100);return <div key={name}><span>{name}</span><i><b style={{width:pct+'%'}}/></i><strong>{formatCompact(value)}</strong></div>})}</div></div></section>
      <section className="vx-panel vxl-plans"><header><div><h3>Workout Plans</h3><p>Schedule plans into Life Today and Calendar.</p></div></header>{life.workoutPlans.map(plan=><article key={plan.id}><div><Dumbbell/><span><strong>{plan.name}</strong><small>{dayLabels(plan.days)}{plan.time?' · '+timeLabel(plan.time):''}</small></span></div><div className="exercises">{plan.exercises.map(ex=><span key={ex.id}>{ex.name} <b>{ex.sets}×{ex.reps}</b></span>)}</div><footer><button onClick={()=>completePlan(plan)}><Check/>Log Complete</button><button onClick={()=>onPersist({...life,workoutPlans:life.workoutPlans.map(p=>p.id===plan.id?{...p,active:!p.active,updatedAt:nowIso()}:p)})}>{plan.active?'Pause':'Activate'}</button></footer></article>)}{!life.workoutPlans.length?<Empty compact text="Create Push, Pull, Legs, Upper, Lower, Full Body, or a custom plan."/ >}</section>
      <section className="vx-panel vxl-recent-workouts"><header><h3>Recent Sessions</h3></header>{life.workoutSessions.slice(0,8).map(session=><div key={session.id}><Dumbbell/><span><strong>{session.name}</strong><small>{dateLabel(session.date)} · {session.exerciseLogs.length} exercises</small></span><b>{session.durationMinutes?session.durationMinutes+'m':'logged'}</b></div>)}</section>
      <section className="vx-panel vxl-prs"><header><h3>Personal Records</h3></header>{prs.slice(0,8).map(pr=><div key={pr.name}><Trophy/><span><strong>{pr.name}</strong><small>{pr.muscle}</small></span><b>{pr.weight} lb</b></div>)}{!prs.length?<Empty compact text="PRs appear after logged weighted sets."/ >}</section>
    </div>
  </div>;
}

function TaskModal({life,onClose,onSave}:{life:LifeData;onClose:()=>void;onSave:(t:LifeTask)=>void}){
  const [title,setTitle]=useState('');const [dueDate,setDate]=useState('');const [dueTime,setTime]=useState('');const [priority,setPriority]=useState<TaskPriority>('Medium');const [listId,setList]=useState('inbox');const [projectId,setProject]=useState('');const [tags,setTags]=useState('');const [duration,setDuration]=useState('');const [reminder,setReminder]=useState('60');const [repeat,setRepeat]=useState('');const [notes,setNotes]=useState('');
  const save=()=>{if(!title.trim())return;const now=nowIso();onSave({id:newLifeId('task'),title:title.trim(),notes,status:listId==='inbox'?'inbox':'todo',priority,listId,projectId:projectId||undefined,tags:tags.split(',').map(x=>x.trim()).filter(Boolean),dueDate:dueDate||undefined,dueTime:dueTime||undefined,durationMinutes:Number(duration)||undefined,reminderMinutes:Number(reminder)||undefined,repeat:repeat||undefined,subtasks:[],createdAt:now,updatedAt:now})};
  return <Modal title="New Task" subtitle="Complexity stays optional. Fill only what helps." onClose={onClose}><div className="vxl-form grid"><label className="wide">Task<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Finish film assignment"/></label><label>Due Date<input type="date" value={dueDate} onChange={e=>setDate(e.target.value)}/></label><label>Due Time<input type="time" value={dueTime} onChange={e=>setTime(e.target.value)}/></label><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as TaskPriority)}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><label>List<select value={listId} onChange={e=>setList(e.target.value)}>{life.lists.filter(l=>!l.archived).map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label><label>Project<select value={projectId} onChange={e=>setProject(e.target.value)}><option value="">None</option>{life.projects.filter(p=>p.status==='active').map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Duration (min)<input type="number" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Reminder (min before)<input type="number" value={reminder} onChange={e=>setReminder(e.target.value)}/></label><label>Repeat<input value={repeat} onChange={e=>setRepeat(e.target.value)} placeholder="Every Wednesday"/></label><label className="wide">Tags<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="Editing, RVCC"/></label><label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><ModalFooter onClose={onClose} onSave={save} label="Create Task" disabled={!title.trim()}/></Modal>;
}

function EventModal({onClose,onSave}:{onClose:()=>void;onSave:(e:LifeEvent)=>void}){
  const [title,setTitle]=useState('');const [date,setDate]=useState(todayKey());const [time,setTime]=useState('09:00');const [end,setEnd]=useState('10:00');const [allDay,setAllDay]=useState(false);const [location,setLocation]=useState('');const [notes,setNotes]=useState('');
  const save=()=>{if(!title.trim())return;const now=nowIso();const start=allDay?date+'T00:00:00':date+'T'+time+':00';const endAt=allDay?date+'T23:59:00':date+'T'+end+':00';onSave({id:newLifeId('event'),title:title.trim(),start,end:endAt,allDay,location,notes,source:'manual',createdAt:now,updatedAt:now})};
  return <Modal title="New Event" subtitle="Events appear in Today and Calendar layers." onClose={onClose}><div className="vxl-form grid"><label className="wide">Event<input value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label className="check"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}/>All day</label>{!allDay?<><label>Start<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>End<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></>:null}<label className="wide">Location<input value={location} onChange={e=>setLocation(e.target.value)}/></label><label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><ModalFooter onClose={onClose} onSave={save} label="Create Event" disabled={!title.trim()}/></Modal>;
}

function HabitModal({onClose,onSave}:{onClose:()=>void;onSave:(h:LifeHabit)=>void}){
  const [name,setName]=useState('');const [mode,setMode]=useState<'daily'|'weekly'|'custom'>('daily');const [target,setTarget]=useState('3');const [days,setDays]=useState<number[]>([]);
  const toggle=(d:number)=>setDays(current=>current.includes(d)?current.filter(x=>x!==d):[...current,d]);
  const save=()=>{if(!name.trim())return;const now=nowIso();onSave({id:newLifeId('habit'),name:name.trim(),notes:'',frequency:{mode,days:mode==='daily'?[0,1,2,3,4,5,6]:days,targetPerWeek:mode==='daily'?7:Number(target)||3},checks:[],active:true,createdAt:now,updatedAt:now})};
  return <Modal title="New Habit" subtitle="Habits repeat; tasks end. Momentum avoids punitive streak resets." onClose={onClose}><div className="vxl-form grid"><label className="wide">Habit<input value={name} onChange={e=>setName(e.target.value)} placeholder="10-minute cleanup"/></label><label>Frequency<select value={mode} onChange={e=>setMode(e.target.value as any)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="custom">Custom days</option></select></label>{mode!=='daily'?<label>Target / week<input type="number" min="1" max="7" value={target} onChange={e=>setTarget(e.target.value)}/></label>:null}{mode!=='daily'?<div className="wide vxl-day-picker">{['S','M','T','W','T','F','S'].map((label,i)=><button className={days.includes(i)?'active':''} key={i} onClick={()=>toggle(i)}>{label}</button>)}</div>:null}</div><ModalFooter onClose={onClose} onSave={save} label="Create Habit" disabled={!name.trim()}/></Modal>;
}

function GoalModal({life,onClose,onSave}:{life:LifeData;onClose:()=>void;onSave:(g:LifeGoal)=>void}){
  const [title,setTitle]=useState('');const [description,setDescription]=useState('');const [deadline,setDeadline]=useState('');const [tasks,setTasks]=useState<string[]>([]);const [habits,setHabits]=useState<string[]>([]);
  const save=()=>{if(!title.trim())return;const now=nowIso();onSave({id:newLifeId('goal'),title:title.trim(),description,deadline:deadline||undefined,progress:0,status:'active',taskIds:tasks,habitIds:habits,links:[],createdAt:now,updatedAt:now})};
  return <Modal title="New Goal" subtitle="Connect tasks and habits now; cross-module links can be added from the goal after creation." onClose={onClose}><div className="vxl-form grid"><label className="wide">Goal<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Finish Semester Strong"/></label><label className="wide">Description<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label>Deadline<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label><div/><div className="wide vxl-link-picker"><strong>Tasks</strong>{life.tasks.filter(t=>t.status!=='completed').slice(0,15).map(t=><label key={t.id}><input type="checkbox" checked={tasks.includes(t.id)} onChange={()=>setTasks(cur=>cur.includes(t.id)?cur.filter(x=>x!==t.id):[...cur,t.id])}/>{t.title}</label>)}</div><div className="wide vxl-link-picker"><strong>Habits</strong>{life.habits.filter(h=>h.active).map(h=><label key={h.id}><input type="checkbox" checked={habits.includes(h.id)} onChange={()=>setHabits(cur=>cur.includes(h.id)?cur.filter(x=>x!==h.id):[...cur,h.id])}/>{h.name}</label>)}</div></div><ModalFooter onClose={onClose} onSave={save} label="Create Goal" disabled={!title.trim()}/></Modal>;
}

function WorkoutModal({onClose,onSave}:{onClose:()=>void;onSave:(p:WorkoutPlan)=>void}){
  const [name,setName]=useState('Pull');const [days,setDays]=useState<number[]>([]);const [time,setTime]=useState('18:00');const [exercises,setExercises]=useState<ExerciseDefinition[]>([]);
  const toggle=(d:number)=>setDays(cur=>cur.includes(d)?cur.filter(x=>x!==d):[...cur,d]);
  const addExercise=()=>{const exName=window.prompt('Exercise name');if(!exName)return;const muscle=window.prompt('Primary muscle group (Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core)','Back')||'Other';const sets=Math.max(1,Number(window.prompt('Sets','3'))||3),reps=Math.max(1,Number(window.prompt('Reps','10'))||10),weight=Number(window.prompt('Default weight (optional)','')||0)||undefined;setExercises(cur=>[...cur,{id:newLifeId('exercise'),name:exName,muscleGroup:muscle,sets,reps,weight,notes:''}])};
  const save=()=>{if(!name.trim())return;const now=nowIso();onSave({id:newLifeId('plan'),name:name.trim(),days,time:time||undefined,exercises,active:true,createdAt:now,updatedAt:now})};
  return <Modal title="Workout Plan" subtitle="Build Push, Pull, Legs, Upper, Lower, Full Body, or anything custom." onClose={onClose}><div className="vxl-form grid"><label>Plan Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><div className="wide vxl-day-picker">{['S','M','T','W','T','F','S'].map((label,i)=><button className={days.includes(i)?'active':''} key={i} onClick={()=>toggle(i)}>{label}</button>)}</div><div className="wide vxl-exercise-builder"><header><strong>Exercises</strong><button onClick={addExercise}><Plus/>Add Exercise</button></header>{exercises.map(ex=><div key={ex.id}><span><strong>{ex.name}</strong><small>{ex.muscleGroup}</small></span><b>{ex.sets} × {ex.reps}{ex.weight?' @ '+ex.weight+' lb':''}</b><button onClick={()=>setExercises(cur=>cur.filter(x=>x.id!==ex.id))}><X/></button></div>)}</div></div><ModalFooter onClose={onClose} onSave={save} label="Save Plan" disabled={!name.trim()}/></Modal>;
}

function Modal({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode}){return <div className="vxl-modal-backdrop" onMouseDown={e=>e.currentTarget===e.target&&onClose()}><section className="vxl-modal"><header><div><strong>{title}</strong><span>{subtitle}</span></div><button onClick={onClose}><X/></button></header>{children}</section></div>}
function ModalFooter({onClose,onSave,label,disabled}:{onClose:()=>void;onSave:()=>void;label:string;disabled?:boolean}){return <footer className="vxl-modal-footer"><button onClick={onClose}>Cancel</button><button className="red" disabled={disabled} onClick={onSave}>{label}</button></footer>}
function CardHead({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}){return <header><h3>{title}</h3>{action?<button onClick={onAction}>{action}<ChevronRight/></button>:null}</header>}
function Empty({text,compact=false}:{text:string;compact?:boolean}){return <div className={'vxl-empty '+(compact?'compact':'')}><Circle/><span>{text}</span></div>}
function tabIcon(tab:LifeTab){if(tab==='Today')return <Sparkles/>;if(tab==='Tasks')return <ListTodo/>;if(tab==='Calendar')return <CalendarDays/>;if(tab==='Habits')return <RotateCcw/>;if(tab==='Goals')return <Target/>;if(tab==='Focus')return <Focus/>;return <Dumbbell/>}
function priorityRank(p:TaskPriority){return p==='Urgent'?4:p==='High'?3:p==='Medium'?2:1}
function taskFilterCount(tasks:LifeTask[],filter:'all'|'inbox'|'today'|'overdue'|'completed'){const today=todayKey();if(filter==='all')return tasks.filter(t=>!['completed','cancelled'].includes(t.status)).length;if(filter==='inbox')return tasks.filter(t=>t.status==='inbox').length;if(filter==='today')return tasks.filter(t=>t.status!=='completed'&&(t.dueDate===today||t.scheduledStart?.startsWith(today))).length;if(filter==='overdue')return tasks.filter(t=>t.status!=='completed'&&!!t.dueDate&&t.dueDate<today).length;return tasks.filter(t=>t.status==='completed').length}
function dateKeyOffset(days:number){const d=new Date();d.setDate(d.getDate()+days);return todayKey(d)}
function dayLabels(days:number[]){const labels=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];return days.length?days.map(d=>labels[d]).join(' · '):'No schedule'}
function formatCompact(n:number){return new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(n)}
function findPrs(sessions:WorkoutSession[]){const best=new Map<string,{name:string;muscle:string;weight:number}>();for(const session of sessions)for(const log of session.exerciseLogs)for(const set of log.sets){if(!set.completed)continue;const current=best.get(log.name);if(!current||set.weight>current.weight)best.set(log.name,{name:log.name,muscle:log.muscleGroup,weight:set.weight})}return [...best.values()].sort((a,b)=>b.weight-a.weight)}
function nextWorkout(plans:WorkoutPlan[]){const active=plans.filter(p=>p.active&&p.days.length);if(!active.length)return null;const now=new Date();for(let offset=0;offset<8;offset++){const d=new Date(now);d.setDate(now.getDate()+offset);const plan=active.find(p=>p.days.includes(d.getDay()));if(plan)return {name:plan.name,when:offset===0?'Today':offset===1?'Tomorrow':new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(d)+(plan.time?' · '+timeLabel(plan.time):'')}}return null}

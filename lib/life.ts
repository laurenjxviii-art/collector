export type LifeTab='Today'|'Tasks'|'Calendar'|'Habits'|'Goals'|'Focus'|'Fitness';
export type TaskPriority='Low'|'Medium'|'High'|'Urgent';
export type TaskStatus='inbox'|'todo'|'in_progress'|'completed'|'cancelled';

export type LifeList={id:string;name:string;color:string;archived?:boolean};
export type LifeProject={id:string;name:string;listId?:string;goalId?:string;status:'active'|'completed'|'archived';dueDate?:string;notes:string;createdAt:string;updatedAt:string};
export type LifeSubtask={id:string;title:string;completed:boolean};

export type LifeTask={
  id:string;
  title:string;
  notes:string;
  status:TaskStatus;
  priority:TaskPriority;
  listId?:string;
  projectId?:string;
  tags:string[];
  dueDate?:string;
  dueTime?:string;
  durationMinutes?:number;
  reminderMinutes?:number;
  repeat?:string;
  subtasks:LifeSubtask[];
  scheduledStart?:string;
  scheduledEnd?:string;
  completedAt?:string;
  createdAt:string;
  updatedAt:string;
};

export type LifeEvent={
  id:string;
  title:string;
  start:string;
  end?:string;
  allDay:boolean;
  location:string;
  notes:string;
  source:'life'|'financial'|'portfolio'|'sell'|'fitness'|'manual';
  refId?:string;
  createdAt:string;
  updatedAt:string;
};

export type HabitFrequency={mode:'daily'|'weekly'|'custom';days:number[];targetPerWeek:number};
export type LifeHabit={
  id:string;
  name:string;
  notes:string;
  frequency:HabitFrequency;
  checks:string[];
  active:boolean;
  createdAt:string;
  updatedAt:string;
};

export type GoalLink={module:'life'|'financial'|'portfolio'|'setup'|'wishlist'|'fitness';refId:string;label:string};
export type LifeGoal={
  id:string;
  title:string;
  description:string;
  deadline?:string;
  progress:number;
  status:'active'|'completed'|'paused'|'archived';
  taskIds:string[];
  habitIds:string[];
  links:GoalLink[];
  createdAt:string;
  updatedAt:string;
};

export type FocusSession={
  id:string;
  title:string;
  taskId?:string;
  plannedMinutes:number;
  startedAt:string;
  endedAt?:string;
  notes:string;
  completed:boolean;
};

export type ExerciseDefinition={
  id:string;
  name:string;
  muscleGroup:string;
  sets:number;
  reps:number;
  weight?:number;
  rpe?:number;
  notes:string;
};

export type WorkoutPlan={
  id:string;
  name:string;
  days:number[];
  time?:string;
  exercises:ExerciseDefinition[];
  active:boolean;
  createdAt:string;
  updatedAt:string;
};

export type ExerciseLog={
  exerciseId:string;
  name:string;
  muscleGroup:string;
  sets:Array<{reps:number;weight:number;rpe?:number;completed:boolean}>;
  notes:string;
};

export type WorkoutSession={
  id:string;
  planId?:string;
  name:string;
  date:string;
  startedAt:string;
  endedAt?:string;
  durationMinutes:number;
  exerciseLogs:ExerciseLog[];
  notes:string;
  completed:boolean;
};

export type QuickCapture={id:string;text:string;createdAt:string;organized:boolean};

export type LifeCalendarPreferences={
  view:'day'|'week'|'month'|'agenda';
  layers:{tasks:boolean;events:boolean;workouts:boolean;bills:boolean;preorders:boolean;drops:boolean;orders:boolean;goals:boolean};
};

export type LifeData={
  version:1;
  lists:LifeList[];
  projects:LifeProject[];
  tasks:LifeTask[];
  events:LifeEvent[];
  habits:LifeHabit[];
  goals:LifeGoal[];
  focusSessions:FocusSession[];
  workoutPlans:WorkoutPlan[];
  workoutSessions:WorkoutSession[];
  captures:QuickCapture[];
  calendar:LifeCalendarPreferences;
};

export const DEFAULT_LIFE_LISTS:LifeList[]=[
  {id:'inbox',name:'Inbox',color:'#ff2338'},
  {id:'school',name:'School',color:'#6f8cff'},
  {id:'work',name:'Work',color:'#ff9d35'},
  {id:'apartment',name:'Apartment',color:'#25e2a0'},
  {id:'errands',name:'Errands',color:'#b77cff'}
];

export function emptyLifeData():LifeData{
  return {
    version:1,
    lists:DEFAULT_LIFE_LISTS.map(list=>({...list})),
    projects:[],tasks:[],events:[],habits:[],goals:[],focusSessions:[],workoutPlans:[],workoutSessions:[],captures:[],
    calendar:{view:'agenda',layers:{tasks:true,events:true,workouts:true,bills:true,preorders:true,drops:true,orders:true,goals:true}}
  };
}

function arr(value:unknown){return Array.isArray(value)?value:[]}
function str(value:unknown,fallback=''){return typeof value==='string'?value:fallback}
function num(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback}
function validDateString(value:unknown){return typeof value==='string'&&(!value||Number.isFinite(Date.parse(value)))}

export function normalizeLifeData(value?:LifeData):LifeData{
  const base=emptyLifeData();
  if(!value||value.version!==1)return base;
  const lists=arr(value.lists).filter((x):x is LifeList=>!!x&&typeof x==='object'&&typeof (x as LifeList).id==='string'&&typeof (x as LifeList).name==='string').map(x=>({...x,color:str(x.color,'#ff2338')}));
  const knownLists=new Set(lists.map(x=>x.id));
  for(const built of DEFAULT_LIFE_LISTS)if(!knownLists.has(built.id))lists.unshift({...built});
  return {
    version:1,
    lists,
    projects:arr(value.projects).filter((x):x is LifeProject=>!!x&&typeof x==='object'&&typeof (x as LifeProject).id==='string'&&typeof (x as LifeProject).name==='string'),
    tasks:arr(value.tasks).filter((x):x is LifeTask=>!!x&&typeof x==='object'&&typeof (x as LifeTask).id==='string'&&typeof (x as LifeTask).title==='string').map(task=>({
      ...task,notes:str(task.notes),status:['inbox','todo','in_progress','completed','cancelled'].includes(task.status)?task.status:'todo',
      priority:['Low','Medium','High','Urgent'].includes(task.priority)?task.priority:'Medium',
      tags:arr(task.tags).filter((x):x is string=>typeof x==='string'),
      subtasks:arr(task.subtasks).filter((x):x is LifeSubtask=>!!x&&typeof x==='object'&&typeof (x as LifeSubtask).id==='string'&&typeof (x as LifeSubtask).title==='string'),
      createdAt:str(task.createdAt,new Date().toISOString()),updatedAt:str(task.updatedAt,new Date().toISOString())
    })),
    events:arr(value.events).filter((x):x is LifeEvent=>!!x&&typeof x==='object'&&typeof (x as LifeEvent).id==='string'&&typeof (x as LifeEvent).title==='string'&&typeof (x as LifeEvent).start==='string'),
    habits:arr(value.habits).filter((x):x is LifeHabit=>!!x&&typeof x==='object'&&typeof (x as LifeHabit).id==='string'&&typeof (x as LifeHabit).name==='string').map(habit=>({...habit,checks:arr(habit.checks).filter((x):x is string=>typeof x==='string')})),
    goals:arr(value.goals).filter((x):x is LifeGoal=>!!x&&typeof x==='object'&&typeof (x as LifeGoal).id==='string'&&typeof (x as LifeGoal).title==='string').map(goal=>({...goal,progress:Math.max(0,Math.min(100,num(goal.progress))),taskIds:arr(goal.taskIds).filter((x):x is string=>typeof x==='string'),habitIds:arr(goal.habitIds).filter((x):x is string=>typeof x==='string'),links:arr(goal.links).filter((x):x is GoalLink=>!!x&&typeof x==='object'&&typeof (x as GoalLink).module==='string')})),
    focusSessions:arr(value.focusSessions).filter((x):x is FocusSession=>!!x&&typeof x==='object'&&typeof (x as FocusSession).id==='string'&&typeof (x as FocusSession).title==='string'),
    workoutPlans:arr(value.workoutPlans).filter((x):x is WorkoutPlan=>!!x&&typeof x==='object'&&typeof (x as WorkoutPlan).id==='string'&&typeof (x as WorkoutPlan).name==='string').map(plan=>({...plan,days:arr(plan.days).filter((x):x is number=>typeof x==='number'&&x>=0&&x<=6),exercises:arr(plan.exercises).filter((x):x is ExerciseDefinition=>!!x&&typeof x==='object'&&typeof (x as ExerciseDefinition).id==='string')})),
    workoutSessions:arr(value.workoutSessions).filter((x):x is WorkoutSession=>!!x&&typeof x==='object'&&typeof (x as WorkoutSession).id==='string'&&typeof (x as WorkoutSession).name==='string'),
    captures:arr(value.captures).filter((x):x is QuickCapture=>!!x&&typeof x==='object'&&typeof (x as QuickCapture).id==='string'&&typeof (x as QuickCapture).text==='string'),
    calendar:{
      view:['day','week','month','agenda'].includes(value.calendar?.view)?value.calendar.view:'agenda',
      layers:{...base.calendar.layers,...(value.calendar?.layers||{})}
    }
  };
}

export function validLifeData(value:unknown):value is LifeData{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const data=value as LifeData;
  if(data.version!==1)return false;
  const normalized=normalizeLifeData(data);
  return Array.isArray(normalized.tasks)&&Array.isArray(normalized.events)&&Array.isArray(normalized.habits)&&Array.isArray(normalized.goals);
}

export function newLifeId(prefix:string){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
export function todayKey(date=new Date()){return date.toISOString().slice(0,10)}
export function taskDueKey(task:LifeTask){return task.scheduledStart?.slice(0,10)||task.dueDate||''}
export function habitMomentum(habit:LifeHabit,days=30){
  const today=new Date();let expected=0,done=0;const checks=new Set(habit.checks);
  for(let offset=0;offset<days;offset++){
    const d=new Date(today);d.setDate(today.getDate()-offset);
    const day=d.getDay();
    const expectedDay=habit.frequency.mode==='daily'||habit.frequency.days.includes(day);
    if(expectedDay){expected++;if(checks.has(todayKey(d)))done++}
  }
  return expected?Math.round(done/expected*100):0;
}
export function goalComputedProgress(goal:LifeGoal,data:LifeData){
  const linkedTasks=goal.taskIds.map(id=>data.tasks.find(task=>task.id===id)).filter(Boolean) as LifeTask[];
  const linkedHabits=goal.habitIds.map(id=>data.habits.find(habit=>habit.id===id)).filter(Boolean) as LifeHabit[];
  const taskPart=linkedTasks.length?linkedTasks.filter(task=>task.status==='completed').length/linkedTasks.length*100:null;
  const habitPart=linkedHabits.length?linkedHabits.reduce((sum,habit)=>sum+habitMomentum(habit),0)/linkedHabits.length:null;
  const parts=[taskPart,habitPart,goal.progress].filter((x):x is number=>typeof x==='number');
  return parts.length?Math.round(parts.reduce((a,b)=>a+b,0)/parts.length):goal.progress;
}

export function parseNaturalTask(input:string,now=new Date()):Partial<LifeTask>&{title:string}{
  let text=input.trim();
  let dueDate:string|undefined,dueTime:string|undefined,repeat:string|undefined;
  const lower=text.toLowerCase();
  const dayMap:Record<string,number>={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};
  if(/\btomorrow\b/i.test(text)){const d=new Date(now);d.setDate(d.getDate()+1);dueDate=todayKey(d);text=text.replace(/\btomorrow\b/ig,'').trim()}
  else if(/\btoday\b/i.test(text)){dueDate=todayKey(now);text=text.replace(/\btoday\b/ig,'').trim()}
  else{
    for(const [name,day] of Object.entries(dayMap))if(new RegExp('\\b'+name+'\\b','i').test(text)){
      const d=new Date(now);let delta=(day-d.getDay()+7)%7;if(delta===0)delta=7;d.setDate(d.getDate()+delta);dueDate=todayKey(d);text=text.replace(new RegExp('\\b'+name+'\\b','ig'),'').trim();break;
    }
  }
  const timeMatch=text.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if(timeMatch){
    let hour=Number(timeMatch[1])%12;if(timeMatch[3].toLowerCase()==='pm')hour+=12;
    dueTime=String(hour).padStart(2,'0')+':'+String(Number(timeMatch[2]||0)).padStart(2,'0');
    text=text.replace(timeMatch[0],'').trim();
  }
  if(/\bevery\b/i.test(lower)){repeat=input.slice(lower.indexOf('every')).trim()}
  text=text.replace(/\s+/g,' ').replace(/\s+(at|on)$/i,'').trim();
  return {title:text||input.trim(),dueDate,dueTime,repeat,status:'todo',priority:'Medium',notes:'',tags:[],subtasks:[]};
}

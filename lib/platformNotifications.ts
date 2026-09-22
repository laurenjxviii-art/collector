import type {Store} from './model';
import {normalizeLifeData,todayKey,type LifeTask} from './life';
import {normalizeFinancialData} from './financial';
import {normalizePlatformState,type PlatformState} from './platform';

export type VexumNotificationCategory='Tasks'|'Radar'|'Sell'|'Financial'|'Social'|'Calendar'|'Collecting'|'Setup';
export type VexumNotification={
  id:string;
  category:VexumNotificationCategory;
  title:string;
  detail:string;
  route:string;
  occurredAt:string;
  urgency:'normal'|'high';
  taskId?:string;
  actionLabel?:string;
};

function dateOffset(days:number){const d=new Date();d.setDate(d.getDate()+days);return todayKey(d)}
function timeAt(date:string,time?:string){return date+(time?'T'+time+':00':'T09:00:00')}

export function buildVexumNotifications(store:Store,platformInput?:PlatformState):VexumNotification[]{
  const platform=normalizePlatformState(platformInput||store.platform,true);
  const life=normalizeLifeData(store.life);
  const financial=normalizeFinancialData(store.financial);
  const today=todayKey(),tomorrow=dateOffset(1),week=dateOffset(7);
  const rows:VexumNotification[]=[];

  if(platform.notifications.taskReminders){
    for(const task of life.tasks.filter(task=>!['completed','cancelled'].includes(task.status)&&task.dueDate&&task.dueDate<=tomorrow)){
      const overdue=task.dueDate!<today;
      rows.push({
        id:'task:'+task.id+':'+task.dueDate,
        category:'Tasks',
        title:overdue?'Task overdue':task.dueDate===today?'Task due today':'Task due tomorrow',
        detail:task.title+(task.dueTime?' · '+task.dueTime:''),
        route:'/life',
        occurredAt:timeAt(task.dueDate!,task.dueTime),
        urgency:overdue||task.priority==='Urgent'?'high':'normal',
        taskId:task.id,
        actionLabel:'Complete'
      });
    }
  }

  for(const event of life.events.filter(event=>event.start.slice(0,10)>=today&&event.start.slice(0,10)<=tomorrow)){
    rows.push({id:'event:'+event.id,category:'Calendar',title:event.start.startsWith(today)?'Event today':'Event tomorrow',detail:event.title,route:'/life',occurredAt:event.start,urgency:'normal'});
  }

  if(platform.notifications.financial){
    for(const bill of financial.bills.filter(bill=>bill.active&&bill.nextDueDate&&bill.nextDueDate>=today&&bill.nextDueDate<=dateOffset(3))){
      rows.push({id:'bill:'+bill.id+':'+bill.nextDueDate,category:'Financial',title:bill.nextDueDate===today?'Bill due today':'Bill due soon',detail:bill.name+' · $'+bill.amount.toFixed(2),route:'/financial',occurredAt:timeAt(bill.nextDueDate!),urgency:bill.nextDueDate===today?'high':'normal'});
    }
  }

  if(platform.notifications.radar){
    for(const record of Object.values(store.wishlist||{}).filter(record=>!record.archived&&record.currentMarket!==undefined&&record.targetPrice!==undefined&&record.currentMarket<=record.targetPrice)){
      rows.push({id:'wishlist-target:'+record.productId+':'+String(record.currentMarket),category:'Radar',title:'Wishlist target reached',detail:(record.snapshot?.name||record.productId)+' · $'+Number(record.currentMarket).toFixed(2),route:'/wishlist',occurredAt:record.updatedAt||new Date().toISOString(),urgency:record.priority==='Grail'?'high':'normal'});
    }
  }

  for(const record of Object.values(store.wishlist||{}).filter(record=>!record.archived&&record.preorder?.enabled&&record.preorder.estimatedChargeDate&&record.preorder.estimatedChargeDate>=today&&record.preorder.estimatedChargeDate<=week)){
    rows.push({id:'preorder:'+record.productId+':'+record.preorder.estimatedChargeDate,category:'Collecting',title:'Preorder charge approaching',detail:(record.snapshot?.name||record.productId)+' · '+record.preorder.estimatedChargeDate,route:'/wishlist',occurredAt:timeAt(record.preorder.estimatedChargeDate!),urgency:'high'});
  }

  const setup=store.setup;
  if(setup){
    const currentIds=new Set(setup.spaces.filter(space=>space.mode==='current').map(space=>space.id));
    const placed=new Set(setup.placements.filter(p=>p.kind==='owned'&&p.portfolioItemId&&currentIds.has(p.setupId)).map(p=>p.portfolioItemId!));
    const unassigned=store.items.filter(item=>item.status==='owned'&&!item.archivedAt&&!placed.has(item.id)&&!item.location.trim()).length;
    if(unassigned)rows.push({id:'setup:unassigned:'+unassigned,category:'Setup',title:'Portfolio items need a location',detail:unassigned+' owned record'+(unassigned===1?' is':'s are')+' unassigned in Current Setup.',route:'/setup',occurredAt:new Date().toISOString(),urgency:'normal'});
  }

  const snoozed=platform.notifications.snoozed||{};
  const now=Date.now();
  return rows.filter(row=>!snoozed[row.id]||Date.parse(snoozed[row.id])<=now).toSorted((a,b)=>{
    if(a.urgency!==b.urgency)return a.urgency==='high'?-1:1;
    return a.occurredAt.localeCompare(b.occurredAt);
  });
}

export function completeNotificationTask(store:Store,taskId:string):Store{
  const life=normalizeLifeData(store.life);
  const stamp=new Date().toISOString();
  return {...store,life:{...life,tasks:life.tasks.map(task=>task.id===taskId?{...task,status:'completed',completedAt:stamp,updatedAt:stamp}:task)}};
}

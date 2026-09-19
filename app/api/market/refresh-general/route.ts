import {NextRequest,NextResponse} from 'next/server';
import {Item,Store,validStore} from '../../../../lib/model';
import {variantKey} from '../../../../lib/market';
import {GeneralQuote,analyzeSoldRows,generalMarketQuery,getApifyDataset,getApifyRun,isFunkoItem,isGeneralCollectible,lookupParseEbaySold,lookupParseHobbyDb,startApifySoldRun} from '../../../../lib/generalMarket';

export const runtime='nodejs';
export const maxDuration=60;

const STALE_MS=28*24*60*60*1000;
const APIFY_BATCH_SIZE=7;
const APIFY_RESULTS_PER_QUERY=12;

type WorkspaceRow={user_id:string;payload:Store;revision:number};
type JobRow={id:string;external_run_id:string;item_ids:string[];queries:Record<string,string>;started_at:string};

function latestGeneral(item:Item){return [...(item.priceHistory||[])].reverse().find(p=>p.kind==='provider'&&(p.source.startsWith('eBay sold · Apify')||p.source.startsWith('eBay sold · Parse')||p.source.startsWith('hobbyDB · Parse')))}
function stale(item:Item){const last=latestGeneral(item),checked=Date.parse(item.customFields?.['Market checked']||'');const seen=Math.max(last?Date.parse(last.date):0,Number.isFinite(checked)?checked:0);return !seen||Date.now()-seen>STALE_MS}
function eligible(item:Item){return item.status!=='sold'&&isGeneralCollectible(item)&&stale(item)}
function updateHistory(store:Store){const values:Record<string,number>={};for(const c of store.collections)values[c.id]=store.items.filter(i=>i.collectionId===c.id&&i.status==='owned').reduce((sum,i)=>sum+i.currentValue*i.quantity,0);const date=new Date().toISOString(),day=date.slice(0,10),history=[...(store.history||[])];if(history.at(-1)?.date.slice(0,10)===day)history[history.length-1]={date,values};else history.push({date,values});return {...store,history:history.slice(-1500)}}
async function supabase(url:string,key:string,path:string,init:RequestInit={}){const r=await fetch(url+path,{...init,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store',signal:AbortSignal.timeout(20000)});const body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||body?.error||'Supabase request failed');return body}
function mergeQuote(item:Item,quote:GeneralQuote){
  if(quote.confidence<.9)return null;if(quote.metrics&&quote.metrics.count<3)return null;
  const date=new Date().toISOString();const key=variantKey(item);const incoming=quote.comparables||[];const merged=Array.from(new Map([...(item.comparables||[]),...incoming].map(c=>[c.id,c])).values()).slice(-200);
  const source=quote.source+' · '+quote.tier;const point={date,value:quote.value,variant:key,source,url:quote.url,kind:'provider' as const};const points=[...(item.priceHistory||[])];const last=points.at(-1);if(!(last&&last.kind==='provider'&&last.source===source&&last.value===quote.value&&last.date.slice(0,10)===date.slice(0,10)))points.push(point);
  const metrics=quote.metrics;return {...item,currentValue:quote.value,updatedAt:date,identity:{...(item.identity||{}),...(quote.identifiers||{})},comparables:merged,customFields:{...item.customFields,'Market source':quote.source,'Market updated':date,'Market checked':date,'Market match confidence':Math.round(quote.confidence*100)+'%',...(metrics?{'Sold comps':String(metrics.count),'Sold comp average':String(metrics.average),'Sold comp median':String(metrics.median),'Sold comp range':`${metrics.min}–${metrics.max}`}:{})},priceHistory:points.slice(-3000)};
}
function markChecked(item:Item,source:string){const date=new Date().toISOString();return {...item,customFields:{...item.customFields,'Market checked':date,'Market review':source},updatedAt:date}}
async function patchWorkspace(url:string,key:string,row:WorkspaceRow,next:Store){const payload=updateHistory(next),path='/rest/v1/collector_workspaces?'+new URLSearchParams({user_id:'eq.'+row.user_id,revision:'eq.'+String(row.revision)});await supabase(url,key,path,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payload,revision:row.revision+1,updated_at:new Date().toISOString()})});row.payload=payload;row.revision++}
async function markJob(url:string,key:string,id:string,state:string,error=''){await supabase(url,key,'/rest/v1/collector_market_jobs?'+new URLSearchParams({id:'eq.'+id}),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({state,completed_at:new Date().toISOString(),error:error||null})})}

async function finishPendingApify(url:string,key:string,row:WorkspaceRow,token:string){
  const jobs=await supabase(url,key,'/rest/v1/collector_market_jobs?'+new URLSearchParams({user_id:'eq.'+row.user_id,provider:'eq.apify-ebay-sold',state:'eq.running',select:'id,external_run_id,item_ids,queries,started_at',order:'started_at.asc',limit:'1'}));const job=(Array.isArray(jobs)?jobs[0]:null) as JobRow|undefined;if(!job)return {pending:false,finished:false,updated:0,review:0};
  let run:any;try{run=await getApifyRun(token,job.external_run_id)}catch(err){if(Date.now()-Date.parse(job.started_at)>48*60*60*1000)await markJob(url,key,job.id,'failed',String(err));return {pending:true,finished:false,updated:0,review:0}}
  if(['FAILED','ABORTED','TIMED-OUT'].includes(run.status)){await markJob(url,key,job.id,'failed','Apify run '+run.status);return {pending:false,finished:true,updated:0,review:job.item_ids.length}}
  if(run.status!=='SUCCEEDED'||!run.defaultDatasetId)return {pending:true,finished:false,updated:0,review:0};
  const rows=await getApifyDataset(token,run.defaultDatasetId);const changes=new Map<string,Item>();let review=0,updated=0;
  for(const id of job.item_ids){const item=row.payload.items.find(i=>i.id===id);if(!item)continue;const query=job.queries?.[id]||generalMarketQuery(item);const quote=analyzeSoldRows(item,rows.get(query)||[],'eBay sold · Apify');if(!quote){review++;changes.set(id,markChecked(item,'No high-confidence Apify sold match'));continue}const next=mergeQuote(item,quote);if(!next){review++;changes.set(id,markChecked(item,'Apify match needs review'));}else{updated++;changes.set(id,next)}}
  if(changes.size){const next={...row.payload,items:row.payload.items.map(i=>changes.get(i.id)||i)};await patchWorkspace(url,key,row,next)}
  await markJob(url,key,job.id,'completed');return {pending:false,finished:true,updated,review};
}
async function startNextApify(url:string,key:string,row:WorkspaceRow,token:string){const items=row.payload.items.filter(eligible).slice(0,APIFY_BATCH_SIZE);if(!items.length)return null;const started=await startApifySoldRun(items,token,APIFY_RESULTS_PER_QUERY);if(!started)return null;await supabase(url,key,'/rest/v1/collector_market_jobs',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({user_id:row.user_id,provider:'apify-ebay-sold',external_run_id:started.runId,state:'running',item_ids:items.map(i=>i.id),queries:started.queries})});return {runId:started.runId,count:items.length}}
async function refreshOneParse(url:string,key:string,row:WorkspaceRow,parseKey:string){const item=row.payload.items.filter(eligible)[0];if(!item)return {updated:0,review:0};let quote:GeneralQuote|null=null;try{quote=await lookupParseEbaySold(item,parseKey)}catch{}if(!quote&&isFunkoItem(item)){try{quote=await lookupParseHobbyDb(item,parseKey)}catch{}}const next=quote?mergeQuote(item,quote):null;const changed=next||markChecked(item,quote?'Parse match needs review':'No high-confidence Parse match');await patchWorkspace(url,key,row,{...row.payload,items:row.payload.items.map(i=>i.id===item.id?changed:i)});return next?{updated:1,review:0}:{updated:0,review:1}}

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY,apify=process.env.APIFY_TOKEN,parse=process.env.PARSE_API_KEY;if(!url||!serviceKey)return NextResponse.json({ok:false,error:'Cloud service credentials are missing.'},{status:503});if(!apify&&!parse)return NextResponse.json({ok:false,error:'Add APIFY_TOKEN or PARSE_API_KEY to enable general collectible refresh.'},{status:503});
  const rows=await supabase(url,serviceKey,'/rest/v1/collector_workspaces?select=user_id,payload,revision&order=updated_at.asc&limit=5');let updated=0,review=0,started:any=null;
  for(const raw of Array.isArray(rows)?rows:[]){if(!validStore(raw.payload))continue;const row=raw as WorkspaceRow;
    if(apify){const pending=await finishPendingApify(url,serviceKey,row,apify);updated+=pending.updated;review+=pending.review;if(pending.pending)return NextResponse.json({ok:true,provider:'Apify eBay sold',state:'running',updated,needsReview:review,ranAt:new Date().toISOString()});started=await startNextApify(url,serviceKey,row,apify);return NextResponse.json({ok:true,provider:'Apify eBay sold',state:started?'started':'idle',started,updated,needsReview:review,ranAt:new Date().toISOString()})}
    if(parse){const result=await refreshOneParse(url,serviceKey,row,parse);updated+=result.updated;review+=result.review;return NextResponse.json({ok:true,provider:'Parse',state:'completed',updated,needsReview:review,ranAt:new Date().toISOString()})}
  }
  return NextResponse.json({ok:true,state:'idle',updated,needsReview:review,ranAt:new Date().toISOString()});
}

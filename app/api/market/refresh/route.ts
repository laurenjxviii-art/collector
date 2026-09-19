import {NextRequest,NextResponse} from 'next/server';
import {Item,Store,validStore} from '../../../../lib/model';
import {variantKey} from '../../../../lib/market';
import {JustTcgClient,bestCard,chooseVariant,isTcgItem,norm,RichMarketItem} from '../../../../lib/justtcg';

export const runtime='nodejs';
export const maxDuration=60;

const STALE_MS=20*60*60*1000;
const MAX_JUSTTCG_CALLS=8;
const JUSTTCG_MIN_INTERVAL_MS=6200;

function latestJustTcg(item:Item){return [...(item.priceHistory||[])].reverse().find(p=>p.kind==='provider'&&p.source.startsWith('JustTCG'))}
function stale(item:Item){const last=latestJustTcg(item),linked=Date.parse(item.marketLink?.lastRefresh||'');const seen=Math.max(last?Date.parse(last.date):0,Number.isFinite(linked)?linked:0);return !seen||Date.now()-seen>STALE_MS}
function direct(item:Item){const i=item.identity||{};return Boolean(i.justtcgVariantId||i.justtcgId||i.tcgplayerId||i.scryfallId)}
function chunks<T>(values:T[],size:number){const out:T[][]=[];for(let i=0;i<values.length;i+=size)out.push(values.slice(i,i+size));return out}
function cardNumber(item:Item){return String(item.identity?.collectorNumber||item.customFields?.['Card #']||'').trim()}
function matchConfidence(item:Item,card:any,directMatch=false){if(directMatch)return .99;const number=cardNumber(item),numberMatch=Boolean(number&&String(card.number||'').trim()===number),nameMatch=norm(card.name)===norm(item.name);if(numberMatch&&nameMatch)return .98;if(numberMatch)return .94;if(nameMatch)return .9;return .74}
function withMarket(item:Item,card:any,variant:any,confidence:number){
  const value=Number(variant.price);if(!Number.isFinite(value)||value<=0||confidence<.9)return item;
  const date=new Date().toISOString();const source='JustTCG · '+[variant.condition,variant.printing].filter(Boolean).join(' · ');
  const point={date,value,variant:variantKey(item),source,url:'https://justtcg.com',kind:'provider' as const};
  const points=[...(item.priceHistory||[])];
  const last=points.at(-1);if(!(last&&last.kind==='provider'&&last.source===source&&last.date.slice(0,10)===date.slice(0,10)&&last.value===value))points.push(point);
  const previous=latestJustTcg(item);const marketLink=item.marketLink?{...item.marketLink,lastRefresh:date}:{provider:'JustTCG',query:[item.identity?.brand,item.name,item.identity?.series,cardNumber(item)].filter(Boolean).join(' '),linkedAt:previous?.date||date,lastRefresh:date};return {...item,currentValue:value,updatedAt:date,identity:{...(item.identity||{}),justtcgId:String(card.uuid||card.id||''),justtcgVariantId:String(variant.uuid||variant.id||''),...(card.tcgplayerId?{tcgplayerId:String(card.tcgplayerId)}:{}),...(card.scryfallId?{scryfallId:String(card.scryfallId)}:{})},marketLink,customFields:{...item.customFields,'Market source':'JustTCG','Market updated':date,'Market match confidence':Math.round(confidence*100)+'%'},priceHistory:points.slice(-3000)};
}
function updateHistory(store:Store){const values:Record<string,number>={};for(const c of store.collections)values[c.id]=store.items.filter(i=>i.collectionId===c.id&&i.status==='owned').reduce((sum,i)=>sum+i.currentValue*i.quantity,0);const date=new Date().toISOString(),day=date.slice(0,10),history=[...(store.history||[])];if(history.at(-1)?.date.slice(0,10)===day)history[history.length-1]={date,values};else history.push({date,values});return {...store,history:history.slice(-1500)}}
async function supabase(url:string,key:string,path:string,init:RequestInit={}){const r=await fetch(url+path,{...init,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store',signal:AbortSignal.timeout(30000)});const body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||body?.error||'Supabase request failed');return body}

async function refreshWorkspace(payload:Store,client:JustTcgClient){
  const candidates=payload.items.filter(item=>isTcgItem(item as RichMarketItem)&&Boolean(item.marketLink||latestJustTcg(item))&&stale(item));
  if(!candidates.length)return {store:payload,updated:0,review:0};
  const updates=new Map<string,Item>();let review=0;
  const directItems=candidates.filter(direct);
  for(const batch of chunks(directItems,20)){
    if(client.calls>=client.maxCalls)break;
    let cards:any[]=[];try{cards=await client.batch(batch as RichMarketItem[])}catch(err){if(String(err).includes('JUSTTCG_BUDGET_EXHAUSTED'))break;continue}
    for(const item of batch){const ranked=bestCard(cards,item as RichMarketItem);if(!ranked){review++;continue}const variant=chooseVariant(ranked.card,item as RichMarketItem);if(!variant){review++;continue}const next=withMarket(item,ranked.card,variant,matchConfidence(item,ranked.card,true));if(next===item)review++;else updates.set(item.id,next)}
  }
  const remaining=candidates.filter(item=>!updates.has(item.id)&&!direct(item));
  const groups=new Map<string,Item[]>();for(const item of remaining){const key=[item.identity?.brand||'',item.identity?.series||item.customFields?.Set||''].join('|');groups.set(key,[...(groups.get(key)||[]),item])}
  for(const group of groups.values()){
    if(client.calls>=client.maxCalls)break;
    let set:any=null,cards:any[]=[];try{set=await client.resolveSet(group[0] as RichMarketItem);if(!set){review+=group.length;continue}cards=await client.cardsForSet(set.id)}catch(err){if(String(err).includes('JUSTTCG_BUDGET_EXHAUSTED'))break;review+=group.length;continue}
    for(const item of group){const ranked=bestCard(cards,item as RichMarketItem);if(!ranked){review++;continue}const variant=chooseVariant(ranked.card,item as RichMarketItem);if(!variant){review++;continue}const confidence=matchConfidence(item,ranked.card,false),next=withMarket(item,ranked.card,variant,confidence);if(next===item)review++;else updates.set(item.id,next)}
  }
  if(!updates.size)return {store:payload,updated:0,review};
  const items=payload.items.map(item=>updates.get(item.id)||item);
  return {store:updateHistory({...payload,items}),updated:updates.size,review};
}

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const apiKey=process.env.JUSTTCG_API_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!apiKey||!url||!serviceKey)return NextResponse.json({ok:false,error:'Automatic market refresh is not fully configured.',missing:{JUSTTCG_API_KEY:!apiKey,SUPABASE_URL:!url,SUPABASE_SERVICE_ROLE_KEY:!serviceKey}},{status:503});
  const rows=await supabase(url,serviceKey,'/rest/v1/collector_workspaces?select=user_id,payload,revision&order=updated_at.asc&limit=5');
  let updated=0,review=0,workspaces=0,calls=0;
  for(const row of Array.isArray(rows)?rows:[]){
    if(!validStore(row.payload))continue;
    const client=new JustTcgClient(apiKey,MAX_JUSTTCG_CALLS,JUSTTCG_MIN_INTERVAL_MS);
    const result=await refreshWorkspace(row.payload,client);calls+=client.calls;review+=result.review;if(!result.updated)continue;
    const nextRevision=Number(row.revision)+1;
    const path='/rest/v1/collector_workspaces?'+new URLSearchParams({user_id:'eq.'+String(row.user_id),revision:'eq.'+String(row.revision)});
    await supabase(url,serviceKey,path,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({payload:result.store,revision:nextRevision,updated_at:new Date().toISOString()})});
    updated+=result.updated;workspaces++;
    break;
  }
  return NextResponse.json({ok:true,updated,needsReview:review,workspaces,justTcgCalls:calls,ranAt:new Date().toISOString()});
}

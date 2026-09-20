import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
function clean(v:unknown){return typeof v==='string'?v.trim():''}
export async function POST(req:NextRequest){
  const secret=process.env.CRON_SECRET;if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  const url=(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL||'').replace(/\/$/,''),key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({ok:false,error:'Drop storage is not configured.'},{status:503});
  let events:any[]=[];try{const body=await req.json();events=Array.isArray(body.events)?body.events.slice(0,200):[];}catch{return NextResponse.json({ok:false,error:'Invalid payload.'},{status:400})}
  const rows=events.map(e=>({provider:clean(e.provider)||'External feed',retailer:clean(e.retailer),external_id:clean(e.externalId||e.external_id),product_name:clean(e.productName||e.product_name),image_url:clean(e.imageUrl||e.image_url),product_url:clean(e.productUrl||e.product_url),price:Number.isFinite(Number(e.price))?Number(e.price):null,msrp:Number.isFinite(Number(e.msrp))?Number(e.msrp):null,currency:'USD',stock_status:clean(e.stockStatus||e.stock_status)||'IN_STOCK',niche_tags:Array.isArray(e.nicheTags||e.niche_tags)?(e.nicheTags||e.niche_tags).map(clean).filter(Boolean).slice(0,20):[],metadata:e.metadata&&typeof e.metadata==='object'?e.metadata:{},last_seen:new Date().toISOString()})).filter(x=>x.retailer&&x.external_id&&x.product_name&&/^https?:\/\//.test(x.product_url));
  if(!rows.length)return NextResponse.json({ok:true,upserted:0});
  const r=await fetch(url+'/rest/v1/collector_drop_events?on_conflict=retailer,external_id',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows),cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok){const e=await r.json().catch(()=>({}));return NextResponse.json({ok:false,error:e.message||'Drop ingest failed.'},{status:502})}
  return NextResponse.json({ok:true,upserted:rows.length});
}

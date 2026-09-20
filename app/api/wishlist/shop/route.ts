import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';
export const maxDuration=60;

type WishItem={id:string;name:string;image?:string;identity?:{upc?:string;sku?:string;modelNumber?:string;brand?:string;series?:string;collectorNumber?:string}};
type Listing={provider:string;retailer:string;title:string;price:number;shipping:number|null;total:number;url:string;image:string;condition:string;seller:string;confidence:number;source:'live'|'drop'};

function sameOrigin(req:NextRequest){const origin=req.headers.get('origin');if(!origin)return true;try{return new URL(origin).host===req.headers.get('host')}catch{return false}}
function clean(v:unknown){return typeof v==='string'?v.trim():''}
function norm(v:unknown){return clean(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function words(v:unknown){return norm(v).split(' ').filter(x=>x.length>1&&!['the','a','an','and','or','of','for','with','from','by','to','in','on','at','new','sealed','figure','card','cards','collectible'].includes(x))}
function overlap(a:unknown,b:unknown){const aa=[...new Set(words(a))],bb=new Set(words(b));if(!aa.length)return 0;return aa.filter(x=>bb.has(x)).length/aa.length}
function queryFor(item:WishItem){return [item.identity?.brand,item.name,item.identity?.series,item.identity?.collectorNumber,item.identity?.modelNumber,item.identity?.sku].filter(Boolean).join(' ').replace(/\s+/g,' ').trim().slice(0,180)}
function score(item:WishItem,title:string){let s=overlap(item.name,title)*.7;const full=norm(title),id=item.identity||{};for(const exact of [id.modelNumber,id.sku,id.collectorNumber].filter(Boolean) as string[])if(full.includes(norm(exact)))s+=.18;if(id.brand&&full.includes(norm(id.brand)))s+=.08;if(id.series)s+=Math.min(.08,overlap(id.series,title)*.08);return Math.min(1,s)}
function searchLinks(item:WishItem){const q=queryFor(item)||item.name;return [
  {retailer:'eBay',url:'https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:q,LH_BIN:'1'}).toString()},
  {retailer:'Target',url:'https://www.target.com/s?'+new URLSearchParams({searchTerm:q}).toString()},
  {retailer:'Walmart',url:'https://www.walmart.com/search?'+new URLSearchParams({q}).toString()},
  {retailer:'Google Shopping',url:'https://www.google.com/search?'+new URLSearchParams({tbm:'shop',q}).toString()}
]}
let ebayToken:{value:string;expires:number}|null=null;
async function getEbayToken(){
  const id=process.env.EBAY_CLIENT_ID,secret=process.env.EBAY_CLIENT_SECRET;if(!id||!secret)return null;
  if(ebayToken&&ebayToken.expires>Date.now()+60000)return ebayToken.value;
  const body=new URLSearchParams({grant_type:'client_credentials',scope:'https://api.ebay.com/oauth/api_scope'});
  const r=await fetch('https://api.ebay.com/identity/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!r.ok)return null;const j=await r.json();if(!j.access_token)return null;ebayToken={value:String(j.access_token),expires:Date.now()+Number(j.expires_in||7200)*1000};return ebayToken.value;
}
async function ebayListings(item:WishItem,token:string):Promise<Listing[]>{
  const p=new URLSearchParams({limit:'20',sort:'price'});const upc=clean(item.identity?.upc);if(/^\d{8,14}$/.test(upc))p.set('gtin',upc);else p.set('q',queryFor(item)||item.name);p.set('filter','buyingOptions:{FIXED_PRICE},deliveryCountry:US');
  const r=await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search?'+p,{headers:{Authorization:'Bearer '+token,'X-EBAY-C-MARKETPLACE-ID':'EBAY_US'},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)return [];
  const j=await r.json();const rows=Array.isArray(j.itemSummaries)?j.itemSummaries:[];const out:Listing[]=[];
  for(const x of rows){const price=Number(x.price?.value);if(!Number.isFinite(price)||price<=0)continue;const shippingRaw=x.shippingOptions?.[0]?.shippingCost?.value,shipping=shippingRaw===undefined?null:Number(shippingRaw),total=price+(Number.isFinite(shipping as number)?Number(shipping):0),confidence=/^\d{8,14}$/.test(upc)?.98:score(item,String(x.title||''));if(confidence<.55)continue;out.push({provider:'eBay Browse API',retailer:'eBay',title:String(x.title||item.name),price,shipping:Number.isFinite(shipping as number)?Number(shipping):null,total,url:String(x.itemWebUrl||''),image:String(x.image?.imageUrl||''),condition:String(x.condition||''),seller:String(x.seller?.username||''),confidence,source:'live'})}
  return out.sort((a,b)=>a.total-b.total).slice(0,8);
}
async function dropRows(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return [] as any[];try{const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/collector_drop_events?select=*&stock_status=eq.IN_STOCK&order=last_seen.desc&limit=250',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});return r.ok?await r.json():[]}catch{return []}}
function matchingDrops(item:WishItem,rows:any[]):Listing[]{const upc=clean(item.identity?.upc);return rows.map(x=>{const meta=x.metadata||{};let confidence=score(item,String(x.product_name||''));const identifiers=[meta.upc,meta.gtin,meta.sku,meta.model_number].map(clean).filter(Boolean);if(upc&&identifiers.includes(upc))confidence=.99;const price=Number(x.price);return {row:x,confidence,price}}).filter(x=>x.confidence>=.62&&Number.isFinite(x.price)&&x.price>0).map(({row,confidence,price})=>({provider:String(row.provider||'Retail drop feed'),retailer:String(row.retailer||'Retailer'),title:String(row.product_name||item.name),price,shipping:null,total:price,url:String(row.product_url||''),image:String(row.image_url||''),condition:'New',seller:String(row.retailer||''),confidence,source:'drop' as const})).sort((a,b)=>a.total-b.total).slice(0,8)}

export async function POST(req:NextRequest){
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
  let items:WishItem[]=[];try{const body=await req.json();items=Array.isArray(body.items)?body.items.slice(0,40):[];if(!items.every(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.length<=220))throw new Error()}catch{return NextResponse.json({error:'Invalid wishlist.'},{status:400})}
  const [token,drops]=await Promise.all([getEbayToken(),dropRows()]);
  const results=[] as any[];
  for(let i=0;i<items.length;i++){
    const item=items[i];let live:Listing[]=[];if(token&&i<15){try{live=await ebayListings(item,token)}catch{}}
    const merged=[...matchingDrops(item,drops),...live];const unique=new Map<string,Listing>();for(const row of merged){const k=row.url||`${row.retailer}:${row.title}:${row.total}`;if(!unique.has(k))unique.set(k,row)}
    results.push({itemId:item.id,itemName:item.name,itemImage:item.image||'',checkedAt:new Date().toISOString(),liveConfigured:!!token||drops.length>0,listings:[...unique.values()].sort((a,b)=>a.total-b.total).slice(0,8),searchLinks:searchLinks(item)});
  }
  return NextResponse.json({checkedAt:new Date().toISOString(),providers:{ebayBrowse:!!token,retailDropFeed:drops.length>0},results},{headers:{'Cache-Control':'no-store'}});
}

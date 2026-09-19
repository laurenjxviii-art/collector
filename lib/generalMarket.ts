import {Comparable,MarketItem,PackagingState,packagingLabel,variantKey} from './market';

export type GeneralMarketItem=MarketItem&{id?:string;category?:string;customFields?:Record<string,string>};
export type SoldMetrics={count:number;average:number;median:number;min:number;max:number;latestDate:string;method:'average-last-10'};
export type GeneralQuote={
  productId:string;name:string;series:string;upc:string;value:number;tier:string;exactGrade:boolean;match:string;confidence:number;source:string;url:string;fetchedAt:string;warning:string;searchQuery?:string;
  identifiers?:Record<string,string|undefined>;metrics?:SoldMetrics;comparables?:Comparable[];
};

type SoldRow={id:string;title:string;price:number;shipping:number;date:string;condition:string;url:string;searchTerm?:string};

const STOP=new Set(['the','a','an','and','or','of','for','with','from','by','to','in','on','at','figure','figures','collectible','collectibles','toy','toys','official','authentic','new']);
const BAD=['lot of','bundle','custom','replacement','repro','reproduction','empty box','box only','manual only','case only','stand only','parts only','damaged only'];
const APIFY_ACTOR='caffein.dev~ebay-sold-listings';
const PARSE_EBAY='caa8e1ad-f5a8-41c1-9bd2-54a8e19b6c35';
const PARSE_HOBBYDB='841c19fd-5b55-4c29-8dc9-75b5fac1669d';

function clean(v:unknown){return typeof v==='string'?v.trim():''}
export function generalNorm(v:unknown){return clean(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9#]+/g,' ').replace(/\s+/g,' ').trim()}
function moneyNumber(v:unknown){if(typeof v==='number')return Number.isFinite(v)?v:NaN;const s=clean(v).replace(/,/g,'');const m=s.match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function dateOnly(v:unknown){const s=clean(v);if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const d=Date.parse(s);return Number.isFinite(d)?new Date(d).toISOString().slice(0,10):''}
function words(v:unknown){return generalNorm(v).split(' ').filter(x=>x.length>1&&!STOP.has(x))}
function uniq<T>(a:T[]){return [...new Set(a)]}
function overlapRatio(a:unknown,b:unknown){const aa=uniq(words(a)),bb=new Set(words(b));if(!aa.length)return 0;return aa.filter(x=>bb.has(x)).length/aa.length}
function issueNumbers(item:GeneralMarketItem){const src=[item.name,item.identity?.modelNumber,item.identity?.sku].filter(Boolean).join(' ');const out=[...src.matchAll(/#\s*(\d+[a-z]?)/gi)].map(m=>m[1].toLowerCase());return uniq(out)}
export function isGeneralCollectible(item:GeneralMarketItem){return item.identity?.marketCategory!=='cards'}
export function isFunkoItem(item:GeneralMarketItem){return /\bfunko\b|\bpop!?(?:\s|$)/i.test([item.name,item.category,item.identity?.brand,item.identity?.series].filter(Boolean).join(' '))}

function inferredPackaging(item:GeneralMarketItem):PackagingState|undefined{
  if(item.packagingState)return item.packagingState;
  const c=generalNorm(item.condition);
  if(/sealed|new in box|nib|mint on card|moc|unopened/.test(c))return 'sealed';
  if(/complete in box|cib|with box|opened with box/.test(c))return 'opened-box';
  if(/loose|without box|no box/.test(c))return 'loose';
  return undefined;
}
function listingPackaging(row:SoldRow):PackagingState|undefined{
  const title=generalNorm(row.title),condition=generalNorm(row.condition),s=title+' '+condition;
  if(/\bloose\b|no box|without box|figure only|complete figure/.test(title))return 'loose';
  if(/opened|open box|with box|original box|complete in box|\bcib\b|boxed/.test(title)||/open box|new other/.test(condition))return 'opened-box';
  if(/\bsealed\b|factory sealed|unopened|new in box|\bnib\b|mint on card|\bmoc\b|brand new/.test(s)||condition==='new')return 'sealed';
  return undefined;
}
function packagingCompatible(wanted:PackagingState|undefined,got:PackagingState|undefined){
  if(!wanted||!got)return true;
  return wanted===got;
}

export function generalMarketQuery(item:GeneralMarketItem){
  if(item.marketLink?.query?.trim())return item.marketLink.query.trim().slice(0,160);
  const i=item.identity||{},parts:string[]=[];
  const brand=clean(i.brand),name=clean(item.name),category=generalNorm(item.category),franchise=generalNorm(item.customFields?.Franchise);
  if(brand)parts.push(brand);
  if(/hasbro/i.test(brand)&&/figure/.test(category)&&(franchise.includes('marvel')||/spider|avenger|marvel|x men|deadpool|wolverine/i.test(name+' '+clean(i.series))))parts.push('Marvel Legends');
  if(name)parts.push(name);
  const seen=new Set<string>();const out:string[]=[];
  for(const part of parts){const n=generalNorm(part);if(!n||seen.has(n))continue;seen.add(n);out.push(part)}
  return out.join(' ').slice(0,160);
}
function generalMarketQueries(item:GeneralMarketItem){
  const i=item.identity||{},base=generalMarketQuery(item),out:string[]=[];
  const add=(q:string)=>{q=q.trim().replace(/\s+/g,' ').slice(0,160);if(q&&!out.some(x=>generalNorm(x)===generalNorm(q)))out.push(q)};
  add(base);
  const model=clean(i.modelNumber||i.sku);if(model&&model.length<=32&&!/^\d{8,14}$/.test(model))add([base,model].filter(Boolean).join(' '));
  const packaging=inferredPackaging(item);if(packaging==='sealed')add(base+' sealed');else if(packaging==='opened-box')add(base+' with box');else if(packaging==='loose')add(base+' loose');
  const upc=clean(i.upc);if(/^\d{8,14}$/.test(upc))add(upc);
  const series=clean(i.series);if(series)add([clean(i.brand),item.name,series].filter(Boolean).join(' '));
  return out.slice(0,4);
}

function listingScore(item:GeneralMarketItem,row:SoldRow){
  const title=generalNorm(row.title),name=generalNorm(item.name),i=item.identity||{};
  if(!title||!Number.isFinite(row.price)||row.price<=0)return -1;
  for(const bad of BAD)if(title.includes(bad)&&!name.includes(bad))return -1;
  const wantedPackaging=inferredPackaging(item),gotPackaging=listingPackaging(row);
  if(wantedPackaging&&gotPackaging&&!packagingCompatible(wantedPackaging,gotPackaging))return -1;
  const issues=issueNumbers(item);for(const issue of issues){const re=new RegExp(`(?:#\\s*)?${issue.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\b|$)`,'i');if(!re.test(row.title))return -1}
  let score=overlapRatio(item.name,row.title)*0.62;
  const brand=clean(i.brand);if(brand&&generalNorm(row.title).includes(generalNorm(brand)))score+=0.09;
  const series=clean(i.series);if(series)score+=Math.min(.08,overlapRatio(series,row.title)*.08);
  const model=clean(i.modelNumber||i.sku);if(model&&generalNorm(row.title).includes(generalNorm(model)))score+=.18;
  const upc=clean(i.upc);if(upc&&row.title.replace(/\D/g,'').includes(upc.replace(/\D/g,'')))score+=.2;
  if(wantedPackaging){if(gotPackaging===wantedPackaging)score+=.1;else if(!gotPackaging)score-=.02}
  const nameWords=words(item.name);if(nameWords.length<=2&&generalNorm(row.title).includes(name))score+=.12;
  return Math.max(0,Math.min(1,score));
}
function median(values:number[]){const v=[...values].sort((a,b)=>a-b),m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2}
function removePriceOutliers(rows:{row:SoldRow;score:number}[]){if(rows.length<5)return rows;const vals=rows.map(x=>x.row.price+x.row.shipping).sort((a,b)=>a-b);const q=(p:number)=>vals[Math.min(vals.length-1,Math.max(0,Math.floor((vals.length-1)*p)))];const q1=q(.25),q3=q(.75),iqr=q3-q1;if(iqr<=0)return rows;const lo=Math.max(0,q1-1.5*iqr),hi=q3+1.5*iqr;const kept=rows.filter(x=>{const v=x.row.price+x.row.shipping;return v>=lo&&v<=hi});return kept.length>=3?kept:rows}

export function analyzeSoldRows(item:GeneralMarketItem,rows:SoldRow[],source:string,searchQuery=generalMarketQuery(item)):GeneralQuote|null{
  const scored=rows.map(row=>({row,score:listingScore(item,row)})).filter(x=>x.score>=.42).sort((a,b)=>b.row.date.localeCompare(a.row.date));
  const cleaned=removePriceOutliers(scored).slice(0,10);if(cleaned.length<1)return null;
  const values=cleaned.map(x=>x.row.price+x.row.shipping),avg=values.reduce((a,b)=>a+b,0)/values.length,med=median(values),min=Math.min(...values),max=Math.max(...values);
  const avgScore=cleaned.reduce((n,x)=>n+x.score,0)/cleaned.length;const i=item.identity||{};const identifier=Boolean(i.upc||i.modelNumber||i.sku),wantedPackaging=inferredPackaging(item);
  let confidence=Math.min(.98,.68+avgScore*.2+Math.min(.08,cleaned.length*.012)+(identifier ? .05 : 0)+(wantedPackaging ? .03 : 0));if(cleaned.length===1)confidence=Math.min(confidence,.8);else if(cleaned.length<4)confidence=Math.min(confidence,.88);
  const comparables:Comparable[]=cleaned.map(({row})=>({id:row.id||crypto.randomUUID(),date:row.date,price:row.price,shipping:row.shipping,currency:'USD',variant:variantKey(item),source,url:row.url,title:row.title}));
  const latest=cleaned[0]?.row.date||'',packageText=wantedPackaging?` · ${packagingLabel(wantedPackaging)}`:'';
  return {productId:'',name:item.name,series:i.series||'',upc:i.upc||'',value:Math.round(avg*100)/100,tier:`${cleaned.length} recent sold comps · average${packageText}`,exactGrade:!item.grading?.graded,match:identifier&&confidence>=.92?'identifier':'description',confidence,source,url:'https://www.ebay.com/sch/i.html?'+new URLSearchParams({_nkw:searchQuery,LH_Sold:'1',LH_Complete:'1'}),fetchedAt:new Date().toISOString(),searchQuery,warning:'Value is the average of up to 10 recent matching eBay sold prices after product, packaging-state and outlier filtering. Listings with a clearly different sealed/boxed/loose state are rejected.',metrics:{count:cleaned.length,average:Math.round(avg*100)/100,median:Math.round(med*100)/100,min:Math.round(min*100)/100,max:Math.round(max*100)/100,latestDate:latest,method:'average-last-10'},comparables};
}

function apifyRows(raw:any[]):Map<string,SoldRow[]>{
  const by=new Map<string,SoldRow[]>();let current='';
  for(const row of raw){
    if(row?.rowType==='summary'){current=clean(row.searchTerm);continue}
    const isOld=row?.rowType==='listing',isNew=!row?.rowType&&(row?.itemId||row?.soldPrice||row?.endedAt||row?.price);if(!isOld&&!isNew)continue;
    const q=clean(row.searchTerm)||clean(row.keyword)||clean(row.query)||current;if(!q)continue;
    const price=moneyNumber(row.soldPrice??row.price),shipRaw=moneyNumber(row.shippingPrice??row.shippingCost??row.shipping),shipping=Number.isFinite(shipRaw)&&shipRaw>=0?shipRaw:0;
    const date=dateOnly(row.soldDate??row.endedAt??row.date),url=clean(row.url??row.itemUrl);
    if(!Number.isFinite(price)||price<=0||!date||!/^https?:\/\//.test(url))continue;
    const list=by.get(q)||[];list.push({id:clean(row.listingId)||clean(row.itemId)||url,title:clean(row.title),price,shipping,date,condition:clean(row.condition),url,searchTerm:q});by.set(q,list);
  }
  return by;
}
function apifyInput(queries:string[],maxResultsPerQuery:number){
  const actor=process.env.APIFY_EBAY_ACTOR||APIFY_ACTOR;
  if(actor.includes('caffein.dev'))return {actor,input:{keywords:queries.slice(0,6),categoryId:'0',daysToScrape:60,count:Math.max(12,maxResultsPerQuery),ebaySite:'ebay.com',sortOrder:'endedRecently',itemCondition:'any',includeCompletedListings:true}};
  return {actor,input:{searchTerms:queries,domain:'ebay.com',maxResultsPerQuery,conditionFilter:'any',buyingFormat:'any',includeListingRows:true,proxyConfiguration:{useApifyProxy:true}}};
}
export async function apifySoldBatch(items:GeneralMarketItem[],token:string,maxResultsPerQuery=12){
  const pairs=items.map(item=>({item,primary:generalMarketQuery(item),queries:generalMarketQueries(item)})).filter(x=>x.primary&&x.queries.length);
  if(!pairs.length)return new Map<string,GeneralQuote>();const out=new Map<string,GeneralQuote>();
  for(const pair of pairs){
    const {actor,input}=apifyInput(pair.queries,maxResultsPerQuery);
    const r=await fetch(`https://api.apify.com/v2/actors/${actor}/run-sync-get-dataset-items`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(input),cache:'no-store',signal:AbortSignal.timeout(55000)});
    const j=await r.json().catch(()=>null);if(!r.ok||!Array.isArray(j))throw new Error('Apify eBay sold lookup failed.');const rows=apifyRows(j);
    const quotes=pair.queries.map(q=>analyzeSoldRows(pair.item,rows.get(q)||[],'eBay sold · Apify',q)).filter(Boolean) as GeneralQuote[];
    quotes.sort((a,b)=>b.confidence-a.confidence||(b.metrics?.count||0)-(a.metrics?.count||0));if(quotes[0])out.set(pair.primary,quotes[0]);
  }
  return out;
}
export async function startApifySoldRun(items:GeneralMarketItem[],token:string,maxResultsPerQuery=12){
  const pairs=items.slice(0,6).map(item=>({item,query:generalMarketQuery(item)})).filter(x=>x.query);const searchTerms=uniq(pairs.map(x=>x.query));if(!searchTerms.length)return null;
  const {actor,input}=apifyInput(searchTerms,maxResultsPerQuery);
  const r=await fetch(`https://api.apify.com/v2/actors/${actor}/runs`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(input),cache:'no-store',signal:AbortSignal.timeout(15000)});const j=await r.json().catch(()=>null);if(!r.ok||!j?.data?.id)throw new Error('Unable to start Apify eBay sold run.');return {runId:String(j.data.id),queries:Object.fromEntries(pairs.map(x=>[String(x.item.id||x.item.name),x.query]))};
}
export async function getApifyRun(token:string,runId:string){const r=await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(15000)});const j=await r.json().catch(()=>null);if(!r.ok||!j?.data)throw new Error('Unable to read Apify run.');return j.data as {status:string;defaultDatasetId?:string}}
export async function getApifyDataset(token:string,datasetId:string){const r=await fetch(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});const j=await r.json().catch(()=>null);if(!r.ok||!Array.isArray(j))throw new Error('Unable to read Apify sold results.');return apifyRows(j)}

function parseListings(j:any):any[]{const candidates=[j?.data?.listings,j?.listings,j?.data?.data?.listings,j?.data?.items,j?.items];return candidates.find(Array.isArray)||[]}
export async function lookupParseEbaySold(item:GeneralMarketItem,apiKey:string){
  const query=generalMarketQuery(item);if(!query)return null;const id=process.env.PARSE_EBAY_API_ID||PARSE_EBAY;const u=`https://api.parse.bot/scraper/${id}/get_completed_sold_listings?`+new URLSearchParams({query,page:'1'});const r=await fetch(u,{headers:{'X-API-Key':apiKey},cache:'no-store',signal:AbortSignal.timeout(20000)});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error('Parse eBay sold lookup failed.');const rows:SoldRow[]=parseListings(j).map((x:any)=>{const price=moneyNumber(x.price),shipping=moneyNumber(x.shipping);return{id:clean(x.item_id)||clean(x.id)||clean(x.url),title:clean(x.title),price,shipping:Number.isFinite(shipping)&&shipping>=0&&shipping<price*2?shipping:0,date:dateOnly(x.date_sold||x.sold_date||x.date),condition:clean(x.condition),url:clean(x.url),searchTerm:query}}).filter((x:SoldRow)=>Number.isFinite(x.price)&&x.price>0&&x.date&&/^https?:\/\//.test(x.url));return analyzeSoldRows(item,rows,'eBay sold · Parse',query);
}

function hobbyItems(j:any):any[]{const candidates=[j?.data?.items,j?.items,j?.data?.data?.items];return candidates.find(Array.isArray)||[]}
function hobbyScore(item:GeneralMarketItem,x:any){let score=overlapRatio(item.name,x?.name)*.72;const ref=clean(x?.ref_number),model=clean(item.identity?.modelNumber||item.identity?.sku);if(ref&&model&&generalNorm(ref)===generalNorm(model))score+=.24;const series=(Array.isArray(x?.series)?x.series.join(' '):clean(x?.series));if(series&&item.identity?.series)score+=overlapRatio(item.identity.series,series)*.08;return Math.min(1,score)}
export async function lookupParseHobbyDb(item:GeneralMarketItem,apiKey:string):Promise<GeneralQuote|null>{
  if(!isFunkoItem(item))return null;const id=process.env.PARSE_HOBBYDB_API_ID||PARSE_HOBBYDB;const query=item.marketLink?.query||item.name;const u=`https://api.parse.bot/scraper/${id}/search_funko_items?`+new URLSearchParams({page:'1',query,per_page:'20'});const r=await fetch(u,{headers:{'X-API-Key':apiKey},cache:'no-store',signal:AbortSignal.timeout(20000)});const j=await r.json().catch(()=>null);if(!r.ok)throw new Error('Parse hobbyDB lookup failed.');const ranked=hobbyItems(j).map((x:any)=>({x,score:hobbyScore(item,x)})).sort((a:any,b:any)=>b.score-a.score);const best=ranked[0];if(!best||best.score<.55)return null;const value=moneyNumber(best.x.estimated_value);if(!Number.isFinite(value)||value<=0)return null;const hid=clean(best.x.id);return {productId:hid,name:clean(best.x.name)||item.name,series:Array.isArray(best.x.series)?best.x.series.join(', '):clean(best.x.series),upc:item.identity?.upc||'',value,tier:'hobbyDB estimated market value',exactGrade:!item.grading?.graded,match:best.score>=.9?'identifier':'description',confidence:Math.min(.97,.72+best.score*.25),source:'hobbyDB · Parse',url:'https://www.hobbydb.com',fetchedAt:new Date().toISOString(),searchQuery:query,warning:'hobbyDB provides a current catalog estimate, not a completed-sales feed. Collector uses this as a fallback/cross-check when stronger sold comps are unavailable.',identifiers:hid?{hobbydbId:hid}:{}};
}

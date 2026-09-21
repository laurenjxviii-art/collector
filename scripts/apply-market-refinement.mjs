import fs from 'node:fs';

const ROOT = process.cwd();
const MARKER = 'collector-market-refinement-v1';

function read(path){ return fs.readFileSync(`${ROOT}/${path}`,'utf8'); }
function write(path,content){ fs.writeFileSync(`${ROOT}/${path}`,content); }
function patch(path, fn){
  const before=read(path);
  if(before.includes(MARKER)){
    console.log(`[market-refinement] ${path}: already patched`);
    return;
  }
  const after=fn(before);
  if(after===before){
    console.warn(`[market-refinement] ${path}: no matching source pattern; leaving unchanged`);
    return;
  }
  write(path,after);
  console.log(`[market-refinement] ${path}: patched`);
}
function replaceRequired(source, search, replacement, label){
  if(!source.includes(search)){
    console.warn(`[market-refinement] skipped ${label}: source pattern not found`);
    return source;
  }
  return source.replace(search,replacement);
}

patch('lib/market.ts', source => {
  const marketBlock = `/* ${MARKER} */\ntype SearchableMarketItem=MarketItem&{category?:string;customFields?:Record<string,string>};\nfunction searchClean(v:unknown){return typeof v==='string'?v.trim():''}\nfunction searchNorm(v:unknown){return searchClean(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim()}\nfunction searchEscape(v:string){return v.replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g,'\\\\$&')}\nfunction addSearchPart(out:string[],seen:Set<string>,value:unknown){const s=searchClean(value).replace(/[\\[\\]–—]+/g,' ').replace(/\\s+/g,' ').trim();const n=searchNorm(s);if(!n||seen.has(n))return;seen.add(n);out.push(s)}\nexport function soldListingsQuery(item:SearchableMarketItem){\n  const override=searchClean(item.customFields?.['Market Search Override']);if(override)return override.slice(0,160);\n  const i=item.identity||{},out:string[]=[],seen=new Set<string>(),series=searchClean(i.series),sport=searchClean(item.customFields?.Sport);\n  const sports=Boolean(sport)||/(?:basketball|football|baseball|hockey|soccer)\\s+cards/i.test(series);\n  if(sports){\n    const parsedYear=(series.match(/\\b(?:19|20)\\d{2}\\b/)||[])[0]||'';const year=searchClean(i.year)||parsedYear;\n    let core=series.replace(/^(?:basketball|football|baseball|hockey|soccer)\\s+cards\\s*/i,'').trim();\n    if(year)core=core.replace(new RegExp('^'+searchEscape(year)+'\\\\s+','i'),'');\n    const brand=searchClean(i.brand);if(brand)core=core.replace(new RegExp('^'+searchEscape(brand)+'\\\\s+','i'),'');\n    addSearchPart(out,seen,year);addSearchPart(out,seen,brand);addSearchPart(out,seen,core);\n    const number=searchClean(i.collectorNumber||item.customFields?.['Card #']);let name=searchClean(item.name).replace(/\\[[^\\]]+\\]/g,' ');\n    if(number)name=name.replace(new RegExp('\\\\s*#\\\\s*'+searchEscape(number)+'\\\\s*$','i'),'').trim();\n    addSearchPart(out,seen,name);addSearchPart(out,seen,number);addSearchPart(out,seen,i.edition);\n    return out.join(' ').replace(/\\s+/g,' ').trim().slice(0,160);\n  }\n  if(i.marketCategory==='cards'){\n    addSearchPart(out,seen,i.brand);addSearchPart(out,seen,i.series);addSearchPart(out,seen,item.name);addSearchPart(out,seen,i.collectorNumber);addSearchPart(out,seen,i.edition);\n    if(item.grading?.graded)addSearchPart(out,seen,\`\${item.grading.company} \${item.grading.grade} \${item.grading.designation}\`);\n    return out.join(' ').slice(0,160);\n  }\n  if(i.marketCategory==='comics'){\n    addSearchPart(out,seen,i.brand);addSearchPart(out,seen,i.series);addSearchPart(out,seen,item.name);addSearchPart(out,seen,i.collectorNumber);addSearchPart(out,seen,i.edition);addSearchPart(out,seen,i.year);\n    if(item.grading?.graded)addSearchPart(out,seen,\`\${item.grading.company} \${item.grading.grade} \${item.grading.designation}\`);\n    return out.join(' ').slice(0,160);\n  }\n  const brand=searchClean(i.brand),name=searchClean(item.name),seriesNorm=searchNorm(i.series),categoryNorm=searchNorm(item.category);\n  addSearchPart(out,seen,brand);\n  if(/hasbro/i.test(brand)&&(/marvel|spider|avenger|x men|deadpool|wolverine/.test(searchNorm(name)+' '+seriesNorm)||categoryNorm.includes('action figure')))addSearchPart(out,seen,'Marvel Legends');\n  addSearchPart(out,seen,name);addSearchPart(out,seen,i.modelNumber||i.sku);\n  if(out.length<3)addSearchPart(out,seen,i.series);\n  return out.join(' ').slice(0,160);\n}\nexport function marketQuery(item:SearchableMarketItem){return soldListingsQuery(item)}`;
  return source.replace(/export function marketQuery\(item:MarketItem\)\{[^\n]*\}/,()=>marketBlock);
});

patch('lib/justtcg.ts', source => {
  const replacement=`/* ${MARKER} */\nexport function isTcgItem(item:RichMarketItem){const text=[item.category,item.identity?.brand,item.identity?.series].filter(Boolean).join(' '),sport=norm(item.customFields?.Sport),series=norm(item.identity?.series);if(/basketball|football|baseball|hockey|soccer|wnba|nba|nfl|mlb|nhl/.test(sport+' '+series))return false;return /magic(?: the gathering)?|pokemon|pokémon|union arena|yu-gi-oh|lorcana|one piece(?: card game)?|digimon(?: card game)?|\\btcg\\b/i.test(text)}`;
  return source.replace(/export function isTcgItem\(item:RichMarketItem\)\{[^\n]*\}/,replacement);
});

patch('lib/generalMarket.ts', source => {
  source=replaceRequired(source,
    "import {Comparable,MarketItem,PackagingState,packagingLabel,variantKey} from './market';",
    "import {Comparable,MarketItem,PackagingState,packagingLabel,soldListingsQuery,variantKey} from './market';\n/* "+MARKER+" */",
    'general market import');
  source=source.replace(
    /function issueNumbers\(item:GeneralMarketItem\)\{[^\n]*\}/,
    "function issueNumbers(item:GeneralMarketItem){const src=[item.name,item.identity?.collectorNumber,item.identity?.modelNumber,item.identity?.sku].filter(Boolean).join(' ');const out=[...src.matchAll(/#\\s*([a-z0-9-]+)/gi)].map(m=>m[1].toLowerCase());return uniq(out)}"
  );
  source=source.replace(
    /export function isGeneralCollectible\(item:GeneralMarketItem\)\{[^\n]*\}/,
    "export function isSportsCard(item:GeneralMarketItem){const s=generalNorm([item.customFields?.Sport,item.identity?.series,item.category].filter(Boolean).join(' '));return /basketball|football|baseball|hockey|soccer|wnba|nba|nfl|mlb|nhl/.test(s)}\nexport function isGeneralCollectible(item:GeneralMarketItem){return item.identity?.marketCategory!=='cards'||isSportsCard(item)}"
  );
  source=source.replace(
    /export function generalMarketQuery\(item:GeneralMarketItem\)\{[\s\S]*?\n\}\nfunction generalMarketQueries/,
    "export function generalMarketQuery(item:GeneralMarketItem){return soldListingsQuery(item)}\nfunction generalMarketQueries"
  );
  const scoreAnchor="  const series=clean(i.series);if(series)score+=Math.min(.08,overlapRatio(series,row.title)*.08);";
  const scoreAdd=`${scoreAnchor}\n  const collector=clean(i.collectorNumber||item.customFields?.['Card #']);if(collector){const hit=generalNorm(row.title).includes(generalNorm(collector));score+=hit ? .16 : (isSportsCard(item)?-.06:0)}\n  const edition=clean(i.edition);if(edition){const ov=overlapRatio(edition,row.title);score+=Math.min(.16,ov*.16);if(isSportsCard(item)&&words(edition).length>=2&&ov===0)score-=.08}\n  const year=clean(i.year)||(isSportsCard(item)?((clean(i.series).match(/\\b(?:19|20)\\d{2}\\b/)||[])[0]||''):'');if(year&&generalNorm(row.title).includes(year))score+=.04;`;
  source=replaceRequired(source,scoreAnchor,scoreAdd,'sports sold-listing score');
  return source;
});

patch('app/api/market/route.ts', source => {
  source=source.replace(
    "identifiers:{pricechartingId:String(product.id)}})",
    "identifiers:{pricechartingId:String(product.id),...(product.upc?{upc:String(product.upc)}:{})}})"
  );
  return `/* ${MARKER} */\n`+source;
});

patch('app/DesktopCollector.tsx', source => {
  source=replaceRequired(source,
    "Layers3,Minus,PenLine,Plus,Search,Share2,ShoppingBag,SlidersHorizontal,Star,Upload,X",
    "Layers3,Minus,PenLine,Plus,RefreshCw,Search,Share2,ShoppingBag,SlidersHorizontal,Star,Upload,X",
    'RefreshCw import');
  source=source.replace(
    /function itemChange\(item:Item\)\{[^\n]*\}/,
    "function itemChange(item:Item){const paid=Number(item.purchasePrice)||0,current=Number(item.currentValue)||0;if(paid<=0)return{delta:0,pct:0};const delta=current-paid;return{delta,pct:delta/paid*100}}"
  );
  const fmt="function fmtChange(delta:number,pct:number){const s=delta>=0?'+':'';return `${s}${money(delta)} (${s}${pct.toFixed(2)}%)`}";
  const helpers=`${fmt}\n/* ${MARKER} */\nfunction refineKnownIdentity(item:Item){const identity:any={...(item.identity||{})},cf:any={...(item.customFields||{})};const first=(...keys:string[])=>keys.map(k=>String(cf[k]||'').trim()).find(Boolean)||'';if(!identity.collectorNumber){const named=String(item.name||'').match(/#\\s*([A-Za-z0-9-]+)/);identity.collectorNumber=first('Card #','Collector #','Number','number')||(named?.[1]||'')}if(!identity.upc)identity.upc=first('UPC','GTIN','Barcode');if(!identity.sku)identity.sku=first('SKU');if(!identity.modelNumber)identity.modelNumber=first('Model Number','Model #');const sports=/basketball|football|baseball|hockey|soccer|wnba|nba|nfl|mlb|nhl/i.test([cf.Sport,identity.series,item.category].filter(Boolean).join(' '));if(sports&&!identity.year){const y=String(identity.series||'').match(/\\b(?:19|20)\\d{2}\\b/);if(y)identity.year=y[0]}return{...item,identity:Object.fromEntries(Object.entries(identity).filter(([,v])=>String(v||'').trim()!=='')) as any}}\nfunction applyMarketResult(item:Item,j:any){const base=refineKnownIdentity(item),value=Number(j?.value);if(!Number.isFinite(value)||value<=0)return null;const confidence=Number(j?.confidence),source=String(j?.source||'Market'),soldCount=Number(j?.metrics?.count||0);if(Number.isFinite(confidence)&&confidence<.90)return null;if(source.startsWith('eBay sold')&&soldCount>0&&soldCount<2)return null;const date=nowIso(),identity:any={...(base.identity||{})},conflicts:string[]=[];if((!Number.isFinite(confidence)||confidence>=.90)&&j?.identifiers&&typeof j.identifiers==='object'){for(const [k,v] of Object.entries(j.identifiers)){const nv=String(v||'').trim();if(!nv)continue;const old=String(identity[k]||'').trim();if(!old)identity[k]=nv;else if(old.toLowerCase()!==nv.toLowerCase())conflicts.push(k)}}if(!identity.series&&j?.series&&(!Number.isFinite(confidence)||confidence>=.90))identity.series=String(j.series);if(!identity.upc&&j?.upc&&(!Number.isFinite(confidence)||confidence>=.94))identity.upc=String(j.upc);const incoming=Array.isArray(j?.comparables)?j.comparables:[],comparables=Array.from(new Map([...(base.comparables||[]),...incoming].map((c:any)=>[c.id||c.url,c])).values()).slice(-200) as any[];const query=String(j?.searchQuery||marketQuery({...base,identity} as any));const metrics=j?.metrics,customFields:any={...(base.customFields||{}),'Market source':source,'Market updated':date,'Market checked':date,'Market search':query,'Market matched product':String(j?.name||base.name),'Market matched series':String(j?.series||identity.series||'')};if(Number.isFinite(confidence))customFields['Market match confidence']=Math.round(confidence*100)+'%';if(metrics){customFields['Sold comps']=String(metrics.count);customFields['Sold comp average']=String(metrics.average);customFields['Sold comp median']=String(metrics.median);customFields['Sold comp range']=\`\${metrics.min}–\${metrics.max}\`}if(conflicts.length)customFields['Identifier review']='Provider disagrees with saved '+conflicts.join(', ');else delete customFields['Identifier review'];const point={date,value,variant:variantKey(base),source,url:String(j?.url||''),kind:'provider' as const};return{...base,currentValue:value,updatedAt:date,identity,marketLink:{provider:source,query,linkedAt:base.marketLink?.linkedAt||date,lastRefresh:date},comparables,customFields,priceHistory:[...(base.priceHistory||[]),point].slice(-3000)}}\nfunction markMarketReview(item:Item,message:string){const base=refineKnownIdentity(item),date=nowIso();return{...base,updatedAt:date,customFields:{...(base.customFields||{}),'Market checked':date,'Market review':message}}}`;
  source=replaceRequired(source,fmt,helpers,'market result helpers');

  const portfolioState="  const [q,setQ]=useState(''),[sort,setSort]=useState(sortOptions[1]),[selectMode,setSelectMode]=useState(false),[selected,setSelected]=useState<string[]>([]),[customize,setCustomize]=useState(false),input=useRef<HTMLInputElement|null>(null);";
  const portfolioStateNew="  const [q,setQ]=useState(''),[sort,setSort]=useState(sortOptions[1]),[selectMode,setSelectMode]=useState(false),[selected,setSelected]=useState<string[]>([]),[customize,setCustomize]=useState(false),[refreshing,setRefreshing]=useState(false),[refreshDone,setRefreshDone]=useState(0),[refreshTotal,setRefreshTotal]=useState(0),input=useRef<HTMLInputElement|null>(null);";
  source=replaceRequired(source,portfolioState,portfolioStateNew,'portfolio refresh state');

  const shareLine="  const share=async()=>{const text=`My Collector portfolio is ${money(value)} across ${items.length} products.`;if(navigator.share)await navigator.share({title:'My Collector Portfolio',text,url:location.href}).catch(()=>{});else{await navigator.clipboard?.writeText(`${text} ${location.href}`);notify('Share link copied')}};";
  const refreshBlock=`${shareLine}\n  const refreshAll=async()=>{if(refreshing)return;const initial=data.items.map(refineKnownIdentity),byId=new Map(initial.map(i=>[i.id,i] as const)),targets=items.map(i=>byId.get(i.id)!).filter(Boolean);let updated=0,review=0;setRefreshing(true);setRefreshDone(0);setRefreshTotal(targets.length);notify('Refreshing all market values — keep this tab open');for(let index=0;index<targets.length;index++){const current=byId.get(targets[index].id)!;try{const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:current})}),j=await r.json();if(!r.ok)throw new Error(j?.error||'No market match');const next=applyMarketResult(current,j);if(next){byId.set(current.id,next);updated++}else{byId.set(current.id,markMarketReview(current,'Match below 90% confidence or insufficient sold comps'));review++}}catch(e){byId.set(current.id,markMarketReview(current,e instanceof Error?e.message:'Market lookup unavailable'));review++}setRefreshDone(index+1);if(index<targets.length-1)await new Promise(r=>setTimeout(r,120))}update({...data,items:initial.map(i=>byId.get(i.id)||i)});setRefreshing(false);notify(\`Market refresh finished: \${updated} updated, \${review} need review\`)};`;
  source=replaceRequired(source,shareLine,refreshBlock,'refresh all action');

  const importButton="<button onClick={()=>input.current?.click()}><FileUp/>Import</button>";
  const refreshButton="<button onClick={()=>input.current?.click()}><FileUp/>Import</button><button disabled={refreshing} onClick={refreshAll} title=\"Checks every owned product, refines high-confidence identifiers, and only applies matches at 90%+ confidence\"><RefreshCw/>{refreshing?`Refreshing ${refreshDone}/${refreshTotal}`:'Refresh All Values'}</button>";
  source=replaceRequired(source,importButton,refreshButton,'refresh all button');

  source=source.replace('Show market change on cards','Show gain/loss vs. price paid');

  source=source.replace(
    /  const market=async\(\)=>\{setBusy\(true\);setMessage\(''\);try\{const r=await fetch\('\/api\/market',[^\n]*?finally\{setBusy\(false\)\}\};/,
    "  const market=async()=>{setBusy(true);setMessage('');try{const r=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:refineKnownIdentity(item)})}),j=await r.json();if(!r.ok)throw new Error(j.error||'Market lookup unavailable');const next=applyMarketResult(item,j);if(!next){setMessage('Match needs review — Collector did not overwrite the saved value.');return}update({...data,items:data.items.map(i=>i.id===item.id?next:i)});setMessage(`${j.source||'Market'} · ${money(next.currentValue)} · ${Number.isFinite(Number(j.confidence))?Math.round(Number(j.confidence)*100)+'% match':'verified match'}`);notify('Market value and identifiers updated')}catch(e){setMessage(e instanceof Error?e.message:'Market lookup unavailable')}finally{setBusy(false)}};"
  );
  return source;
});

console.log('[market-refinement] complete');

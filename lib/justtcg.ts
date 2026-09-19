import {MarketItem} from './market';

export type RichMarketItem=MarketItem&{category?:string;customFields?:Record<string,string>};
export type JustTcgVariant={id?:string;uuid?:string;condition?:string;printing?:string;language?:string;price?:number;lastUpdated?:number};
export type JustTcgCard={id?:string;uuid?:string;name?:string;game?:string;set?:string;set_name?:string;number?:string;tcgplayerId?:string|null;scryfallId?:string|null;variants?:JustTcgVariant[]};
type JustTcgSet={id:string;name:string;game:string};

const BASE='https://api.justtcg.com/v1';

function clean(v:unknown){return typeof v==='string'?v.trim():''}
export function norm(v:unknown){return clean(v).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim()}
function words(v:unknown){return new Set(norm(v).split(' ').filter(x=>x.length>1))}
function overlap(a:unknown,b:unknown){const aa=words(a),bb=words(b);let n=0;for(const x of aa)if(bb.has(x))n++;return n}
function gameHint(item:RichMarketItem){const brand=norm(item.identity?.brand||item.category);if(brand.includes('magic'))return'magic-the-gathering';if(brand.includes('union arena'))return'union-arena';if(brand.includes('pokemon'))return'pokemon';if(brand.includes('yu gi oh'))return'yu-gi-oh';if(brand.includes('lorcana'))return'disney-lorcana';if(brand.includes('one piece'))return'one-piece-card-game';if(brand.includes('digimon'))return'digimon-card-game';return''}
export function isTcgItem(item:RichMarketItem){return item.identity?.marketCategory==='cards'||/card|tcg|magic|pokemon|union arena|yu-gi-oh|lorcana|one piece|digimon/i.test([item.category,item.identity?.brand].filter(Boolean).join(' '))}
function targetCondition(item:RichMarketItem){const c=norm(item.condition);if(c.includes('near mint')||c==='nm')return'near mint';if(c.includes('lightly')||c==='lp')return'lightly played';if(c.includes('moderately')||c==='mp')return'moderately played';if(c.includes('heavily')||c==='hp')return'heavily played';if(c.includes('damaged')||c==='dmg')return'damaged';return c}
function targetPrinting(item:RichMarketItem){return norm(item.identity?.edition||item.customFields?.Finish)}
function variantScore(v:JustTcgVariant,item:RichMarketItem){let score=0;const condition=targetCondition(item),printing=targetPrinting(item),vc=norm(v.condition),vp=norm(v.printing);if(condition&&vc===condition)score+=6;else if(!condition)score+=1;if(printing){if(vp===printing)score+=6;else if(printing.includes('foil')&&vp.includes('foil'))score+=4;else if(!printing.includes('foil')&&!vp.includes('foil'))score+=3}else if(!vp.includes('foil'))score+=2;const lang=norm(item.identity?.language);if(lang&&norm(v.language||'english')===lang)score+=2;const price=Number(v.price);if(Number.isFinite(price)&&price>0)score+=2;return score}
export function chooseVariant(card:JustTcgCard,item:RichMarketItem){return [...(card.variants||[])].filter(v=>Number.isFinite(Number(v.price))&&Number(v.price)>0).sort((a,b)=>variantScore(b,item)-variantScore(a,item))[0]||null}
function cardScore(card:JustTcgCard,item:RichMarketItem){const i=item.identity||{};let score=0;const cn=clean(i.collectorNumber||item.customFields?.['Card #']);if(norm(card.name)===norm(item.name))score+=8;else score+=Math.min(4,overlap(card.name,item.name));if(cn&&clean(card.number)===cn)score+=8;if(i.tcgplayerId&&clean(card.tcgplayerId)===clean(i.tcgplayerId))score+=12;if(i.scryfallId&&clean(card.scryfallId)===clean(i.scryfallId))score+=12;if(i.justtcgId&&[clean(card.uuid),clean(card.id)].includes(clean(i.justtcgId)))score+=15;if(i.justtcgVariantId&&(card.variants||[]).some(v=>[clean(v.uuid),clean(v.id)].includes(clean(i.justtcgVariantId))))score+=18;const series=clean(i.series||item.customFields?.Set);if(series)score+=Math.min(5,overlap(card.set_name,series));return score}
export function bestCard(cards:JustTcgCard[],item:RichMarketItem){const ranked=cards.map(card=>({card,score:cardScore(card,item)})).sort((a,b)=>b.score-a.score);return ranked[0]||null}

export class JustTcgClient{
  calls=0;
  private last=0;
  constructor(public apiKey:string,public maxCalls=Infinity,public minIntervalMs=0){}
  private async wait(){const ms=this.minIntervalMs-(Date.now()-this.last);if(ms>0)await new Promise(r=>setTimeout(r,ms))}
  async request(path:string,init:RequestInit={}){
    if(this.calls>=this.maxCalls)throw new Error('JUSTTCG_BUDGET_EXHAUSTED');
    await this.wait();
    this.calls++;
    const r=await fetch(BASE+path,{...init,headers:{'x-api-key':this.apiKey,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store',signal:AbortSignal.timeout(20000)});
    this.last=Date.now();
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(String(j?.error||j?.message||('JustTCG request failed ('+r.status+')')));
    return j;
  }
  async resolveSet(item:RichMarketItem){
    const series=clean(item.identity?.series||item.customFields?.Set);
    if(!series)return null;
    const j=await this.request('/sets?'+new URLSearchParams({q:series}));
    const sets=(Array.isArray(j.data)?j.data:[]) as JustTcgSet[];
    const game=gameHint(item);
    return sets.map(set=>{let score=overlap(set.name,series)*3;if(norm(set.name)===norm(series))score+=12;if(game&&norm(set.game)===norm(game))score+=10;return{set,score}}).sort((a,b)=>b.score-a.score)[0]?.set||null;
  }
  async cardsForSet(setId:string){
    const cards:JustTcgCard[]=[];let offset=0;let hasMore=true;
    while(hasMore){
      const j=await this.request('/cards?'+new URLSearchParams({set:setId,limit:'20',offset:String(offset),include_price_history:'false',include_statistics:'false',include_null_prices:'true'}));
      const page=(Array.isArray(j.data)?j.data:[]) as JustTcgCard[];cards.push(...page);
      hasMore=Boolean(j.meta?.hasMore)&&page.length>0;offset+=page.length||20;
    }
    return cards;
  }
  async batch(items:RichMarketItem[]){
    const lookups=items.map(item=>{const i=item.identity||{};const query:Record<string,string>={};if(i.justtcgVariantId)query.variantId=i.justtcgVariantId;else if(i.tcgplayerId)query.tcgplayerId=i.tcgplayerId;else if(i.scryfallId)query.scryfallId=i.scryfallId;else if(i.justtcgId)query.cardId=i.justtcgId;return query});
    const j=await this.request('/cards',{method:'POST',body:JSON.stringify(lookups)});
    return (Array.isArray(j.data)?j.data:[]) as JustTcgCard[];
  }
}

export async function lookupJustTcg(item:RichMarketItem,apiKey:string){
  if(!isTcgItem(item))return null;
  const client=new JustTcgClient(apiKey,4,0);
  const i=item.identity||{};
  let cards:JustTcgCard[]=[];
  if(i.justtcgVariantId||i.justtcgId||i.tcgplayerId||i.scryfallId){
    cards=await client.batch([item]);
  }else{
    const set=await client.resolveSet(item);
    if(!set)return null;
    const cn=clean(i.collectorNumber||item.customFields?.['Card #']);
    const params:Record<string,string>={set:set.id,limit:'20',include_price_history:'false',include_statistics:'false'};
    if(cn)params.number=cn;else params.q=item.name;
    const j=await client.request('/cards?'+new URLSearchParams(params));
    cards=Array.isArray(j.data)?j.data:[];
  }
  const ranked=bestCard(cards,item);if(!ranked)return null;
  const variant=chooseVariant(ranked.card,item);if(!variant)return null;
  const direct=Boolean(i.justtcgVariantId||i.justtcgId||i.tcgplayerId||i.scryfallId);
  const cn=clean(i.collectorNumber||item.customFields?.['Card #']);
  const numberMatch=Boolean(cn&&clean(ranked.card.number)===cn);
  const nameMatch=norm(ranked.card.name)===norm(item.name);
  const confidence=direct?.99:numberMatch&&nameMatch?.98:numberMatch?.94:nameMatch?.9:.75;
  return {card:ranked.card,variant,confidence};
}

export function justTcgQuote(match:{card:JustTcgCard;variant:JustTcgVariant;confidence:number},item:RichMarketItem){
  const {card,variant,confidence}=match;
  return {
    productId:String(card.uuid||card.id||''),
    name:String(card.name||item.name),
    series:String(card.set_name||item.identity?.series||''),
    upc:'',
    value:Number(variant.price),
    tier:[variant.condition,variant.printing].filter(Boolean).join(' · ')||'Card market price',
    exactGrade:!item.grading?.graded,
    match:confidence>=.94?'identifier':'description',
    confidence,
    source:'JustTCG',
    url:'https://justtcg.com',
    fetchedAt:new Date().toISOString(),
    warning:'JustTCG is a current TCG market-price source. It is not a list of the last 10 individual completed sales.',
    searchQuery:[item.identity?.brand,item.name,item.identity?.series,item.identity?.collectorNumber].filter(Boolean).join(' '),
    identifiers:{
      justtcgId:String(card.uuid||card.id||''),
      justtcgVariantId:String(variant.uuid||variant.id||''),
      tcgplayerId:clean(card.tcgplayerId)||undefined,
      scryfallId:clean(card.scryfallId)||undefined
    }
  };
}

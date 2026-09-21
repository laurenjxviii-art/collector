import {DEMO_PRODUCTS} from './demo';
import type {
  LocalInventoryProvider,MarketDataProvider,MarketSummary,MarketplaceProvider,NormalizedProduct,
  ProductSearchProvider,RetailInventoryProvider
} from './types';

function norm(value:string){
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function digits(value:string){return value.replace(/\D/g,'')}
function levenshtein(a:string,b:string){
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  const prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let left=i,diag=i-1;
    for(let j=1;j<=b.length;j++){
      const up=prev[j];
      const next=Math.min(up+1,left+1,diag+(a[i-1]===b[j-1]?0:1));
      prev[j-1]=left;diag=up;left=next;
    }
    prev[b.length]=left;
  }
  return prev[b.length];
}
function fuzzyScore(query:string,value:string){
  const q=norm(query),v=norm(value);
  if(!q||!v)return 0;
  if(q===v)return 1;
  if(v.includes(q))return .94;
  const qTokens=q.split(' '),vTokens=new Set(v.split(' '));
  const overlap=qTokens.filter(t=>vTokens.has(t)).length/Math.max(1,qTokens.length);
  const distance=levenshtein(q,v);
  const edit=1-distance/Math.max(q.length,v.length,1);
  return Math.max(0,Math.min(.9,overlap*.68+edit*.32));
}

export function rankProducts(query:string,products=DEMO_PRODUCTS){
  const q=query.trim();
  if(!q)return products;
  const qDigits=digits(q);
  return products.map(product=>{
    const exactUpc=product.upc&&qDigits.length>=8&&digits(product.upc)===qDigits;
    const exactSku=product.sku&&norm(product.sku)===norm(q);
    const exactModel=product.modelNumber&&norm(product.modelNumber)===norm(q);
    const exactCanonical=norm(product.canonicalName)===norm(q);
    const exactAlias=product.aliases.some(alias=>norm(alias)===norm(q));
    const corpus=[
      product.canonicalName,...product.aliases,product.manufacturer,product.brand,product.line,
      product.franchise,product.character,product.sku||'',product.upc||'',product.modelNumber||''
    ].filter(Boolean);
    let score=Math.max(...corpus.map(v=>fuzzyScore(q,v)));
    if(exactUpc)score=10;
    else if(exactSku)score=9;
    else if(exactModel)score=8;
    else if(exactCanonical)score=7;
    else if(exactAlias)score=6;
    return {product,score,exact:Boolean(exactUpc||exactSku||exactModel||exactCanonical||exactAlias)};
  }).filter(row=>row.score>.24).sort((a,b)=>b.score-a.score);
}

export const demoCatalogProvider:ProductSearchProvider={
  id:'demo-catalog',label:'VEXUM Demo Catalog',status:'demo',
  async search(query){return rankProducts(query).map(row=>row.product)},
  async lookupByUpc(upc){return DEMO_PRODUCTS.find(p=>p.upc&&digits(p.upc)===digits(upc))||null},
  async lookupBySku(sku){return DEMO_PRODUCTS.find(p=>p.sku&&norm(p.sku)===norm(sku))||null}
};

const unavailableMarket:MarketDataProvider={
  id:'market-live',label:'Live Market Providers',status:'unavailable',
  async getSummary():Promise<MarketSummary>{return {confidence:'unavailable',providerStatus:'unavailable'}},
  async getSales(){return []}
};
const unavailableMarketplace:MarketplaceProvider={
  id:'marketplace-live',label:'Marketplace Providers',status:'unavailable',async getListings(){return []}
};
const unavailableRetail:RetailInventoryProvider={
  id:'retail-live',label:'Retail Inventory Providers',status:'unavailable',async getOffers(){return []}
};
const unavailableLocal:LocalInventoryProvider={
  id:'local-live',label:'Local Inventory Providers',status:'unavailable',async getAvailability(){return []}
};

export const searchProviders={catalog:[demoCatalogProvider]};
export const marketProviders={market:[unavailableMarket],marketplace:[unavailableMarketplace],retail:[unavailableRetail],local:[unavailableLocal]};

export async function resolveSearch(query:string):Promise<NormalizedProduct[]>{
  for(const provider of searchProviders.catalog){
    if(provider.status==='unavailable')continue;
    const exactDigits=digits(query);
    if(exactDigits.length>=8&&provider.lookupByUpc){
      const exact=await provider.lookupByUpc(query);
      if(exact)return [exact];
    }
    if(provider.lookupBySku){
      const exact=await provider.lookupBySku(query);
      if(exact)return [exact];
    }
  }
  const chunks=await Promise.all(searchProviders.catalog.filter(p=>p.status!=='unavailable').map(p=>p.search(query)));
  const seen=new Set<string>();
  return chunks.flat().filter(product=>seen.has(product.id)?false:(seen.add(product.id),true));
}

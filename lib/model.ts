import {Identity,Grading,PricePoint,Comparable,MarketLink,PackagingState,variantKey} from './market';
export type Status = 'owned' | 'wishlist' | 'sold';
export type Collection = {id:string; name:string; icon:string; color:string; logo?:string; coverMode?:'full'|'layered'; coverImage?:string; coverLogo?:string; libraryType?:string; libraryLine?:string};
export type LibraryGroup = {name?:string; color?:string; coverMode?:'full'|'layered'; coverImage?:string; coverLogo?:string};
export type Item = {identity?:Identity; grading?:Grading; priceHistory?:PricePoint[]; comparables?:Comparable[]; marketLink?:MarketLink; packagingState?:PackagingState; id:string; collectionId:string; name:string; category:string; status:Status; purchasePrice:number; currentValue:number; quantity:number; image:string; condition:string; purchaseDate:string; location:string; notes:string; customFields:Record<string,string>; createdAt:string; updatedAt:string};
export type ValueSnapshot = {date:string; values:Record<string,number>};
export type Preferences={accentColor:string;density:'comfortable'|'compact';cardSize:'standard'|'large';reducedMotion:boolean};
export type Store = {version:1; collections:Collection[]; items:Item[]; libraryGroups?:Record<string,LibraryGroup>; profile?:{name:string; image:string}; preferences?:Preferences; history?:ValueSnapshot[]};
export const money = (n:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);

export function libraryTypeGroupKey(type:string){return `type::${type}`}
export function libraryLineGroupKey(type:string,line:string){return `line::${type}::${line}`}

function norm(v:unknown){return String(v||'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim()}
function combined(item:Item,collection?:Collection){return norm([item.name,item.category,item.identity?.brand,item.identity?.series,item.identity?.description,collection?.name,Object.values(item.customFields||{}).join(' ')].filter(Boolean).join(' '))}
export function itemLibraryType(item:Item,collection?:Collection){
  if(collection?.libraryType?.trim())return collection.libraryType.trim();
  const s=combined(item,collection),category=norm(item.category),market=item.identity?.marketCategory;
  if(market==='cards'||/\b(card|cards|tcg|trading card)\b/.test(category)||/magic|union arena|pokemon|pokémon|topps|panini|upper deck/.test(s))return 'Trading Cards';
  if(/funko|vinyl|sonny angel|pop mart|skullpanda|hirono|crybaby/.test(s))return 'Designer & Vinyl Figures';
  if(/\b(action figure|premium figure|figure|figures|statue|statues)\b/.test(category)||/marvel legends|zd toys|mafex|s h figuarts|shfiguarts|blockees/.test(s))return 'Action Figures';
  if(market==='comics'||/\bcomic|comics\b/.test(category)||/\bcomic|comics\b/.test(norm(collection?.name)))return 'Comics';
  if(/lego|model kit|model kits|gunpla/.test(s))return 'LEGO & Models';
  if(/skateboard|deck/.test(category+' '+norm(collection?.name)))return 'Skateboards';
  if(/art|decor|poster|print|plaque|frame/.test(category+' '+norm(collection?.name)))return 'Art & Decor';
  if(market==='games'||/video game|game console/.test(category))return 'Games';
  return 'Other Collectibles';
}
export function itemLibraryLine(item:Item,collection?:Collection){
  if(collection?.libraryLine?.trim())return collection.libraryLine.trim();
  const type=itemLibraryType(item,collection),s=combined(item,collection),brand=(item.identity?.brand||item.customFields?.Brand||'').trim();
  if(type==='Trading Cards'){
    if(/magic the gathering|\bmagic\b/.test(s))return 'Magic: The Gathering';
    if(/union arena/.test(s))return 'Union Arena';
    if(/pok[eé]mon/.test(s))return 'Pokémon';
    if(/topps|panini|upper deck|football|basketball|baseball|hockey/.test(s))return 'Sports Cards';
    return brand||'Other Trading Cards';
  }
  if(type==='Action Figures'){
    if(/zd toys/.test(s)||/^zd toys$/i.test(brand))return 'ZD Toys';
    if(/marvel legends/.test(s)||(/hasbro/i.test(brand)&&/marvel|spider man|avenger|x men|deadpool|wolverine/.test(s)))return 'Marvel Legends';
    if(/mafex/.test(s))return 'MAFEX';
    if(/s h figuarts|shfiguarts/.test(s))return 'S.H.Figuarts';
    if(/blockees/.test(s))return 'Blockees';
    return brand||'Other Action Figures';
  }
  if(type==='Comics'){
    if(/marvel/.test(s))return 'Marvel';
    if(/dc comics|\bdc\b/.test(s))return 'DC';
    return brand||'Other Comics';
  }
  if(type==='LEGO & Models'){
    if(/lego/.test(s))return 'LEGO';
    return brand||'Model Kits';
  }
  if(type==='Designer & Vinyl Figures'){
    if(/funko/.test(s))return 'Funko';
    if(/pop mart|skullpanda|hirono|crybaby/.test(s))return 'Pop Mart';
    if(/sonny angel/.test(s))return 'Sonny Angel';
    return brand||'Other Designer Figures';
  }
  if(type==='Skateboards')return brand||'Skateboard Decks';
  if(type==='Art & Decor')return brand||'Art & Decor';
  return brand||collection?.name||'Other';
}
export function collectionSetLabel(collection:Collection,line:string){
  let name=collection.name.trim();
  name=name.replace(/^Magic\s*[—-]\s*/i,'').replace(/^Union Arena\s*[—-]\s*/i,'');
  if(norm(name)===norm(line)||/^(marvel )?figures$/i.test(name))return '';
  return name;
}

export function recordValue(data:Store):Store {const values:Record<string,number>={};for(const c of data.collections)values[c.id]=data.items.filter(i=>i.collectionId===c.id&&i.status==='owned').reduce((sum,i)=>sum+i.currentValue*i.quantity,0);const date=new Date().toISOString();const day=date.slice(0,10);const history=[...(data.history||[])];const last=history.at(-1);if(last?.date.slice(0,10)===day){history[history.length-1]={date,values}}else history.push({date,values});const items=data.items.map(item=>{const variant=variantKey(item);const points=item.priceHistory||[];const latest=points.filter(p=>p.variant===variant&&p.kind!=='sale').at(-1);if(latest&&latest.date.slice(0,10)===day&&latest.value===item.currentValue)return item;return {...item,priceHistory:[...points,{date,value:item.currentValue,variant,source:'Manually entered',url:'',kind:'manual' as const}].slice(-3000)}});return {...data,items,history:history.slice(-1500)}}
export function widgetSnapshot(data:Store,collectionId?:string) {const items=data.items.filter(i=>i.status==='owned'&&(!collectionId||i.collectionId===collectionId));return {updatedAt:new Date().toISOString(),itemCount:items.reduce((n,i)=>n+i.quantity,0),totalValue:items.reduce((n,i)=>n+i.currentValue*i.quantity,0),recent:items.toSorted((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,4),mostValuable:items.toSorted((a,b)=>b.currentValue-a.currentValue).slice(0,4)};}
export function validStore(value:unknown):value is Store {if(!value||typeof value!=='object')return false;const s=value as Store;return (!s.profile||(typeof s.profile.name==='string'&&typeof s.profile.image==='string'))&&(!s.preferences||(typeof s.preferences.accentColor==='string'&&/^#[0-9a-f]{6}$/i.test(s.preferences.accentColor)&&['comfortable','compact'].includes(s.preferences.density)&&['standard','large'].includes(s.preferences.cardSize)&&typeof s.preferences.reducedMotion==='boolean'))&&(!s.libraryGroups||(typeof s.libraryGroups==='object'&&!Array.isArray(s.libraryGroups)&&Object.values(s.libraryGroups).every(g=>g&&typeof g==='object'&&!Array.isArray(g)&&(g.name===undefined||typeof g.name==='string')&&(g.color===undefined||typeof g.color==='string')&&(g.coverMode===undefined||['full','layered'].includes(g.coverMode))&&(g.coverImage===undefined||typeof g.coverImage==='string')&&(g.coverLogo===undefined||typeof g.coverLogo==='string'))))&&(!s.history||(Array.isArray(s.history)&&s.history.every(h=>h&&typeof h.date==='string'&&Number.isFinite(Date.parse(h.date))&&!!h.values&&typeof h.values==='object'&&!Array.isArray(h.values)&&Object.values(h.values).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))))&&s.version===1&&Array.isArray(s.collections)&&Array.isArray(s.items)&&s.collections.every(c=>c&&typeof c.id==='string'&&typeof c.name==='string'&&typeof c.icon==='string'&&typeof c.color==='string'&&(c.logo===undefined||typeof c.logo==='string')&&(c.coverMode===undefined||['full','layered'].includes(c.coverMode))&&(c.coverImage===undefined||typeof c.coverImage==='string')&&(c.coverLogo===undefined||typeof c.coverLogo==='string')&&(c.libraryType===undefined||typeof c.libraryType==='string')&&(c.libraryLine===undefined||typeof c.libraryLine==='string'))&&new Set(s.collections.map(c=>c.id)).size===s.collections.length&&s.items.every(i=>i&&validMarketFields(i)&&typeof i.id==='string'&&typeof i.name==='string'&&s.collections.some(c=>c.id===i.collectionId)&&['owned','wishlist','sold'].includes(i.status)&&[i.purchasePrice,i.currentValue,i.quantity].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)&&Number.isInteger(i.quantity)&&i.quantity>=1&&['image','category','condition','purchaseDate','location','notes','createdAt','updatedAt'].every(k=>typeof (i as unknown as Record<string,unknown>)[k]==='string')&&(!i.packagingState||['sealed','opened-box','loose'].includes(i.packagingState))&&!!i.customFields&&typeof i.customFields==='object'&&!Array.isArray(i.customFields)&&Object.values(i.customFields).every(v=>typeof v==='string'))&&new Set(s.items.map(i=>i.id)).size===s.items.length;}

function validMarketFields(item:Item){return (!item.identity||(typeof item.identity==='object'&&!Array.isArray(item.identity)&&Object.values(item.identity).every(v=>typeof v==='string')&&(!item.identity.marketCategory||['other','cards','comics','games'].includes(item.identity.marketCategory))))&&(!item.grading||(typeof item.grading.graded==='boolean'&&['company','grade','certification','designation'].every(k=>typeof (item.grading as unknown as Record<string,unknown>)[k]==='string')))&&(!item.marketLink||(typeof item.marketLink.provider==='string'&&typeof item.marketLink.query==='string'&&typeof item.marketLink.linkedAt==='string'&&Number.isFinite(Date.parse(item.marketLink.linkedAt))&&(item.marketLink.lastRefresh===undefined||(typeof item.marketLink.lastRefresh==='string'&&Number.isFinite(Date.parse(item.marketLink.lastRefresh))))))&&(!item.priceHistory||(Array.isArray(item.priceHistory)&&item.priceHistory.every(p=>p&&Number.isFinite(Date.parse(p.date))&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&['variant','source','url'].every(k=>typeof (p as unknown as Record<string,unknown>)[k]==='string')&&['manual','provider','sale'].includes(p.kind))))&&(!item.comparables||(Array.isArray(item.comparables)&&item.comparables.every(c=>c&&typeof c.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.date)&&Number.isFinite(Date.parse(c.date))&&[c.price,c.shipping].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)&&c.currency==='USD'&&['variant','source','url','title'].every(k=>typeof (c as unknown as Record<string,unknown>)[k]==='string')&&/^https?:\/\//.test(c.url))))}

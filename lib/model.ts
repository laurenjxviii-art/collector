import {Identity,Grading,PricePoint,Comparable,MarketLink,PackagingState,variantKey} from './market';
import {WishlistPreferences,WishlistRecord,validWishlistState} from './wishlist';
import {FinancialData,validFinancialData} from './financial';
import {SetupData,validSetupData} from './setup';
import {HomeDashboardState,validHomeDashboard} from './home';
import {PortfolioDocument,PortfolioHistoryEvent,PortfolioItemMedia,PortfolioPreferences,PortfolioViewMode,PortfolioVisibility,validPortfolioPreferences} from './portfolio';
export type Status = 'owned' | 'wishlist' | 'sold';
export type Collection = {
  id:string;
  name:string;
  icon:string;
  color:string;
  logo?:string;
  coverMode?:'full'|'layered';
  coverImage?:string;
  coverLogo?:string;
  libraryType?:string;
  libraryLine?:string;
  parentCollectionId?:string;
  description?:string;
  measurable?:boolean;
  targetItemCount?:number;
  privacy?:PortfolioVisibility;
  customFieldTemplateId?:string;
  defaultView?:PortfolioViewMode;
  archivedAt?:string;
};
export type LibraryGroup = {name?:string; color?:string; coverMode?:'full'|'layered'; coverImage?:string; coverLogo?:string};
export type Item = {
  identity?:Identity;
  grading?:Grading;
  priceHistory?:PricePoint[];
  comparables?:Comparable[];
  marketLink?:MarketLink;
  packagingState?:PackagingState;
  id:string;
  productId?:string;
  collectionId:string;
  name:string;
  category:string;
  status:Status;
  purchasePrice:number;
  currentValue:number;
  quantity:number;
  image:string;
  condition:string;
  purchaseDate:string;
  location:string;
  notes:string;
  customFields:Record<string,string>;
  tags?:string[];
  favorite?:boolean;
  archivedAt?:string;
  media?:PortfolioItemMedia[];
  documents?:PortfolioDocument[];
  historyEvents?:PortfolioHistoryEvent[];
  createdAt:string;
  updatedAt:string;
};
export type ValueSnapshot = {date:string; values:Record<string,number>};
export type Preferences={accentColor:string;density:'comfortable'|'compact';cardSize:'standard'|'large';reducedMotion:boolean};
export type FinancialPreferences={monthlyHobbyBudget?:number};
export type Store = {
  version:1;
  collections:Collection[];
  items:Item[];
  libraryGroups?:Record<string,LibraryGroup>;
  profile?:{name:string; image:string};
  preferences?:Preferences;
  history?:ValueSnapshot[];
  wishlist?:Record<string,WishlistRecord>;
  wishlistPreferences?:WishlistPreferences;
  financialPreferences?:FinancialPreferences;
  financial?:FinancialData;
  setup?:SetupData;
  homeDashboard?:HomeDashboardState;
  portfolioPreferences?:PortfolioPreferences;
};
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
export function validStore(value:unknown):value is Store {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const s=value as Store;
  if(s.version!==1||!Array.isArray(s.collections)||!Array.isArray(s.items))return false;
  if(s.wishlist&&!validWishlistState(s.wishlist))return false;
  if(s.financial&&!validFinancialData(s.financial))return false;
  if(s.setup&&!validSetupData(s.setup))return false;
  if(s.homeDashboard&&!validHomeDashboard(s.homeDashboard))return false;
  if(s.portfolioPreferences&&!validPortfolioPreferences(s.portfolioPreferences))return false;
  if(s.wishlistPreferences&&(
    typeof s.wishlistPreferences!=='object'||Array.isArray(s.wishlistPreferences)||
    !['table','grid'].includes(s.wishlistPreferences.view)||typeof s.wishlistPreferences.sort!=='string'
  ))return false;
  if(s.financialPreferences&&(
    typeof s.financialPreferences!=='object'||Array.isArray(s.financialPreferences)||
    (s.financialPreferences.monthlyHobbyBudget!==undefined&&(
      typeof s.financialPreferences.monthlyHobbyBudget!=='number'||
      !Number.isFinite(s.financialPreferences.monthlyHobbyBudget)||
      s.financialPreferences.monthlyHobbyBudget<0
    ))
  ))return false;
  if(s.profile&&!(typeof s.profile.name==='string'&&typeof s.profile.image==='string'))return false;
  if(s.preferences&&!(
    typeof s.preferences.accentColor==='string'&&/^#[0-9a-f]{6}$/i.test(s.preferences.accentColor)&&
    ['comfortable','compact'].includes(s.preferences.density)&&
    ['standard','large'].includes(s.preferences.cardSize)&&typeof s.preferences.reducedMotion==='boolean'
  ))return false;
  if(s.libraryGroups&&!(
    typeof s.libraryGroups==='object'&&!Array.isArray(s.libraryGroups)&&
    Object.values(s.libraryGroups).every(g=>g&&typeof g==='object'&&!Array.isArray(g)&&
      (g.name===undefined||typeof g.name==='string')&&(g.color===undefined||typeof g.color==='string')&&
      (g.coverMode===undefined||['full','layered'].includes(g.coverMode))&&
      (g.coverImage===undefined||typeof g.coverImage==='string')&&(g.coverLogo===undefined||typeof g.coverLogo==='string'))
  ))return false;
  if(s.history&&!(
    Array.isArray(s.history)&&s.history.every(h=>h&&typeof h.date==='string'&&Number.isFinite(Date.parse(h.date))&&
      !!h.values&&typeof h.values==='object'&&!Array.isArray(h.values)&&
      Object.values(h.values).every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0))
  ))return false;

  const collectionIds=new Set(s.collections.map(collection=>collection.id));
  if(collectionIds.size!==s.collections.length)return false;
  if(!s.collections.every(collection=>{
    if(!collection||typeof collection.id!=='string'||typeof collection.name!=='string'||typeof collection.icon!=='string'||typeof collection.color!=='string')return false;
    if(collection.logo!==undefined&&typeof collection.logo!=='string')return false;
    if(collection.coverMode!==undefined&&!['full','layered'].includes(collection.coverMode))return false;
    if(collection.coverImage!==undefined&&typeof collection.coverImage!=='string')return false;
    if(collection.coverLogo!==undefined&&typeof collection.coverLogo!=='string')return false;
    if(collection.libraryType!==undefined&&typeof collection.libraryType!=='string')return false;
    if(collection.libraryLine!==undefined&&typeof collection.libraryLine!=='string')return false;
    if(collection.parentCollectionId!==undefined&&(typeof collection.parentCollectionId!=='string'||!collectionIds.has(collection.parentCollectionId)||collection.parentCollectionId===collection.id))return false;
    if(collection.description!==undefined&&typeof collection.description!=='string')return false;
    if(collection.measurable!==undefined&&typeof collection.measurable!=='boolean')return false;
    if(collection.targetItemCount!==undefined&&!(typeof collection.targetItemCount==='number'&&Number.isFinite(collection.targetItemCount)&&collection.targetItemCount>=0))return false;
    if(collection.privacy!==undefined&&!['Private','Friends','Community','Public'].includes(collection.privacy))return false;
    if(collection.customFieldTemplateId!==undefined&&typeof collection.customFieldTemplateId!=='string')return false;
    if(collection.defaultView!==undefined&&!['grid','list','table','gallery','compact'].includes(collection.defaultView))return false;
    if(collection.archivedAt!==undefined&&typeof collection.archivedAt!=='string')return false;
    return true;
  }))return false;

  if(!s.items.every(item=>{
    if(!item||!validMarketFields(item)||typeof item.id!=='string'||typeof item.name!=='string')return false;
    if(item.productId!==undefined&&typeof item.productId!=='string')return false;
    if(item.collectionId!==''&&!collectionIds.has(item.collectionId))return false;
    if(!['owned','wishlist','sold'].includes(item.status))return false;
    if(![item.purchasePrice,item.currentValue,item.quantity].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)||!Number.isInteger(item.quantity)||item.quantity<1)return false;
    if(!['image','category','condition','purchaseDate','location','notes','createdAt','updatedAt'].every(key=>typeof (item as unknown as Record<string,unknown>)[key]==='string'))return false;
    if(item.packagingState&&!['sealed','opened-box','loose'].includes(item.packagingState))return false;
    if(!item.customFields||typeof item.customFields!=='object'||Array.isArray(item.customFields)||!Object.values(item.customFields).every(v=>typeof v==='string'))return false;
    if(item.tags!==undefined&&(!Array.isArray(item.tags)||!item.tags.every(tag=>typeof tag==='string')))return false;
    if(item.favorite!==undefined&&typeof item.favorite!=='boolean')return false;
    if(item.archivedAt!==undefined&&typeof item.archivedAt!=='string')return false;
    if(item.media!==undefined&&(!Array.isArray(item.media)||!item.media.every(media=>media&&typeof media.id==='string'&&['owned','condition','setup','defect','other'].includes(media.kind)&&typeof media.url==='string'&&typeof media.label==='string'&&typeof media.createdAt==='string')))return false;
    if(item.documents!==undefined&&(!Array.isArray(item.documents)||!item.documents.every(doc=>doc&&typeof doc.id==='string'&&typeof doc.kind==='string'&&typeof doc.name==='string'&&typeof doc.url==='string'&&typeof doc.createdAt==='string')))return false;
    if(item.historyEvents!==undefined&&(!Array.isArray(item.historyEvents)||!item.historyEvents.every(event=>event&&typeof event.id==='string'&&typeof event.at==='string'&&typeof event.type==='string'&&typeof event.label==='string'&&(event.detail===undefined||typeof event.detail==='string'))))return false;
    return true;
  }))return false;
  return new Set(s.items.map(item=>item.id)).size===s.items.length;
}

function validMarketFields(item:Item){return (!item.identity||(typeof item.identity==='object'&&!Array.isArray(item.identity)&&Object.values(item.identity).every(v=>typeof v==='string')&&(!item.identity.marketCategory||['other','cards','comics','games'].includes(item.identity.marketCategory))))&&(!item.grading||(typeof item.grading.graded==='boolean'&&['company','grade','certification','designation'].every(k=>typeof (item.grading as unknown as Record<string,unknown>)[k]==='string')))&&(!item.marketLink||(typeof item.marketLink.provider==='string'&&typeof item.marketLink.query==='string'&&typeof item.marketLink.linkedAt==='string'&&Number.isFinite(Date.parse(item.marketLink.linkedAt))&&(item.marketLink.lastRefresh===undefined||(typeof item.marketLink.lastRefresh==='string'&&Number.isFinite(Date.parse(item.marketLink.lastRefresh))))))&&(!item.priceHistory||(Array.isArray(item.priceHistory)&&item.priceHistory.every(p=>p&&Number.isFinite(Date.parse(p.date))&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&['variant','source','url'].every(k=>typeof (p as unknown as Record<string,unknown>)[k]==='string')&&['manual','provider','sale'].includes(p.kind))))&&(!item.comparables||(Array.isArray(item.comparables)&&item.comparables.every(c=>c&&typeof c.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(c.date)&&Number.isFinite(Date.parse(c.date))&&[c.price,c.shipping].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0)&&c.currency==='USD'&&['variant','source','url','title'].every(k=>typeof (c as unknown as Record<string,unknown>)[k]==='string')&&/^https?:\/\//.test(c.url))))}

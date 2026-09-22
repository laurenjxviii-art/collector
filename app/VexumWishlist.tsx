'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {
  AlertTriangle,Archive,BarChart3,Bell,CalendarDays,Check,ChevronRight,CircleDollarSign,
  Eye,Filter,Gem,Grid2X2,History,List,PackageCheck,Pencil,RefreshCw,Search,ShoppingBag,
  SlidersHorizontal,Star,Store,Target,TrendingDown,WalletCards,X
} from 'lucide-react';
import {DEMO_PRODUCTS} from '../lib/search/demo';
import type {NormalizedProduct,UserProductRelationship} from '../lib/search/types';
import type {Item} from '../lib/model';
import {useWorkspace} from '../lib/useWorkspace';
import {
  WISHLIST_ALERT_KEYS,WISHLIST_ALERT_LABELS,alertDefaults,conditionOptions,daysTracked,grailProgress,
  newWishlistRecord,normalizeWishlistRecord,preorderCommitment,snapshotFromProduct,wishlistEvent,
  type WishlistAlertFrequency,type WishlistAlertKey,type WishlistCatalogSnapshot,type WishlistPriority,
  type WishlistRecord
} from '../lib/wishlist';

type MainTab='Overview'|'Items'|'Opportunities'|'Grails'|'Preorders'|'Planned'|'Archive';
type DetailTab='Overview'|'Market'|'Availability'|'Planning'|'History';
type MarketSource='live'|'saved'|'demo'|'unavailable';
type OpportunityState={label:string;tone:'green'|'red'|'orange'|'muted'};
type WishlistEntry={
  id:string;
  productId:string;
  name:string;
  category:string;
  line:string;
  manufacturer:string;
  imageUrl?:string;
  msrp?:number;
  releaseDate?:string;
  market?:number;
  marketSource:MarketSource;
  record:WishlistRecord;
  product?:NormalizedProduct;
  workspaceItem?:Item;
  ownedQuantity:number;
  marketHistory:Array<{date:string;value:number;source:string}>;
};

const LEGACY_REL_KEY='vexum.search.relationships.v1';
const LEGACY_META_KEY='vexum.wishlist.meta.v1';
const LEGACY_PREF_KEY='vexum.wishlist.view.v1';
const PRIORITY_ORDER:Record<WishlistPriority,number>={Grail:0,High:1,Medium:2,Low:3};

function money(value?:number){
  return typeof value==='number'&&Number.isFinite(value)
    ?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value)
    :'—';
}
function norm(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function finite(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>=0}
function parseNumber(value:string){const n=Number(value);return value.trim()&&Number.isFinite(n)?n:undefined}
function dateSoon(value?:string,days=30){
  if(!value)return false;
  const ms=Date.parse(value)-Date.now();
  return Number.isFinite(ms)&&ms>=0&&ms<=days*86400000;
}
function nextMonth(){
  const d=new Date();d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,7);
}
function plannedLabel(value?:string){
  if(!value)return 'No plan';
  if(value==='Someday')return 'Someday';
  try{return new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric'}).format(new Date(value+'-01T12:00:00'))}catch{return value}
}
function alertCount(record:WishlistRecord){return Object.values(record.alerts).filter(rule=>rule.enabled&&rule.frequency!=='Off').length}
function relationFromRecord(record:WishlistRecord,ownedQuantity:number):UserProductRelationship{
  return {
    productId:record.productId,ownedQuantity,wishlisted:!record.archived,tracked:alertCount(record)>0,
    grail:record.priority==='Grail',targetPrice:record.targetPrice,maxPrice:record.maximumPrice,conditionRequirement:record.desiredCondition
  };
}
function marketSource(entryRecord:WishlistRecord,workspaceItem?:Item,product?:NormalizedProduct):MarketSource{
  if(entryRecord.currentMarket!==undefined&&entryRecord.marketSource){
    if(/demo/i.test(entryRecord.marketSource))return 'demo';
    if(/saved|manual|added/i.test(entryRecord.marketSource))return 'saved';
    return 'live';
  }
  if(workspaceItem&&workspaceItem.currentValue>0)return 'saved';
  if(product?.demoMarket)return 'demo';
  return 'unavailable';
}
function sourceLabel(source:MarketSource,record?:WishlistRecord){
  if(source==='live')return record?.marketSource||'Live provider';
  if(source==='demo')return 'Demo market data';
  if(source==='saved')return 'Saved valuation';
  return 'Provider unavailable';
}
function sourceClass(source:MarketSource){return source}
function productSnapshot(entry:NormalizedProduct):WishlistCatalogSnapshot{return snapshotFromProduct(entry)}

function migrateLegacyRecord(productId:string,legacy:Record<string,unknown>,relation?:Record<string,unknown>){
  const priority=(['Low','Medium','High','Grail'].includes(String(legacy.priority))?legacy.priority:(relation?.grail?'Grail':'Medium')) as WishlistPriority;
  const target=finite(legacy.targetPrice)?legacy.targetPrice as number:finite(relation?.targetPrice)?relation!.targetPrice as number:undefined;
  const maximum=finite(legacy.maxPrice)?legacy.maxPrice as number:finite(relation?.maxPrice)?relation!.maxPrice as number:undefined;
  let record=newWishlistRecord({productId,priority,targetPrice:target,maximumPrice:maximum,desiredCondition:String(legacy.desiredCondition||relation?.conditionRequirement||'Any')});
  const oldAlerts=legacy.alerts&&typeof legacy.alerts==='object'?legacy.alerts as Record<string,unknown>:{};
  const alerts=alertDefaults(priority);
  const map:Record<string,WishlistAlertKey>={price:'priceTarget',msrp:'msrp',restock:'restock',local:'localStock',marketplace:'marketplace',release:'releaseChange',preorder:'preorderOpen'};
  for(const [oldKey,newKey] of Object.entries(map)){
    if(typeof oldAlerts[oldKey]==='boolean')alerts[newKey]={...alerts[newKey],enabled:Boolean(oldAlerts[oldKey]),frequency:oldAlerts[oldKey]?(alerts[newKey].frequency==='Off'?'Daily Digest':alerts[newKey].frequency):'Off'};
  }
  const oldGrail=legacy.grail&&typeof legacy.grail==='object'?legacy.grail as Record<string,unknown>:undefined;
  const oldPre=legacy.preorder&&typeof legacy.preorder==='object'?legacy.preorder as Record<string,unknown>:undefined;
  const oldHistory=Array.isArray(legacy.history)?legacy.history:[];
  record=normalizeWishlistRecord({
    ...record,
    priority,targetPrice:target,maximumPrice:maximum,
    desiredCondition:String(legacy.desiredCondition||relation?.conditionRequirement||'Any'),
    retailers:Array.isArray(legacy.retailers)?legacy.retailers.filter(v=>typeof v==='string') as string[]:[],
    quantityWanted:Number.isInteger(legacy.quantity)&&Number(legacy.quantity)>0?Number(legacy.quantity):1,
    deadline:typeof legacy.deadline==='string'?legacy.deadline:undefined,
    plannedMonth:typeof legacy.plannedMonth==='string'?legacy.plannedMonth:undefined,
    notes:typeof legacy.notes==='string'?legacy.notes:'',
    alerts,
    grail:oldGrail?{
      goalAmount:finite(oldGrail.goalAmount)?oldGrail.goalAmount as number:undefined,
      savedAmount:finite(oldGrail.savedAmount)?oldGrail.savedAmount as number:undefined,
      deadline:typeof oldGrail.deadline==='string'?oldGrail.deadline:undefined,
      status:oldGrail.status==='Paused'?'Paused':oldGrail.status==='Funded'?'Goal Reached':'Saving'
    }:undefined,
    preorder:oldPre?{
      enabled:Boolean(oldPre.enabled),
      totalPrice:finite(oldPre.price)?oldPre.price as number:undefined,
      depositPaid:finite(oldPre.deposit)?oldPre.deposit as number:undefined,
      remainingBalance:finite(oldPre.balance)?oldPre.balance as number:undefined,
      estimatedChargeDate:typeof oldPre.chargeDate==='string'?oldPre.chargeDate:undefined,
      estimatedReleaseDate:typeof oldPre.releaseDate==='string'?oldPre.releaseDate:undefined,
      status:oldPre.status==='Cancelled'?'Cancelled':oldPre.status==='Charging Soon'?'Charging Soon':oldPre.status==='Preordered'?'Preordered':'Planned'
    }:undefined,
    archived:Boolean(legacy.archived),
    archiveReason:legacy.archiveReason==='purchased'?'purchased':legacy.archiveReason==='removed'?'removed':undefined,
    purchasedAt:typeof legacy.purchasedAt==='string'?legacy.purchasedAt:undefined,
    purchasePrice:finite(legacy.purchasePrice)?legacy.purchasePrice as number:undefined,
    history:oldHistory.filter(Boolean).map((row:any)=>({at:typeof row.at==='string'?row.at:new Date().toISOString(),type:'updated' as const,event:String(row.event||'Wishlist updated')}))
  },productId);
  return record;
}

export default function VexumWishlist(){
  const workspace=useWorkspace();
  const migrated=useRef(false);
  const [tab,setTab]=useState<MainTab>('Overview');
  const [detailTab,setDetailTab]=useState<DetailTab>('Overview');
  const [query,setQuery]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [category,setCategory]=useState('All');
  const [manufacturer,setManufacturer]=useState('All');
  const [line,setLine]=useState('All');
  const [condition,setCondition]=useState('All');
  const [retailer,setRetailer]=useState('All');
  const [targetState,setTargetState]=useState('All');
  const [availabilityFilter,setAvailabilityFilter]=useState('All');
  const [releaseFilter,setReleaseFilter]=useState('All');
  const [plannedFilter,setPlannedFilter]=useState('All');
  const [duplicateOnly,setDuplicateOnly]=useState(false);
  const [minPrice,setMinPrice]=useState('');
  const [maxPrice,setMaxPrice]=useState('');
  const [priorityFilter,setPriorityFilter]=useState<WishlistPriority[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [planningId,setPlanningId]=useState<string|null>(null);
  const [purchasingId,setPurchasingId]=useState<string|null>(null);
  const [bulkOpen,setBulkOpen]=useState(false);
  const [selectMode,setSelectMode]=useState(false);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [showInsights,setShowInsights]=useState(false);
  const [marketRefreshing,setMarketRefreshing]=useState(false);
  const [marketError,setMarketError]=useState('');
  const [budgetModal,setBudgetModal]=useState(false);
  const [intelligenceAnswer,setIntelligenceAnswer]=useState('');

  const prefs=workspace.data.wishlistPreferences||{view:'table' as const,sort:'priority'};
  const view=prefs.view;
  const sort=prefs.sort;

  useEffect(()=>{
    if(!workspace.ready||migrated.current)return;
    migrated.current=true;
    let next={...(workspace.data.wishlist||{})};
    let changed=false;
    let legacyMeta:Record<string,Record<string,unknown>>={};
    let legacyRelations:Record<string,Record<string,unknown>>={};
    let legacyPrefs:any=null;
    try{legacyMeta=JSON.parse(localStorage.getItem(LEGACY_META_KEY)||'{}')}catch{}
    try{legacyRelations=JSON.parse(localStorage.getItem(LEGACY_REL_KEY)||'{}')}catch{}
    try{legacyPrefs=JSON.parse(localStorage.getItem(LEGACY_PREF_KEY)||'null')}catch{}
    const ids=new Set([...Object.keys(legacyMeta),...Object.keys(legacyRelations).filter(id=>Boolean(legacyRelations[id]?.wishlisted))]);
    ids.forEach(id=>{
      if(next[id])return;
      next[id]=migrateLegacyRecord(id,legacyMeta[id]||{},legacyRelations[id]);
      changed=true;
    });
    for(const item of workspace.data.items){
      if(item.status!=='wishlist')continue;
      const id='workspace:'+item.id;
      if(next[id])continue;
      next[id]=newWishlistRecord({
        productId:id,source:'workspace',workspaceItemId:item.id,priority:'Medium',
        desiredCondition:item.condition||'Any',initialMarket:item.currentValue>0?item.currentValue:undefined,
        snapshot:{name:item.name,category:item.category,manufacturer:item.identity?.brand,line:item.identity?.series,imageUrl:item.image||undefined,brand:item.identity?.brand,upc:item.identity?.upc,sku:item.identity?.sku,modelNumber:item.identity?.modelNumber,releaseYear:item.identity?.year}
      });
      changed=true;
    }
    const nextPrefs=workspace.data.wishlistPreferences||{
      view:legacyPrefs?.view==='grid'?'grid':'table',
      sort:typeof legacyPrefs?.sort==='string'?legacyPrefs.sort:'priority'
    };
    if(changed||!workspace.data.wishlistPreferences)workspace.update({...workspace.data,wishlist:next,wishlistPreferences:nextPrefs});
  },[workspace.ready,workspace.data]);

  const records=workspace.data.wishlist||{};

  const entries=useMemo<WishlistEntry[]>(()=>{
    const byProduct=new Map(DEMO_PRODUCTS.map(product=>[product.id,product]));
    return Object.entries(records).map(([id,raw])=>{
      const record=normalizeWishlistRecord(raw,id);
      const product=record.source==='catalog'?byProduct.get(record.productId):undefined;
      const item=record.workspaceItemId?workspace.data.items.find(candidate=>candidate.id===record.workspaceItemId):undefined;
      const snapshot=record.snapshot;
      const name=product?.canonicalName||item?.name||snapshot?.name||'Unresolved catalog item';
      const categoryName=product?.category||item?.category||snapshot?.category||'Other';
      const lineName=product?.line||product?.brand||item?.identity?.series||snapshot?.line||snapshot?.brand||'Catalog';
      const maker=product?.manufacturer||item?.identity?.brand||snapshot?.manufacturer||snapshot?.brand||'Unknown';
      const msrp=product?.msrp??snapshot?.msrp;
      const releaseDate=product?.releaseDate??snapshot?.releaseDate;
      const owned=workspace.data.items.filter(candidate=>candidate.status==='owned'&&(
        norm(candidate.name)===norm(name)||
        (!!(product?.upc||snapshot?.upc)&&candidate.identity?.upc===(product?.upc||snapshot?.upc))||
        (!!(product?.sku||snapshot?.sku)&&candidate.identity?.sku===(product?.sku||snapshot?.sku))
      )).reduce((sum,candidate)=>sum+candidate.quantity,0);
      const market=record.currentMarket??(item&&item.currentValue>0?item.currentValue:undefined)??product?.demoMarket?.current;
      const history=[
        ...record.marketHistory,
        ...(item?.priceHistory||[]).map(p=>({date:p.date,value:p.value,source:p.source}))
      ].toSorted((a,b)=>a.date.localeCompare(b.date));
      const uniqueHistory=Array.from(new Map(history.map(point=>[point.date.slice(0,16)+'|'+point.value,point])).values());
      return {
        id,productId:record.productId,name,category:categoryName,line:lineName,manufacturer:maker,
        imageUrl:product?.imageUrl||item?.image||snapshot?.imageUrl,msrp,releaseDate,market,
        marketSource:marketSource(record,item,product),record,product,workspaceItem:item,ownedQuantity:owned,
        marketHistory:uniqueHistory
      };
    });
  },[records,workspace.data.items]);

  const activeEntries=entries.filter(entry=>!entry.record.archived);
  const archivedEntries=entries.filter(entry=>entry.record.archived);
  const grails=activeEntries.filter(entry=>entry.record.priority==='Grail');
  const preorders=activeEntries.filter(entry=>entry.record.preorder?.enabled&&entry.record.preorder.status!=='Cancelled'&&entry.record.preorder.status!=='Delivered');
  const planned=activeEntries.filter(entry=>Boolean(entry.record.plannedMonth));
  const currentMonthKey=new Date().toISOString().slice(0,7);
  const nextMonthKey=nextMonth();
  const hobbyBudget=workspace.data.financialPreferences?.monthlyHobbyBudget;
  const currentHobbySpend=workspace.data.items.filter(item=>item.status==='owned'&&item.purchaseDate.startsWith(currentMonthKey)).reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const plannedForMonth=(month:string)=>planned.filter(entry=>entry.record.plannedMonth===month).reduce((sum,entry)=>sum+(entry.market??entry.record.targetPrice??entry.record.maximumPrice??0)*entry.record.quantityWanted,0);
  const preorderDueForMonth=(month:string)=>preorders.filter(entry=>entry.record.preorder?.estimatedChargeDate?.startsWith(month)).reduce((sum,entry)=>sum+preorderCommitment(entry.record)*entry.record.quantityWanted,0);
  const financialContext={
    budget:hobbyBudget,currentSpend:currentHobbySpend,
    currentPlanned:plannedForMonth(currentMonthKey),currentPreorders:preorderDueForMonth(currentMonthKey),
    nextPlanned:plannedForMonth(nextMonthKey),nextPreorders:preorderDueForMonth(nextMonthKey)
  };
  const opportunityRows=activeEntries.map(entry=>({entry,...opportunityFor(entry)})).filter(row=>row.states.length>0).toSorted((a,b)=>b.score-a.score);
  const opportunities=opportunityRows.filter(row=>row.states.some(state=>['Under target','At target','Below MSRP','Release soon','Preorder tracked'].includes(state.label))).map(row=>row.entry);
  const targetMatches=activeEntries.filter(entry=>typeof entry.market==='number'&&typeof entry.record.targetPrice==='number'&&entry.market<=entry.record.targetPrice);
  const preorderCommitments=preorders.reduce((sum,entry)=>sum+preorderCommitment(entry.record)*entry.record.quantityWanted,0);
  const due30=preorders.filter(entry=>dateSoon(entry.record.preorder?.estimatedChargeDate,30)).reduce((sum,entry)=>sum+preorderCommitment(entry.record)*entry.record.quantityWanted,0);
  const potentialSavings=targetMatches.reduce((sum,entry)=>sum+Math.max(0,(entry.record.targetPrice||0)-(entry.market||0))*entry.record.quantityWanted,0);
  const totalMarket=activeEntries.reduce((sum,entry)=>sum+(entry.market||0)*entry.record.quantityWanted,0);
  const targetValue=activeEntries.reduce((sum,entry)=>sum+(entry.record.targetPrice||0)*entry.record.quantityWanted,0);
  const maxExposure=activeEntries.reduce((sum,entry)=>sum+(entry.record.maximumPrice||0)*entry.record.quantityWanted,0);
  const grailSaved=grails.reduce((sum,entry)=>sum+(entry.record.grail?.savedAmount||0),0);

  const categories=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.category))).sort()],[activeEntries]);
  const manufacturers=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.manufacturer))).sort()],[activeEntries]);
  const lines=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.line))).sort()],[activeEntries]);
  const retailers=useMemo(()=>['All',...Array.from(new Set(activeEntries.flatMap(entry=>entry.record.retailers))).sort()],[activeEntries]);
  const conditions=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.record.desiredCondition))).sort()],[activeEntries]);
  const plannedMonths=useMemo(()=>['All',...Array.from(new Set(activeEntries.map(entry=>entry.record.plannedMonth).filter(Boolean) as string[])).sort()],[activeEntries]);

  const baseForTab=useMemo(()=>{
    if(tab==='Archive')return archivedEntries;
    if(tab==='Opportunities')return opportunities;
    if(tab==='Grails')return grails;
    if(tab==='Preorders')return preorders;
    if(tab==='Planned')return planned;
    return activeEntries;
  },[tab,activeEntries,archivedEntries,opportunities,grails,preorders,planned]);

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase(),min=parseNumber(minPrice),max=parseNumber(maxPrice);
    const rows=baseForTab.filter(entry=>{
      if(q&&!([entry.name,entry.category,entry.line,entry.manufacturer,...entry.record.retailers].join(' ').toLowerCase().includes(q)))return false;
      if(category!=='All'&&entry.category!==category)return false;
      if(manufacturer!=='All'&&entry.manufacturer!==manufacturer)return false;
      if(line!=='All'&&entry.line!==line)return false;
      if(condition!=='All'&&entry.record.desiredCondition!==condition)return false;
      if(retailer!=='All'&&!entry.record.retailers.includes(retailer))return false;
      if(priorityFilter.length&&!priorityFilter.includes(entry.record.priority))return false;
      if(plannedFilter!=='All'&&entry.record.plannedMonth!==plannedFilter)return false;
      if(duplicateOnly&&entry.ownedQuantity===0)return false;
      if(min!==undefined&&(entry.market===undefined||entry.market<min))return false;
      if(max!==undefined&&(entry.market===undefined||entry.market>max))return false;
      if(targetState==='Reached'&&!(entry.market!==undefined&&entry.record.targetPrice!==undefined&&entry.market<=entry.record.targetPrice))return false;
      if(targetState==='Above target'&&!(entry.market!==undefined&&entry.record.targetPrice!==undefined&&entry.market>entry.record.targetPrice))return false;
      if(targetState==='Below MSRP'&&!(entry.market!==undefined&&entry.msrp!==undefined&&entry.market<entry.msrp))return false;
      if(targetState==='Preorder'&&!entry.record.preorder?.enabled)return false;
      if(availabilityFilter==='Preorder'&&!entry.record.preorder?.enabled)return false;
      if(availabilityFilter==='Marketplace'&&!entry.record.alerts.marketplace.enabled)return false;
      if(availabilityFilter==='Local'&&!entry.record.alerts.localStock.enabled)return false;
      if(availabilityFilter==='Provider unavailable'&&entry.marketSource!=='unavailable')return false;
      if(releaseFilter==='Upcoming'&&!(entry.releaseDate&&Date.parse(entry.releaseDate)>Date.now()))return false;
      if(releaseFilter==='Released'&&(entry.releaseDate&&Date.parse(entry.releaseDate)>Date.now()))return false;
      if(releaseFilter==='Release soon'&&!dateSoon(entry.releaseDate||entry.record.preorder?.estimatedReleaseDate,30))return false;
      return true;
    });
    return rows.toSorted((a,b)=>sortEntries(a,b,sort));
  },[baseForTab,query,category,manufacturer,line,condition,retailer,priorityFilter,plannedFilter,duplicateOnly,minPrice,maxPrice,targetState,availabilityFilter,releaseFilter,sort]);

  const selected=selectedId?entries.find(entry=>entry.id===selectedId)||null:null;
  const editing=editingId?entries.find(entry=>entry.id===editingId)||null:null;
  const planning=planningId?entries.find(entry=>entry.id===planningId)||null:null;
  const purchasing=purchasingId?entries.find(entry=>entry.id===purchasingId)||null:null;

  function setPrefs(patch:Partial<{view:'table'|'grid';sort:string}>){
    workspace.update({...workspace.data,wishlistPreferences:{...prefs,...patch}});
  }
  function updateRecord(id:string,next:WishlistRecord){
    workspace.update({...workspace.data,wishlist:{...(workspace.data.wishlist||{}),[id]:normalizeWishlistRecord(next,id)}});
    syncLegacyRelationship(next,entries.find(entry=>entry.id===id)?.ownedQuantity||0);
  }
  function updateRecords(changes:Record<string,WishlistRecord>){
    const next={...(workspace.data.wishlist||{})};
    Object.entries(changes).forEach(([id,record])=>{next[id]=normalizeWishlistRecord(record,id);syncLegacyRelationship(record,entries.find(entry=>entry.id===id)?.ownedQuantity||0)});
    workspace.update({...workspace.data,wishlist:next});
  }
  function syncLegacyRelationship(record:WishlistRecord,ownedQuantity:number){
    try{
      const rel=JSON.parse(localStorage.getItem(LEGACY_REL_KEY)||'{}');
      rel[record.productId]=relationFromRecord(record,ownedQuantity);
      localStorage.setItem(LEGACY_REL_KEY,JSON.stringify(rel));
    }catch{}
  }
  function archiveEntry(entry:WishlistEntry,reason:'purchased'|'removed'='removed'){
    updateRecord(entry.id,wishlistEvent(entry.record,'archive',reason==='purchased'?'Marked purchased':'Archived from Wishlist',{archived:true,archiveReason:reason,alerts:disableAlerts(entry.record.alerts)}));
    setSelectedId(null);setTab('Archive');
  }
  function restoreEntry(entry:WishlistEntry){
    updateRecord(entry.id,wishlistEvent(entry.record,'restore','Restored to Wishlist',{archived:false,archiveReason:undefined,purchasedAt:undefined,purchasePrice:undefined}));
    setTab('Items');
  }
  function cyclePriority(entry:WishlistEntry){
    const values:WishlistPriority[]=['Low','Medium','High','Grail'];
    const priority=values[(values.indexOf(entry.record.priority)+1)%values.length];
    updateRecord(entry.id,wishlistEvent(entry.record,'priority','Priority changed to '+priority,{priority,grail:priority==='Grail'?(entry.record.grail||{status:'Not Started'}):entry.record.grail}));
  }
  function toggleAlerts(entry:WishlistEntry){
    const any=alertCount(entry.record)>0;
    updateRecord(entry.id,wishlistEvent(entry.record,'alert',any?'Wishlist alerts turned off':'Wishlist alerts enabled from priority defaults',{alerts:any?disableAlerts(entry.record.alerts):alertDefaults(entry.record.priority)}));
  }
  async function refreshMarket(entry:WishlistEntry){
    if(marketRefreshing)return;
    setMarketRefreshing(true);setMarketError('');
    const identity=entry.product?{
      brand:entry.product.brand,series:entry.product.line,upc:entry.product.upc,sku:entry.product.sku,modelNumber:entry.product.modelNumber,year:entry.product.releaseYear
    }:(entry.workspaceItem?.identity||{brand:entry.record.snapshot?.brand,series:entry.record.snapshot?.line,upc:entry.record.snapshot?.upc,sku:entry.record.snapshot?.sku,modelNumber:entry.record.snapshot?.modelNumber,year:entry.record.snapshot?.releaseYear});
    try{
      const response=await fetch('/api/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:{name:entry.name,category:entry.category,condition:entry.record.desiredCondition,identity}})});
      const data=await response.json();
      if(!response.ok)throw new Error(data?.error||'Market provider unavailable.');
      const value=Number(data?.value);
      if(!Number.isFinite(value)||value<=0)throw new Error('Provider returned no usable market value.');
      const date=typeof data.fetchedAt==='string'?data.fetchedAt:new Date().toISOString();
      updateRecord(entry.id,wishlistEvent(entry.record,'market','Market refreshed from '+String(data.source||'provider'),{
        currentMarket:value,marketSource:String(data.source||'Market provider'),marketUpdatedAt:date,
        marketConfidence:Number.isFinite(Number(data.confidence))?Number(data.confidence):undefined,
        marketHistory:[...entry.record.marketHistory,{date,value,source:String(data.source||'Market provider')}].slice(-1000)
      }));
    }catch(error){setMarketError(error instanceof Error?error.message:'Market provider unavailable.')}finally{setMarketRefreshing(false)}
  }
  function clearFilters(){
    setQuery('');setCategory('All');setManufacturer('All');setLine('All');setCondition('All');setRetailer('All');setTargetState('All');setAvailabilityFilter('All');setReleaseFilter('All');setPlannedFilter('All');setDuplicateOnly(false);setMinPrice('');setMaxPrice('');setPriorityFilter([]);
  }
  function toggleSelected(id:string){setSelectedIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id])}
  function closeSelectMode(){setSelectMode(false);setSelectedIds([])}
  function applyBulk(patch:{priority?:WishlistPriority;plannedMonth?:string;condition?:string;retailer?:string;alerts?:'on'|'off';archive?:boolean}){
    const changes:Record<string,WishlistRecord>={};
    selectedIds.forEach(id=>{
      const entry=entries.find(row=>row.id===id);if(!entry)return;
      let record=entry.record;
      if(patch.priority)record=wishlistEvent(record,'priority','Bulk priority changed to '+patch.priority,{priority:patch.priority,grail:patch.priority==='Grail'?(record.grail||{status:'Not Started'}):record.grail});
      if(patch.plannedMonth!==undefined)record=wishlistEvent(record,'plan','Bulk purchase plan updated',{plannedMonth:patch.plannedMonth||undefined});
      if(patch.condition)record=wishlistEvent(record,'updated','Bulk condition preference updated',{desiredCondition:patch.condition});
      if(patch.retailer)record=wishlistEvent(record,'updated','Retailer preference added',{retailers:Array.from(new Set([...record.retailers,patch.retailer]))});
      if(patch.alerts)record=wishlistEvent(record,'alert',patch.alerts==='on'?'Bulk alerts enabled':'Bulk alerts disabled',{alerts:patch.alerts==='on'?alertDefaults(record.priority):disableAlerts(record.alerts)});
      if(patch.archive)record=wishlistEvent(record,'archive','Archived from Wishlist',{archived:true,archiveReason:'removed',alerts:disableAlerts(record.alerts)});
      changes[id]=record;
    });
    updateRecords(changes);setBulkOpen(false);closeSelectMode();
  }

  if(!workspace.ready){
    return <div className="vxw-page"><section className="vxw-hero"><div><span>04 — WISHLIST</span><h1>Wishlist</h1><p>Your acquisition command center.</p></div></section><div className="vxw-loading"><i/><i/><i/><i/><span>Loading Wishlist intelligence…</span></div></div>;
  }

  return <div className="vxw-page">
    <section className="vxw-hero">
      <div><span>04 — WISHLIST</span><h1>Wishlist</h1><p>What you want, what it costs, and what buying it changes.</p></div>
      <aside><span>PURCHASE COMMAND CENTER</span><q>Context, not permission. You make the decision.</q></aside>
    </section>

    <div className="vxw-tabs">
      {(['Overview','Items','Opportunities','Grails','Preorders','Planned','Archive'] as MainTab[]).map(name=>
        <button key={name} className={tab===name?'active':''} onClick={()=>{setTab(name);closeSelectMode()}}>
          {name}<small>{tabCount(name,{activeEntries,opportunities,grails,preorders,planned,archivedEntries})}</small>
        </button>
      )}
    </div>

    <div className="vxw-stats six">
      <StatCard label="Wishlist Items" value={String(activeEntries.length)} note={money(totalMarket)+' labeled market value'} icon={<Star/>}/>
      <StatCard label="Target Matches" value={String(targetMatches.length)} note={money(potentialSavings)+' target headroom'} icon={<Target/>}/>
      <StatCard label="Grails" value={String(grails.length)} note={money(grailSaved)+' saved toward goals'} icon={<Gem/>}/>
      <StatCard label="Active Preorders" value={String(preorders.length)} note={money(preorderCommitments)+' future commitment'} icon={<PackageCheck/>}/>
      <StatCard label="Due in 30 Days" value={money(due30)} note="Known preorder balances only" icon={<CalendarDays/>}/>
      <StatCard label="Planned Purchases" value={String(planned.length)} note="Wishlist planning source of truth" icon={<WalletCards/>}/>
    </div>

    <div className="vxw-provider-note">
      <AlertTriangle/><div><strong>Provider transparency</strong><span>Wishlist core data is now stored in the synced VEXUM workspace. External retailer/local marketplace feeds still fail independently; unavailable providers never become invented stock or pricing.</span></div>
      <button onClick={()=>setShowInsights(value=>!value)}><BarChart3/>{showInsights?'Hide':'Insights'}</button>
    </div>

    {showInsights?<section className="vxw-insights">
      <InsightCard label="Target-price total" value={money(targetValue)} sub="Only items with a target"/>
      <InsightCard label="Maximum exposure" value={money(maxExposure)} sub="Only items with a maximum"/>
      <InsightCard label="Average target gap" value={averageTargetGap(activeEntries)} sub="Current labeled values vs target"/>
      <InsightCard label="Duplicates" value={String(activeEntries.filter(entry=>entry.ownedQuantity>0).length)} sub="Intentional duplicates remain allowed"/>
      <InsightCard label="Alerts active" value={String(activeEntries.reduce((sum,entry)=>sum+alertCount(entry.record),0))} sub="Rule count, not notifications sent"/>
      <InsightCard label="Market coverage" value={marketCoverage(activeEntries)} sub="Live/saved/demo/unavailable"/>
    </section>:null}

    {tab==='Overview'?<OverviewDashboard
      entries={activeEntries} opportunities={opportunityRows.slice(0,5)} grails={grails} preorders={preorders} planned={planned}
      financial={financialContext} answer={intelligenceAnswer}
      onAsk={kind=>setIntelligenceAnswer(answerWishlistQuestion(kind,activeEntries,financialContext))}
      onOpen={entry=>{setSelectedId(entry.id);setDetailTab('Overview')}} onPlan={entry=>setPlanningId(entry.id)}
    />:null}

    {tab!=='Overview'?<>
      <section className="vxw-command">
        <div className="vxw-search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search product, line, manufacturer, retailer…"/>{query?<button onClick={()=>setQuery('')}><X/></button>:null}</div>
        <select value={sort} onChange={event=>setPrefs({sort:event.target.value})} aria-label="Sort Wishlist">
          <option value="priority">Sort: Priority</option>
          <option value="recent">Recently added</option>
          <option value="name">Name</option>
          <option value="target">Target price</option>
          <option value="market">Current market</option>
          <option value="msrp">MSRP</option>
          <option value="closest">Closest to target</option>
          <option value="drop">Biggest price drop</option>
          <option value="availability">Availability signal</option>
          <option value="release">Release date</option>
          <option value="planned">Planned purchase</option>
          <option value="grail">Grail progress</option>
          <option value="freshness">Market freshness</option>
        </select>
        <button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(value=>!value)}><Filter/>Filters</button>
        <button className={selectMode?'active':''} onClick={()=>selectMode?closeSelectMode():setSelectMode(true)}><Check/>{selectMode?'Cancel':'Select'}</button>
        <div className="vxw-view-toggle"><button className={view==='table'?'active':''} onClick={()=>setPrefs({view:'table'})} title="Table view"><List/></button><button className={view==='grid'?'active':''} onClick={()=>setPrefs({view:'grid'})} title="Grid view"><Grid2X2/></button></div>
      </section>

      {filtersOpen?<section className="vxw-filters advanced">
        <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Manufacturer<select value={manufacturer} onChange={e=>setManufacturer(e.target.value)}>{manufacturers.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Line<select value={line} onChange={e=>setLine(e.target.value)}>{lines.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}>{conditions.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Retailer<select value={retailer} onChange={e=>setRetailer(e.target.value)}>{retailers.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>State<select value={targetState} onChange={e=>setTargetState(e.target.value)}><option>All</option><option>Reached</option><option>Above target</option><option>Below MSRP</option><option>Preorder</option></select></label>
        <label>Availability<select value={availabilityFilter} onChange={e=>setAvailabilityFilter(e.target.value)}><option>All</option><option>Preorder</option><option>Marketplace</option><option>Local</option><option>Provider unavailable</option></select></label>
        <label>Release<select value={releaseFilter} onChange={e=>setReleaseFilter(e.target.value)}><option>All</option><option>Upcoming</option><option>Released</option><option>Release soon</option></select></label>
        <label>Planned<select value={plannedFilter} onChange={e=>setPlannedFilter(e.target.value)}>{plannedMonths.map(value=><option key={value} value={value}>{value==='All'?'All':plannedLabel(value)}</option>)}</select></label>
        <label>Market min<input value={minPrice} onChange={e=>setMinPrice(e.target.value)} inputMode="decimal" placeholder="$0"/></label>
        <label>Market max<input value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} inputMode="decimal" placeholder="Any"/></label>
        <div className="vxw-priority-filter"><span>Priority</span>{(['Low','Medium','High','Grail'] as WishlistPriority[]).map(value=><button key={value} className={priorityFilter.includes(value)?'active':''} onClick={()=>setPriorityFilter(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value])}>{value}</button>)}</div>
        <label className="vxw-check-filter"><input type="checkbox" checked={duplicateOnly} onChange={e=>setDuplicateOnly(e.target.checked)}/>Already owned</label>
        <button className="vxw-clear-filter" onClick={clearFilters}>Clear filters</button>
      </section>:null}

      {tab==='Archive'?<ArchiveInsights entries={archivedEntries}/>:null}
      {tab==='Planned'?<PlannedTimeline entries={planned}/>:null}

      {visible.length===0?<EmptyState tab={tab} filtered={hasFilters({query,category,manufacturer,line,condition,retailer,targetState,availabilityFilter,releaseFilter,plannedFilter,duplicateOnly,minPrice,maxPrice,priorityFilter})}/>:view==='table'?
        <WishlistTable entries={visible} selectMode={selectMode} selectedIds={selectedIds} onSelect={toggleSelected}
          onOpen={entry=>{if(selectMode){toggleSelected(entry.id);return}setSelectedId(entry.id);setDetailTab('Overview')}}
          onEdit={entry=>setEditingId(entry.id)} onPlan={entry=>setPlanningId(entry.id)} onPurchase={entry=>setPurchasingId(entry.id)} onArchive={entry=>archiveEntry(entry)} onRestore={restoreEntry}
          onPriority={cyclePriority} onAlerts={toggleAlerts}/>:
        <WishlistGrid entries={visible} selectMode={selectMode} selectedIds={selectedIds} onSelect={toggleSelected}
          onOpen={entry=>{if(selectMode){toggleSelected(entry.id);return}setSelectedId(entry.id);setDetailTab('Overview')}}
          onEdit={entry=>setEditingId(entry.id)} onPlan={entry=>setPlanningId(entry.id)} onPurchase={entry=>setPurchasingId(entry.id)} onArchive={entry=>archiveEntry(entry)} onRestore={restoreEntry}
          onPriority={cyclePriority} onAlerts={toggleAlerts}/>
      }

      {selectMode&&selectedIds.length?<div className="vxw-bulk-bar"><div><strong>{selectedIds.length} selected</strong><span>Bulk changes are reviewable and user-initiated.</span></div><button onClick={()=>setSelectedIds(visible.map(entry=>entry.id))}>Select visible</button><button onClick={()=>setBulkOpen(true)}><SlidersHorizontal/>Bulk Edit</button></div>:null}
    </>:null}

    {selected?<DetailDrawer entry={selected} tab={detailTab} setTab={setDetailTab} marketRefreshing={marketRefreshing} marketError={marketError}
      financial={financialContext} onSetBudget={()=>setBudgetModal(true)}
      onRefreshMarket={()=>void refreshMarket(selected)} onClose={()=>{setSelectedId(null);setMarketError('')}} onEdit={()=>setEditingId(selected.id)}
      onPlan={()=>setPlanningId(selected.id)} onPurchase={()=>setPurchasingId(selected.id)} onArchive={()=>archiveEntry(selected)} onRestore={()=>restoreEntry(selected)}/>:null}

    {editing?<EditModal entry={editing} onClose={()=>setEditingId(null)} onSave={next=>{updateRecord(editing.id,next);setEditingId(null)}}/>:null}
    {planning?<PlanModal entry={planning} onClose={()=>setPlanningId(null)} onSave={(month,deadline,quantity)=>{
      updateRecord(planning.id,wishlistEvent(planning.record,'plan','Purchase plan updated',{plannedMonth:month||undefined,deadline:deadline||undefined,quantityWanted:quantity}));
      setPlanningId(null);setTab('Planned');
    }}/>:null}
    {purchasing?<PurchaseModal entry={purchasing} busy={workspace.busy} onClose={()=>setPurchasingId(null)} onConfirm={purchase=>{
      const now=new Date().toISOString(),quantity=purchase.quantity||1,unit=purchase.unitPrice||0;
      const existing=purchasing.workspaceItem;
      let items:Item[];
      if(existing){
        items=workspace.data.items.map(item=>item.id===existing.id?{
          ...item,status:'owned',purchasePrice:unit,currentValue:purchasing.market||unit,quantity,
          condition:purchase.condition||item.condition,purchaseDate:purchase.purchaseDate||today(),updatedAt:now,
          customFields:{...item.customFields,'Purchased from Wishlist':'Yes','Retailer':purchase.retailer||item.customFields.Retailer||'','Shipping':String(purchase.shipping||0),'Tax':String(purchase.tax||0),'Receipt':purchase.receipt||'','Expected Delivery':purchase.expectedDelivery||''}
        }:item);
      }else{
        const p=purchasing.product,s=purchasing.record.snapshot;
        const newItem:Item={
          id:'wishlist-'+purchasing.productId.replace(/[^a-z0-9]+/gi,'-')+'-'+Date.now(),collectionId:'',name:purchasing.name,category:purchasing.category,status:'owned',
          purchasePrice:unit,currentValue:purchasing.market||unit,quantity,image:purchasing.imageUrl||'',condition:purchase.condition||purchasing.record.desiredCondition,
          purchaseDate:purchase.purchaseDate||today(),location:'',notes:purchasing.record.notes,
          customFields:{'Wishlist Product ID':purchasing.productId,'Wishlist Priority':purchasing.record.priority,'Retailer':purchase.retailer||'','Shipping':String(purchase.shipping||0),'Tax':String(purchase.tax||0),'Receipt':purchase.receipt||'','Expected Delivery':purchase.expectedDelivery||''},
          identity:{brand:p?.brand||s?.brand||'',series:p?.line||s?.line||'',modelNumber:p?.modelNumber||s?.modelNumber||'',upc:p?.upc||s?.upc||'',sku:p?.sku||s?.sku||'',year:p?.releaseYear||s?.releaseYear||''},
          createdAt:now,updatedAt:now
        };
        items=[...workspace.data.items,newItem];
      }
      const total=(purchase.unitPrice||0)*quantity+(purchase.shipping||0)+(purchase.tax||0);
      const record=wishlistEvent(purchasing.record,'purchase','Purchased for '+money(total),{
        archived:true,archiveReason:'purchased',purchasedAt:now,purchasePrice:total,purchase,
        alerts:disableAlerts(purchasing.record.alerts),
        grail:purchasing.record.grail?{...purchasing.record.grail,status:'Purchased'}:undefined
      });
      workspace.update({...workspace.data,items,wishlist:{...(workspace.data.wishlist||{}),[purchasing.id]:record}});
      syncLegacyRelationship(record,purchasing.ownedQuantity+quantity);
      setPurchasingId(null);setSelectedId(null);setTab('Archive');
    }}/>:null}
    {bulkOpen?<BulkModal entries={entries.filter(entry=>selectedIds.includes(entry.id))} onClose={()=>setBulkOpen(false)} onApply={applyBulk}/>:null}
    {budgetModal?<BudgetModal value={hobbyBudget} onClose={()=>setBudgetModal(false)} onSave={value=>{workspace.update({...workspace.data,financialPreferences:{...(workspace.data.financialPreferences||{}),monthlyHobbyBudget:value}});setBudgetModal(false)}}/>:null}
  </div>;
}

function disableAlerts(alerts:WishlistRecord['alerts']){
  return Object.fromEntries(Object.entries(alerts).map(([key,rule])=>[key,{...rule,enabled:false,frequency:'Off'}])) as WishlistRecord['alerts'];
}

function sortEntries(a:WishlistEntry,b:WishlistEntry,sort:string){
  if(sort==='name')return a.name.localeCompare(b.name);
  if(sort==='recent')return b.record.addedAt.localeCompare(a.record.addedAt);
  if(sort==='market')return (b.market??-1)-(a.market??-1);
  if(sort==='target')return (b.record.targetPrice??-1)-(a.record.targetPrice??-1);
  if(sort==='msrp')return (b.msrp??-1)-(a.msrp??-1);
  if(sort==='closest'){
    const ga=a.market!==undefined&&a.record.targetPrice!==undefined?Math.abs(a.market-a.record.targetPrice):Infinity;
    const gb=b.market!==undefined&&b.record.targetPrice!==undefined?Math.abs(b.market-b.record.targetPrice):Infinity;
    return ga-gb;
  }
  if(sort==='drop')return priceDropPercent(b)-priceDropPercent(a);
  if(sort==='availability')return availabilityScore(b)-availabilityScore(a);
  if(sort==='release')return (a.releaseDate||'9999').localeCompare(b.releaseDate||'9999');
  if(sort==='planned')return (a.record.plannedMonth||'9999').localeCompare(b.record.plannedMonth||'9999');
  if(sort==='grail')return grailProgress(b.record)-grailProgress(a.record);
  if(sort==='freshness')return (b.record.marketUpdatedAt||'').localeCompare(a.record.marketUpdatedAt||'');
  return PRIORITY_ORDER[a.record.priority]-PRIORITY_ORDER[b.record.priority]||a.name.localeCompare(b.name);
}

function priceDropPercent(entry:WishlistEntry){
  const values=entry.marketHistory.map(point=>point.value).filter(value=>Number.isFinite(value)&&value>0);
  if(entry.market!==undefined&&(!values.length||values.at(-1)!==entry.market))values.push(entry.market);
  if(values.length<2)return 0;
  const latest=values.at(-1)!;
  let previous=values.at(-2)!;
  for(let i=values.length-2;i>=0;i--){if(Math.abs(values[i]-latest)>.009){previous=values[i];break}}
  if(previous<=0||latest>=previous)return 0;
  return (previous-latest)/previous*100;
}
function availabilityScore(entry:WishlistEntry){
  let score=0;
  if(entry.record.preorder?.enabled&&entry.record.preorder.status!=='Cancelled')score+=3;
  if(entry.record.alerts.localStock.enabled)score+=2;
  if(entry.record.alerts.marketplace.enabled||entry.record.alerts.newListing.enabled||entry.record.alerts.usedListing.enabled)score+=1;
  return score;
}

function opportunityFor(entry:WishlistEntry){
  const states:OpportunityState[]=[];
  let score={Grail:36,High:26,Medium:14,Low:5}[entry.record.priority];
  if(entry.market!==undefined&&entry.record.targetPrice!==undefined){
    const gap=entry.market-entry.record.targetPrice;
    if(gap<-.01){states.push({label:'Under target',tone:'green'});score+=45+Math.min(25,Math.abs(gap)/Math.max(entry.record.targetPrice,1)*100)}
    else if(Math.abs(gap)<=.01){states.push({label:'At target',tone:'green'});score+=43}
    else if(entry.record.maximumPrice!==undefined&&entry.market<=entry.record.maximumPrice){states.push({label:'Below maximum',tone:'orange'});score+=12}
    else if(entry.record.maximumPrice!==undefined&&entry.market>entry.record.maximumPrice){states.push({label:'Above maximum',tone:'red'});score-=8}
  }
  if(entry.market!==undefined&&entry.msrp!==undefined){
    if(entry.market<entry.msrp){states.push({label:'Below MSRP',tone:'green'});score+=20}
    else if(Math.abs(entry.market-entry.msrp)<.01){states.push({label:'At MSRP',tone:'green'});score+=15}
  }
  const drop=priceDropPercent(entry);
  if(drop>=5){states.push({label:'Price drop '+drop.toFixed(0)+'%',tone:'green'});score+=Math.min(25,drop)}
  if(entry.record.preorder?.enabled&&entry.record.preorder.status!=='Cancelled'){states.push({label:'Preorder tracked',tone:'muted'});score+=7}
  if(dateSoon(entry.releaseDate||entry.record.preorder?.estimatedReleaseDate,30)){states.push({label:'Release soon',tone:'orange'});score+=10}
  if(entry.ownedQuantity>0){states.push({label:'Already owned',tone:'orange'});score-=5}
  if(entry.record.priority==='Grail'&&grailProgress(entry.record)>=100){states.push({label:'Grail funded',tone:'green'});score+=20}
  return {states,score};
}

function tabCount(name:MainTab,data:{activeEntries:WishlistEntry[];opportunities:WishlistEntry[];grails:WishlistEntry[];preorders:WishlistEntry[];planned:WishlistEntry[];archivedEntries:WishlistEntry[]}){
  if(name==='Items')return data.activeEntries.length;
  if(name==='Opportunities')return data.opportunities.length;
  if(name==='Grails')return data.grails.length;
  if(name==='Preorders')return data.preorders.length;
  if(name==='Planned')return data.planned.length;
  if(name==='Archive')return data.archivedEntries.length;
  return '';
}

function averageTargetGap(entries:WishlistEntry[]){
  const gaps=entries.filter(entry=>entry.market!==undefined&&entry.record.targetPrice!==undefined).map(entry=>entry.market!-entry.record.targetPrice!);
  if(!gaps.length)return 'Unavailable';
  const average=gaps.reduce((sum,n)=>sum+n,0)/gaps.length;
  return (average>=0?'+':'')+money(average);
}
function marketCoverage(entries:WishlistEntry[]){
  if(!entries.length)return '0 / 0';
  const covered=entries.filter(entry=>entry.market!==undefined).length;
  return covered+' / '+entries.length;
}
function today(){return new Date().toISOString().slice(0,10)}
function hasFilters(v:any){return Boolean(v.query||v.category!=='All'||v.manufacturer!=='All'||v.line!=='All'||v.condition!=='All'||v.retailer!=='All'||v.targetState!=='All'||v.availabilityFilter!=='All'||v.releaseFilter!=='All'||v.plannedFilter!=='All'||v.duplicateOnly||v.minPrice||v.maxPrice||v.priorityFilter.length)}

function StatCard({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){
  return <div className="vxw-stat"><span>{icon}{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
function InsightCard({label,value,sub}:{label:string;value:string;sub:string}){
  return <div className="vxw-insight-card"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
}
function MarketBadge({entry}:{entry:WishlistEntry}){return <span className={'vxw-source '+sourceClass(entry.marketSource)}>{sourceLabel(entry.marketSource,entry.record)}</span>}
function PriorityBadge({priority}:{priority:WishlistPriority}){return <span className={'vxw-priority '+priority.toLowerCase()}>{priority==='Grail'?<Gem/>:<Star/>}{priority}</span>}
function ItemArt({entry}:{entry:WishlistEntry}){return <div className="vxw-art">{entry.imageUrl?<img src={entry.imageUrl} alt=""/>:<ShoppingBag/>}</div>}
function StateBadge({state}:{state:OpportunityState}){return <span className={'vxw-state '+state.tone}>{state.label}</span>}

function answerWishlistQuestion(kind:string,entries:WishlistEntry[],financial:{budget?:number;currentSpend:number;currentPlanned:number;currentPreorders:number;nextPlanned:number;nextPreorders:number}){
  if(kind==='targets'){
    const rows=entries.filter(e=>e.market!==undefined&&e.record.targetPrice!==undefined&&e.market<=e.record.targetPrice).toSorted((x,y)=>(x.market!-x.record.targetPrice!)-(y.market!-y.record.targetPrice!));
    return rows.length?rows.slice(0,5).map(e=>e.name+' · '+money(e.market)+' vs '+money(e.record.targetPrice)+' target').join('\n'):'No Wishlist item with supported market data is currently at or below target.';
  }
  if(kind==='grail'){
    const rows=entries.filter(e=>e.record.priority==='Grail'&&grailProgress(e.record)<100).toSorted((x,y)=>grailProgress(y.record)-grailProgress(x.record));
    return rows.length?rows[0].name+' is closest at '+grailProgress(rows[0].record)+'% funded.':'No unfinished Grail goal is currently available.';
  }
  if(kind==='preorders'){
    const rows=entries.filter(e=>e.record.preorder?.enabled&&e.record.preorder.status!=='Cancelled'&&e.record.preorder.status!=='Delivered').toSorted((x,y)=>(x.record.preorder?.estimatedChargeDate||'9999').localeCompare(y.record.preorder?.estimatedChargeDate||'9999'));
    return rows.length?rows.slice(0,5).map(e=>e.name+' · '+money(preorderCommitment(e.record))+' · '+(e.record.preorder?.estimatedChargeDate||'charge date unknown')).join('\n'):'No active preorder commitment is recorded.';
  }
  if(kind==='duplicates'){
    const rows=entries.filter(e=>e.ownedQuantity>0);
    return rows.length?rows.slice(0,8).map(e=>e.name+' · already own '+e.ownedQuantity).join('\n'):'No active Wishlist item matches an owned Portfolio item.';
  }
  if(kind==='stale'){
    const cutoff=Date.now()-180*86400000;
    const rows=entries.filter(e=>!e.record.marketUpdatedAt||Date.parse(e.record.marketUpdatedAt)<cutoff);
    return rows.length?rows.slice(0,8).map(e=>e.name+' · '+(e.record.marketUpdatedAt?'last market update '+new Date(e.record.marketUpdatedAt).toLocaleDateString():'no saved market update')).join('\n'):'Every active item has a market update within the last six months.';
  }
  if(kind==='budget'){
    if(financial.budget===undefined)return 'Set a monthly hobby budget before VEXUM calculates budget impact.';
    const projected=financial.currentSpend+financial.currentPlanned+financial.currentPreorders;
    const delta=financial.budget-projected;
    return 'Recorded spend: '+money(financial.currentSpend)+'. Planned this month: '+money(financial.currentPlanned)+'. Preorders this month: '+money(financial.currentPreorders)+'. Projected against target: '+(delta>=0?money(delta)+' remaining.':money(Math.abs(delta))+' above target.');
  }
  return 'That intelligence question needs a data source that is not connected yet.';
}

function OverviewDashboard({entries,opportunities,grails,preorders,planned,financial,answer,onAsk,onOpen,onPlan}:{
  entries:WishlistEntry[];opportunities:Array<{entry:WishlistEntry;states:OpportunityState[];score:number}>;
  grails:WishlistEntry[];preorders:WishlistEntry[];planned:WishlistEntry[];
  financial:{budget?:number;currentSpend:number;currentPlanned:number;currentPreorders:number;nextPlanned:number;nextPreorders:number};
  answer:string;onAsk:(kind:string)=>void;onOpen:(entry:WishlistEntry)=>void;onPlan:(entry:WishlistEntry)=>void;
}){
  const months=Array.from(new Set(planned.map(entry=>entry.record.plannedMonth).filter(Boolean) as string[])).sort().slice(0,4);
  return <div className="vxw-overview-grid">
    <section className="vx-panel vxw-overview-opportunities">
      <header><div><TrendingDown/><span><strong>Opportunities</strong><small>Ranked from targets, price movement, priority, MSRP, release timing, and goal state.</small></span></div><b>{opportunities.length}</b></header>
      {opportunities.length?opportunities.map(({entry,states})=><button key={entry.id} onClick={()=>onOpen(entry)}><ItemArt entry={entry}/><span><strong>{entry.name}</strong><small>{money(entry.market)} current · {money(entry.record.targetPrice)} target</small><em>{states.slice(0,3).map(state=><StateBadge key={state.label} state={state}/>)}</em></span><ChevronRight/></button>):<OverviewEmpty text="No strong target/MSRP/price-drop/release opportunity is supported by the current data."/>}
    </section>
    <section className="vx-panel vxw-overview-plan"><header><div><CalendarDays/><span><strong>Purchase Plan</strong><small>Wishlist is the spending-plan source of truth.</small></span></div></header>
      {months.length?months.map(month=>{const rows=planned.filter(entry=>entry.record.plannedMonth===month);const total=rows.reduce((sum,entry)=>sum+(entry.market??entry.record.targetPrice??entry.record.maximumPrice??0)*entry.record.quantityWanted,0);return <button key={month} onClick={()=>onOpen(rows[0])}><span><b>{plannedLabel(month)}</b><small>{rows.length} item{rows.length===1?'':'s'}</small></span><strong>{money(total)}</strong></button>}):<OverviewEmpty text="Nothing is planned yet. Assign a month without committing to a purchase."/>}
    </section>
    <section className="vx-panel vxw-overview-preorders"><header><div><PackageCheck/><span><strong>Preorder Commitments</strong><small>Only balances you explicitly entered.</small></span></div></header>
      {preorders.length?preorders.slice(0,5).map(entry=><button key={entry.id} onClick={()=>onOpen(entry)}><ItemArt entry={entry}/><span><strong>{entry.name}</strong><small>{entry.record.preorder?.status} · charge {entry.record.preorder?.estimatedChargeDate||'unknown'}</small></span><b>{money(preorderCommitment(entry.record))}</b></button>):<OverviewEmpty text="No active preorder commitments."/>}
    </section>
    <section className="vx-panel vxw-overview-grails"><header><div><Gem/><span><strong>Grail Goals</strong><small>Savings remains separate from ordinary hobby spending.</small></span></div></header>
      {grails.length?grails.slice(0,5).map(entry=>{const pct=grailProgress(entry.record);return <button key={entry.id} onClick={()=>onOpen(entry)}><ItemArt entry={entry}/><span><strong>{entry.name}</strong><small>{money(entry.record.grail?.savedAmount)} / {money(entry.record.grail?.goalAmount??entry.record.targetPrice)}</small><i><em style={{width:pct+'%'}}/></i></span><b>{pct}%</b></button>}):<OverviewEmpty text="Mark a Wishlist item as Grail to create a focused goal."/>}
    </section>
    <section className="vx-panel vxw-overview-coverage"><header><div><Star/><span><strong>Wishlist Coverage</strong><small>Core user data loads independently from providers.</small></span></div></header><div className="vxw-coverage-grid">
      <span><b>{entries.filter(e=>e.marketSource==='live').length}</b><small>Live provider</small></span>
      <span><b>{entries.filter(e=>e.marketSource==='saved').length}</b><small>Saved values</small></span>
      <span><b>{entries.filter(e=>e.marketSource==='demo').length}</b><small>Demo-labeled</small></span>
      <span><b>{entries.filter(e=>e.marketSource==='unavailable').length}</b><small>Unavailable</small></span>
    </div></section>
    <section className="vx-panel vxw-overview-intel"><header><div><Eye/><span><strong>VEXUM Intelligence</strong><small>These answers are computed from your current Wishlist, Portfolio, and Financial workspace data.</small></span></div></header><div className="vxw-ai-questions">
      <button onClick={()=>onAsk('targets')}>Which items are under my target?</button>
      <button onClick={()=>onAsk('grail')}>Which Grail is closest to funded?</button>
      <button onClick={()=>onAsk('preorders')}>What preorders charge next?</button>
      <button onClick={()=>onAsk('duplicates')}>Which Wishlist items do I own?</button>
      <button onClick={()=>onAsk('stale')}>What hasn't updated in six months?</button>
      <button onClick={()=>onAsk('budget')}>What is this month's purchase-plan impact?</button>
    </div>{answer?<pre className="vxw-ai-answer">{answer}</pre>:<small className="vxw-ai-boundary">Completion, local stock, Social supply, Setup fit, and seller-quality questions remain unavailable until those real sources are connected.</small>}</section>
  </div>;
}
function OverviewEmpty({text}:{text:string}){return <div className="vxw-overview-empty"><span>{text}</span></div>}

function WishlistTable({entries,selectMode,selectedIds,onSelect,onOpen,onEdit,onPlan,onPurchase,onArchive,onRestore,onPriority,onAlerts}:{
  entries:WishlistEntry[];selectMode:boolean;selectedIds:string[];onSelect:(id:string)=>void;onOpen:(entry:WishlistEntry)=>void;onEdit:(entry:WishlistEntry)=>void;onPlan:(entry:WishlistEntry)=>void;onPurchase:(entry:WishlistEntry)=>void;onArchive:(entry:WishlistEntry)=>void;onRestore:(entry:WishlistEntry)=>void;onPriority:(entry:WishlistEntry)=>void;onAlerts:(entry:WishlistEntry)=>void;
}){
  return <section className="vxw-list-panel">
    <div className={'vxw-table-head '+(selectMode?'selecting':'')}><span>{selectMode?'Select':'Item'}</span><span>Priority</span><span>Target / Max</span><span>Market / MSRP</span><span>Condition</span><span>Plan</span><span>Signals</span><span>Actions</span></div>
    {entries.map(entry=>{const opp=opportunityFor(entry);const selected=selectedIds.includes(entry.id);return <button className={'vxw-table-row '+(selectMode?'selecting ':'')+(selected?'selected':'')} key={entry.id} onClick={()=>onOpen(entry)}>
      <span className="vxw-item-cell">{selectMode?<i className={'vxw-select-box '+(selected?'on':'')} onClick={event=>{event.stopPropagation();onSelect(entry.id)}}>{selected?<Check/>:null}</i>:<ItemArt entry={entry}/>}<span><strong>{entry.name}</strong><small>{entry.line} · {entry.category}</small>{entry.ownedQuantity>0?<em><AlertTriangle/>Already own {entry.ownedQuantity}</em>:null}</span></span>
      <PriorityBadge priority={entry.record.priority}/>
      <span className="vxw-market-cell"><b>{money(entry.record.targetPrice)}</b><small>Max {money(entry.record.maximumPrice)}</small></span>
      <span className="vxw-market-cell"><b>{money(entry.market)}</b><small>MSRP {money(entry.msrp)}</small></span>
      <span>{entry.record.desiredCondition}</span>
      <span className="vxw-plan-cell"><b>{plannedLabel(entry.record.plannedMonth)}</b><small>{entry.record.preorder?.enabled?'Preorder · '+entry.record.preorder.status:entry.record.deadline?'Deadline '+entry.record.deadline:'No deadline'}</small></span>
      <span className="vxw-signal-cell">{opp.states.slice(0,2).map(state=><StateBadge key={state.label} state={state}/>)}<small>{alertCount(entry.record)} alerts · <MarketBadge entry={entry}/></small></span>
      <span className="vxw-row-buttons" onClick={event=>event.stopPropagation()}>{entry.record.archived?<button onClick={()=>onRestore(entry)}>Restore</button>:<><button title="Cycle priority" onClick={()=>onPriority(entry)}><Star/></button><button title="Toggle alerts" onClick={()=>onAlerts(entry)}><Bell/></button><button title="Plan purchase" onClick={()=>onPlan(entry)}><CalendarDays/></button><button title="Mark purchased" onClick={()=>onPurchase(entry)}><PackageCheck/></button><button title="Edit target and preferences" onClick={()=>onEdit(entry)}><Pencil/></button><button title="Remove / archive" onClick={()=>onArchive(entry)}><Archive/></button></>}<ChevronRight/></span>
    </button>})}
  </section>;
}

function WishlistGrid({entries,selectMode,selectedIds,onSelect,onOpen,onEdit,onPlan,onPurchase,onArchive,onRestore,onPriority,onAlerts}:{
  entries:WishlistEntry[];selectMode:boolean;selectedIds:string[];onSelect:(id:string)=>void;onOpen:(entry:WishlistEntry)=>void;onEdit:(entry:WishlistEntry)=>void;onPlan:(entry:WishlistEntry)=>void;onPurchase:(entry:WishlistEntry)=>void;onArchive:(entry:WishlistEntry)=>void;onRestore:(entry:WishlistEntry)=>void;onPriority:(entry:WishlistEntry)=>void;onAlerts:(entry:WishlistEntry)=>void;
}){
  return <section className="vxw-grid">{entries.map(entry=>{const selected=selectedIds.includes(entry.id),states=opportunityFor(entry).states;return <article className={'vxw-card '+(selected?'selected':'')} key={entry.id} onClick={()=>onOpen(entry)}>
    <div className="vxw-card-top">{selectMode?<button className={'vxw-select-box '+(selected?'on':'')} onClick={event=>{event.stopPropagation();onSelect(entry.id)}}>{selected?<Check/>:null}</button>:<PriorityBadge priority={entry.record.priority}/>}<MarketBadge entry={entry}/></div>
    <ItemArt entry={entry}/>
    <div className="vxw-card-copy"><span>{entry.category} · {entry.line}</span><h3>{entry.name}</h3>{entry.ownedQuantity>0?<small className="warning"><AlertTriangle/>Already own {entry.ownedQuantity}</small>:null}<em className="vxw-card-states">{states.slice(0,2).map(state=><StateBadge key={state.label} state={state}/>)}</em></div>
    <div className="vxw-card-values"><span><small>Target / Max</small><b>{money(entry.record.targetPrice)}</b><em>{money(entry.record.maximumPrice)}</em></span><span><small>Market / MSRP</small><b>{money(entry.market)}</b><em>{money(entry.msrp)}</em></span></div>
    <div className="vxw-card-footer" onClick={event=>event.stopPropagation()}>{entry.record.archived?<button onClick={()=>onRestore(entry)}>Restore</button>:<><button title="Priority" onClick={()=>onPriority(entry)}><Star/></button><button title="Alerts" onClick={()=>onAlerts(entry)}><Bell/></button><button onClick={()=>onPlan(entry)}><CalendarDays/>Plan</button><button onClick={()=>onPurchase(entry)}><PackageCheck/>Purchased</button><button onClick={()=>onEdit(entry)}><Pencil/>Edit</button><button onClick={()=>onArchive(entry)}><Archive/>Remove</button></>}<button onClick={()=>onOpen(entry)}><Eye/>Open</button></div>
  </article>})}</section>;
}


function PlannedTimeline({entries}:{entries:WishlistEntry[]}){
  const groups=Array.from(new Set(entries.map(entry=>entry.record.plannedMonth).filter(Boolean) as string[])).toSorted();
  if(!groups.length)return null;
  return <section className="vxw-planned-timeline">{groups.map(month=>{
    const rows=entries.filter(entry=>entry.record.plannedMonth===month);
    const planned=rows.reduce((sum,entry)=>sum+(entry.market??entry.record.targetPrice??entry.record.maximumPrice??0)*entry.record.quantityWanted,0);
    const preorders=rows.reduce((sum,entry)=>sum+preorderCommitment(entry.record)*entry.record.quantityWanted,0);
    return <div key={month}><span><CalendarDays/><b>{plannedLabel(month)}</b><small>{rows.length} planned item{rows.length===1?'':'s'}</small></span><strong>{money(planned)}</strong>{preorders>0?<em>{money(preorders)} preorder balance</em>:<em>No preorder balance</em>}</div>;
  })}</section>;
}

function ArchiveInsights({entries}:{entries:WishlistEntry[]}){
  const purchased=entries.filter(entry=>entry.record.archiveReason==='purchased');
  const removed=entries.filter(entry=>entry.record.archiveReason==='removed');
  const avgDays=purchased.length?Math.round(purchased.reduce((sum,entry)=>sum+daysTracked(entry.record),0)/purchased.length):0;
  const belowTarget=purchased.filter(entry=>entry.record.purchasePrice!==undefined&&entry.record.targetPrice!==undefined&&entry.record.purchasePrice<=entry.record.targetPrice).length;
  const aboveTarget=purchased.filter(entry=>entry.record.purchasePrice!==undefined&&entry.record.targetPrice!==undefined&&entry.record.purchasePrice>entry.record.targetPrice).length;
  const savedVsInitial=purchased.reduce((sum,entry)=>sum+(entry.record.initialMarket!==undefined&&entry.record.purchasePrice!==undefined?entry.record.initialMarket-entry.record.purchasePrice:0),0);
  const savedVsMsrp=purchased.reduce((sum,entry)=>sum+(entry.msrp!==undefined&&entry.record.purchasePrice!==undefined?entry.msrp-entry.record.purchasePrice:0),0);
  const retailerCounts=new Map<string,number>();purchased.forEach(entry=>{const retailer=entry.record.purchase?.retailer;if(retailer)retailerCounts.set(retailer,(retailerCounts.get(retailer)||0)+1)});
  const categoryCounts=new Map<string,number>();purchased.forEach(entry=>categoryCounts.set(entry.category,(categoryCounts.get(entry.category)||0)+1));
  const topRetailer=[...retailerCounts.entries()].toSorted((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const topCategory=[...categoryCounts.entries()].toSorted((a,b)=>b[1]-a[1])[0]?.[0]||'—';
  const grailPurchased=purchased.filter(entry=>entry.record.priority==='Grail').length;
  return <section className="vxw-archive-insights expanded"><InsightCard label="Purchased" value={String(purchased.length)} sub="Archived as purchased"/><InsightCard label="Abandoned / removed" value={String(removed.length)} sub="Preserved history"/><InsightCard label="Avg. days tracked" value={String(avgDays)} sub="Wishlist → purchase"/><InsightCard label="At/below target" value={String(belowTarget)} sub={aboveTarget+' above target'}/><InsightCard label="Savings vs initial" value={money(savedVsInitial)} sub="Known initial values"/><InsightCard label="Savings vs MSRP" value={money(savedVsMsrp)} sub="Known MSRP only"/><InsightCard label="Top retailer" value={topRetailer} sub="Purchase records"/><InsightCard label="Top category" value={topCategory} sub="Purchased items"/><InsightCard label="Grails purchased" value={String(grailPurchased)} sub="Historical Grail conversions"/></section>;
}

function EmptyState({tab,filtered}:{tab:MainTab;filtered:boolean}){
  const text=filtered?'No Wishlist items match the current filters.':tab==='Opportunities'?'No supported opportunity state is active right now.':tab==='Grails'?'No items are marked Grail yet.':tab==='Preorders'?'No preorder commitments have been added yet.':tab==='Planned'?'No purchases are planned yet.':tab==='Archive'?'Purchased and removed Wishlist items will appear here.':'Your Wishlist is empty.';
  return <section className="vxw-empty"><Star/><strong>{filtered?'No matches':tab+' is empty'}</strong><p>{text}</p>{!filtered&&tab==='Items'?<div><button className="vxw-primary" onClick={()=>window.location.assign('/search')}><Search/>Explore Search</button><button onClick={()=>window.location.assign('/search')}><Eye/>Identify Product</button></div>:null}</section>;
}

function DetailDrawer({entry,tab,setTab,marketRefreshing,marketError,financial,onSetBudget,onRefreshMarket,onClose,onEdit,onPlan,onPurchase,onArchive,onRestore}:{
  entry:WishlistEntry;tab:DetailTab;setTab:(tab:DetailTab)=>void;marketRefreshing:boolean;marketError:string;
  financial:{budget?:number;currentSpend:number;currentPlanned:number;currentPreorders:number;nextPlanned:number;nextPreorders:number};
  onSetBudget:()=>void;onRefreshMarket:()=>void;onClose:()=>void;onEdit:()=>void;onPlan:()=>void;onPurchase:()=>void;onArchive:()=>void;onRestore:()=>void;
}){
  const plannedAmount=(entry.record.preorder?.enabled?preorderCommitment(entry.record):entry.market??entry.record.targetPrice??entry.record.maximumPrice);
  const pct=grailProgress(entry.record),opp=opportunityFor(entry);
  return <div className="vxw-drawer-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)onClose()}}>
    <aside className="vxw-drawer">
      <header><div><span>WISHLIST ITEM</span><h2>{entry.name}</h2><p>{entry.line} · {entry.category}</p></div><button onClick={onClose}><X/></button></header>
      <div className="vxw-detail-summary"><ItemArt entry={entry}/><div><PriorityBadge priority={entry.record.priority}/><strong>{money(entry.market)}</strong><MarketBadge entry={entry}/>{opp.states.map(state=><StateBadge key={state.label} state={state}/>)}{entry.ownedQuantity>0?<span className="vxw-duplicate"><AlertTriangle/>You already own {entry.ownedQuantity}. Purchasing can intentionally add another copy.</span>:null}</div></div>
      <div className="vxw-detail-tabs">{(['Overview','Market','Availability','Planning','History'] as DetailTab[]).map(name=><button key={name} className={tab===name?'active':''} onClick={()=>setTab(name)}>{name}</button>)}</div>
      <div className="vxw-detail-body">
        {tab==='Overview'?<div className="vxw-detail-stack">
          <InfoGrid rows={[
            ['Canonical product ID',entry.productId],['Manufacturer',entry.manufacturer],['Priority',entry.record.priority],
            ['Target',money(entry.record.targetPrice)],['Maximum',money(entry.record.maximumPrice)],['Current market',money(entry.market)],['MSRP',money(entry.msrp)],
            ['Quantity wanted',String(entry.record.quantityWanted)],['Desired condition',entry.record.desiredCondition],['Marketplace preference',entry.record.marketplacePreference],
            ['Retailers',entry.record.retailers.join(', ')||'Any retailer'],['Deadline',entry.record.deadline||'None'],['Planned',plannedLabel(entry.record.plannedMonth)],
            ['Alerts',alertCount(entry.record)+' active rules'],['Ownership',entry.ownedQuantity?entry.ownedQuantity+' owned':'Not owned']
          ]}/>
          <section className="vxw-completion-boundary"><Target/><div><strong>Collection completion intelligence</strong><p>Ownership is linked now. Exact “8/9 → 9/9” completion requires a canonical set-membership catalog; VEXUM will not invent missing-set counts.</p></div></section>
          {entry.record.notes?<section className="vxw-note"><span>Notes</span><p>{entry.record.notes}</p></section>:null}
        </div>:null}
        {tab==='Market'?<div className="vxw-detail-stack">
          <section className={'vxw-provider-state '+sourceClass(entry.marketSource)}><CircleDollarSign/><div><strong>{sourceLabel(entry.marketSource,entry.record)}</strong><p>{entry.marketSource==='demo'?'This value is explicitly demo data.':entry.marketSource==='saved'?'This value is stored in your VEXUM workspace.':entry.marketSource==='live'?'This value came from a connected market provider and includes freshness below.':'No provider currently supplies a supported value.'}</p></div><button onClick={onRefreshMarket} disabled={marketRefreshing}><RefreshCw/>{marketRefreshing?'Checking…':'Refresh'}</button></section>
          {marketError?<div className="vxw-market-error"><AlertTriangle/>{marketError}</div>:null}
          <div className="vxw-market-cards"><span><small>Current</small><b>{money(entry.market)}</b></span><span><small>Target</small><b>{money(entry.record.targetPrice)}</b></span><span><small>Maximum</small><b>{money(entry.record.maximumPrice)}</b></span><span><small>MSRP</small><b>{money(entry.msrp)}</b></span></div>
          <TargetComparison entry={entry}/>
          <WishlistPriceChart entry={entry}/>
          <InfoGrid rows={[
            ['Market source',sourceLabel(entry.marketSource,entry.record)],['Updated',entry.record.marketUpdatedAt?new Date(entry.record.marketUpdatedAt).toLocaleString():'Unavailable'],
            ['Confidence',entry.record.marketConfidence!==undefined?Math.round(entry.record.marketConfidence*100)+'%':'Unavailable'],['History points',String(entry.marketHistory.length)]
          ]}/>
        </div>:null}
        {tab==='Availability'?<div className="vxw-detail-stack">
          <section className="vxw-provider-state unavailable"><Store/><div><strong>Retail, marketplace, and local inventory adapters are not connected here</strong><p>Your acquisition preferences and alert rules are saved. Stock, seller, distance, listing freshness, and prices remain absent until a real provider returns them.</p></div></section>
          <InfoGrid rows={[
            ['Preferred retailers',entry.record.retailers.join(', ')||'Any retailer'],['Acquisition preference',entry.record.marketplacePreference],
            ['Desired condition',entry.record.desiredCondition],['Local radius',String(entry.record.alerts.localStock.radiusMiles||'Not set')],
            ['Local alerts',ruleLabel(entry.record,'localStock')],['Restock alerts',ruleLabel(entry.record,'restock')],
            ['Marketplace alerts',ruleLabel(entry.record,'marketplace')],['Used listing alerts',ruleLabel(entry.record,'usedListing')]
          ]}/>
        </div>:null}
        {tab==='Planning'?<div className="vxw-detail-stack">
          <section className="vxw-intelligence"><WalletCards/><div><span>PURCHASE INTELLIGENCE</span><strong>{plannedAmount!==undefined?money(plannedAmount*entry.record.quantityWanted):'Amount not set'}</strong><p>{plannedAmount!==undefined?'Known Wishlist/preorder amount for '+entry.record.quantityWanted+' item'+(entry.record.quantityWanted===1?'':'s')+'.':'Set a target, maximum, market value, or preorder balance to calculate known exposure.'}</p></div></section>
          <div className="vxw-neutral-grid"><span><small>Planned month</small><b>{plannedLabel(entry.record.plannedMonth)}</b></span><span><small>Maximum exposure</small><b>{entry.record.maximumPrice!==undefined?money(entry.record.maximumPrice*entry.record.quantityWanted):'Not set'}</b></span><span><small>Hobby budget remaining</small><b>{financial.budget!==undefined?money(financial.budget-financial.currentSpend):'Not configured'}</b><em>{financial.budget!==undefined?'Based on recorded Portfolio purchases this month.':'Set a hobby budget to enable factual purchase impact.'}</em></span></div>
          {financial.budget!==undefined?<section className="vxw-budget-impact">
            <div><small>Current recorded hobby spend</small><b>{money(financial.currentSpend)}</b></div>
            <div><small>Projected after this item</small><b>{money(financial.currentSpend+(plannedAmount||0)*entry.record.quantityWanted)}</b></div>
            <div><small>Current-month preorder commitments</small><b>{money(financial.currentPreorders)}</b></div>
            <div><small>Current-month planned Wishlist</small><b>{money(financial.currentPlanned)}</b></div>
            <p>{(()=>{const projected=financial.currentSpend+(plannedAmount||0)*entry.record.quantityWanted;const delta=projected-financial.budget!;return delta>0?'This purchase would put recorded hobby spending '+money(delta)+' above your current monthly target.':'This purchase would leave '+money(Math.max(0,-delta))+' remaining against your current monthly target.'})()}</p>
            <small>Next month: {money(financial.nextPlanned)} planned Wishlist + {money(financial.nextPreorders)} known preorder balances.</small>
          </section>:<button className="vxw-budget-setup" onClick={onSetBudget}><WalletCards/>Set Hobby Budget</button>}
          {entry.record.priority==='Grail'?<section className="vxw-goal-block"><header><div><Gem/><strong>Grail savings goal</strong></div><b>{pct}%</b></header><div className="vxw-progress"><i style={{width:pct+'%'}}/></div><p>{money(entry.record.grail?.savedAmount)} saved of {money(entry.record.grail?.goalAmount??entry.record.targetPrice)} · {entry.record.grail?.status||'Not Started'}{entry.record.grail?.deadline?' · '+entry.record.grail.deadline:''}</p></section>:null}
          {entry.record.preorder?.enabled?<section className="vxw-preorder-block"><header><PackageCheck/><strong>Preorder commitment</strong><span>{entry.record.preorder.status}</span></header><InfoGrid rows={[
            ['Retailer',entry.record.preorder.retailer||'Unknown'],['Total price',money(entry.record.preorder.totalPrice)],['Deposit',money(entry.record.preorder.depositPaid)],
            ['Remaining balance',money(preorderCommitment(entry.record))],['Preorder date',entry.record.preorder.preorderDate||'Unknown'],['Charge date',entry.record.preorder.estimatedChargeDate||'Unknown'],
            ['Release date',entry.record.preorder.estimatedReleaseDate||'Unknown'],['Cancellation deadline',entry.record.preorder.cancellationDeadline||'Unknown']
          ]}/></section>:null}
          <button className="vxw-primary wide" onClick={onPlan}><CalendarDays/>Plan Purchase</button>
        </div>:null}
        {tab==='History'?<div className="vxw-history">{entry.record.history.length?entry.record.history.map((row,index)=><div key={row.at+index}><History/><span><strong>{row.event}</strong><small>{new Date(row.at).toLocaleString()} · {row.type}</small></span></div>):<div><History/><span><strong>No recorded events</strong><small>New Wishlist changes will appear here.</small></span></div>}</div>:null}
      </div>
      <footer>{entry.record.archived?<><button onClick={onRestore}>Restore to Wishlist</button><button className="vxw-primary" onClick={onClose}>Close</button></>:<><button onClick={onArchive}><Archive/>Archive</button><span/><button onClick={onEdit}><Pencil/>Edit</button><button onClick={onPlan}><CalendarDays/>Plan Purchase</button><button className="vxw-primary" onClick={onPurchase}><PackageCheck/>Mark Purchased</button></>}</footer>
    </aside>
  </div>;
}

function TargetComparison({entry}:{entry:WishlistEntry}){
  if(entry.market===undefined)return <p className="vxw-neutral">Market data unavailable. Your target and maximum remain useful without a quote.</p>;
  const parts:string[]=[];
  if(entry.record.targetPrice!==undefined){
    const diff=entry.market-entry.record.targetPrice;
    parts.push(Math.abs(diff)<.01?'Current value is at your target.':diff>0?money(diff)+' above target.':money(Math.abs(diff))+' below target.');
  }
  if(entry.record.maximumPrice!==undefined){
    const diff=entry.market-entry.record.maximumPrice;
    parts.push(Math.abs(diff)<.01?'Current value is at your maximum.':diff>0?money(diff)+' above maximum.':money(Math.abs(diff))+' below maximum.');
  }
  if(!parts.length)parts.push('Set a target and maximum to make market movement actionable.');
  return <p className="vxw-neutral">{parts.join(' ')}</p>;
}

function WishlistPriceChart({entry}:{entry:WishlistEntry}){
  const [range,setRange]=useState('ALL');
  const all=entry.marketHistory.filter(point=>finite(point.value));
  const days=range==='7D'?7:range==='30D'?30:range==='3M'?90:range==='6M'?180:range==='1Y'?365:Infinity;
  const cutoff=days===Infinity?0:Date.now()-days*86400000;
  const points=all.filter(point=>Date.parse(point.date)>=cutoff);
  const values=[...points.map(p=>p.value),entry.record.targetPrice,entry.msrp].filter((v):v is number=>typeof v==='number'&&Number.isFinite(v));
  if(!points.length)return <section className="vxw-chart-empty"><BarChart3/><strong>Price history unavailable</strong><p>Refresh a supported market source or accumulate saved values to build history.</p></section>;
  const min=Math.min(...values),max=Math.max(...values),pad=Math.max(1,(max-min)*.15),lo=min-pad,hi=max+pad;
  const x=(index:number)=>points.length===1?350:index/(points.length-1)*680+10;
  const y=(value:number)=>210-(value-lo)/(hi-lo)*180;
  const path=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.value).toFixed(1)).join(' ');
  return <section className="vxw-price-chart">
    <header><div><strong>Price history</strong><span>{points.length} saved point{points.length===1?'':'s'}</span></div><div>{['7D','30D','3M','6M','1Y','ALL'].map(value=><button key={value} className={range===value?'active':''} onClick={()=>setRange(value)}>{value}</button>)}</div></header>
    <svg viewBox="0 0 700 230" preserveAspectRatio="none">{[40,85,130,175,210].map(row=><line key={row} x1="10" y1={row} x2="690" y2={row} stroke="#202227"/>)}
      {entry.msrp!==undefined?<line x1="10" y1={y(entry.msrp)} x2="690" y2={y(entry.msrp)} stroke="#8c9098" strokeDasharray="5 5"/>:null}
      {entry.record.targetPrice!==undefined?<line x1="10" y1={y(entry.record.targetPrice)} x2="690" y2={y(entry.record.targetPrice)} stroke="#25e2a0" strokeDasharray="4 5"/>:null}
      <path d={path} fill="none" stroke="#ff2338" strokeWidth="3"/>{points.map((p,i)=><circle key={p.date+i} cx={x(i)} cy={y(p.value)} r="3.5" fill="#ff2338"/>)}
    </svg>
    <footer><span><i className="red"/>Market history</span><span><i className="green"/>Target</span><span><i className="gray"/>MSRP</span></footer>
  </section>;
}

function InfoGrid({rows}:{rows:Array<[string,string]>}){return <div className="vxw-info-grid">{rows.map(([label,value])=><span key={label}><small>{label}</small><b>{value}</b></span>)}</div>}
function ruleLabel(record:WishlistRecord,key:WishlistAlertKey){const rule=record.alerts[key];return rule.enabled?rule.frequency:'Off'}

function EditModal({entry,onClose,onSave}:{entry:WishlistEntry;onClose:()=>void;onSave:(record:WishlistRecord)=>void}){
  const original=entry.record;
  const [priority,setPriority]=useState<WishlistPriority>(original.priority);
  const [target,setTarget]=useState(original.targetPrice===undefined?'':String(original.targetPrice));
  const [maximum,setMaximum]=useState(original.maximumPrice===undefined?'':String(original.maximumPrice));
  const [desiredCondition,setDesiredCondition]=useState(original.desiredCondition);
  const [retailers,setRetailers]=useState(original.retailers.join(', '));
  const [marketplacePreference,setMarketplacePreference]=useState(original.marketplacePreference);
  const [quantity,setQuantity]=useState(original.quantityWanted);
  const [deadline,setDeadline]=useState(original.deadline||'');
  const [planMode,setPlanMode]=useState(original.plannedMonth==='Someday'?'Someday':original.plannedMonth?'Specific':'No Plan');
  const [plannedMonth,setPlannedMonth]=useState(original.plannedMonth&&original.plannedMonth!=='Someday'?original.plannedMonth:'');
  const [notes,setNotes]=useState(original.notes);
  const [alerts,setAlerts]=useState(original.alerts);
  const [grailGoal,setGrailGoal]=useState(original.grail?.goalAmount===undefined?'':String(original.grail.goalAmount));
  const [grailSaved,setGrailSaved]=useState(original.grail?.savedAmount===undefined?'':String(original.grail.savedAmount));
  const [grailDeadline,setGrailDeadline]=useState(original.grail?.deadline||'');
  const [grailStatus,setGrailStatus]=useState(original.grail?.status||'Not Started');
  const [preorderEnabled,setPreorderEnabled]=useState(Boolean(original.preorder?.enabled));
  const [preorderRetailer,setPreorderRetailer]=useState(original.preorder?.retailer||'');
  const [preorderPrice,setPreorderPrice]=useState(original.preorder?.totalPrice===undefined?'':String(original.preorder.totalPrice));
  const [deposit,setDeposit]=useState(original.preorder?.depositPaid===undefined?'':String(original.preorder.depositPaid));
  const [balance,setBalance]=useState(original.preorder?.remainingBalance===undefined?'':String(original.preorder.remainingBalance));
  const [preorderDate,setPreorderDate]=useState(original.preorder?.preorderDate||'');
  const [chargeDate,setChargeDate]=useState(original.preorder?.estimatedChargeDate||'');
  const [releaseDate,setReleaseDate]=useState(original.preorder?.estimatedReleaseDate||'');
  const [cancelDate,setCancelDate]=useState(original.preorder?.cancellationDeadline||'');
  const [preorderStatus,setPreorderStatus]=useState(original.preorder?.status||'Planned');
  const [preorderNotes,setPreorderNotes]=useState(original.preorder?.notes||'');

  function submit(){
    const targetPrice=parseNumber(target),maximumPrice=parseNumber(maximum),totalPrice=parseNumber(preorderPrice),depositPaid=parseNumber(deposit);
    const remainingBalance=parseNumber(balance)??(totalPrice!==undefined?Math.max(0,totalPrice-(depositPaid||0)):undefined);
    const plan=planMode==='Someday'?'Someday':planMode==='This Month'?new Date().toISOString().slice(0,7):planMode==='Next Month'?nextMonth():planMode==='Specific'?plannedMonth:undefined;
    const next=wishlistEvent(original,'updated','Wishlist settings updated',{
      priority,targetPrice,maximumPrice,desiredCondition,retailers:retailers.split(',').map(v=>v.trim()).filter(Boolean),
      marketplacePreference:marketplacePreference as WishlistRecord['marketplacePreference'],quantityWanted:Math.max(1,quantity||1),
      deadline:deadline||undefined,plannedMonth:plan,notes,alerts,
      grail:priority==='Grail'?{goalAmount:parseNumber(grailGoal),savedAmount:parseNumber(grailSaved),deadline:grailDeadline||undefined,status:grailStatus as any}:undefined,
      preorder:preorderEnabled?{enabled:true,retailer:preorderRetailer||undefined,totalPrice,depositPaid,remainingBalance,preorderDate:preorderDate||undefined,estimatedChargeDate:chargeDate||undefined,estimatedReleaseDate:releaseDate||undefined,cancellationDeadline:cancelDate||undefined,status:preorderStatus as any,notes:preorderNotes||undefined}:undefined
    });
    onSave(next);
  }

  return <div className="vxw-modal-backdrop"><div className="vxw-modal vxw-edit-modal">
    <header><div><span>EDIT WISHLIST ITEM</span><h2>{entry.name}</h2><p>Product identity stays canonical; these fields describe how you want to acquire it.</p></div><button onClick={onClose}><X/></button></header>
    <div className="vxw-modal-scroll">
      <section className="vxw-form-section"><h3>Acquisition</h3><div className="vxw-form-grid three">
        <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as WishlistPriority)}><option>Low</option><option>Medium</option><option>High</option><option>Grail</option></select></label>
        <label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label>
        <label>Desired condition<select value={desiredCondition} onChange={e=>setDesiredCondition(e.target.value)}>{conditionOptions(entry.category).map(value=><option key={value}>{value}</option>)}</select></label>
        <label>Target price<input inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)} placeholder="Optional"/></label>
        <label>Maximum price<input inputMode="decimal" value={maximum} onChange={e=>setMaximum(e.target.value)} placeholder="Optional"/></label>
        <label>Deadline<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label>
        <label>Purchase plan<select value={planMode} onChange={e=>setPlanMode(e.target.value)}><option>No Plan</option><option>This Month</option><option>Next Month</option><option>Specific</option><option>Someday</option></select></label>
        {planMode==='Specific'?<label>Specific month<input type="month" value={plannedMonth} onChange={e=>setPlannedMonth(e.target.value)}/></label>:null}
        <label>Acquisition source<select value={marketplacePreference} onChange={e=>setMarketplacePreference(e.target.value as WishlistRecord['marketplacePreference'])}><option>Any source</option><option>Retail only</option><option>Marketplace acceptable</option><option>Local only</option><option>Used acceptable</option><option>New only</option></select></label>
        <label className="wide">Preferred retailers<input value={retailers} onChange={e=>setRetailers(e.target.value)} placeholder="Target, Walmart, GameStop, eBay, Entertainment Earth"/></label>
        <label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Edition, seller, condition, deadline, trade notes…"/></label>
      </div></section>

      <section className="vxw-form-section"><div className="vxw-section-toggle"><h3>Radar / Alert Rules</h3><button onClick={()=>setAlerts(alertDefaults(priority))}>Apply {priority} defaults</button></div><div className="vxw-alert-rule-grid">{WISHLIST_ALERT_KEYS.map(key=><div key={key}><label><input type="checkbox" checked={alerts[key].enabled} onChange={e=>setAlerts(current=>({...current,[key]:{...current[key],enabled:e.target.checked,frequency:e.target.checked&&current[key].frequency==='Off'?'Daily Digest':e.target.checked?current[key].frequency:'Off'}}))}/><span>{WISHLIST_ALERT_LABELS[key]}</span></label><select value={alerts[key].frequency} onChange={e=>setAlerts(current=>({...current,[key]:{...current[key],frequency:e.target.value as WishlistAlertFrequency,enabled:e.target.value!=='Off'}}))}><option>Immediate</option><option>Daily Digest</option><option>Weekly Digest</option><option>Off</option></select>{key==='localStock'?<select value={alerts[key].radiusMiles||25} onChange={e=>setAlerts(current=>({...current,[key]:{...current[key],radiusMiles:Number(e.target.value) as 5|10|25|50}}))}><option value="5">5 mi</option><option value="10">10 mi</option><option value="25">25 mi</option><option value="50">50 mi</option></select>:null}</div>)}</div></section>

      {priority==='Grail'?<section className="vxw-form-section"><h3>Grail Savings Goal</h3><div className="vxw-form-grid"><label>Goal amount<input value={grailGoal} onChange={e=>setGrailGoal(e.target.value)} placeholder={target||'0.00'}/></label><label>Saved amount<input value={grailSaved} onChange={e=>setGrailSaved(e.target.value)}/></label><label>Goal deadline<input type="date" value={grailDeadline} onChange={e=>setGrailDeadline(e.target.value)}/></label><label>Status<select value={grailStatus} onChange={e=>setGrailStatus(e.target.value as any)}><option>Not Started</option><option>Saving</option><option>Goal Reached</option><option>Paused</option><option>Purchased</option></select></label></div></section>:null}

      <section className="vxw-form-section"><div className="vxw-section-toggle"><h3>Preorder Commitment</h3><label><input type="checkbox" checked={preorderEnabled} onChange={e=>setPreorderEnabled(e.target.checked)}/><span>{preorderEnabled?'Enabled':'Off'}</span></label></div>{preorderEnabled?<div className="vxw-form-grid three">
        <label>Retailer<input value={preorderRetailer} onChange={e=>setPreorderRetailer(e.target.value)}/></label><label>Total price<input value={preorderPrice} onChange={e=>setPreorderPrice(e.target.value)}/></label><label>Deposit paid<input value={deposit} onChange={e=>setDeposit(e.target.value)}/></label>
        <label>Remaining balance<input value={balance} onChange={e=>setBalance(e.target.value)} placeholder="Auto if blank"/></label><label>Status<select value={preorderStatus} onChange={e=>setPreorderStatus(e.target.value as any)}><option>Planned</option><option>Preordered</option><option>Deposit Paid</option><option>Awaiting Release</option><option>Charging Soon</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select></label><label>Preorder date<input type="date" value={preorderDate} onChange={e=>setPreorderDate(e.target.value)}/></label>
        <label>Expected charge<input type="date" value={chargeDate} onChange={e=>setChargeDate(e.target.value)}/></label><label>Expected release<input type="date" value={releaseDate} onChange={e=>setReleaseDate(e.target.value)}/></label><label>Cancellation deadline<input type="date" value={cancelDate} onChange={e=>setCancelDate(e.target.value)}/></label>
        <label className="wide">Preorder notes<textarea rows={2} value={preorderNotes} onChange={e=>setPreorderNotes(e.target.value)}/></label>
      </div>:null}</section>
    </div>
    <footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={submit}><Check/>Save Changes</button></footer>
  </div></div>;
}

function PlanModal({entry,onClose,onSave}:{entry:WishlistEntry;onClose:()=>void;onSave:(month:string,deadline:string,quantity:number)=>void}){
  const [mode,setMode]=useState(entry.record.plannedMonth==='Someday'?'Someday':entry.record.plannedMonth?'Specific':'This Month');
  const [month,setMonth]=useState(entry.record.plannedMonth&&entry.record.plannedMonth!=='Someday'?entry.record.plannedMonth:new Date().toISOString().slice(0,7));
  const [deadline,setDeadline]=useState(entry.record.deadline||'');
  const [quantity,setQuantity]=useState(entry.record.quantityWanted);
  const planned=mode==='Someday'?'Someday':mode==='This Month'?new Date().toISOString().slice(0,7):mode==='Next Month'?nextMonth():mode==='Specific'?month:'';
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>PLAN PURCHASE</span><h2>{entry.name}</h2><p>Planning timing is not a purchase recommendation.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll"><div className="vxw-form-grid"><label>Plan<select value={mode} onChange={e=>setMode(e.target.value)}><option>This Month</option><option>Next Month</option><option>Specific</option><option>Someday</option><option>No Plan</option></select></label>{mode==='Specific'?<label>Month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label>:null}<label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label><label>Deadline<input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></label></div><section className="vxw-provider-state unavailable compact"><WalletCards/><div><strong>Financial impact requires real Financial data</strong><p>The plan is saved now and can be consumed by Financial forecasting without duplicating the commitment.</p></div></section></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={()=>onSave(planned,deadline,quantity)}><CalendarDays/>Save Plan</button></footer></div></div>;
}

function PurchaseModal({entry,busy,onClose,onConfirm}:{entry:WishlistEntry;busy:boolean;onClose:()=>void;onConfirm:(purchase:NonNullable<WishlistRecord['purchase']>)=>void}){
  const [price,setPrice]=useState(String(entry.record.preorder?.totalPrice??entry.market??entry.record.targetPrice??0));
  const [shipping,setShipping]=useState('0');
  const [tax,setTax]=useState('0');
  const [retailer,setRetailer]=useState(entry.record.preorder?.retailer||entry.record.retailers[0]||'');
  const [date,setDate]=useState(today());
  const [condition,setCondition]=useState(entry.record.desiredCondition==='Any'?conditionOptions(entry.category)[1]||'Any':entry.record.desiredCondition);
  const [quantity,setQuantity]=useState(entry.record.quantityWanted);
  const [receipt,setReceipt]=useState('');
  const [delivery,setDelivery]=useState('');
  const unit=Math.max(0,Number(price)||0),ship=Math.max(0,Number(shipping)||0),taxValue=Math.max(0,Number(tax)||0),total=unit*quantity+ship+taxValue;
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>MARK PURCHASED</span><h2>{entry.name}</h2><p>Creates/updates the Portfolio item, archives Wishlist history, and stops irrelevant alerts.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll">{entry.ownedQuantity>0?<div className="vxw-purchase-warning"><AlertTriangle/><span>You already own {entry.ownedQuantity}. Confirming adds another owned copy.</span></div>:null}<div className="vxw-form-grid">
    <label>Unit price paid<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)))}/></label>
    <label>Shipping<input inputMode="decimal" value={shipping} onChange={e=>setShipping(e.target.value)}/></label><label>Tax<input inputMode="decimal" value={tax} onChange={e=>setTax(e.target.value)}/></label>
    <label>Retailer / seller<input value={retailer} onChange={e=>setRetailer(e.target.value)}/></label><label>Purchase date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}>{conditionOptions(entry.category).map(value=><option key={value}>{value}</option>)}</select></label><label>Expected delivery<input type="date" value={delivery} onChange={e=>setDelivery(e.target.value)}/></label>
    <label className="wide">Receipt / order reference<input value={receipt} onChange={e=>setReceipt(e.target.value)} placeholder="Optional URL or order reference"/></label>
  </div><div className="vxw-purchase-total"><span>Estimated recorded total</span><strong>{money(total)}</strong></div></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" disabled={busy} onClick={()=>onConfirm({retailer:retailer||undefined,unitPrice:unit,shipping:ship,tax:taxValue,total,purchaseDate:date,condition,quantity,receipt:receipt||undefined,expectedDelivery:delivery||undefined})}><PackageCheck/>{busy?'Saving…':'Mark Purchased'}</button></footer></div></div>;
}

function BulkModal({entries,onClose,onApply}:{entries:WishlistEntry[];onClose:()=>void;onApply:(patch:{priority?:WishlistPriority;plannedMonth?:string;condition?:string;retailer?:string;alerts?:'on'|'off';archive?:boolean})=>void}){
  const [priority,setPriority]=useState('');
  const [plan,setPlan]=useState('');
  const [condition,setCondition]=useState('');
  const [retailer,setRetailer]=useState('');
  const [alerts,setAlerts]=useState('');
  const [archive,setArchive]=useState(false);
  const options=Array.from(new Set(entries.flatMap(entry=>conditionOptions(entry.category))));
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>BULK EDIT</span><h2>{entries.length} Wishlist items</h2><p>Blank fields are left unchanged.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll"><div className="vxw-form-grid">
    <label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option value="">No change</option><option>Low</option><option>Medium</option><option>High</option><option>Grail</option></select></label>
    <label>Planned month<input type="month" value={plan} onChange={e=>setPlan(e.target.value)}/></label>
    <label>Condition<select value={condition} onChange={e=>setCondition(e.target.value)}><option value="">No change</option>{options.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>Add retailer<input value={retailer} onChange={e=>setRetailer(e.target.value)} placeholder="Optional"/></label>
    <label>Alerts<select value={alerts} onChange={e=>setAlerts(e.target.value)}><option value="">No change</option><option value="on">Priority defaults on</option><option value="off">All off</option></select></label>
    <label className="vxw-check-filter"><input type="checkbox" checked={archive} onChange={e=>setArchive(e.target.checked)}/>Archive selected</label>
  </div></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={()=>onApply({priority:priority as WishlistPriority||undefined,plannedMonth:plan||undefined,condition:condition||undefined,retailer:retailer||undefined,alerts:alerts as 'on'|'off'||undefined,archive})}><Check/>Apply to {entries.length}</button></footer></div></div>;
}

function BudgetModal({value,onClose,onSave}:{value?:number;onClose:()=>void;onSave:(value:number)=>void}){
  const [budget,setBudget]=useState(value===undefined?'':String(value));
  const parsed=Math.max(0,Number(budget)||0);
  return <div className="vxw-modal-backdrop"><div className="vxw-modal small"><header><div><span>FINANCIAL CONTEXT</span><h2>Monthly Hobby Budget</h2><p>This is a target for context, not a spending restriction.</p></div><button onClick={onClose}><X/></button></header><div className="vxw-modal-scroll"><div className="vxw-form-grid"><label className="wide">Monthly hobby budget<input inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="500"/></label></div><section className="vxw-provider-state saved compact"><WalletCards/><div><strong>Workspace-backed target</strong><p>VEXUM compares this target with purchase prices recorded in Portfolio plus Wishlist/preorder commitments. It does not infer bank balances.</p></div></section></div><footer><button onClick={onClose}>Cancel</button><button className="vxw-primary" onClick={()=>onSave(parsed)}><Check/>Save Budget</button></footer></div></div>;
}

import type {Collection,Item,Store} from '../../lib/model';
import {normalizeSetupData,placementForPortfolioItem,setupLocationLabel} from '../../lib/setup';

export type AuditKind='missing-image'|'missing-price'|'missing-date'|'missing-condition'|'possible-duplicate'|'missing-match'|'missing-upc'|'missing-sku'|'missing-location'|'missing-receipt'|'sold-active'|'invalid-collection'|'unassigned';
export type AuditIssue={id:string;kind:AuditKind;itemId:string;label:string;detail:string;severity:'high'|'medium'|'low'};

export function portfolioMoney(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:value<100?2:0}).format(Number.isFinite(value)?value:0);
}
export function norm(value:unknown){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}

export function collectionPath(collectionId:string,collections:Collection[]){
  if(!collectionId)return [] as Collection[];
  const map=new Map(collections.map(collection=>[collection.id,collection]));
  const result:Collection[]=[];const seen=new Set<string>();
  let current=map.get(collectionId);
  while(current&&!seen.has(current.id)){
    seen.add(current.id);result.unshift(current);
    current=current.parentCollectionId?map.get(current.parentCollectionId):undefined;
  }
  return result;
}

export function descendantIds(collectionId:string,collections:Collection[]){
  const ids=new Set<string>([collectionId]);
  let changed=true;
  while(changed){
    changed=false;
    for(const collection of collections){
      if(collection.parentCollectionId&&ids.has(collection.parentCollectionId)&&!ids.has(collection.id)){
        ids.add(collection.id);changed=true;
      }
    }
  }
  return ids;
}

export function itemLocation(store:Store,item:Item){
  const setup=normalizeSetupData(store.setup);
  const placement=placementForPortfolioItem(setup,item.id);
  if(placement)return setupLocationLabel(setup,placement.setupId,placement.setupObjectId);
  return item.location.trim()?item.location.trim():'Unassigned';
}

export function collectionStats(store:Store,collection:Collection){
  const ids=descendantIds(collection.id,store.collections);
  const items=store.items.filter(item=>item.status==='owned'&&!item.archivedAt&&ids.has(item.collectionId));
  const count=items.reduce((sum,item)=>sum+item.quantity,0);
  const value=items.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const cost=items.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const target=collection.measurable?Math.max(0,collection.targetItemCount||0):0;
  return {items,count,value,cost,pl:value-cost,target,completion:target?Math.min(100,count/target*100):null};
}

export function computePortfolioAnalytics(store:Store){
  const owned=store.items.filter(item=>item.status==='owned'&&!item.archivedAt);
  const sold=store.items.filter(item=>item.status==='sold');
  const count=owned.reduce((sum,item)=>sum+item.quantity,0);
  const value=owned.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const cost=owned.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const soldRevenue=sold.reduce((sum,item)=>sum+item.currentValue*item.quantity,0);
  const soldCost=sold.reduce((sum,item)=>sum+item.purchasePrice*item.quantity,0);
  const valuesByCategory=new Map<string,{value:number;cost:number;count:number}>();
  for(const item of owned){
    const current=valuesByCategory.get(item.category)||{value:0,cost:0,count:0};
    current.value+=item.currentValue*item.quantity;current.cost+=item.purchasePrice*item.quantity;current.count+=item.quantity;
    valuesByCategory.set(item.category,current);
  }
  const brandCounts=new Map<string,number>();
  const retailerCounts=new Map<string,number>();
  let sealed=0,open=0,msrpSavings=0,paidOverMsrp=0;
  for(const item of owned){
    const brand=item.identity?.brand||item.customFields?.Manufacturer||item.customFields?.Brand;
    if(brand)brandCounts.set(brand,(brandCounts.get(brand)||0)+item.quantity);
    const retailer=item.customFields?.['Purchased From']||item.customFields?.Retailer;
    if(retailer)retailerCounts.set(retailer,(retailerCounts.get(retailer)||0)+item.quantity);
    if(item.packagingState==='sealed'||/sealed|new/i.test(item.condition))sealed+=item.quantity;else open+=item.quantity;
    const msrp=Number(item.customFields?.MSRP?.replace(/[^0-9.]/g,'')||0);
    if(msrp>0){
      const delta=(msrp-item.purchasePrice)*item.quantity;
      if(delta>=0)msrpSavings+=delta;else paidOverMsrp+=Math.abs(delta);
    }
  }
  const top=(map:Map<string,number>)=>[...map.entries()].sort((a,b)=>b[1]-a[1])[0];
  const completedCollections=store.collections.filter(c=>c.measurable&&c.targetItemCount&&collectionStats(store,c).count>=c.targetItemCount).length;
  const measurable=store.collections.filter(c=>c.measurable&&c.targetItemCount);
  const completionRate=measurable.length?measurable.reduce((sum,c)=>sum+(collectionStats(store,c).completion||0),0)/measurable.length:0;
  const purchaseDates=owned.map(item=>item.purchaseDate).filter(Boolean).filter(date=>Number.isFinite(Date.parse(date)));
  const months=new Set(purchaseDates.map(date=>date.slice(0,7))).size||1;
  return {
    owned,sold,count,value,cost,unrealized:value-cost,realized:soldRevenue-soldCost,
    averageItemValue:count?value/count:0,averagePurchasePrice:count?cost/count:0,
    msrpSavings,paidOverMsrp,sealed,open,completionRate,completedCollections,
    purchasesPerMonth:count/months,spendPerMonth:cost/months,
    topBrand:top(brandCounts),topRetailer:top(retailerCounts),
    categories:[...valuesByCategory.entries()].map(([name,row])=>({name,...row,pl:row.value-row.cost})).sort((a,b)=>b.value-a.value)
  };
}

export function portfolioAudit(store:Store):AuditIssue[]{
  const setup=normalizeSetupData(store.setup);
  const collectionIds=new Set(store.collections.map(collection=>collection.id));
  const issues:AuditIssue[]=[];
  const owned=store.items.filter(item=>item.status==='owned'&&!item.archivedAt);
  const fingerprints=new Map<string,Item[]>();
  const add=(item:Item,kind:AuditKind,label:string,detail:string,severity:AuditIssue['severity']='medium')=>issues.push({id:kind+':'+item.id,kind,itemId:item.id,label,detail,severity});
  for(const item of owned){
    if(!item.image)add(item,'missing-image','Missing image','No product or owned-copy image is attached.','low');
    if(item.purchasePrice<=0)add(item,'missing-price','Missing purchase price','Cost basis is not recorded.','medium');
    if(!item.purchaseDate||!Number.isFinite(Date.parse(item.purchaseDate)))add(item,'missing-date','Missing purchase date','Purchase date is not recorded.','low');
    if(!item.condition.trim())add(item,'missing-condition','Missing condition','Condition is blank.','medium');
    if(!item.productId&&(!item.identity||!Object.values(item.identity).some(Boolean)))add(item,'missing-match','Missing product match','No canonical product identity is linked.','medium');
    if(!item.identity?.upc)add(item,'missing-upc','Missing UPC','UPC is unavailable or not linked.','low');
    if(!item.identity?.sku)add(item,'missing-sku','Missing SKU','SKU is unavailable or not linked.','low');
    if(!placementForPortfolioItem(setup,item.id)&&!item.location.trim())add(item,'missing-location','Missing Setup location','This owned item has no current physical placement.','medium');
    if(!item.documents?.some(document=>document.kind==='Receipt')&&!item.customFields?.Receipt)add(item,'missing-receipt','Missing receipt','No receipt is attached.','low');
    if(item.collectionId&&!collectionIds.has(item.collectionId))add(item,'invalid-collection','Invalid collection relationship','The collection reference no longer exists.','high');
    if(!item.collectionId)add(item,'unassigned','Unassigned item','This item is not assigned to a collection.','low');
    const fingerprint=norm(item.identity?.upc||item.identity?.sku||item.identity?.modelNumber||item.name);
    if(fingerprint){
      const list=fingerprints.get(fingerprint)||[];list.push(item);fingerprints.set(fingerprint,list);
    }
  }
  for(const item of store.items.filter(item=>item.status==='sold')){
    if(placementForPortfolioItem(setup,item.id))add(item,'sold-active','Sold item still placed','A sold item remains in the active Setup graph.','high');
  }
  for(const group of fingerprints.values()){
    if(group.length<2)continue;
    for(const item of group)add(item,'possible-duplicate','Possible duplicate record',group.length+' records share the same strongest identity fingerprint. Quantity may be intentional; review before changing anything.','medium');
  }
  return issues;
}

export function healthScore(store:Store,issues:AuditIssue[]){
  const owned=store.items.filter(item=>item.status==='owned'&&!item.archivedAt);
  if(!owned.length)return 100;
  const max=owned.length*6;
  const weighted=issues.reduce((sum,issue)=>sum+(issue.severity==='high'?1.5:issue.severity==='medium'?1:.5),0);
  return Math.max(0,Math.round((1-Math.min(max,weighted)/max)*100));
}

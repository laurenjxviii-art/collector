export type WishlistPriority='Low'|'Medium'|'High'|'Grail';
export type WishlistViewMode='table'|'grid';
export type WishlistAlertFrequency='Immediate'|'Daily Digest'|'Weekly Digest'|'Off';
export type WishlistAlertKey=
  'priceTarget'|'priceMaximum'|'priceDrop'|'msrp'|'belowMsrp'|'localStock'|'restock'|
  'marketplace'|'usedListing'|'newListing'|'releaseChange'|'preorderOpen'|'preorderClosing'|'newVariant'|'promotion';

export type WishlistAlertRule={
  enabled:boolean;
  frequency:WishlistAlertFrequency;
  threshold?:number;
  radiusMiles?:5|10|25|50;
  condition?:string;
};

export type WishlistGrailSavingsPoint={at:string;amount:number};
export type WishlistGrailGoal={
  goalAmount?:number;
  savedAmount?:number;
  deadline?:string;
  status:'Not Started'|'Saving'|'Goal Reached'|'Purchased'|'Paused';
  completedAt?:string;
  savingsHistory?:WishlistGrailSavingsPoint[];
};

export type WishlistPreorder={
  enabled:boolean;
  retailer?:string;
  totalPrice?:number;
  depositPaid?:number;
  remainingBalance?:number;
  preorderDate?:string;
  estimatedChargeDate?:string;
  estimatedReleaseDate?:string;
  cancellationDeadline?:string;
  status:'Planned'|'Preordered'|'Deposit Paid'|'Awaiting Release'|'Charging Soon'|'Shipped'|'Delivered'|'Cancelled';
  notes?:string;
};

export type WishlistPurchase={
  retailer?:string;
  unitPrice?:number;
  shipping?:number;
  tax?:number;
  total?:number;
  purchaseDate?:string;
  condition?:string;
  quantity?:number;
  receipt?:string;
  expectedDelivery?:string;
};

export type WishlistHistoryEvent={
  at:string;
  type:'added'|'updated'|'target'|'priority'|'alert'|'market'|'plan'|'preorder'|'goal'|'purchase'|'archive'|'restore';
  event:string;
};

export type WishlistMarketPoint={
  date:string;
  value:number;
  source:string;
};

export type WishlistCatalogSnapshot={
  name:string;
  category:string;
  manufacturer?:string;
  line?:string;
  imageUrl?:string;
  msrp?:number;
  releaseDate?:string;
  brand?:string;
  upc?:string;
  sku?:string;
  modelNumber?:string;
  releaseYear?:string;
};

export type WishlistListingRules={
  maximumListingPrice?:number;
  shippingCeiling?:number;
  sellerRatingMinimum?:number;
};
export type WishlistVisibility='Private'|'Friends'|'Community'|'Public';

export type WishlistRecord={
  productId:string;
  source:'catalog'|'workspace';
  workspaceItemId?:string;
  snapshot?:WishlistCatalogSnapshot;
  priority:WishlistPriority;
  targetPrice?:number;
  maximumPrice?:number;
  desiredCondition:string;
  retailers:string[];
  marketplacePreference:'Any source'|'Retail only'|'Marketplace acceptable'|'Local only'|'Used acceptable'|'New only';
  listingRules:WishlistListingRules;
  visibility:WishlistVisibility;
  quantityWanted:number;
  deadline?:string;
  plannedMonth?:string;
  notes:string;
  alerts:Record<WishlistAlertKey,WishlistAlertRule>;
  grail?:WishlistGrailGoal;
  preorder?:WishlistPreorder;
  archived:boolean;
  archiveReason?:'purchased'|'removed';
  addedAt:string;
  updatedAt:string;
  initialMarket?:number;
  currentMarket?:number;
  marketSource?:string;
  marketUpdatedAt?:string;
  marketConfidence?:number;
  marketHistory:WishlistMarketPoint[];
  purchasedAt?:string;
  purchasePrice?:number;
  purchase?:WishlistPurchase;
  history:WishlistHistoryEvent[];
};

export type WishlistPreferences={
  view:WishlistViewMode;
  sort:string;
};

export const WISHLIST_ALERT_KEYS:WishlistAlertKey[]=[
  'priceTarget','priceMaximum','priceDrop','msrp','belowMsrp','localStock','restock',
  'marketplace','usedListing','newListing','releaseChange','preorderOpen','preorderClosing','newVariant','promotion'
];

export const WISHLIST_ALERT_LABELS:Record<WishlistAlertKey,string>={
  priceTarget:'Price below target',
  priceMaximum:'Price below maximum',
  priceDrop:'Meaningful price drop',
  msrp:'At MSRP',
  belowMsrp:'Below MSRP',
  localStock:'Local stock',
  restock:'Retail restock',
  marketplace:'Marketplace listing',
  usedListing:'Used listing',
  newListing:'New listing',
  releaseChange:'Release-date change',
  preorderOpen:'Preorder open',
  preorderClosing:'Preorder closing',
  newVariant:'New variant',
  promotion:'Sale / promotion'
};

export function alertDefaults(priority:WishlistPriority):Record<WishlistAlertKey,WishlistAlertRule>{
  const off=()=>({enabled:false,frequency:'Off' as WishlistAlertFrequency});
  const normal=()=>({enabled:true,frequency:'Daily Digest' as WishlistAlertFrequency});
  const urgent=()=>({enabled:true,frequency:'Immediate' as WishlistAlertFrequency});
  const rules=Object.fromEntries(WISHLIST_ALERT_KEYS.map(key=>[key,off()])) as Record<WishlistAlertKey,WishlistAlertRule>;
  if(priority==='Low'){
    rules.priceTarget=normal();
    return rules;
  }
  if(priority==='Medium'){
    rules.priceTarget=normal();rules.priceDrop=normal();rules.msrp=normal();rules.restock=normal();rules.marketplace=normal();rules.releaseChange=normal();
    return rules;
  }
  if(priority==='High'){
    rules.priceTarget=urgent();rules.priceMaximum=normal();rules.priceDrop=urgent();rules.msrp=urgent();rules.belowMsrp=urgent();rules.restock=urgent();rules.marketplace=normal();rules.releaseChange=normal();rules.preorderOpen=urgent();
    return rules;
  }
  for(const key of WISHLIST_ALERT_KEYS)rules[key]=urgent();
  rules.promotion.frequency='Daily Digest';
  return rules;
}

export function normalizeAlertRules(value:unknown,priority:WishlistPriority){
  const defaults=alertDefaults(priority);
  if(!value||typeof value!=='object'||Array.isArray(value))return defaults;
  const source=value as Record<string,unknown>;
  const out={...defaults};
  for(const key of WISHLIST_ALERT_KEYS){
    const raw=source[key];
    if(typeof raw==='boolean'){
      out[key]={...defaults[key],enabled:raw,frequency:raw?defaults[key].frequency:'Off'};
      continue;
    }
    if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
    const row=raw as Record<string,unknown>;
    const frequency=['Immediate','Daily Digest','Weekly Digest','Off'].includes(String(row.frequency))?String(row.frequency) as WishlistAlertFrequency:defaults[key].frequency;
    const radius=[5,10,25,50].includes(Number(row.radiusMiles))?Number(row.radiusMiles) as 5|10|25|50:undefined;
    out[key]={
      enabled:typeof row.enabled==='boolean'?row.enabled:frequency!=='Off',
      frequency,
      ...(Number.isFinite(Number(row.threshold))?{threshold:Number(row.threshold)}:{}),
      ...(radius?{radiusMiles:radius}:{}),
      ...(typeof row.condition==='string'&&row.condition?{condition:row.condition}:{})
    };
  }
  return out;
}

export function conditionOptions(category:string){
  const c=category.toLowerCase();
  if(/trading card|card|tcg|pokemon|pokémon|magic|union arena/.test(c))return ['Any','Raw','Raw NM','Raw LP+','PSA 10','PSA 9+','Graded Any'];
  if(/sneaker|shoe/.test(c))return ['Any','New','VNDS','Used Excellent','Used','Box required','No box acceptable'];
  if(/comic/.test(c))return ['Any','Raw','Raw NM','CGC 9.8','CGC 9.6+','Graded Any'];
  if(/game|technology|console/.test(c))return ['Any','New / sealed','Complete in box','Used Excellent','Used'];
  return ['Any','Sealed','Opened Complete','Opened Incomplete','Loose Complete','Loose','Used Excellent'];
}

export function newWishlistRecord(args:{
  productId:string;
  priority?:WishlistPriority;
  source?:'catalog'|'workspace';
  workspaceItemId?:string;
  snapshot?:WishlistCatalogSnapshot;
  targetPrice?:number;
  maximumPrice?:number;
  desiredCondition?:string;
  initialMarket?:number;
}):WishlistRecord{
  const now=new Date().toISOString(),priority=args.priority||'Medium';
  return {
    productId:args.productId,
    source:args.source||'catalog',
    workspaceItemId:args.workspaceItemId,
    snapshot:args.snapshot,
    priority,
    targetPrice:args.targetPrice,
    maximumPrice:args.maximumPrice,
    desiredCondition:args.desiredCondition||'Any',
    retailers:[],
    marketplacePreference:'Any source',
    listingRules:{},
    visibility:'Private',
    quantityWanted:1,
    notes:'',
    alerts:alertDefaults(priority),
    archived:false,
    addedAt:now,
    updatedAt:now,
    initialMarket:args.initialMarket,
    currentMarket:args.initialMarket,
    marketSource:args.initialMarket!==undefined?'Saved when added':undefined,
    marketUpdatedAt:args.initialMarket!==undefined?now:undefined,
    marketHistory:args.initialMarket!==undefined?[{date:now,value:args.initialMarket,source:'Saved when added'}]:[],
    history:[{at:now,type:'added',event:'Added to Wishlist'}]
  };
}

function finite(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>=0}
function str(value:unknown){return typeof value==='string'}

export function normalizeWishlistRecord(value:Partial<WishlistRecord>|undefined,productId:string):WishlistRecord{
  const base=newWishlistRecord({productId,priority:value?.priority||'Medium',source:value?.source||'catalog',workspaceItemId:value?.workspaceItemId,snapshot:value?.snapshot,targetPrice:value?.targetPrice,maximumPrice:value?.maximumPrice,desiredCondition:value?.desiredCondition,initialMarket:value?.initialMarket});
  if(!value)return base;
  const priority=(['Low','Medium','High','Grail'] as WishlistPriority[]).includes(value.priority as WishlistPriority)?value.priority as WishlistPriority:base.priority;
  const grail=value.grail?{
    goalAmount:finite(value.grail.goalAmount)?value.grail.goalAmount:undefined,
    savedAmount:finite(value.grail.savedAmount)?value.grail.savedAmount:undefined,
    deadline:str(value.grail.deadline)?value.grail.deadline:undefined,
    status:['Not Started','Saving','Goal Reached','Purchased','Paused'].includes(String(value.grail.status))?value.grail.status:'Saving',
    completedAt:str(value.grail.completedAt)&&Number.isFinite(Date.parse(value.grail.completedAt!))?value.grail.completedAt:undefined,
    savingsHistory:Array.isArray(value.grail.savingsHistory)?value.grail.savingsHistory.filter(p=>p&&str(p.at)&&Number.isFinite(Date.parse(p.at))&&finite(p.amount)).slice(-500):[]
  } as WishlistGrailGoal:undefined;
  const preorder=value.preorder?{
    enabled:Boolean(value.preorder.enabled),
    retailer:str(value.preorder.retailer)?value.preorder.retailer:undefined,
    totalPrice:finite(value.preorder.totalPrice)?value.preorder.totalPrice:undefined,
    depositPaid:finite(value.preorder.depositPaid)?value.preorder.depositPaid:undefined,
    remainingBalance:finite(value.preorder.remainingBalance)?value.preorder.remainingBalance:undefined,
    preorderDate:str(value.preorder.preorderDate)?value.preorder.preorderDate:undefined,
    estimatedChargeDate:str(value.preorder.estimatedChargeDate)?value.preorder.estimatedChargeDate:undefined,
    estimatedReleaseDate:str(value.preorder.estimatedReleaseDate)?value.preorder.estimatedReleaseDate:undefined,
    cancellationDeadline:str(value.preorder.cancellationDeadline)?value.preorder.cancellationDeadline:undefined,
    status:['Planned','Preordered','Deposit Paid','Awaiting Release','Charging Soon','Shipped','Delivered','Cancelled'].includes(String(value.preorder.status))?value.preorder.status:'Planned',
    notes:str(value.preorder.notes)?value.preorder.notes:undefined
  } as WishlistPreorder:undefined;
  return {
    ...base,
    ...value,
    productId,
    source:value.source==='workspace'?'workspace':'catalog',
    priority,
    targetPrice:finite(value.targetPrice)?value.targetPrice:undefined,
    maximumPrice:finite(value.maximumPrice)?value.maximumPrice:undefined,
    desiredCondition:str(value.desiredCondition)&&value.desiredCondition?value.desiredCondition:'Any',
    retailers:Array.isArray(value.retailers)?value.retailers.filter(str):[],
    marketplacePreference:['Any source','Retail only','Marketplace acceptable','Local only','Used acceptable','New only'].includes(String(value.marketplacePreference))?value.marketplacePreference!:'Any source',
    listingRules:{
      maximumListingPrice:finite(value.listingRules?.maximumListingPrice)?value.listingRules!.maximumListingPrice:undefined,
      shippingCeiling:finite(value.listingRules?.shippingCeiling)?value.listingRules!.shippingCeiling:undefined,
      sellerRatingMinimum:typeof value.listingRules?.sellerRatingMinimum==='number'&&Number.isFinite(value.listingRules.sellerRatingMinimum)?Math.max(0,Math.min(100,value.listingRules.sellerRatingMinimum)):undefined
    },
    visibility:['Private','Friends','Community','Public'].includes(String(value.visibility))?value.visibility as WishlistVisibility:'Private',
    quantityWanted:Number.isInteger(value.quantityWanted)&&Number(value.quantityWanted)>0?Number(value.quantityWanted):1,
    deadline:str(value.deadline)?value.deadline:undefined,
    plannedMonth:str(value.plannedMonth)?value.plannedMonth:undefined,
    notes:str(value.notes)?value.notes:'',
    alerts:normalizeAlertRules(value.alerts,priority),
    grail,
    preorder,
    archived:Boolean(value.archived),
    archiveReason:value.archiveReason==='purchased'||value.archiveReason==='removed'?value.archiveReason:undefined,
    addedAt:str(value.addedAt)&&Number.isFinite(Date.parse(value.addedAt!))?value.addedAt!:base.addedAt,
    updatedAt:str(value.updatedAt)&&Number.isFinite(Date.parse(value.updatedAt!))?value.updatedAt!:base.updatedAt,
    initialMarket:finite(value.initialMarket)?value.initialMarket:undefined,
    currentMarket:finite(value.currentMarket)?value.currentMarket:undefined,
    marketSource:str(value.marketSource)?value.marketSource:undefined,
    marketUpdatedAt:str(value.marketUpdatedAt)&&Number.isFinite(Date.parse(value.marketUpdatedAt!))?value.marketUpdatedAt:undefined,
    marketConfidence:typeof value.marketConfidence==='number'&&Number.isFinite(value.marketConfidence)?Math.max(0,Math.min(1,value.marketConfidence)):undefined,
    marketHistory:Array.isArray(value.marketHistory)?value.marketHistory.filter(p=>p&&str(p.date)&&Number.isFinite(Date.parse(p.date))&&finite(p.value)&&str(p.source)).slice(-1000):[],
    purchasedAt:str(value.purchasedAt)&&Number.isFinite(Date.parse(value.purchasedAt!))?value.purchasedAt:undefined,
    purchasePrice:finite(value.purchasePrice)?value.purchasePrice:undefined,
    purchase:value.purchase&&typeof value.purchase==='object'?value.purchase:undefined,
    history:Array.isArray(value.history)?value.history.filter(h=>h&&str(h.at)&&Number.isFinite(Date.parse(h.at))&&str(h.event)&&str(h.type)).slice(0,300):base.history
  };
}

export function wishlistEvent(record:WishlistRecord,type:WishlistHistoryEvent['type'],event:string,patch:Partial<WishlistRecord>={}):WishlistRecord{
  const now=new Date().toISOString();
  return normalizeWishlistRecord({
    ...record,
    ...patch,
    updatedAt:now,
    history:[{at:now,type,event},...record.history].slice(0,300)
  },record.productId);
}

export function validWishlistRecord(value:unknown):value is WishlistRecord{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const r=value as WishlistRecord;
  if(!str(r.productId)||!['catalog','workspace'].includes(r.source)||!['Low','Medium','High','Grail'].includes(r.priority))return false;
  if(!str(r.desiredCondition)||!Array.isArray(r.retailers)||!r.retailers.every(str)||!Number.isInteger(r.quantityWanted)||r.quantityWanted<1||!str(r.notes))return false;
  if(!['Any source','Retail only','Marketplace acceptable','Local only','Used acceptable','New only'].includes(r.marketplacePreference))return false;
  if(r.visibility!==undefined&&!['Private','Friends','Community','Public'].includes(r.visibility))return false;
  if(r.listingRules!==undefined&&(!r.listingRules||typeof r.listingRules!=='object'||Array.isArray(r.listingRules)))return false;
  if(!r.alerts||typeof r.alerts!=='object'||Array.isArray(r.alerts))return false;
  if(!WISHLIST_ALERT_KEYS.every(key=>{
    const rule=r.alerts[key];
    return rule===undefined||(typeof rule.enabled==='boolean'&&['Immediate','Daily Digest','Weekly Digest','Off'].includes(rule.frequency));
  }))return false;
  if(typeof r.archived!=='boolean'||!str(r.addedAt)||!Number.isFinite(Date.parse(r.addedAt))||!str(r.updatedAt)||!Number.isFinite(Date.parse(r.updatedAt)))return false;
  if(!Array.isArray(r.marketHistory)||!r.marketHistory.every(p=>p&&str(p.date)&&Number.isFinite(Date.parse(p.date))&&finite(p.value)&&str(p.source)))return false;
  if(!Array.isArray(r.history)||!r.history.every(h=>h&&str(h.at)&&Number.isFinite(Date.parse(h.at))&&str(h.type)&&str(h.event)))return false;
  return true;
}

export function validWishlistState(value:unknown){
  return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value as Record<string,unknown>).every(([key,row])=>key.length>0&&validWishlistRecord(row));
}

export function grailProgress(record:WishlistRecord){
  const goal=record.grail?.goalAmount??record.targetPrice;
  const saved=record.grail?.savedAmount||0;
  if(!goal||goal<=0)return 0;
  return Math.max(0,Math.min(100,Math.round(saved/goal*100)));
}

export function preorderCommitment(record:WishlistRecord){
  if(!record.preorder?.enabled||record.preorder.status==='Cancelled'||record.preorder.status==='Delivered')return 0;
  if(finite(record.preorder.remainingBalance))return record.preorder.remainingBalance!;
  return Math.max(0,(record.preorder.totalPrice||0)-(record.preorder.depositPaid||0));
}

export function daysTracked(record:WishlistRecord){
  const end=record.purchasedAt?Date.parse(record.purchasedAt):Date.now();
  const start=Date.parse(record.addedAt);
  return Number.isFinite(start)?Math.max(0,Math.floor((end-start)/86400000)):0;
}

export function snapshotFromProduct(product:{
  canonicalName:string;category:string;manufacturer:string;line:string;brand:string;imageUrl?:string;msrp?:number;releaseDate?:string;upc?:string;sku?:string;modelNumber?:string;releaseYear:string;
}):WishlistCatalogSnapshot{
  return {
    name:product.canonicalName,category:product.category,manufacturer:product.manufacturer,line:product.line||product.brand,
    imageUrl:product.imageUrl,msrp:product.msrp,releaseDate:product.releaseDate,brand:product.brand,upc:product.upc,sku:product.sku,modelNumber:product.modelNumber,releaseYear:product.releaseYear
  };
}

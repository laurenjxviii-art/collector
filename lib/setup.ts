export type SetupMode='current'|'planned'|'dream';
export type SetupUnit='in'|'ft'|'cm'|'mm';
export type SetupCapacityType='physical'|'count'|'slots'|'custom';

export type SetupSpace={
  id:string;
  name:string;
  type:string;
  mode:SetupMode;
  width:number;
  length:number;
  height:number;
  unit:SetupUnit;
  isPublic:boolean;
  createdAt:string;
  updatedAt:string;
};

export type SetupObject={
  id:string;
  setupId:string;
  parentObjectId?:string;
  name:string;
  type:string;
  x:number;
  y:number;
  width:number;
  height:number;
  depth:number;
  rotation:number;
  capacityType:SetupCapacityType;
  capacityValue?:number;
  cost?:number;
  notes:string;
  createdAt:string;
  updatedAt:string;
};

export type SetupPlacementKind='owned'|'wishlist'|'hypothetical';
export type SetupPlacement={
  id:string;
  setupId:string;
  setupObjectId?:string;
  portfolioItemId?:string;
  wishlistProductId?:string;
  kind:SetupPlacementKind;
  x:number;
  y:number;
  rotation:number;
  positionIndex?:number;
  notes:string;
  createdAt:string;
  updatedAt:string;
};

export type SetupData={
  spaces:SetupSpace[];
  objects:SetupObject[];
  placements:SetupPlacement[];
  activeSetupId?:string;
};

export const EMPTY_SETUP:SetupData={spaces:[],objects:[],placements:[]};

export function normalizeToInches(value:number,unit:SetupUnit){
  if(unit==='in')return value;
  if(unit==='ft')return value*12;
  if(unit==='cm')return value/2.54;
  return value/25.4;
}

export function setupObjectPath(data:SetupData,objectId?:string){
  if(!objectId)return '';
  const map=new Map(data.objects.map(object=>[object.id,object]));
  const names:string[]=[];
  let current=map.get(objectId);
  const visited=new Set<string>();
  while(current&&!visited.has(current.id)){
    visited.add(current.id);
    names.unshift(current.name);
    current=current.parentObjectId?map.get(current.parentObjectId):undefined;
  }
  return names.join(' → ');
}

export function setupLocationLabel(data:SetupData,setupId:string,objectId?:string){
  const space=data.spaces.find(entry=>entry.id===setupId);
  const path=setupObjectPath(data,objectId);
  return [space?.name,path].filter(Boolean).join(' → ');
}

export function placementForPortfolioItem(data:SetupData,itemId:string){
  return data.placements.find(placement=>placement.kind==='owned'&&placement.portfolioItemId===itemId);
}

export function setupObjectFit(space:SetupSpace,object:SetupObject,view:'top'|'front'='top'){
  if(view==='top'){
    if(!object.width||!object.depth||!space.width||!space.length)return 'unknown' as const;
    return object.width<=space.width&&object.depth<=space.length?'fits' as const:'no' as const;
  }
  if(!object.width||!object.height||!space.width||!space.height)return 'unknown' as const;
  return object.width<=space.width&&object.height<=space.height?'fits' as const:'no' as const;
}

function finite(value:unknown,minimum=0){return typeof value==='number'&&Number.isFinite(value)&&value>=minimum}
function optionalString(value:unknown){return value===undefined||typeof value==='string'}
function optionalFinite(value:unknown){return value===undefined||finite(value)}
function date(value:unknown){return typeof value==='string'&&Number.isFinite(Date.parse(value))}

export function validSetupData(value:unknown):value is SetupData{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const data=value as SetupData;
  if(!Array.isArray(data.spaces)||!Array.isArray(data.objects)||!Array.isArray(data.placements)||!optionalString(data.activeSetupId))return false;
  if(!data.spaces.every(space=>space&&typeof space.id==='string'&&typeof space.name==='string'&&typeof space.type==='string'&&
    ['current','planned','dream'].includes(space.mode)&&[space.width,space.length,space.height].every(n=>finite(n))&&
    ['in','ft','cm','mm'].includes(space.unit)&&typeof space.isPublic==='boolean'&&date(space.createdAt)&&date(space.updatedAt)))return false;
  if(!data.objects.every(object=>object&&typeof object.id==='string'&&typeof object.setupId==='string'&&optionalString(object.parentObjectId)&&
    typeof object.name==='string'&&typeof object.type==='string'&&[object.x,object.y,object.width,object.height,object.depth].every(n=>finite(n))&&
    typeof object.rotation==='number'&&Number.isFinite(object.rotation)&&['physical','count','slots','custom'].includes(object.capacityType)&&
    optionalFinite(object.capacityValue)&&optionalFinite(object.cost)&&typeof object.notes==='string'&&date(object.createdAt)&&date(object.updatedAt)))return false;
  if(!data.placements.every(placement=>placement&&typeof placement.id==='string'&&typeof placement.setupId==='string'&&
    optionalString(placement.setupObjectId)&&optionalString(placement.portfolioItemId)&&optionalString(placement.wishlistProductId)&&
    ['owned','wishlist','hypothetical'].includes(placement.kind)&&[placement.x,placement.y].every(n=>finite(n))&&
    typeof placement.rotation==='number'&&Number.isFinite(placement.rotation)&&
    (placement.positionIndex===undefined||(Number.isInteger(placement.positionIndex)&&placement.positionIndex>=0))&&
    typeof placement.notes==='string'&&date(placement.createdAt)&&date(placement.updatedAt)))return false;
  const spaceIds=new Set(data.spaces.map(space=>space.id));
  const objectIds=new Set(data.objects.map(object=>object.id));
  if(data.objects.some(object=>!spaceIds.has(object.setupId)||(object.parentObjectId!==undefined&&!objectIds.has(object.parentObjectId))))return false;
  if(data.placements.some(placement=>!spaceIds.has(placement.setupId)||(placement.setupObjectId!==undefined&&!objectIds.has(placement.setupObjectId))))return false;
  return new Set(data.spaces.map(x=>x.id)).size===data.spaces.length&&
    new Set(data.objects.map(x=>x.id)).size===data.objects.length&&
    new Set(data.placements.map(x=>x.id)).size===data.placements.length;
}

export function normalizeSetupData(value?:Partial<SetupData>|null):SetupData{
  return {
    spaces:Array.isArray(value?.spaces)?value!.spaces:[],
    objects:Array.isArray(value?.objects)?value!.objects:[],
    placements:Array.isArray(value?.placements)?value!.placements:[],
    activeSetupId:typeof value?.activeSetupId==='string'?value.activeSetupId:undefined
  };
}

export function newSetupId(prefix:string){
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
}

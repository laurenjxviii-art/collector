export type PortfolioVisibility='Private'|'Friends'|'Community'|'Public';
export type PortfolioViewMode='grid'|'list'|'table'|'gallery'|'compact';
export type PortfolioFieldType='Text'|'Long Text'|'Number'|'Currency'|'Date'|'Boolean'|'Single Select'|'Multi Select'|'URL'|'Rating'|'Measurement'|'Relation'|'File / Document'|'Custom Status';

export type PortfolioFieldDefinition={
  id:string;
  label:string;
  type:PortfolioFieldType;
  options?:string[];
  required?:boolean;
  defaultValue?:string;
};

export type PortfolioFieldTemplate={
  id:string;
  name:string;
  fields:PortfolioFieldDefinition[];
  createdAt:string;
  updatedAt:string;
};

export type PortfolioFilter={
  field:string;
  operator:'contains'|'equals'|'missing'|'gte'|'lte';
  value:string;
};

export type PortfolioSavedView={
  id:string;
  name:string;
  view:PortfolioViewMode;
  sort:string;
  columns:string[];
  filters:PortfolioFilter[];
  collectionId?:string;
  createdAt:string;
  updatedAt:string;
};

export type PortfolioPreferences={
  version:1;
  view:PortfolioViewMode;
  sort:string;
  columns:string[];
  filters:PortfolioFilter[];
  savedViews:PortfolioSavedView[];
  templates:PortfolioFieldTemplate[];
  activeSavedViewId?:string;
};

export type PortfolioItemMedia={
  id:string;
  kind:'owned'|'condition'|'setup'|'defect'|'other';
  url:string;
  label:string;
  createdAt:string;
};

export type PortfolioDocument={
  id:string;
  kind:'Receipt'|'COA'|'Warranty'|'Manual'|'Appraisal'|'Grading'|'Authentication'|'Original Listing'|'Repair'|'Insurance'|'Other';
  name:string;
  url:string;
  createdAt:string;
};

export type PortfolioHistoryEvent={
  id:string;
  at:string;
  type:'added'|'purchased'|'condition'|'setup'|'market'|'listed'|'sold'|'returned'|'repair'|'modification'|'appraisal'|'authentication'|'note';
  label:string;
  detail?:string;
};

export const DEFAULT_PORTFOLIO_COLUMNS=['image','name','collection','category','condition','quantity','pricePaid','market','pl','purchaseDate','retailer','location','status'];

export function defaultPortfolioPreferences():PortfolioPreferences{
  return {
    version:1,
    view:'grid',
    sort:'recently-updated',
    columns:[...DEFAULT_PORTFOLIO_COLUMNS],
    filters:[],
    savedViews:[],
    templates:[]
  };
}

export function normalizePortfolioPreferences(value?:PortfolioPreferences):PortfolioPreferences{
  const fallback=defaultPortfolioPreferences();
  if(!value||value.version!==1)return fallback;
  return {
    version:1,
    view:['grid','list','table','gallery','compact'].includes(value.view)?value.view:fallback.view,
    sort:typeof value.sort==='string'?value.sort:fallback.sort,
    columns:Array.isArray(value.columns)&&value.columns.every(column=>typeof column==='string')?value.columns:fallback.columns,
    filters:Array.isArray(value.filters)?value.filters.filter(validPortfolioFilter):[],
    savedViews:Array.isArray(value.savedViews)?value.savedViews.filter(validSavedView):[],
    templates:Array.isArray(value.templates)?value.templates.filter(validTemplate):[],
    activeSavedViewId:typeof value.activeSavedViewId==='string'?value.activeSavedViewId:undefined
  };
}

function validPortfolioFilter(value:unknown):value is PortfolioFilter{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const filter=value as PortfolioFilter;
  return typeof filter.field==='string'&&['contains','equals','missing','gte','lte'].includes(filter.operator)&&typeof filter.value==='string';
}
function validField(value:unknown):value is PortfolioFieldDefinition{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const field=value as PortfolioFieldDefinition;
  return typeof field.id==='string'&&typeof field.label==='string'&&
    ['Text','Long Text','Number','Currency','Date','Boolean','Single Select','Multi Select','URL','Rating','Measurement','Relation','File / Document','Custom Status'].includes(field.type)&&
    (field.options===undefined||(Array.isArray(field.options)&&field.options.every(option=>typeof option==='string')))&&
    (field.required===undefined||typeof field.required==='boolean')&&
    (field.defaultValue===undefined||typeof field.defaultValue==='string');
}
function validTemplate(value:unknown):value is PortfolioFieldTemplate{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const template=value as PortfolioFieldTemplate;
  return typeof template.id==='string'&&typeof template.name==='string'&&Array.isArray(template.fields)&&template.fields.every(validField)&&
    typeof template.createdAt==='string'&&typeof template.updatedAt==='string';
}
function validSavedView(value:unknown):value is PortfolioSavedView{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const saved=value as PortfolioSavedView;
  return typeof saved.id==='string'&&typeof saved.name==='string'&&['grid','list','table','gallery','compact'].includes(saved.view)&&
    typeof saved.sort==='string'&&Array.isArray(saved.columns)&&saved.columns.every(column=>typeof column==='string')&&
    Array.isArray(saved.filters)&&saved.filters.every(validPortfolioFilter)&&
    (saved.collectionId===undefined||typeof saved.collectionId==='string')&&
    typeof saved.createdAt==='string'&&typeof saved.updatedAt==='string';
}

export function validPortfolioPreferences(value:unknown):value is PortfolioPreferences{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const pref=value as PortfolioPreferences;
  return pref.version===1&&['grid','list','table','gallery','compact'].includes(pref.view)&&typeof pref.sort==='string'&&
    Array.isArray(pref.columns)&&pref.columns.every(column=>typeof column==='string')&&
    Array.isArray(pref.filters)&&pref.filters.every(validPortfolioFilter)&&
    Array.isArray(pref.savedViews)&&pref.savedViews.every(validSavedView)&&
    Array.isArray(pref.templates)&&pref.templates.every(validTemplate)&&
    (pref.activeSavedViewId===undefined||typeof pref.activeSavedViewId==='string');
}

export function newPortfolioId(prefix:string){
  return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
}

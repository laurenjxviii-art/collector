'use client';

import {useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  Archive,BarChart3,Check,ChevronDown,ChevronRight,Columns3,Download,FileUp,FolderPlus,
  Grid2X2,Heart,Image as ImageIcon,Layers3,List,MoreHorizontal,Plus,Search,Settings2,
  ShieldCheck,ShoppingBag,SlidersHorizontal,Star,Table2,Tag,Trash2,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import type {Collection,Item,Store} from '../lib/model';
import {
  DEFAULT_PORTFOLIO_COLUMNS,defaultPortfolioPreferences,newPortfolioId,normalizePortfolioPreferences,
  type PortfolioFilter,type PortfolioSavedView,type PortfolioViewMode,type PortfolioVisibility
} from '../lib/portfolio';
import {normalizeSetupData} from '../lib/setup';
import PortfolioItemDetail from './portfolio/PortfolioItemDetail';
import {
  collectionPath,collectionStats,computePortfolioAnalytics,descendantIds,healthScore,itemLocation,norm,
  portfolioAudit,portfolioMoney,type AuditIssue
} from './portfolio/portfolioUtils';

type Section='overview'|'collections'|'items'|'analytics'|'audit';
type CollectionEditorState={mode:'create'|'edit';parentId?:string;collection?:Collection}|null;

const COLUMNS:Array<{id:string;label:string}>=[
  {id:'image',label:'Image'},{id:'name',label:'Name'},{id:'collection',label:'Collection'},{id:'category',label:'Category'},
  {id:'condition',label:'Condition'},{id:'quantity',label:'Quantity'},{id:'pricePaid',label:'Price Paid'},{id:'market',label:'Market'},
  {id:'pl',label:'P/L'},{id:'purchaseDate',label:'Purchase Date'},{id:'retailer',label:'Retailer'},{id:'location',label:'Location'},
  {id:'status',label:'Status'}
];

const SORTS=[
  ['recently-updated','Recently Updated'],['name','Name'],['newest','Newest'],['oldest','Oldest'],['value-desc','Value ↓'],
  ['value-asc','Value ↑'],['paid-desc','Price Paid ↓'],['pl-desc','P/L ↓'],['purchase-desc','Purchase Date ↓'],['collection','Collection']
] as const;

function download(name:string,text:string,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();URL.revokeObjectURL(url);
}
function csvCell(value:unknown){return '"'+String(value??'').replaceAll('"','""')+'"'}

function pathLabel(item:Item,collections:Collection[]){
  return collectionPath(item.collectionId,collections).map(collection=>collection.name).join(' → ')||'All Items';
}

function itemMatchesFilter(item:Item,filter:PortfolioFilter,store:Store){
  const collection=pathLabel(item,store.collections);
  const location=itemLocation(store,item);
  const field=filter.field;
  let raw='';
  if(field==='category')raw=item.category;
  else if(field==='collection')raw=collection;
  else if(field==='condition')raw=item.condition;
  else if(field==='location')raw=location;
  else if(field==='receipt')raw=item.documents?.some(document=>document.kind==='Receipt')?'yes':'';
  else if(field==='listed')raw=item.customFields?.Listed||'';
  else if(field==='favorite')raw=item.favorite?'yes':'';
  else raw=item.customFields?.[field]||'';
  const value=norm(raw),needle=norm(filter.value);
  if(filter.operator==='missing')return !value;
  if(filter.operator==='equals')return value===needle;
  if(filter.operator==='contains')return value.includes(needle);
  const numeric=Number(String(raw).replace(/[^0-9.-]/g,''));
  const target=Number(filter.value);
  if(!Number.isFinite(numeric)||!Number.isFinite(target))return false;
  return filter.operator==='gte'?numeric>=target:numeric<=target;
}

function sortItems(items:Item[],sort:string,store:Store){
  return items.toSorted((a,b)=>{
    if(sort==='name')return a.name.localeCompare(b.name);
    if(sort==='newest')return b.createdAt.localeCompare(a.createdAt);
    if(sort==='oldest')return a.createdAt.localeCompare(b.createdAt);
    if(sort==='value-desc')return b.currentValue*b.quantity-a.currentValue*a.quantity;
    if(sort==='value-asc')return a.currentValue*a.quantity-b.currentValue*b.quantity;
    if(sort==='paid-desc')return b.purchasePrice*b.quantity-a.purchasePrice*a.quantity;
    if(sort==='pl-desc')return (b.currentValue-b.purchasePrice)*b.quantity-(a.currentValue-a.purchasePrice)*a.quantity;
    if(sort==='purchase-desc')return (b.purchaseDate||'').localeCompare(a.purchaseDate||'');
    if(sort==='collection')return pathLabel(a,store.collections).localeCompare(pathLabel(b,store.collections));
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function PortfolioMetric({label,value,sub,tone='muted'}:{label:string;value:string;sub:string;tone?:'muted'|'green'|'red'|'orange'}){
  return <section className="vx-panel vxp2-metric"><span>{label}</span><strong>{value}</strong><small className={'tone-'+tone}>{sub}</small></section>;
}

export default function VexumPortfolio(){
  const workspace=useWorkspace();
  const [section,setSection]=useState<Section>('overview');
  const [selectedItemId,setSelectedItemId]=useState('');
  const [activeCollectionId,setActiveCollectionId]=useState('');
  const [query,setQuery]=useState('');
  const [categoryFilter,setCategoryFilter]=useState('');
  const [conditionFilter,setConditionFilter]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [columnsOpen,setColumnsOpen]=useState(false);
  const [savedViewsOpen,setSavedViewsOpen]=useState(false);
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set());
  const [collectionEditor,setCollectionEditor]=useState<CollectionEditorState>(null);
  const [manualOpen,setManualOpen]=useState(false);
  const [auditFocus,setAuditFocus]=useState<AuditIssue|null>(null);

  const store=workspace.data;
  const preferences=normalizePortfolioPreferences(store.portfolioPreferences);
  const analytics=useMemo(()=>computePortfolioAnalytics(store),[store]);
  const issues=useMemo(()=>portfolioAudit(store),[store]);
  const health=healthScore(store,issues);
  const owned=analytics.owned;
  const activeCollections=store.collections.filter(collection=>!collection.archivedAt);
  const selectedItem=store.items.find(item=>item.id===selectedItemId);
  const activeCollection=activeCollections.find(collection=>collection.id===activeCollectionId);

  const persistPreferences=(patch:Partial<typeof preferences>)=>workspace.update({...store,portfolioPreferences:{...preferences,...patch}});
  const updateItem=(next:Item)=>workspace.update({...store,items:store.items.map(item=>item.id===next.id?next:item)});
  const sellItem=(item:Item)=>{localStorage.setItem('vexum.sell.prefillItemId',item.id);location.assign('/sell')};

  const filtered=useMemo(()=>{
    let rows=owned;
    if(activeCollectionId){
      const ids=descendantIds(activeCollectionId,activeCollections);
      rows=rows.filter(item=>ids.has(item.collectionId));
    }
    if(query.trim()){
      const needle=norm(query);
      rows=rows.filter(item=>norm([item.name,item.category,item.condition,item.identity?.brand,item.identity?.series,pathLabel(item,store.collections),Object.values(item.customFields||{}).join(' ')].join(' ')).includes(needle));
    }
    if(categoryFilter)rows=rows.filter(item=>item.category===categoryFilter);
    if(conditionFilter)rows=rows.filter(item=>item.condition===conditionFilter);
    for(const filter of preferences.filters)rows=rows.filter(item=>itemMatchesFilter(item,filter,store));
    return sortItems(rows,preferences.sort,store);
  },[owned,activeCollectionId,activeCollections,query,categoryFilter,conditionFilter,preferences.filters,preferences.sort,store]);

  const saveCollection=(input:Partial<Collection>&{name:string})=>{
    const now=new Date().toISOString();
    if(collectionEditor?.mode==='edit'&&collectionEditor.collection){
      const id=collectionEditor.collection.id;
      workspace.update({...store,collections:store.collections.map(collection=>collection.id===id?{...collection,...input,id}:collection)});
    }else{
      const next:Collection={
        id:newPortfolioId('collection'),name:input.name,icon:input.icon||'folder',color:input.color||'#ff2338',
        parentCollectionId:input.parentCollectionId||collectionEditor?.parentId,description:input.description||'',
        measurable:Boolean(input.measurable),targetItemCount:input.targetItemCount||undefined,privacy:input.privacy||'Private',
        customFieldTemplateId:input.customFieldTemplateId,defaultView:input.defaultView||'grid'
      };
      workspace.update({...store,collections:[...store.collections,next]});setActiveCollectionId(next.id);
    }
    setCollectionEditor(null);
  };

  const archiveCollection=(collection:Collection)=>{
    const contained=store.items.filter(item=>item.collectionId===collection.id&&item.status==='owned');
    let destination='';
    if(contained.length){
      const choice=window.prompt('This collection contains '+contained.length+' owned record(s). Type PARENT to move them to the parent collection, or ALL to move them to All Items. Nothing will be deleted.','ALL');
      if(!choice)return;
      destination=choice.toUpperCase()==='PARENT'?(collection.parentCollectionId||''):'';
    }
    if(!window.confirm('Archive "'+collection.name+'"? Owned items will be preserved.'))return;
    const now=new Date().toISOString();
    workspace.update({...store,
      collections:store.collections.map(row=>row.id===collection.id?{...row,archivedAt:now}:row),
      items:store.items.map(item=>item.collectionId===collection.id?{...item,collectionId:destination,updatedAt:now}:item)
    });
    if(activeCollectionId===collection.id)setActiveCollectionId('');
  };

  const addManual=(input:{name:string;category:string;collectionId:string;purchasePrice:number;currentValue:number;quantity:number;condition:string;purchaseDate:string;image:string;notes:string;templateId?:string})=>{
    const template=preferences.templates.find(row=>row.id===input.templateId);
    const customFields=Object.fromEntries((template?.fields||[]).map(field=>[field.label,field.defaultValue||'']));
    const now=new Date().toISOString();
    const item:Item={id:newPortfolioId('item'),collectionId:input.collectionId,name:input.name,category:input.category,status:'owned',purchasePrice:input.purchasePrice,currentValue:input.currentValue,quantity:input.quantity,image:input.image,condition:input.condition,purchaseDate:input.purchaseDate,location:'',notes:input.notes,customFields,createdAt:now,updatedAt:now,historyEvents:[{id:newPortfolioId('history'),at:now,type:'added',label:'Added manually to VEXUM'}]};
    workspace.update({...store,items:[...store.items,item]});setManualOpen(false);setSelectedItemId(item.id);
  };

  const bulkMove=(collectionId:string)=>{
    if(!selectedIds.size)return;
    const now=new Date().toISOString();
    workspace.update({...store,items:store.items.map(item=>selectedIds.has(item.id)?{...item,collectionId,updatedAt:now}:item)});
    setSelectedIds(new Set());
  };
  const bulkTag=()=>{
    const tag=window.prompt('Tag selected items');if(!tag)return;
    workspace.update({...store,items:store.items.map(item=>selectedIds.has(item.id)?{...item,tags:[...new Set([...(item.tags||[]),tag])],updatedAt:new Date().toISOString()}:item)});
  };
  const bulkArchive=()=>{
    if(!window.confirm('Archive '+selectedIds.size+' selected item record(s)? They remain in workspace history.'))return;
    const now=new Date().toISOString();workspace.update({...store,items:store.items.map(item=>selectedIds.has(item.id)?{...item,archivedAt:now,updatedAt:now}:item)});setSelectedIds(new Set());
  };
  const bulkDelete=()=>{
    if(!window.confirm('Permanently delete '+selectedIds.size+' selected item record(s)? This cannot be undone.'))return;
    workspace.update({...store,items:store.items.filter(item=>!selectedIds.has(item.id))});setSelectedIds(new Set());
  };
  const exportItems=(rows:Item[],format:'json'|'csv')=>{
    if(format==='json')return download('vexum-portfolio.json',JSON.stringify(rows,null,2));
    const header=['Name','Category','Collection','Condition','Quantity','Price Paid','Market','P/L','Purchase Date','Retailer','Setup Location','Status'];
    const body=rows.map(item=>[
      item.name,item.category,pathLabel(item,store.collections),item.condition,item.quantity,item.purchasePrice,item.currentValue,
      (item.currentValue-item.purchasePrice)*item.quantity,item.purchaseDate,item.customFields?.['Purchased From']||item.customFields?.Retailer||'',itemLocation(store,item),item.status
    ].map(csvCell).join(','));
    download('vexum-portfolio.csv',[header.map(csvCell).join(','),...body].join('\n'),'text/csv');
  };

  const saveCurrentView=()=>{
    const name=window.prompt('Saved view name');if(!name)return;
    const now=new Date().toISOString();
    const view:PortfolioSavedView={id:newPortfolioId('view'),name,view:preferences.view,sort:preferences.sort,columns:preferences.columns,filters:preferences.filters,collectionId:activeCollectionId||undefined,createdAt:now,updatedAt:now};
    persistPreferences({savedViews:[...preferences.savedViews,view],activeSavedViewId:view.id});
  };
  const applySavedView=(view:PortfolioSavedView)=>{
    workspace.update({...store,portfolioPreferences:{...preferences,view:view.view,sort:view.sort,columns:view.columns,filters:view.filters,activeSavedViewId:view.id}});
    setActiveCollectionId(view.collectionId||'');setSavedViewsOpen(false);setSection('items');
  };

  if(selectedItem)return <PortfolioItemDetail store={store} item={selectedItem} onBack={()=>setSelectedItemId('')} onChange={updateItem} onSell={sellItem}/>;

  const categories=[...new Set(owned.map(item=>item.category).filter(Boolean))].sort();
  const conditions=[...new Set(owned.map(item=>item.condition).filter(Boolean))].sort();
  const completionCollections=activeCollections.filter(collection=>collection.measurable&&collection.targetItemCount);

  return <div className="vxp2-page">
    <section className="vxp2-title"><div><span>PORTFOLIO</span><h1>Everything You Own</h1><p>Canonical ownership. Flexible organization. Setup, Search, Financial, Sell, and Social remain separate sources of truth.</p></div><aside><strong>{workspace.status}</strong><span>{analytics.count} owned units · {activeCollections.length} collections</span></aside></section>
    <nav className="vxp2-tabs">{([
      ['overview','Overview'],['collections','Collections'],['items','All Items'],['analytics','Analytics'],['audit','Audit']
    ] as Array<[Section,string]>).map(([id,label])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>)}
      <div className="vxp2-top-actions"><button onClick={()=>location.assign('/search')}><Search/>Search & Add</button><button onClick={()=>setManualOpen(true)}><Plus/>Add Manually</button><button onClick={()=>exportItems(owned,'csv')}><Download/>Export</button></div>
    </nav>

    {section==='overview'?<PortfolioOverview store={store} analytics={analytics} issues={issues} health={health} onOpenItems={()=>setSection('items')} onOpenAudit={()=>setSection('audit')} onCollection={id=>{setActiveCollectionId(id);setSection('items')}}/>:null}
    {section==='collections'?<CollectionsView store={store} collections={activeCollections} activeId={activeCollectionId} onActive={setActiveCollectionId} onCreate={parentId=>setCollectionEditor({mode:'create',parentId})} onEdit={collection=>setCollectionEditor({mode:'edit',collection})} onArchive={archiveCollection} onOpenItems={id=>{setActiveCollectionId(id);setSection('items')}}/>:null}
    {section==='items'?<section className="vxp2-items">
      <div className="vxp2-toolbar vx-panel"><div><h3>{activeCollection?.name||'All Items'}</h3><span>{filtered.reduce((sum,item)=>sum+item.quantity,0)} units · {filtered.length} records</span></div><div className="vxp2-toolbar-actions">
        <label className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search owned items…"/></label>
        <button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal/>Filters</button>
        <select value={preferences.sort} onChange={e=>persistPreferences({sort:e.target.value})}>{SORTS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select>
        <div className="vxp2-view-switch">{(['grid','list','table','gallery','compact'] as PortfolioViewMode[]).map(mode=><button className={preferences.view===mode?'active':''} key={mode} onClick={()=>persistPreferences({view:mode})}>{viewIcon(mode)}</button>)}</div>
        <div className="vxp2-pop"><button className={columnsOpen?'active':''} onClick={()=>setColumnsOpen(value=>!value)}><Columns3/>Columns</button>{columnsOpen?<ColumnMenu columns={preferences.columns} onChange={columns=>persistPreferences({columns})} onClose={()=>setColumnsOpen(false)}/>:null}</div>
        <div className="vxp2-pop"><button onClick={()=>setSavedViewsOpen(value=>!value)}><Star/>Views</button>{savedViewsOpen?<SavedViewsMenu views={preferences.savedViews} onApply={applySavedView} onSave={saveCurrentView} onClose={()=>setSavedViewsOpen(false)}/>:null}</div>
      </div></div>
      {filtersOpen?<FilterBar categories={categories} conditions={conditions} category={categoryFilter} condition={conditionFilter} filters={preferences.filters} onCategory={setCategoryFilter} onCondition={setConditionFilter} onFilters={filters=>persistPreferences({filters})}/>:null}
      {selectedIds.size?<BulkBar count={selectedIds.size} collections={activeCollections} onMove={bulkMove} onTag={bulkTag} onSetup={()=>{localStorage.setItem('vexum.setup.prefillItemIds',JSON.stringify([...selectedIds]));location.assign('/setup')}} onSell={()=>{const first=store.items.find(item=>selectedIds.has(item.id));if(first)sellItem(first)}} onArchive={bulkArchive} onExport={()=>exportItems(store.items.filter(item=>selectedIds.has(item.id)),'json')} onDelete={bulkDelete} onClear={()=>setSelectedIds(new Set())}/>:null}
      <PortfolioItems rows={filtered} store={store} view={preferences.view} columns={preferences.columns} selectedIds={selectedIds} onSelect={id=>setSelectedIds(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else next.add(id);return next})} onOpen={setSelectedItemId} onFavorite={item=>updateItem({...item,favorite:!item.favorite,updatedAt:new Date().toISOString()})}/>
    </section>:null}
    {section==='analytics'?<PortfolioAnalytics store={store} analytics={analytics} issues={issues} onCategory={category=>{setCategoryFilter(category);setActiveCollectionId('');setSection('items')}}/>:null}
    {section==='audit'?<PortfolioAudit store={store} issues={issues} health={health} focus={auditFocus} onFocus={setAuditFocus} onOpenItem={id=>setSelectedItemId(id)} onBulkFix={(kind,value)=>{
      const ids=new Set(issues.filter(issue=>issue.kind===kind).map(issue=>issue.itemId));if(!ids.size)return;
      if(!window.confirm('Apply this reviewed fix to '+ids.size+' affected record(s)?'))return;
      const now=new Date().toISOString();
      workspace.update({...store,items:store.items.map(item=>{
        if(!ids.has(item.id))return item;
        if(kind==='missing-condition')return {...item,condition:value,updatedAt:now};
        if(kind==='missing-location')return {...item,location:value,updatedAt:now};
        if(kind==='missing-price')return {...item,purchasePrice:Number(value)||0,updatedAt:now};
        return {...item,customFields:{...item.customFields,[kind==='missing-upc'?'UPC':'SKU']:value},updatedAt:now};
      })});
    }}/>:null}

    {collectionEditor?<CollectionEditor state={collectionEditor} collections={activeCollections} templates={preferences.templates} onClose={()=>setCollectionEditor(null)} onSave={saveCollection}/>:null}
    {manualOpen?<ManualItemModal collections={activeCollections} templates={preferences.templates} onClose={()=>setManualOpen(false)} onSave={addManual}/>:null}
  </div>;
}

function PortfolioOverview({store,analytics,issues,health,onOpenItems,onOpenAudit,onCollection}:{store:Store;analytics:ReturnType<typeof computePortfolioAnalytics>;issues:AuditIssue[];health:number;onOpenItems:()=>void;onOpenAudit:()=>void;onCollection:(id:string)=>void}){
  const recent=analytics.owned.toSorted((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  const collections=store.collections.filter(collection=>!collection.archivedAt).map(collection=>({collection,...collectionStats(store,collection)})).sort((a,b)=>b.value-a.value).slice(0,6);
  const history=(store.history||[]).slice(-24).map(snapshot=>Object.values(snapshot.values).reduce((sum,value)=>sum+value,0));
  const movers=analytics.owned.map(item=>{
    const history=(item.priceHistory||[]).filter(point=>point.kind!=='sale');
    const before=history.length>1?history[0].value:item.currentValue;
    return {item,delta:item.currentValue-before};
  }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5);
  const completion=store.collections.filter(c=>c.measurable&&c.targetItemCount).map(c=>collectionStats(store,c).completion||0);
  const completionAvg=completion.length?completion.reduce((a,b)=>a+b,0)/completion.length:0;
  return <div className="vxp2-overview">
    <div className="vxp2-metrics"><PortfolioMetric label="Current Value" value={portfolioMoney(analytics.value)} sub={analytics.count+' owned units'}/><PortfolioMetric label="Cost Basis" value={portfolioMoney(analytics.cost)} sub="Recorded acquisition cost"/><PortfolioMetric label="Unrealized P/L" value={(analytics.unrealized>=0?'+':'')+portfolioMoney(analytics.unrealized)} sub={analytics.cost?(analytics.unrealized/analytics.cost*100).toFixed(1)+'%':'No cost basis'} tone={analytics.unrealized>=0?'green':'red'}/><PortfolioMetric label="Items Owned" value={String(analytics.count)} sub={analytics.owned.length+' records'}/><PortfolioMetric label="Collection Health" value={health+'%'} sub={issues.length+' audit issues'} tone={health>=90?'green':health>=70?'orange':'red'}/><PortfolioMetric label="Completion" value={completion.length?completionAvg.toFixed(0)+'%':'—'} sub={completion.length?completion.length+' measurable collections':'No tracked targets'}/></div>
    <div className="vxp2-overview-grid">
      <section className="vx-panel vxp2-overview-chart"><header><div><h3>Portfolio Value</h3><p>Workspace snapshots only. Market provider failure does not remove ownership.</p></div></header><SimpleLine values={history}/><footer><span>Current {portfolioMoney(analytics.value)}</span><span>Cost basis {portfolioMoney(analytics.cost)}</span></footer></section>
      <section className="vx-panel"><header><div><h3>Collection Breakdown</h3><p>Click a category to filter ownership.</p></div></header><div className="vxp2-bars">{analytics.categories.slice(0,7).map(row=><button key={row.name} onClick={onOpenItems}><span><strong>{row.name}</strong><b>{portfolioMoney(row.value)}</b></span><i><b style={{width:(analytics.value?row.value/analytics.value*100:0)+'%'}}/></i><small>{analytics.value?(row.value/analytics.value*100).toFixed(1):0}%</small></button>)}</div></section>
      <section className="vx-panel"><header><div><h3>Recent Additions</h3><p>Newest owned records.</p></div><button onClick={onOpenItems}>All Items</button></header><MiniItems rows={recent} store={store}/></section>
      <section className="vx-panel"><header><div><h3>Largest Movers</h3><p>Based only on stored item price history.</p></div></header><div className="vxp2-movers">{movers.map(({item,delta})=><div key={item.id}><ItemThumb item={item}/><span><strong>{item.name}</strong><small>{item.marketLink?.provider||'Stored value history'}</small></span><b className={delta>=0?'tone-green':'tone-red'}>{delta>=0?'+':''}{portfolioMoney(delta)}</b></div>)}{!movers.length?<Empty compact text="No item price history yet."/>:null}</div></section>
      <section className="vx-panel vxp2-overview-wide"><header><div><h3>Collections</h3><p>Values include nested child collections.</p></div></header><div className="vxp2-collection-strip">{collections.map(row=><button key={row.collection.id} onClick={()=>onCollection(row.collection.id)}><CollectionCover collection={row.collection}/><span><strong>{row.collection.name}</strong><small>{row.count} items · {portfolioMoney(row.value)}</small>{row.completion!==null?<em>{row.completion.toFixed(0)}% complete</em>:null}</span></button>)}{!collections.length?<Empty compact text="No collections yet."/>:null}</div></section>
      <section className="vx-panel vxp2-overview-wide"><header><div><h3>Audit Issues</h3><p>Organizational feedback from your actual records.</p></div><button onClick={onOpenAudit}>Audit Collection</button></header><div className="vxp2-audit-summary"><div><strong>{health}%</strong><span>Collection Health</span></div>{Object.entries(issues.reduce((acc,issue)=>{acc[issue.label]=(acc[issue.label]||0)+1;return acc},{} as Record<string,number>)).slice(0,6).map(([label,count])=><div key={label}><span>{label}</span><b>{count}</b></div>)}{!issues.length?<div className="clean"><Check/>No audit issues detected.</div>:null}</div></section>
    </div>
  </div>;
}

function CollectionsView({store,collections,activeId,onActive,onCreate,onEdit,onArchive,onOpenItems}:{store:Store;collections:Collection[];activeId:string;onActive:(id:string)=>void;onCreate:(parentId?:string)=>void;onEdit:(collection:Collection)=>void;onArchive:(collection:Collection)=>void;onOpenItems:(id:string)=>void}){
  const roots=collections.filter(collection=>!collection.parentCollectionId||!collections.some(parent=>parent.id===collection.parentCollectionId));
  const active=collections.find(collection=>collection.id===activeId);
  return <div className="vxp2-collections-layout">
    <aside className="vx-panel vxp2-tree"><header><div><h3>Collection Tree</h3><p>Unlimited hierarchy.</p></div><button onClick={()=>onCreate()}><FolderPlus/></button></header><button className={!activeId?'active root':''} onClick={()=>onActive('')}><Layers3/><strong>All Collections</strong><b>{store.items.filter(i=>i.status==='owned'&&!i.archivedAt).length}</b></button><div className="vxp2-tree-scroll">{roots.map(root=><CollectionNode key={root.id} collection={root} collections={collections} store={store} activeId={activeId} onActive={onActive}/>)}</div></aside>
    <main className="vxp2-collections-main">
      <div className="vxp2-section-head"><div><h2>{active?.name||'Collections'}</h2><p>{active?.description||'Build the hierarchy that matches how you think.'}</p></div><div>{active?<><button onClick={()=>onCreate(active.id)}><Plus/>Child</button><button onClick={()=>onEdit(active)}><Settings2/>Edit</button><button onClick={()=>onArchive(active)}><Archive/>Archive</button><button className="red" onClick={()=>onOpenItems(active.id)}>Open Items</button></>:<button className="red" onClick={()=>onCreate()}><Plus/>New Collection</button>}</div></div>
      <div className="vxp2-collection-grid">{collections.filter(collection=>activeId?collection.parentCollectionId===activeId:!collection.parentCollectionId).map(collection=>{const stats=collectionStats(store,collection);return <article className="vx-panel" key={collection.id}><CollectionCover collection={collection}/><div><span>{collection.privacy||'Private'}</span><h3>{collection.name}</h3><p>{collection.description||'No description.'}</p><footer><strong>{stats.count} items</strong><strong>{portfolioMoney(stats.value)}</strong>{stats.completion!==null?<em>{stats.completion.toFixed(1)}% complete</em>:<em>Not measurable</em>}</footer><div className="actions"><button onClick={()=>onActive(collection.id)}>Browse Children</button><button onClick={()=>onOpenItems(collection.id)}>View Items</button><button onClick={()=>onEdit(collection)}>Edit</button></div></div></article>})}</div>
      {active?<section className="vx-panel vxp2-collection-analytics"><header><h3>Collection Analytics</h3></header>{(()=>{const stats=collectionStats(store,active);return <div><PortfolioMetric label="Value" value={portfolioMoney(stats.value)} sub={stats.count+' units'}/><PortfolioMetric label="Cost Basis" value={portfolioMoney(stats.cost)} sub="Owned copies"/><PortfolioMetric label="P/L" value={(stats.pl>=0?'+':'')+portfolioMoney(stats.pl)} sub="Unrealized" tone={stats.pl>=0?'green':'red'}/><PortfolioMetric label="Completion" value={stats.completion!==null?stats.completion.toFixed(1)+'%':'—'} sub={stats.target?stats.count+' / '+stats.target:'Not tracked'}/></div>})()}</section>:null}
    </main>
  </div>;
}

function CollectionNode({collection,collections,store,activeId,onActive,depth=0}:{collection:Collection;collections:Collection[];store:Store;activeId:string;onActive:(id:string)=>void;depth?:number}){
  const [open,setOpen]=useState(true);const children=collections.filter(row=>row.parentCollectionId===collection.id);const stats=collectionStats(store,collection);
  return <div className="vxp2-tree-node"><button className={activeId===collection.id?'active':''} style={{paddingLeft:10+depth*15}} onClick={()=>{onActive(collection.id);if(children.length)setOpen(value=>!value)}}><span>{children.length?(open?'⌄':'›'):'·'}</span><Layers3/><strong>{collection.name}</strong><b>{stats.count}</b></button>{open?children.map(child=><CollectionNode key={child.id} collection={child} collections={collections} store={store} activeId={activeId} onActive={onActive} depth={depth+1}/>):null}</div>;
}

function PortfolioItems({rows,store,view,columns,selectedIds,onSelect,onOpen,onFavorite}:{rows:Item[];store:Store;view:PortfolioViewMode;columns:string[];selectedIds:Set<string>;onSelect:(id:string)=>void;onOpen:(id:string)=>void;onFavorite:(item:Item)=>void}){
  if(!rows.length)return <Empty text="No owned items match this view." action={<button onClick={()=>location.assign('/search')}>Search & Add</button>}/>;
  if(view==='table')return <div className="vx-panel vxp2-table-wrap"><div className="vxp2-table" style={{gridTemplateColumns:'36px '+columns.map(column=>column==='name'?'minmax(230px,2fr)':column==='location'||column==='collection'?'minmax(180px,1.4fr)':'minmax(95px,1fr)').join(' ')}}><div className="head"><span/><>{columns.map(column=><span key={column}>{COLUMNS.find(c=>c.id===column)?.label||column}</span>)}</></div>{rows.map(item=><button key={item.id} className={selectedIds.has(item.id)?'selected':''} onDoubleClick={()=>onOpen(item.id)}><input type="checkbox" checked={selectedIds.has(item.id)} onChange={()=>onSelect(item.id)} onClick={event=>event.stopPropagation()}/>{columns.map(column=><span key={column}>{columnValue(column,item,store)}</span>)}</button>)}</div></div>;
  return <div className={'vxp2-items-view '+view}>{rows.map(item=><article className={'vx-panel '+(selectedIds.has(item.id)?'selected':'')} key={item.id}><button className="select" onClick={()=>onSelect(item.id)}>{selectedIds.has(item.id)?<Check/>:<span/>}</button><button className="favorite" onClick={()=>onFavorite(item)}>{item.favorite?<Star fill="currentColor"/>:<Star/>}</button><button className="body" onClick={()=>onOpen(item.id)}><ItemThumb item={item} large={view==='gallery'}/><div className="copy"><small>{pathLabel(item,store.collections)}</small><strong>{item.name}</strong><span>{item.category} · {item.condition||'Condition missing'}</span>{view!=='compact'?<footer><div><small>Market</small><b>{portfolioMoney(item.currentValue*item.quantity)}</b></div><div><small>P/L</small><b className={item.currentValue>=item.purchasePrice?'tone-green':'tone-red'}>{portfolioMoney((item.currentValue-item.purchasePrice)*item.quantity)}</b></div><div><small>Setup</small><b>{itemLocation(store,item)}</b></div></footer>:null}</div></button></article>)}</div>;
}

function columnValue(column:string,item:Item,store:Store):ReactNode{
  if(column==='image')return <ItemThumb item={item}/>;
  if(column==='name')return <span className="name-cell"><strong>{item.name}</strong><small>{item.identity?.brand||item.identity?.series||''}</small></span>;
  if(column==='collection')return pathLabel(item,store.collections);
  if(column==='category')return item.category;
  if(column==='condition')return item.condition||'Missing';
  if(column==='quantity')return '×'+item.quantity;
  if(column==='pricePaid')return portfolioMoney(item.purchasePrice*item.quantity);
  if(column==='market')return portfolioMoney(item.currentValue*item.quantity);
  if(column==='pl'){const value=(item.currentValue-item.purchasePrice)*item.quantity;return <b className={value>=0?'tone-green':'tone-red'}>{value>=0?'+':''}{portfolioMoney(value)}</b>}
  if(column==='purchaseDate')return item.purchaseDate?new Date(item.purchaseDate).toLocaleDateString():'—';
  if(column==='retailer')return item.customFields?.['Purchased From']||item.customFields?.Retailer||'—';
  if(column==='location')return itemLocation(store,item);
  if(column==='status')return item.status;
  return item.customFields?.[column]||'—';
}

function PortfolioAnalytics({store,analytics,issues,onCategory}:{store:Store;analytics:ReturnType<typeof computePortfolioAnalytics>;issues:AuditIssue[];onCategory:(category:string)=>void}){
  const missingReceipts=issues.filter(issue=>issue.kind==='missing-receipt').length;
  const duplicates=new Set(issues.filter(issue=>issue.kind==='possible-duplicate').map(issue=>issue.detail)).size;
  const history=(store.history||[]).slice(-40).map(snapshot=>Object.values(snapshot.values).reduce((sum,value)=>sum+value,0));
  return <div className="vxp2-analytics">
    <div className="vxp2-metrics analytics"><PortfolioMetric label="Current Value" value={portfolioMoney(analytics.value)} sub="Owned inventory"/><PortfolioMetric label="Cost Basis" value={portfolioMoney(analytics.cost)} sub="Recorded cost"/><PortfolioMetric label="Unrealized P/L" value={(analytics.unrealized>=0?'+':'')+portfolioMoney(analytics.unrealized)} sub={analytics.cost?(analytics.unrealized/analytics.cost*100).toFixed(1)+'%':'—'} tone={analytics.unrealized>=0?'green':'red'}/><PortfolioMetric label="Realized Profit" value={(analytics.realized>=0?'+':'')+portfolioMoney(analytics.realized)} sub={analytics.sold.length+' sold records'} tone={analytics.realized>=0?'green':'red'}/><PortfolioMetric label="Items Owned" value={String(analytics.count)} sub={analytics.owned.length+' records'}/><PortfolioMetric label="Average Item Value" value={analytics.count?portfolioMoney(analytics.averageItemValue):'—'} sub="By owned quantity"/><PortfolioMetric label="Average Purchase Price" value={analytics.count?portfolioMoney(analytics.averagePurchasePrice):'—'} sub="By owned quantity"/><PortfolioMetric label="MSRP Savings" value={analytics.msrpSavings?portfolioMoney(analytics.msrpSavings):'—'} sub="Where MSRP exists" tone="green"/><PortfolioMetric label="Paid Over MSRP" value={analytics.paidOverMsrp?portfolioMoney(analytics.paidOverMsrp):'—'} sub="Where MSRP exists" tone="orange"/><PortfolioMetric label="Completion Rate" value={analytics.completionRate?analytics.completionRate.toFixed(1)+'%':'—'} sub={analytics.completedCollections+' completed collections'}/><PortfolioMetric label="Sealed / Open" value={analytics.sealed+' / '+analytics.open} sub="By item quantity"/><PortfolioMetric label="Missing Receipts" value={String(missingReceipts)} sub={duplicates+' duplicate groups'} tone={missingReceipts?'orange':'green'}/></div>
    <div className="vxp2-analytics-grid"><section className="vx-panel"><header><div><h3>Portfolio Value Over Time</h3><p>Stored VEXUM snapshots.</p></div></header><SimpleLine values={history}/></section><section className="vx-panel"><header><div><h3>Value by Category</h3><p>Click to drill into All Items.</p></div></header><div className="vxp2-bars">{analytics.categories.map(row=><button key={row.name} onClick={()=>onCategory(row.name)}><span><strong>{row.name}</strong><b>{portfolioMoney(row.value)}</b></span><i><b style={{width:(analytics.value?row.value/analytics.value*100:0)+'%'}}/></i><small>{row.count} items</small></button>)}</div></section><section className="vx-panel"><header><h3>Collection Behavior</h3></header><div className="vxp2-analytic-rows"><div><span>Most collected brand</span><strong>{analytics.topBrand?.[0]||'—'}</strong><b>{analytics.topBrand?.[1]||0} items</b></div><div><span>Most used retailer</span><strong>{analytics.topRetailer?.[0]||'—'}</strong><b>{analytics.topRetailer?.[1]||0} purchases</b></div><div><span>Purchases / month</span><strong>{analytics.count?analytics.purchasesPerMonth.toFixed(1):'—'}</strong><b>observed months</b></div><div><span>Spend / month</span><strong>{analytics.cost?portfolioMoney(analytics.spendPerMonth):'—'}</strong><b>recorded cost</b></div></div></section><section className="vx-panel"><header><h3>Category P/L</h3></header><div className="vxp2-analytic-rows">{analytics.categories.map(row=><div key={row.name}><span>{row.name}</span><strong>{portfolioMoney(row.value)}</strong><b className={row.pl>=0?'tone-green':'tone-red'}>{row.pl>=0?'+':''}{portfolioMoney(row.pl)}</b></div>)}</div></section></div>
  </div>;
}

function PortfolioAudit({store,issues,health,focus,onFocus,onOpenItem,onBulkFix}:{store:Store;issues:AuditIssue[];health:number;focus:AuditIssue|null;onFocus:(issue:AuditIssue|null)=>void;onOpenItem:(id:string)=>void;onBulkFix:(kind:AuditIssue['kind'],value:string)=>void}){
  const byKind=Object.values(issues.reduce((acc,issue)=>{const row=acc[issue.kind]||{kind:issue.kind,label:issue.label,count:0,severity:issue.severity,issues:[] as AuditIssue[]};row.count++;row.issues.push(issue);acc[issue.kind]=row;return acc},{} as Record<string,{kind:AuditIssue['kind'];label:string;count:number;severity:AuditIssue['severity'];issues:AuditIssue[]}>)).sort((a,b)=>b.count-a.count);
  const categoryScore=(kind:AuditIssue['kind'])=>{
    const count=issues.filter(issue=>issue.kind===kind).length;const owned=Math.max(1,store.items.filter(i=>i.status==='owned'&&!i.archivedAt).length);return Math.max(0,Math.round((1-count/owned)*100));
  };
  const fixable=focus&&['missing-condition','missing-location','missing-price','missing-upc','missing-sku'].includes(focus.kind);
  return <div className="vxp2-audit">
    <section className="vx-panel vxp2-health"><div><span>COLLECTION HEALTH</span><strong>{health}%</strong><p>Organizational feedback, not a score of the collector.</p></div><div className="vxp2-health-grid">{[['missing-match','Product Matches'],['missing-image','Images'],['missing-condition','Condition'],['missing-price','Purchase Data'],['missing-location','Setup Location'],['missing-receipt','Receipts']].map(([kind,label])=><div key={kind}><span>{label}</span><strong>{categoryScore(kind as AuditIssue['kind'])}%</strong><i><b style={{width:categoryScore(kind as AuditIssue['kind'])+'%'}}/></i></div>)}</div></section>
    <div className="vxp2-audit-layout"><section className="vx-panel"><header><div><h3>{issues.length} Issues</h3><p>Potential duplicates are review-only; VEXUM never deletes them automatically.</p></div>{issues.length?<button className="red" onClick={()=>onFocus(issues[0])}>Start Cleanup</button>:null}</header><div className="vxp2-audit-kinds">{byKind.map(group=><button className={focus?.kind===group.kind?'active':''} key={group.kind} onClick={()=>onFocus(group.issues[0])}><i className={group.severity}/><span><strong>{group.label}</strong><small>{group.issues[0].detail}</small></span><b>{group.count}</b><ChevronRight/></button>)}{!issues.length?<Empty compact text="No audit issues detected in active ownership."/>:null}</div></section><section className="vx-panel vxp2-cleanup"><header><div><h3>Cleanup</h3><p>Review changes before applying them.</p></div></header>{focus?<><div className="vxp2-cleanup-focus"><span>{focus.label}</span><strong>{store.items.find(item=>item.id===focus.itemId)?.name||'Item'}</strong><p>{focus.detail}</p><button onClick={()=>onOpenItem(focus.itemId)}>Open Item Record</button></div>{fixable?<BulkFix issue={focus} count={issues.filter(issue=>issue.kind===focus.kind).length} onApply={value=>onBulkFix(focus.kind,value)}/>:<div className="vxp2-review-only"><ShieldCheck/><strong>Review required</strong><p>This issue is not safe for an automatic bulk rewrite. Inspect the affected records individually.</p></div>}<div className="vxp2-cleanup-list">{issues.filter(issue=>issue.kind===focus.kind).slice(0,10).map(issue=><button key={issue.id} onClick={()=>onOpenItem(issue.itemId)}><span>{store.items.find(item=>item.id===issue.itemId)?.name||issue.itemId}</span><ChevronRight/></button>)}</div></>:<Empty compact text="Choose an issue category to begin cleanup."/>}</section></div>
  </div>;
}

function BulkFix({issue,count,onApply}:{issue:AuditIssue;count:number;onApply:(value:string)=>void}){
  const [value,setValue]=useState('');
  return <div className="vxp2-bulk-fix"><strong>Bulk fix</strong><p>Applies only after confirmation to all {count} records in this issue group.</p><input value={value} onChange={e=>setValue(e.target.value)} placeholder={issue.kind==='missing-price'?'0.00':'Reviewed value'}/><button disabled={!value.trim()} onClick={()=>onApply(value)}>Review & Apply to {count}</button></div>;
}

function FilterBar({categories,conditions,category,condition,filters,onCategory,onCondition,onFilters}:{categories:string[];conditions:string[];category:string;condition:string;filters:PortfolioFilter[];onCategory:(value:string)=>void;onCondition:(value:string)=>void;onFilters:(filters:PortfolioFilter[])=>void}){
  const [field,setField]=useState('location');const [operator,setOperator]=useState<PortfolioFilter['operator']>('missing');const [value,setValue]=useState('');
  return <section className="vx-panel vxp2-filterbar"><label>Category<select value={category} onChange={e=>onCategory(e.target.value)}><option value="">All categories</option>{categories.map(row=><option key={row}>{row}</option>)}</select></label><label>Condition<select value={condition} onChange={e=>onCondition(e.target.value)}><option value="">All conditions</option>{conditions.map(row=><option key={row}>{row}</option>)}</select></label><div className="advanced"><label>Field<select value={field} onChange={e=>setField(e.target.value)}><option value="location">Location</option><option value="receipt">Receipt</option><option value="category">Category</option><option value="collection">Collection</option><option value="condition">Condition</option><option value="favorite">Favorite</option></select></label><label>Rule<select value={operator} onChange={e=>setOperator(e.target.value as PortfolioFilter['operator'])}><option value="missing">Missing</option><option value="contains">Contains</option><option value="equals">Equals</option><option value="gte">≥</option><option value="lte">≤</option></select></label>{operator!=='missing'?<label>Value<input value={value} onChange={e=>setValue(e.target.value)}/></label>:null}<button onClick={()=>onFilters([...filters,{field,operator,value}])}><Plus/>Add</button></div><div className="chips">{filters.map((filter,index)=><span key={index}>{filter.field} {filter.operator} {filter.value}<button onClick={()=>onFilters(filters.filter((_,i)=>i!==index))}>×</button></span>)}</div></section>;
}

function BulkBar({count,collections,onMove,onTag,onSetup,onSell,onArchive,onExport,onDelete,onClear}:{count:number;collections:Collection[];onMove:(id:string)=>void;onTag:()=>void;onSetup:()=>void;onSell:()=>void;onArchive:()=>void;onExport:()=>void;onDelete:()=>void;onClear:()=>void}){
  return <div className="vxp2-bulk"><strong>{count} selected</strong><select defaultValue="" onChange={e=>{if(e.target.value!=='__')onMove(e.target.value);e.currentTarget.value=''}}><option value="__">Move to collection…</option><option value="">All Items</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collectionPath(collection.id,collections).map(c=>c.name).join(' / ')}</option>)}</select><button onClick={onTag}><Tag/>Add Tag</button><button onClick={onSetup}><Layers3/>Assign Setup</button><button onClick={onSell}><ShoppingBag/>Sell</button><button onClick={onArchive}><Archive/>Archive</button><button onClick={onExport}><Download/>Export</button><button className="danger" onClick={onDelete}><Trash2/>Delete</button><button onClick={onClear}><X/></button></div>;
}

function ColumnMenu({columns,onChange,onClose}:{columns:string[];onChange:(columns:string[])=>void;onClose:()=>void}){
  return <div className="vxp2-popover columns"><header><strong>Columns</strong><button onClick={onClose}><X/></button></header>{COLUMNS.map(column=><label key={column.id}><input type="checkbox" checked={columns.includes(column.id)} onChange={e=>onChange(e.target.checked?[...columns,column.id]:columns.filter(id=>id!==column.id))}/>{column.label}</label>)}</div>;
}
function SavedViewsMenu({views,onApply,onSave,onClose}:{views:PortfolioSavedView[];onApply:(view:PortfolioSavedView)=>void;onSave:()=>void;onClose:()=>void}){
  return <div className="vxp2-popover views"><header><strong>Saved Views</strong><button onClick={onClose}><X/></button></header>{views.map(view=><button className="saved" key={view.id} onClick={()=>onApply(view)}><span><strong>{view.name}</strong><small>{view.view} · {view.filters.length} filters</small></span><ChevronRight/></button>)}{!views.length?<p>No saved views yet.</p>:null}<button className="save" onClick={onSave}><Plus/>Save Current View</button></div>;
}

function CollectionEditor({state,collections,templates,onClose,onSave}:{state:NonNullable<CollectionEditorState>;collections:Collection[];templates:Array<{id:string;name:string}>;onClose:()=>void;onSave:(input:any)=>void}){
  const current=state.collection;
  const [name,setName]=useState(current?.name||'');const [parent,setParent]=useState(current?.parentCollectionId||state.parentId||'');const [description,setDescription]=useState(current?.description||'');const [measurable,setMeasurable]=useState(Boolean(current?.measurable));const [target,setTarget]=useState(String(current?.targetItemCount||''));const [privacy,setPrivacy]=useState<PortfolioVisibility>(current?.privacy||'Private');const [template,setTemplate]=useState(current?.customFieldTemplateId||'');const [view,setView]=useState<PortfolioViewMode>(current?.defaultView||'grid');
  const descendants=current?descendantIds(current.id,collections):new Set<string>();
  return <Modal title={state.mode==='edit'?'Edit Collection':'Create Collection'} subtitle="Organization only. Deleting or moving a collection never silently deletes owned items." onClose={onClose}><div className="vxp2-form grid"><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Parent<select value={parent} onChange={e=>setParent(e.target.value)}><option value="">Root</option>{collections.filter(collection=>!descendants.has(collection.id)).map(collection=><option key={collection.id} value={collection.id}>{collectionPath(collection.id,collections).map(c=>c.name).join(' / ')}</option>)}</select></label><label className="wide">Description<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><label className="check"><input type="checkbox" checked={measurable} onChange={e=>setMeasurable(e.target.checked)}/>Track completion</label>{measurable?<label>Target item count<input type="number" min="0" value={target} onChange={e=>setTarget(e.target.value)}/></label>:null}<label>Privacy<select value={privacy} onChange={e=>setPrivacy(e.target.value as PortfolioVisibility)}><option>Private</option><option>Friends</option><option>Community</option><option>Public</option></select></label><label>Custom field template<select value={template} onChange={e=>setTemplate(e.target.value)}><option value="">None</option>{templates.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Default view<select value={view} onChange={e=>setView(e.target.value as PortfolioViewMode)}>{['grid','list','table','gallery','compact'].map(row=><option key={row}>{row}</option>)}</select></label></div><footer className="vxp2-modal-footer"><button onClick={onClose}>Cancel</button><button className="red" disabled={!name.trim()} onClick={()=>onSave({name:name.trim(),parentCollectionId:parent||undefined,description,measurable,targetItemCount:measurable?Number(target)||0:undefined,privacy,customFieldTemplateId:template||undefined,defaultView:view})}>Save Collection</button></footer></Modal>;
}

function ManualItemModal({collections,templates,onClose,onSave}:{collections:Collection[];templates:Array<{id:string;name:string}>;onClose:()=>void;onSave:(input:any)=>void}){
  const [name,setName]=useState('');const [category,setCategory]=useState('');const [collectionId,setCollection]=useState('');const [purchasePrice,setPaid]=useState('');const [currentValue,setValue]=useState('');const [quantity,setQuantity]=useState('1');const [condition,setCondition]=useState('');const [purchaseDate,setDate]=useState('');const [image,setImage]=useState('');const [notes,setNotes]=useState('');const [templateId,setTemplate]=useState('');
  return <Modal title="Create Custom Item" subtitle="Use this only when the catalog does not have the product. It can be reconciled later without losing ownership data." onClose={onClose}><div className="vxp2-manual-banner"><Search/><span><strong>Prefer canonical Search when possible.</strong><small>Known product metadata should not be retyped into the owned copy.</small></span><button onClick={()=>location.assign('/search')}>Search Catalog</button></div><div className="vxp2-form grid"><label className="wide">Item name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Category<input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Action Figures"/></label><label>Collection<select value={collectionId} onChange={e=>setCollection(e.target.value)}><option value="">All Items</option>{collections.map(collection=><option key={collection.id} value={collection.id}>{collectionPath(collection.id,collections).map(c=>c.name).join(' / ')}</option>)}</select></label><label>Price paid<input type="number" min="0" value={purchasePrice} onChange={e=>setPaid(e.target.value)}/></label><label>Current value<input type="number" min="0" value={currentValue} onChange={e=>setValue(e.target.value)}/></label><label>Quantity<input type="number" min="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Condition<input value={condition} onChange={e=>setCondition(e.target.value)}/></label><label>Purchase date<input type="date" value={purchaseDate} onChange={e=>setDate(e.target.value)}/></label><label>Field template<select value={templateId} onChange={e=>setTemplate(e.target.value)}><option value="">None</option>{templates.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="wide">Image URL<input value={image} onChange={e=>setImage(e.target.value)}/></label><label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)}/></label></div><footer className="vxp2-modal-footer"><button onClick={onClose}>Cancel</button><button className="red" disabled={!name.trim()} onClick={()=>onSave({name:name.trim(),category:category.trim()||'Miscellaneous',collectionId,purchasePrice:Number(purchasePrice)||0,currentValue:Number(currentValue)||0,quantity:Math.max(1,Number(quantity)||1),condition,purchaseDate,image,notes,templateId})}>Add Owned Item</button></footer></Modal>;
}

function Modal({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode}){return <div className="vxp2-modal-backdrop" onMouseDown={event=>event.currentTarget===event.target&&onClose()}><section className="vxp2-modal"><header><div><strong>{title}</strong><span>{subtitle}</span></div><button onClick={onClose}><X/></button></header>{children}</section></div>}

function SimpleLine({values}:{values:number[]}){
  const rows=values.filter(Number.isFinite);
  if(rows.length<2)return <Empty compact text="Not enough historical snapshots yet."/>;
  const min=Math.min(...rows),max=Math.max(...rows),range=Math.max(1,max-min);
  const d=rows.map((value,index)=>(index?'L':'M')+(index/(rows.length-1)*700).toFixed(1)+' '+(215-(value-min)/range*170).toFixed(1)).join(' ');
  return <svg className="vxp2-line" viewBox="0 0 700 235" preserveAspectRatio="none">{[45,90,135,180,225].map(y=><line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#202226"/>)}<path d={d} fill="none" stroke="#ff2338" strokeWidth="3"/></svg>;
}
function CollectionCover({collection}:{collection:Collection}){return <div className="vxp2-collection-cover" style={collection.coverImage?{backgroundImage:'url("'+collection.coverImage.replaceAll('"','')+'")'}:undefined}>{collection.coverImage?'':<Layers3/>}</div>}
function ItemThumb({item,large=false}:{item:Item;large?:boolean}){return <i className={'vxp2-thumb '+(large?'large':'')} style={item.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item.image?'':<Layers3/>}</i>}
function MiniItems({rows,store}:{rows:Item[];store:Store}){return <div className="vxp2-mini-items">{rows.map(item=><div key={item.id}><ItemThumb item={item}/><span><strong>{item.name}</strong><small>{pathLabel(item,store.collections)}</small></span><b>{portfolioMoney(item.currentValue*item.quantity)}</b></div>)}{!rows.length?<Empty compact text="No owned items yet."/>:null}</div>}
function Empty({text,compact=false,action}:{text:string;compact?:boolean;action?:ReactNode}){return <div className={'vxp2-empty '+(compact?'compact':'')}><Layers3/><strong>{text}</strong>{action}</div>}
function viewIcon(mode:PortfolioViewMode){if(mode==='grid')return <Grid2X2/>;if(mode==='list')return <List/>;if(mode==='table')return <Table2/>;if(mode==='gallery')return <ImageIcon/>;return <MoreHorizontal/>}

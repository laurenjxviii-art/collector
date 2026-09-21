'use client';

import {useState} from 'react';
import {
  CircleDollarSign,Eye,FileUp,Layers3,Plus,Search,Share2,ShoppingBag,
  SlidersHorizontal,Star
} from 'lucide-react';

type Mode='collection'|'analytics'|'data';
type ItemTab='overview'|'market'|'history'|'ownership'|'media'|'documents';

type PortfolioItem={
  id:string;
  name:string;
  subtitle:string;
  category:string;
  path:string[];
  value:number;
  paid:number;
  msrp:number;
  change:number;
  condition:string;
  tone:string;
  fields:Array<{label:string;value:string}>;
};

const money=(n:number)=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});

const ITEMS:PortfolioItem[]=[
  {id:'final-swing',name:'Spider-Man Final Swing',subtitle:'Marvel Legends · 2024',category:'Action Figures',path:['Action Figures','Marvel Legends','Movie Spider-Man','No Way Home'],value:42.68,paid:24.99,msrp:24.99,change:28,condition:'Opened Complete',tone:'red',fields:[
    {label:'Manufacturer',value:'Hasbro'},{label:'Line',value:'Marvel Legends'},{label:'Character',value:'Spider-Man'},{label:'Movie',value:'No Way Home'},{label:'Year',value:'2024'},{label:'Condition',value:'Opened Complete'},{label:'Box',value:'Yes'},{label:'Accessories',value:'Complete'},{label:'Price Paid',value:'$24.99'},{label:'MSRP',value:'$24.99'},{label:'Current Value',value:'$42.68'},{label:'Purchased From',value:'Target'},{label:'Purchase Date',value:'Jan 18, 2026'},{label:'Storage Location',value:'Detolf #2 / Shelf 3'},{label:'SKU',value:'F90715L00'},{label:'UPC',value:'5010996283714'}]},
  {id:'asm2',name:'The Amazing Spider-Man 2',subtitle:'Marvel Legends · 2023',category:'Action Figures',path:['Action Figures','Marvel Legends','Movie Spider-Man','Amazing Spider-Man'],value:61,paid:25,msrp:24.99,change:19,condition:'Opened Complete',tone:'blue',fields:[
    {label:'Manufacturer',value:'Hasbro'},{label:'Line',value:'Marvel Legends'},{label:'Character',value:'Spider-Man'},{label:'Movie',value:'The Amazing Spider-Man 2'},{label:'Year',value:'2023'},{label:'Condition',value:'Opened Complete'},{label:'Box',value:'Yes'},{label:'Accessories',value:'Complete'},{label:'Price Paid',value:'$25.00'},{label:'MSRP',value:'$24.99'},{label:'Current Value',value:'$61.00'},{label:'Purchased From',value:'eBay'},{label:'Purchase Date',value:'Aug 29, 2026'},{label:'Storage Location',value:'Detolf #2 / Shelf 2'},{label:'SKU',value:'—'},{label:'UPC',value:'—'}]},
  {id:'charizard',name:'Charizard ex SIR',subtitle:'Pokémon · Phantasmal Flames',category:'Trading Cards',path:['Trading Cards','Pokémon','Phantasmal Flames','Master Set'],value:185,paid:74,msrp:0,change:14,condition:'Raw · NM',tone:'orange',fields:[
    {label:'Game',value:'Pokémon'},{label:'Set',value:'Phantasmal Flames'},{label:'Card',value:'Charizard ex'},{label:'Rarity',value:'Special Illustration Rare'},{label:'Condition',value:'Raw · Near Mint'},{label:'Language',value:'English'},{label:'Price Paid',value:'$74.00'},{label:'Current Value',value:'$185.00'},{label:'Purchased From',value:'Local Card Shop'},{label:'Purchase Date',value:'Sep 4, 2026'},{label:'Storage Location',value:'Vault X Binder / Page 18'},{label:'Card Number',value:'198/182'},{label:'Grading',value:'Ungraded'}]},
  {id:'gibson-sg',name:'Gibson SG Standard',subtitle:'Electric Guitar · Heritage Cherry',category:'Guitars',path:['Guitars','Electric','Gibson','SG'],value:1399,paid:1120,msrp:1599,change:6,condition:'Excellent',tone:'wine',fields:[
    {label:'Manufacturer',value:'Gibson'},{label:'Model',value:'SG Standard'},{label:'Type',value:'Electric Guitar'},{label:'Finish',value:'Heritage Cherry'},{label:'Year',value:'2021'},{label:'Condition',value:'Excellent'},{label:'Serial Number',value:'221310478'},{label:'Price Paid',value:'$1,120.00'},{label:'MSRP',value:'$1,599.00'},{label:'Current Value',value:'$1,399.00'},{label:'Purchased From',value:'Reverb'},{label:'Storage Location',value:'Wall Rack / Slot 2'}]},
  {id:'comic',name:'Spider-Man #1 Silver Cover',subtitle:'Marvel Comics · Slabbed',category:'Comics',path:['Comics','Marvel','Spider-Man','Slabbed'],value:225,paid:140,msrp:0,change:11,condition:'Graded 9.6',tone:'silver',fields:[
    {label:'Publisher',value:'Marvel'},{label:'Series',value:'Spider-Man'},{label:'Issue',value:'#1'},{label:'Cover',value:'Silver'},{label:'Condition',value:'Graded'},{label:'Grade',value:'9.6'},{label:'Price Paid',value:'$140.00'},{label:'Current Value',value:'$225.00'},{label:'Purchased From',value:'Comic Shop'},{label:'Purchase Date',value:'Aug 12, 2026'},{label:'Storage Location',value:'Comic Display / Row 1'}]},
  {id:'zd',name:'Spider-Man Brand New Day',subtitle:'ZD Toys · 1/10',category:'Collectible Figures',path:['Collectible Figures','ZD Toys','Spider-Man','Brand New Day'],value:89,paid:64,msrp:69,change:9,condition:'Opened Complete',tone:'deepred',fields:[
    {label:'Manufacturer',value:'ZD Toys'},{label:'Character',value:'Spider-Man'},{label:'Scale',value:'1/10'},{label:'Line',value:'Brand New Day'},{label:'Condition',value:'Opened Complete'},{label:'Box',value:'Yes'},{label:'Price Paid',value:'$64.00'},{label:'MSRP',value:'$69.00'},{label:'Current Value',value:'$89.00'},{label:'Purchased From',value:'Online Retailer'},{label:'Storage Location',value:'Display Case #1 / Shelf 4'}]},
  {id:'sony',name:'WH-1000XM5',subtitle:'Sony · Technology',category:'Technology',path:['Technology','Audio','Sony','Headphones'],value:248,paid:299,msrp:399,change:-8,condition:'Used Excellent',tone:'gray',fields:[
    {label:'Manufacturer',value:'Sony'},{label:'Model',value:'WH-1000XM5'},{label:'Type',value:'Headphones'},{label:'Condition',value:'Used Excellent'},{label:'Serial Number',value:'S01-495821'},{label:'Warranty',value:'Expired'},{label:'Price Paid',value:'$299.00'},{label:'MSRP',value:'$399.00'},{label:'Current Value',value:'$248.00'},{label:'Purchased From',value:'Best Buy'},{label:'Storage Location',value:'Desk / Drawer 2'}]},
  {id:'funko',name:'Miles Morales #529',subtitle:'Funko Pop! · Marvel',category:'Collectible Figures',path:['Collectible Figures','Funko Pop!','Marvel','Spider-Man'],value:34,paid:15,msrp:14.99,change:7,condition:'Sealed',tone:'purple',fields:[
    {label:'Manufacturer',value:'Funko'},{label:'Line',value:'Pop!'},{label:'Character',value:'Miles Morales'},{label:'Number',value:'#529'},{label:'Condition',value:'Sealed'},{label:'Box',value:'Yes'},{label:'Price Paid',value:'$15.00'},{label:'MSRP',value:'$14.99'},{label:'Current Value',value:'$34.00'},{label:'Purchased From',value:'Hot Topic'},{label:'Storage Location',value:'Shelf Wall / Row 2'}]}
];

const TREE:any[]=[
  {label:'Action Figures',count:182,children:[{label:'Marvel Legends',count:94,children:[{label:'Movie Spider-Man',count:28,children:[{label:'No Way Home',count:13},{label:'Amazing Spider-Man',count:6},{label:'Homecoming',count:5},{label:'Far From Home',count:4}]},{label:'X-Men',count:31},{label:'Avengers',count:21}]},{label:'SH Figuarts',count:38},{label:'McFarlane',count:27},{label:'Other',count:23}]},
  {label:'Trading Cards',count:121,children:[{label:'Pokémon',count:84,children:[{label:'Phantasmal Flames',count:38},{label:'151',count:27},{label:'Mega Evolution',count:19}]},{label:'Magic: The Gathering',count:21},{label:'Union Arena',count:16}]},
  {label:'Comics',count:71,children:[{label:'Marvel',count:55},{label:'DC',count:16}]},
  {label:'Collectible Figures',count:43,children:[{label:'Funko Pop!',count:19},{label:'ZD Toys',count:12},{label:'Pop Mart',count:12}]},
  {label:'Guitars',count:9,children:[{label:'Electric',count:6,children:[{label:'Gibson',count:2},{label:'Squier',count:2},{label:'Other',count:2}]},{label:'Acoustic',count:3}]},
  {label:'Technology',count:32},{label:'Misc',count:29}
];

function MiniHead({title,action}:{title:string;action?:string}){
  return <div className="vxp-head"><h3>{title}</h3>{action?<button>{action}</button>:null}</div>;
}

function TreeNode({node,depth=0,active,setActive}:{node:any;depth?:number;active:string;setActive:(v:string)=>void}){
  const [open,setOpen]=useState(depth<2);
  const hasChildren=Array.isArray(node.children)&&node.children.length>0;
  return <div className="vxp-tree-node">
    <button className={active===node.label?'active':''} style={{paddingLeft:10+depth*14}} onClick={()=>{setActive(node.label);if(hasChildren)setOpen(v=>!v)}}>
      <span>{hasChildren?(open?'⌄':'›'):'·'}</span><Layers3/><strong>{node.label}</strong><em>{node.count}</em>
    </button>
    {hasChildren&&open?<div>{node.children.map((child:any)=><TreeNode key={child.label} node={child} depth={depth+1} active={active} setActive={setActive}/>)}</div>:null}
  </div>;
}

function Analytics(){
  const metrics=[
    ['Current value','$12,481','+18.4% YTD','green'],['Cost basis','$8,714','$3,767 unrealized gain','muted'],['Unrealized P/L','+$3,767','+43.2%','green'],['Realized profit','$1,204','37 sold items','green'],
    ['Items owned','487','+18 this month','muted'],['Average item value','$25.63','Active inventory','muted'],['Average purchase price','$17.89','All acquisitions','muted'],['MSRP savings','$723','Paid below retail','green'],
    ['Paid over MSRP','$419','26 items','red'],['Collection growth','+18.4%','YTD','green'],['Most valuable category','Comics','$3,842','muted'],['Most profitable category','Pokémon','+62% avg P/L','green'],
    ['Most collected brand','Hasbro','94 items','muted'],['Most used retailer','Target','68 purchases','muted'],['Purchases / month','13.4','12 month avg','muted'],['Spend / month','$286','12 month avg','orange'],
    ['Average hold period','19 months','Owned + sold','muted'],['Completion rate','82%','Tracked sets','green'],['Sealed / open ratio','21 / 79','By item count','muted'],['Missing metadata','34','Needs attention','orange'],
    ['Missing receipts','57','Insurance readiness','orange'],['Duplicates','8','Review recommended','red']
  ];
  return <div className="vxp-analytics">
    <div className="vxp-metric-grid">{metrics.map(m=><section className="vx-panel vxp-metric" key={m[0]}><span>{m[0]}</span><strong className={'tone-'+m[3]}>{m[1]}</strong><small>{m[2]}</small></section>)}</div>
    <div className="vxp-analytics-row">
      <section className="vx-panel vxp-chart"><MiniHead title="Portfolio Growth"/><svg viewBox="0 0 700 230" preserveAspectRatio="none"><path d="M0 205 L45 190 L85 194 L125 170 L165 148 L205 132 L245 120 L285 103 L325 109 L365 88 L405 80 L445 67 L485 72 L525 51 L565 43 L610 31 L650 35 L700 18" fill="none" stroke="#ff2338" strokeWidth="4"/><path d="M0 220 L45 213 L85 208 L125 201 L165 194 L205 186 L245 178 L285 169 L325 161 L365 153 L405 144 L445 135 L485 127 L525 117 L565 107 L610 98 L650 89 L700 78" fill="none" stroke="#b9bcc2" strokeWidth="2.5"/></svg><footer><span><i className="red"/>Current value</span><span><i/>Cost basis</span></footer></section>
      <section className="vx-panel vxp-category-performance"><MiniHead title="Category Performance"/>{[['Comics','$3,842','+31%',100],['Action Figures','$3,420','+24%',89],['Trading Cards','$2,765','+62%',72],['Guitars','$1,925','+8%',50],['Technology','$529','-4%',14]].map(row=><div key={String(row[0])}><strong>{row[0]}</strong><span><i style={{width:String(row[3])+'%'}}/></span><b>{row[1]}</b><em className={String(row[2]).startsWith('-')?'tone-red':'tone-green'}>{row[2]}</em></div>)}</section>
      <section className="vx-panel vxp-behavior"><MiniHead title="Collection Behavior"/>{[['Target','68 purchases'],['eBay','51 purchases'],['Local Shops','37 purchases'],['Online Retailers','29 purchases'],['Other','22 purchases']].map((row,i)=><div key={row[0]}><i>{i+1}</i><strong>{row[0]}</strong><span>{row[1]}</span></div>)}</section>
    </div>
  </div>;
}

function DataHealth(){
  const issues=[
    ['34 items missing metadata','Manufacturer, year, condition or category data is incomplete.','Review metadata','orange'],
    ['57 items missing receipts','Add proof of purchase for insurance-ready documentation.','Add receipts','orange'],
    ['8 possible duplicates','Matching titles, SKUs or UPCs may represent duplicates.','Review duplicates','red'],
    ['12 items missing current value','Market value has not been linked or entered yet.','Add value source','muted'],
    ['19 items missing condition photos','Useful for provenance, insurance and future sales.','Upload photos','muted'],
    ['6 warranties expiring soon','Save warranty documents before coverage ends.','Review warranties','green']
  ];
  return <div className="vxp-health">
    <section className="vx-panel vxp-health-summary"><div><strong>84%</strong><span>Portfolio data completeness</span></div><div className="vxp-health-ring"><b>84%</b></div><p>VEXUM checks your catalog for missing information, duplicates, documents and provenance gaps.</p></section>
    <div className="vxp-health-grid">{issues.map(row=><section className="vx-panel vxp-health-card" key={row[0]}><i className={'health-'+row[3]}/><div><strong>{row[0]}</strong><p>{row[1]}</p></div><button>{row[2]} →</button></section>)}</div>
  </div>;
}

function ItemRecord({item,onBack}:{item:PortfolioItem;onBack:()=>void}){
  const [tab,setTab]=useState<ItemTab>('overview');
  const [editing,setEditing]=useState(false);
  const [fields,setFields]=useState(item.fields);

  const addField=()=>{
    const label=window.prompt('Field name');
    if(!label)return;
    const value=window.prompt('Field value')||'—';
    setFields(current=>[...current,{label,value}]);
  };

  return <div className="vxp-record">
    <div className="vxp-record-top"><button onClick={onBack}>← Back to Portfolio</button><span>{item.path.join(' / ')}</span><div><button><Share2/>Export Record</button><button className="red"><SlidersHorizontal/>Actions</button></div></div>
    <section className="vx-panel vxp-record-hero"><div className={'vxp-record-art '+item.tone}><Layers3/></div><div className="vxp-record-title"><span>{item.category}</span><h1>{item.name}</h1><p>{item.subtitle}</p><div><em>{item.condition}</em><em>Owned</em><em>1 of 1</em></div></div><aside><span>Current Value</span><strong>{money(item.value)}</strong><em className={item.change>=0?'tone-green':'tone-red'}>{item.change>=0?'↑':'↓'} {Math.abs(item.change)}%</em><small>Price Paid {money(item.paid)}</small></aside></section>
    <div className="vxp-record-tabs">{(['overview','market','history','ownership','media','documents'] as ItemTab[]).map(id=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id[0].toUpperCase()+id.slice(1)}</button>)}</div>

    {tab==='overview'?<div className="vxp-record-overview">
      <section className="vx-panel vxp-fields"><div className="vxp-section-head"><div><h3>Item Record</h3><p>Universal metadata for this exact item.</p></div><div><button onClick={addField}><Plus/>Add Field</button><button className={editing?'active':''} onClick={()=>setEditing(v=>!v)}><SlidersHorizontal/>{editing?'Done':'Edit Fields'}</button></div></div><div className="vxp-fields-grid">{fields.map((field,index)=><div className="vxp-field" key={field.label+index}><span>{field.label}</span>{editing?<><input value={field.value} onChange={e=>setFields(current=>current.map((f,i)=>i===index?{...f,value:e.target.value}:f))}/><button onClick={()=>setFields(current=>current.filter((_,i)=>i!==index))}>×</button></>:<strong>{field.value}</strong>}</div>)}</div></section>
      <aside className="vxp-record-side"><section className="vx-panel"><MiniHead title="Ownership Snapshot"/>{[['Quantity','1'],['Owned Since','8 months'],['Cost Basis',money(item.paid)],['Unrealized P/L',money(item.value-item.paid)],['Hold Period','8 months'],['Insurance Status','Ready']].map(row=><div className="vxp-side-row" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</section><section className="vx-panel"><MiniHead title="Provenance"/><div className="vxp-provenance"><strong>92%</strong><span>Documentation complete</span></div>{['Receipt attached','4 item photos','Condition documented','Purchase source saved','Identifier saved'].map((x,i)=><div className="vxp-prov-row" key={x}><i className={i===4?'warn':''}>{i===4?'!':'✓'}</i>{x}</div>)}</section></aside>
    </div>:null}

    {tab==='market'?<div className="vxp-tab-grid"><section className="vx-panel vxp-market-chart"><MiniHead title="Value History"/><svg viewBox="0 0 700 250" preserveAspectRatio="none"><path d="M0 208 L60 194 L115 201 L170 170 L225 151 L280 160 L335 126 L390 118 L445 92 L500 103 L555 69 L610 61 L700 34" fill="none" stroke="#ff2338" strokeWidth="4"/></svg><footer>{[['Current',money(item.value)],['Paid',money(item.paid)],['MSRP',money(item.msrp)],['P/L',money(item.value-item.paid)]].map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</footer></section><section className="vx-panel vxp-market-sources"><MiniHead title="Market Sources"/>{[['eBay Sold','$41.90','18 sales'],['Retail','$24.99','2 in stock'],['Collector Marketplace','$44.00','9 offers'],['Price Guide','$43.10','Updated 3h ago']].map(row=><div key={row[0]}><strong>{row[0]}</strong><b>{row[1]}</b><span>{row[2]}</span></div>)}</section></div>:null}

    {tab==='history'?<section className="vx-panel vxp-history"><MiniHead title="Item Timeline"/>{[['Sep 21, 2026','Market value updated','$42.68','VEXUM Intelligence'],['Aug 30, 2026','Condition photos added','4 photos','You'],['Jan 18, 2026','Purchased',money(item.paid),'Retailer'],['Jan 18, 2026','Added to VEXUM',item.condition,'You'],['Dec 2025','Released',money(item.msrp)+' MSRP','Manufacturer']].map((row,index)=><div key={row[0]+row[1]}><i>{index+1}</i><time>{row[0]}</time><strong>{row[1]}</strong><span>{row[2]}</span><em>{row[3]}</em></div>)}</section>:null}

    {tab==='ownership'?<div className="vxp-tab-grid"><section className="vx-panel vxp-ownership"><MiniHead title="Acquisition"/>{[['Purchased From','Target'],['Purchase Date','Jan 18, 2026'],['Price Paid',money(item.paid)],['Payment Method','Visa •••• 4821'],['Original Listing','Saved snapshot'],['Receipt','Attached']].map(row=><div className="vxp-side-row" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</section><section className="vx-panel vxp-ownership"><MiniHead title="Current Ownership"/>{[['Owner','Jordan'],['Quantity','1'],['Condition',item.condition],['Storage Location','Detolf #2 / Shelf 3'],['Insured Value',money(item.value)],['For Sale','No']].map(row=><div className="vxp-side-row" key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}</section></div>:null}

    {tab==='media'?<section className="vx-panel vxp-media"><div className="vxp-section-head"><div><h3>Media</h3><p>Product, packaging, condition and provenance photos.</p></div><button><Plus/>Add Media</button></div><div className="vxp-media-grid">{['Primary','Front','Back','Accessories','Box','Condition'].map((x,i)=><button key={x}><div className={'vxp-media-art m'+i}><Layers3/></div><strong>{x}</strong><span>{i===0?'Primary image':'Condition photo'}</span></button>)}</div></section>:null}

    {tab==='documents'?<section className="vx-panel vxp-docs"><div className="vxp-section-head"><div><h3>Documents</h3><p>Proof, provenance, warranty and insurance records.</p></div><button><Plus/>Upload Document</button></div>{[['Receipt','Target_receipt_011826.pdf','Jan 18, 2026','Verified'],['Certificate of Authenticity','Not provided','—','Missing'],['Warranty','Limited warranty.pdf','Jan 18, 2026','Saved'],['Manual','Care guide.pdf','Jan 18, 2026','Saved'],['Original Listing','Product page snapshot','Jan 18, 2026','Saved'],['Insurance Record','VEXUM item report.pdf','Sep 21, 2026','Generated']].map(row=><div className="vxp-doc-row" key={row[0]}><FileUp/><strong>{row[0]}</strong><span>{row[1]}</span><time>{row[2]}</time><em className={row[3]==='Missing'?'tone-red':'tone-green'}>{row[3]}</em><button>•••</button></div>)}</section>:null}
  </div>;
}

export default function VexumPortfolio(){
  const [mode,setMode]=useState<Mode>('collection');
  const [active,setActive]=useState('All Items');
  const [selected,setSelected]=useState<PortfolioItem|null>(null);
  const [query,setQuery]=useState('');
  const [view,setView]=useState<'grid'|'table'>('grid');
  const [customNodes,setCustomNodes]=useState<Array<{label:string;count:number}>>([]);

  if(selected)return <ItemRecord item={selected} onBack={()=>setSelected(null)}/>;

  const filtered=ITEMS.filter(item=>{
    const haystack=(item.name+' '+item.subtitle+' '+item.category+' '+item.path.join(' ')).toLowerCase();
    return (!query||haystack.includes(query.toLowerCase()))&&(active==='All Items'||item.category===active||item.path.includes(active));
  });

  const addStructure=()=>{
    const name=window.prompt('Name this new collection, group, set, or folder');
    if(!name)return;
    setCustomNodes(current=>[...current,{label:name,count:0}]);
    setActive(name);
  };

  return <div className="vxp-page">
    <section className="vxp-title"><div><h1>Portfolio</h1><p>What you own. Organized exactly the way you think.</p></div><aside><span>PORTFOLIO</span><q>Your collection. Your structure. No forced taxonomy.</q></aside></section>
    <div className="vxp-modebar"><div>{(['collection','analytics','data'] as Mode[]).map(id=><button key={id} className={mode===id?'active':''} onClick={()=>setMode(id)}>{id==='collection'?'Collection':id==='analytics'?'Analytics':'Data Health'}</button>)}</div><span>Portfolio = what you own · Setup = where it physically is</span></div>

    {mode==='analytics'?<Analytics/>:mode==='data'?<DataHealth/>:<>
      <div className="vxp-summary">{[['Current Value','$12,481','↑ +18.4% YTD','green'],['Cost Basis','$8,714','$3,767 unrealized gain','muted'],['Unrealized P/L','+$3,767','+43.2%','green'],['Realized Profit','+$1,204','37 sold items','green'],['Items Owned','487','+18 this month','muted']].map(row=><section className="vx-panel vxp-summary-card" key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small className={'tone-'+row[3]}>{row[2]}</small></section>)}</div>
      <div className="vxp-shell">
        <aside className="vx-panel vxp-tree"><div className="vxp-tree-head"><div><h3>Organization</h3><p>Create any hierarchy you want.</p></div><button onClick={addStructure}><Plus/></button></div><button className={'vxp-tree-all '+(active==='All Items'?'active':'')} onClick={()=>setActive('All Items')}><Layers3/><strong>All Items</strong><em>487</em></button><div className="vxp-tree-scroll">{TREE.map(node=><TreeNode key={node.label} node={node} active={active} setActive={setActive}/>)}{customNodes.map(node=><TreeNode key={node.label} node={node} active={active} setActive={setActive}/>)}</div><div className="vxp-tree-footer"><button onClick={addStructure}><Plus/>New collection / folder</button><button><SlidersHorizontal/>Manage structure</button></div></aside>
        <section className="vxp-main">
          <div className="vxp-toolbar"><div><h3>{active}</h3><span>{filtered.length} shown · 487 total</span></div><div><label><Search/><input placeholder="Search this collection..." value={query} onChange={e=>setQuery(e.target.value)}/></label><button><SlidersHorizontal/>Filter</button><button className={view==='table'?'active':''} onClick={()=>setView('table')}>≡</button><button className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Layers3/></button><button className="red"><Plus/>Add Item</button></div></div>
          <div className="vxp-path-example"><span>Example structure:</span><b>Action Figures</b><i>›</i><b>Marvel Legends</b><i>›</i><b>Movie Spider-Man</b><i>›</i><b>No Way Home</b></div>
          {view==='grid'?<div className="vxp-grid">{filtered.map(item=><button className="vxp-card" key={item.id} onClick={()=>setSelected(item)}><div className={'vxp-card-art '+item.tone}><Layers3/><span>{item.condition}</span></div><div className="vxp-card-path">{item.path.slice(-2).join(' / ')}</div><strong>{item.name}</strong><span>{item.subtitle}</span><footer><div><small>Value</small><b>{money(item.value)}</b></div><div><small>P/L</small><em className={item.value>=item.paid?'tone-green':'tone-red'}>{money(item.value-item.paid)}</em></div></footer></button>)}</div>:<div className="vxp-table"><div className="vxp-table-head"><span>Item</span><span>Path</span><span>Condition</span><span>Paid</span><span>Value</span><span>P/L</span><span/></div>{filtered.map(item=><button key={item.id} onClick={()=>setSelected(item)}><span><i className={'vxp-table-thumb '+item.tone}><Layers3/></i><strong>{item.name}</strong><small>{item.subtitle}</small></span><span>{item.path.join(' / ')}</span><em>{item.condition}</em><b>{money(item.paid)}</b><b>{money(item.value)}</b><strong className={item.value>=item.paid?'tone-green':'tone-red'}>{money(item.value-item.paid)}</strong><i>›</i></button>)}</div>}
        </section>
      </div>
    </>}
  </div>;
}

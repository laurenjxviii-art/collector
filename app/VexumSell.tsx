'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  AlertTriangle,Archive,BarChart3,Box,Check,CircleDollarSign,Clock,CreditCard,ExternalLink,
  FileText,Layers3,PackageCheck,PackageOpen,Pause,Plus,RefreshCw,Search,ShoppingBag,
  Store,Tag,Truck,WalletCards,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {normalizeSetupData} from '../lib/setup';
import {normalizeFinancialData,newFinancialId} from '../lib/financial';
import {ensureCollectorProfile} from '../lib/socialCloud';
import {
  createManualSale,createSellListing,endSellListing,listMarketplaceListings,loadSellWorkspace,
  pauseSellListing,publishVexumListing,recordManualOffer,updateOfferStatus,updateOrderStatus,
  upsertShipment,type MarketplaceListing,type SellListing,type SellListingChannel,type SellOffer,
  type SellOrder,type SellWorkspace
} from '../lib/sellCloud';
import type {Item} from '../lib/model';

type Tab='Overview'|'Listings'|'Crosslist'|'Marketplace'|'Offers'|'Orders'|'Sold'|'Analytics';
type ComposerMode='listing'|'sale'|'offer'|'shipment'|null;

const EMPTY_SELL:SellWorkspace={listings:[],channels:[],offers:[],orders:[],orderItems:[],shipments:[],returns:[],connections:[],shippingProfiles:[]};
const PROVIDERS=[
  {id:'vexum',label:'VEXUM Marketplace',state:'supported'},
  {id:'ebay',label:'eBay',state:'not_connected'},
  {id:'vinted',label:'Vinted',state:'unsupported'},
  {id:'depop',label:'Depop',state:'unsupported'},
  {id:'mercari',label:'Mercari',state:'unsupported'},
  {id:'facebook',label:'Facebook Marketplace',state:'unsupported'}
] as const;

function money(value:number){
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number.isFinite(value)?value:0);
}
function pct(value:number){return (value*100).toFixed(1)+'%'}
function date(value?:string|null){
  if(!value)return '—';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));
}
function norm(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function itemImage(item?:Item){return item?.image||''}
function netProfit(order:SellOrder,item?:Item,quantity=1){
  return order.net_proceeds-(item?.purchasePrice||0)*quantity;
}
function activeListing(status:SellListing['status']){return ['ready','publishing','active','paused','sale_pending'].includes(status)}
function liveListing(status:SellListing['status']){return ['active','paused','sale_pending'].includes(status)}

function Metric({label,value,sub,tone='muted'}:{label:string;value:string;sub:string;tone?:'muted'|'green'|'red'|'orange'}){
  return <section className="vxsel-metric"><span>{label}</span><strong>{value}</strong><small className={'tone-'+tone}>{sub}</small></section>;
}

export default function VexumSell(){
  const workspace=useWorkspace();
  const [tab,setTab]=useState<Tab>('Overview');
  const [data,setData]=useState<SellWorkspace>(EMPTY_SELL);
  const [marketplace,setMarketplace]=useState<MarketplaceListing[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [composer,setComposer]=useState<ComposerMode>(null);
  const [selectedItemId,setSelectedItemId]=useState('');
  const [selectedListingId,setSelectedListingId]=useState('');
  const [selectedOrderId,setSelectedOrderId]=useState('');
  const [query,setQuery]=useState('');

  const config=workspace.config;
  const session=workspace.session;
  const owned=workspace.data.items.filter(item=>item.status==='owned');
  const soldItems=workspace.data.items.filter(item=>item.status==='sold');
  const setup=normalizeSetupData(workspace.data.setup);
  const financial=normalizeFinancialData(workspace.data.financial);
  const listingByItem=new Map(data.listings.filter(listing=>activeListing(listing.status)).map(listing=>[listing.portfolio_item_id,listing]));
  const orderItemByOrder=new Map(data.orderItems.map(item=>[item.order_id,item]));

  async function refresh(){
    if(!workspace.ready){return}
    if(!config?.configured||!session){setData(EMPTY_SELL);setMarketplace([]);setLoading(false);return}
    setLoading(true);setError('');
    try{
      await ensureCollectorProfile(config,session,{displayName:workspace.data.profile?.name,avatarUrl:workspace.data.profile?.image});
      const [mine,market]=await Promise.all([loadSellWorkspace(config,session),listMarketplaceListings(config,session)]);
      setData(mine);setMarketplace(market);
    }catch(err){setError(err instanceof Error?err.message:'Sell could not load.')}
    finally{setLoading(false)}
  }

  useEffect(()=>{void refresh()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[workspace.ready,Boolean(workspace.config?.configured),workspace.session?.user.id]);

  const completedOrders=data.orders.filter(order=>order.status==='completed');
  const pendingOrders=data.orders.filter(order=>!['completed','cancelled','returned','refunded'].includes(order.status));
  const activeListings=data.listings.filter(listing=>liveListing(listing.status));
  const listedValue=activeListings.reduce((sum,listing)=>sum+listing.price*listing.quantity,0);
  const soldMonth=new Date().toISOString().slice(0,7);
  const monthOrders=completedOrders.filter(order=>(order.completed_at||order.updated_at).startsWith(soldMonth));
  const monthRevenue=monthOrders.reduce((sum,order)=>sum+order.item_subtotal,0);
  const monthNet=monthOrders.reduce((sum,order)=>sum+order.net_proceeds,0);
  const monthCost=monthOrders.reduce((sum,order)=>{
    const oi=orderItemByOrder.get(order.id);return sum+(oi?.cost_basis_snapshot||0)*(oi?.quantity||1)
  },0);
  const monthProfit=monthNet-monthCost;
  const allProfit=completedOrders.reduce((sum,order)=>{
    const oi=orderItemByOrder.get(order.id);return sum+order.net_proceeds-(oi?.cost_basis_snapshot||0)*(oi?.quantity||1)
  },0);
  const averageMargin=completedOrders.length&&completedOrders.reduce((sum,order)=>{
    const oi=orderItemByOrder.get(order.id);const profit=order.net_proceeds-(oi?.cost_basis_snapshot||0)*(oi?.quantity||1);
    return sum+(order.item_subtotal?profit/order.item_subtotal:0)
  },0)/completedOrders.length;
  const waitingOffers=data.offers.filter(offer=>offer.status==='pending');
  const inventoryCost=activeListings.reduce((sum,listing)=>{
    const item=workspace.data.items.find(i=>i.id===listing.portfolio_item_id);return sum+(item?.purchasePrice||0)*listing.quantity
  },0);

  const staleListings=activeListings.filter(listing=>(Date.now()-Date.parse(listing.published_at||listing.created_at))/86400000>=30);
  const listingsMissingPhotos=activeListings.filter(listing=>!listing.media?.length);
  const ordersNeedShipping=pendingOrders.filter(order=>['paid','preparing_shipment'].includes(order.status));

  const filteredListings=data.listings.filter(listing=>{
    const item=workspace.data.items.find(i=>i.id===listing.portfolio_item_id);
    return !query||[listing.title,listing.status,item?.name,item?.category].join(' ').toLowerCase().includes(query.toLowerCase());
  });

  async function publish(listing:SellListing){
    if(!config||!session)return;
    setBusy(true);
    try{await publishVexumListing(config,session,listing.id,listing.price,listing.quantity);await refresh()}
    catch(err){setError(err instanceof Error?err.message:'Listing could not publish.')}
    finally{setBusy(false)}
  }
  async function pause(listing:SellListing){
    if(!config||!session)return;
    setBusy(true);
    try{await pauseSellListing(config,session,listing.id,listing.status!=='paused');await refresh()}
    catch(err){setError(err instanceof Error?err.message:'Listing state could not update.')}
    finally{setBusy(false)}
  }
  async function finishOrder(order:SellOrder){
    if(!config||!session)return;
    const orderItem=orderItemByOrder.get(order.id);
    if(!orderItem)throw new Error('Order item record is missing.');
    const item=workspace.data.items.find(entry=>entry.id===orderItem.portfolio_item_id);
    if(!item)throw new Error('The original Portfolio item could not be found.');
    setBusy(true);setError('');
    try{
      const soldQty=Math.min(item.quantity,orderItem.quantity);
      const remaining=item.quantity-soldQty;
      const stamp=new Date().toISOString();
      let items=workspace.data.items;
      if(remaining>0){
        const soldCopy:Item={...item,id:'sold_'+order.id,quantity:soldQty,status:'sold',location:'',createdAt:item.createdAt,updatedAt:stamp};
        items=items.map(entry=>entry.id===item.id?{...entry,quantity:remaining,updatedAt:stamp}:entry);
        if(!items.some(entry=>entry.id===soldCopy.id))items=[...items,soldCopy];
      }else{
        items=items.map(entry=>entry.id===item.id?{...entry,status:'sold' as const,location:'',updatedAt:stamp}:entry);
      }
      const placements=remaining>0?setup.placements:setup.placements.filter(p=>p.portfolioItemId!==item.id);
      const txExists=financial.transactions.some(tx=>tx.saleId===order.id);
      const saleTx=txExists?financial.transactions:[{
        id:newFinancialId('sale'),date:stamp.slice(0,10),amount:order.net_proceeds,direction:'income' as const,
        merchant:order.provider==='vexum'?'VEXUM Marketplace':order.provider,category:'Marketplace Sales',subcategory:item.category,
        description:'Sale: '+item.name+' · gross '+money(order.item_subtotal),isRecurring:false,isHobby:true,
        portfolioItemId:item.id,productId:orderItem.product_id||undefined,saleId:order.id,createdAt:stamp,updatedAt:stamp
      },...financial.transactions];
      workspace.update({...workspace.data,items,setup:{...setup,placements},financial:{...financial,transactions:saleTx}});
      await updateOrderStatus(config,session,order.id,'completed');
      await refresh();
    }catch(err){setError(err instanceof Error?err.message:'Sale completion could not finish.')}
    finally{setBusy(false)}
  }

  if(!workspace.ready||loading)return <div className="vxsel-page"><div className="vxsel-loading">Loading seller workspace…</div></div>;

  return <div className="vxsel-page">
    <section className="vxsel-title"><div><span>SELL</span><h1>Commerce Control</h1><p>One owned copy, one inventory identity, and a full path from listing through order, shipment, Financial result, and Sold Archive.</p></div><aside><strong>{session?'Normalized commerce data':'Local mode'}</strong><small>{session?'Seller economics remain private under RLS.':'Sign in to create listings and orders.'}</small></aside></section>
    <nav className="vxsel-tabs">{(['Overview','Listings','Crosslist','Marketplace','Offers','Orders','Sold','Analytics'] as Tab[]).map(name=><button className={tab===name?'active':''} key={name} onClick={()=>setTab(name)}>{name}</button>)}</nav>
    {error?<div className="vxsel-error"><AlertTriangle/><span>{error}</span><button onClick={()=>setError('')}><X/></button></div>:null}

    {!session?<section className="vxsel-panel"><div className="vxsel-empty"><ShoppingBag/><strong>Sell requires a signed-in VEXUM workspace</strong><p>Commerce records are server-protected and must reference the authenticated collector. Local Portfolio data is unchanged.</p></div></section>:null}

    {session&&tab==='Overview'?<>
      <div className="vxsel-metrics">
        <Metric label="Active Listings" value={String(activeListings.length)} sub={money(listedValue)+' listed value'}/>
        <Metric label="Sold This Month" value={money(monthRevenue)} sub={monthOrders.length+' completed sale'+(monthOrders.length===1?'':'s')} tone="green"/>
        <Metric label="Net Profit This Month" value={(monthProfit>=0?'+':'')+money(monthProfit)} sub={money(monthNet)+' net proceeds'} tone={monthProfit>=0?'green':'red'}/>
        <Metric label="Average Margin" value={completedOrders.length?pct(averageMargin):'—'} sub="Completed sales only"/>
        <Metric label="Offers Waiting" value={String(waitingOffers.length)} sub={waitingOffers.length?money(waitingOffers.reduce((s,o)=>s+o.amount,0))+' offered':'No pending offers'} tone={waitingOffers.length?'orange':'muted'}/>
        <Metric label="Inventory Cost" value={money(inventoryCost)} sub="Cost basis of active listings"/>
      </div>
      <div className="vxsel-overview-grid">
        <section className="vxsel-panel"><header><h3>Needs Attention</h3><button onClick={()=>setTab('Listings')}>Open Listings</button></header><div className="vxsel-attention">
          <AttentionRow icon={<Clock/>} count={staleListings.length} label="Listings aged 30+ days" action="Review pricing or end stale inventory."/>
          <AttentionRow icon={<ImageIconFallback/>} count={listingsMissingPhotos.length} label="Listings missing photos" action="Add explicit public listing media."/>
          <AttentionRow icon={<WalletCards/>} count={waitingOffers.length} label="Offers waiting" action="Accept, counter, or decline manually."/>
          <AttentionRow icon={<Truck/>} count={ordersNeedShipping.length} label="Orders need shipping" action="Add tracking before completion."/>
        </div></section>
        <section className="vxsel-panel"><header><h3>Recent Sales</h3><button onClick={()=>setTab('Sold')}>Sold Archive</button></header><RecentSales orders={data.orders.slice(0,6)} orderItems={data.orderItems} items={workspace.data.items}/></section>
        <section className="vxsel-panel vxsel-wide"><header><h3>Sell From Portfolio</h3><button className="red" onClick={()=>{setSelectedItemId('');setComposer('listing')}}><Plus/>Create Listing</button></header><div className="vxsel-owned-strip">{owned.filter(item=>!listingByItem.has(item.id)).slice(0,8).map(item=><button key={item.id} onClick={()=>{setSelectedItemId(item.id);setComposer('listing')}}><div className="art" style={item.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item.image?'':<PackageOpen/>}</div><span><strong>{item.name}</strong><small>{item.condition} · {item.quantity} owned</small></span><b>{money(item.currentValue)}</b></button>)}{!owned.some(item=>!listingByItem.has(item.id))?<div className="vxsel-empty-row">No unlisted owned inventory is available.</div>:null}</div></section>
        <section className="vxsel-panel vxsel-wide"><header><h3>Marketplace Connections</h3></header><ProviderGrid data={data}/></section>
      </div>
    </>:null}

    {session&&tab==='Listings'?<section className="vxsel-panel vxsel-full">
      <header><div><h3>Listings</h3><p>Drafts and active offers reference a specific owned Portfolio record.</p></div><div className="vxsel-head-actions"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search listings…"/></label><button className="red" onClick={()=>{setSelectedItemId('');setComposer('listing')}}><Plus/>New Listing</button></div></header>
      <ListingTable listings={filteredListings} channels={data.channels} items={workspace.data.items} busy={busy} onPublish={publish} onPause={pause} onSale={listing=>{setSelectedListingId(listing.id);setComposer('sale')}} onEnd={async listing=>{if(!config||!session)return;setBusy(true);try{await endSellListing(config,session,listing.id);await refresh()}catch(err){setError(err instanceof Error?err.message:'Listing could not end.')}finally{setBusy(false)}}}/>
    </section>:null}

    {session&&tab==='Crosslist'?<section className="vxsel-panel vxsel-full"><header><div><h3>Crosslist Control</h3><p>One internal listing may have many channel records. Unsupported providers remain explicit instead of pretending to sync.</p></div></header><CrosslistTable listings={activeListings} channels={data.channels}/><div className="vxsel-boundary"><AlertTriangle/><span><strong>External connectors are not configured.</strong> VEXUM Marketplace is the only publishable channel in this build. eBay/Vinted/Depop/Mercari/Facebook capability rows remain honest extension points.</span></div></section>:null}

    {session&&tab==='Marketplace'?<section className="vxsel-panel vxsel-full"><header><div><h3>VEXUM Marketplace</h3><p>Product-aware active public listings only. Seller cost basis, profit, and Setup location are never returned here.</p></div></header><MarketplaceGrid listings={marketplace} currentUserId={session.user.id} items={workspace.data.items}/></section>:null}

    {session&&tab==='Offers'?<section className="vxsel-panel vxsel-full"><header><div><h3>Offers</h3><p>VEXUM offers plus manually recorded external offers. No provider inbox is fabricated.</p></div><button onClick={()=>{setSelectedListingId(activeListings[0]?.id||'');setComposer('offer')}} disabled={!activeListings.length}><Plus/>Record External Offer</button></header><OffersTable offers={data.offers} listings={data.listings} items={workspace.data.items} onStatus={async(offer,status)=>{if(!config||!session)return;setBusy(true);try{await updateOfferStatus(config,session,offer.id,status);await refresh()}catch(err){setError(err instanceof Error?err.message:'Offer could not update.')}finally{setBusy(false)}}}/></section>:null}

    {session&&tab==='Orders'?<section className="vxsel-panel vxsel-full"><header><div><h3>Orders</h3><p>Payment, fulfillment, delivery, returns, and completion are distinct states.</p></div></header><OrdersTable orders={pendingOrders} orderItems={data.orderItems} shipments={data.shipments} items={workspace.data.items} onShip={order=>{setSelectedOrderId(order.id);setComposer('shipment')}} onAdvance={async(order,status)=>{if(!config||!session)return;setBusy(true);try{await updateOrderStatus(config,session,order.id,status);await refresh()}catch(err){setError(err instanceof Error?err.message:'Order state could not update.')}finally{setBusy(false)}} onComplete={order=>void finishOrder(order)}/></section>:null}

    {session&&tab==='Sold'?<section className="vxsel-panel vxsel-full"><header><div><h3>Sold Archive</h3><p>Completed commerce history is preserved; Portfolio ownership history is never deleted.</p></div></header><SoldTable orders={completedOrders} orderItems={data.orderItems} items={[...workspace.data.items,...soldItems]}/></section>:null}

    {session&&tab==='Analytics'?<AnalyticsView data={data} items={workspace.data.items} allProfit={allProfit}/>:null}

    {composer==='listing'&&config&&session?<ListingComposer items={owned} listings={data.listings} initialItemId={selectedItemId} onClose={()=>setComposer(null)} busy={busy} onSave={async input=>{
      setBusy(true);setError('');
      try{
        const listing=await createSellListing(config,session,input);
        if(input.publish&&listing)await publishVexumListing(config,session,listing.id,listing.price,listing.quantity);
        setComposer(null);await refresh();
      }catch(err){setError(err instanceof Error?err.message:'Listing could not be created.')}
      finally{setBusy(false)}
    }}/>:null}

    {composer==='sale'&&config&&session?<SaleComposer listing={data.listings.find(l=>l.id===selectedListingId)} item={workspace.data.items.find(i=>i.id===data.listings.find(l=>l.id===selectedListingId)?.portfolio_item_id)} onClose={()=>setComposer(null)} busy={busy} onSave={async input=>{
      const listing=data.listings.find(l=>l.id===selectedListingId);if(!listing)return;
      const item=workspace.data.items.find(i=>i.id===listing.portfolio_item_id);if(!item)return;
      setBusy(true);try{await createManualSale(config,session,{listing,costBasis:item.purchasePrice,...input});setComposer(null);await refresh()}catch(err){setError(err instanceof Error?err.message:'Sale could not be recorded.')}finally{setBusy(false)}
    }}/>:null}

    {composer==='offer'&&config&&session?<OfferComposer listings={activeListings} initialListingId={selectedListingId} onClose={()=>setComposer(null)} busy={busy} onSave={async input=>{
      setBusy(true);try{await recordManualOffer(config,session,input);setComposer(null);await refresh()}catch(err){setError(err instanceof Error?err.message:'Offer could not be recorded.')}finally{setBusy(false)}
    }}/>:null}

    {composer==='shipment'&&config&&session?<ShipmentComposer order={data.orders.find(o=>o.id===selectedOrderId)} onClose={()=>setComposer(null)} busy={busy} onSave={async input=>{
      if(!selectedOrderId)return;setBusy(true);try{await upsertShipment(config,session,{orderId:selectedOrderId,...input});await updateOrderStatus(config,session,selectedOrderId,'shipped');setComposer(null);await refresh()}catch(err){setError(err instanceof Error?err.message:'Shipment could not update.')}finally{setBusy(false)}
    }}/>:null}
  </div>;
}

function AttentionRow({icon,count,label,action}:{icon:ReactNode;count:number;label:string;action:string}){
  return <div className={count?'active':''}>{icon}<span><strong>{label}</strong><small>{action}</small></span><b>{count}</b></div>;
}
function ImageIconFallback(){return <FileText/>}

function RecentSales({orders,orderItems,items}:{orders:SellOrder[];orderItems:SellWorkspace['orderItems'];items:Item[]}){
  const rows=orders.filter(o=>['sold','paid','preparing_shipment','shipped','delivered','completed'].includes(o.status)).slice(0,6);
  return <div className="vxsel-mini-list">{rows.map(order=>{const oi=orderItems.find(i=>i.order_id===order.id);const item=items.find(i=>i.id===oi?.portfolio_item_id);return <div key={order.id}><div className="art" style={item?.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item?.image?'':<ShoppingBag/>}</div><span><strong>{item?.name||'Sold item'}</strong><small>{order.provider} · {order.status.replaceAll('_',' ')}</small></span><b>{money(order.item_subtotal)}</b><em className={netProfit(order,item,oi?.quantity)>=0?'tone-green':'tone-red'}>{netProfit(order,item,oi?.quantity)>=0?'+':''}{money(netProfit(order,item,oi?.quantity))}</em></div>})}{!rows.length?<div className="vxsel-empty-row">No sales have been recorded yet.</div>:null}</div>;
}

function ProviderGrid({data}:{data:SellWorkspace}){
  return <div className="vxsel-providers">{PROVIDERS.map(provider=>{const connection=data.connections.find(c=>c.provider===provider.id);const effective=connection?.state||provider.state;return <article key={provider.id}><Store/><span><strong>{provider.label}</strong><small>{effective.replaceAll('_',' ')}{connection?.last_synced_at?' · '+date(connection.last_synced_at):''}</small></span><em className={effective==='connected'||provider.id==='vexum'?'ready':''}>{provider.id==='vexum'?'Native':effective}</em></article>})}</div>;
}

function ListingTable({listings,channels,items,busy,onPublish,onPause,onSale,onEnd}:{listings:SellListing[];channels:SellListingChannel[];items:Item[];busy:boolean;onPublish:(l:SellListing)=>void;onPause:(l:SellListing)=>void;onSale:(l:SellListing)=>void;onEnd:(l:SellListing)=>void}){
  return <div className="vxsel-table listings"><div className="head"><span>Item</span><span>Status</span><span>Price</span><span>Cost</span><span>Potential</span><span>Channels</span><span>Actions</span></div>{listings.map(listing=>{const item=items.find(i=>i.id===listing.portfolio_item_id);const profit=listing.price-(item?.purchasePrice||0);const listChannels=channels.filter(c=>c.listing_id===listing.id);return <div key={listing.id}><span className="item"><div className="art" style={item?.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item?.image?'':<PackageOpen/>}</div><span><strong>{listing.title}</strong><small>{item?.condition||'Condition stored in listing'} · ×{listing.quantity}</small></span></span><em className={'status '+listing.status}>{listing.status.replaceAll('_',' ')}</em><b>{money(listing.price)}</b><span>{money((item?.purchasePrice||0)*listing.quantity)}</span><b className={profit>=0?'tone-green':'tone-red'}>{profit>=0?'+':''}{money(profit*listing.quantity)}</b><span>{listChannels.length?listChannels.map(c=>c.provider+': '+c.status).join(' · '):'Internal draft'}</span><span className="actions">{listing.status==='draft'||listing.status==='ready'?<button disabled={busy} onClick={()=>onPublish(listing)}>Publish</button>:null}{listing.status==='active'||listing.status==='paused'?<button disabled={busy} onClick={()=>onPause(listing)}>{listing.status==='paused'?'Resume':'Pause'}</button>:null}{liveListing(listing.status)?<button className="red" disabled={busy} onClick={()=>onSale(listing)}>Record Sale</button>:null}{!['sold','archived','ended'].includes(listing.status)?<button disabled={busy} onClick={()=>onEnd(listing)}>End</button>:null}</span></div>})}{!listings.length?<div className="vxsel-empty-row">No listings yet. Create one from an owned Portfolio item.</div>:null}</div>;
}

function CrosslistTable({listings,channels}:{listings:SellListing[];channels:SellListingChannel[]}){
  const providerIds=['vexum','ebay','vinted','depop'];
  return <div className="vxsel-cross-table"><div className="head"><span>Item</span>{providerIds.map(id=><span key={id}>{id==='vexum'?'VEXUM':id[0].toUpperCase()+id.slice(1)}</span>)}</div>{listings.map(listing=><div key={listing.id}><strong>{listing.title}</strong>{providerIds.map(id=>{const channel=channels.find(c=>c.listing_id===listing.id&&c.provider===id);const fallback=id==='vexum'?'Not published':id==='ebay'?'Not connected':'Unsupported';return <span key={id} className={channel?.status==='active'?'live':''}>{channel?channel.status.toUpperCase():fallback}</span>})}</div>)}{!listings.length?<div className="vxsel-empty-row">No active listing inventory to crosslist.</div>:null}</div>;
}

function MarketplaceGrid({listings,currentUserId,items}:{listings:MarketplaceListing[];currentUserId:string;items:Item[]}){
  return <div className="vxsel-market-grid">{listings.map(listing=>{const own=listing.seller_user_id===currentUserId;const localItem=items.find(i=>i.id===listing.portfolio_item_id);return <article key={listing.id}><div className="art" style={(listing.media?.[0]||localItem?.image)?{backgroundImage:'url("'+String(listing.media?.[0]||localItem?.image).replaceAll('"','')+'")'}:undefined}>{listing.media?.[0]||localItem?.image?'':<ShoppingBag/>}</div><span className="badge">{own?'YOUR LISTING':'VEXUM LISTING'}</span><h4>{listing.title}</h4><p>{String(listing.condition_data?.condition||listing.condition_notes||'Condition details available')}</p><strong>{money(listing.price)}</strong><footer><span>{listing.seller?.display_name||listing.seller?.username||'Collector'}</span>{listing.product_id?<button onClick={()=>location.assign('/search/product/'+encodeURIComponent(listing.product_id!))}>Product</button>:<em>Portfolio-linked</em>}</footer></article>})}{!listings.length?<div className="vxsel-empty wide"><Store/><strong>No public VEXUM listings yet</strong><p>Publishing a listing as Public makes it eligible for this product-first marketplace. The page stays empty until real collectors list inventory.</p></div>:null}</div>;
}

function OffersTable({offers,listings,items,onStatus}:{offers:SellOffer[];listings:SellListing[];items:Item[];onStatus:(offer:SellOffer,status:SellOffer['status'])=>void}){
  return <div className="vxsel-table offers"><div className="head"><span>Item</span><span>Ask</span><span>Offer</span><span>Provider / Buyer</span><span>Cost</span><span>Net before fees</span><span>Actions</span></div>{offers.map(offer=>{const listing=listings.find(l=>l.id===offer.listing_id);const item=items.find(i=>i.id===listing?.portfolio_item_id);return <div key={offer.id}><strong>{listing?.title||'Listing'}</strong><span>{money(listing?.price||0)}</span><b>{money(offer.amount)}</b><span>{offer.provider} · {offer.buyer_label||'VEXUM collector'}</span><span>{money(item?.purchasePrice||0)}</span><b className={offer.amount-(item?.purchasePrice||0)>=0?'tone-green':'tone-red'}>{money(offer.amount-(item?.purchasePrice||0))}</b><span className="actions">{offer.status==='pending'?<><button onClick={()=>onStatus(offer,'accepted')}>Accept</button><button onClick={()=>onStatus(offer,'countered')}>Counter</button><button onClick={()=>onStatus(offer,'declined')}>Decline</button></>:<em>{offer.status}</em>}</span></div>})}{!offers.length?<div className="vxsel-empty-row">No offers have been received or manually recorded.</div>:null}</div>;
}

function OrdersTable({orders,orderItems,shipments,items,onShip,onAdvance,onComplete}:{orders:SellOrder[];orderItems:SellWorkspace['orderItems'];shipments:SellWorkspace['shipments'];items:Item[];onShip:(o:SellOrder)=>void;onAdvance:(o:SellOrder,s:any)=>void;onComplete:(o:SellOrder)=>void}){
  return <div className="vxsel-table orders"><div className="head"><span>Item</span><span>Buyer / Platform</span><span>Sale</span><span>Net</span><span>Status</span><span>Tracking</span><span>Action</span></div>{orders.map(order=>{const oi=orderItems.find(i=>i.order_id===order.id);const item=items.find(i=>i.id===oi?.portfolio_item_id);const ship=shipments.find(s=>s.order_id===order.id);return <div key={order.id}><strong>{item?.name||'Order item'}</strong><span>{order.buyer_label||'Buyer not recorded'} · {order.provider}</span><b>{money(order.item_subtotal)}</b><b>{money(order.net_proceeds)}</b><em className={'status '+order.status}>{order.status.replaceAll('_',' ')}</em><span>{ship?.tracking_number||'Not shipped'}</span><span className="actions">{['paid','preparing_shipment'].includes(order.status)?<button onClick={()=>onShip(order)}>Ship</button>:null}{order.status==='shipped'?<button onClick={()=>onAdvance(order,'delivered')}>Mark Delivered</button>:null}{order.status==='delivered'?<button className="red" onClick={()=>onComplete(order)}>Complete Sale</button>:null}</span></div>})}{!orders.length?<div className="vxsel-empty-row">No active orders.</div>:null}</div>;
}

function SoldTable({orders,orderItems,items}:{orders:SellOrder[];orderItems:SellWorkspace['orderItems'];items:Item[]}){
  return <div className="vxsel-table sold"><div className="head"><span>Item</span><span>Completed</span><span>Platform</span><span>Gross</span><span>Fees + ship</span><span>Cost basis</span><span>Profit</span></div>{orders.map(order=>{const oi=orderItems.find(i=>i.order_id===order.id);const item=items.find(i=>i.id===oi?.portfolio_item_id)||items.find(i=>i.id==='sold_'+order.id);const cost=(oi?.cost_basis_snapshot||item?.purchasePrice||0)*(oi?.quantity||1);const expense=order.fees+order.shipping_cost+order.other_selling_costs;const profit=order.net_proceeds-cost;return <div key={order.id}><strong>{item?.name||'Sold item'}</strong><span>{date(order.completed_at)}</span><span>{order.provider}</span><b>{money(order.item_subtotal)}</b><span>{money(expense)}</span><span>{money(cost)}</span><b className={profit>=0?'tone-green':'tone-red'}>{profit>=0?'+':''}{money(profit)}</b></div>})}{!orders.length?<div className="vxsel-empty-row">No completed sale history.</div>:null}</div>;
}

function AnalyticsView({data,items,allProfit}:{data:SellWorkspace;items:Item[];allProfit:number}){
  const completed=data.orders.filter(o=>o.status==='completed');
  const orderItems=new Map(data.orderItems.map(i=>[i.order_id,i]));
  const revenue=completed.reduce((s,o)=>s+o.item_subtotal,0);
  const fees=completed.reduce((s,o)=>s+o.fees,0);
  const shipping=completed.reduce((s,o)=>s+o.shipping_cost,0);
  const cogs=completed.reduce((s,o)=>{const oi=orderItems.get(o.id);return s+(oi?.cost_basis_snapshot||0)*(oi?.quantity||1)},0);
  const byPlatform=Object.entries(completed.reduce((acc,order)=>{const current=acc[order.provider]||{revenue:0,profit:0,count:0};const oi=orderItems.get(order.id);current.revenue+=order.item_subtotal;current.profit+=order.net_proceeds-(oi?.cost_basis_snapshot||0)*(oi?.quantity||1);current.count++;acc[order.provider]=current;return acc},{} as Record<string,{revenue:number;profit:number;count:number}>));
  const aging=[['0–30',0,30],['31–60',31,60],['61–90',61,90],['90+',91,99999]].map(([label,min,max])=>{const rows=data.listings.filter(l=>liveListing(l.status)&&((Date.now()-Date.parse(l.published_at||l.created_at))/86400000)>=Number(min)&&((Date.now()-Date.parse(l.published_at||l.created_at))/86400000)<=Number(max));return {label:String(label),count:rows.length,value:rows.reduce((s,l)=>s+l.price*l.quantity,0)}})
  return <div className="vxsel-analytics"><div className="vxsel-metrics"><Metric label="Revenue" value={money(revenue)} sub={completed.length+' completed orders'}/><Metric label="COGS" value={money(cogs)} sub="Cost-basis snapshots"/><Metric label="Fees" value={money(fees)} sub="Recorded seller fees"/><Metric label="Shipping" value={money(shipping)} sub="Recorded outbound cost"/><Metric label="Net Profit" value={(allProfit>=0?'+':'')+money(allProfit)} sub={revenue?((allProfit/revenue)*100).toFixed(1)+'% margin':'No realized sales'} tone={allProfit>=0?'green':'red'}/><Metric label="Average Selling Price" value={completed.length?money(revenue/completed.length):'—'} sub="Completed orders"/></div><div className="vxsel-analytics-grid"><section className="vxsel-panel"><header><h3>Platform Performance</h3></header><div className="vxsel-analytic-list">{byPlatform.map(([provider,row])=><div key={provider}><strong>{provider}</strong><span>{row.count} sales</span><b>{money(row.revenue)}</b><em className={row.profit>=0?'tone-green':'tone-red'}>{row.profit>=0?'+':''}{money(row.profit)}</em></div>)}{!byPlatform.length?<div className="vxsel-empty-row">Complete sales to populate platform analytics.</div>:null}</div></section><section className="vxsel-panel"><header><h3>Inventory Aging</h3></header><div className="vxsel-aging">{aging.map(row=><div key={row.label}><span>{row.label} days</span><strong>{row.count}</strong><b>{money(row.value)}</b></div>)}</div></section></div></div>;
}

function ListingComposer({items,listings,initialItemId,onClose,onSave,busy}:{items:Item[];listings:SellListing[];initialItemId:string;onClose:()=>void;onSave:(input:any)=>void;busy:boolean}){
  const [itemId,setItemId]=useState(initialItemId);
  const item=items.find(i=>i.id===itemId);
  const [title,setTitle]=useState(item?.name||'');
  const [description,setDescription]=useState('');
  const [price,setPrice]=useState(item?String(item.currentValue):'');
  const [quantity,setQuantity]=useState('1');
  const [conditionNotes,setConditionNotes]=useState('');
  const [visibility,setVisibility]=useState<'public'|'private'>('public');
  const [publish,setPublish]=useState(true);
  const [conditionData,setConditionData]=useState<Record<string,string>>({});
  useEffect(()=>{const next=items.find(i=>i.id===itemId);if(next){setTitle(next.name);setPrice(next.currentValue?String(next.currentValue):'');setConditionNotes(next.condition||'');setQuantity('1');setConditionData({condition:next.condition})}},[itemId,items]);
  const live=listings.find(l=>l.portfolio_item_id===itemId&&activeListing(l.status));
  const conditionFields=conditionSchema(item?.category||'');
  return <Modal title="Create Listing" subtitle="Reuse the owned copy. Do not recreate the collectible." onClose={onClose}><div className="vxsel-composer-grid"><section className="product"><label>Owned Portfolio Copy<select value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">Choose owned item</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {i.condition} · ×{i.quantity}</option>)}</select></label>{item?<><div className="preview"><div className="art" style={item.image?{backgroundImage:'url("'+item.image.replaceAll('"','')+'")'}:undefined}>{item.image?'':<PackageOpen/>}</div><strong>{item.name}</strong><span>{item.identity?.brand||item.category} · {item.identity?.series||item.condition}</span><div><small>Your Cost<b>{money(item.purchasePrice)}</b></small><small>Current Market<b>{money(item.currentValue)}</b></small><small>Location<b>{item.location||'Unassigned'}</b></small></div></div>{live?<div className="vxsel-warning"><AlertTriangle/>This exact owned record already has a live listing: {live.status}.</div>:null}</>:null}</section><section className="details"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={180}/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Known facts only. Describe completeness, wear, packaging, and seller notes."/></label><div className="row"><label>Price<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Quantity<input inputMode="numeric" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label></div><label>Condition Notes<textarea value={conditionNotes} onChange={e=>setConditionNotes(e.target.value)}/></label><div className="condition-fields">{conditionFields.map(field=><label key={field.key}>{field.label}<select value={conditionData[field.key]||''} onChange={e=>setConditionData(current=>({...current,[field.key]:e.target.value}))}><option value="">Not specified</option>{field.values.map(v=><option key={v}>{v}</option>)}</select></label>)}</div></section><aside><h4>Pricing</h4><PricePreview item={item} price={Number(price)||0}/><h4>Publish</h4><label>Visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as any)}><option value="public">Public Marketplace</option><option value="private">Private Seller Workspace</option></select></label><div className="provider-choice"><label><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/>VEXUM Marketplace</label>{PROVIDERS.filter(p=>p.id!=='vexum').map(p=><label className="disabled" key={p.id}><input type="checkbox" disabled/>{p.label}<small>{p.state==='not_connected'?'Not connected':'Unsupported'}</small></label>)}</div></aside></div><footer className="vxsel-modal-footer"><span>{live?'Manage the existing listing instead of duplicating this physical inventory.':'One physical copy remains one inventory unit.'}</span><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||!item||!!live||!title.trim()||!(Number(price)>=0)} onClick={()=>item&&onSave({portfolioItemId:item.id,productId:undefined,title,description,price:Number(price)||0,quantity:Math.max(1,Math.min(item.quantity,Number(quantity)||1)),conditionData,conditionNotes,media:item.image?[item.image]:[],shippingProfileId:undefined,visibility,publish})}>{busy?'Saving…':publish?'Publish Listing':'Save Draft'}</button></footer></Modal>;
}

function PricePreview({item,price}:{item?:Item;price:number}){
  if(!item)return <div className="vxsel-price-preview empty">Choose an item.</div>;
  const gross=price;const cost=item.purchasePrice;const difference=gross-cost;
  return <div className="vxsel-price-preview"><span>Your Cost<b>{money(cost)}</b></span><span>Current Market<b>{money(item.currentValue)}</b></span><span>Listing Price<b>{money(gross)}</b></span><span>Provider Fees<b>Unknown</b></span><span>Shipping Cost<b>Unknown</b></span><span>Pre-fee Difference<b className={difference>=0?'tone-green':'tone-red'}>{difference>=0?'+':''}{money(difference)}</b></span><p>Suggested-price presets stay unavailable until real market/fee data supports them.</p></div>;
}

function conditionSchema(category:string){
  const c=category.toLowerCase();
  if(/figure|statue|funko/.test(c))return [{key:'seal',label:'Seal',values:['Sealed','Opened']},{key:'completeness',label:'Completeness',values:['Complete','Missing accessories','Figure only']},{key:'packaging',label:'Packaging',values:['Mint','Light wear','Damaged','No box']},{key:'itemCondition',label:'Item',values:['Excellent','Displayed','Paint wear','Damage']}];
  if(/card|tcg/.test(c))return [{key:'form',label:'Form',values:['Raw','Graded']},{key:'rawCondition',label:'Raw condition',values:['NM','LP','MP','HP','Damaged']},{key:'authentication',label:'Authentication',values:['Not authenticated','Authenticated']}];
  if(/comic/.test(c))return [{key:'form',label:'Form',values:['Raw','Slabbed']},{key:'restoration',label:'Restoration',values:['None known','Restored','Unknown']},{key:'signature',label:'Signature',values:['Unsigned','Signed','Witnessed']}];
  if(/shoe|sneaker/.test(c))return [{key:'wear',label:'Wear',values:['DS','VNDS','Used']},{key:'box',label:'Box',values:['Original box','Replacement box','No box']}];
  return [{key:'condition',label:'Condition',values:['New','Excellent','Good','Fair','Damaged']},{key:'completeness',label:'Completeness',values:['Complete','Incomplete','Unknown']}];
}

function SaleComposer({listing,item,onClose,onSave,busy}:{listing?:SellListing;item?:Item;onClose:()=>void;onSave:(input:any)=>void;busy:boolean}){
  const [salePrice,setSalePrice]=useState(String(listing?.price||0));const [shippingCharged,setShippingCharged]=useState('0');const [fees,setFees]=useState('0');const [shippingCost,setShippingCost]=useState('0');const [otherCosts,setOtherCosts]=useState('0');const [buyerLabel,setBuyerLabel]=useState('');const [provider,setProvider]=useState('vexum');
  const net=(Number(salePrice)||0)+(Number(shippingCharged)||0)-(Number(fees)||0)-(Number(shippingCost)||0)-(Number(otherCosts)||0);const profit=net-(item?.purchasePrice||0)*(listing?.quantity||1);
  return <Modal title="Record Sale" subtitle="Gross sale price is not profit. VEXUM records the economic path separately." onClose={onClose}><div className="vxsel-form grid"><label>Sale price<input value={salePrice} onChange={e=>setSalePrice(e.target.value)} inputMode="decimal"/></label><label>Shipping charged<input value={shippingCharged} onChange={e=>setShippingCharged(e.target.value)} inputMode="decimal"/></label><label>Marketplace / payment fees<input value={fees} onChange={e=>setFees(e.target.value)} inputMode="decimal"/></label><label>Shipping cost<input value={shippingCost} onChange={e=>setShippingCost(e.target.value)} inputMode="decimal"/></label><label>Other selling costs<input value={otherCosts} onChange={e=>setOtherCosts(e.target.value)} inputMode="decimal"/></label><label>Provider<select value={provider} onChange={e=>setProvider(e.target.value)}><option value="vexum">VEXUM</option><option value="ebay">eBay manual</option><option value="vinted">Vinted manual</option><option value="depop">Depop manual</option><option value="mercari">Mercari manual</option><option value="facebook">Facebook manual</option><option value="other">Other</option></select></label><label className="wide">Buyer / external order label<input value={buyerLabel} onChange={e=>setBuyerLabel(e.target.value)} placeholder="Optional"/></label></div><div className="vxsel-sale-preview"><span>Gross<b>{money(Number(salePrice)||0)}</b></span><span>Net Proceeds<b>{money(net)}</b></span><span>Cost Basis<b>{money((item?.purchasePrice||0)*(listing?.quantity||1))}</b></span><span>Estimated Profit<b className={profit>=0?'tone-green':'tone-red'}>{profit>=0?'+':''}{money(profit)}</b></span></div><footer className="vxsel-modal-footer"><span>This creates an order; Portfolio moves to Sold only when the order is completed.</span><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||!listing} onClick={()=>onSave({buyerLabel,provider,salePrice:Number(salePrice)||0,shippingCharged:Number(shippingCharged)||0,fees:Number(fees)||0,shippingCost:Number(shippingCost)||0,otherCosts:Number(otherCosts)||0})}>Create Order</button></footer></Modal>;
}

function OfferComposer({listings,initialListingId,onClose,onSave,busy}:{listings:SellListing[];initialListingId:string;onClose:()=>void;onSave:(input:any)=>void;busy:boolean}){
  const [listingId,setListingId]=useState(initialListingId||listings[0]?.id||'');const [buyerLabel,setBuyerLabel]=useState('');const [provider,setProvider]=useState('ebay');const [amount,setAmount]=useState('');const [expiresAt,setExpiresAt]=useState('');
  return <Modal title="Record External Offer" subtitle="Use this only for a real offer you received outside VEXUM." onClose={onClose}><div className="vxsel-form grid"><label className="wide">Listing<select value={listingId} onChange={e=>setListingId(e.target.value)}>{listings.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label><label>Provider<select value={provider} onChange={e=>setProvider(e.target.value)}>{PROVIDERS.filter(p=>p.id!=='vexum').map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label>Offer amount<input value={amount} onChange={e=>setAmount(e.target.value)} inputMode="decimal"/></label><label>Buyer label<input value={buyerLabel} onChange={e=>setBuyerLabel(e.target.value)} placeholder="Username / buyer"/></label><label>Expires<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label></div><footer className="vxsel-modal-footer"><span>No marketplace inbox is implied.</span><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||!listingId||!(Number(amount)>0)} onClick={()=>onSave({listingId,buyerLabel,provider,amount:Number(amount),expiresAt:expiresAt?new Date(expiresAt).toISOString():undefined})}>Record Offer</button></footer></Modal>;
}

function ShipmentComposer({order,onClose,onSave,busy}:{order?:SellOrder;onClose:()=>void;onSave:(input:any)=>void;busy:boolean}){
  const [carrier,setCarrier]=useState('');const [service,setService]=useState('');const [trackingNumber,setTracking]=useState('');const [shippingCost,setCost]=useState(String(order?.shipping_cost||0));
  return <Modal title="Shipment" subtitle="Tracking may be synced later when an authorized provider supports it." onClose={onClose}><div className="vxsel-form grid"><label>Carrier<input value={carrier} onChange={e=>setCarrier(e.target.value)} placeholder="USPS"/></label><label>Service<input value={service} onChange={e=>setService(e.target.value)} placeholder="Ground Advantage"/></label><label className="wide">Tracking number<input value={trackingNumber} onChange={e=>setTracking(e.target.value)}/></label><label>Actual shipping cost<input value={shippingCost} onChange={e=>setCost(e.target.value)} inputMode="decimal"/></label></div><footer className="vxsel-modal-footer"><span>Marking shipped does not claim carrier delivery.</span><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||!order||!trackingNumber.trim()} onClick={()=>onSave({carrier,service,trackingNumber,shippingCost:Number(shippingCost)||0})}>Mark Shipped</button></footer></Modal>;
}

function Modal({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode}){
  return <div className="vxsel-modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}><section className="vxsel-modal"><header><div><strong>{title}</strong><span>{subtitle}</span></div><button onClick={onClose}><X/></button></header>{children}</section></div>;
}

import type {CloudConfig,Session} from './cloud';
import {qs,supabaseRest} from './supabaseRest';
import type {SocialProfile} from './socialCloud';

export type SellListingStatus='draft'|'ready'|'publishing'|'active'|'paused'|'sale_pending'|'sold'|'ended'|'error'|'archived';
export type SellOrderStatus='awaiting_payment'|'paid'|'preparing_shipment'|'shipped'|'delivered'|'completed'|'cancelled'|'return_requested'|'returned'|'refunded'|'disputed';

export type SellConnection={
  id:string;
  user_id:string;
  provider:string;
  state:'not_connected'|'connected'|'manual'|'unsupported'|'attention';
  capabilities:Record<string,boolean>;
  external_account_label:string;
  last_synced_at:string|null;
  error_message:string;
  created_at:string;
  updated_at:string;
};

export type SellShippingProfile={
  id:string;
  user_id:string;
  name:string;
  length:number|null;
  width:number|null;
  height:number|null;
  weight:number|null;
  unit:'in'|'cm';
  weight_unit:'lb'|'oz'|'kg'|'g';
  preferred_service:string;
  created_at:string;
  updated_at:string;
};

export type SellListing={
  id:string;
  seller_user_id:string;
  portfolio_item_id:string;
  product_id:string|null;
  title:string;
  description:string;
  price:number;
  currency:string;
  quantity:number;
  condition_data:Record<string,unknown>;
  condition_notes:string;
  media:string[];
  shipping_profile_id:string|null;
  status:SellListingStatus;
  visibility:'public'|'private';
  created_at:string;
  updated_at:string;
  published_at:string|null;
  sold_at:string|null;
};

export type SellListingChannel={
  id:string;
  listing_id:string;
  provider:string;
  external_listing_id:string|null;
  external_url:string|null;
  status:'draft'|'publishing'|'active'|'paused'|'sold'|'ended'|'error'|'manual'|'unsupported';
  price:number|null;
  quantity:number|null;
  last_synced_at:string|null;
  error_code:string;
  error_message:string;
  created_at:string;
  updated_at:string;
};

export type SellOffer={
  id:string;
  listing_id:string;
  buyer_user_id:string|null;
  buyer_label:string;
  provider:string;
  external_offer_id:string|null;
  amount:number;
  status:'pending'|'accepted'|'countered'|'declined'|'expired'|'withdrawn';
  expires_at:string|null;
  created_at:string;
  updated_at:string;
};

export type SellOrder={
  id:string;
  listing_id:string;
  seller_user_id:string;
  buyer_user_id:string|null;
  buyer_label:string;
  provider:string;
  external_order_id:string|null;
  status:SellOrderStatus;
  item_subtotal:number;
  shipping_charged:number;
  tax:number;
  fees:number;
  shipping_cost:number;
  other_selling_costs:number;
  net_proceeds:number;
  created_at:string;
  updated_at:string;
  completed_at:string|null;
};

export type SellOrderItem={
  id:string;
  order_id:string;
  listing_id:string;
  portfolio_item_id:string;
  product_id:string|null;
  quantity:number;
  unit_price:number;
  cost_basis_snapshot:number;
};

export type SellShipment={
  id:string;
  order_id:string;
  carrier:string;
  service:string;
  tracking_number:string;
  label_url:string;
  shipping_cost:number;
  weight:number|null;
  dimensions:Record<string,unknown>;
  status:'preparing'|'shipped'|'in_transit'|'delivered'|'exception'|'returned';
  shipped_at:string|null;
  delivered_at:string|null;
  created_at:string;
  updated_at:string;
};

export type SellReturn={
  id:string;
  order_id:string;
  reason:string;
  status:'requested'|'approved'|'in_transit'|'received'|'resolved'|'rejected';
  refund_amount:number;
  opened_at:string;
  resolved_at:string|null;
};

export type SellWorkspace={
  listings:SellListing[];
  channels:SellListingChannel[];
  offers:SellOffer[];
  orders:SellOrder[];
  orderItems:SellOrderItem[];
  shipments:SellShipment[];
  returns:SellReturn[];
  connections:SellConnection[];
  shippingProfiles:SellShippingProfile[];
};

export type MarketplaceListing=SellListing&{seller?:SocialProfile};

function idIn(ids:string[]){return 'in.('+ids.join(',')+')'}

export async function loadSellWorkspace(config:CloudConfig,session:Session):Promise<SellWorkspace>{
  const [listings,orders,connections,shippingProfiles]=await Promise.all([
    supabaseRest<SellListing[]>(config,session,'/rest/v1/sell_listings?'+qs({
      seller_user_id:'eq.'+session.user.id,select:'*',order:'updated_at.desc'
    })),
    supabaseRest<SellOrder[]>(config,session,'/rest/v1/sell_orders?'+qs({
      seller_user_id:'eq.'+session.user.id,select:'*',order:'created_at.desc'
    })),
    supabaseRest<SellConnection[]>(config,session,'/rest/v1/sell_connections?'+qs({
      user_id:'eq.'+session.user.id,select:'*',order:'provider.asc'
    })),
    supabaseRest<SellShippingProfile[]>(config,session,'/rest/v1/sell_shipping_profiles?'+qs({
      user_id:'eq.'+session.user.id,select:'*',order:'name.asc'
    }))
  ]);
  const listingIds=listings.map(listing=>listing.id);
  const orderIds=orders.map(order=>order.id);
  const [channels,offers,orderItems,shipments,returns]=await Promise.all([
    listingIds.length?supabaseRest<SellListingChannel[]>(config,session,'/rest/v1/sell_listing_channels?'+qs({
      listing_id:idIn(listingIds),select:'*',order:'created_at.asc'
    })):Promise.resolve([]),
    listingIds.length?supabaseRest<SellOffer[]>(config,session,'/rest/v1/sell_offers?'+qs({
      listing_id:idIn(listingIds),select:'*',order:'created_at.desc'
    })):Promise.resolve([]),
    orderIds.length?supabaseRest<SellOrderItem[]>(config,session,'/rest/v1/sell_order_items?'+qs({
      order_id:idIn(orderIds),select:'*'
    })):Promise.resolve([]),
    orderIds.length?supabaseRest<SellShipment[]>(config,session,'/rest/v1/sell_shipments?'+qs({
      order_id:idIn(orderIds),select:'*',order:'created_at.desc'
    })):Promise.resolve([]),
    orderIds.length?supabaseRest<SellReturn[]>(config,session,'/rest/v1/sell_returns?'+qs({
      order_id:idIn(orderIds),select:'*',order:'opened_at.desc'
    })):Promise.resolve([])
  ]);
  return {listings,channels,offers,orders,orderItems,shipments,returns,connections,shippingProfiles};
}

export async function listMarketplaceListings(config:CloudConfig,session:Session|null,limit=60):Promise<MarketplaceListing[]>{
  const listings=await supabaseRest<SellListing[]>(config,session,'/rest/v1/sell_listings?'+qs({
    status:'eq.active',visibility:'eq.public',select:'*',order:'created_at.desc',limit
  }));
  if(!listings.length)return [];
  const sellerIds=[...new Set(listings.map(listing=>listing.seller_user_id))];
  const profiles=await supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({
    id:idIn(sellerIds),select:'*'
  }));
  const profileMap=Object.fromEntries(profiles.map(profile=>[profile.id,profile]));
  return listings.map(listing=>({...listing,seller:profileMap[listing.seller_user_id]}));
}

export async function createSellListing(config:CloudConfig,session:Session,input:{
  portfolioItemId:string;
  productId?:string;
  title:string;
  description:string;
  price:number;
  quantity:number;
  conditionData:Record<string,unknown>;
  conditionNotes:string;
  media:string[];
  shippingProfileId?:string;
  visibility:'public'|'private';
}){
  const rows=await supabaseRest<SellListing[]>(config,session,'/rest/v1/sell_listings',{
    method:'POST',
    body:JSON.stringify({
      seller_user_id:session.user.id,
      portfolio_item_id:input.portfolioItemId,
      product_id:input.productId||null,
      title:input.title.trim(),
      description:input.description.trim(),
      price:Math.max(0,input.price),
      quantity:Math.max(1,Math.floor(input.quantity)),
      condition_data:input.conditionData,
      condition_notes:input.conditionNotes.trim(),
      media:input.media,
      shipping_profile_id:input.shippingProfileId||null,
      status:'draft',
      visibility:input.visibility
    })
  },'return=representation');
  return rows[0];
}

export async function updateSellListing(config:CloudConfig,session:Session,listingId:string,patch:Partial<SellListing>){
  const rows=await supabaseRest<SellListing[]>(config,session,'/rest/v1/sell_listings?'+qs({id:'eq.'+listingId}),{
    method:'PATCH',
    body:JSON.stringify({...patch,id:undefined,seller_user_id:undefined,updated_at:new Date().toISOString()})
  },'return=representation');
  return rows[0];
}

export async function publishVexumListing(config:CloudConfig,session:Session,listingId:string,price:number,quantity:number){
  const stamp=new Date().toISOString();
  const listing=await updateSellListing(config,session,listingId,{
    status:'active',published_at:stamp,price,quantity
  });
  await supabaseRest(config,session,'/rest/v1/sell_listing_channels?on_conflict=listing_id,provider',{
    method:'POST',
    body:JSON.stringify({
      listing_id:listingId,provider:'vexum',status:'active',price,quantity,last_synced_at:stamp,updated_at:stamp
    })
  },'resolution=merge-duplicates,return=minimal');
  return listing;
}

export async function pauseSellListing(config:CloudConfig,session:Session,listingId:string,paused:boolean){
  const status=paused?'paused':'active';
  const stamp=new Date().toISOString();
  await updateSellListing(config,session,listingId,{status});
  await supabaseRest(config,session,'/rest/v1/sell_listing_channels?'+qs({listing_id:'eq.'+listingId,provider:'eq.vexum'}),{
    method:'PATCH',body:JSON.stringify({status,updated_at:stamp,last_synced_at:stamp})
  },'return=minimal');
}

export async function endSellListing(config:CloudConfig,session:Session,listingId:string){
  const stamp=new Date().toISOString();
  await updateSellListing(config,session,listingId,{status:'ended'});
  await supabaseRest(config,session,'/rest/v1/sell_listing_channels?'+qs({listing_id:'eq.'+listingId}),{
    method:'PATCH',body:JSON.stringify({status:'ended',updated_at:stamp})
  },'return=minimal');
}

export async function recordManualOffer(config:CloudConfig,session:Session,input:{
  listingId:string;buyerLabel:string;provider:string;amount:number;expiresAt?:string;
}){
  const rows=await supabaseRest<SellOffer[]>(config,session,'/rest/v1/sell_offers',{
    method:'POST',
    body:JSON.stringify({
      listing_id:input.listingId,buyer_user_id:null,buyer_label:input.buyerLabel.trim(),
      provider:input.provider,amount:Math.max(0,input.amount),status:'pending',expires_at:input.expiresAt||null
    })
  },'return=representation');
  return rows[0];
}

export async function updateOfferStatus(config:CloudConfig,session:Session,offerId:string,status:SellOffer['status']){
  const rows=await supabaseRest<SellOffer[]>(config,session,'/rest/v1/sell_offers?'+qs({id:'eq.'+offerId}),{
    method:'PATCH',body:JSON.stringify({status,updated_at:new Date().toISOString()})
  },'return=representation');
  return rows[0];
}

export async function createManualSale(config:CloudConfig,session:Session,input:{
  listing:SellListing;
  buyerLabel:string;
  provider:string;
  salePrice:number;
  shippingCharged:number;
  fees:number;
  shippingCost:number;
  otherCosts:number;
  costBasis:number;
}){
  const existing=await supabaseRest<SellOrder[]>(config,session,'/rest/v1/sell_orders?'+qs({
    listing_id:'eq.'+input.listing.id,select:'*',order:'created_at.desc',limit:1
  }));
  if(existing.some(order=>!['cancelled','returned','refunded'].includes(order.status)))throw new Error('This listing already has an active sale/order.');
  const net=Math.max(0,input.salePrice)+Math.max(0,input.shippingCharged)-Math.max(0,input.fees)-Math.max(0,input.shippingCost)-Math.max(0,input.otherCosts);
  const orders=await supabaseRest<SellOrder[]>(config,session,'/rest/v1/sell_orders',{
    method:'POST',
    body:JSON.stringify({
      listing_id:input.listing.id,
      seller_user_id:session.user.id,
      buyer_user_id:null,
      buyer_label:input.buyerLabel.trim(),
      provider:input.provider,
      status:'paid',
      item_subtotal:Math.max(0,input.salePrice),
      shipping_charged:Math.max(0,input.shippingCharged),
      tax:0,
      fees:Math.max(0,input.fees),
      shipping_cost:Math.max(0,input.shippingCost),
      other_selling_costs:Math.max(0,input.otherCosts),
      net_proceeds:net
    })
  },'return=representation');
  const order=orders[0];
  if(!order)throw new Error('Sale order could not be created.');
  try{
    await supabaseRest(config,session,'/rest/v1/sell_order_items',{
      method:'POST',
      body:JSON.stringify({
        order_id:order.id,listing_id:input.listing.id,portfolio_item_id:input.listing.portfolio_item_id,
        product_id:input.listing.product_id,quantity:input.listing.quantity,unit_price:Math.max(0,input.salePrice),
        cost_basis_snapshot:Math.max(0,input.costBasis)
      })
    },'return=minimal');
    const stamp=new Date().toISOString();
    await updateSellListing(config,session,input.listing.id,{status:'sold',sold_at:stamp});
    await supabaseRest(config,session,'/rest/v1/sell_listing_channels?'+qs({listing_id:'eq.'+input.listing.id}),{
      method:'PATCH',body:JSON.stringify({status:'sold',updated_at:stamp})
    },'return=minimal');
    return order;
  }catch(error){
    await supabaseRest(config,session,'/rest/v1/sell_orders?'+qs({id:'eq.'+order.id}),{method:'DELETE'}).catch(()=>{});
    throw error;
  }
}

export async function updateOrderStatus(config:CloudConfig,session:Session,orderId:string,status:SellOrderStatus){
  const rows=await supabaseRest<SellOrder[]>(config,session,'/rest/v1/sell_orders?'+qs({id:'eq.'+orderId}),{
    method:'PATCH',
    body:JSON.stringify({status,updated_at:new Date().toISOString(),completed_at:status==='completed'?new Date().toISOString():undefined})
  },'return=representation');
  return rows[0];
}

export async function upsertShipment(config:CloudConfig,session:Session,input:{
  orderId:string;carrier:string;service:string;trackingNumber:string;shippingCost:number;
}){
  const existing=await supabaseRest<SellShipment[]>(config,session,'/rest/v1/sell_shipments?'+qs({
    order_id:'eq.'+input.orderId,select:'*',limit:1
  }));
  const stamp=new Date().toISOString();
  if(existing[0]){
    const rows=await supabaseRest<SellShipment[]>(config,session,'/rest/v1/sell_shipments?'+qs({id:'eq.'+existing[0].id}),{
      method:'PATCH',body:JSON.stringify({
        carrier:input.carrier,service:input.service,tracking_number:input.trackingNumber,
        shipping_cost:Math.max(0,input.shippingCost),status:'shipped',shipped_at:existing[0].shipped_at||stamp,updated_at:stamp
      })
    },'return=representation');
    return rows[0];
  }
  const rows=await supabaseRest<SellShipment[]>(config,session,'/rest/v1/sell_shipments',{
    method:'POST',body:JSON.stringify({
      order_id:input.orderId,carrier:input.carrier,service:input.service,tracking_number:input.trackingNumber,
      shipping_cost:Math.max(0,input.shippingCost),status:'shipped',shipped_at:stamp
    })
  },'return=representation');
  return rows[0];
}

export async function createShippingProfile(config:CloudConfig,session:Session,input:{
  name:string;length?:number;width?:number;height?:number;weight?:number;unit:'in'|'cm';weightUnit:'lb'|'oz'|'kg'|'g';preferredService?:string;
}){
  const rows=await supabaseRest<SellShippingProfile[]>(config,session,'/rest/v1/sell_shipping_profiles',{
    method:'POST',body:JSON.stringify({
      user_id:session.user.id,name:input.name.trim(),length:input.length??null,width:input.width??null,
      height:input.height??null,weight:input.weight??null,unit:input.unit,weight_unit:input.weightUnit,
      preferred_service:input.preferredService||''
    })
  },'return=representation');
  return rows[0];
}

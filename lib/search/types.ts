export type SearchCategory=
  'Action Figures'|'Trading Cards'|'Comics'|'Sneakers'|'Games'|'Technology'|'Collectible Figures'|'Other';

export type ReleaseStatus='Announced'|'Preorder'|'Upcoming'|'Released'|'Restocked'|'Retired'|'Discontinued'|'Reissue announced';
export type MarketConfidence='high'|'medium'|'low'|'unavailable';
export type ProviderStatus='connected'|'unavailable'|'error'|'demo';

export type ProductAttribute={key:string;value:string;type?:'text'|'number'|'date'|'currency'|'boolean'};
export type ProductVariant={id:string;name:string;type:string;status?:ReleaseStatus};

export type NormalizedProduct={
  id:string;
  canonicalName:string;
  aliases:string[];
  category:SearchCategory;
  manufacturer:string;
  brand:string;
  line:string;
  franchise:string;
  character:string;
  releaseYear:string;
  releaseDate?:string;
  msrp?:number;
  upc?:string;
  sku?:string;
  modelNumber?:string;
  dimensions?:string;
  weight?:string;
  description?:string;
  imageUrl?:string;
  releaseStatus:ReleaseStatus;
  attributes:ProductAttribute[];
  variants:ProductVariant[];
  demo?:boolean;
};

export type NormalizedSale={
  id:string;
  productId:string;
  source:string;
  price:number;
  shipping?:number;
  condition:string;
  soldAt:string;
  url?:string;
};

export type NormalizedListing={
  id:string;
  productId:string;
  source:string;
  price:number;
  shipping?:number;
  condition:string;
  seller?:string;
  url?:string;
  status:'active'|'sold'|'ended';
  observedAt:string;
};

export type NormalizedRetailOffer={
  id:string;
  productId:string;
  retailer:string;
  price:number;
  msrp?:number;
  availability:'in_stock'|'low_stock'|'preorder'|'out_of_stock'|'unknown';
  url?:string;
  checkedAt:string;
};

export type NormalizedAvailability={
  id:string;
  productId:string;
  retailer:string;
  store?:string;
  distanceMiles?:number;
  availability:'in_stock'|'low_stock'|'out_of_stock'|'unknown';
  price?:number;
  checkedAt:string;
};

export type UserProductRelationship={
  productId:string;
  ownedQuantity:number;
  wishlisted:boolean;
  tracked:boolean;
  grail:boolean;
  targetPrice?:number;
  maxPrice?:number;
  conditionRequirement?:string;
  setupLocation?:string;
};

export type MarketSummary={
  currentMarket?:number;
  lastSold?:number;
  average30d?:number;
  median30d?:number;
  low30d?:number;
  high30d?:number;
  trend30d?:number;
  saleCount30d?:number;
  confidence:MarketConfidence;
  updatedAt?:string;
  providerStatus:ProviderStatus;
};

export type ProductSearchProvider={
  id:string;
  label:string;
  status:ProviderStatus;
  search:(query:string)=>Promise<NormalizedProduct[]>;
  lookupByUpc?:(upc:string)=>Promise<NormalizedProduct|null>;
  lookupBySku?:(sku:string)=>Promise<NormalizedProduct|null>;
};

export type MarketDataProvider={
  id:string;
  label:string;
  status:ProviderStatus;
  getSummary:(product:NormalizedProduct)=>Promise<MarketSummary>;
  getSales:(product:NormalizedProduct)=>Promise<NormalizedSale[]>;
};

export type MarketplaceProvider={
  id:string;
  label:string;
  status:ProviderStatus;
  getListings:(product:NormalizedProduct)=>Promise<NormalizedListing[]>;
};

export type RetailInventoryProvider={
  id:string;
  label:string;
  status:ProviderStatus;
  getOffers:(product:NormalizedProduct)=>Promise<NormalizedRetailOffer[]>;
};

export type LocalInventoryProvider={
  id:string;
  label:string;
  status:ProviderStatus;
  getAvailability:(product:NormalizedProduct,location:string)=>Promise<NormalizedAvailability[]>;
};

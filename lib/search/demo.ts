import type {NormalizedProduct,UserProductRelationship} from './types';

export const DEMO_PRODUCTS:NormalizedProduct[]=[
  {
    id:'ml-final-swing',
    canonicalName:'Spider-Man Marvel Legends Final Swing',
    aliases:['Spider-Man Final Swing','Final Swing Spider-Man','No Way Home Final Swing','Marvel Legends Final Swing Spider-Man'],
    category:'Action Figures',
    manufacturer:'Hasbro',
    brand:'Marvel',
    line:'Marvel Legends',
    franchise:'Spider-Man',
    character:'Spider-Man',
    releaseYear:'2024',
    releaseDate:'2024-01-15',
    msrp:24.99,
    upc:'5010996283714',
    sku:'F90715L00',
    modelNumber:'F9071',
    dimensions:'6 in figure',
    description:'Final Swing suit Spider-Man from Marvel Studios’ Spider-Man: No Way Home.',
    releaseStatus:'Released',
    demo:true,
    attributes:[
      {key:'Manufacturer',value:'Hasbro'},{key:'Line',value:'Marvel Legends'},{key:'Character',value:'Spider-Man'},
      {key:'Movie',value:'No Way Home'},{key:'Scale',value:'6 inch (1:12)'},{key:'Release Year',value:'2024'},
      {key:'UPC',value:'5010996283714'},{key:'SKU',value:'F90715L00'},{key:'MSRP',value:'$24.99'}
    ],
    variants:[
      {id:'ml-final-swing-standard',name:'Standard',type:'Standard',status:'Released'},
      {id:'ml-final-swing-reissue',name:'Reissue',type:'Reissue',status:'Reissue announced'}
    ]
  },
  {
    id:'ml-friendly-neighborhood',
    canonicalName:'Marvel Legends Friendly Neighborhood Spider-Man',
    aliases:['Tobey Spider-Man Marvel Legends','Friendly Neighborhood Spider-Man','No Way Home Tobey'],
    category:'Action Figures',manufacturer:'Hasbro',brand:'Marvel',line:'Marvel Legends',franchise:'Spider-Man',character:'Spider-Man',
    releaseYear:'2023',msrp:24.99,upc:'5010996141960',sku:'F7110',modelNumber:'F7110',releaseStatus:'Released',demo:true,
    attributes:[{key:'Movie',value:'No Way Home'},{key:'Actor Suit',value:'Friendly Neighborhood Spider-Man'},{key:'Scale',value:'6 inch'}],
    variants:[]
  },
  {
    id:'ml-amazing-spiderman',
    canonicalName:'Marvel Legends The Amazing Spider-Man',
    aliases:['Andrew Garfield Spider-Man Marvel Legends','Amazing Spider-Man NWH Marvel Legends'],
    category:'Action Figures',manufacturer:'Hasbro',brand:'Marvel',line:'Marvel Legends',franchise:'Spider-Man',character:'Spider-Man',
    releaseYear:'2023',msrp:24.99,sku:'F7111',releaseStatus:'Released',demo:true,
    attributes:[{key:'Movie',value:'No Way Home'},{key:'Suit',value:'The Amazing Spider-Man'},{key:'Scale',value:'6 inch'}],
    variants:[]
  },
  {
    id:'pokemon-151-etb',
    canonicalName:'Pokémon Scarlet & Violet 151 Elite Trainer Box',
    aliases:['Pokemon 151 ETB','151 Elite Trainer Box'],
    category:'Trading Cards',manufacturer:'The Pokémon Company',brand:'Pokémon',line:'Scarlet & Violet 151',franchise:'Pokémon',character:'',
    releaseYear:'2023',msrp:49.99,upc:'820650853166',sku:'SV3.5-ETB',releaseStatus:'Released',demo:true,
    attributes:[{key:'Game',value:'Pokémon TCG'},{key:'Set',value:'Scarlet & Violet 151'},{key:'Product Type',value:'Elite Trainer Box'}],
    variants:[]
  },
  {
    id:'spiderman-1-silver',
    canonicalName:'Spider-Man #1 Silver Cover',
    aliases:['Spider-Man 1 Silver','McFarlane Spider-Man #1 Silver Cover'],
    category:'Comics',manufacturer:'Marvel Comics',brand:'Marvel',line:'Spider-Man',franchise:'Spider-Man',character:'Spider-Man',
    releaseYear:'1990',releaseStatus:'Released',demo:true,
    attributes:[{key:'Publisher',value:'Marvel Comics'},{key:'Issue',value:'#1'},{key:'Cover',value:'Silver'},{key:'Creator',value:'Todd McFarlane'}],
    variants:[{id:'spiderman-1-green',name:'Green Cover',type:'Cover Variant',status:'Released'}]
  },
  {
    id:'gibson-sg-standard',
    canonicalName:'Gibson SG Standard',
    aliases:['Gibson SG','SG Standard Heritage Cherry'],
    category:'Other',manufacturer:'Gibson',brand:'Gibson',line:'SG',franchise:'',character:'',
    releaseYear:'2024',modelNumber:'SGS00HCCH1',msrp:1799,releaseStatus:'Released',demo:true,
    attributes:[{key:'Type',value:'Electric Guitar'},{key:'Body',value:'Mahogany'},{key:'Finish',value:'Heritage Cherry'}],
    variants:[]
  },
  {
    id:'sony-wh1000xm5',
    canonicalName:'Sony WH-1000XM5',
    aliases:['WH1000XM5','Sony XM5'],
    category:'Technology',manufacturer:'Sony',brand:'Sony',line:'1000X',franchise:'',character:'',
    releaseYear:'2022',modelNumber:'WH1000XM5/B',upc:'027242923751',msrp:399.99,releaseStatus:'Released',demo:true,
    attributes:[{key:'Type',value:'Wireless Headphones'},{key:'Noise Canceling',value:'Yes'},{key:'Color',value:'Black'}],
    variants:[]
  }
];

export const DEMO_RELATIONSHIPS:Record<string,UserProductRelationship>={
  'ml-final-swing':{productId:'ml-final-swing',ownedQuantity:1,wishlisted:false,tracked:true,grail:false,setupLocation:'Display Case 2 / Shelf 3'},
  'ml-friendly-neighborhood':{productId:'ml-friendly-neighborhood',ownedQuantity:1,wishlisted:false,tracked:false,grail:false,setupLocation:'Display Case 2 / Shelf 2'},
  'ml-amazing-spiderman':{productId:'ml-amazing-spiderman',ownedQuantity:1,wishlisted:false,tracked:false,grail:false},
  'pokemon-151-etb':{productId:'pokemon-151-etb',ownedQuantity:0,wishlisted:true,tracked:true,grail:false,targetPrice:45},
  'spiderman-1-silver':{productId:'spiderman-1-silver',ownedQuantity:1,wishlisted:false,tracked:false,grail:true}
};

export const DEMO_RECENT_IDS=['ml-final-swing','pokemon-151-etb','spiderman-1-silver'];

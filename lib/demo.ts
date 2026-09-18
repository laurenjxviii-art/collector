import {Store, Item} from './model';
const collections=[{id:'figures',name:'Marvel Legends',icon:'◈',color:'#a5b7ff'},{id:'records',name:'Vinyl records',icon:'◎',color:'#f4bd84'},{id:'comics',name:'Comics',icon:'▤',color:'#bdd7a7'},{id:'objects',name:'Everyday treasures',icon:'◇',color:'#f0a9c0'}];
const base={quantity:1,condition:'Excellent',purchaseDate:'2026-09-01',location:'Display shelf',notes:'',customFields:{},createdAt:'2026-09-01T12:00:00Z',updatedAt:'2026-09-01T12:00:00Z'};
export const demo:Store={version:1,collections,items:([ 
{id:'1',collectionId:'figures',name:'Spider-Man · Amazing Fantasy',category:'Action figure',status:'owned',purchasePrice:28,currentValue:45,image:'/art/spider.svg',customFields:{Brand:'Hasbro',Series:'Marvel Legends'}},
{id:'2',collectionId:'records',name:'In Rainbows',category:'Vinyl',status:'owned',purchasePrice:32,currentValue:48,image:'/art/record.svg',customFields:{Artist:'Radiohead',Edition:'180g'}},
{id:'3',collectionId:'objects',name:'Polaroid OneStep',category:'Camera',status:'owned',purchasePrice:60,currentValue:95,image:'/art/camera.svg',customFields:{Year:'1977'}},
{id:'4',collectionId:'comics',name:'The Amazing Spider-Man #300',category:'Comic book',status:'wishlist',purchasePrice:0,currentValue:280,image:'/art/comic.svg',customFields:{Publisher:'Marvel',Grade:'9.0'}},
{id:'5',collectionId:'objects',name:'Nike Dunk · Green',category:'Sneakers',status:'owned',purchasePrice:110,currentValue:135,image:'/art/shoe.svg',customFields:{Size:'10',Colorway:'Team Green'}},
{id:'6',collectionId:'figures',name:'Iron Man · Mark III',category:'Action figure',status:'sold',purchasePrice:25,currentValue:38,image:'/art/iron.svg',customFields:{Brand:'Hasbro'}}
 ] as (Omit<Item,keyof typeof base> & {customFields:Record<string,string>})[]).map(i=>({...base,...i} as Item))};



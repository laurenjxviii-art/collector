import widgets from './widgets.json';
import fits from './mobile-layouts.json';
import type {WidgetPlacement} from '../../lib/platform';

/** Phone Home is stored separately so phone edits never move the desktop layout. */
export const MOBILE_LAYOUT_KEY='figma-01-home-mobile';
export type MobileSize='small'|'medium'|'large';
export type MobileRow={id:string;size:MobileSize};
export type MobileFit={size:[number,number];hidden:string[];scale:Record<string,number>};
export const MOBILE_FITS=fits as unknown as Record<string,MobileFit>;

/** Native Figma unit of one desktop small widget. Every phone cell is this box, scaled. */
export const UNIT={col:254.59957885742188,row:119.81156158447266};
export const MOBILE_GAP=12;

/** Figma "01 Home · Mobile": small 1×1, medium 1 wide × 2 tall, large 2 × 2. */
export const MOBILE_STARTER:MobileRow[]=[
 {id:'175:35',size:'small'},{id:'175:306',size:'small'},
 {id:'248:3575',size:'large'},
 {id:'248:2753',size:'medium'},{id:'175:441',size:'small'},{id:'177:84',size:'small'},
 {id:'177:403',size:'small'},{id:'177:317',size:'small'},
 {id:'177:725',size:'small'},{id:'248:3148',size:'medium'},{id:'177:608',size:'small'},
 {id:'248:3186',size:'large'},
 {id:'248:2447',size:'medium'},{id:'175:722',size:'small'},{id:'175:489',size:'small'}
];

export function desktopKind(id:string):MobileSize{
 const name=widgets.find(w=>w.id===id)?.name||'';
 return name.includes('/ Large /')?'large':name.includes('/ Medium /')?'medium':'small';
}
/** Sizes a widget can take on a phone. Desktop medium widgets fit the 2×2 slot as designed;
 *  the 1×2 and reflowed large versions exist only where Figma has a phone layout. */
export function mobileSizes(id:string):MobileSize[]{
 const kind=desktopKind(id),fit=!!MOBILE_FITS[id];
 if(kind==='small')return ['small'];
 if(kind==='medium')return fit?['medium','large']:['large'];
 return fit?['large']:[];
}
/** True when the widget should render with its phone-specific Figma layout. */
export const usesFit=(id:string,size:MobileSize)=>!!MOBILE_FITS[id]&&(size==='medium'||desktopKind(id)==='large');
export const MOBILE_WIDGETS=widgets.filter(w=>mobileSizes(w.id).length);

export function mobileSelection(saved?:WidgetPlacement[]):MobileRow[]{
 if(!saved)return MOBILE_STARTER.map(r=>({...r}));
 const seen=new Set<string>();
 return saved.filter(w=>w.visible).toSorted((a,b)=>a.order-b.order).flatMap(w=>{
  const sizes=mobileSizes(w.id);if(!sizes.length||seen.has(w.id))return [];seen.add(w.id);
  return [{id:w.id,size:sizes.includes(w.size as MobileSize)?w.size as MobileSize:sizes[0]}];
 });
}
export const toPlacements=(rows:MobileRow[]):WidgetPlacement[]=>rows.map((r,order)=>({id:r.id,visible:true,order,size:r.size,config:{}}));
export const span=(size:MobileSize)=>({w:size==='large'?2:1,h:size==='small'?1:2});

/** First-fit packing into two columns, the same order-driven flow as the Figma frame. */
export function packMobile(rows:MobileRow[]){
 const taken=new Set<string>(),free=(x:number,y:number,w:number,h:number)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)if(i>1||taken.has(i+','+j))return false;return true};
 let height=0;
 const items=rows.map(r=>{const {w,h}=span(r.size);let y=0,x=0;
  for(;;y++){x=[0,1].find(c=>free(c,y,w,h))??-1;if(x>=0)break;}
  for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)taken.add(i+','+j);
  height=Math.max(height,y+h);return {...r,x,y,w,h};});
 return {items,rows:height};
}
export function geometry(colWidth:number){
 const scale=colWidth/UNIT.col,row=UNIT.row*scale;
 return {scale,col:colWidth,row,place:(x:number,y:number,w:number,h:number)=>({left:x*(colWidth+MOBILE_GAP),top:y*(row+MOBILE_GAP),width:w*colWidth+(w-1)*MOBILE_GAP,height:h*row+(h-1)*MOBILE_GAP})};
}
export function mobileCategory(title:string){
 if(/Rep|Social|Post|Follower/.test(title))return 'Social';
 if(/Setup|Space|Shelf|Spot/.test(title))return 'Setup';
 if(/Calendar|Task|Today|Focus|Habit|Goal Progress|Workout|Daily Note|Upcoming|Next Up/.test(title))return 'Life';
 if(/Spend|Budget|Debt|Bill|Cash|Savings|Revenue|Profit|Payout|Net Worth/.test(title))return 'Money';
 if(/Wishlist|Grail|Price|Drop|Opportunit/.test(title))return 'Wishlist';
 return 'Collect';
}

import widgets from './widgets.json';
import type {WidgetPlacement} from '../../lib/platform';

export const STARTER_WIDGETS=['248:3575','175:35','175:306','177:140','177:158'];
export const HOME_LAYOUT_KEY='figma-01-home';
export function homeWidgetSelection(saved?:WidgetPlacement[]){
 const known=new Set(widgets.map(w=>w.id));
 const order=saved?.length?saved.toSorted((a,b)=>a.order-b.order).filter(w=>known.has(w.id)).map(w=>w.id):STARTER_WIDGETS;
 return [...new Set([...order,...widgets.map(w=>w.id)])].map((id,index)=>{const source=widgets.find(w=>w.id===id)!;const previous=saved?.find(w=>w.id===id);return {id,order:index,visible:saved?.length?previous?.visible===true:STARTER_WIDGETS.includes(id),size:(source.name.includes('/ Large /')?'large':source.name.includes('/ Medium /')?'medium':'small') as WidgetPlacement['size'],config:previous?.config||{}};});
}

/** Only widget placement adapts. Every widget's generated tree keeps its original geometry. */
export function packHomeWidgets(width:number,selection:WidgetPlacement[]){
 const columns=width>=1500?8:width>=1280?6:width>=800?4:width>=480?2:1;
 const col=254.59957885742188,row=119.81156158447266,gap=17.280517578125;
 const unitScale=width/(columns*col+(columns-1)*gap),occupied=new Set<string>();
 const items=selection.filter(s=>s.visible).flatMap(s=>{const w=widgets.find(w=>w.id===s.id);if(!w)return [];const nativeSpan=w.name.includes('/ Large /')?4:w.name.includes('/ Medium /')?2:1,span=Math.min(nativeSpan,columns);let x=0,y=0;
  let found=false;
  for(y=0;y<1000&&!found;y++)for(x=0;x<=columns-span;x++){
   let free=true;for(let dy=0;dy<span;dy++)for(let dx=0;dx<span;dx++)if(occupied.has((x+dx)+','+(y+dy)))free=false;
   if(free){found=true;break;}
  }
  y--;
  for(let dy=0;dy<span;dy++)for(let dx=0;dx<span;dx++)occupied.add((x+dx)+','+(y+dy));
  const renderedWidth=(span*col+(span-1)*gap)*unitScale,scale=renderedWidth/w.width;
  return [{...w,left:x*(col+gap)*unitScale,top:y*(row+gap)*unitScale,renderedWidth,renderedHeight:w.height*scale,scale}];
 });
 return {items,height:Math.max(0,...items.map(w=>w.top+w.renderedHeight))};
}

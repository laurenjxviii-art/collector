import widgets from './widgets.json';
import type {WidgetPlacement} from '../../lib/platform';
export const STARTER_WIDGETS=['248:3575','175:35','175:306','177:140','177:158'];
export const HOME_LAYOUT_KEY='figma-01-home';
export function homeWidgetSelection(saved?:WidgetPlacement[]){
 const known=new Set(widgets.map(w=>w.id));
 const order=saved?.length?saved.toSorted((a,b)=>a.order-b.order).filter(w=>known.has(w.id)).map(w=>w.id):STARTER_WIDGETS;
 return [...new Set([...order,...widgets.map(w=>w.id)])].map((id,index)=>{const source=widgets.find(w=>w.id===id)!;const previous=saved?.find(w=>w.id===id);return {id,order:index,visible:saved?.length?previous?.visible===true:STARTER_WIDGETS.includes(id),size:(source.name.includes('/ Large /')?'large':source.name.includes('/ Medium /')?'medium':'small') as WidgetPlacement['size'],config:previous?.config||{}};});
}
export function gridMetrics(width:number){
 const columns=width>=1500?8:width>=1280?6:width>=800?4:width>=480?2:1;
 const col=254.59957885742188,row=119.81156158447266,gap=17.280517578125;
 const scale=width/(columns*col+(columns-1)*gap);
 return {columns,col,row,gap,stepX:(col+gap)*scale,stepY:(row+gap)*scale,unitScale:scale};
}
type Rect={x:number;y:number;span:number};
const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.span&&a.x+a.span>b.x&&a.y<b.y+b.span&&a.y+a.span>b.y;
const coord=(value:unknown,max:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(max,Math.round(value))):undefined;
/** Reserve explicit positions first. Empty cells are intentional and never compacted. */
export function packHomeWidgets(width:number,selection:WidgetPlacement[],priorityId?:string){
 const m=gridMetrics(width),occupied:Rect[]=[];
 const rows=selection.filter(s=>s.visible).flatMap(s=>{const w=widgets.find(w=>w.id===s.id);if(!w)return [];const nativeSpan=w.name.includes('/ Large /')?4:w.name.includes('/ Medium /')?2:1;
 const span=Math.min(m.columns,[1,2,4].includes(Number(s.config.span))?Number(s.config.span):nativeSpan);
 return [{s,w,span,x:coord(s.config['x'+m.columns],m.columns-span),y:coord(s.config['y'+m.columns],200)}];});
 rows.sort((a,b)=>a.s.id===priorityId?-1:b.s.id===priorityId?1:Number(b.x!==undefined&&b.y!==undefined)-Number(a.x!==undefined&&a.y!==undefined));
 const positioned=rows.map(({s,w,span,x,y})=>{let point:Rect={x:x??0,y:y??0,span};
 if(x===undefined||y===undefined||occupied.some(r=>overlaps(r,point))){
  let best:Rect|undefined,bestDistance=Infinity;
  for(let cy=0;cy<Math.max(220,...occupied.map(r=>r.y+r.span+span));cy++){
   if(best&&(y===undefined||cy>(y+bestDistance)))break;
   for(let cx=0;cx<=m.columns-span;cx++){
   const candidate={x:cx,y:cy,span};if(occupied.some(r=>overlaps(r,candidate)))continue;
   const distance=x!==undefined&&y!==undefined?Math.abs(cx-x)+Math.abs(cy-y):cy*m.columns+cx;
   if(distance<bestDistance){best=candidate;bestDistance=distance;}if(distance===0)break;
  }
  }
  point=best||{x:0,y:Math.max(0,...occupied.map(r=>r.y+r.span)),span};
 }
 occupied.push(point);const renderedWidth=(span*m.col+(span-1)*m.gap)*m.unitScale,scale=renderedWidth/w.width;
 return {...w,...point,left:point.x*m.stepX,top:point.y*m.stepY,renderedWidth,renderedHeight:w.height*scale,scale};});
 const items=positioned.toSorted((a,b)=>selection.findIndex(s=>s.id===a.id)-selection.findIndex(s=>s.id===b.id));
 return {...m,items,height:Math.max(0,...items.map(w=>w.top+w.renderedHeight))};
}
export function pinHomeLayout(width:number,selection:WidgetPlacement[],priorityId?:string){
 const packed=packHomeWidgets(width,selection,priorityId);
 return selection.map(s=>{const p=packed.items.find(w=>w.id===s.id);return p?{...s,config:{...s.config,['x'+packed.columns]:p.x,['y'+packed.columns]:p.y}}:s});
}
export function moveHomeWidget(width:number,selection:WidgetPlacement[],id:string,x:number,y:number){
 const pinned=pinHomeLayout(width,selection),{columns}=gridMetrics(width);
 return pinHomeLayout(width,pinned.map(s=>s.id===id?{...s,config:{...s.config,['x'+columns]:x,['y'+columns]:y}}:s),id);
}

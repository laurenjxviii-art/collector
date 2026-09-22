export type HomeWidgetId=
  |'collectionValue'|'costBasis'|'profitLoss'|'monthlySpend'
  |'portfolioPerformance'|'brief'|'wishlist'|'radar'|'progress'
  |'purchases'|'sales'|'capacity'|'alerts'|'finance'|'social'|'calendar';

export type HomeWidgetSize='metric'|'medium'|'large'|'wide'|'full';

export type HomeWidgetLayout={
  id:HomeWidgetId;
  type:HomeWidgetId;
  visible:boolean;
  x:number;
  y:number;
  width:number;
  height:number;
  size:HomeWidgetSize;
  config:Record<string,string|number|boolean|string[]>;
};

export type HomeDashboardState={
  version:1;
  widgets:HomeWidgetLayout[];
  updatedAt:string;
};

export const HOME_WIDGET_TITLES:Record<HomeWidgetId,string>={
  collectionValue:'Collection Value',
  costBasis:'Cost Basis',
  profitLoss:'Unrealized P/L',
  monthlySpend:'Hobby Spend',
  portfolioPerformance:'Portfolio Performance',
  brief:'VEXUM Brief',
  wishlist:'Wishlist Opportunities',
  radar:'Radar',
  progress:'Collection Progress',
  purchases:'Recent Purchases',
  sales:'Recent Sales',
  capacity:'Setup Capacity',
  alerts:'Needs Attention',
  finance:'Financial Snapshot',
  social:'Social Activity',
  calendar:'Release Calendar'
};

const definition:Array<[HomeWidgetId,HomeWidgetSize,number,number,Record<string,string|number|boolean|string[]>?]>= [
  ['collectionValue','metric',3,1],
  ['costBasis','metric',3,1],
  ['profitLoss','metric',3,1],
  ['monthlySpend','metric',3,1],
  ['portfolioPerformance','wide',8,4,{interval:'30D'}],
  ['brief','medium',4,4],
  ['wishlist','medium',4,3,{priority:['High','Grail']}],
  ['radar','medium',4,3],
  ['progress','medium',4,3,{count:3}],
  ['purchases','large',6,3,{count:5}],
  ['sales','large',6,3,{count:5}],
  ['capacity','medium',4,3],
  ['alerts','medium',4,3],
  ['finance','medium',4,3],
  ['social','medium',4,3],
  ['calendar','wide',8,3]
];

export function defaultHomeDashboard():HomeDashboardState{
  return {
    version:1,
    widgets:definition.map(([id,size,width,height,config],index)=>({
      id,type:id,visible:true,x:index%4,y:Math.floor(index/4),width,height,size,config:config||{}
    })),
    updatedAt:new Date().toISOString()
  };
}

export function normalizeHomeDashboard(value?:HomeDashboardState):HomeDashboardState{
  const defaults=defaultHomeDashboard();
  if(!value||value.version!==1||!Array.isArray(value.widgets))return defaults;
  const supplied=new Map(value.widgets.filter(widget=>widget&&HOME_WIDGET_TITLES[widget.id]).map(widget=>[widget.id,widget]));
  return {
    version:1,
    widgets:defaults.widgets.map((fallback,index)=>{
      const current=supplied.get(fallback.id);
      if(!current)return fallback;
      return {
        ...fallback,
        ...current,
        id:fallback.id,
        type:fallback.type,
        visible:typeof current.visible==='boolean'?current.visible:true,
        x:Number.isFinite(current.x)?current.x:index%4,
        y:Number.isFinite(current.y)?current.y:Math.floor(index/4),
        width:Number.isFinite(current.width)&&current.width>0?current.width:fallback.width,
        height:Number.isFinite(current.height)&&current.height>0?current.height:fallback.height,
        size:['metric','medium','large','wide','full'].includes(current.size)?current.size:fallback.size,
        config:current.config&&typeof current.config==='object'&&!Array.isArray(current.config)?current.config:fallback.config
      };
    }),
    updatedAt:typeof value.updatedAt==='string'?value.updatedAt:new Date().toISOString()
  };
}

export function validHomeDashboard(value:unknown):value is HomeDashboardState{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const state=value as HomeDashboardState;
  if(state.version!==1||!Array.isArray(state.widgets)||typeof state.updatedAt!=='string')return false;
  return state.widgets.every(widget=>widget&&
    typeof widget.id==='string'&&widget.id in HOME_WIDGET_TITLES&&
    widget.type===widget.id&&typeof widget.visible==='boolean'&&
    [widget.x,widget.y,widget.width,widget.height].every(number=>typeof number==='number'&&Number.isFinite(number)&&number>=0)&&
    ['metric','medium','large','wide','full'].includes(widget.size)&&
    !!widget.config&&typeof widget.config==='object'&&!Array.isArray(widget.config)
  );
}

export const DEMO_HOME_DATA={
  portfolio:{
    currentValue:12481,
    costBasis:8714,
    unrealized:3767,
    unrealizedPct:43.2,
    changeYesterday:42.18,
    chart:[9100,9275,9480,9410,9720,10050,10320,10210,10640,10980,10880,11240,11490,11720,11630,11980,12110,12481]
  },
  monthlySpend:{spent:182,budget:250},
  brief:[
    ['Portfolio','+$42.18 yesterday','green'],
    ['Wishlist','3 price drops','red'],
    ['Radar','Spider-Man restocked at MSRP','green'],
    ['Budget','$182 / $250','orange'],
    ['Preorders','2 within 14 days','red'],
    ['Collection','Action Figures 73%','green'],
    ['Audit','1 possible duplicate','orange'],
    ['Packages','2 arriving today','green'],
    ['Inbox','3 important emails','muted'],
    ['Drops','2 happening today','red']
  ],
  wishlist:[
    ['Spider-Man Statue','$319','$280','$272','BELOW TARGET'],
    ['Pokémon 151 ETB','$96','$90','$88','BELOW TARGET'],
    ['Marvel Legends Wave','$29.99','$24.99','$24.99','AT TARGET']
  ],
  radar:[
    ['RESTOCK','Marvel Legends Spider-Man','$24.99','At MSRP'],
    ['DROP','Supreme x Marvel','Tomorrow','11:00 AM'],
    ['PREORDER','Pokémon Mega Evolution','Sep 26','Opens']
  ],
  progress:[
    ['Movie Spider-Man',12,14],
    ['Pokémon Set',183,240],
    ['JJK Union Arena',96,154]
  ],
  purchases:[
    ['Marvel Legends Final Swing','Today',24.99,42.68],
    ['Amazing Spider-Man #1','Yesterday',18.50,31],
    ['Nike SB Dunk Low','Sep 19',118,126]
  ],
  sales:[
    ['Funko Pop! Miles Morales',38,14,'Vinted'],
    ['Pokémon ETB',105,22,'eBay'],
    ['Marvel Legends Venom',54,9,'Mercari']
  ],
  capacity:[
    ['Display Case 2',73,'73%'],
    ['Comic Box 4',71,'142 / 200'],
    ['Binder 3',88,'318 / 360']
  ],
  alerts:[
    ['Preorder charge approaching','Hot Toys Venom · 7 days'],
    ['Duplicate detected','1 Portfolio record to review'],
    ['Marketplace offer','1 offer waiting in Sell'],
    ['Setup capacity','Display Case 2 is at 73%']
  ],
  social:[
    ['Collector Network','12 new posts'],
    ['Spider-Man Collectors','4 new discussions'],
    ['Communities','2 replies']
  ],
  calendar:[
    ['SEP 22','Marvel Legends Wave 3','Release'],
    ['SEP 23','Supreme x Marvel','Drop'],
    ['SEP 26','Pokémon Mega Evolution','Preorders open']
  ]
} as const;

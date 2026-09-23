export type VexumModuleId='home'|'life'|'portfolio'|'search'|'wishlist'|'radar'|'sell'|'setup'|'financial'|'social';
export type AppearanceDensity='compact'|'standard'|'comfortable';
export type TextSize='small'|'medium'|'large';
export type MotionLevel='full'|'reduced';
export type GlowLevel='off'|'subtle'|'standard';
export type SidebarWidth='compact'|'standard';
export type NumberFormat='full'|'compact';
export type Visibility='Private'|'Friends'|'Community'|'Public';
export type LifeSectionId='Today'|'Tasks'|'Calendar'|'Habits'|'Goals'|'Focus'|'Fitness';

export type PlatformIdentity={
  username:string;
  displayName:string;
  birthday:string;
  country:string;
  currency:string;
  language:string;
};

export type PlatformAppearance={
  density:AppearanceDensity;
  textSize:TextSize;
  motion:MotionLevel;
  glow:GlowLevel;
  sidebarWidth:SidebarWidth;
  numberFormat:NumberFormat;
};

export type QuietHours={
  enabled:boolean;
  start:string;
  end:string;
  urgentCategories:string[];
};

export type PlatformNotificationPreferences={
  push:boolean;
  email:boolean;
  taskReminders:boolean;
  radar:boolean;
  marketplace:boolean;
  financial:boolean;
  social:boolean;
  quietHours:QuietHours;
  readIds:string[];
  snoozed:Record<string,string>;
};

export type PlatformPrivacy={
  profile:Visibility;
  collections:Visibility;
  wishlist:Visibility;
  setup:Visibility;
  activity:Visibility;
};

export type PlatformSecurity={
  mfaStatus:'not_configured'|'pending'|'verified';
  mfaMethod?:'authenticator'|'phone'|'email';
  requireMfaForExternalFinancial:boolean;
};

export type PlatformConnections={
  financial:{provider:'none'|'manual'|'plaid';status:'not_connected'|'connected'|'error';lastSync?:string};
  calendar:{provider:'none'|'google'|'apple'|'outlook';status:'not_connected'|'connected'|'error';lastSync?:string};
};

export type WidgetPlacement={
  id:string;
  visible:boolean;
  order:number;
  size:'small'|'medium'|'large'|'wide'|'full';
  config:Record<string,string|number|boolean|string[]>;
};

export type WidgetLayoutPreset={
  id:string;
  name:string;
  page:string;
  widgets:WidgetPlacement[];
  createdAt:string;
  updatedAt:string;
};

export type PlatformState={
  version:1;
  onboardingComplete:boolean;
  enabledModules:VexumModuleId[];
  moduleOrder:VexumModuleId[];
  lifeSections:LifeSectionId[];
  collectorCategories:string[];
  collectorInterests:string[];
  identity:PlatformIdentity;
  appearance:PlatformAppearance;
  notifications:PlatformNotificationPreferences;
  privacy:PlatformPrivacy;
  security:PlatformSecurity;
  connections:PlatformConnections;
  dashboardLayouts:Record<string,WidgetPlacement[]>;
  widgetPresets:WidgetLayoutPreset[];
  gamificationEnabled:boolean;
};

export const ALL_MODULES:VexumModuleId[]=['home','life','portfolio','search','wishlist','radar','sell','setup','financial','social'];
export const ALL_LIFE_SECTIONS:LifeSectionId[]=['Today','Tasks','Calendar','Habits','Goals','Focus','Fitness'];

export const MODULE_LABELS:Record<VexumModuleId,string>={
  home:'Home',life:'Life',portfolio:'Portfolio',search:'Search',wishlist:'Wishlist',radar:'Radar',sell:'Sell',setup:'Setup',financial:'Financial',social:'Social'
};

export const MODULE_GROUPS:Array<{label:string;modules:VexumModuleId[]}>= [
  {label:'PERSONAL',modules:['home','life']},
  {label:'COLLECT',modules:['portfolio','search','wishlist','radar','sell','setup']},
  {label:'MONEY',modules:['financial']},
  {label:'COMMUNITY',modules:['social']}
];

export const ONBOARDING_CHOICES:Array<{id:string;label:string;modules:VexumModuleId[]}>= [
  {id:'life',label:'Organize My Life',modules:['life']},
  {id:'collect',label:'Track My Collections',modules:['portfolio','search','wishlist','radar']},
  {id:'sell',label:'Sell / Resell',modules:['sell']},
  {id:'space',label:'Organize My Space',modules:['setup']},
  {id:'money',label:'Manage My Money',modules:['financial']},
  {id:'social',label:'Connect With Collectors',modules:['social']},
  {id:'fitness',label:'Fitness & Workouts',modules:['life']}
];

export const COLLECTOR_CATEGORIES=[
  'Action Figures','Trading Cards','Comics','Sneakers','Funko / Collectible Figures','Statues','Video Games',
  'LEGO / Model Kits','Sports Memorabilia','Watches','Fashion / Streetwear','Vinyl','Guitars / Instruments','Technology','Other'
];
export const COLLECTOR_INTERESTS=['Marvel','Pokémon','DC','Star Wars','Anime','Sports','Gaming','Streetwear','Music','LEGO'];

export function defaultPlatformState(legacy=true):PlatformState{
  return {
    version:1,
    onboardingComplete:legacy,
    enabledModules:legacy?[...ALL_MODULES]:['home'],
    moduleOrder:[...ALL_MODULES],
    lifeSections:[...ALL_LIFE_SECTIONS],
    collectorCategories:[],
    collectorInterests:[],
    identity:{username:'',displayName:'',birthday:'',country:'United States',currency:'USD',language:'English'},
    appearance:{density:'compact',textSize:'medium',motion:'full',glow:'subtle',sidebarWidth:'standard',numberFormat:'full'},
    notifications:{
      push:true,email:false,taskReminders:true,radar:true,marketplace:true,financial:true,social:true,
      quietHours:{enabled:false,start:'23:00',end:'08:00',urgentCategories:['Grail Restock','Financial Security']},
      readIds:[],snoozed:{}
    },
    privacy:{profile:'Private',collections:'Private',wishlist:'Private',setup:'Private',activity:'Private'},
    security:{mfaStatus:'not_configured',requireMfaForExternalFinancial:true},
    connections:{
      financial:{provider:'manual',status:'not_connected'},
      calendar:{provider:'none',status:'not_connected'}
    },
    dashboardLayouts:{},
    widgetPresets:[],
    gamificationEnabled:false
  };
}

function uniqueModules(value:unknown):VexumModuleId[]{
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter((entry):entry is VexumModuleId=>typeof entry==='string'&&ALL_MODULES.includes(entry as VexumModuleId)))];
}
function validTime(value:unknown){return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value)}
function validVisibility(value:unknown):value is Visibility{return ['Private','Friends','Community','Public'].includes(String(value))}
function validWidget(widget:unknown):widget is WidgetPlacement{
  if(!widget||typeof widget!=='object'||Array.isArray(widget))return false;
  const w=widget as WidgetPlacement;
  return typeof w.id==='string'&&typeof w.visible==='boolean'&&Number.isFinite(w.order)&&['small','medium','large','wide','full'].includes(w.size)&&!!w.config&&typeof w.config==='object'&&!Array.isArray(w.config);
}

export function normalizePlatformState(value?:PlatformState,legacy=true):PlatformState{
  const fallback=defaultPlatformState(legacy);
  if(!value||value.version!==1)return fallback;
  const enabled=uniqueModules(value.enabledModules);
  const order=uniqueModules(value.moduleOrder);
  for(const module of ALL_MODULES)if(!order.includes(module))order.push(module);
  if(!enabled.includes('home'))enabled.unshift('home');
  if(legacy&&!enabled.includes('radar')&&['portfolio','search','wishlist'].some(module=>enabled.includes(module as VexumModuleId)))enabled.push('radar');
  const identity=value.identity&&typeof value.identity==='object'?value.identity:fallback.identity;
  const appearance=value.appearance&&typeof value.appearance==='object'?value.appearance:fallback.appearance;
  const notifications=value.notifications&&typeof value.notifications==='object'?value.notifications:fallback.notifications;
  const quiet=notifications.quietHours&&typeof notifications.quietHours==='object'?notifications.quietHours:fallback.notifications.quietHours;
  const privacy=value.privacy&&typeof value.privacy==='object'?value.privacy:fallback.privacy;
  const security=value.security&&typeof value.security==='object'?value.security:fallback.security;
  const connections=value.connections&&typeof value.connections==='object'?value.connections:fallback.connections;
  const layouts:Record<string,WidgetPlacement[]>={};
  if(value.dashboardLayouts&&typeof value.dashboardLayouts==='object'&&!Array.isArray(value.dashboardLayouts)){
    for(const [key,widgets] of Object.entries(value.dashboardLayouts))if(Array.isArray(widgets))layouts[key]=widgets.filter(validWidget);
  }
  return {
    version:1,
    onboardingComplete:typeof value.onboardingComplete==='boolean'?value.onboardingComplete:fallback.onboardingComplete,
    enabledModules:enabled,
    moduleOrder:order,
    lifeSections:Array.isArray(value.lifeSections)?[...new Set(value.lifeSections.filter((section):section is LifeSectionId=>ALL_LIFE_SECTIONS.includes(section as LifeSectionId)))]:[...fallback.lifeSections],
    collectorCategories:Array.isArray(value.collectorCategories)?value.collectorCategories.filter(x=>typeof x==='string'):[],
    collectorInterests:Array.isArray(value.collectorInterests)?value.collectorInterests.filter(x=>typeof x==='string'):[],
    identity:{
      username:typeof identity.username==='string'?identity.username:'',
      displayName:typeof identity.displayName==='string'?identity.displayName:'',
      birthday:typeof identity.birthday==='string'?identity.birthday:'',
      country:typeof identity.country==='string'?identity.country:'United States',
      currency:typeof identity.currency==='string'?identity.currency:'USD',
      language:typeof identity.language==='string'?identity.language:'English'
    },
    appearance:{
      density:['compact','standard','comfortable'].includes(appearance.density)?appearance.density:'compact',
      textSize:['small','medium','large'].includes(appearance.textSize)?appearance.textSize:'medium',
      motion:['full','reduced'].includes(appearance.motion)?appearance.motion:'full',
      glow:['off','subtle','standard'].includes(appearance.glow)?appearance.glow:'subtle',
      sidebarWidth:['compact','standard'].includes(appearance.sidebarWidth)?appearance.sidebarWidth:'standard',
      numberFormat:['full','compact'].includes(appearance.numberFormat)?appearance.numberFormat:'full'
    },
    notifications:{
      push:typeof notifications.push==='boolean'?notifications.push:true,
      email:typeof notifications.email==='boolean'?notifications.email:false,
      taskReminders:typeof notifications.taskReminders==='boolean'?notifications.taskReminders:true,
      radar:typeof notifications.radar==='boolean'?notifications.radar:true,
      marketplace:typeof notifications.marketplace==='boolean'?notifications.marketplace:true,
      financial:typeof notifications.financial==='boolean'?notifications.financial:true,
      social:typeof notifications.social==='boolean'?notifications.social:true,
      quietHours:{
        enabled:typeof quiet.enabled==='boolean'?quiet.enabled:false,
        start:validTime(quiet.start)?quiet.start:'23:00',
        end:validTime(quiet.end)?quiet.end:'08:00',
        urgentCategories:Array.isArray(quiet.urgentCategories)?quiet.urgentCategories.filter(x=>typeof x==='string'):[]
      },
      readIds:Array.isArray(notifications.readIds)?notifications.readIds.filter(x=>typeof x==='string'):[],
      snoozed:notifications.snoozed&&typeof notifications.snoozed==='object'&&!Array.isArray(notifications.snoozed)?Object.fromEntries(Object.entries(notifications.snoozed).filter(([,v])=>typeof v==='string')):{}
    },
    privacy:{
      profile:validVisibility(privacy.profile)?privacy.profile:'Private',
      collections:validVisibility(privacy.collections)?privacy.collections:'Private',
      wishlist:validVisibility(privacy.wishlist)?privacy.wishlist:'Private',
      setup:validVisibility(privacy.setup)?privacy.setup:'Private',
      activity:validVisibility(privacy.activity)?privacy.activity:'Private'
    },
    security:{
      mfaStatus:['not_configured','pending','verified'].includes(security.mfaStatus)?security.mfaStatus:'not_configured',
      mfaMethod:['authenticator','phone','email'].includes(String(security.mfaMethod))?security.mfaMethod:undefined,
      requireMfaForExternalFinancial:typeof security.requireMfaForExternalFinancial==='boolean'?security.requireMfaForExternalFinancial:true
    },
    connections:{
      financial:{
        provider:['none','manual','plaid'].includes(connections.financial?.provider)?connections.financial.provider:'manual',
        status:['not_connected','connected','error'].includes(connections.financial?.status)?connections.financial.status:'not_connected',
        lastSync:typeof connections.financial?.lastSync==='string'?connections.financial.lastSync:undefined
      },
      calendar:{
        provider:['none','google','apple','outlook'].includes(connections.calendar?.provider)?connections.calendar.provider:'none',
        status:['not_connected','connected','error'].includes(connections.calendar?.status)?connections.calendar.status:'not_connected',
        lastSync:typeof connections.calendar?.lastSync==='string'?connections.calendar.lastSync:undefined
      }
    },
    dashboardLayouts:layouts,
    widgetPresets:Array.isArray(value.widgetPresets)?value.widgetPresets.filter(preset=>preset&&typeof preset.id==='string'&&typeof preset.name==='string'&&typeof preset.page==='string'&&Array.isArray(preset.widgets)&&preset.widgets.every(validWidget)&&typeof preset.createdAt==='string'&&typeof preset.updatedAt==='string'):[],
    gamificationEnabled:typeof value.gamificationEnabled==='boolean'?value.gamificationEnabled:false
  };
}

export function validPlatformState(value:unknown):value is PlatformState{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const normalized=normalizePlatformState(value as PlatformState,false);
  const original=value as PlatformState;
  return original.version===1&&JSON.stringify(normalized)!==undefined;
}

export function platformFromChoices(input:{
  choiceIds:string[];
  identity:Partial<PlatformIdentity>;
  collectorCategories?:string[];
  collectorInterests?:string[];
  everything?:boolean;
}):PlatformState{
  const state=defaultPlatformState(false);
  const enabled=new Set<VexumModuleId>(['home']);
  if(input.everything)ALL_MODULES.forEach(module=>enabled.add(module));
  else for(const choice of ONBOARDING_CHOICES.filter(choice=>input.choiceIds.includes(choice.id)))choice.modules.forEach(module=>enabled.add(module));
  state.enabledModules=state.moduleOrder.filter(module=>enabled.has(module));
  if(input.everything)state.lifeSections=[...ALL_LIFE_SECTIONS];
  else if(input.choiceIds.includes('life'))state.lifeSections=input.choiceIds.includes('fitness')?[...ALL_LIFE_SECTIONS]:ALL_LIFE_SECTIONS.filter(section=>section!=='Fitness');
  else if(input.choiceIds.includes('fitness'))state.lifeSections=['Today','Fitness'];
  else state.lifeSections=[...ALL_LIFE_SECTIONS];
  state.identity={...state.identity,...input.identity};
  state.collectorCategories=[...(input.collectorCategories||[])];
  state.collectorInterests=[...(input.collectorInterests||[])];
  state.onboardingComplete=true;
  if(input.choiceIds.includes('money')||input.everything)state.connections.financial={provider:'none',status:'not_connected'};
  return state;
}

export function newPlatformId(prefix:string){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}

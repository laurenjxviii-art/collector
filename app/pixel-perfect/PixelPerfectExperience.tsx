'use client';

import dynamic from 'next/dynamic';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useMemo,useState,type MouseEvent,type ReactNode} from 'react';

type ModalSpec={component:React.ComponentType; width:number; height:number; afterConfirm?:string};

const modalSpecs:Record<string,ModalSpec>={
  'login':{component:dynamic(()=>import('./generated/login-popup'),{ssr:false}),width:1121,height:848},
  'account':{component:dynamic(()=>import('./generated/account-popup'),{ssr:false}),width:904,height:839},
  'profile-settings':{component:dynamic(()=>import('./generated/profile-popup'),{ssr:false}),width:1003,height:960},
  'security':{component:dynamic(()=>import('./generated/security-popup'),{ssr:false}),width:983,height:950},
  'appearance':{component:dynamic(()=>import('./generated/appearance-popup'),{ssr:false}),width:1018,height:964},
  'modules':{component:dynamic(()=>import('./generated/modules-popup'),{ssr:false}),width:848,height:999},
  'notification-settings':{component:dynamic(()=>import('./generated/notifications-popup'),{ssr:false}),width:824,height:914},
  'privacy':{component:dynamic(()=>import('./generated/privacy-popup'),{ssr:false}),width:886,height:887},
  'language':{component:dynamic(()=>import('./generated/language-popup'),{ssr:false}),width:997,height:925},
  'connections':{component:dynamic(()=>import('./generated/connections-popup'),{ssr:false}),width:1113,height:916},
  'cloud':{component:dynamic(()=>import('./generated/cloud-popup'),{ssr:false}),width:980,height:955},
  'payment-methods':{component:dynamic(()=>import('./generated/payment-methods-popup'),{ssr:false}),width:1085,height:975},
  'subscription':{component:dynamic(()=>import('./generated/subscription-popup'),{ssr:false}),width:1207,height:952},
  'data':{component:dynamic(()=>import('./generated/data-popup'),{ssr:false}),width:1139,height:970},
  'help':{component:dynamic(()=>import('./generated/help-popup'),{ssr:false}),width:1199,height:943},
  'ask-vexum':{component:dynamic(()=>import('./generated/ask-vexum-popup'),{ssr:false}),width:778,height:672},
  'quick-add':{component:dynamic(()=>import('./generated/quick-add-popup'),{ssr:false}),width:846,height:771},
  'new-workout':{component:dynamic(()=>import('./generated/new-workout-popup'),{ssr:false}),width:880,height:888,afterConfirm:'/fitness'},
  'new-task':{component:dynamic(()=>import('./generated/new-task-popup'),{ssr:false}),width:897,height:905,afterConfirm:'/tasks'},
  'new-routine':{component:dynamic(()=>import('./generated/new-routine-popup'),{ssr:false}),width:846,height:895,afterConfirm:'/routine'},
  'new-goal':{component:dynamic(()=>import('./generated/new-goal-popup'),{ssr:false}),width:941,height:864,afterConfirm:'/goals'},
  'new-checklist':{component:dynamic(()=>import('./generated/new-checklist-popup'),{ssr:false}),width:975,height:858,afterConfirm:'/checklists'},
  'new-schedule':{component:dynamic(()=>import('./generated/new-schedule-popup'),{ssr:false}),width:1022,height:868,afterConfirm:'/schedule'},
  'new-collection':{component:dynamic(()=>import('./generated/new-collection-popup'),{ssr:false}),width:907,height:866,afterConfirm:'/portfolio'},
  'new-item':{component:dynamic(()=>import('./generated/new-item-popup'),{ssr:false}),width:1037,height:904,afterConfirm:'/portfolio/items'},
  'sell-item':{component:dynamic(()=>import('./generated/sell-item-popup'),{ssr:false}),width:987,height:874,afterConfirm:'/sell'},
  'add-debt':{component:dynamic(()=>import('./generated/add-debt-popup'),{ssr:false}),width:1020,height:854,afterConfirm:'/debt'},
  'new-room':{component:dynamic(()=>import('./generated/new-room-popup'),{ssr:false}),width:1242,height:836,afterConfirm:'/communities'},
  'new-wishlist':{component:dynamic(()=>import('./generated/new-wishlist-popup'),{ssr:false}),width:996,height:880,afterConfirm:'/wishlist'},
  'create-alert':{component:dynamic(()=>import('./generated/create-alert-popup'),{ssr:false}),width:1001,height:847,afterConfirm:'/radar'},
  'rep-up':{component:dynamic(()=>import('./generated/vexum-rep-up-popup'),{ssr:false}),width:733,height:860},
  '2fa':{component:dynamic(()=>import('./generated/two-factor-popup'),{ssr:false}),width:932,height:837},
  'subs':{component:dynamic(()=>import('./generated/subs-popup'),{ssr:false}),width:1050,height:823},
  'notifications-dropdown':{component:dynamic(()=>import('./generated/notification-dropdown'),{ssr:false}),width:596,height:602},
  'customize':{component:dynamic(()=>import('./generated/customize'),{ssr:false}),width:1001,height:885},
};

const globalRoutes:Array<[RegExp,string]>=[
  [/^home$/i,'/'],
  [/^tasks?$/i,'/tasks'],
  [/^calendar$/i,'/calendar'],
  [/^routine(s)?$/i,'/routine'],
  [/^goals?$/i,'/goals'],
  [/^checklists?$/i,'/checklists'],
  [/^schedule$/i,'/schedule'],
  [/^fitness$/i,'/fitness'],
  [/^communities$/i,'/communities'],
  [/^collections?$/i,'/portfolio'],
  [/^all items$/i,'/portfolio/items'],
  [/^wishlist$/i,'/wishlist'],
  [/^sell$/i,'/sell'],
  [/^(marketplace|discover)$/i,'/marketplace'],
  [/^radar$/i,'/radar'],
  [/^(accounts?|financial)$/i,'/financial'],
  [/^debt$/i,'/debt'],
  [/^social$/i,'/social'],
  [/^profile$/i,'/profile'],
  [/^messages$/i,'/messages'],
  [/^notifications$/i,'/notifications'],
  [/^collect$/i,'/portfolio'],
];

const creationRules:Array<[RegExp,string]>=[
  [/(ask vexum)/i,'ask-vexum'],
  [/(quick add)/i,'quick-add'],
  [/(new|add|create) workout/i,'new-workout'],
  [/(new|add|create) task/i,'new-task'],
  [/(new|add|create) routine/i,'new-routine'],
  [/(new|add|create) goal/i,'new-goal'],
  [/(new|add|create) checklist/i,'new-checklist'],
  [/(new|add|create) schedule/i,'new-schedule'],
  [/(new|add|create) collection/i,'new-collection'],
  [/(new|add|create) item/i,'new-item'],
  [/(sell item|list item)/i,'sell-item'],
  [/(add debt|new debt)/i,'add-debt'],
  [/(new|create) room/i,'new-room'],
  [/(new|add|create) wishlist/i,'new-wishlist'],
  [/(create|new) alert/i,'create-alert'],
];

const profileSettings:Record<string,string>={
  'account':'account','profile':'profile-settings','security':'security','appearance':'appearance',
  'modules':'modules','notifications':'notification-settings','privacy':'privacy','language':'language',
  'connections':'connections','cloud':'cloud','payment methods':'payment-methods','subscription':'subscription',
  'data':'data','help':'help','two-factor authentication':'2fa','2fa':'2fa'
};

function clean(value:string){return value.replace(/\s+/g,' ').trim()}

export default function PixelPerfectExperience({children}:{children:ReactNode}){
  const router=useRouter();
  const pathname=usePathname();
  const [scale,setScale]=useState(1);
  const [modal,setModal]=useState<string|null>(null);
  const [modalScale,setModalScale]=useState(1);

  useEffect(()=>{
    const update=()=>setScale(Math.min(1,window.innerWidth/1920));
    update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);
  },[]);

  const spec=modal?modalSpecs[modal]:undefined;
  useEffect(()=>{
    if(!spec)return;
    const update=()=>setModalScale(Math.min(1,(window.innerWidth-48)/spec.width,(window.innerHeight-48)/spec.height));
    update();window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update);
  },[modal,spec?.width,spec?.height]);

  useEffect(()=>{
    if(!modal)return;
    const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(null)};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[modal]);

  const profileMode=pathname==='/profile';
  const ModalComponent=spec?.component;

  const handleClick=(event:MouseEvent<HTMLDivElement>)=>{
    const raw=event.target as HTMLElement;
    const named=raw.closest<HTMLElement>('[data-name]');
    const name=clean(named?.dataset.name||'');
    const text=clean(named?.textContent||raw.textContent||'');
    const combined=clean(name+' '+text);

    if(modal){
      if(/(^|\s)(close|cancel)(\s|$)/i.test(combined)||/(^|\s)x icon(\s|$)/i.test(combined)||name.toLowerCase()==='x'){
        event.preventDefault();event.stopPropagation();setModal(null);return;
      }
      if(/\b(create|save|add|continue|done|confirm|sell|list)\b/i.test(text)&&spec?.afterConfirm){
        event.preventDefault();event.stopPropagation();setModal(null);router.push(spec.afterConfirm);return;
      }
    }

    for(const [rule,key] of creationRules){
      if(rule.test(combined)){event.preventDefault();setModal(key);return}
    }

    if(/notification/i.test(name)&&/(bell|indicator|dropdown)/i.test(name)){
      event.preventDefault();setModal('notifications-dropdown');return;
    }

    if(/search/i.test(name)&&(name.toLowerCase().includes('control')||name.toLowerCase().includes('field'))){
      event.preventDefault();router.push('/marketplace');return;
    }

    if(profileMode){
      const key=clean(text).toLowerCase();
      if(profileSettings[key]){event.preventDefault();setModal(profileSettings[key]);return}
    }

    for(const [rule,href] of globalRoutes){
      if(rule.test(text)||rule.test(name)){event.preventDefault();router.push(href);return}
    }
  };

  const stageSize=useMemo(()=>({width:1920*scale,height:1080*scale}),[scale]);

  return <div id="pp-root" onClickCapture={handleClick}>
    <div style={stageSize}>
      <div className="pp-stage" style={{transform:`scale(${scale})`}}>{children}</div>
    </div>
    {spec&&ModalComponent?<div className="pp-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}>
      <div style={{width:spec.width*modalScale,height:spec.height*modalScale}}>
        <div className="pp-modal-stage" style={{width:spec.width,height:spec.height,transform:`scale(${modalScale})`}}>
          <ModalComponent/>
        </div>
      </div>
    </div>:null}
  </div>;
}

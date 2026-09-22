'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  Bell,CalendarCheck,ChevronDown,CircleDollarSign,HelpCircle,Home,Layers3,LifeBuoy,LogOut,
  LockKeyhole,MessageSquare,Plus,Search,Settings,Share2,ShoppingBag,SlidersHorizontal,Star,UserRound,X
} from 'lucide-react';
import VexumHome from './VexumHome';
import VexumLife from './VexumLife';
import VexumPortfolio from './VexumPortfolio';
import VexumSearch from './search/VexumSearch';
import VexumWishlist from './VexumWishlist';
import VexumFinancial from './VexumFinancial';
import VexumSetup from './VexumSetup';
import VexumSell from './VexumSell';
import VexumSocial from './VexumSocial';
import VexumSettings from './VexumSettings';
import VexumOnboarding from './VexumOnboarding';
import CloudPanel from './CloudPanel';
import {useWorkspace} from '../lib/useWorkspace';
import {challengeMfa,mfaState,verifyMfa,type CloudConfig,type Session} from '../lib/cloud';
import {
  MODULE_GROUPS,MODULE_LABELS,normalizePlatformState,type VexumModuleId
} from '../lib/platform';
import {buildSellNotifications,buildVexumNotifications,type VexumNotification} from '../lib/platformNotifications';
import {loadSellWorkspace} from '../lib/sellCloud';
import {
  CommandCenter,NotificationCenter,QuickAddPanel,type QuickAddType
} from './platform/VexumPlatformPanels';

type View=VexumModuleId|'settings';

const ACCOUNT_REQUIRED_VIEWS=new Set<View>(['sell','social']);

const ROUTES:Record<View,string>={
  home:'/',life:'/life',portfolio:'/portfolio',search:'/search',wishlist:'/wishlist',sell:'/sell',
  setup:'/setup',financial:'/financial',social:'/social',settings:'/settings'
};

function iconFor(module:VexumModuleId){
  if(module==='home')return <Home/>;
  if(module==='life')return <CalendarCheck/>;
  if(module==='portfolio')return <Layers3/>;
  if(module==='search')return <Search/>;
  if(module==='wishlist')return <Star/>;
  if(module==='sell')return <ShoppingBag/>;
  if(module==='setup')return <SlidersHorizontal/>;
  if(module==='financial')return <CircleDollarSign/>;
  return <Share2/>;
}

function viewFromPath(path:string):View{
  if(path.startsWith('/search'))return 'search';
  const first=path.split('/').filter(Boolean)[0];
  if(first&&['life','portfolio','wishlist','sell','setup','financial','social','settings'].includes(first))return first as View;
  return 'home';
}

function Logo(){return <button className="vx-logo vx-logo-button" onClick={()=>location.assign('/')}><span className="vx-vmark">V</span><strong>VEXUM</strong></button>}

function Sidebar({view,navigate,enabled,order,displayName,onQuick}:{view:View;navigate:(view:View)=>void;enabled:VexumModuleId[];order:VexumModuleId[];displayName:string;onQuick:(type?:QuickAddType)=>void}){
  const ordered=order.filter(module=>enabled.includes(module));
  return <aside className="vx-sidebar vx-platform-sidebar">
    <Logo/>
    <div className="vxp-sidebar-scroll">
      {MODULE_GROUPS.map(group=>{
        const modules=ordered.filter(module=>group.modules.includes(module));
        if(!modules.length)return null;
        return <section className="vxp-nav-group" key={group.label}><span>{group.label}</span><nav className="vx-nav">{modules.map(module=><button key={module} className={view===module?'active':''} onClick={()=>navigate(module)}>{iconFor(module)}<span>{MODULE_LABELS[module]}</span></button>)}</nav></section>;
      })}
      <section className="vx-quick vxp-quick"><span>QUICK ADD</span><button className="primary" onClick={()=>onQuick()}><Plus/><span>Add Anything</span></button>{enabled.includes('life')?<button onClick={()=>onQuick('task')}><CalendarCheck/><span>Task</span></button>:null}{enabled.includes('search')?<button onClick={()=>onQuick('collectible')}><Search/><span>Collectible</span></button>:null}{enabled.includes('financial')?<button onClick={()=>onQuick('expense')}><CircleDollarSign/><span>Expense</span></button>:null}</section>
    </div>
    <button className="vx-user vxp-sidebar-user" onClick={()=>navigate('settings')}><div className="vx-avatar">{displayName[0]?.toUpperCase()||'V'}</div><div><strong>{displayName}</strong><span>VEXUM workspace</span></div><ChevronDown/></button>
  </aside>;
}

function Topbar({hero,displayName,unread,onCommand,onQuick,onNotifications,onProfile}:{hero:string;displayName:string;unread:number;onCommand:()=>void;onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void}){
  return <div className={'vx-topbar hero-'+hero}>
    <button className="vx-searchbox" onClick={onCommand}><Search/><span>Search VEXUM or run a command...</span><kbd>⌘ K</kbd></button>
    <div className="vx-topicons vxp-topicons">
      <button className="vxp-add" onClick={onQuick} title="Quick Add"><Plus/></button>
      <button className="vxp-bell" onClick={onNotifications} title="Notifications"><Bell/>{unread?<b>{unread>9?'9+':unread}</b>:null}</button>
      <button className="vx-top-avatar" onClick={onProfile} title={displayName}>{displayName[0]?.toUpperCase()||'V'}</button>
    </div>
  </div>;
}

function PageFrame({hero,children,displayName,unread,onCommand,onQuick,onNotifications,onProfile}:{hero:string;children:ReactNode;displayName:string;unread:number;onCommand:()=>void;onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void}){
  return <main className={'vx-content page-'+hero}><Topbar hero={hero} displayName={displayName} unread={unread} onCommand={onCommand} onQuick={onQuick} onNotifications={onNotifications} onProfile={onProfile}/>{children}</main>;
}

function ProfileMenu({open,onClose,displayName,email,navigate,signOut,onAccount}:{open:boolean;onClose:()=>void;displayName:string;email:string;navigate:(v:View)=>void;signOut:()=>Promise<void>;onAccount:()=>void}){
  if(!open)return null;
  const go=(view:View)=>{onClose();navigate(view)};
  return <div className="vxp-profile-menu">
    <header><div className="avatar">{displayName[0]?.toUpperCase()||'V'}</div><span><strong>{displayName}</strong><small>{email||'Local workspace'}</small></span><button onClick={onClose}><X/></button></header>
    <button onClick={()=>go('settings')}><UserRound/><span>Profile</span><ChevronDown/></button>
    <button onClick={()=>go('settings')}><Settings/><span>Settings</span><ChevronDown/></button>
    <button onClick={()=>window.alert('The VEXUM Help Center is not connected yet.')}><HelpCircle/><span>Help</span><ChevronDown/></button>
    <button onClick={()=>window.alert('Feedback delivery is not configured yet.')}><MessageSquare/><span>Send Feedback</span><ChevronDown/></button>
    {email?<button className="danger" onClick={()=>void signOut()}><LogOut/><span>Sign Out</span></button>:<button className="danger" onClick={()=>{onClose();onAccount()}}><UserRound/><span>Create or Sign In to Account</span></button>}
  </div>;
}

function MfaSessionGate({config,session,onVerified,onSignOut}:{config:CloudConfig|null;session:Session|null;onVerified:()=>void;onSignOut:()=>Promise<void>}){
  const [required,setRequired]=useState(false);const [factorId,setFactorId]=useState('');const [challengeId,setChallengeId]=useState('');const [code,setCode]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [checked,setChecked]=useState(false);
  useEffect(()=>{
    if(!config?.configured||!session){setChecked(true);setRequired(false);return}
    let alive=true;
    (async()=>{try{const state=await mfaState(config);if(!alive)return;if(state.currentLevel==='aal1'&&state.nextLevel==='aal2'&&state.verified[0]){setRequired(true);setFactorId(state.verified[0].id);const challenge=await challengeMfa(config,state.verified[0].id);if(alive)setChallengeId(challenge.id)}}catch(err){if(alive)setError(err instanceof Error?err.message:'Unable to check MFA.')}finally{if(alive)setChecked(true)}})();
    return()=>{alive=false};
  },[config?.configured,session?.user.id]);
  if(!checked||!required)return null;
  const verify=async()=>{if(!config||!factorId||!challengeId||code.length<6)return;setBusy(true);setError('');try{await verifyMfa(config,factorId,challengeId,code);setRequired(false);onVerified()}catch(err){setError(err instanceof Error?err.message:'Unable to verify MFA.')}finally{setBusy(false)}};
  return <div className="vxp-mfa-gate"><section><LockKeyhole/><span>SECURITY CHECK</span><h2>Verify your VEXUM account</h2><p>This account has multi-factor authentication enabled. Enter the code from your authenticator app before continuing.</p><label>Authenticator code<input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} onKeyDown={e=>{if(e.key==='Enter')void verify()}} placeholder="000000"/></label>{error?<div className="error">{error}</div>:null}<div><button onClick={()=>void onSignOut()}>Sign Out</button><button className="primary" disabled={busy||code.length<6} onClick={()=>void verify()}>{busy?'Verifying…':'Verify & Continue'}</button></div></section></div>;
}

export default function VexumApp({
  initialView='home',initialSearchQuery='',initialProductId=''
}:{
  initialView?:View;initialSearchQuery?:string;initialProductId?:string;
}){
  const workspace=useWorkspace();
  const [view,setView]=useState<View>(initialView);
  const [quickOpen,setQuickOpen]=useState(false);
  const [quickType,setQuickType]=useState<QuickAddType|undefined>();
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const [onboardingPending,setOnboardingPending]=useState(false);
  const [sellNotifications,setSellNotifications]=useState<VexumNotification[]>([]);

  const platform=normalizePlatformState(workspace.data.platform,true);
  const displayName=platform.identity.displayName||workspace.data.profile?.name||workspace.session?.user.email?.split('@')[0]||'VEXUM User';
  const enabled:VexumModuleId[]=platform.enabledModules.includes('home')?[...platform.enabledModules]:['home',...platform.enabledModules.filter(module=>module!=='home')];
  const notificationRows=useMemo(()=>[...buildVexumNotifications(workspace.data,platform),...sellNotifications],[workspace.data,platform,sellNotifications]);
  const readIds=new Set(platform.notifications.readIds);
  const unread=notificationRows.filter(row=>!readIds.has(row.id)).length;

  useEffect(()=>{
    if(!workspace.ready)return;
    try{setOnboardingPending(localStorage.getItem('vexum.onboarding.pending')==='1'||platform.onboardingComplete===false)}catch{setOnboardingPending(platform.onboardingComplete===false)}
  },[workspace.ready,platform.onboardingComplete]);
  useEffect(()=>{
    if(!platform.notifications.marketplace||!workspace.config?.configured||!workspace.session){setSellNotifications([]);return}
    let alive=true;
    loadSellWorkspace(workspace.config,workspace.session).then(data=>{if(alive)setSellNotifications(buildSellNotifications(data))}).catch(()=>{if(alive)setSellNotifications([])});
    return()=>{alive=false};
  },[platform.notifications.marketplace,workspace.config?.configured,workspace.session?.user.id]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setCommandOpen(true);setNotificationsOpen(false);setProfileOpen(false)}
      if(event.key==='Escape'){setCommandOpen(false);setQuickOpen(false);setNotificationsOpen(false);setProfileOpen(false)}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);

  useEffect(()=>{
    if(!workspace.ready||workspace.session||!ACCOUNT_REQUIRED_VIEWS.has(view))return;
    setAccountOpen(true);
  },[workspace.ready,workspace.session,view]);

  useEffect(()=>{
    const onPop=()=>setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  },[]);

  const navigate=(next:View)=>{
    setProfileOpen(false);setNotificationsOpen(false);
    if(!workspace.session&&ACCOUNT_REQUIRED_VIEWS.has(next)){setAccountOpen(true);return}
    setView(next);
    if(typeof window==='undefined')return;
    if(next==='search'&&window.location.pathname.startsWith('/search'))return;
    const path=ROUTES[next];
    if(window.location.pathname!==path)window.history.pushState({},'',path);
  };
  const openQuick=(type?:QuickAddType)=>{setQuickType(type);setQuickOpen(true);setProfileOpen(false);setNotificationsOpen(false);setCommandOpen(false)};
  const closeQuick=()=>{setQuickOpen(false);setQuickType(undefined)};
  const openCommand=()=>{setCommandOpen(true);setProfileOpen(false);setNotificationsOpen(false)};
  const openNotifications=()=>{setNotificationsOpen(v=>!v);setProfileOpen(false);setCommandOpen(false)};
  const openProfile=()=>{setNotificationsOpen(false);setCommandOpen(false);if(!workspace.session){setProfileOpen(false);setAccountOpen(true);return}setProfileOpen(v=>!v)};

  const frame=(hero:string,children:ReactNode)=><PageFrame hero={hero} displayName={displayName} unread={unread} onCommand={openCommand} onQuick={()=>openQuick()} onNotifications={openNotifications} onProfile={openProfile}>{children}</PageFrame>;

  let content:ReactNode=frame('home',<VexumHome onQuickAdd={()=>openQuick()}/>);
  if(view==='life')content=frame('life',<VexumLife/>);
  else if(view==='portfolio')content=frame('plain',<VexumPortfolio/>);
  else if(view==='search')content=frame('search',<VexumSearch initialQuery={initialSearchQuery} initialProductId={initialProductId}/>);
  else if(view==='wishlist')content=frame('wishlist',<VexumWishlist/>);
  else if(view==='sell')content=frame('sell',<VexumSell/>);
  else if(view==='setup')content=frame('setup',<VexumSetup/>);
  else if(view==='financial')content=frame('financial',<VexumFinancial/>);
  else if(view==='social')content=frame('social',<VexumSocial/>);
  else if(view==='settings')content=frame('plain',<VexumSettings/>);

  const rootClass=['vx-app','vxp-platform','density-'+platform.appearance.density,'text-'+platform.appearance.textSize,'motion-'+platform.appearance.motion,'glow-'+platform.appearance.glow,'sidebar-'+platform.appearance.sidebarWidth].join(' ');

  return <div className={rootClass}>
    <Sidebar view={view} navigate={navigate} enabled={enabled} order={platform.moduleOrder} displayName={displayName} onQuick={openQuick}/>
    {content}
    <QuickAddPanel key={quickType||'all'} open={quickOpen} initialType={quickType} onClose={closeQuick} workspace={workspace} navigate={navigate}/>
    <NotificationCenter open={notificationsOpen} onClose={()=>setNotificationsOpen(false)} workspace={workspace} navigate={navigate}/>
    <CommandCenter open={commandOpen} onClose={()=>setCommandOpen(false)} workspace={workspace} navigate={navigate} onQuickAdd={openQuick}/>
    <ProfileMenu open={profileOpen} onClose={()=>setProfileOpen(false)} displayName={displayName} email={workspace.session?.user.email||''} navigate={navigate} signOut={workspace.signOut} onAccount={()=>setAccountOpen(true)}/>
    {accountOpen?<CloudPanel authOnly={!workspace.session} config={workspace.config} session={workspace.session} status={workspace.status} error={workspace.error} needsMigration={workspace.needsMigration} conflict={workspace.conflict} busy={workspace.busy} pending={workspace.pending} close={()=>setAccountOpen(false)} migrate={workspace.migrate} refresh={workspace.refresh} signOut={async()=>{await workspace.signOut();setAccountOpen(false)}} retry={workspace.retry} backup={()=>{const blob=new Blob([JSON.stringify(workspace.data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vexum-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}} recovery={()=>{const data=workspace.recovery();if(!data){window.alert('No conflict recovery backup is available on this device.');return}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vexum-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}}/>:null}
    <MfaSessionGate config={workspace.config} session={workspace.session} onSignOut={workspace.signOut} onVerified={()=>workspace.update({...workspace.data,platform:{...platform,security:{...platform.security,mfaStatus:'verified',mfaMethod:'authenticator'}}})}/>
    {workspace.ready&&onboardingPending?<VexumOnboarding onComplete={()=>setOnboardingPending(false)}/>:null}
  </div>;
}

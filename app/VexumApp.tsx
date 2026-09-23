'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ReactNode} from 'react';
import {
  Bell,CalendarCheck,ChevronDown,CircleDollarSign,HelpCircle,Home,Layers3,LifeBuoy,LogOut,Palette,
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
import {OtpInput,VexumDialog,VexumInteractionHost,VexumToastHost,pushVexumToast} from './VexumUi';
import VexumOnboarding from './VexumOnboarding';
import CloudPanel from './CloudPanel';
import {useWorkspace} from '../lib/useWorkspace';
import {challengeMfa,enrollTotp,mfaQrImageSource,mfaState,verifyMfa,type CloudConfig,type MfaEnrollment,type Session} from '../lib/cloud';
import {
  MODULE_GROUPS,MODULE_LABELS,normalizePlatformState,type VexumModuleId
} from '../lib/platform';
import {buildSellNotifications,buildVexumNotifications,type VexumNotification} from '../lib/platformNotifications';
import {loadSellWorkspace} from '../lib/sellCloud';
import {
  CommandCenter,NotificationCenter,QuickAddPanel,type QuickAddType
} from './platform/VexumPlatformPanels';

type View=VexumModuleId|'settings';

// Cloud identity is required for networked commerce/community modules.
const ACCOUNT_REQUIRED_VIEWS=new Set<View>(['life','portfolio','wishlist','sell','setup','financial','social','settings']);

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

function Logo(){return <button className="vx-logo vx-logo-button" aria-label="Go to VEXUM home" onClick={()=>location.assign('/')}><span className="vx-vmark" aria-hidden="true">V</span><strong>VEXUM</strong></button>}

function Sidebar({view,navigate,enabled,order,displayName,onQuick}:{view:View;navigate:(view:View)=>void;enabled:VexumModuleId[];order:VexumModuleId[];displayName:string;onQuick:(type?:QuickAddType)=>void}){
  const ordered=order.filter(module=>enabled.includes(module));
  return <aside className="vx-sidebar vx-platform-sidebar" aria-label="Primary navigation">
    <Logo/>
    <div className="vxp-sidebar-scroll">
      {MODULE_GROUPS.map(group=>{
        const modules=ordered.filter(module=>group.modules.includes(module));
        if(!modules.length)return null;
        return <section className="vxp-nav-group" key={group.label}><span>{group.label}</span><nav className="vx-nav" aria-label={group.label}>{modules.map(module=><button key={module} className={view===module?'active':''} aria-current={view===module?'page':undefined} onClick={()=>navigate(module)}>{iconFor(module)}<span>{MODULE_LABELS[module]}</span></button>)}</nav></section>;
      })}
      <section className="vx-quick vxp-quick"><span>QUICK ADD</span><button className="primary" onClick={()=>onQuick()}><Plus/><span>Add Anything</span></button>{enabled.includes('life')?<button onClick={()=>onQuick('task')}><CalendarCheck/><span>Task</span></button>:null}{enabled.includes('search')?<button onClick={()=>onQuick('collectible')}><Search/><span>Collectible</span></button>:null}{enabled.includes('financial')?<button onClick={()=>onQuick('expense')}><CircleDollarSign/><span>Expense</span></button>:null}</section>
    </div>
    <button className="vx-user vxp-sidebar-user" aria-label="Open account settings" onClick={()=>navigate('settings')}><div className="vx-avatar">{displayName[0]?.toUpperCase()||'V'}</div><div><strong>{displayName}</strong><span>VEXUM workspace</span></div><ChevronDown/></button>
  </aside>;
}

function Topbar({hero,displayName,unread,onCommand,onQuick,onNotifications,onProfile}:{hero:string;displayName:string;unread:number;onCommand:()=>void;onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void}){
  return <header className={'vx-topbar hero-'+hero}>
    <button className="vx-searchbox" aria-label="Search VEXUM or run a command" onClick={onCommand}><Search/><span>Search VEXUM or run a command...</span><kbd aria-hidden="true">⌘ K</kbd></button>
    <div className="vx-topicons vxp-topicons">
      <button className="vxp-add" aria-label="Quick Add" onClick={onQuick} title="Quick Add"><Plus/></button>
      <button className="vxp-bell" aria-label={unread?'Notifications with unread items':'Notifications'} onClick={onNotifications} title="Notifications"><Bell/>{unread?<b aria-hidden="true">{unread>9?'9+':unread}</b>:null}</button>
      <button className="vx-top-avatar" aria-label="Open account menu" onClick={onProfile} title={displayName}>{displayName[0]?.toUpperCase()||'V'}</button>
    </div>
  </header>;
}

function PageFrame({hero,children,displayName,unread,onCommand,onQuick,onNotifications,onProfile}:{hero:string;children:ReactNode;displayName:string;unread:number;onCommand:()=>void;onQuick:()=>void;onNotifications:()=>void;onProfile:()=>void}){
  return <main id="vexum-main" tabIndex={-1} className={'vx-content page-'+hero}><Topbar hero={hero} displayName={displayName} unread={unread} onCommand={onCommand} onQuick={onQuick} onNotifications={onNotifications} onProfile={onProfile}/>{children}</main>;
}

function ProfileMenu({open,onClose,displayName,email,navigate,signOut,onAccount,onSettings}:{open:boolean;onClose:()=>void;displayName:string;email:string;navigate:(v:View)=>void;signOut:()=>Promise<void>;onAccount:()=>void;onSettings:(section?:'profile'|'appearance')=>void}){
  if(!open)return null;
  const go=(view:View)=>{onClose();navigate(view)};
  return <div className="vxp-profile-menu" role="region" aria-label="Account menu">
    <header><div className="avatar" aria-hidden="true">{displayName[0]?.toUpperCase()||'V'}</div><span><strong>{displayName}</strong><small>{email||'Local workspace'}</small></span><button aria-label="Close account menu" onClick={onClose}><X/></button></header>
    <button onClick={()=>{onClose();onSettings('profile')}}><UserRound/><span>Profile</span><ChevronDown/></button>
    <button onClick={()=>{onClose();onSettings()}}><Settings/><span>Settings</span><ChevronDown/></button>
    <button onClick={()=>{onClose();onSettings('appearance')}}><Palette/><span>Appearance</span><ChevronDown/></button>
    <button onClick={()=>{onClose();pushVexumToast({title:'Help Center is not connected yet.',message:'Support content will appear here once the Help Center is configured.',kind:'info'})}}><HelpCircle/><span>Help</span><ChevronDown/></button>
    <button onClick={()=>{onClose();pushVexumToast({title:'Feedback delivery is not configured yet.',message:'Your message was not sent.',kind:'warning'})}}><MessageSquare/><span>Send Feedback</span><ChevronDown/></button>
    {email?<button className="danger" onClick={()=>void signOut()}><LogOut/><span>Sign Out</span></button>:<button className="danger" onClick={()=>{onClose();onAccount()}}><UserRound/><span>Create or Sign In to Account</span></button>}
  </div>;
}

function MfaSessionGate({config,session,onVerified,onSignOut}:{config:CloudConfig|null;session:Session|null;onVerified:()=>void;onSignOut:()=>Promise<void>}){
  const [required,setRequired]=useState(false);
  const [mode,setMode]=useState<'challenge'|'enroll'>('challenge');
  const [factorId,setFactorId]=useState('');
  const [enrollment,setEnrollment]=useState<MfaEnrollment|null>(null);
  const [code,setCode]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [checked,setChecked]=useState(false);

  useEffect(()=>{
    if(!config?.configured||!session){setChecked(true);setRequired(false);return}
    let alive=true;
    (async()=>{
      try{
        let requiredUser='';
        let signupIntent=false;
        try{
          requiredUser=localStorage.getItem('vexum.mfa.requiredAfterSignupUser')||'';
          signupIntent=localStorage.getItem('vexum.mfa.signupIntent')==='1';
          if(!requiredUser&&signupIntent){
            requiredUser=session.user.id;
            localStorage.setItem('vexum.mfa.requiredAfterSignupUser',requiredUser);
            localStorage.removeItem('vexum.mfa.signupIntent');
          }
        }catch{}
        const signupMfaRequired=requiredUser===session.user.id;
        const state=await mfaState(config);
        if(!alive)return;

        if(state.currentLevel==='aal2'){
          if(signupMfaRequired){try{localStorage.removeItem('vexum.mfa.requiredAfterSignupUser')}catch{}}
          setRequired(false);
          return;
        }

        if(state.currentLevel==='aal1'&&state.nextLevel==='aal2'&&state.verified[0]){
          setMode('challenge');
          setRequired(true);
          setFactorId(state.verified[0].id);
          return;
        }

        if(signupMfaRequired){
          setMode('enroll');
          setRequired(true);
          const next=await enrollTotp(config,'VEXUM Authenticator');
          if(!alive)return;
          setEnrollment(next);
          setFactorId(next.id);
        }
      }catch(err){
        if(alive){setRequired(true);setError(err instanceof Error?err.message:'Unable to configure required 2FA.')}
      }finally{
        if(alive)setChecked(true);
      }
    })();
    return()=>{alive=false};
  },[config?.configured,session?.user.id]);

  if(!checked||!required)return null;

  const verify=async()=>{
    if(!config||!factorId||code.length<6)return;
    setBusy(true);setError('');
    try{
      const challenge=await challengeMfa(config,factorId);
      await verifyMfa(config,factorId,challenge.id,code);
      if(mode==='enroll'){
        try{localStorage.removeItem('vexum.mfa.requiredAfterSignupUser');localStorage.removeItem('vexum.mfa.signupIntent')}catch{}
      }
      setRequired(false);
      onVerified();
      pushVexumToast({title:mode==='enroll'?'Two-factor authentication enabled.':'Security check complete.',kind:'success'});
    }catch(err){
      setError(err instanceof Error?err.message:'Unable to verify MFA.');
    }finally{setBusy(false)}
  };

  const qrSrc=mfaQrImageSource(enrollment?.totp?.qr_code);
  return <VexumDialog open onClose={()=>{}} title={mode==='enroll'?'Set up 2FA to finish signup':'Verify your VEXUM account'} eyebrow={mode==='enroll'?'REQUIRED ACCOUNT SECURITY':'SECURITY CHECK'} description={mode==='enroll'?'VEXUM requires authenticator two-factor authentication for new accounts. Scan the QR code, then enter the six-digit code.':'Enter the six-digit code from your authenticator app before continuing.'} size="md" className="vxp-required-mfa-dialog" closeOnBackdrop={false} showClose={false} escapeCloses={false}
    footer={<><button className="vxui-button secondary" disabled={busy} onClick={()=>void onSignOut()}>Sign Out</button><button className="vxui-button primary" disabled={busy||code.length<6} onClick={()=>void verify()}>{busy?'Verifying…':mode==='enroll'?'Enable 2FA & Continue':'Verify & Continue'}</button></>}>
    {mode==='enroll'?<div className="vxp-mfa-flow">
      <ol><li>Open Google Authenticator, Microsoft Authenticator, Authy, 1Password, or another TOTP app.</li><li>Scan the QR code.</li><li>Enter the generated six-digit code.</li></ol>
      {qrSrc?<div className="vxp-mfa-qr"><img src={qrSrc} alt="VEXUM authenticator setup QR code"/></div>:null}
      {enrollment?.totp?.secret?<div className="vxp-mfa-manual"><small>Can't scan it? Enter this setup key manually:</small><code>{enrollment.totp.secret}</code></div>:null}
    </div>:null}
    <label className="vxp-otp-label">6-digit authenticator code<OtpInput value={code} onChange={setCode} disabled={busy}/></label>
    {error?<div className="vxp-mfa-inline-error" role="alert">{error}</div>:null}
  </VexumDialog>;
}
export default function VexumApp({
  initialView='home',initialSearchQuery='',initialProductId=''
}:{
  initialView?:View;initialSearchQuery?:string;initialProductId?:string;
}){
  const workspace=useWorkspace();
  const [view,setView]=useState<View>(initialView==='settings'?'home':initialView);
  const [settingsOpen,setSettingsOpen]=useState(initialView==='settings');
  const [settingsSection,setSettingsSection]=useState<'profile'|'appearance'|undefined>(undefined);
  const [quickOpen,setQuickOpen]=useState(false);
  const [quickType,setQuickType]=useState<QuickAddType|undefined>();
  const [notificationsOpen,setNotificationsOpen]=useState(false);
  const [commandOpen,setCommandOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const [authReason,setAuthReason]=useState('');
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
      if(event.key==='Escape'){setCommandOpen(false);setQuickOpen(false);setNotificationsOpen(false);setProfileOpen(false);setAccountOpen(false)}
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[]);

  useEffect(()=>{
    if(!workspace.ready||workspace.session||!ACCOUNT_REQUIRED_VIEWS.has(view))return;
    setAuthReason(MODULE_LABELS[view as VexumModuleId]||'this section');
    setAccountOpen(true);
  },[workspace.ready,workspace.session,view]);

  useEffect(()=>{
    if(!workspace.ready||!workspace.session)return;
    try{
      const destination=sessionStorage.getItem('vexum.auth.pendingDestination');
      if(!destination)return;
      sessionStorage.removeItem('vexum.auth.pendingDestination');
      const next=viewFromPath(destination);
      if(next==='settings'){
        setSettingsSection(undefined);
        setSettingsOpen(true);
      }else{
        setSettingsOpen(false);
        setView(next);
      }
      if(window.location.pathname!==destination)window.history.replaceState({},'',destination);
      setAccountOpen(false);setAuthReason('');
    }catch{}
  },[workspace.ready,workspace.session?.user.id]);

  useEffect(()=>{
    const onPop=()=>{
      const next=viewFromPath(window.location.pathname);
      if(next==='settings'){setSettingsOpen(true);return}
      setSettingsOpen(false);setSettingsSection(undefined);setView(next);
    };
    window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
  },[]);

  const openAuth=(reason='your account',destination?:string)=>{
    setProfileOpen(false);setNotificationsOpen(false);setCommandOpen(false);
    setAuthReason(reason);
    try{
      if(destination)sessionStorage.setItem('vexum.auth.pendingDestination',destination);
      else sessionStorage.removeItem('vexum.auth.pendingDestination');
    }catch{}
    setAccountOpen(true);
  };
  const closeAuth=()=>{
    try{sessionStorage.removeItem('vexum.auth.pendingDestination')}catch{}
    setAccountOpen(false);setAuthReason('');
  };
  const openSettings=(section?:'profile'|'appearance')=>{
    setProfileOpen(false);setNotificationsOpen(false);setCommandOpen(false);
    if(!workspace.session){openAuth('Settings','/settings');return}
    setSettingsSection(section);setSettingsOpen(true);
    if(typeof window!=='undefined'&&window.location.pathname!=='/settings')window.history.pushState({},'','/settings'+(section?'?section='+section:''));
  };
  const closeSettings=()=>{
    setSettingsOpen(false);setSettingsSection(undefined);
    if(typeof window!=='undefined'){
      const path=ROUTES[view];
      if(window.location.pathname!==path)window.history.pushState({},'',path);
    }
  };
  const navigate=(next:View)=>{
    setProfileOpen(false);setNotificationsOpen(false);
    if(next==='settings'){openSettings();return}
    if(!workspace.session&&ACCOUNT_REQUIRED_VIEWS.has(next)){
      openAuth(MODULE_LABELS[next as VexumModuleId]||'this section',ROUTES[next]);
      return
    }
    setSettingsOpen(false);setSettingsSection(undefined);setView(next);
    if(typeof window==='undefined')return;
    if(next==='search'&&window.location.pathname.startsWith('/search'))return;
    const path=ROUTES[next];
    if(window.location.pathname!==path)window.history.pushState({},'',path);
  };
  const openQuick=(type?:QuickAddType)=>{setQuickType(type);setQuickOpen(true);setProfileOpen(false);setNotificationsOpen(false);setCommandOpen(false)};
  const closeQuick=()=>{setQuickOpen(false);setQuickType(undefined)};
  const openCommand=()=>{setCommandOpen(true);setProfileOpen(false);setNotificationsOpen(false)};
  const openNotifications=()=>{if(!workspace.session){openAuth('your notifications');return}setNotificationsOpen(v=>!v);setProfileOpen(false);setCommandOpen(false)};
  const openProfile=()=>{setNotificationsOpen(false);setCommandOpen(false);if(!workspace.session){openAuth('your account');return}setProfileOpen(v=>!v)};

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


  const rootClass=['vx-app','vxp-platform','density-'+platform.appearance.density,'text-'+platform.appearance.textSize,'motion-'+platform.appearance.motion,'glow-'+platform.appearance.glow,'sidebar-'+platform.appearance.sidebarWidth].join(' ');

  return <div className={rootClass}>
    <a className="vx-skip-link" href="#vexum-main">Skip to main content</a>
    <Sidebar view={view} navigate={navigate} enabled={enabled} order={platform.moduleOrder} displayName={displayName} onQuick={openQuick}/>
    {content}
    <QuickAddPanel key={quickType||'all'} open={quickOpen} initialType={quickType} onClose={closeQuick} workspace={workspace} navigate={navigate}/>
    <NotificationCenter open={notificationsOpen} onClose={()=>setNotificationsOpen(false)} workspace={workspace} navigate={navigate}/>
    <CommandCenter open={commandOpen} onClose={()=>setCommandOpen(false)} workspace={workspace} navigate={navigate} onQuickAdd={openQuick}/>
    <ProfileMenu open={profileOpen} onClose={()=>setProfileOpen(false)} displayName={displayName} email={workspace.session?.user.email||''} navigate={navigate} signOut={workspace.signOut} onAccount={()=>openAuth('your account')} onSettings={openSettings}/>
    {settingsOpen?<VexumSettings modal onClose={closeSettings} initialSection={settingsSection}/>:null}
    {accountOpen?<CloudPanel authOnly={!workspace.session} authReason={authReason} config={workspace.config} session={workspace.session} status={workspace.status} error={workspace.error} needsMigration={workspace.needsMigration} conflict={workspace.conflict} busy={workspace.busy} pending={workspace.pending} close={closeAuth} migrate={workspace.migrate} refresh={workspace.refresh} signOut={async()=>{await workspace.signOut();setAccountOpen(false)}} retry={workspace.retry} backup={()=>{const blob=new Blob([JSON.stringify(workspace.data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vexum-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}} recovery={()=>{const data=workspace.recovery();if(!data){pushVexumToast({title:'No recovery backup found.',message:'This device does not currently have a conflict recovery backup.',kind:'warning'});return}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vexum-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}}/>:null}
    <MfaSessionGate config={workspace.config} session={workspace.session} onSignOut={workspace.signOut} onVerified={()=>workspace.update({...workspace.data,platform:{...platform,security:{...platform.security,mfaStatus:'verified',mfaMethod:'authenticator'}}})}/>
    {workspace.ready&&onboardingPending?<VexumOnboarding onComplete={()=>setOnboardingPending(false)}/>:null}
    <VexumInteractionHost/>
    <VexumToastHost/>
  </div>;
}

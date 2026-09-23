'use client';

import {useEffect,useMemo,useState} from 'react';
import {
  ArrowDown,ArrowUp,Bell,Check,ChevronRight,Cloud,Copy,CreditCard,Download,Eye,Globe2,GripVertical,HelpCircle,KeyRound,
  Languages,LayoutDashboard,Link2,LockKeyhole,LogOut,Palette,ReceiptText,RefreshCw,Shield,
  Trash2,UserRound,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {challengeMfa,enrollTotp,mfaQrImageSource,mfaState,signInPassword,unenrollMfa,updatePassword,verifyMfa,type CloudConfig,type MfaEnrollment,type MfaState,type Session} from '../lib/cloud';
import {
  ALL_LIFE_SECTIONS,ALL_MODULES,MODULE_GROUPS,MODULE_LABELS,normalizePlatformState,type LifeSectionId,type PlatformState,type VexumModuleId,type Visibility
} from '../lib/platform';
import VexumOnboarding from './VexumOnboarding';
import PlaidConnection from './PlaidConnection';
import {OtpInput,VexumConfirmDialog,VexumDialog,VexumPageSkeleton,pushVexumToast} from './VexumUi';

type Section='account'|'profile'|'security'|'appearance'|'modules'|'notifications'|'privacy'|'connections'|'cloud'|'region'|'payments'|'subscription'|'data'|'help';

const SECTIONS:Array<{id:Section;label:string;group:string;icon:React.ReactNode}>=[
  {id:'account',label:'Account',group:'ACCOUNT',icon:<UserRound/>},
  {id:'profile',label:'Profile',group:'ACCOUNT',icon:<UserRound/>},
  {id:'security',label:'Security',group:'ACCOUNT',icon:<LockKeyhole/>},
  {id:'appearance',label:'Appearance',group:'PERSONALIZATION',icon:<Palette/>},
  {id:'modules',label:'Modules & Sidebar',group:'PERSONALIZATION',icon:<LayoutDashboard/>},
  {id:'notifications',label:'Notifications',group:'PREFERENCES',icon:<Bell/>},
  {id:'privacy',label:'Privacy',group:'PREFERENCES',icon:<Eye/>},
  {id:'region',label:'Language & Region',group:'PREFERENCES',icon:<Languages/>},
  {id:'connections',label:'Connections',group:'CONNECTED SERVICES',icon:<Link2/>},
  {id:'cloud',label:'Cloud & Sync',group:'CONNECTED SERVICES',icon:<Cloud/>},
  {id:'payments',label:'Payment Methods',group:'BILLING',icon:<CreditCard/>},
  {id:'subscription',label:'Subscription',group:'BILLING',icon:<ReceiptText/>},
  {id:'data',label:'Data & Export',group:'DATA',icon:<Download/>},
  {id:'help',label:'Help',group:'SUPPORT',icon:<HelpCircle/>}
];

export default function VexumSettings({modal=false,onClose,initialSection}:{modal?:boolean;onClose?:()=>void;initialSection?:Section}={}){
  const workspace=useWorkspace();
  const platform=normalizePlatformState(workspace.data.platform,true);
  const [section,setSection]=useState<Section>(initialSection||'profile');
  const [onboarding,setOnboarding]=useState(false);
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    const requested=params.get('section');
    if(requested&&SECTIONS.some(item=>item.id===requested))setSection(requested as Section);
    const plaid=params.get('plaid');
    if(plaid==='connected')pushVexumToast({title:'Financial institution connected.',message:'Plaid data was synchronized successfully.',kind:'success'});
    if(plaid==='updated')pushVexumToast({title:'Financial institution updated.',message:'Access was refreshed and synchronized.',kind:'success'});
    if(requested||plaid)history.replaceState(null,'',location.pathname);
  },[]);
  const save=(next:PlatformState)=>{
    workspace.update({...workspace.data,platform:next});
    pushVexumToast({title:'Settings saved.',kind:'success',duration:2200});
  };
  const notify=(message:string)=>pushVexumToast({
    title:/fail|error|invalid|unable|couldn't|cannot/i.test(message)?'Action failed.':'Settings updated.',
    message,
    kind:/fail|error|invalid|unable|couldn't|cannot/i.test(message)?'error':'success'
  });

  const grouped=useMemo(()=>[...new Set(SECTIONS.map(item=>item.group))].map(group=>({group,items:SECTIONS.filter(item=>item.group===group)})),[]);

  if(!workspace.ready){
    const loading=<VexumPageSkeleton label="Loading Settings…"/>;
    return modal?<VexumDialog open onClose={onClose||(()=>{})} title="Settings" eyebrow="VEXUM" size="xl" className="vxt-settings-dialog">{loading}</VexumDialog>:<div className="vxt-page">{loading}</div>;
  }

  const settingsContent=<div className={'vxt-layout '+(modal?'modal':'')}>
    <aside className="vx-panel vxt-nav" aria-label="Settings sections">{grouped.map(group=><section key={group.group}><span>{group.group}</span>{group.items.map(item=><button key={item.id} aria-current={section===item.id?'page':undefined} className={section===item.id?'active':''} onClick={()=>setSection(item.id)}>{item.icon}<strong>{item.label}</strong><ChevronRight/></button>)}</section>)}</aside>
    <main className="vx-panel vxt-main">
      {section==='account'?<AccountSettings workspace={workspace}/>:null}
      {section==='profile'?<ProfileSettings platform={platform} onSave={save} email={workspace.session?.user.email||''}/>:null}
      {section==='security'?<SecuritySettings platform={platform} config={workspace.config} session={workspace.session} onSave={save} onMessage={notify}/>:null}
      {section==='appearance'?<AppearanceSettings platform={platform} onSave={save}/>:null}
      {section==='modules'?<ModuleSettings platform={platform} onSave={save} onOnboarding={()=>setOnboarding(true)}/>:null}
      {section==='notifications'?<NotificationSettings platform={platform} onSave={save}/>:null}
      {section==='privacy'?<PrivacySettings platform={platform} onSave={save}/>:null}
      {section==='connections'?<ConnectionSettings platform={platform} config={workspace.config} session={workspace.session} onSave={save} onMessage={notify}/>:null}
      {section==='cloud'?<CloudSettings workspace={workspace} platform={platform} onSave={save}/>:null}
      {section==='region'?<RegionSettings platform={platform} onSave={save}/>:null}
      {section==='payments'?<PaymentSettings/>:null}
      {section==='subscription'?<SubscriptionSettings/>:null}
      {section==='data'?<DataSettings workspace={workspace}/>:null}
      {section==='help'?<HelpSettings/>:null}
    </main>
  </div>;

  if(modal)return <>
    <VexumDialog open onClose={onClose||(()=>{})} title="Settings" eyebrow="YOUR VEXUM" description="Account, appearance, modules, notifications, privacy, connections, and data controls." size="xl" className="vxt-settings-dialog">{settingsContent}</VexumDialog>
    {onboarding?<VexumOnboarding embedded onCancel={()=>setOnboarding(false)} onComplete={()=>setOnboarding(false)}/>:null}
  </>;

  return <div className="vxt-page">
    <section className="vxt-title"><div><span>SETTINGS</span><h1>Your VEXUM</h1><p>Modules, security, appearance, notifications, privacy, connections, and data controls live in one place.</p></div><aside><strong>{workspace.status}</strong><span>{workspace.session?.user.email||'Local workspace'}</span></aside></section>
    {settingsContent}
    {onboarding?<VexumOnboarding embedded onCancel={()=>setOnboarding(false)} onComplete={()=>setOnboarding(false)}/>:null}
  </div>;
}

function SectionHead({title,subtitle}:{title:string;subtitle:string}){return <header className="vxt-section-head"><h2>{title}</h2><p>{subtitle}</p></header>}
function SettingRow({label,description,children}:{label:string;description:string;children:React.ReactNode}){return <div className="vxt-row"><div><strong>{label}</strong><span>{description}</span></div><div>{children}</div></div>}

function AccountSettings({workspace}:{workspace:ReturnType<typeof useWorkspace>}){
  return <><SectionHead title="Account" subtitle="Your signed-in VEXUM account and current session."/>
    <SettingRow label="Email" description="Primary cloud account identity."><span className="vxt-account-value">{workspace.session?.user.email||'Not signed in'}</span></SettingRow>
    <SettingRow label="Account Status" description={workspace.session?'Authenticated VEXUM account.':'Local workspace only.'}><span className={'vxt-status '+(workspace.session?'good':'warn')}>{workspace.session?'SIGNED IN':'LOCAL'}</span></SettingRow>
    <SettingRow label="Sign Out" description="End the VEXUM session on this device."><button onClick={()=>void workspace.signOut()}><LogOut/>Sign Out</button></SettingRow>
  </>;
}

function ProfileSettings({platform,onSave,email}:{platform:PlatformState;onSave:(p:PlatformState)=>void;email:string}){
  const [draft,setDraft]=useState(platform.identity);
  const patch=(key:keyof typeof draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  return <><SectionHead title="Profile" subtitle="Public profile imagery, bio, username, links, and visibility are edited from your avatar menu. These are account identity defaults."/>
    <div className="vxt-profile-card"><div className="avatar">{draft.displayName?.[0]?.toUpperCase()||'V'}</div><div><strong>{draft.displayName||'VEXUM User'}</strong><span>{email||'No cloud email'}</span></div></div>
    <div className="vxt-form grid"><label>Display Name<input value={draft.displayName} onChange={e=>patch('displayName',e.target.value)}/></label><label>Birthday<input type="date" value={draft.birthday} onChange={e=>patch('birthday',e.target.value)}/></label></div>
    <div className="vxt-inline-note"><UserRound/><span><strong>Full social profile</strong><small>Use the avatar in the app shell to edit your username, profile photo, banner, bio, links, region, and public modules.</small></span></div>
    <footer className="vxt-actions"><button className="primary" onClick={()=>onSave({...platform,identity:draft})}>Save Profile Defaults</button></footer>
  </>;
}

function SecuritySettings({platform,config,session,onSave,onMessage}:{platform:PlatformState;config:any;session:any;onSave:(p:PlatformState)=>void;onMessage:(m:string)=>void}){
  const [passwordOpen,setPasswordOpen]=useState(false);
  const [passwordStep,setPasswordStep]=useState<'verify'|'new'|'success'>('verify');
  const [currentPassword,setCurrentPassword]=useState('');const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);
  const [mfa,setMfa]=useState<MfaState|null>(null);const [mfaBusy,setMfaBusy]=useState(false);const [mfaError,setMfaError]=useState('');
  const [enrollment,setEnrollment]=useState<MfaEnrollment|null>(null);const [code,setCode]=useState('');
  const [factorToRemove,setFactorToRemove]=useState<{id:string;name:string}|null>(null);

  const syncMfa=async()=>{
    if(!config||!session){setMfa(null);return}
    setMfaBusy(true);setMfaError('');
    try{
      const state=await mfaState(config);setMfa(state);
      const status=state.currentLevel==='aal2'?'verified':state.verified.length?'pending':'not_configured';
      const method=state.verified.some(f=>f.factor_type==='totp')?'authenticator':state.verified.some(f=>f.factor_type==='phone')?'phone':undefined;
      if(platform.security.mfaStatus!==status||platform.security.mfaMethod!==method)onSave({...platform,security:{...platform.security,mfaStatus:status,mfaMethod:method}});
    }catch(err){setMfaError(err instanceof Error?err.message:'Unable to read MFA status.')}finally{setMfaBusy(false)}
  };
  useEffect(()=>{void syncMfa()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[Boolean(config),session?.user?.id]);

  const beginTotp=async()=>{
    if(!config||!session)return;
    setMfaBusy(true);setMfaError('');
    try{const next=await enrollTotp(config,'VEXUM Authenticator');setEnrollment(next);setCode('')}
    catch(err){setMfaError(err instanceof Error?err.message:'Unable to start authenticator enrollment.')}
    finally{setMfaBusy(false)}
  };
  const beginSessionChallenge=async()=>{
    if(!config||!mfa?.verified[0])return;
    const factor=mfa.verified[0];setEnrollment({id:factor.id,type:factor.factor_type||'totp',friendly_name:factor.friendly_name});setCode('');setMfaError('');
  };
  const closeMfaDialog=()=>{if(mfaBusy)return;setEnrollment(null);setCode('');setMfaError('')};
  const verify=async()=>{
    if(!config||!enrollment||code.length<6)return;
    setMfaBusy(true);setMfaError('');
    try{const challenge=await challengeMfa(config,enrollment.id);await verifyMfa(config,enrollment.id,challenge.id,code);setEnrollment(null);setCode('');await syncMfa();onMessage(enrollment.totp?'Two-factor authentication enabled and verified.':'Multi-factor authentication verified for this session.')}
    catch(err){setMfaError(err instanceof Error?err.message:'That code was not valid. Try again.')}
    finally{setMfaBusy(false)}
  };
  const removeFactor=async()=>{
    if(!config||!factorToRemove)return;setMfaBusy(true);setMfaError('');
    try{await unenrollMfa(config,factorToRemove.id);setFactorToRemove(null);await syncMfa();onMessage('MFA factor removed.')}
    catch(err){setMfaError(err instanceof Error?err.message:'Unable to remove MFA factor. Verify MFA on this session and try again.')}
    finally{setMfaBusy(false)}
  };
  const openPassword=()=>{setPasswordStep('verify');setCurrentPassword('');setPassword('');setConfirm('');setCode('');setMfaError('');setPasswordOpen(true)};
  const verifyPasswordIdentity=async()=>{
    if(!config||!session)return;
    setBusy(true);setMfaError('');
    try{
      if(mfa?.verified.length){
        if(code.length<6)throw new Error('Enter the six-digit code from your authenticator.');
        const factor=mfa.verified[0];const challenge=await challengeMfa(config,factor.id);await verifyMfa(config,factor.id,challenge.id,code);
      }else{
        if(!session.user.email||!currentPassword)throw new Error('Enter your current password to verify your identity.');
        await signInPassword(config,session.user.email,currentPassword);
      }
      setPasswordStep('new');setCode('');setCurrentPassword('');
    }catch(err){setMfaError(err instanceof Error?err.message:'Identity verification failed.')}
    finally{setBusy(false)}
  };
  const finishPassword=async()=>{
    if(!config||!session)return;
    if(password.length<8){setMfaError('Use at least 8 characters for your new password.');return}
    if(password!==confirm){setMfaError('The new passwords do not match.');return}
    setBusy(true);setMfaError('');
    try{await updatePassword(config,password);setPassword('');setConfirm('');setPasswordStep('success');onMessage('Password updated.')}
    catch(err){setMfaError(err instanceof Error?err.message:'Password update failed.')}
    finally{setBusy(false)}
  };

  return <><SectionHead title="Security" subtitle="Keep high-risk account changes behind explicit verification."/>
    <SettingRow label="Account" description={session?.user.email||'Local-only workspace'}><span className={'vxt-status '+(session?'good':'warn')}>{session?'SIGNED IN':'LOCAL'}</span></SettingRow>
    <SettingRow label="Change Password" description="Verify your identity first, then choose a new password."><button onClick={openPassword} disabled={!session}><KeyRound/>Change Password</button></SettingRow>
    <div className="vxt-security-block vxt-mfa"><header><LockKeyhole/><div><strong>Two-Factor Authentication</strong><span>Authenticator-app MFA is backed by Supabase Auth and gates external Financial connections.</span></div></header>
      {!session?<div className="vxt-provider-state"><span className="warn">SIGN IN REQUIRED</span><p>Sign in to configure MFA for your VEXUM account.</p></div>:<>
        <div className="vxt-mfa-summary"><span className={'vxt-status '+(mfa?.currentLevel==='aal2'?'good':mfa?.verified.length?'warn':'')}>{mfaBusy&&!enrollment?'CHECKING…':mfa?.currentLevel==='aal2'?'AAL2 VERIFIED':mfa?.verified.length?'VERIFICATION REQUIRED':'NOT CONFIGURED'}</span><p>{mfa?.verified.length?mfa.verified.length+' verified factor'+(mfa.verified.length===1?'':'s')+' on this account.':'No verified MFA factors are currently attached to this account.'}</p><button onClick={()=>void syncMfa()} disabled={mfaBusy}><RefreshCw/>Refresh</button></div>
        {mfa?.factors.map(factor=><div className="vxt-factor" key={factor.id}><span><strong>{factor.friendly_name||'MFA factor'}</strong><small>{factor.factor_type||'factor'} · {factor.status||'unknown'}</small></span><button onClick={()=>setFactorToRemove({id:factor.id,name:factor.friendly_name||'this MFA factor'})} disabled={mfaBusy}><Trash2/>Remove</button></div>)}
        <div className="vxt-mfa-actions">{!mfa?.verified.length?<button onClick={()=>void beginTotp()} disabled={mfaBusy}><LockKeyhole/>Set Up Authenticator App</button>:mfa.currentLevel!=='aal2'?<button onClick={()=>void beginSessionChallenge()} disabled={mfaBusy}><Shield/>Verify This Session</button>:<span className="vxt-status good"><Check/>SESSION PROTECTED</span>}</div>
        {mfaError&&!enrollment&&!passwordOpen?<p className="vxt-mfa-error" role="alert">{mfaError}</p>:null}
        <p className="vxt-security-note">Authenticator MFA is available now. Phone MFA depends on your Supabase phone-MFA configuration; VEXUM does not show unsupported methods as enabled.</p>
      </>}
    </div>
    <SettingRow label="Financial Security Gate" description="Require verified MFA before external financial-account connections."><Toggle checked={platform.security.requireMfaForExternalFinancial} onChange={checked=>onSave({...platform,security:{...platform.security,requireMfaForExternalFinancial:checked}})}/></SettingRow>
    <SettingRow label="Sessions" description="This client can see the current session only; all-session revocation is not configured."><span className="vxt-status">CURRENT DEVICE</span></SettingRow>

    <VexumDialog open={passwordOpen} onClose={()=>!busy&&setPasswordOpen(false)} title="Change Password" eyebrow={passwordStep==='verify'?'VERIFY IDENTITY':passwordStep==='new'?'NEW PASSWORD':'COMPLETE'} description={passwordStep==='verify'?'Confirm your current security method before changing the password.':passwordStep==='new'?'Choose a new password for this VEXUM account.':'Your password was updated.'} size="sm" closeOnBackdrop={!busy}
      footer={passwordStep==='success'?<button className="vxui-button primary" onClick={()=>setPasswordOpen(false)}>Done</button>:<><button className="vxui-button secondary" disabled={busy} onClick={()=>setPasswordOpen(false)}>Cancel</button><button className="vxui-button primary" disabled={busy} onClick={()=>void(passwordStep==='verify'?verifyPasswordIdentity():finishPassword())}>{busy?'Working…':passwordStep==='verify'?'Verify Identity':'Update Password'}</button></>}>
      {passwordStep==='verify'?<div className="vxt-password-flow">{mfa?.verified.length?<label>Authenticator code<OtpInput value={code} onChange={setCode} disabled={busy}/></label>:<label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} placeholder="Current password"/></label>}<small>{mfa?.verified.length?'Use the authenticator factor already attached to this account.':'VEXUM verifies the current password against your signed-in account; it is never logged or stored.'}</small></div>:null}
      {passwordStep==='new'?<div className="vxt-password-flow"><label>New password<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label><label>Confirm new password<input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password"/></label></div>:null}
      {passwordStep==='success'?<div className="vxt-password-success"><Check/><strong>Password updated</strong><span>Your current VEXUM account now uses the new password.</span></div>:null}
      {mfaError&&passwordOpen?<p className="vxt-mfa-error" role="alert">{mfaError}</p>:null}
    </VexumDialog>

    <VexumDialog open={Boolean(enrollment)} onClose={closeMfaDialog} title={enrollment?.totp?'Set up an Authenticator App':'Verify your session'} eyebrow="SECURE YOUR ACCOUNT" description={enrollment?.totp?'Scan the QR code, then enter the six-digit code generated by your authenticator app.':'Enter the current six-digit code from your authenticator app.'} size="md" className="vxt-mfa-dialog" closeOnBackdrop={!mfaBusy}
      footer={<><button className="vxui-button secondary" disabled={mfaBusy} onClick={closeMfaDialog}>Cancel</button><button className="vxui-button primary" disabled={mfaBusy||code.length<6} onClick={()=>void verify()}>{mfaBusy?'Verifying…':'Verify'}</button></>}>
      {enrollment?.totp?<div className="vxt-mfa-steps"><ol><li>Open your authenticator app.</li><li>Scan the QR code below.</li><li>Enter the generated six-digit code.</li></ol><div className="vxt-mfa-qr">{mfaQrImageSource(enrollment.totp.qr_code)?<img src={mfaQrImageSource(enrollment.totp.qr_code)} alt="Authenticator setup QR code"/>:null}</div>{enrollment.totp.secret?<div className="vxt-mfa-secret"><span>Can't scan?</span><small>Enter this setup key manually:</small><code>{enrollment.totp.secret}</code></div>:null}</div>:null}
      <label className="vxt-otp-label">6-digit verification code<OtpInput value={code} onChange={setCode} disabled={mfaBusy}/></label>
      {mfaError?<p className="vxt-mfa-error" role="alert">{mfaError}</p>:null}
    </VexumDialog>
    <VexumConfirmDialog open={Boolean(factorToRemove)} onClose={()=>setFactorToRemove(null)} onConfirm={removeFactor} title="Remove two-factor method?" description={'Remove '+(factorToRemove?.name||'this MFA factor')+' from your VEXUM account? You may lose access if it is your only working verification method.'} confirmLabel="Remove Method" danger busy={mfaBusy}/>
  </>;
}

function AppearanceSettings({platform,onSave}:{platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const a=platform.appearance;const patch=(key:keyof typeof a,value:any)=>onSave({...platform,appearance:{...a,[key]:value}});
  const accents=['#FF0000','#E11D48','#FF5A00','#7C3AED','#0070F3','#00A67E'];
  return <><SectionHead title="Appearance" subtitle="Changes apply immediately across the shared VEXUM interface."/>
    <SettingRow label="Theme" description="A designed dark or light VEXUM interface."><Segment value={a.theme} values={['dark','light']} onChange={value=>patch('theme',value)}/></SettingRow>
    <SettingRow label="Accent Color" description="Controls shared highlights, active navigation, focus rings, and glow."><div className="vxt-accent-picker">{accents.map(color=><button key={color} aria-label={'Use accent '+color} aria-pressed={a.accentColor===color} className={a.accentColor===color?'active':''} style={{background:color}} onClick={()=>patch('accentColor',color)}/>)}<label title="Custom accent"><input type="color" value={a.accentColor} onChange={e=>patch('accentColor',e.target.value.toUpperCase())}/><span>{a.accentColor}</span></label></div></SettingRow>
    <SettingRow label="Interface Density" description="Controls global spacing and information density."><Segment value={a.density} values={['compact','standard','comfortable']} onChange={value=>patch('density',value)}/></SettingRow>
    <SettingRow label="Text Size" description="Global text scaling for VEXUM surfaces."><Segment value={a.textSize} values={['small','medium','large']} onChange={value=>patch('textSize',value)}/></SettingRow>
    <SettingRow label="Reduced Motion" description="Reduce non-essential interface animation."><Toggle checked={a.motion==='reduced'} onChange={value=>patch('motion',value?'reduced':'full')}/></SettingRow>
    <SettingRow label="Glow Intensity" description="Accent glow strength without changing surface colors."><Segment value={a.glow} values={['off','subtle','standard']} onChange={value=>patch('glow',value)}/></SettingRow>
    <SettingRow label="Sidebar Width" description="Compact or standard navigation width."><Segment value={a.sidebarWidth} values={['compact','standard']} onChange={value=>patch('sidebarWidth',value)}/></SettingRow>
    <SettingRow label="Number Formatting" description="$12,481.32 or $12.5K."><Segment value={a.numberFormat} values={['full','compact']} onChange={value=>patch('numberFormat',value)}/></SettingRow>
    <footer className="vxt-actions"><button onClick={()=>onSave({...platform,appearance:{theme:'dark',accentColor:'#FF0000',density:'compact',textSize:'medium',motion:'full',glow:'subtle',sidebarWidth:'standard',numberFormat:'full'}})}><RefreshCw/>Reset Appearance</button></footer>
  </>;
}

function ModuleSettings({platform,onSave,onOnboarding}:{platform:PlatformState;onSave:(p:PlatformState)=>void;onOnboarding:()=>void}){
  const toggle=(module:VexumModuleId)=>{
    if(module==='home')return;
    const enabled=platform.enabledModules.includes(module);
    onSave({...platform,enabledModules:enabled?platform.enabledModules.filter(id=>id!==module):[...platform.enabledModules,module]});
  };
  const move=(module:VexumModuleId,direction:-1|1)=>{
    const list=[...platform.moduleOrder],index=list.indexOf(module),target=index+direction;if(index<0||target<0||target>=list.length)return;
    [list[index],list[target]]=[list[target],list[index]];onSave({...platform,moduleOrder:list});
  };
  const toggleLifeSection=(section:LifeSectionId)=>{
    const enabled=platform.lifeSections.includes(section);
    const next=enabled?platform.lifeSections.filter(item=>item!==section):ALL_LIFE_SECTIONS.filter(item=>item===section||platform.lifeSections.includes(item));
    onSave({...platform,lifeSections:next.length?next:['Today']});
  };
  return <><SectionHead title="Modules & Sidebar" subtitle="A user builds their version of VEXUM. Hide what you do not use and reorder what remains."/>
    <div className="vxt-module-list">{platform.moduleOrder.map((module,index)=><div key={module}><GripVertical/><Toggle checked={platform.enabledModules.includes(module)} disabled={module==='home'} onChange={()=>toggle(module)}/><span><strong>{MODULE_LABELS[module]}</strong><small>{MODULE_GROUPS.find(group=>group.modules.includes(module))?.label||'MODULE'}</small></span><div><button disabled={index===0} onClick={()=>move(module,-1)}><ArrowUp/></button><button disabled={index===platform.moduleOrder.length-1} onClick={()=>move(module,1)}><ArrowDown/></button></div></div>)}</div>
    {platform.enabledModules.includes('life')?<section className="vxt-life-sections"><header><strong>Life Sections</strong><span>Fitness is optional. Hide any Life surface you do not want in your workspace.</span></header><div>{ALL_LIFE_SECTIONS.map(section=><label key={section}><Toggle checked={platform.lifeSections.includes(section)} onChange={()=>toggleLifeSection(section)}/><span>{section}</span></label>)}</div></section>:null}
    <footer className="vxt-actions"><button onClick={()=>onSave({...platform,enabledModules:[...ALL_MODULES],moduleOrder:[...ALL_MODULES],lifeSections:[...ALL_LIFE_SECTIONS]})}><RefreshCw/>Reset Modules</button><button className="primary" onClick={onOnboarding}>Run Build Your VEXUM Again</button></footer>
  </>;
}

function WidgetSettings({platform,onSave}:{platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const presets=platform.widgetPresets;
  const [creating,setCreating]=useState(false);const [presetName,setPresetName]=useState('Daily');const [presetPage,setPresetPage]=useState('home');
  const createPreset=()=>setCreating(true);
  const savePreset=()=>{const name=presetName.trim();const page=presetPage.trim()||'home';if(!name)return;const widgets=platform.dashboardLayouts[page]||[];const now=new Date().toISOString();onSave({...platform,widgetPresets:[...presets,{id:'preset_'+Date.now().toString(36),name,page,widgets:widgets.map(w=>({...w,config:{...w.config}})),createdAt:now,updatedAt:now}]});setCreating(false);setPresetName('Daily');setPresetPage('home')};
  return <><SectionHead title="Widgets" subtitle="Home already has a live widget editor. This platform registry gives other dashboard pages the same saved-layout foundation."/>
    <SettingRow label="Home Widgets" description="Managed directly from Home → Edit Widgets."><span className="vxt-status good">ACTIVE</span></SettingRow>
    <SettingRow label="Life Today Widgets" description="Life data is modular; layout registry is available for future drag/resize tuning."><span className="vxt-status good">REGISTERED</span></SettingRow>
    <div className="vxt-preset-list"><header><strong>Layout Presets</strong><button onClick={createPreset}>+ Save Current Layout</button></header>{presets.map(preset=><div key={preset.id}><span><strong>{preset.name}</strong><small>{preset.page} · {preset.widgets.length} widgets</small></span><button aria-label={'Delete '+preset.name+' preset'} onClick={()=>onSave({...platform,widgetPresets:presets.filter(p=>p.id!==preset.id)})}><Trash2/></button></div>)}{!presets.length?<p>No presets yet. Home remains fully editable without presets.</p>:null}</div>
    <VexumDialog open={creating} onClose={()=>setCreating(false)} title="Save layout preset" eyebrow="WIDGETS" description="Name this preset and choose the page layout to capture." size="sm" footer={<><button className="vxui-button secondary" onClick={()=>setCreating(false)}>Cancel</button><button className="vxui-button primary" disabled={!presetName.trim()} onClick={savePreset}>Save Preset</button></>}>
      <div className="vxt-preset-form"><label>Preset name<input autoFocus value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Daily"/></label><label>Page key<input value={presetPage} onChange={e=>setPresetPage(e.target.value)} placeholder="home"/></label></div>
    </VexumDialog>
  </>;
}

function NotificationSettings({platform,onSave}:{platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const n=platform.notifications;const patch=(key:keyof typeof n,value:any)=>onSave({...platform,notifications:{...n,[key]:value}});
  return <><SectionHead title="Notifications" subtitle="Choose what can interrupt you and define quiet hours."/>
    <SettingRow label="Push" description="In-app/browser notification preference."><Toggle checked={n.push} onChange={value=>patch('push',value)}/></SettingRow>
    <SettingRow label="Email" description="Email preference; delivery backend is not configured yet."><Toggle checked={n.email} onChange={value=>patch('email',value)}/></SettingRow>
    {([['taskReminders','Task Reminders'],['radar','Radar'],['marketplace','Marketplace'],['financial','Financial'],['social','Social']] as const).map(([key,label])=><SettingRow key={key} label={label} description={'Allow '+label.toLowerCase()+' notifications.'}><Toggle checked={n[key]} onChange={value=>patch(key,value)}/></SettingRow>)}
    <div className="vxt-quiet"><header><div><strong>Quiet Hours</strong><span>Exceptions can remain urgent.</span></div><Toggle checked={n.quietHours.enabled} onChange={enabled=>patch('quietHours',{...n.quietHours,enabled})}/></header><div><label>Start<input type="time" value={n.quietHours.start} onChange={e=>patch('quietHours',{...n.quietHours,start:e.target.value})}/></label><label>End<input type="time" value={n.quietHours.end} onChange={e=>patch('quietHours',{...n.quietHours,end:e.target.value})}/></label></div><p>Urgent exceptions: {n.quietHours.urgentCategories.join(', ')||'None'}</p></div>
  </>;
}

function PrivacySettings({platform,onSave}:{platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const p=platform.privacy;const patch=(key:keyof typeof p,value:Visibility)=>onSave({...platform,privacy:{...p,[key]:value}});
  return <><SectionHead title="Privacy" subtitle="Visibility defaults stay private unless you explicitly broaden them."/>
    {([['profile','Profile'],['collections','Collections'],['wishlist','Wishlist'],['setup','Setup'],['activity','Activity']] as const).map(([key,label])=><SettingRow key={key} label={label} description={'Default '+label.toLowerCase()+' visibility.'}><select value={p[key]} onChange={e=>patch(key,e.target.value as Visibility)}><option>Private</option><option>Friends</option><option>Community</option><option>Public</option></select></SettingRow>)}
  </>;
}

function ConnectionSettings({platform,config,session,onSave,onMessage}:{platform:PlatformState;config:CloudConfig|null;session:Session|null;onSave:(p:PlatformState)=>void;onMessage:(message:string)=>void}){
  return <><SectionHead title="Connected Apps" subtitle="Connections are shown honestly. Unsupported providers never appear connected."/>
    <PlaidConnection config={config} session={session} platform={platform} onSave={onSave} onMessage={onMessage}/>
    <div className="vxt-connection"><div><span className="icon"><Globe2/></span><span><strong>Calendar Connections</strong><small>Google, Apple, and Outlook calendar sync.</small></span></div><aside><span className="vxt-status warn">NOT CONNECTED</span><button disabled>Connect Calendar</button></aside><footer><p>No external calendar provider is configured yet. Life Calendar uses VEXUM-native events.</p></footer></div>
    <div className="vxt-connection"><div><span className="icon"><Link2/></span><span><strong>Marketplaces</strong><small>Sell owns marketplace connection state.</small></span></div><aside><button onClick={()=>location.assign('/sell')}>Open Sell</button></aside></div>
  </>;
}
function CloudSettings({workspace,platform,onSave}:{workspace:ReturnType<typeof useWorkspace>;platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const enabled=platform.cloudSyncEnabled;
  const status=!enabled?'OFF':workspace.pending?'SYNCING':workspace.error?'ISSUE':workspace.status.toLowerCase().includes('sync')?'SYNCED':'READY';
  const tone=!enabled?'':workspace.error?'warn':'good';
  return <><SectionHead title="Cloud & Sync" subtitle="Keep VEXUM data synchronized across your signed-in devices. Cloud Sync is on by default."/>
    <SettingRow label="Cloud Sync" description={enabled?'Changes are eligible to sync to your VEXUM cloud workspace.':'Changes stay on this device until you turn Cloud Sync back on.'}><Toggle checked={enabled} onChange={checked=>onSave({...platform,cloudSyncEnabled:checked})}/></SettingRow>
    <SettingRow label="Status" description={enabled?(workspace.error?'VEXUM kept your local edits. Retry when the connection is healthy.':workspace.status):'Cloud data is not being read or written while this setting is off.'}><span className={'vxt-status '+tone}>{status}</span></SettingRow>
    {enabled&&workspace.error?<SettingRow label="Retry Sync" description="Retry the existing cloud connection without deleting local changes."><button onClick={workspace.retry}><RefreshCw/>Retry</button></SettingRow>:null}
    <div className="vxt-inline-note"><Cloud/><span><strong>Local safety remains active</strong><small>Turning sync off does not delete cloud or local data. Revision/conflict protection resumes when sync is re-enabled.</small></span></div>
  </>;
}

function RegionSettings({platform,onSave}:{platform:PlatformState;onSave:(p:PlatformState)=>void}){
  const [draft,setDraft]=useState(platform.identity);
  const patch=(key:keyof typeof draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  return <><SectionHead title="Language & Region" subtitle="Formatting defaults used throughout VEXUM."/>
    <div className="vxt-form grid"><label>Language<select value={draft.language} onChange={e=>patch('language',e.target.value)}><option>English</option><option>Spanish</option><option>French</option><option>German</option><option>Japanese</option></select></label><label>Country / Region<select value={draft.country} onChange={e=>patch('country',e.target.value)}><option>United States</option><option>Canada</option><option>United Kingdom</option><option>Australia</option><option>Other</option></select></label><label>Currency<select value={draft.currency} onChange={e=>patch('currency',e.target.value)}><option>USD</option><option>CAD</option><option>GBP</option><option>EUR</option><option>AUD</option></select></label></div>
    <footer className="vxt-actions"><button className="primary" onClick={()=>onSave({...platform,identity:draft})}>Save Region Settings</button></footer>
  </>;
}

function PaymentSettings(){
  return <><SectionHead title="Payment Methods" subtitle="Payment methods will be used for VEXUM subscription and marketplace flows only after a payment processor is connected."/>
    <div className="vxt-empty-service"><CreditCard/><strong>No payment processor configured</strong><p>VEXUM does not store raw card numbers. Payment methods will appear here only after a supported processor is integrated.</p><button disabled>Add Payment Method</button></div>
  </>;
}
function SubscriptionSettings(){
  return <><SectionHead title="Subscription" subtitle="Plan and billing controls will reflect the real VEXUM billing provider when one is connected."/>
    <div className="vxt-empty-service"><ReceiptText/><strong>Billing is not connected yet</strong><p>No plan, renewal date, invoice, upgrade, downgrade, or cancellation state is fabricated in this interface.</p><span className="vxt-status">NOT CONFIGURED</span></div>
  </>;
}
function HelpSettings(){
  const copy=()=>{navigator.clipboard?.writeText('https://www.vexum.app');pushVexumToast({title:'VEXUM URL copied.',kind:'success'})};
  return <><SectionHead title="Help" subtitle="Support and product information without exposing internal implementation details."/>
    <SettingRow label="VEXUM Website" description="Copy the current VEXUM web address."><button onClick={copy}><Copy/>Copy URL</button></SettingRow>
    <SettingRow label="Help Center" description="A dedicated support knowledge base is not connected yet."><span className="vxt-status">COMING LATER</span></SettingRow>
    <SettingRow label="App Version" description="Current production generation."><span className="vxt-status">WEB</span></SettingRow>
  </>;
}

function DataSettings({workspace}:{workspace:ReturnType<typeof useWorkspace>}){
  const exportWorkspace=()=>{const blob=new Blob([JSON.stringify(workspace.data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vexum-workspace-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url)};
  return <><SectionHead title="Data & Export" subtitle="Your data should be portable. Destructive cloud-account deletion is not exposed without a verified backend endpoint."/>
    <SettingRow label="Export Workspace" description="Download the current synced VEXUM workspace as JSON."><button onClick={exportWorkspace}><Download/>Export JSON</button></SettingRow>
    <SettingRow label="Backups" description="The existing conflict/recovery system preserves local safety copies when cloud revisions conflict."><span className="vxt-status good">ENABLED</span></SettingRow>
    <SettingRow label="Delete Account" description="Requires server-side auth deletion. This deployment does not expose an unsafe client-side delete endpoint."><button disabled className="danger"><Trash2/>Unavailable</button></SettingRow>
    <SettingRow label="Sign Out" description="Ends the current VEXUM auth session on this device."><button onClick={()=>void workspace.signOut()}><LogOut/>Sign Out</button></SettingRow>
  </>;
}

function Toggle({checked,onChange,disabled=false}:{checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean}){return <button type="button" role="switch" aria-checked={checked} className={'vxt-toggle '+(checked?'on':'')} disabled={disabled} onClick={()=>onChange(!checked)}><i aria-hidden="true"/></button>}
function Segment({value,values,onChange}:{value:string;values:string[];onChange:(v:string)=>void}){return <div className="vxt-segment" role="group">{values.map(v=><button type="button" aria-pressed={value===v} className={value===v?'active':''} key={v} onClick={()=>onChange(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div>}

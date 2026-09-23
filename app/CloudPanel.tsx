'use client';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {X,Cloud,RefreshCw,Download,LogOut,LockKeyhole,Smartphone,Eye,EyeOff,KeyRound,Mail} from 'lucide-react';
import {CloudConfig,Session,authCapabilities,signInPassword,signUpPassword,sendPasswordReset,startOAuth,updatePassword} from '../lib/cloud';

export default function CloudPanel({authOnly=false,authReason='',config,session,status,error,needsMigration,conflict,busy,pending,close,migrate,refresh,signOut,retry,backup,recovery}:{authOnly?:boolean;authReason?:string;config:CloudConfig|null;session:Session|null;status:string;error:string;needsMigration:boolean;conflict:boolean;busy:boolean;pending:boolean;close:()=>void;migrate:(local:boolean)=>Promise<void>;refresh:()=>Promise<void>;signOut:()=>Promise<void>;retry:()=>void;backup:()=>void;recovery:()=>void}){
  const [sending,setSending]=useState(false),[message,setMessage]=useState(''),[create,setCreate]=useState(false),[showPassword,setShowPassword]=useState(false),[resetMode,setResetMode]=useState(false),[recoveryMode,setRecoveryMode]=useState(Boolean(session?.recovery)),[portalReady,setPortalReady]=useState(false);
  const [providers,setProviders]=useState({google:false,apple:false,phone:false});
  const firstInput=useRef<HTMLInputElement|null>(null);
  useEffect(()=>setPortalReady(true),[]);
  useEffect(()=>{if(!portalReady)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous}},[portalReady]);
  useEffect(()=>{if(!portalReady)return;const id=requestAnimationFrame(()=>firstInput.current?.focus());return()=>cancelAnimationFrame(id)},[portalReady,create,resetMode]);
  useEffect(()=>{if(!config?.configured||session)return;let alive=true;authCapabilities(config).then(value=>{if(alive)setProviders(value)}).catch(()=>{});return()=>{alive=false}},[config?.configured,session]);

  async function authenticate(form:HTMLFormElement){
    const values=new FormData(form);
    const email=String(values.get('email')||'').trim();
    const password=String(values.get('password')||'');
    const confirmPassword=String(values.get('confirmPassword')||'');
    if(create&&password!==confirmPassword){setMessage('Passwords do not match.');return}
    setSending(true);setMessage('');
    try{
      if(create){
        try{localStorage.setItem('vexum.mfa.signupIntent','1')}catch{}
        const result=await signUpPassword(config!,email,password);
        if(result.user?.identities&&Array.isArray(result.user.identities)&&result.user.identities.length===0){
          try{localStorage.removeItem('vexum.mfa.signupIntent');localStorage.removeItem('vexum.mfa.requiredAfterSignupUser')}catch{}
          setMessage('This email already has a VEXUM account. Sign in instead.');
          setCreate(false);
          return;
        }
        if(result.user?.id){
          try{localStorage.setItem('vexum.mfa.requiredAfterSignupUser',result.user.id);localStorage.removeItem('vexum.mfa.signupIntent')}catch{}
        }
        try{localStorage.setItem('vexum.onboarding.pending','1')}catch{}
        if(result.session){location.reload();return}
        setMessage('Account created. Confirm your email if prompted, then sign in. VEXUM will require authenticator 2FA before onboarding continues.');
        setCreate(false);
      }else{
        await signInPassword(config!,email,password);
        location.reload();
      }
    }catch(err){if(create){try{localStorage.removeItem('vexum.mfa.signupIntent');localStorage.removeItem('vexum.mfa.requiredAfterSignupUser')}catch{}}setMessage(err instanceof Error?err.message:'Unable to sign in.')}finally{setSending(false)}
  }

  function beginSocialAuth(provider:'google'|'apple'){
    if(create){try{localStorage.setItem('vexum.mfa.signupIntent','1')}catch{}}
    startOAuth(config!,provider);
  }

  async function requestReset(form:HTMLFormElement){
    const email=String(new FormData(form).get('email')||'').trim();
    setSending(true);setMessage('');
    try{await sendPasswordReset(config!,email);setMessage('Password reset email sent. Open it on this device to continue.')}
    catch(err){setMessage(err instanceof Error?err.message:'Unable to send password reset email.')}
    finally{setSending(false)}
  }

  async function saveNewPassword(form:HTMLFormElement){
    const values=new FormData(form),password=String(values.get('password')||''),confirm=String(values.get('confirmPassword')||'');
    if(password!==confirm){setMessage('Passwords do not match.');return}
    setSending(true);setMessage('');
    try{await updatePassword(config!,password);setMessage('Password updated. Your VEXUM account is ready.');setRecoveryMode(false);setCreate(false);setResetMode(false);setTimeout(()=>location.reload(),700)}
    catch(err){setMessage(err instanceof Error?err.message:'Unable to update password.')}
    finally{setSending(false)}
  }

  const authView=authOnly&&!session;
  const authDescription=authReason
    ? `Sign in to access ${authReason}. Your VEXUM data stays synced across your devices.`
    : 'Sign in to keep your VEXUM data synced across your devices.';

  const modal=<div className={"overlay cloud-overlay"+(authView?" auth-overlay":"")} onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
    <section className={"modal cloud-panel"+(authView?" auth-modal":"")} role="dialog" aria-modal="true" aria-labelledby="vexum-auth-title" onMouseDown={e=>e.stopPropagation()}>
      <div className={"modal-header"+(authView?" auth-modal-header":"")}>
        <h2>{authView?<><span className="auth-vmark">V</span><span>VEXUM</span></>:<><Cloud size={19}/> Account & sync</>}</h2>
        <button aria-label="Close account" onClick={close}><X/></button>
      </div>
      <div className="cloud-body">
        {!authView?<div className="cloud-status">{status}</div>:null}
        {error&&<p role="alert" className="market-message">{error}</p>}
        {!config?.configured?<><h3>Cloud setup is not connected yet</h3><p>VEXUM needs its Supabase project connection before account sign-in can work. Your local data remains on this device.</p></>
        :recoveryMode&&session?<form onSubmit={async e=>{e.preventDefault();await saveNewPassword(e.currentTarget)}}>
          <h3>Set a new password</h3><p>Choose the password you want to use for VEXUM.</p>
          <label>New password<div className="password-field"><input ref={firstInput} name="password" type={showPassword?'text':'password'} autoComplete="new-password" minLength={6} required/><button type="button" className="password-toggle" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
          <label>Confirm password<input name="confirmPassword" type={showPassword?'text':'password'} autoComplete="new-password" minLength={6} required/></label>
          <button className="primary auth-submit" disabled={sending}><KeyRound size={15}/> {sending?'Saving…':'Save new password'}</button>{message&&<p role="status" className="auth-message">{message}</p>}
        </form>
        :!session&&resetMode?<form className="auth-form auth-reset" onSubmit={async e=>{e.preventDefault();await requestReset(e.currentTarget)}}>
          <div className="auth-symbol"><KeyRound/></div><div className="auth-intro"><h3 id="vexum-auth-title">Reset password</h3><p>Enter your email and VEXUM will send you a recovery link.</p></div>
          <label className="auth-field"><span><Mail/> Email</span><input ref={firstInput} name="email" type="email" autoComplete="email" required placeholder="Email"/></label>
          <button className="primary auth-submit" disabled={sending}>{sending?'Sending…':'Send reset link'}</button>
          <button type="button" className="text-button auth-switch" onClick={()=>{setResetMode(false);setMessage('')}}>Back to sign in</button>{message&&<p role="status" className="auth-message">{message}</p>}
        </form>
        :!session?<form className="auth-form" onSubmit={async e=>{e.preventDefault();await authenticate(e.currentTarget)}}>
          <div className="auth-symbol"><LockKeyhole/></div>
          <div className="auth-intro">
            <h3 id="vexum-auth-title">{create?'Create your account':'Sign in with email'}</h3>
            <p>{create?'Create one VEXUM account for your collections, life, money, and settings.':authDescription}</p>
          </div>
          <label className="auth-field"><span><Mail/> Email</span><input ref={firstInput} name="email" type="email" autoComplete="email" required placeholder="Email"/></label>
          <label className="auth-field"><span><LockKeyhole/> Password</span><div className="password-field"><input name="password" type={showPassword?'text':'password'} autoComplete={create?'new-password':'current-password'} minLength={6} required placeholder="Password"/><button type="button" className="password-toggle" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={15}/>:<Eye size={15}/>}</button></div></label>
          {create?<label className="auth-field"><span><LockKeyhole/> Confirm password</span><input name="confirmPassword" type={showPassword?'text':'password'} autoComplete="new-password" minLength={6} required placeholder="Confirm password"/></label>:null}
          {!create?<div className="auth-form-meta"><span/><button type="button" onClick={()=>{setResetMode(true);setMessage('')}}>Forgot password?</button></div>:null}
          <button className="primary auth-submit auth-main-submit" disabled={sending}>{sending?'Working…':create?'Create Account':'Get Started'}</button>
          <div className="auth-divider"><span>{create?'or sign up with':'or sign in with'}</span></div>
          <div className="auth-provider-row">
            <button type="button" className="auth-provider-icon-button google" aria-label="Sign in with Google" disabled={!providers.google||sending} title={providers.google?'Sign in with Google':'Google sign-in is not enabled yet'} onClick={()=>beginSocialAuth('google')}><span aria-hidden="true">G</span></button>
            <button type="button" className="auth-provider-icon-button apple" aria-label="Sign in with Apple" disabled={!providers.apple||sending} title={providers.apple?'Sign in with Apple':'Apple sign-in is not enabled yet'} onClick={()=>beginSocialAuth('apple')}><span aria-hidden="true"></span></button>
          </div>
          <div className="auth-account-switch">{create?'Already have an account?':'New to VEXUM?'} <button type="button" onClick={()=>{setCreate(!create);setResetMode(false);setMessage('')}}>{create?'Sign in':'Create account'}</button></div>
          {(!providers.google||!providers.apple)?<p className="auth-provider-note">Social sign-in activates automatically when its Supabase provider is configured.</p>:null}
          {message&&<p role="status" className="auth-message">{message}</p>}
        </form>
        :<><p className="account-email">{session.user.email||'Signed in'}</p><p className="sync-explainer"><b>Cloud connected.</b> Edits upload automatically and this device checks for newer cloud changes every 30 seconds.</p>{needsMigration?<div className="migration-box"><h3>Finishing cloud setup</h3><p>Your local collection can be copied into the cloud now.</p><button className="primary" disabled={busy} onClick={()=>migrate(true)}>Copy this device’s collection</button></div>:<><button className="secondary" disabled={busy||status==='Syncing…'} onClick={async()=>{if(pending&&!confirm('Load the latest cloud version? Your current edits will be kept in a local recovery backup.'))return;await refresh()}}><RefreshCw size={14}/> {busy?'Loading…':'Load latest cloud version'}</button>{pending&&!conflict&&<button className="text-button" disabled={busy} onClick={retry}>Retry sync</button>}{conflict&&<p>Download your edits as a backup before loading the cloud version.</p>}</>}<button className="secondary backup-button" onClick={backup}><Download size={14}/> Download collection backup</button><button className="text-button" onClick={recovery}>Download latest conflict recovery</button><button className="text-button" disabled={busy||status==='Syncing…'} onClick={signOut}><LogOut size={14}/> Sign out on this device</button></>}
        {!authView?<div className="iphone-tip"><Smartphone size={17}/><div><b>Use on iPhone</b><p>Open the same VEXUM address in Safari, sign in with the same email and password, then Share → Add to Home Screen.</p></div></div>:null}
      </div>
    </section>
  </div>;

  return portalReady?createPortal(modal,document.body):null;
}

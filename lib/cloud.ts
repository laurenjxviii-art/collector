import {Store,validStore} from './model';
export type CloudConfig={url:string;key:string;configured:boolean};
export type Session={access_token:string;refresh_token:string;expires_at:number;user:{id:string;email?:string};recovery?:boolean};
const SESSION='collector.auth.session';
let current:Session|null=null;
let refreshing:Promise<Session>|null=null;
export class CloudConflict extends Error{constructor(){super('Another device changed your collection. Your edits are kept here. Download a backup, then load the latest cloud version.')}}
async function request(config:CloudConfig,path:string,options:RequestInit={},token?:string){const r=await fetch(config.url+path,{...options,headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers},cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok){if(r.status===409)throw new CloudConflict();const error=await r.json().catch(()=>({}));if(r.status===401)throw new Error('Your sign-in expired. Sign in again; your local edits are preserved.');throw new Error(error.msg||error.message||error.error_description||'Cloud request failed. Check your connection and project setup.')}return r.status===204?null:r.json()}
function keep(session:Session|null){current=session;if(session)localStorage.setItem(SESSION,JSON.stringify(session));else localStorage.removeItem(SESSION)}
export async function cloudConfig():Promise<CloudConfig>{const r=await fetch('/api/cloud/config',{cache:'no-store'});if(!r.ok)throw new Error('Unable to load cloud configuration.');return r.json()}
export async function restoreSession(config:CloudConfig):Promise<Session|null>{const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('error_description')){history.replaceState(null,'',location.pathname+location.search);throw new Error(hash.get('error_description')||'Sign-in failed.')}
if(hash.has('access_token')){const access=hash.get('access_token')!,refresh=hash.get('refresh_token')||'';const recovery=hash.get('type')==='recovery';history.replaceState(null,'',location.pathname+location.search);const user=await request(config,'/auth/v1/user',{},access);keep({access_token:access,refresh_token:refresh,expires_at:Date.now()/1000+Number(hash.get('expires_in')||3600),user,recovery})}else {const saved=localStorage.getItem(SESSION);if(saved){try{const parsed=JSON.parse(saved);if(typeof parsed.access_token==='string'&&typeof parsed.refresh_token==='string'&&typeof parsed.expires_at==='number'&&typeof parsed.user?.id==='string')current=parsed;else localStorage.removeItem(SESSION)}catch{localStorage.removeItem(SESSION)}}}
if(!current)return null;return freshSession(config)}
export async function freshSession(config:CloudConfig):Promise<Session>{if(!current)throw new Error('Sign in to sync your collection.');if(current.expires_at>Date.now()/1000+60)return current;if(!refreshing)refreshing=request(config,'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:current.refresh_token})}).then(value=>{const session={...value,expires_at:Date.now()/1000+value.expires_in};keep(session);return session}).finally(()=>{refreshing=null});return refreshing}
function sessionFromAuth(value:any):Session|null{if(!value?.access_token||!value?.user?.id)return null;const session:Session={access_token:value.access_token,refresh_token:value.refresh_token||'',expires_at:Date.now()/1000+Number(value.expires_in||3600),user:value.user};keep(session);return session}
export async function signInPassword(config:CloudConfig,email:string,password:string){const value=await request(config,'/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});const session=sessionFromAuth(value);if(!session)throw new Error('Unable to sign in. Check your email and password.');return session}
export async function signUpPassword(config:CloudConfig,email:string,password:string){const value=await request(config,'/auth/v1/signup?'+new URLSearchParams({redirect_to:location.origin+'/'}),{method:'POST',body:JSON.stringify({email,password})});return {session:sessionFromAuth(value),user:value?.user||null}}
export async function sendLogin(config:CloudConfig,email:string){return request(config,'/auth/v1/otp?'+new URLSearchParams({redirect_to:location.origin+'/'}),{method:'POST',body:JSON.stringify({email,create_user:true})})}

export async function sendPasswordReset(config:CloudConfig,email:string){const redirect=location.origin+'/';return request(config,'/auth/v1/recover?'+new URLSearchParams({redirect_to:redirect}),{method:'POST',body:JSON.stringify({email})})}
export async function updatePassword(config:CloudConfig,password:string){const session=await freshSession(config);const user=await request(config,'/auth/v1/user',{method:'PUT',body:JSON.stringify({password})},session.access_token);const updated={...session,user,recovery:false};keep(updated);return updated}

export type AuthCapabilities={google:boolean;apple:boolean;phone:boolean};
export type MfaFactor={id:string;friendly_name?:string;factor_type?:'totp'|'phone'|string;status?:'verified'|'unverified'|string;phone?:string;created_at?:string;updated_at?:string};
export type MfaEnrollment={id:string;type:string;friendly_name?:string;totp?:{qr_code?:string;secret?:string;uri?:string}};
export type MfaState={factors:MfaFactor[];verified:MfaFactor[];currentLevel:'aal1'|'aal2';nextLevel:'aal1'|'aal2'};

export async function authCapabilities(config:CloudConfig):Promise<AuthCapabilities>{
  const settings=await request(config,'/auth/v1/settings');
  const external=settings?.external&&typeof settings.external==='object'?settings.external:{};
  return {google:external.google===true,apple:external.apple===true,phone:settings?.phone===true||settings?.external?.phone===true};
}
export function startOAuth(config:CloudConfig,provider:'google'|'apple'){
  const params=new URLSearchParams({provider,redirect_to:location.origin+'/'});
  try{localStorage.setItem('vexum.onboarding.pending','1')}catch{}
  location.assign(config.url+'/auth/v1/authorize?'+params.toString());
}
function jwtPayload(token:string):Record<string,any>{
  try{
    const part=token.split('.')[1];if(!part)return {};
    const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    return JSON.parse(decodeURIComponent(Array.from(atob(padded)).map(char=>'%'+char.charCodeAt(0).toString(16).padStart(2,'0')).join('')));
  }catch{return {}}
}
export async function mfaState(config:CloudConfig):Promise<MfaState>{
  const session=await freshSession(config);
  const user=await request(config,'/auth/v1/user',{},session.access_token);
  const factors=Array.isArray(user?.factors)?user.factors.filter((factor:any)=>factor&&typeof factor.id==='string') as MfaFactor[]:[];
  const verified=factors.filter(factor=>factor.status==='verified');
  const payload=jwtPayload(session.access_token);
  const currentLevel: 'aal1'|'aal2'=payload.aal==='aal2'?'aal2':'aal1';
  return {factors,verified,currentLevel,nextLevel:verified.length?'aal2':'aal1'};
}
export async function enrollTotp(config:CloudConfig,friendlyName='VEXUM Authenticator'):Promise<MfaEnrollment>{
  const session=await freshSession(config);
  return request(config,'/auth/v1/factors',{method:'POST',body:JSON.stringify({factor_type:'totp',friendly_name:friendlyName})},session.access_token);
}
export async function challengeMfa(config:CloudConfig,factorId:string){
  const session=await freshSession(config);
  return request(config,'/auth/v1/factors/'+encodeURIComponent(factorId)+'/challenge',{method:'POST',body:JSON.stringify({})},session.access_token);
}
export async function verifyMfa(config:CloudConfig,factorId:string,challengeId:string,code:string){
  const session=await freshSession(config);
  const value=await request(config,'/auth/v1/factors/'+encodeURIComponent(factorId)+'/verify',{method:'POST',body:JSON.stringify({challenge_id:challengeId,code})},session.access_token);
  const next=sessionFromAuth(value);
  if(!next)throw new Error('MFA verified but the upgraded session was not returned. Sign in again.');
  return next;
}
export async function unenrollMfa(config:CloudConfig,factorId:string){
  const session=await freshSession(config);
  return request(config,'/auth/v1/factors/'+encodeURIComponent(factorId),{method:'DELETE'},session.access_token);
}
export async function logout(config:CloudConfig){try{const session=await freshSession(config);await request(config,'/auth/v1/logout?scope=local',{method:'POST'},session.access_token)}finally{keep(null)}}
export type CloudWorkspace={payload:Store;revision:number;updated_at:string};
const IMAGE_BUCKET='collector-images';
export function hasInlineWorkspaceImages(data:Store){return data.items.some(i=>i.image.startsWith('data:image/'))||data.collections.some(c=>[c.logo,c.coverImage,c.coverLogo].some(v=>(v||'').startsWith('data:image/')))||Object.values(data.libraryGroups||{}).some(g=>[g.coverImage,g.coverLogo].some(v=>(v||'').startsWith('data:image/')))||!!data.profile?.image?.startsWith('data:image/')}
function imageExtension(type:string){if(type==='image/png')return'png';if(type==='image/gif')return'gif';if(type==='image/jpeg')return'jpg';return'webp'}
export async function uploadCollectorImage(config:CloudConfig,dataUrl:string){if(!dataUrl.startsWith('data:image/'))return dataUrl;const session=await freshSession(config);const blob=await fetch(dataUrl).then(r=>r.blob());if(blob.size>8*1024*1024)throw new Error('A photo is too large to move into cloud image storage.');const path=`${session.user.id}/${crypto.randomUUID()}.${imageExtension(blob.type)}`;const response=await fetch(config.url+'/storage/v1/object/'+IMAGE_BUCKET+'/'+path,{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':blob.type||'image/webp','x-upsert':'false'},body:blob,signal:AbortSignal.timeout(30000)});if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||error.error||'Photo upload failed.')}return config.url+'/storage/v1/object/public/'+IMAGE_BUCKET+'/'+path}
export async function externalizeWorkspaceImages(config:CloudConfig,data:Store,onProgress?:(done:number,total:number)=>void){const values=[...data.items.map(i=>i.image),...data.collections.flatMap(c=>[c.logo||'',c.coverImage||'',c.coverLogo||'']),...Object.values(data.libraryGroups||{}).flatMap(g=>[g.coverImage||'',g.coverLogo||'']),data.profile?.image||''].filter(v=>v.startsWith('data:image/'));const unique=[...new Set(values)];if(!unique.length)return {data,migrated:0};const urls=new Map<string,string>();let done=0;for(const value of unique){urls.set(value,await uploadCollectorImage(config,value));done++;onProgress?.(done,unique.length)}const items=data.items.map(i=>i.image.startsWith('data:image/')?{...i,image:urls.get(i.image)!}:i);const collections=data.collections.map(c=>({...c,logo:c.logo?.startsWith('data:image/')?urls.get(c.logo)!:c.logo,coverImage:c.coverImage?.startsWith('data:image/')?urls.get(c.coverImage)!:c.coverImage,coverLogo:c.coverLogo?.startsWith('data:image/')?urls.get(c.coverLogo)!:c.coverLogo}));const libraryGroups=Object.fromEntries(Object.entries(data.libraryGroups||{}).map(([key,g])=>[key,{...g,coverImage:g.coverImage?.startsWith('data:image/')?urls.get(g.coverImage)!:g.coverImage,coverLogo:g.coverLogo?.startsWith('data:image/')?urls.get(g.coverLogo)!:g.coverLogo}]));const profile=data.profile?.image?.startsWith('data:image/')?{...data.profile,image:urls.get(data.profile.image)!}:data.profile;return {data:{...data,items,collections,libraryGroups,profile},migrated:unique.length}}
export async function loadWorkspace(config:CloudConfig):Promise<CloudWorkspace|null>{const session=await freshSession(config);const rows=await request(config,'/rest/v1/collector_workspaces?'+new URLSearchParams({user_id:'eq.'+session.user.id,select:'payload,revision,updated_at'}),{},session.access_token);if(!rows.length)return null;if(!validStore(rows[0].payload))throw new Error('Cloud collection data is invalid. Export your local backup before continuing.');return rows[0]}
export async function saveWorkspace(config:CloudConfig,data:Store,revision:number):Promise<CloudWorkspace>{if(!validStore(data))throw new Error('Collection data is invalid; cloud save cancelled.');if(new Blob([JSON.stringify(data)]).size>10*1024*1024)throw new Error('This workspace exceeds the 10 MB sync limit. Export a backup and reduce photo sizes.');const session=await freshSession(config);const result=await request(config,'/rest/v1/rpc/collector_save_workspace',{method:'POST',body:JSON.stringify({new_payload:data,expected_revision:revision})},session.access_token);if(!result?.saved)throw new CloudConflict();return {payload:data,revision:result.revision,updated_at:result.updated_at}}

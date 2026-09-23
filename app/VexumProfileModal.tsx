'use client';

import {useEffect,useMemo,useState,type ChangeEvent} from 'react';
import {ExternalLink,Image as ImageIcon,Link2,MapPin,Package,Settings,Shield,ShoppingBag,Star,Store,UserRound,Users} from 'lucide-react';
import {uploadCollectorImage} from '../lib/cloud';
import {ensureCollectorProfile,loadProfileOverview,updateSocialProfile,type SocialProfile,type SocialProfileLink,type SocialProfileOverview} from '../lib/socialCloud';
import {normalizePlatformState} from '../lib/platform';
import {useWorkspace} from '../lib/useWorkspace';
import {VexumDialog,pushVexumToast} from './VexumUi';

type Tab='Profile'|'Visibility'|'Activity';

function initials(profile:SocialProfile|null,fallback:string){
  const source=profile?.display_name||profile?.username||fallback||'V';
  return source.split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,2).toUpperCase();
}
function readImage(file:File){
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Image could not be read.'));
    reader.onload=()=>resolve(String(reader.result||''));
    reader.readAsDataURL(file);
  });
}
function normalizeLink(value:SocialProfileLink):SocialProfileLink{
  let url=value.url.trim();
  if(url&&!/^https?:\/\//i.test(url))url='https://'+url;
  return {label:value.label.trim(),url};
}
function formatDate(value:string|null|undefined){
  if(!value)return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return '';
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(date);
}

export default function VexumProfileModal({open,onClose,onSettings,onOpenSocial}:{open:boolean;onClose:()=>void;onSettings:()=>void;onOpenSocial:()=>void}){
  const workspace=useWorkspace();
  const platform=normalizePlatformState(workspace.data.platform,true);
  const fallbackName=platform.identity.displayName||workspace.data.profile?.name||workspace.session?.user.email?.split('@')[0]||'VEXUM User';
  const [tab,setTab]=useState<Tab>('Profile');
  const [profile,setProfile]=useState<SocialProfile|null>(null);
  const [overview,setOverview]=useState<SocialProfileOverview>({posts:0,reviews:0,activeListings:0});
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [username,setUsername]=useState('');
  const [bio,setBio]=useState('');
  const [region,setRegion]=useState('');
  const [avatar,setAvatar]=useState('');
  const [banner,setBanner]=useState('');
  const [links,setLinks]=useState<SocialProfileLink[]>([]);
  const [isPublic,setIsPublic]=useState(true);
  const [showCollection,setShowCollection]=useState(true);
  const [showValue,setShowValue]=useState(false);
  const [showWishlist,setShowWishlist]=useState(true);
  const [showSetups,setShowSetups]=useState(false);
  const [showTrades,setShowTrades]=useState(true);
  const [showAchievements,setShowAchievements]=useState(true);
  const [showSeller,setShowSeller]=useState(true);

  const owned=workspace.data.items.filter(item=>item.status==='owned');
  const wishlist=Object.values(workspace.data.wishlist||{}).filter(record=>!record.archived);
  const setupCount=workspace.data.setup?.spaces?.length||0;
  const collectionValue=owned.reduce((sum,item)=>sum+(Number(item.currentValue)||0)*(Number(item.quantity)||1),0);

  useEffect(()=>{
    if(!open)return;
    setTab('Profile');setError('');
    if(!workspace.config?.configured||!workspace.session){setProfile(null);return}
    let alive=true;setLoading(true);
    Promise.all([
      ensureCollectorProfile(workspace.config,workspace.session,{displayName:fallbackName,avatarUrl:workspace.data.profile?.image}),
      loadProfileOverview(workspace.config,workspace.session)
    ]).then(([next,stats])=>{
      if(!alive)return;
      setProfile(next);setOverview(stats);
      setDisplayName(next.display_name||fallbackName);setUsername(next.username||'');setBio(next.bio||'');setRegion(next.region||'');
      setAvatar(next.avatar_url||'');setBanner(next.banner_url||'');setLinks(Array.isArray(next.links)?next.links:[]);
      setIsPublic(next.is_public);setShowCollection(next.show_collection);setShowValue(next.show_collection_value);setShowWishlist(next.show_wishlist);
      setShowSetups(next.show_setups);setShowTrades(next.show_trades);setShowAchievements(next.show_achievements);setShowSeller(next.show_seller_profile);
    }).catch(err=>{if(alive)setError(err instanceof Error?err.message:'Profile could not load.')})
      .finally(()=>{if(alive)setLoading(false)});
    return()=>{alive=false};
  },[open,workspace.config?.configured,workspace.session?.user.id]);

  const usernameUnlock=useMemo(()=>{
    if(!profile?.username_updated_at)return null;
    const changed=new Date(profile.username_updated_at);
    if(!Number.isFinite(changed.getTime()))return null;
    return new Date(changed.getTime()+7*24*60*60*1000);
  },[profile?.username_updated_at]);
  const usernameLocked=Boolean(usernameUnlock&&usernameUnlock.getTime()>Date.now()&&username.trim()!==(profile?.username||''));
  const usernameCanChangeAt=usernameUnlock&&usernameUnlock.getTime()>Date.now()?formatDate(usernameUnlock.toISOString()):'Now';

  const pickImage=async(event:ChangeEvent<HTMLInputElement>,kind:'avatar'|'banner')=>{
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>8*1024*1024){pushVexumToast({title:'Image is too large.',message:'Use an image under 8 MB.',kind:'warning'});return}
    try{const data=await readImage(file);if(kind==='avatar')setAvatar(data);else setBanner(data)}
    catch(err){pushVexumToast({title:'Image could not be read.',message:err instanceof Error?err.message:undefined,kind:'error'})}
  };

  const save=async()=>{
    if(!workspace.config?.configured||!workspace.session||!profile)return;
    const cleanName=displayName.trim();
    const cleanUsername=username.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    if(!cleanName){setError('Display name is required.');return}
    if(cleanUsername&&cleanUsername.length<3){setError('Username must be at least 3 characters.');return}
    if(cleanUsername!==(profile.username||'')&&usernameUnlock&&usernameUnlock.getTime()>Date.now()){
      setError('Username can be changed again on '+formatDate(usernameUnlock.toISOString())+'.');return;
    }
    setBusy(true);setError('');
    try{
      const [avatarUrl,bannerUrl]=await Promise.all([
        avatar.startsWith('data:image/')?uploadCollectorImage(workspace.config,avatar):Promise.resolve(avatar),
        banner.startsWith('data:image/')?uploadCollectorImage(workspace.config,banner):Promise.resolve(banner)
      ]);
      const cleanLinks=links.map(normalizeLink).filter(link=>link.url).slice(0,5);
      const next=await updateSocialProfile(workspace.config,workspace.session,{
        display_name:cleanName,username:cleanUsername||null,bio:bio.trim(),region:region.trim(),avatar_url:avatarUrl,banner_url:bannerUrl,links:cleanLinks,
        is_public:isPublic,show_collection:showCollection,show_collection_value:showValue,show_wishlist:showWishlist,show_setups:showSetups,
        show_trades:showTrades,show_achievements:showAchievements,show_seller_profile:showSeller
      });
      setProfile(next);setAvatar(next.avatar_url||'');setBanner(next.banner_url||'');setLinks(Array.isArray(next.links)?next.links:[]);
      workspace.update({...workspace.data,profile:{...(workspace.data.profile||{}),name:cleanName,image:next.avatar_url||workspace.data.profile?.image||''},platform:{...platform,identity:{...platform.identity,displayName:cleanName,username:next.username||''}}});
      pushVexumToast({title:'Profile updated.',kind:'success'});
    }catch(err){setError(err instanceof Error?err.message:'Profile could not update.')}
    finally{setBusy(false)}
  };

  const addLink=()=>{if(links.length<5)setLinks(current=>[...current,{label:'',url:''}])};

  return <VexumDialog open={open} onClose={onClose} title="Profile" eyebrow="YOUR VEXUM" description="Control how you appear across VEXUM, Social, collections, setups, and marketplace surfaces." size="xl" className="vxp-profile-dialog">
    {!workspace.session?<div className="vxp-profile-empty"><UserRound/><strong>Sign in to build your VEXUM profile.</strong><p>Your public profile and social identity are tied to your VEXUM account.</p></div>:loading?<div className="vxp-profile-empty"><span className="vxp-profile-spinner"/><strong>Loading profile…</strong></div>:profile?<div className="vxp-profile-shell">
      <section className="vxp-profile-hero">
        <div className="vxp-profile-banner" style={banner?{backgroundImage:'url("'+banner.replaceAll('"','')+'")'}:undefined}>
          <label className="vxp-profile-image-action"><ImageIcon/>Change banner<input type="file" accept="image/*" onChange={event=>void pickImage(event,'banner')}/></label>
        </div>
        <div className="vxp-profile-identity">
          <div className="vxp-profile-avatar" style={avatar?{backgroundImage:'url("'+avatar.replaceAll('"','')+'")'}:undefined}>{avatar?'':initials(profile,fallbackName)}<label><ImageIcon/><input type="file" accept="image/*" onChange={event=>void pickImage(event,'avatar')}/></label></div>
          <div><h2>{displayName||fallbackName}</h2><span>{username?'@'+username:'Choose a username'}{region?' · '+region:''}</span><p>{bio||'Add a short bio so collectors know what you are into.'}</p></div>
          <div className="vxp-profile-hero-actions"><button onClick={onOpenSocial}><Users/>Open Social Profile</button><button onClick={onSettings}><Settings/>Settings</button></div>
        </div>
      </section>

      <nav className="vxp-profile-tabs" aria-label="Profile sections">{(['Profile','Visibility','Activity'] as Tab[]).map(item=><button key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</nav>

      {tab==='Profile'?<div className="vxp-profile-editor">
        <section className="vxp-profile-form-card">
          <header><strong>Identity</strong><span>Your public-facing VEXUM identity.</span></header>
          <div className="vxp-profile-form-grid">
            <label>Display name<input value={displayName} maxLength={60} onChange={e=>setDisplayName(e.target.value)}/></label>
            <label>Username<input value={username} disabled={Boolean(usernameUnlock&&usernameUnlock.getTime()>Date.now()&&profile.username)} maxLength={30} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))}/><small>{profile.username?'Username can next change: '+usernameCanChangeAt:'Choose carefully — successful changes start a 7-day cooldown.'}</small></label>
            <label className="wide">Bio<textarea value={bio} maxLength={300} onChange={e=>setBio(e.target.value)} placeholder="What do you collect, build, sell, or care about?"/></label>
            <label><MapPin/>Location / region<input value={region} maxLength={80} onChange={e=>setRegion(e.target.value)} placeholder="New Jersey"/></label>
          </div>
        </section>
        <section className="vxp-profile-form-card">
          <header><strong>Links</strong><span>Add up to five public links.</span></header>
          <div className="vxp-profile-links">{links.map((link,index)=><div key={index}><input aria-label={'Link '+(index+1)+' label'} value={link.label} onChange={e=>setLinks(rows=>rows.map((row,i)=>i===index?{...row,label:e.target.value}:row))} placeholder="Label"/><input aria-label={'Link '+(index+1)+' URL'} value={link.url} onChange={e=>setLinks(rows=>rows.map((row,i)=>i===index?{...row,url:e.target.value}:row))} placeholder="https://…"/><button aria-label="Remove link" onClick={()=>setLinks(rows=>rows.filter((_,i)=>i!==index))}>×</button></div>)}<button className="add" disabled={links.length>=5} onClick={addLink}><Link2/>Add link</button></div>
        </section>
      </div>:null}

      {tab==='Visibility'?<div className="vxp-profile-visibility">
        <section className="vxp-profile-form-card"><header><strong>Profile privacy</strong><span>Exact location is never exposed; only the optional region you enter above can appear publicly.</span></header>
          <ProfileToggle label="Public profile" description="Allow your collector profile to appear in Social discovery." checked={isPublic} onChange={setIsPublic}/>
          <ProfileToggle label="Collections" description="Show your public collection modules." checked={showCollection} onChange={setShowCollection}/>
          <ProfileToggle label="Collection value" description="Show current public collection value." checked={showValue} onChange={setShowValue}/>
          <ProfileToggle label="Wishlist" description="Show Wishlist activity and public wanted items." checked={showWishlist} onChange={setShowWishlist}/>
          <ProfileToggle label="Setups" description="Show setups you intentionally expose." checked={showSetups} onChange={setShowSetups}/>
          <ProfileToggle label="Trades" description="Show trade availability and trade activity." checked={showTrades} onChange={setShowTrades}/>
          <ProfileToggle label="Achievements" description="Show collection milestones and achievements." checked={showAchievements} onChange={setShowAchievements}/>
          <ProfileToggle label="Seller profile" description="Show marketplace/shop information and seller reputation surfaces." checked={showSeller} onChange={setShowSeller}/>
        </section>
      </div>:null}

      {tab==='Activity'?<div className="vxp-profile-activity">
        <div className="vxp-profile-metrics">
          <div><Package/><span><strong>{owned.length}</strong><small>Owned items</small></span></div>
          <div><Star/><span><strong>{wishlist.length}</strong><small>Wishlist</small></span></div>
          <div><Store/><span><strong>{setupCount}</strong><small>Setups</small></span></div>
          <div><Users/><span><strong>{overview.posts}</strong><small>Posts</small></span></div>
          <div><Shield/><span><strong>{overview.reviews}</strong><small>Reviews</small></span></div>
          <div><ShoppingBag/><span><strong>{overview.activeListings}</strong><small>Active listings</small></span></div>
        </div>
        <section className="vxp-profile-form-card"><header><strong>Public snapshot</strong><span>What other users can understand at a glance.</span></header>
          <div className="vxp-profile-snapshot"><span>Collection value <b>{showValue?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(collectionValue):'Hidden'}</b></span><span>Collections <b>{showCollection?workspace.data.collections.length:'Hidden'}</b></span><span>Wishlist <b>{showWishlist?wishlist.length:'Hidden'}</b></span><span>Seller profile <b>{showSeller?'Visible':'Hidden'}</b></span></div>
          <button className="vxp-profile-social-link" onClick={onOpenSocial}><ExternalLink/>View full Social profile experience</button>
        </section>
      </div>:null}

      {error?<p className="vxp-profile-error" role="alert">{error}</p>:null}
      <footer className="vxp-profile-footer"><span>{busy?'Saving profile…':'Changes sync to your VEXUM account.'}</span><button onClick={onClose}>Cancel</button><button className="primary" disabled={busy||usernameLocked} onClick={()=>void save()}>{busy?'Saving…':'Save Profile'}</button></footer>
    </div>:<div className="vxp-profile-empty"><UserRound/><strong>Profile unavailable.</strong><p>{error||'VEXUM could not load your account profile.'}</p></div>}
  </VexumDialog>;
}

function ProfileToggle({label,description,checked,onChange}:{label:string;description:string;checked:boolean;onChange:(value:boolean)=>void}){
  return <div className="vxp-profile-toggle"><span><strong>{label}</strong><small>{description}</small></span><button type="button" role="switch" aria-checked={checked} className={checked?'on':''} onClick={()=>onChange(!checked)}><i/></button></div>;
}

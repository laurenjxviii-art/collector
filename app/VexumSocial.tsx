'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ChangeEvent,ReactNode} from 'react';
import {
  AlertTriangle,Bell,Check,ChevronRight,CircleUserRound,Eye,Flag,Heart,Image as ImageIcon,
  Layers3,MapPin,MessageCircle,MessagesSquare,PackageOpen,Plus,Search,Settings2,Share2,
  Shield,ShoppingBag,Sparkles,Star,Store,Tag,Users,X
} from 'lucide-react';
import {useWorkspace} from '../lib/useWorkspace';
import {VexumDialog,VexumPageSkeleton} from './VexumUi';
import {uploadCollectorImage} from '../lib/cloud';
import {normalizeSetupData} from '../lib/setup';
import {
  addPostComment,blockCollector,createCommunity,createSocialPost,deleteSocialPost,
  ensureCollectorProfile,followCollector,joinCommunity,leaveCommunity,listCommunities,
  listDropEvents,listFollowingIds,listPublicProfiles,listStockReports,loadSocialFeed,
  reportSocialTarget,togglePostLike,unfollowCollector,updateSocialProfile,
  type SocialCommunity,type SocialDropEvent,type SocialFeedPost,type SocialPostType,
  type SocialProfile,type SocialStockReport,type SocialVisibility
} from '../lib/socialCloud';

type Tab='For You'|'Following'|'Communities'|'Discover'|'Messages'|'Profile';
type ComposerTag={
  product_id:string|null;
  portfolio_item_id:string|null;
  tag_type:'product'|'owned_copy'|'wanted'|'trade'|'sale';
  product_snapshot:{name?:string;imageUrl?:string;category?:string;line?:string;manufacturer?:string;market?:number};
};

const POST_TYPES:Array<{value:SocialPostType;label:string}>=[
  {value:'standard',label:'Post'},{value:'pickup',label:'Pickup'},{value:'collection_update',label:'Collection Update'},
  {value:'setup',label:'Setup'},{value:'question',label:'Question'},{value:'review',label:'Review'},
  {value:'trade',label:'Trade'},{value:'sale',label:'Sale'},{value:'restock',label:'Restock'},
  {value:'drop',label:'Drop / Release'},{value:'milestone',label:'Milestone'}
];
const VISIBILITIES:Array<{value:SocialVisibility;label:string}>=[
  {value:'public',label:'Public'},{value:'followers',label:'Followers'},{value:'community',label:'Community'},{value:'private',label:'Private / Draft'}
];

function timeAgo(value:string){
  const ms=Date.now()-Date.parse(value);
  if(!Number.isFinite(ms))return '';
  const min=Math.max(1,Math.floor(ms/60000));
  if(min<60)return min+'m';
  const hr=Math.floor(min/60);
  if(hr<24)return hr+'h';
  const days=Math.floor(hr/24);
  return days<30?days+'d':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(value));
}
function money(value?:number|null){
  return typeof value==='number'&&Number.isFinite(value)
    ?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value)
    :'—';
}
function initials(profile?:SocialProfile){
  const source=profile?.display_name||profile?.username||'C';
  return source.split(/s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
}
function profileName(profile?:SocialProfile){
  return profile?.display_name||profile?.username||'Collector';
}
function username(profile?:SocialProfile){
  return profile?.username?'@'+profile.username:'No username';
}

function Avatar({profile,size='md'}:{profile?:SocialProfile;size?:'sm'|'md'|'lg'}){
  return <div className={'vxsoc-avatar '+size} style={profile?.avatar_url?{backgroundImage:'url("'+profile.avatar_url.replaceAll('"','')+'")'}:undefined}>{profile?.avatar_url?'':initials(profile)}</div>;
}

function SocialEmpty({icon,title,body,action}:{icon:ReactNode;title:string;body:string;action?:ReactNode}){
  return <div className="vxsoc-empty">{icon}<strong>{title}</strong><p>{body}</p>{action}</div>;
}

export default function VexumSocial({section,onSectionChange}:{section?:string;onSectionChange?:(section:string)=>void}={}){
  const workspace=useWorkspace();
  const [internalTab,setInternalTab]=useState<Tab>('For You');
  const tab=((section as Tab|undefined)||internalTab);
  const setTab=(next:Tab)=>{setInternalTab(next);onSectionChange?.(next)};
  const [profile,setProfile]=useState<SocialProfile|null>(null);
  const [profiles,setProfiles]=useState<SocialProfile[]>([]);
  const [followingIds,setFollowingIds]=useState<string[]>([]);
  const [posts,setPosts]=useState<SocialFeedPost[]>([]);
  const [communities,setCommunities]=useState<SocialCommunity[]>([]);
  const [memberships,setMemberships]=useState<Array<{community_id:string;role:string;status:string}>>([]);
  const [drops,setDrops]=useState<SocialDropEvent[]>([]);
  const [stockReports,setStockReports]=useState<SocialStockReport[]>([]);
  const [activeCommunity,setActiveCommunity]=useState<string>('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [composerOpen,setComposerOpen]=useState(false);
  const [communityComposer,setCommunityComposer]=useState(false);
  const [commentPostId,setCommentPostId]=useState('');
  const [profileEditing,setProfileEditing]=useState(false);

  const config=workspace.config;
  const session=workspace.session;
  const setup=normalizeSetupData(workspace.data.setup);
  const currentSetups=setup.spaces.filter(space=>space.mode==='current');

  const productOptions=useMemo(()=>{
    const byKey=new Map<string,{key:string;label:string;sub:string;tag:ComposerTag}>();
    for(const record of Object.values(workspace.data.wishlist||{})){
      if(record.archived)continue;
      const key='wishlist:'+record.productId;
      byKey.set(key,{
        key,label:record.snapshot?.name||record.productId,
        sub:[record.snapshot?.manufacturer,record.snapshot?.line,'Wishlist'].filter(Boolean).join(' · '),
        tag:{
          product_id:record.source==='catalog'?record.productId:null,
          portfolio_item_id:record.workspaceItemId||null,
          tag_type:'wanted',
          product_snapshot:{
            name:record.snapshot?.name,imageUrl:record.snapshot?.imageUrl,category:record.snapshot?.category,
            line:record.snapshot?.line,manufacturer:record.snapshot?.manufacturer,market:record.currentMarket
          }
        }
      });
    }
    const catalogRecords=Object.values(workspace.data.wishlist||{}).filter(record=>record.source==='catalog');
    const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    for(const item of workspace.data.items.filter(item=>item.status==='owned')){
      const key='owned:'+item.id;
      const canonical=item.productId?undefined:catalogRecords.find(record=>{
        const snapshot=record.snapshot;
        return (snapshot?.name&&normalized(snapshot.name)===normalized(item.name))||
          (!!item.identity?.upc&&snapshot?.upc===item.identity.upc)||
          (!!item.identity?.sku&&snapshot?.sku===item.identity.sku)||
          (!!item.identity?.modelNumber&&snapshot?.modelNumber===item.identity.modelNumber);
      });
      byKey.set(key,{
        key,label:item.name,
        sub:[item.identity?.brand,item.identity?.series,item.category,'Owned'].filter(Boolean).join(' · '),
        tag:{
          product_id:item.productId||canonical?.productId||null,portfolio_item_id:item.id,tag_type:'owned_copy',
          product_snapshot:{
            name:item.name,imageUrl:item.image||undefined,category:item.category,line:item.identity?.series,
            manufacturer:item.identity?.brand,market:item.currentValue
          }
        }
      });
    }
    return [...byKey.values()].sort((a,b)=>a.label.localeCompare(b.label));
  },[workspace.data.items,workspace.data.wishlist]);

  async function initialize(){
    if(!workspace.ready){return}
    if(!config?.configured||!session){
      setProfile(null);setProfiles([]);setPosts([]);setCommunities([]);setLoading(false);
      return;
    }
    setLoading(true);setError('');
    try{
      const own=await ensureCollectorProfile(config,session,{
        displayName:workspace.data.profile?.name,
        avatarUrl:workspace.data.profile?.image
      });
      setProfile(own);
      const [publicProfiles,communityData,follows,dropRows,stockRows]=await Promise.all([
        listPublicProfiles(config,session,12),
        listCommunities(config,session),
        listFollowingIds(config,session),
        listDropEvents(config,session),
        listStockReports(config,session)
      ]);
      setProfiles(publicProfiles.filter(item=>item.id!==session.user.id));
      setCommunities(communityData.communities);
      setMemberships(communityData.memberships);
      setFollowingIds(follows);
      setDrops(dropRows);
      setStockReports(stockRows);
      const landing=own.default_social_landing;
      if(tab==='For You'&&landing==='following')setTab('Following');
      else if(tab==='For You'&&landing==='communities')setTab('Communities');
      else await refreshFeed('For You',communityData.communities,communityData.memberships);
    }catch(err){setError(err instanceof Error?err.message:'Social could not load.')}
    finally{setLoading(false)}
  }

  async function refreshFeed(nextTab=tab,communityList=communities,memberList=memberships){
    if(!config?.configured)return;
    try{
      if(nextTab==='For You')setPosts(await loadSocialFeed(config,session,'for_you'));
      else if(nextTab==='Following'&&session)setPosts(await loadSocialFeed(config,session,'following'));
      else if(nextTab==='Communities'){
        const chosen=activeCommunity||memberList.find(m=>m.status==='active')?.community_id||communityList[0]?.id||'';
        if(chosen){setActiveCommunity(chosen);setPosts(await loadSocialFeed(config,session,'community',chosen))}
        else setPosts([]);
      }
    }catch(err){setError(err instanceof Error?err.message:'Feed could not refresh.')}
  }

  useEffect(()=>{void initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[workspace.ready,Boolean(workspace.config?.configured),workspace.session?.user.id]);

  useEffect(()=>{
    if(!workspace.ready||loading)return;
    if(['For You','Following','Communities'].includes(tab))void refreshFeed(tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[tab,activeCommunity]);

  const membershipSet=new Set(memberships.filter(m=>m.status==='active').map(m=>m.community_id));

  async function handleFollow(userId:string){
    if(!config||!session)return;
    setBusy(true);
    try{
      if(followingIds.includes(userId)){await unfollowCollector(config,session,userId);setFollowingIds(ids=>ids.filter(id=>id!==userId))}
      else {await followCollector(config,session,userId);setFollowingIds(ids=>[...ids,userId])}
      if(tab==='Following')await refreshFeed('Following');
    }catch(err){setError(err instanceof Error?err.message:'Follow state could not update.')}
    finally{setBusy(false)}
  }

  async function handleJoin(communityId:string){
    if(!config||!session)return;
    setBusy(true);
    try{
      if(membershipSet.has(communityId)){
        const community=communities.find(c=>c.id===communityId);
        if(community?.owner_user_id===session.user.id)throw new Error('The community owner cannot leave their own community.');
        await leaveCommunity(config,session,communityId);
        setMemberships(rows=>rows.filter(row=>row.community_id!==communityId));
      }else{
        await joinCommunity(config,session,communityId);
        setMemberships(rows=>[...rows,{community_id:communityId,role:'member',status:'active'}]);
      }
    }catch(err){setError(err instanceof Error?err.message:'Community membership could not update.')}
    finally{setBusy(false)}
  }

  async function handleLike(post:SocialFeedPost){
    if(!config||!session)return;
    try{
      await togglePostLike(config,session,post.id,post.likedByMe);
      setPosts(rows=>rows.map(row=>row.id===post.id?{...row,likedByMe:!post.likedByMe,likeCount:Math.max(0,row.likeCount+(post.likedByMe?-1:1))}:row));
    }catch(err){setError(err instanceof Error?err.message:'Like could not update.')}
  }

  async function handleComment(postId:string,body:string){
    if(!config||!session||!body.trim())return;
    try{
      const created=await addPostComment(config,session,postId,body);
      if(!created)return;
      setPosts(rows=>rows.map(row=>row.id===postId?{
        ...row,comments:[...row.comments,created],commentCount:row.commentCount+1,
        commentAuthors:{...row.commentAuthors,[session.user.id]:profile!}
      }:row));
      setCommentPostId('');
    }catch(err){setError(err instanceof Error?err.message:'Comment could not be posted.')}
  }

  if(!workspace.ready||loading)return <div className="vxsoc-page"><VexumPageSkeleton label="Loading collector network…"/></div>;

  return <div className="vxsoc-page">
    <section className="vxsoc-title vxp-simple-title"><div><span>SOCIAL</span><h1>{tab}</h1></div></section>
    {session&&['For You','Following','Communities'].includes(tab)?<div className="vxp-page-actions"><button className="red" onClick={()=>setComposerOpen(true)}><Plus/>Create Post</button></div>:null}

    {error?<div className="vxsoc-error"><AlertTriangle/><span>{error}</span><button onClick={()=>setError('')}><X/></button></div>:null}

    {!session?<section className="vxsoc-panel vxsoc-signin"><SocialEmpty icon={<Shield/>} title="Social requires a signed-in VEXUM profile" body="Sign in to post, follow collectors, join communities, and use network features. Your private VEXUM data stays private unless you choose to share it."/></section>:null}

    {session&&['For You','Following','Communities'].includes(tab)?<div className="vxsoc-layout">
      <main>
        {tab==='Communities'?<CommunityStrip communities={communities} memberships={membershipSet} active={activeCommunity} onSelect={setActiveCommunity} onJoin={handleJoin} onCreate={()=>setCommunityComposer(true)} busy={busy}/>:null}
        <ComposerLauncher profile={profile||undefined} onOpen={()=>setComposerOpen(true)} productCount={productOptions.length}/>
        <section className="vxsoc-feed">
          {posts.map(post=><PostCard key={post.id} post={post} currentUserId={session.user.id} onLike={()=>void handleLike(post)} onComment={()=>setCommentPostId(commentPostId===post.id?'':post.id)} commentOpen={commentPostId===post.id} onSubmitComment={body=>void handleComment(post.id,body)} onDelete={async()=>{
            if(!config)return;try{await deleteSocialPost(config,session,post.id);setPosts(rows=>rows.filter(row=>row.id!==post.id))}catch(err){setError(err instanceof Error?err.message:'Post could not be deleted.')}
          }} onReport={async()=>{
            if(!config)return;try{await reportSocialTarget(config,session,{targetType:'post',targetId:post.id,reason:'User report'});setError('Report received. It is now recorded for moderation review.')}catch(err){setError(err instanceof Error?err.message:'Report could not be created.')}
          }}/>)}
          {!posts.length?<SocialEmpty icon={tab==='Following'?<Users/>:<MessagesSquare/>} title={tab==='Following'?'Your Following feed is empty':'Nothing has been posted here yet'} body={tab==='Following'?'Follow collectors to build a chronological network feed. VEXUM will not fabricate activity.':'Create the first real post here, or join a community with activity.'} action={<button onClick={()=>setComposerOpen(true)}><Plus/>Create Post</button>}/>:null}
        </section>
      </main>
      <ContextRail profile={profile||undefined} profiles={profiles} followingIds={followingIds} communities={communities} memberships={membershipSet} drops={drops} onFollow={handleFollow} onCommunity={id=>{setActiveCommunity(id);setTab('Communities')}}/>
    </div>:null}

    {session&&tab==='Discover'?<div className="vxsoc-discover-stack"><DropsView drops={drops}/><LocalView reports={stockReports}/></div>:null}
    {session&&tab==='Messages'?<MessagesView/>:null}
    {session&&tab==='Profile'&&profile?<ProfileView profile={profile} workspace={workspace.data} onEdit={()=>setProfileEditing(true)} communities={communities.filter(c=>membershipSet.has(c.id))}/>:null}

    {composerOpen&&session&&config?<PostComposer
      profile={profile||undefined}
      communities={communities.filter(c=>membershipSet.has(c.id)||c.owner_user_id===session.user.id)}
      products={productOptions}
      setups={currentSetups}
      collections={workspace.data.collections}
      onClose={()=>setComposerOpen(false)}
      onSave={async input=>{
        setBusy(true);setError('');
        try{
          let imageUrl=input.imageUrl;
          if(imageUrl.startsWith('data:image/'))imageUrl=await uploadCollectorImage(config,imageUrl);
          await createSocialPost(config,session,{...input,imageUrl});
          setComposerOpen(false);
          if(tab==='For You'||tab==='Following'||tab==='Communities')await refreshFeed(tab);
        }catch(err){setError(err instanceof Error?err.message:'Post could not be created.')}
        finally{setBusy(false)}
      }}
      busy={busy}
    />:null}

    {communityComposer&&session&&config?<CommunityComposer onClose={()=>setCommunityComposer(false)} busy={busy} onSave={async input=>{
      setBusy(true);
      try{
        const created=await createCommunity(config,session,input);
        if(created){
          setCommunities(rows=>[...rows,created].sort((a,b)=>a.name.localeCompare(b.name)));
          setMemberships(rows=>[...rows,{community_id:created.id,role:'owner',status:'active'}]);
          setActiveCommunity(created.id);
          setCommunityComposer(false);
        }
      }catch(err){setError(err instanceof Error?err.message:'Community could not be created.')}
      finally{setBusy(false)}
    }}/>:null}

    {profileEditing&&session&&config&&profile?<ProfileEditor profile={profile} onClose={()=>setProfileEditing(false)} onSave={async patch=>{
      setBusy(true);
      try{const next=await updateSocialProfile(config,session,patch);if(next)setProfile(next);setProfileEditing(false)}
      catch(err){setError(err instanceof Error?err.message:'Profile could not update.')}
      finally{setBusy(false)}
    }} busy={busy}/>:null}
  </div>;
}

function ComposerLauncher({profile,onOpen,productCount}:{profile?:SocialProfile;onOpen:()=>void;productCount:number}){
  return <section className="vxsoc-panel vxsoc-launcher"><Avatar profile={profile}/><button onClick={onOpen}>Share a pickup, setup, question, review, trade, or collection update…</button><span><Tag/>{productCount} taggable VEXUM objects</span></section>;
}

function PostCard({post,currentUserId,onLike,onComment,commentOpen,onSubmitComment,onDelete,onReport}:{
  post:SocialFeedPost;currentUserId:string;onLike:()=>void;onComment:()=>void;commentOpen:boolean;
  onSubmitComment:(body:string)=>void;onDelete:()=>void;onReport:()=>void;
}){
  const [comment,setComment]=useState('');
  const mine=post.user_id===currentUserId;
  return <article className="vxsoc-panel vxsoc-post">
    <header>
      <Avatar profile={post.author}/>
      <div><strong>{profileName(post.author)}</strong><span>{username(post.author)}{post.community?' · '+post.community.name:''} · {timeAgo(post.created_at)}</span></div>
      <em>{POST_TYPES.find(type=>type.value===post.post_type)?.label||post.post_type}</em>
      <button title={mine?'Delete post':'Report post'} onClick={mine?onDelete:onReport}>{mine?<X/>:<Flag/>}</button>
    </header>
    {post.body?<p className="vxsoc-post-body">{post.body}</p>:null}
    {post.image_url?<div className="vxsoc-post-image" style={{backgroundImage:'url("'+post.image_url.replaceAll('"','')+'")'}}/>:null}
    {post.products.length?<div className="vxsoc-product-tags">{post.products.map(tag=><ProductChip key={tag.id} tag={tag}/>)}</div>:null}
    {post.setup?<div className="vxsoc-setup-tag"><Layers3/><span><strong>{post.setup.safe_snapshot.name||'Shared Setup'}</strong><small>{post.setup.safe_snapshot.mode||'Shared snapshot'} · {post.setup.safe_snapshot.itemCount??0} intentionally shared items</small></span><b>Safe snapshot</b></div>:null}
    <footer>
      <button className={post.likedByMe?'active':''} onClick={onLike}><Heart/>{post.likeCount}</button>
      <button onClick={onComment}><MessageCircle/>{post.commentCount}</button>
      <button onClick={()=>navigator.clipboard?.writeText(location.origin+'/social')}><Share2/>Share</button>
      <span>{post.visibility}</span>
    </footer>
    {commentOpen?<div className="vxsoc-comments">
      {post.comments.map(item=><div key={item.id}><Avatar profile={post.commentAuthors[item.user_id]} size="sm"/><span><strong>{profileName(post.commentAuthors[item.user_id])}</strong><p>{item.body}</p></span><time>{timeAgo(item.created_at)}</time></div>)}
      <form onSubmit={e=>{e.preventDefault();if(comment.trim()){onSubmitComment(comment);setComment('')}}}><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Write a comment…"/><button type="submit">Reply</button></form>
    </div>:null}
  </article>;
}

function ProductChip({tag}:{tag:SocialFeedPost['products'][number]}){
  const snapshot=tag.product_snapshot||{};
  const href=tag.product_id?'/search/product/'+encodeURIComponent(tag.product_id):'';
  return <div className="vxsoc-product-chip">
    <div className="art" style={snapshot.imageUrl?{backgroundImage:'url("'+snapshot.imageUrl.replaceAll('"','')+'")'}:undefined}>{snapshot.imageUrl?'':<PackageOpen/>}</div>
    <span><strong>{snapshot.name||'VEXUM object'}</strong><small>{[snapshot.manufacturer,snapshot.line,snapshot.category].filter(Boolean).join(' · ')||'Portfolio-linked object'}</small></span>
    {typeof snapshot.market==='number'?<b>{money(snapshot.market)}</b>:null}
    {href?<button onClick={()=>location.assign(href)}>View Product</button>:<em>Owned-copy tag</em>}
  </div>;
}

function ContextRail({profile,profiles,followingIds,communities,memberships,drops,onFollow,onCommunity}:{
  profile?:SocialProfile;profiles:SocialProfile[];followingIds:string[];communities:SocialCommunity[];memberships:Set<string>;
  drops:SocialDropEvent[];onFollow:(id:string)=>void;onCommunity:(id:string)=>void;
}){
  return <aside className="vxsoc-rail">
    <section className="vxsoc-panel vxsoc-profile-mini"><Avatar profile={profile} size="lg"/><strong>{profileName(profile)}</strong><span>{username(profile)}</span><p>{profile?.bio||'Your collector profile is private-by-field. Collection values and Financial data are never exposed here automatically.'}</p></section>
    <section className="vxsoc-panel"><header><strong>YOUR COMMUNITIES</strong></header>{communities.filter(c=>memberships.has(c.id)).slice(0,5).map(c=><button className="vxsoc-rail-row" key={c.id} onClick={()=>onCommunity(c.id)}><span>{c.name.slice(0,1)}</span><div><strong>{c.name}</strong><small>{c.visibility}</small></div><ChevronRight/></button>)}{!communities.some(c=>memberships.has(c.id))?<p className="vxsoc-rail-empty">No communities joined.</p>:null}</section>
    <section className="vxsoc-panel"><header><strong>COLLECTORS</strong></header>{profiles.slice(0,5).map(p=><div className="vxsoc-person" key={p.id}><Avatar profile={p} size="sm"/><span><strong>{profileName(p)}</strong><small>{username(p)}</small></span><button onClick={()=>onFollow(p.id)}>{followingIds.includes(p.id)?'Following':'Follow'}</button></div>)}{!profiles.length?<p className="vxsoc-rail-empty">No other public collector profiles yet.</p>:null}</section>
    <section className="vxsoc-panel"><header><strong>ACTIVE DROPS</strong></header>{drops.slice(0,4).map(drop=><div className="vxsoc-drop-mini" key={drop.id}><Store/><span><strong>{drop.product_name}</strong><small>{drop.retailer} · {drop.stock_status.replaceAll('_',' ')}</small></span>{drop.price!==null?<b>{money(drop.price)}</b>:null}</div>)}{!drops.length?<p className="vxsoc-rail-empty">No provider-backed drops are available.</p>:null}</section>
  </aside>;
}

function CommunityStrip({communities,memberships,active,onSelect,onJoin,onCreate,busy}:{
  communities:SocialCommunity[];memberships:Set<string>;active:string;onSelect:(id:string)=>void;onJoin:(id:string)=>void;onCreate:()=>void;busy:boolean;
}){
  return <section className="vxsoc-panel vxsoc-community-strip"><header><div><strong>Communities</strong><span>Product-aware collector spaces</span></div><button onClick={onCreate}><Plus/>Create</button></header><div>{communities.map(c=><article key={c.id} className={active===c.id?'active':''}><button className="name" onClick={()=>onSelect(c.id)}><span>{c.name.slice(0,1)}</span><div><strong>{c.name}</strong><small>{c.description||'Collector community'}</small></div></button><button disabled={busy} onClick={()=>onJoin(c.id)}>{memberships.has(c.id)?'Joined':'Join'}</button></article>)}{!communities.length?<p>No communities exist yet. Create one around something you actually collect.</p>:null}</div></section>;
}

function DropsView({drops}:{drops:SocialDropEvent[]}){
  return <section className="vxsoc-panel vxsoc-special"><header><div><span>DROPS</span><h2>Provider-backed releases and stock events</h2><p>These rows come from VEXUM's drop-event data. Nothing is invented to make the page look busy.</p></div></header>{drops.map(drop=><div className="vxsoc-drop-row" key={drop.id}><div className="art" style={drop.image_url?{backgroundImage:'url("'+drop.image_url.replaceAll('"','')+'")'}:undefined}>{drop.image_url?'':<Store/>}</div><span><strong>{drop.product_name}</strong><small>{drop.retailer} · {drop.provider} · last seen {timeAgo(drop.last_seen)}</small></span><em>{drop.stock_status.replaceAll('_',' ')}</em><b>{drop.price!==null?money(drop.price):'Price unavailable'}</b>{drop.product_url?<button onClick={()=>window.open(drop.product_url,'_blank','noopener,noreferrer')}>Retailer</button>:null}</div>)}{!drops.length?<SocialEmpty icon={<Bell/>} title="No connected drops yet" body="When Search/Radar providers create real release or stock events, they appear here. Social does not manufacture release activity."/>:null}</section>;
}

function LocalView({reports}:{reports:SocialStockReport[]}){
  return <section className="vxsoc-panel vxsoc-special"><header><div><span>LOCAL</span><h2>Crowdsourced stock reports</h2><p>Store/venue labels only. Collector home addresses are never part of this surface.</p></div></header>{reports.map(report=><div className="vxsoc-local-row" key={report.id}><MapPin/><span><strong>{report.retailer||'Retailer'} · {report.store_label||'Store location'}</strong><small>{report.product_id} · reported {timeAgo(report.reported_at)} · community reported</small></span><em>{report.reported_status.replaceAll('_',' ')}</em>{report.reported_quantity!==null?<b>{report.reported_quantity} reported</b>:null}</div>)}{!reports.length?<SocialEmpty icon={<MapPin/>} title="No local stock reports yet" body="Local remains empty until a collector intentionally submits a crowdsourced store report. VEXUM will not infer or expose private residence information."/>:null}</section>;
}

function MessagesView(){
  return <section className="vxsoc-panel vxsoc-special"><SocialEmpty icon={<MessagesSquare/>} title="Messaging data model is ready" body="Conversation, membership, message, block, and RLS architecture are live. The realtime chat client is intentionally not pretending to be connected yet; that is the next messaging-specific implementation phase."/></section>;
}

function ProfileView({profile,workspace,onEdit,communities}:{profile:SocialProfile;workspace:any;onEdit:()=>void;communities:SocialCommunity[]}){
  const owned=workspace.items.filter((item:any)=>item.status==='owned');
  const wishlist=Object.values(workspace.wishlist||{}).filter((record:any)=>!record.archived);
  return <div className="vxsoc-profile-page">
    <section className="vxsoc-panel vxsoc-profile-header"><div className="banner"/><div className="identity"><Avatar profile={profile} size="lg"/><div><h2>{profileName(profile)}</h2><span>{username(profile)} · Member since {new Date(profile.created_at).getFullYear()}</span><p>{profile.bio||'No bio yet.'}</p></div><button onClick={onEdit}><Settings2/>Edit Profile</button></div></section>
    <div className="vxsoc-profile-metrics"><div><span>Owned items</span><strong>{profile.show_collection?owned.length:'Hidden'}</strong></div><div><span>Wishlist</span><strong>{profile.show_wishlist?wishlist.length:'Hidden'}</strong></div><div><span>Communities</span><strong>{communities.length}</strong></div><div><span>Collection value</span><strong>{profile.show_collection_value?money(owned.reduce((s:number,i:any)=>s+i.currentValue*i.quantity,0)):'Hidden'}</strong></div></div>
    <div className="vxsoc-profile-grid"><section className="vxsoc-panel"><header><strong>Featured Collection</strong></header><div className="vxsoc-profile-list">{workspace.collections.slice(0,5).map((c:any)=><div key={c.id}><Layers3/><span><strong>{c.name}</strong><small>{owned.filter((item:any)=>item.collectionId===c.id).length} owned records</small></span></div>)}{!workspace.collections.length?<p>No collections.</p>:null}</div></section><section className="vxsoc-panel"><header><strong>Privacy Summary</strong></header><div className="vxsoc-privacy-list"><span>Collections <b>{profile.show_collection?'Visible':'Hidden'}</b></span><span>Collection Value <b>{profile.show_collection_value?'Visible':'Hidden'}</b></span><span>Wishlist <b>{profile.show_wishlist?'Visible':'Hidden'}</b></span><span>Setups <b>{profile.show_setups?'Visible':'Hidden'}</b></span><span>Trades <b>{profile.show_trades?'Visible':'Hidden'}</b></span><span>Seller Profile <b>{profile.show_seller_profile?'Visible':'Hidden'}</b></span></div></section></div>
  </div>;
}

function PostComposer({profile,communities,products,setups,collections,onClose,onSave,busy}:{
  profile?:SocialProfile;communities:SocialCommunity[];products:Array<{key:string;label:string;sub:string;tag:ComposerTag}>;
  setups:Array<{id:string;name:string;mode:string}>;collections:Array<{id:string;name:string}>;onClose:()=>void;
  onSave:(input:{postType:SocialPostType;text:string;visibility:SocialVisibility;communityId?:string;products:ComposerTag[];setup?:{setupId:string;safeSnapshot:any};collectionIds:string[];metadata:Record<string,unknown>;imageUrl:string})=>void;busy:boolean;
}){
  const [text,setText]=useState('');
  const [type,setType]=useState<SocialPostType>('standard');
  const [visibility,setVisibility]=useState<SocialVisibility>('public');
  const [communityId,setCommunityId]=useState('');
  const [productKey,setProductKey]=useState('');
  const [tags,setTags]=useState<ComposerTag[]>([]);
  const [setupId,setSetupId]=useState('');
  const [collectionId,setCollectionId]=useState('');
  const [imageUrl,setImageUrl]=useState('');
  const selectedSetup=setups.find(s=>s.id===setupId);
  const addTag=()=>{
    const option=products.find(p=>p.key===productKey);
    if(!option)return;
    if(tags.some(tag=>tag.product_id===option.tag.product_id&&tag.portfolio_item_id===option.tag.portfolio_item_id))return;
    setTags(current=>[...current,option.tag]);setProductKey('');
  };
  const file=(event:ChangeEvent<HTMLInputElement>)=>{
    const f=event.target.files?.[0];if(!f)return;
    if(f.size>8*1024*1024)return;
    const reader=new FileReader();reader.onload=()=>setImageUrl(String(reader.result||''));reader.readAsDataURL(f);
  };
  return <VexumDialog open onClose={onClose} title="Create Post" description="Structured collector context stays attached to the post." size="lg" className="vxsoc-shared-dialog vxsoc-composer">
    <div className="vxsoc-compose-controls"><label>Post Type<select value={type} onChange={e=>setType(e.target.value as SocialPostType)}>{POST_TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label><label>Visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as SocialVisibility)}>{VISIBILITIES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>{visibility==='community'?<label>Community<select value={communityId} onChange={e=>setCommunityId(e.target.value)}><option value="">Select community</option>{communities.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:null}</div>
    <textarea value={text} maxLength={1200} onChange={e=>setText(e.target.value)} placeholder="What changed in your collection?"/>
    <div className="vxsoc-compose-add"><label><Tag/>Product / Owned Copy<select value={productKey} onChange={e=>setProductKey(e.target.value)}><option value="">Choose VEXUM object</option>{products.map(p=><option key={p.key} value={p.key}>{p.label} — {p.sub}</option>)}</select><button onClick={addTag} disabled={!productKey}>Add</button></label>{setups.length?<label><Layers3/>Setup<select value={setupId} onChange={e=>setSetupId(e.target.value)}><option value="">No setup</option>{setups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:null}{collections.length?<label><Layers3/>Collection<select value={collectionId} onChange={e=>setCollectionId(e.target.value)}><option value="">No collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:null}<label className="file"><ImageIcon/>Image<input type="file" accept="image/*" onChange={file}/><span>{imageUrl?'Selected':'Choose image'}</span></label></div>
    {tags.length?<div className="vxsoc-compose-tags">{tags.map((tag,index)=><span key={index}>{tag.product_snapshot.name||'VEXUM object'}<button onClick={()=>setTags(rows=>rows.filter((_,i)=>i!==index))}>×</button></span>)}</div>:null}
    {imageUrl?<div className="vxsoc-compose-preview" style={{backgroundImage:'url("'+imageUrl.replaceAll('"','')+'")'}}/>:null}
    <footer><span>{text.length}/1200 · Financial values, cost basis, and exact Setup storage paths are never attached automatically.</span><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||(!text.trim()&&!tags.length&&!imageUrl)||(visibility==='community'&&!communityId)} onClick={()=>onSave({
      postType:type,text,visibility,communityId:visibility==='community'?communityId:undefined,products:tags,
      setup:selectedSetup?{setupId:selectedSetup.id,safeSnapshot:{name:selectedSetup.name,mode:selectedSetup.mode,itemCount:0}}:undefined,
      collectionIds:collectionId?[collectionId]:[],metadata:{},imageUrl
    })}>{busy?'Posting…':'Post'}</button></footer>
  </VexumDialog>;
}

function CommunityComposer({onClose,onSave,busy}:{onClose:()=>void;onSave:(input:{name:string;description:string;visibility:'public'|'private'})=>void;busy:boolean}){
  const [name,setName]=useState('');const [description,setDescription]=useState('');const [visibility,setVisibility]=useState<'public'|'private'>('public');
  return <VexumDialog open onClose={onClose} title="Create Community" description="Start with a product-aware feed. Channels and realtime chat can layer on later." size="sm" className="vxsoc-shared-dialog"><div className="vxsoc-form"><label>Name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Marvel Legends"/></label><label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Collectors, releases, setups, trades, and product knowledge."/></label><label>Visibility<select value={visibility} onChange={e=>setVisibility(e.target.value as 'public'|'private')}><option value="public">Public</option><option value="private">Private</option></select></label></div><footer><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||name.trim().length<3} onClick={()=>onSave({name,description,visibility})}>Create</button></footer></VexumDialog>;
}

function ProfileEditor({profile,onClose,onSave,busy}:{profile:SocialProfile;onClose:()=>void;onSave:(patch:Partial<SocialProfile>)=>void;busy:boolean}){
  const [displayName,setDisplayName]=useState(profile.display_name);const [usernameValue,setUsername]=useState(profile.username||'');const [bio,setBio]=useState(profile.bio);const [region,setRegion]=useState(profile.region);
  const [showCollection,setShowCollection]=useState(profile.show_collection);const [showValue,setShowValue]=useState(profile.show_collection_value);const [showWishlist,setShowWishlist]=useState(profile.show_wishlist);const [showSetups,setShowSetups]=useState(profile.show_setups);const [showTrades,setShowTrades]=useState(profile.show_trades);const [showAchievements,setShowAchievements]=useState(profile.show_achievements);const [showSeller,setShowSeller]=useState(profile.show_seller_profile);const [landing,setLanding]=useState(profile.default_social_landing);
  return <VexumDialog open onClose={onClose} title="Edit Collector Profile" description="Collection value, Setup, trades, and Wishlist each have separate visibility." size="lg" className="vxsoc-shared-dialog"><div className="vxsoc-form grid"><label>Display name<input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label><label>Username<input value={usernameValue} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="collector"/></label><label className="wide">Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} maxLength={300}/></label><label>Region / City only<input value={region} onChange={e=>setRegion(e.target.value)} placeholder="New Jersey"/></label><label>Default Social landing<select value={landing} onChange={e=>setLanding(e.target.value as SocialProfile['default_social_landing'])}><option value="for_you">For You</option><option value="following">Following</option><option value="communities">Communities</option></select></label><div className="wide vxsoc-switch-grid">{[['Show collections',showCollection,setShowCollection],['Show collection value',showValue,setShowValue],['Show Wishlist',showWishlist,setShowWishlist],['Show Setups',showSetups,setShowSetups],['Show trades',showTrades,setShowTrades],['Show achievements',showAchievements,setShowAchievements],['Show seller profile',showSeller,setShowSeller]].map(([label,value,setter])=><label className="switch" key={String(label)}><input type="checkbox" checked={Boolean(value)} onChange={e=>(setter as any)(e.target.checked)}/><span>{String(label)}</span></label>)}</div></div><footer><button onClick={onClose}>Cancel</button><button className="red" disabled={busy||displayName.trim().length<1} onClick={()=>onSave({display_name:displayName.trim(),username:usernameValue.trim()||null,bio:bio.trim(),region:region.trim(),show_collection:showCollection,show_collection_value:showValue,show_wishlist:showWishlist,show_setups:showSetups,show_trades:showTrades,show_achievements:showAchievements,show_seller_profile:showSeller,default_social_landing:landing})}>Save Profile</button></footer></VexumDialog>;
}

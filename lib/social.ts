import type {CloudConfig} from './cloud';
import {freshSession} from './cloud';
import type {Collection,Item,Store} from './model';

export type SocialProfile={
  id:string;username:string|null;display_name:string;bio:string;avatar_url:string;banner_url:string;niches:string[];shopping_zip:string;
  is_public:boolean;show_collection:boolean;show_collection_value:boolean;show_wishlist:boolean;auto_post_additions:boolean;created_at:string;updated_at:string;
};
export type SocialPost={
  id:string;user_id:string;kind:'post'|'collection_add'|'set_complete';body:string;image_url:string;item_id:string;item_name:string;item_image:string;collection_name:string;
  niche_tags:string[];metadata:Record<string,unknown>;source_key?:string|null;created_at:string;profile?:SocialProfile;likeCount:number;commentCount:number;reactionCounts:Record<string,number>;
  likedByMe:boolean;myReactions:string[];
};
export type SocialComment={id:string;post_id:string;user_id:string;body:string;created_at:string;profile?:SocialProfile};
export type DropEvent={id:string;provider:string;retailer:string;external_id:string;product_name:string;image_url:string;product_url:string;price:number|null;msrp:number|null;currency:string;stock_status:string;niche_tags:string[];metadata:Record<string,unknown>;first_seen:string;last_seen:string};
export type PublicItem={user_id:string;item_id:string;status:'owned'|'wishlist';name:string;image_url:string;category:string;collection_name:string;quantity:number;updated_at:string};
export type ProfileStats={followers:number;following:number;posts:number};

async function rest<T>(config:CloudConfig,path:string,options:RequestInit={},prefer?:string):Promise<T>{
  const session=await freshSession(config);
  const r=await fetch(config.url+'/rest/v1/'+path,{...options,headers:{apikey:config.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{}),...(options.headers||{})},cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body.message||body.error||body.hint||'Social request failed.');}
  if(r.status===204)return null as T;
  const text=await r.text();return (text?JSON.parse(text):null) as T;
}
function qs(params:Record<string,string>){return new URLSearchParams(params).toString()}
function unique<T>(a:T[]){return [...new Set(a)]}
function norm(v:string){return v.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim()}
function nicheTagsForItem(item:Item){
  const values=[item.category,item.identity?.brand,item.identity?.series,item.customFields?.Franchise,item.customFields?.Set,item.customFields?.Series,item.name];
  const joined=norm(values.filter(Boolean).join(' '));
  const tags:string[]=[];
  const rules:[RegExp,string][]=[
    [/pok[eé]mon/,'Pokémon'],[/magic the gathering|\bmtg\b/,'Magic: The Gathering'],[/union arena/,'Union Arena'],[/jujutsu kaisen|\bjjk\b/,'Jujutsu Kaisen'],[/one piece/,'One Piece TCG'],[/lorcana/,'Disney Lorcana'],[/yu gi oh|yugioh/,'Yu-Gi-Oh!'],
    [/marvel legends/,'Marvel Legends'],[/spider man|spiderman/,'Spider-Man'],[/mcfarlane/,'McFarlane Toys'],[/funko/,'Funko'],[/mafex/,'MAFEX'],[/figuarts/,'S.H.Figuarts'],[/hot toys/,'Hot Toys'],[/neca/,'NECA'],[/zd toys/,'ZD Toys'],[/pop mart|skullpanda|hirono|crybaby/,'Pop Mart'],[/sonny angel/,'Sonny Angel'],
    [/lego/,'LEGO'],[/comic/,'Comics'],[/marvel/,'Marvel'],[/\bdc\b|dc comics/,'DC Comics'],[/baseball|basketball|football|hockey|topps|panini|upper deck/,'Sports Cards']
  ];
  for(const [re,label] of rules)if(re.test(joined))tags.push(label);
  return unique(tags).slice(0,12);
}
export {nicheTagsForItem};

export async function ensureMyProfile(config:CloudConfig,fallbackName='Collector'){
  const session=await freshSession(config), id=session.user.id;
  let rows=await rest<SocialProfile[]>(config,'collector_profiles?'+qs({id:'eq.'+id,select:'*'}));
  if(rows[0])return rows[0];
  const base=(session.user.email?.split('@')[0]||fallbackName||'collector').replace(/[^a-zA-Z0-9_]/g,'').slice(0,20)||'collector';
  const payload={id,username:(base+'_'+id.replace(/-/g,'').slice(0,5)).toLowerCase(),display_name:fallbackName||base};
  rows=await rest<SocialProfile[]>(config,'collector_profiles',{method:'POST',body:JSON.stringify(payload)},'return=representation');
  return rows[0];
}
export async function getProfile(config:CloudConfig,id:string){const rows=await rest<SocialProfile[]>(config,'collector_profiles?'+qs({id:'eq.'+id,select:'*'}));return rows[0]||null}
export async function saveMyProfile(config:CloudConfig,patch:Partial<SocialProfile>){
  const session=await freshSession(config);const body={...patch,updated_at:new Date().toISOString()};
  const rows=await rest<SocialProfile[]>(config,'collector_profiles?'+qs({id:'eq.'+session.user.id}),{method:'PATCH',body:JSON.stringify(body)},'return=representation');return rows[0];
}
export async function getProfiles(config:CloudConfig,ids:string[]){
  ids=unique(ids.filter(Boolean));if(!ids.length)return new Map<string,SocialProfile>();
  const rows=await rest<SocialProfile[]>(config,'collector_profiles?'+qs({id:`in.(${ids.join(',')})`,select:'*'}));return new Map(rows.map(x=>[x.id,x]));
}
export async function profileStats(config:CloudConfig,userId:string):Promise<ProfileStats>{
  const [followers,following,posts]=await Promise.all([
    rest<any[]>(config,'collector_follows?'+qs({following_id:'eq.'+userId,select:'follower_id'})),
    rest<any[]>(config,'collector_follows?'+qs({follower_id:'eq.'+userId,select:'following_id'})),
    rest<any[]>(config,'collector_posts?'+qs({user_id:'eq.'+userId,select:'id'}))
  ]);return {followers:followers.length,following:following.length,posts:posts.length};
}
export async function followState(config:CloudConfig,userId:string){const session=await freshSession(config);if(session.user.id===userId)return false;const rows=await rest<any[]>(config,'collector_follows?'+qs({follower_id:'eq.'+session.user.id,following_id:'eq.'+userId,select:'following_id'}));return !!rows.length}
export async function setFollowing(config:CloudConfig,userId:string,follow:boolean){const session=await freshSession(config);if(session.user.id===userId)return;if(follow)await rest(config,'collector_follows',{method:'POST',body:JSON.stringify({follower_id:session.user.id,following_id:userId})},'return=minimal');else await rest(config,'collector_follows?'+qs({follower_id:'eq.'+session.user.id,following_id:'eq.'+userId}),{method:'DELETE'},'return=minimal')}

async function engagement(config:CloudConfig,postIds:string[]){
  const session=await freshSession(config);if(!postIds.length)return {likes:[] as any[],reactions:[] as any[],comments:[] as any[],me:session.user.id};const filter=`in.(${postIds.join(',')})`;
  const [likes,reactions,comments]=await Promise.all([
    rest<any[]>(config,'collector_post_likes?'+qs({post_id:filter,select:'post_id,user_id'})),
    rest<any[]>(config,'collector_post_reactions?'+qs({post_id:filter,select:'post_id,user_id,emoji'})),
    rest<any[]>(config,'collector_post_comments?'+qs({post_id:filter,select:'id,post_id,user_id'}))
  ]);return {likes,reactions,comments,me:session.user.id};
}
export async function listPosts(config:CloudConfig,mode:'feed'|'foryou'|'mine'|'profile',niches:string[]=[],profileId?:string):Promise<SocialPost[]>{
  const session=await freshSession(config);let filter='';
  if(mode==='mine')filter='user_id=eq.'+session.user.id+'&';
  else if(mode==='profile'&&profileId)filter='user_id=eq.'+profileId+'&';
  else if(mode==='feed'){
    const follows=await rest<any[]>(config,'collector_follows?'+qs({follower_id:'eq.'+session.user.id,select:'following_id'}));
    const ids=unique([session.user.id,...follows.map(x=>String(x.following_id))]);filter='user_id=in.('+ids.join(',')+')&';
  }
  const rows=await rest<any[]>(config,'collector_posts?'+filter+'select=*&order=created_at.desc&limit=80');
  let filtered=rows;
  if(mode==='foryou'&&niches.length){const set=new Set(niches.map(norm));filtered=rows.filter(p=>(p.niche_tags||[]).some((n:string)=>set.has(norm(n)))).slice(0,50)}
  const profiles=await getProfiles(config,filtered.map(p=>p.user_id));const e=await engagement(config,filtered.map(p=>p.id));
  return filtered.map(p=>{
    const likes=e.likes.filter(x=>x.post_id===p.id), reactions=e.reactions.filter(x=>x.post_id===p.id), comments=e.comments.filter(x=>x.post_id===p.id), rc:Record<string,number>={};for(const r of reactions)rc[r.emoji]=(rc[r.emoji]||0)+1;
    return {...p,profile:profiles.get(p.user_id),likeCount:likes.length,commentCount:comments.length,reactionCounts:rc,likedByMe:likes.some(x=>x.user_id===e.me),myReactions:reactions.filter(x=>x.user_id===e.me).map(x=>x.emoji)} as SocialPost;
  });
}
export async function createPost(config:CloudConfig,input:{body:string;image_url?:string;item?:Item|null;collection_name?:string;niche_tags?:string[]}){
  const session=await freshSession(config), item=input.item||null;const payload={user_id:session.user.id,kind:'post',body:input.body.trim(),image_url:input.image_url||'',item_id:item?.id||'',item_name:item?.name||'',item_image:item?.image||'',collection_name:input.collection_name||'',niche_tags:unique([...(input.niche_tags||[]),...(item?nicheTagsForItem(item):[])])};
  const rows=await rest<SocialPost[]>(config,'collector_posts',{method:'POST',body:JSON.stringify(payload)},'return=representation');return rows[0];
}
export async function createCollectionAddPost(config:CloudConfig,item:Item,collection?:Collection){
  const profile=await ensureMyProfile(config);if(!profile.auto_post_additions)return null;const session=await freshSession(config);const source_key=`collection_add:${item.id}:${item.updatedAt}`;
  const exists=await rest<any[]>(config,'collector_posts?'+qs({source_key:'eq.'+source_key,select:'id'}));if(exists.length)return null;
  const payload={user_id:session.user.id,kind:'collection_add',body:'',item_id:item.id,item_name:item.name,item_image:item.image||'',collection_name:collection?.name||'',niche_tags:nicheTagsForItem(item),source_key,metadata:{quantity:item.quantity}};
  const rows=await rest<SocialPost[]>(config,'collector_posts',{method:'POST',body:JSON.stringify(payload)},'return=representation');return rows[0];
}
export async function toggleLike(config:CloudConfig,postId:string,liked:boolean){const session=await freshSession(config);if(liked)return rest(config,'collector_post_likes?'+qs({post_id:'eq.'+postId,user_id:'eq.'+session.user.id}),{method:'DELETE'},'return=minimal');return rest(config,'collector_post_likes',{method:'POST',body:JSON.stringify({post_id:postId,user_id:session.user.id})},'return=minimal')}
export async function toggleReaction(config:CloudConfig,postId:string,emoji:string,active:boolean){const session=await freshSession(config);if(active)return rest(config,'collector_post_reactions?'+qs({post_id:'eq.'+postId,user_id:'eq.'+session.user.id,emoji:'eq.'+emoji}),{method:'DELETE'},'return=minimal');return rest(config,'collector_post_reactions',{method:'POST',body:JSON.stringify({post_id:postId,user_id:session.user.id,emoji})},'return=minimal')}
export async function listComments(config:CloudConfig,postId:string):Promise<SocialComment[]>{const rows=await rest<any[]>(config,'collector_post_comments?'+qs({post_id:'eq.'+postId,select:'*',order:'created_at.asc',limit:'100'}));const profiles=await getProfiles(config,rows.map(x=>x.user_id));return rows.map(x=>({...x,profile:profiles.get(x.user_id)}))}
export async function addComment(config:CloudConfig,postId:string,body:string){const session=await freshSession(config);return rest(config,'collector_post_comments',{method:'POST',body:JSON.stringify({post_id:postId,user_id:session.user.id,body:body.trim()})},'return=minimal')}

export async function listDrops(config:CloudConfig,niches:string[]):Promise<DropEvent[]>{
  const rows=await rest<DropEvent[]>(config,'collector_drop_events?'+qs({select:'*',stock_status:'eq.IN_STOCK',order:'last_seen.desc',limit:'100'}));
  if(!niches.length)return rows.slice(0,30);const set=new Set(niches.map(norm));return rows.filter(x=>(x.niche_tags||[]).some(n=>set.has(norm(n)))).slice(0,40);
}
export async function listPublicItems(config:CloudConfig,userId:string,status?:'owned'|'wishlist'){let path='collector_public_items?'+qs({user_id:'eq.'+userId,select:'*',order:'updated_at.desc',limit:'300'});if(status)path+='&status=eq.'+status;return rest<PublicItem[]>(config,path)}
export async function syncPublicItems(config:CloudConfig,store:Store){
  const session=await freshSession(config);await ensureMyProfile(config,store.profile?.name||'Collector');const id=session.user.id;
  await rest(config,'collector_public_items?'+qs({user_id:'eq.'+id}),{method:'DELETE'},'return=minimal');
  const collections=new Map(store.collections.map(c=>[c.id,c.name]));const rows=store.items.filter(i=>i.status==='owned'||i.status==='wishlist').map(i=>({user_id:id,item_id:i.id,status:i.status,name:i.name,image_url:i.image||'',category:i.category||'',collection_name:collections.get(i.collectionId)||'',quantity:i.quantity,updated_at:i.updatedAt||new Date().toISOString()}));
  for(let i=0;i<rows.length;i+=150){const batch=rows.slice(i,i+150);if(batch.length)await rest(config,'collector_public_items',{method:'POST',body:JSON.stringify(batch)},'return=minimal')}
}

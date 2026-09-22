import type {CloudConfig,Session} from './cloud';
import {postgrestIn,qs,supabaseRest} from './supabaseRest';

export type SocialPostType='standard'|'pickup'|'collection_update'|'setup'|'question'|'review'|'trade'|'sale'|'restock'|'drop'|'milestone';
export type SocialVisibility='public'|'followers'|'community'|'private';

export type SocialProfile={
  id:string;
  username:string|null;
  display_name:string;
  bio:string;
  avatar_url:string;
  banner_url:string;
  niches:string[];
  region:string;
  is_public:boolean;
  show_collection:boolean;
  show_collection_value:boolean;
  show_wishlist:boolean;
  show_setups:boolean;
  show_trades:boolean;
  show_achievements:boolean;
  show_seller_profile:boolean;
  default_social_landing:'for_you'|'following'|'communities';
  created_at:string;
  updated_at:string;
};

export type SocialCommunity={
  id:string;
  slug:string;
  name:string;
  description:string;
  image_url:string;
  banner_url:string;
  visibility:'public'|'private';
  owner_user_id:string;
  created_at:string;
  updated_at:string;
};

export type SocialProductTag={
  id:string;
  post_id:string;
  product_id:string|null;
  portfolio_item_id:string|null;
  tag_type:'product'|'owned_copy'|'wanted'|'trade'|'sale';
  product_snapshot:{
    name?:string;
    imageUrl?:string;
    category?:string;
    line?:string;
    manufacturer?:string;
    market?:number;
  };
  created_at:string;
};

export type SocialSetupTag={
  post_id:string;
  setup_id:string;
  safe_snapshot:{name?:string;mode?:string;itemCount?:number;preview?:string};
  created_at:string;
};

export type SocialComment={
  id:string;
  post_id:string;
  user_id:string;
  parent_comment_id:string|null;
  body:string;
  created_at:string;
};

export type SocialPostRow={
  id:string;
  user_id:string;
  kind:string;
  post_type:SocialPostType;
  body:string;
  image_url:string;
  item_id:string;
  item_name:string;
  item_image:string;
  collection_name:string;
  niche_tags:string[];
  metadata:Record<string,unknown>;
  visibility:SocialVisibility;
  community_id:string|null;
  created_at:string;
  source_key:string|null;
};

export type SocialFeedPost=SocialPostRow&{
  author?:SocialProfile;
  community?:SocialCommunity;
  products:SocialProductTag[];
  setup?:SocialSetupTag;
  likeCount:number;
  commentCount:number;
  likedByMe:boolean;
  comments:SocialComment[];
  commentAuthors:Record<string,SocialProfile>;
};

export type SocialDropEvent={
  id:string;
  provider:string;
  retailer:string;
  external_id:string;
  product_name:string;
  image_url:string;
  product_url:string;
  price:number|null;
  msrp:number|null;
  currency:string;
  stock_status:string;
  niche_tags:string[];
  metadata:Record<string,unknown>;
  first_seen:string;
  last_seen:string;
};

export type SocialStockReport={
  id:string;
  user_id:string;
  product_id:string;
  retailer:string;
  store_label:string;
  reported_status:'in_stock'|'low_stock'|'sold_out'|'not_seen';
  reported_quantity:number|null;
  reported_at:string;
  note:string;
  created_at:string;
};

type ProfileSeed={displayName?:string;avatarUrl?:string};

function uuidIn(values:string[]){return 'in.('+values.join(',')+')'}

export async function ensureCollectorProfile(config:CloudConfig,session:Session,seed:ProfileSeed={}){
  const rows=await supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({id:'eq.'+session.user.id,select:'*',limit:1}));
  if(rows[0])return rows[0];
  const fallback=(session.user.email||'Collector').split('@')[0]||'Collector';
  const created=await supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles',{
    method:'POST',
    body:JSON.stringify({
      id:session.user.id,
      display_name:seed.displayName?.trim()||fallback,
      avatar_url:seed.avatarUrl||'',
      is_public:true,
      show_collection:true,
      show_collection_value:false,
      show_wishlist:true,
      show_setups:false,
      show_trades:true,
      show_achievements:true,
      show_seller_profile:true
    })
  },'return=representation');
  return created[0];
}

export async function updateSocialProfile(config:CloudConfig,session:Session,patch:Partial<SocialProfile>){
  const rows=await supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({id:'eq.'+session.user.id}),{
    method:'PATCH',
    body:JSON.stringify({...patch,id:undefined,updated_at:new Date().toISOString()})
  },'return=representation');
  return rows[0];
}

export async function listPublicProfiles(config:CloudConfig,session:Session|null,limit=8){
  return supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({
    select:'*',is_public:'eq.true',order:'updated_at.desc',limit
  }));
}

export async function listFollowingIds(config:CloudConfig,session:Session){
  const rows=await supabaseRest<Array<{following_id:string}>>(config,session,'/rest/v1/collector_follows?'+qs({
    follower_id:'eq.'+session.user.id,select:'following_id'
  }));
  return rows.map(row=>row.following_id);
}

export async function followCollector(config:CloudConfig,session:Session,userId:string){
  await supabaseRest(config,session,'/rest/v1/collector_follows',{
    method:'POST',body:JSON.stringify({follower_id:session.user.id,following_id:userId})
  },'resolution=ignore-duplicates,return=minimal');
}

export async function unfollowCollector(config:CloudConfig,session:Session,userId:string){
  await supabaseRest(config,session,'/rest/v1/collector_follows?'+qs({
    follower_id:'eq.'+session.user.id,following_id:'eq.'+userId
  }),{method:'DELETE'});
}

export async function blockCollector(config:CloudConfig,session:Session,userId:string){
  await supabaseRest(config,session,'/rest/v1/collector_blocks',{
    method:'POST',body:JSON.stringify({blocker_user_id:session.user.id,blocked_user_id:userId})
  },'resolution=ignore-duplicates,return=minimal');
  await unfollowCollector(config,session,userId).catch(()=>{});
}

export async function unblockCollector(config:CloudConfig,session:Session,userId:string){
  await supabaseRest(config,session,'/rest/v1/collector_blocks?'+qs({
    blocker_user_id:'eq.'+session.user.id,blocked_user_id:'eq.'+userId
  }),{method:'DELETE'});
}

export async function listCommunities(config:CloudConfig,session:Session|null){
  const communities=await supabaseRest<SocialCommunity[]>(config,session,'/rest/v1/collector_communities?'+qs({
    select:'*',order:'name.asc',limit:100
  }));
  let memberships:Array<{community_id:string;role:string;status:string}>=[];
  if(session){
    memberships=await supabaseRest(config,session,'/rest/v1/collector_community_members?'+qs({
      user_id:'eq.'+session.user.id,select:'community_id,role,status'
    }));
  }
  return {communities,memberships};
}

function slugify(value:string){
  return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48);
}

export async function createCommunity(config:CloudConfig,session:Session,input:{name:string;description:string;visibility:'public'|'private'}){
  const base=slugify(input.name)||'community';
  const slug=base+'-'+Math.random().toString(36).slice(2,7);
  const rows=await supabaseRest<SocialCommunity[]>(config,session,'/rest/v1/collector_communities',{
    method:'POST',
    body:JSON.stringify({
      slug,name:input.name.trim(),description:input.description.trim(),visibility:input.visibility,
      owner_user_id:session.user.id
    })
  },'return=representation');
  const community=rows[0];
  if(community){
    await supabaseRest(config,session,'/rest/v1/collector_community_members',{
      method:'POST',
      body:JSON.stringify({community_id:community.id,user_id:session.user.id,role:'owner',status:'active'})
    },'resolution=ignore-duplicates,return=minimal');
  }
  return community;
}

export async function joinCommunity(config:CloudConfig,session:Session,communityId:string){
  await supabaseRest(config,session,'/rest/v1/collector_community_members',{
    method:'POST',
    body:JSON.stringify({community_id:communityId,user_id:session.user.id,role:'member',status:'active'})
  },'resolution=ignore-duplicates,return=minimal');
}

export async function leaveCommunity(config:CloudConfig,session:Session,communityId:string){
  await supabaseRest(config,session,'/rest/v1/collector_community_members?'+qs({
    community_id:'eq.'+communityId,user_id:'eq.'+session.user.id
  }),{method:'DELETE'});
}

export async function loadSocialFeed(
  config:CloudConfig,
  session:Session|null,
  mode:'for_you'|'following'|'community',
  communityId?:string
):Promise<SocialFeedPost[]>{
  let authorFilter:string|undefined;
  if(mode==='following'){
    if(!session)return [];
    const ids=await listFollowingIds(config,session);
    if(!ids.length)return [];
    authorFilter=uuidIn(ids);
  }
  const params:Record<string,string|number|undefined>={
    select:'*',
    order:'created_at.desc',
    limit:50
  };
  if(authorFilter)params.user_id=authorFilter;
  if(mode==='community'&&communityId)params.community_id='eq.'+communityId;
  const posts=await supabaseRest<SocialPostRow[]>(config,session,'/rest/v1/collector_posts?'+qs(params));
  if(!posts.length)return [];
  const postIds=posts.map(post=>post.id);
  const authorIds=[...new Set(posts.map(post=>post.user_id))];
  const communityIds=[...new Set(posts.map(post=>post.community_id).filter(Boolean) as string[])];

  const [profiles,productTags,setupTags,likes,comments,communities]=await Promise.all([
    supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({id:uuidIn(authorIds),select:'*'})),
    supabaseRest<SocialProductTag[]>(config,session,'/rest/v1/collector_post_products?'+qs({post_id:uuidIn(postIds),select:'*'})),
    supabaseRest<SocialSetupTag[]>(config,session,'/rest/v1/collector_post_setups?'+qs({post_id:uuidIn(postIds),select:'*'})),
    supabaseRest<Array<{post_id:string;user_id:string}>>(config,session,'/rest/v1/collector_post_likes?'+qs({post_id:uuidIn(postIds),select:'post_id,user_id'})),
    supabaseRest<SocialComment[]>(config,session,'/rest/v1/collector_post_comments?'+qs({post_id:uuidIn(postIds),select:'*',order:'created_at.asc'})),
    communityIds.length?supabaseRest<SocialCommunity[]>(config,session,'/rest/v1/collector_communities?'+qs({id:uuidIn(communityIds),select:'*'})):Promise.resolve([])
  ]);
  const commentAuthorIds=[...new Set(comments.map(comment=>comment.user_id))];
  const missing=commentAuthorIds.filter(id=>!profiles.some(profile=>profile.id===id));
  const commentProfiles=missing.length
    ?await supabaseRest<SocialProfile[]>(config,session,'/rest/v1/collector_profiles?'+qs({id:uuidIn(missing),select:'*'}))
    :[];
  const profileMap=Object.fromEntries([...profiles,...commentProfiles].map(profile=>[profile.id,profile]));
  const communityMap=Object.fromEntries(communities.map(community=>[community.id,community]));
  const setupMap=Object.fromEntries(setupTags.map(tag=>[tag.post_id,tag]));
  const me=session?.user.id;
  return posts.map(post=>{
    const postComments=comments.filter(comment=>comment.post_id===post.id);
    return {
      ...post,
      author:profileMap[post.user_id],
      community:post.community_id?communityMap[post.community_id]:undefined,
      products:productTags.filter(tag=>tag.post_id===post.id),
      setup:setupMap[post.id],
      likeCount:likes.filter(like=>like.post_id===post.id).length,
      commentCount:postComments.length,
      likedByMe:Boolean(me&&likes.some(like=>like.post_id===post.id&&like.user_id===me)),
      comments:postComments,
      commentAuthors:profileMap
    };
  });
}

export async function createSocialPost(config:CloudConfig,session:Session,input:{
  postType:SocialPostType;
  text:string;
  visibility:SocialVisibility;
  communityId?:string;
  products?:Array<Omit<SocialProductTag,'id'|'post_id'|'created_at'>>;
  setup?:{setupId:string;safeSnapshot:SocialSetupTag['safe_snapshot']};
  collectionIds?:string[];
  metadata?:Record<string,unknown>;
  imageUrl?:string;
}){
  const rows=await supabaseRest<SocialPostRow[]>(config,session,'/rest/v1/collector_posts',{
    method:'POST',
    body:JSON.stringify({
      user_id:session.user.id,
      kind:'post',
      post_type:input.postType,
      body:input.text.trim(),
      visibility:input.visibility,
      community_id:input.communityId||null,
      metadata:input.metadata||{},
      image_url:input.imageUrl||''
    })
  },'return=representation');
  const post=rows[0];
  if(!post)throw new Error('Post could not be created.');
  try{
    if(input.products?.length){
      await supabaseRest(config,session,'/rest/v1/collector_post_products',{
        method:'POST',
        body:JSON.stringify(input.products.map(tag=>({
          post_id:post.id,
          product_id:tag.product_id||null,
          portfolio_item_id:tag.portfolio_item_id||null,
          tag_type:tag.tag_type,
          product_snapshot:tag.product_snapshot||{}
        })))
      },'return=minimal');
    }
    if(input.setup){
      await supabaseRest(config,session,'/rest/v1/collector_post_setups',{
        method:'POST',
        body:JSON.stringify({post_id:post.id,setup_id:input.setup.setupId,safe_snapshot:input.setup.safeSnapshot})
      },'return=minimal');
    }
    if(input.collectionIds?.length){
      await supabaseRest(config,session,'/rest/v1/collector_post_collections',{
        method:'POST',
        body:JSON.stringify(input.collectionIds.map(collection_id=>({post_id:post.id,collection_id})))
      },'return=minimal');
    }
  }catch(error){
    await supabaseRest(config,session,'/rest/v1/collector_posts?'+qs({id:'eq.'+post.id}),{method:'DELETE'}).catch(()=>{});
    throw error;
  }
  return post;
}

export async function deleteSocialPost(config:CloudConfig,session:Session,postId:string){
  await supabaseRest(config,session,'/rest/v1/collector_posts?'+qs({id:'eq.'+postId}),{method:'DELETE'});
}

export async function togglePostLike(config:CloudConfig,session:Session,postId:string,liked:boolean){
  if(liked){
    await supabaseRest(config,session,'/rest/v1/collector_post_likes?'+qs({
      post_id:'eq.'+postId,user_id:'eq.'+session.user.id
    }),{method:'DELETE'});
  }else{
    await supabaseRest(config,session,'/rest/v1/collector_post_likes',{
      method:'POST',body:JSON.stringify({post_id:postId,user_id:session.user.id})
    },'resolution=ignore-duplicates,return=minimal');
  }
}

export async function addPostComment(config:CloudConfig,session:Session,postId:string,body:string,parentCommentId?:string){
  const rows=await supabaseRest<SocialComment[]>(config,session,'/rest/v1/collector_post_comments',{
    method:'POST',
    body:JSON.stringify({
      post_id:postId,user_id:session.user.id,body:body.trim(),parent_comment_id:parentCommentId||null
    })
  },'return=representation');
  return rows[0];
}

export async function reportSocialTarget(config:CloudConfig,session:Session,input:{
  targetType:'post'|'comment'|'profile'|'message'|'listing'|'community';
  targetId:string;
  reason:string;
  details?:string;
}){
  await supabaseRest(config,session,'/rest/v1/collector_reports',{
    method:'POST',
    body:JSON.stringify({
      reporter_user_id:session.user.id,
      target_type:input.targetType,
      target_id:input.targetId,
      reason:input.reason,
      details:input.details||''
    })
  },'return=minimal');
}

export async function listDropEvents(config:CloudConfig,session:Session|null){
  return supabaseRest<SocialDropEvent[]>(config,session,'/rest/v1/collector_drop_events?'+qs({
    select:'*',order:'last_seen.desc',limit:40
  }));
}

export async function listStockReports(config:CloudConfig,session:Session|null){
  return supabaseRest<SocialStockReport[]>(config,session,'/rest/v1/collector_stock_reports?'+qs({
    select:'*',order:'reported_at.desc',limit:40
  }));
}

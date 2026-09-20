create extension if not exists pgcrypto;

create table if not exists public.collector_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default 'Collector',
  bio text not null default '',
  avatar_url text not null default '',
  banner_url text not null default '',
  niches text[] not null default '{}',
  shopping_zip text not null default '',
  is_public boolean not null default true,
  show_collection boolean not null default true,
  show_collection_value boolean not null default false,
  show_wishlist boolean not null default true,
  auto_post_additions boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.collector_profiles drop constraint if exists collector_profiles_username_len;
alter table public.collector_profiles add constraint collector_profiles_username_len check (username is null or char_length(username) between 3 and 30);
alter table public.collector_profiles drop constraint if exists collector_profiles_zip_format;
alter table public.collector_profiles add constraint collector_profiles_zip_format check (shopping_zip = '' or shopping_zip ~ '^[0-9]{5}$');

create table if not exists public.collector_follows (
  follower_id uuid not null references public.collector_profiles(id) on delete cascade,
  following_id uuid not null references public.collector_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint collector_follows_not_self check (follower_id <> following_id)
);

create table if not exists public.collector_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  kind text not null default 'post' check (kind in ('post','collection_add','set_complete')),
  body text not null default '',
  image_url text not null default '',
  item_id text not null default '',
  item_name text not null default '',
  item_image text not null default '',
  collection_name text not null default '',
  niche_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.collector_posts add column if not exists source_key text;
create unique index if not exists collector_posts_source_key_unique on public.collector_posts(source_key) where source_key is not null;

create table if not exists public.collector_post_likes (
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.collector_post_reactions (
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  emoji text not null check (emoji in ('🔥','❤️','😭','👀','💀','👏')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);
create table if not exists public.collector_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint collector_post_comments_body_len check (char_length(body) between 1 and 800)
);
create table if not exists public.collector_drop_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  retailer text not null,
  external_id text not null,
  product_name text not null,
  image_url text not null default '',
  product_url text not null,
  price numeric(12,2),
  msrp numeric(12,2),
  currency text not null default 'USD',
  stock_status text not null default 'IN_STOCK',
  niche_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (retailer, external_id)
);
create table if not exists public.collector_wishlist_listing_cache (
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  item_id text not null,
  query text not null default '',
  results jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create table if not exists public.collector_public_items (
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  item_id text not null,
  status text not null check (status in ('owned','wishlist')),
  name text not null,
  image_url text not null default '',
  category text not null default '',
  collection_name text not null default '',
  quantity integer not null default 1 check (quantity >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create index if not exists collector_posts_user_created_idx on public.collector_posts(user_id,created_at desc);
create index if not exists collector_posts_created_idx on public.collector_posts(created_at desc);
create index if not exists collector_posts_niches_idx on public.collector_posts using gin(niche_tags);
create index if not exists collector_profiles_niches_idx on public.collector_profiles using gin(niches);
create index if not exists collector_drop_events_seen_idx on public.collector_drop_events(last_seen desc);
create index if not exists collector_drop_events_niches_idx on public.collector_drop_events using gin(niche_tags);
create index if not exists collector_comments_post_idx on public.collector_post_comments(post_id,created_at asc);
create index if not exists collector_follows_following_idx on public.collector_follows(following_id);
create index if not exists collector_post_comments_user_idx on public.collector_post_comments(user_id);
create index if not exists collector_post_likes_user_idx on public.collector_post_likes(user_id);
create index if not exists collector_post_reactions_user_idx on public.collector_post_reactions(user_id);
create index if not exists collector_public_items_status_idx on public.collector_public_items(user_id,status);

alter table public.collector_profiles enable row level security;
alter table public.collector_follows enable row level security;
alter table public.collector_posts enable row level security;
alter table public.collector_post_likes enable row level security;
alter table public.collector_post_reactions enable row level security;
alter table public.collector_post_comments enable row level security;
alter table public.collector_drop_events enable row level security;
alter table public.collector_wishlist_listing_cache enable row level security;
alter table public.collector_public_items enable row level security;

drop policy if exists "collector_profiles_read" on public.collector_profiles;
create policy "collector_profiles_read" on public.collector_profiles for select to anon,authenticated using (is_public or id=(select auth.uid()));
drop policy if exists "collector_profiles_insert_own" on public.collector_profiles;
create policy "collector_profiles_insert_own" on public.collector_profiles for insert to authenticated with check (id=(select auth.uid()));
drop policy if exists "collector_profiles_update_own" on public.collector_profiles;
create policy "collector_profiles_update_own" on public.collector_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

drop policy if exists "collector_follows_read" on public.collector_follows;
create policy "collector_follows_read" on public.collector_follows for select to authenticated using (true);
drop policy if exists "collector_follows_insert_own" on public.collector_follows;
create policy "collector_follows_insert_own" on public.collector_follows for insert to authenticated with check (follower_id=(select auth.uid()));
drop policy if exists "collector_follows_delete_own" on public.collector_follows;
create policy "collector_follows_delete_own" on public.collector_follows for delete to authenticated using (follower_id=(select auth.uid()));

drop policy if exists "collector_posts_read" on public.collector_posts;
create policy "collector_posts_read" on public.collector_posts for select to anon,authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.collector_profiles p where p.id=collector_posts.user_id and p.is_public));
drop policy if exists "collector_posts_insert_own" on public.collector_posts;
create policy "collector_posts_insert_own" on public.collector_posts for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "collector_posts_update_own" on public.collector_posts;
create policy "collector_posts_update_own" on public.collector_posts for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "collector_posts_delete_own" on public.collector_posts;
create policy "collector_posts_delete_own" on public.collector_posts for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "collector_likes_read" on public.collector_post_likes;
create policy "collector_likes_read" on public.collector_post_likes for select to anon,authenticated using (true);
drop policy if exists "collector_likes_insert_own" on public.collector_post_likes;
create policy "collector_likes_insert_own" on public.collector_post_likes for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "collector_likes_delete_own" on public.collector_post_likes;
create policy "collector_likes_delete_own" on public.collector_post_likes for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "collector_reactions_read" on public.collector_post_reactions;
create policy "collector_reactions_read" on public.collector_post_reactions for select to anon,authenticated using (true);
drop policy if exists "collector_reactions_insert_own" on public.collector_post_reactions;
create policy "collector_reactions_insert_own" on public.collector_post_reactions for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "collector_reactions_delete_own" on public.collector_post_reactions;
create policy "collector_reactions_delete_own" on public.collector_post_reactions for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "collector_comments_read" on public.collector_post_comments;
create policy "collector_comments_read" on public.collector_post_comments for select to anon,authenticated using (true);
drop policy if exists "collector_comments_insert_own" on public.collector_post_comments;
create policy "collector_comments_insert_own" on public.collector_post_comments for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "collector_comments_update_own" on public.collector_post_comments;
create policy "collector_comments_update_own" on public.collector_post_comments for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "collector_comments_delete_own" on public.collector_post_comments;
create policy "collector_comments_delete_own" on public.collector_post_comments for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists "collector_drops_read" on public.collector_drop_events;
create policy "collector_drops_read" on public.collector_drop_events for select to anon,authenticated using (true);
drop policy if exists "collector_wishlist_cache_own" on public.collector_wishlist_listing_cache;
create policy "collector_wishlist_cache_own" on public.collector_wishlist_listing_cache for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists "collector_public_items_read" on public.collector_public_items;
create policy "collector_public_items_read" on public.collector_public_items for select to anon,authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.collector_profiles p where p.id=collector_public_items.user_id and p.is_public and ((collector_public_items.status='owned' and p.show_collection) or (collector_public_items.status='wishlist' and p.show_wishlist))));
drop policy if exists "collector_public_items_write_own" on public.collector_public_items;
create policy "collector_public_items_write_own" on public.collector_public_items for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

grant select on public.collector_profiles to anon;
grant select,insert,update on public.collector_profiles to authenticated;
grant select,insert,delete on public.collector_follows to authenticated;
grant select on public.collector_posts to anon;
grant select,insert,update,delete on public.collector_posts to authenticated;
grant select on public.collector_post_likes to anon;
grant select,insert,delete on public.collector_post_likes to authenticated;
grant select on public.collector_post_reactions to anon;
grant select,insert,delete on public.collector_post_reactions to authenticated;
grant select on public.collector_post_comments to anon;
grant select,insert,update,delete on public.collector_post_comments to authenticated;
grant select on public.collector_drop_events to anon,authenticated;
grant select,insert,update,delete on public.collector_wishlist_listing_cache to authenticated;
grant select on public.collector_public_items to anon;
grant select,insert,update,delete on public.collector_public_items to authenticated;
grant all privileges on public.collector_profiles,public.collector_follows,public.collector_posts,public.collector_post_likes,public.collector_post_reactions,public.collector_post_comments,public.collector_drop_events,public.collector_wishlist_listing_cache,public.collector_public_items to service_role;

create or replace function public.collector_handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.collector_profiles(id,username,display_name)
  values(new.id,'collector_'||substr(replace(new.id::text,'-',''),1,8),coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,'Collector'),'@',1),'Collector'))
  on conflict(id) do nothing;
  return new;
end;
$$;
drop trigger if exists collector_on_auth_user_created on auth.users;
create trigger collector_on_auth_user_created after insert on auth.users for each row execute procedure public.collector_handle_new_user();

-- Security hardening for trigger-only profile bootstrap and public-item writes.
revoke execute on function public.collector_handle_new_user() from public, anon, authenticated;
drop policy if exists "collector_public_items_write_own" on public.collector_public_items;
drop policy if exists "collector_public_items_insert_own" on public.collector_public_items;
drop policy if exists "collector_public_items_update_own" on public.collector_public_items;
drop policy if exists "collector_public_items_delete_own" on public.collector_public_items;
create policy "collector_public_items_insert_own" on public.collector_public_items for insert to authenticated with check (user_id=(select auth.uid()));
create policy "collector_public_items_update_own" on public.collector_public_items for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "collector_public_items_delete_own" on public.collector_public_items for delete to authenticated using (user_id=(select auth.uid()));

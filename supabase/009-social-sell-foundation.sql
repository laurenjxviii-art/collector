
-- VEXUM Social + Sell normalized foundation.
-- Additive only: no existing collection/workspace/auth data is removed.

alter table public.collector_profiles
  add column if not exists region text not null default '',
  add column if not exists show_setups boolean not null default false,
  add column if not exists show_trades boolean not null default true,
  add column if not exists show_achievements boolean not null default true,
  add column if not exists show_seller_profile boolean not null default true,
  add column if not exists default_social_landing text not null default 'for_you';

do $$ begin
  alter table public.collector_profiles
    add constraint collector_profiles_default_social_landing_check
    check (default_social_landing in ('for_you','following','communities'));
exception when duplicate_object then null; end $$;

create unique index if not exists collector_profiles_username_lower_uq
  on public.collector_profiles (lower(username))
  where username is not null;

create table if not exists public.collector_blocks (
  blocker_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);
alter table public.collector_blocks enable row level security;

create table if not exists public.collector_communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  image_url text not null default '',
  banner_url text not null default '',
  visibility text not null default 'public' check (visibility in ('public','private')),
  owner_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);
create unique index if not exists collector_communities_slug_lower_uq on public.collector_communities(lower(slug));
create index if not exists collector_communities_owner_idx on public.collector_communities(owner_user_id);
alter table public.collector_communities enable row level security;

create table if not exists public.collector_community_members (
  community_id uuid not null references public.collector_communities(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member','verified_seller')),
  status text not null default 'active' check (status in ('active','muted','banned','pending')),
  joined_at timestamptz not null default now(),
  primary key (community_id,user_id)
);
create index if not exists collector_community_members_user_idx on public.collector_community_members(user_id);
alter table public.collector_community_members enable row level security;

alter table public.collector_posts
  add column if not exists post_type text not null default 'standard',
  add column if not exists visibility text not null default 'public',
  add column if not exists community_id uuid null references public.collector_communities(id) on delete set null;

do $$ begin
  alter table public.collector_posts
    add constraint collector_posts_post_type_check
    check (post_type in ('standard','pickup','collection_update','setup','question','review','trade','sale','restock','drop','milestone'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.collector_posts
    add constraint collector_posts_visibility_check
    check (visibility in ('public','followers','community','private'));
exception when duplicate_object then null; end $$;
create index if not exists collector_posts_community_created_idx on public.collector_posts(community_id,created_at desc);
create index if not exists collector_posts_user_created_idx on public.collector_posts(user_id,created_at desc);

create table if not exists public.collector_post_products (
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  product_id text,
  portfolio_item_id text,
  tag_type text not null default 'product' check (tag_type in ('product','owned_copy','wanted','trade','sale')),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (post_id, product_id, portfolio_item_id),
  check (product_id is not null or portfolio_item_id is not null)
);
create index if not exists collector_post_products_product_idx on public.collector_post_products(product_id);
create index if not exists collector_post_products_portfolio_idx on public.collector_post_products(portfolio_item_id);
alter table public.collector_post_products enable row level security;

create table if not exists public.collector_post_setups (
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  setup_id text not null,
  safe_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (post_id, setup_id)
);
alter table public.collector_post_setups enable row level security;

create table if not exists public.collector_post_collections (
  post_id uuid not null references public.collector_posts(id) on delete cascade,
  collection_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, collection_id)
);
alter table public.collector_post_collections enable row level security;

alter table public.collector_post_comments
  add column if not exists parent_comment_id uuid null references public.collector_post_comments(id) on delete cascade;
create index if not exists collector_post_comments_parent_idx on public.collector_post_comments(parent_comment_id);

create table if not exists public.collector_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','profile','message','listing','community')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists collector_reports_reporter_idx on public.collector_reports(reporter_user_id,created_at desc);
alter table public.collector_reports enable row level security;

create table if not exists public.collector_stock_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  product_id text not null,
  retailer text not null default '',
  store_label text not null default '',
  reported_status text not null check (reported_status in ('in_stock','low_stock','sold_out','not_seen')),
  reported_quantity integer,
  reported_at timestamptz not null default now(),
  note text not null default '',
  created_at timestamptz not null default now(),
  check (reported_quantity is null or reported_quantity >= 0)
);
create index if not exists collector_stock_reports_product_idx on public.collector_stock_reports(product_id,reported_at desc);
alter table public.collector_stock_reports enable row level security;

create table if not exists public.collector_stock_confirmations (
  report_id uuid not null references public.collector_stock_reports(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  status text not null check (status in ('confirmed','sold_out','not_seen')),
  created_at timestamptz not null default now(),
  primary key (report_id,user_id)
);
alter table public.collector_stock_confirmations enable row level security;

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  product_id text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,product_id)
);
create index if not exists product_reviews_product_idx on public.product_reviews(product_id,created_at desc);
alter table public.product_reviews enable row level security;

create table if not exists public.collector_trade_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  portfolio_item_id text not null,
  product_id text,
  status text not null default 'available' check (status in ('available','pending','traded','withdrawn')),
  desired_trade_notes text not null default '',
  shipping_preference text not null default '',
  local_preference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,portfolio_item_id)
);
create index if not exists collector_trade_items_product_idx on public.collector_trade_items(product_id);
alter table public.collector_trade_items enable row level security;

-- Messaging architecture. Realtime can be added without changing the data model.
create table if not exists public.social_conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct' check (type in ('direct','group')),
  created_by uuid not null references public.collector_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.social_conversations enable row level security;

create table if not exists public.social_conversation_members (
  conversation_id uuid not null references public.social_conversations(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create index if not exists social_conversation_members_user_idx on public.social_conversation_members(user_id);
alter table public.social_conversation_members enable row level security;

create table if not exists public.social_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.social_conversations(id) on delete cascade,
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_messages_conversation_idx on public.social_messages(conversation_id,created_at desc);
alter table public.social_messages enable row level security;

-- Sell normalized commerce foundation.
create table if not exists public.sell_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  provider text not null,
  state text not null default 'not_connected' check (state in ('not_connected','connected','manual','unsupported','attention')),
  capabilities jsonb not null default '{}'::jsonb,
  external_account_label text not null default '',
  last_synced_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,provider)
);
alter table public.sell_connections enable row level security;

create table if not exists public.sell_shipping_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  name text not null,
  length numeric,
  width numeric,
  height numeric,
  weight numeric,
  unit text not null default 'in' check (unit in ('in','cm')),
  weight_unit text not null default 'lb' check (weight_unit in ('lb','oz','kg','g')),
  preferred_service text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sell_shipping_profiles enable row level security;

create table if not exists public.sell_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  portfolio_item_id text not null,
  product_id text,
  title text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  currency text not null default 'USD',
  quantity integer not null default 1 check (quantity >= 1),
  condition_data jsonb not null default '{}'::jsonb,
  condition_notes text not null default '',
  media jsonb not null default '[]'::jsonb,
  shipping_profile_id uuid references public.sell_shipping_profiles(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft','ready','publishing','active','paused','sale_pending','sold','ended','error','archived')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz
);
create index if not exists sell_listings_seller_status_idx on public.sell_listings(seller_user_id,status,updated_at desc);
create index if not exists sell_listings_product_active_idx on public.sell_listings(product_id,status,price);
create unique index if not exists sell_listings_one_live_copy_idx
  on public.sell_listings(seller_user_id,portfolio_item_id)
  where status in ('ready','publishing','active','paused','sale_pending');
alter table public.sell_listings enable row level security;

create table if not exists public.sell_listing_channels (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.sell_listings(id) on delete cascade,
  provider text not null,
  external_listing_id text,
  external_url text,
  status text not null default 'manual'
    check (status in ('draft','publishing','active','paused','sold','ended','error','manual','unsupported')),
  price numeric check (price is null or price >= 0),
  quantity integer check (quantity is null or quantity >= 0),
  last_synced_at timestamptz,
  error_code text not null default '',
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id,provider)
);
create index if not exists sell_listing_channels_listing_idx on public.sell_listing_channels(listing_id);
alter table public.sell_listing_channels enable row level security;

create table if not exists public.sell_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.sell_listings(id) on delete cascade,
  buyer_user_id uuid references public.collector_profiles(id) on delete set null,
  buyer_label text not null default '',
  provider text not null default 'vexum',
  external_offer_id text,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','accepted','countered','declined','expired','withdrawn')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sell_offers_listing_status_idx on public.sell_offers(listing_id,status,created_at desc);
alter table public.sell_offers enable row level security;

create table if not exists public.sell_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.sell_listings(id) on delete restrict,
  seller_user_id uuid not null references public.collector_profiles(id) on delete restrict,
  buyer_user_id uuid references public.collector_profiles(id) on delete set null,
  buyer_label text not null default '',
  provider text not null default 'vexum',
  external_order_id text,
  status text not null default 'paid'
    check (status in ('awaiting_payment','paid','preparing_shipment','shipped','delivered','completed','cancelled','return_requested','returned','refunded','disputed')),
  item_subtotal numeric not null default 0 check (item_subtotal >= 0),
  shipping_charged numeric not null default 0 check (shipping_charged >= 0),
  tax numeric not null default 0 check (tax >= 0),
  fees numeric not null default 0 check (fees >= 0),
  shipping_cost numeric not null default 0 check (shipping_cost >= 0),
  other_selling_costs numeric not null default 0 check (other_selling_costs >= 0),
  net_proceeds numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists sell_orders_seller_status_idx on public.sell_orders(seller_user_id,status,created_at desc);
alter table public.sell_orders enable row level security;

create table if not exists public.sell_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sell_orders(id) on delete cascade,
  listing_id uuid not null references public.sell_listings(id) on delete restrict,
  portfolio_item_id text not null,
  product_id text,
  quantity integer not null default 1 check (quantity >= 1),
  unit_price numeric not null default 0 check (unit_price >= 0),
  cost_basis_snapshot numeric not null default 0 check (cost_basis_snapshot >= 0)
);
create index if not exists sell_order_items_order_idx on public.sell_order_items(order_id);
alter table public.sell_order_items enable row level security;

create table if not exists public.sell_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sell_orders(id) on delete cascade,
  carrier text not null default '',
  service text not null default '',
  tracking_number text not null default '',
  label_url text not null default '',
  shipping_cost numeric not null default 0 check (shipping_cost >= 0),
  weight numeric,
  dimensions jsonb not null default '{}'::jsonb,
  status text not null default 'preparing' check (status in ('preparing','shipped','in_transit','delivered','exception','returned')),
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.sell_shipments enable row level security;

create table if not exists public.sell_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sell_orders(id) on delete cascade,
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','in_transit','received','resolved','rejected')),
  refund_amount numeric not null default 0 check (refund_amount >= 0),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.sell_returns enable row level security;

create table if not exists public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sell_orders(id) on delete cascade,
  reviewer_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  seller_user_id uuid not null references public.collector_profiles(id) on delete cascade,
  condition_accuracy integer check (condition_accuracy between 1 and 5),
  packaging integer check (packaging between 1 and 5),
  shipping_speed integer check (shipping_speed between 1 and 5),
  communication integer check (communication between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique(order_id,reviewer_user_id)
);
create index if not exists seller_reviews_seller_idx on public.seller_reviews(seller_user_id,created_at desc);
alter table public.seller_reviews enable row level security;

create table if not exists public.wanted_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.collector_profiles(id) on delete cascade,
  product_id text not null,
  desired_condition jsonb not null default '{}'::jsonb,
  max_price numeric check (max_price is null or max_price >= 0),
  trade_allowed boolean not null default false,
  shipping_preference text not null default '',
  status text not null default 'active' check (status in ('active','paused','fulfilled','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,product_id)
);
create index if not exists wanted_items_product_active_idx on public.wanted_items(product_id,status,max_price);
alter table public.wanted_items enable row level security;

-- Social RLS policies.
drop policy if exists collector_blocks_read_own on public.collector_blocks;
drop policy if exists collector_blocks_insert_own on public.collector_blocks;
drop policy if exists collector_blocks_delete_own on public.collector_blocks;
create policy collector_blocks_read_own on public.collector_blocks for select to authenticated
  using ((select auth.uid())=blocker_user_id);
create policy collector_blocks_insert_own on public.collector_blocks for insert to authenticated
  with check ((select auth.uid())=blocker_user_id);
create policy collector_blocks_delete_own on public.collector_blocks for delete to authenticated
  using ((select auth.uid())=blocker_user_id);

drop policy if exists collector_communities_read on public.collector_communities;
drop policy if exists collector_communities_insert_own on public.collector_communities;
drop policy if exists collector_communities_update_owner on public.collector_communities;
drop policy if exists collector_communities_delete_owner on public.collector_communities;
create policy collector_communities_read on public.collector_communities for select to anon,authenticated
  using (visibility='public' or owner_user_id=(select auth.uid()) or exists (
    select 1 from public.collector_community_members m
    where m.community_id=id and m.user_id=(select auth.uid()) and m.status='active'
  ));
create policy collector_communities_insert_own on public.collector_communities for insert to authenticated
  with check (owner_user_id=(select auth.uid()));
create policy collector_communities_update_owner on public.collector_communities for update to authenticated
  using (owner_user_id=(select auth.uid())) with check (owner_user_id=(select auth.uid()));
create policy collector_communities_delete_owner on public.collector_communities for delete to authenticated
  using (owner_user_id=(select auth.uid()));

drop policy if exists collector_community_members_read on public.collector_community_members;
drop policy if exists collector_community_members_insert on public.collector_community_members;
drop policy if exists collector_community_members_update on public.collector_community_members;
drop policy if exists collector_community_members_delete on public.collector_community_members;
create policy collector_community_members_read on public.collector_community_members for select to authenticated
  using (user_id=(select auth.uid()) or exists (
    select 1 from public.collector_communities c
    where c.id=community_id and (c.visibility='public' or c.owner_user_id=(select auth.uid()))
  ));
create policy collector_community_members_insert on public.collector_community_members for insert to authenticated
  with check (
    (user_id=(select auth.uid()) and role='member' and exists (
      select 1 from public.collector_communities c where c.id=community_id and c.visibility='public'
    ))
    or exists (
      select 1 from public.collector_communities c where c.id=community_id and c.owner_user_id=(select auth.uid())
    )
  );
create policy collector_community_members_update on public.collector_community_members for update to authenticated
  using (exists (select 1 from public.collector_communities c where c.id=community_id and c.owner_user_id=(select auth.uid())))
  with check (exists (select 1 from public.collector_communities c where c.id=community_id and c.owner_user_id=(select auth.uid())));
create policy collector_community_members_delete on public.collector_community_members for delete to authenticated
  using (user_id=(select auth.uid()) or exists (
    select 1 from public.collector_communities c where c.id=community_id and c.owner_user_id=(select auth.uid())
  ));

drop policy if exists collector_posts_read on public.collector_posts;
create policy collector_posts_read on public.collector_posts for select to anon,authenticated
  using (
    user_id=(select auth.uid())
    or (
      not exists (
        select 1 from public.collector_blocks b
        where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=user_id)
           or (b.blocked_user_id=(select auth.uid()) and b.blocker_user_id=user_id)
      )
      and (
        (visibility='public' and exists (select 1 from public.collector_profiles p where p.id=user_id and p.is_public))
        or (visibility='followers' and exists (
          select 1 from public.collector_follows f where f.follower_id=(select auth.uid()) and f.following_id=user_id
        ))
        or (visibility='community' and community_id is not null and exists (
          select 1 from public.collector_community_members m
          where m.community_id=collector_posts.community_id and m.user_id=(select auth.uid()) and m.status='active'
        ))
      )
    )
  );

drop policy if exists collector_comments_read on public.collector_post_comments;
create policy collector_comments_read on public.collector_post_comments for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));
drop policy if exists collector_likes_read on public.collector_post_likes;
create policy collector_likes_read on public.collector_post_likes for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));
drop policy if exists collector_reactions_read on public.collector_post_reactions;
create policy collector_reactions_read on public.collector_post_reactions for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));

drop policy if exists collector_post_products_read on public.collector_post_products;
drop policy if exists collector_post_products_write on public.collector_post_products;
drop policy if exists collector_post_products_delete on public.collector_post_products;
create policy collector_post_products_read on public.collector_post_products for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));
create policy collector_post_products_write on public.collector_post_products for insert to authenticated
  with check (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));
create policy collector_post_products_delete on public.collector_post_products for delete to authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));

drop policy if exists collector_post_setups_read on public.collector_post_setups;
drop policy if exists collector_post_setups_write on public.collector_post_setups;
drop policy if exists collector_post_setups_delete on public.collector_post_setups;
create policy collector_post_setups_read on public.collector_post_setups for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));
create policy collector_post_setups_write on public.collector_post_setups for insert to authenticated
  with check (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));
create policy collector_post_setups_delete on public.collector_post_setups for delete to authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));

drop policy if exists collector_post_collections_read on public.collector_post_collections;
drop policy if exists collector_post_collections_write on public.collector_post_collections;
drop policy if exists collector_post_collections_delete on public.collector_post_collections;
create policy collector_post_collections_read on public.collector_post_collections for select to anon,authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id));
create policy collector_post_collections_write on public.collector_post_collections for insert to authenticated
  with check (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));
create policy collector_post_collections_delete on public.collector_post_collections for delete to authenticated
  using (exists (select 1 from public.collector_posts p where p.id=post_id and p.user_id=(select auth.uid())));

drop policy if exists collector_reports_read_own on public.collector_reports;
drop policy if exists collector_reports_insert_own on public.collector_reports;
create policy collector_reports_read_own on public.collector_reports for select to authenticated
  using (reporter_user_id=(select auth.uid()));
create policy collector_reports_insert_own on public.collector_reports for insert to authenticated
  with check (reporter_user_id=(select auth.uid()));

drop policy if exists collector_stock_reports_read on public.collector_stock_reports;
drop policy if exists collector_stock_reports_insert on public.collector_stock_reports;
drop policy if exists collector_stock_reports_update_own on public.collector_stock_reports;
drop policy if exists collector_stock_reports_delete_own on public.collector_stock_reports;
create policy collector_stock_reports_read on public.collector_stock_reports for select to anon,authenticated using (true);
create policy collector_stock_reports_insert on public.collector_stock_reports for insert to authenticated with check (user_id=(select auth.uid()));
create policy collector_stock_reports_update_own on public.collector_stock_reports for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy collector_stock_reports_delete_own on public.collector_stock_reports for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists collector_stock_confirmations_read on public.collector_stock_confirmations;
drop policy if exists collector_stock_confirmations_insert on public.collector_stock_confirmations;
drop policy if exists collector_stock_confirmations_delete on public.collector_stock_confirmations;
create policy collector_stock_confirmations_read on public.collector_stock_confirmations for select to anon,authenticated using (true);
create policy collector_stock_confirmations_insert on public.collector_stock_confirmations for insert to authenticated with check (user_id=(select auth.uid()));
create policy collector_stock_confirmations_delete on public.collector_stock_confirmations for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists product_reviews_read on public.product_reviews;
drop policy if exists product_reviews_insert on public.product_reviews;
drop policy if exists product_reviews_update on public.product_reviews;
drop policy if exists product_reviews_delete on public.product_reviews;
create policy product_reviews_read on public.product_reviews for select to anon,authenticated using (true);
create policy product_reviews_insert on public.product_reviews for insert to authenticated with check (user_id=(select auth.uid()));
create policy product_reviews_update on public.product_reviews for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy product_reviews_delete on public.product_reviews for delete to authenticated using (user_id=(select auth.uid()));

drop policy if exists collector_trade_items_read on public.collector_trade_items;
drop policy if exists collector_trade_items_insert on public.collector_trade_items;
drop policy if exists collector_trade_items_update on public.collector_trade_items;
drop policy if exists collector_trade_items_delete on public.collector_trade_items;
create policy collector_trade_items_read on public.collector_trade_items for select to anon,authenticated
  using (user_id=(select auth.uid()) or (status='available' and exists (select 1 from public.collector_profiles p where p.id=user_id and p.is_public and p.show_trades)));
create policy collector_trade_items_insert on public.collector_trade_items for insert to authenticated with check (user_id=(select auth.uid()));
create policy collector_trade_items_update on public.collector_trade_items for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy collector_trade_items_delete on public.collector_trade_items for delete to authenticated using (user_id=(select auth.uid()));

-- Messaging RLS.
drop policy if exists social_conversations_read on public.social_conversations;
drop policy if exists social_conversations_insert on public.social_conversations;
create policy social_conversations_read on public.social_conversations for select to authenticated
  using (exists (select 1 from public.social_conversation_members m where m.conversation_id=id and m.user_id=(select auth.uid())));
create policy social_conversations_insert on public.social_conversations for insert to authenticated
  with check (created_by=(select auth.uid()));

drop policy if exists social_conversation_members_read on public.social_conversation_members;
drop policy if exists social_conversation_members_insert on public.social_conversation_members;
drop policy if exists social_conversation_members_delete on public.social_conversation_members;
create policy social_conversation_members_read on public.social_conversation_members for select to authenticated
  using (user_id=(select auth.uid()) or exists (
    select 1 from public.social_conversations c
    where c.id=conversation_id and c.created_by=(select auth.uid())
  ));
create policy social_conversation_members_insert on public.social_conversation_members for insert to authenticated
  with check (
    user_id=(select auth.uid())
    or exists (select 1 from public.social_conversations c where c.id=conversation_id and c.created_by=(select auth.uid()))
  );
create policy social_conversation_members_delete on public.social_conversation_members for delete to authenticated
  using (
    user_id=(select auth.uid())
    or exists (select 1 from public.social_conversations c where c.id=conversation_id and c.created_by=(select auth.uid()))
  );

drop policy if exists social_messages_read on public.social_messages;
drop policy if exists social_messages_insert on public.social_messages;
drop policy if exists social_messages_delete on public.social_messages;
create policy social_messages_read on public.social_messages for select to authenticated
  using (exists (select 1 from public.social_conversation_members m where m.conversation_id=social_messages.conversation_id and m.user_id=(select auth.uid())));
create policy social_messages_insert on public.social_messages for insert to authenticated
  with check (user_id=(select auth.uid()) and exists (
    select 1 from public.social_conversation_members m where m.conversation_id=social_messages.conversation_id and m.user_id=(select auth.uid())
  ));
create policy social_messages_delete on public.social_messages for delete to authenticated
  using (user_id=(select auth.uid()));

-- Sell RLS.
drop policy if exists sell_connections_own on public.sell_connections;
create policy sell_connections_own on public.sell_connections for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists sell_shipping_profiles_own on public.sell_shipping_profiles;
create policy sell_shipping_profiles_own on public.sell_shipping_profiles for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists sell_listings_read on public.sell_listings;
drop policy if exists sell_listings_insert on public.sell_listings;
drop policy if exists sell_listings_update on public.sell_listings;
drop policy if exists sell_listings_delete on public.sell_listings;
create policy sell_listings_read on public.sell_listings for select to anon,authenticated
  using (seller_user_id=(select auth.uid()) or (status='active' and visibility='public'));
create policy sell_listings_insert on public.sell_listings for insert to authenticated
  with check (seller_user_id=(select auth.uid()));
create policy sell_listings_update on public.sell_listings for update to authenticated
  using (seller_user_id=(select auth.uid())) with check (seller_user_id=(select auth.uid()));
create policy sell_listings_delete on public.sell_listings for delete to authenticated
  using (seller_user_id=(select auth.uid()));

drop policy if exists sell_listing_channels_own on public.sell_listing_channels;
create policy sell_listing_channels_own on public.sell_listing_channels for all to authenticated
  using (exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())))
  with check (exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())));

drop policy if exists sell_offers_read on public.sell_offers;
drop policy if exists sell_offers_insert on public.sell_offers;
drop policy if exists sell_offers_update on public.sell_offers;
create policy sell_offers_read on public.sell_offers for select to authenticated
  using (buyer_user_id=(select auth.uid()) or exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())));
create policy sell_offers_insert on public.sell_offers for insert to authenticated
  with check (
    buyer_user_id=(select auth.uid())
    or (buyer_user_id is null and exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())))
  );
create policy sell_offers_update on public.sell_offers for update to authenticated
  using (buyer_user_id=(select auth.uid()) or exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())))
  with check (buyer_user_id=(select auth.uid()) or exists (select 1 from public.sell_listings l where l.id=listing_id and l.seller_user_id=(select auth.uid())));

drop policy if exists sell_orders_read on public.sell_orders;
drop policy if exists sell_orders_insert on public.sell_orders;
drop policy if exists sell_orders_update on public.sell_orders;
create policy sell_orders_read on public.sell_orders for select to authenticated
  using (seller_user_id=(select auth.uid()) or buyer_user_id=(select auth.uid()));
create policy sell_orders_insert on public.sell_orders for insert to authenticated
  with check (seller_user_id=(select auth.uid()) or buyer_user_id=(select auth.uid()));
create policy sell_orders_update on public.sell_orders for update to authenticated
  using (seller_user_id=(select auth.uid()) or buyer_user_id=(select auth.uid()))
  with check (seller_user_id=(select auth.uid()) or buyer_user_id=(select auth.uid()));

drop policy if exists sell_order_items_read on public.sell_order_items;
drop policy if exists sell_order_items_insert on public.sell_order_items;
create policy sell_order_items_read on public.sell_order_items for select to authenticated
  using (exists (select 1 from public.sell_orders o where o.id=order_id and (o.seller_user_id=(select auth.uid()) or o.buyer_user_id=(select auth.uid()))));
create policy sell_order_items_insert on public.sell_order_items for insert to authenticated
  with check (exists (select 1 from public.sell_orders o where o.id=order_id and o.seller_user_id=(select auth.uid())));

drop policy if exists sell_shipments_access on public.sell_shipments;
create policy sell_shipments_access on public.sell_shipments for all to authenticated
  using (exists (select 1 from public.sell_orders o where o.id=order_id and (o.seller_user_id=(select auth.uid()) or o.buyer_user_id=(select auth.uid()))))
  with check (exists (select 1 from public.sell_orders o where o.id=order_id and o.seller_user_id=(select auth.uid())));

drop policy if exists sell_returns_access on public.sell_returns;
create policy sell_returns_access on public.sell_returns for all to authenticated
  using (exists (select 1 from public.sell_orders o where o.id=order_id and (o.seller_user_id=(select auth.uid()) or o.buyer_user_id=(select auth.uid()))))
  with check (exists (select 1 from public.sell_orders o where o.id=order_id and (o.seller_user_id=(select auth.uid()) or o.buyer_user_id=(select auth.uid()))));

drop policy if exists seller_reviews_read on public.seller_reviews;
drop policy if exists seller_reviews_insert on public.seller_reviews;
create policy seller_reviews_read on public.seller_reviews for select to anon,authenticated using (true);
create policy seller_reviews_insert on public.seller_reviews for insert to authenticated
  with check (reviewer_user_id=(select auth.uid()) and exists (
    select 1 from public.sell_orders o where o.id=order_id and (o.buyer_user_id=(select auth.uid()) or o.seller_user_id=(select auth.uid()))
  ));

drop policy if exists wanted_items_read on public.wanted_items;
drop policy if exists wanted_items_insert on public.wanted_items;
drop policy if exists wanted_items_update on public.wanted_items;
drop policy if exists wanted_items_delete on public.wanted_items;
create policy wanted_items_read on public.wanted_items for select to anon,authenticated
  using (user_id=(select auth.uid()) or status='active');
create policy wanted_items_insert on public.wanted_items for insert to authenticated with check (user_id=(select auth.uid()));
create policy wanted_items_update on public.wanted_items for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy wanted_items_delete on public.wanted_items for delete to authenticated using (user_id=(select auth.uid()));

-- Data API grants. RLS remains authoritative.
grant select on public.collector_communities, public.collector_posts, public.collector_post_products,
  public.collector_post_setups, public.collector_post_collections, public.collector_post_comments,
  public.collector_post_likes, public.collector_post_reactions, public.collector_stock_reports,
  public.collector_stock_confirmations, public.product_reviews, public.collector_trade_items,
  public.sell_listings, public.seller_reviews, public.wanted_items
to anon;

grant select,insert,update,delete on
  public.collector_blocks, public.collector_communities, public.collector_community_members,
  public.collector_post_products, public.collector_post_setups, public.collector_post_collections,
  public.collector_reports, public.collector_stock_reports, public.collector_stock_confirmations,
  public.product_reviews, public.collector_trade_items, public.social_conversations,
  public.social_conversation_members, public.social_messages, public.sell_connections,
  public.sell_shipping_profiles, public.sell_listings, public.sell_listing_channels,
  public.sell_offers, public.sell_orders, public.sell_order_items, public.sell_shipments,
  public.sell_returns, public.seller_reviews, public.wanted_items
to authenticated;

-- Existing social tables already have grants; repeat harmlessly for completeness.
grant select,insert,update,delete on public.collector_profiles, public.collector_follows,
  public.collector_posts, public.collector_post_comments, public.collector_post_likes,
  public.collector_post_reactions to authenticated;

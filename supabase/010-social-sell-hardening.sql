
-- Harden VEXUM Social/Sell foundation after advisor review.

-- Product tags must support either canonical product_id OR owned-copy portfolio_item_id.
alter table public.collector_post_products
  add column if not exists id uuid default gen_random_uuid();
alter table public.collector_post_products drop constraint if exists collector_post_products_pkey;
alter table public.collector_post_products alter column product_id drop not null;
alter table public.collector_post_products alter column portfolio_item_id drop not null;
alter table public.collector_post_products alter column id set not null;
alter table public.collector_post_products add constraint collector_post_products_pkey primary key (id);
create unique index if not exists collector_post_products_identity_uq
  on public.collector_post_products(post_id,coalesce(product_id,''),coalesce(portfolio_item_id,''));

-- Avoid RLS recursion: a user can inspect their own membership row.
drop policy if exists collector_community_members_read on public.collector_community_members;
create policy collector_community_members_read on public.collector_community_members for select to authenticated
  using (user_id=(select auth.uid()));

drop policy if exists social_conversation_members_read on public.social_conversation_members;
create policy social_conversation_members_read on public.social_conversation_members for select to authenticated
  using (user_id=(select auth.uid()));

-- Blocking is enforced server-side for follows and post interactions.
drop policy if exists collector_follows_insert_own on public.collector_follows;
create policy collector_follows_insert_own on public.collector_follows for insert to authenticated
  with check (
    follower_id=(select auth.uid())
    and follower_id<>following_id
    and not exists (
      select 1 from public.collector_blocks b
      where (b.blocker_user_id=follower_id and b.blocked_user_id=following_id)
         or (b.blocker_user_id=following_id and b.blocked_user_id=follower_id)
    )
  );

drop policy if exists collector_posts_insert_own on public.collector_posts;
create policy collector_posts_insert_own on public.collector_posts for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and (
      visibility<>'community'
      or (
        community_id is not null
        and (
          exists (
            select 1 from public.collector_community_members m
            where m.community_id=collector_posts.community_id
              and m.user_id=(select auth.uid()) and m.status='active'
          )
          or exists (
            select 1 from public.collector_communities c
            where c.id=collector_posts.community_id and c.owner_user_id=(select auth.uid())
          )
        )
      )
    )
  );
drop policy if exists collector_posts_update_own on public.collector_posts;
create policy collector_posts_update_own on public.collector_posts for update to authenticated
  using (user_id=(select auth.uid()))
  with check (
    user_id=(select auth.uid())
    and (
      visibility<>'community'
      or (
        community_id is not null
        and (
          exists (
            select 1 from public.collector_community_members m
            where m.community_id=collector_posts.community_id
              and m.user_id=(select auth.uid()) and m.status='active'
          )
          or exists (
            select 1 from public.collector_communities c
            where c.id=collector_posts.community_id and c.owner_user_id=(select auth.uid())
          )
        )
      )
    )
  );

drop policy if exists collector_comments_insert_own on public.collector_post_comments;
create policy collector_comments_insert_own on public.collector_post_comments for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and exists (
      select 1 from public.collector_posts p
      where p.id=post_id
        and not exists (
          select 1 from public.collector_blocks b
          where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=p.user_id)
             or (b.blocked_user_id=(select auth.uid()) and b.blocker_user_id=p.user_id)
        )
    )
  );

drop policy if exists collector_likes_insert_own on public.collector_post_likes;
create policy collector_likes_insert_own on public.collector_post_likes for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and exists (
      select 1 from public.collector_posts p
      where p.id=post_id
        and not exists (
          select 1 from public.collector_blocks b
          where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=p.user_id)
             or (b.blocked_user_id=(select auth.uid()) and b.blocker_user_id=p.user_id)
        )
    )
  );

drop policy if exists collector_reactions_insert_own on public.collector_post_reactions;
create policy collector_reactions_insert_own on public.collector_post_reactions for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and exists (
      select 1 from public.collector_posts p
      where p.id=post_id
        and not exists (
          select 1 from public.collector_blocks b
          where (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=p.user_id)
             or (b.blocked_user_id=(select auth.uid()) and b.blocker_user_id=p.user_id)
        )
    )
  );

drop policy if exists social_messages_insert on public.social_messages;
create policy social_messages_insert on public.social_messages for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and exists (
      select 1 from public.social_conversation_members m
      where m.conversation_id=social_messages.conversation_id and m.user_id=(select auth.uid())
    )
    and not exists (
      select 1
      from public.social_conversation_members other
      join public.collector_blocks b
        on (b.blocker_user_id=(select auth.uid()) and b.blocked_user_id=other.user_id)
        or (b.blocked_user_id=(select auth.uid()) and b.blocker_user_id=other.user_id)
      where other.conversation_id=social_messages.conversation_id
        and other.user_id<>(select auth.uid())
    )
  );

-- Prevent seller self-reviews.
drop policy if exists seller_reviews_insert on public.seller_reviews;
create policy seller_reviews_insert on public.seller_reviews for insert to authenticated
  with check (
    reviewer_user_id=(select auth.uid())
    and exists (
      select 1 from public.sell_orders o
      where o.id=order_id
        and o.buyer_user_id=(select auth.uid())
        and seller_user_id=o.seller_user_id
    )
  );

-- Cover foreign keys used by RLS/joins.
create index if not exists collector_blocks_blocked_idx on public.collector_blocks(blocked_user_id);
create index if not exists collector_stock_confirmations_user_idx on public.collector_stock_confirmations(user_id);
create index if not exists collector_stock_reports_user_idx on public.collector_stock_reports(user_id);
create index if not exists sell_listings_shipping_profile_idx on public.sell_listings(shipping_profile_id);
create index if not exists sell_offers_buyer_idx on public.sell_offers(buyer_user_id);
create index if not exists sell_order_items_listing_idx on public.sell_order_items(listing_id);
create index if not exists sell_orders_buyer_idx on public.sell_orders(buyer_user_id);
create index if not exists sell_orders_listing_idx on public.sell_orders(listing_id);
create index if not exists sell_returns_order_idx on public.sell_returns(order_id);
create index if not exists sell_shipments_order_idx on public.sell_shipments(order_id);
create index if not exists sell_shipping_profiles_user_idx on public.sell_shipping_profiles(user_id);
create index if not exists seller_reviews_reviewer_idx on public.seller_reviews(reviewer_user_id);
create index if not exists social_conversations_created_by_idx on public.social_conversations(created_by);
create index if not exists social_messages_user_idx on public.social_messages(user_id);

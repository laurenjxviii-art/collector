alter table public.collector_public_items
  add column if not exists current_value numeric(12,2) not null default 0;

alter table public.collector_public_items
  drop constraint if exists collector_public_items_pkey;

alter table public.collector_public_items
  add primary key (user_id,item_id,status);

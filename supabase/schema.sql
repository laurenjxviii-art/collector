-- Run in Supabase SQL Editor when connecting authentication and cloud sync.
create table public.collections (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, icon text not null default '◇', color text not null default '#a5b7ff',
 created_at timestamptz not null default now(), unique (id,user_id)
);
create table public.items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 collection_id uuid not null, name text not null, category text not null default '',
 status text not null check(status in ('owned','wishlist','sold')) default 'owned',
 purchase_price numeric(12,2) not null default 0 check(purchase_price >= 0),
 current_value numeric(12,2) not null default 0 check(current_value >= 0),
 quantity integer not null default 1 check(quantity > 0), image text not null default '',
 condition text not null default '', purchase_date date, location text not null default '', notes text not null default '',
 custom_fields jsonb not null default '{}' check(jsonb_typeof(custom_fields)='object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(collection_id,user_id) references public.collections(id,user_id)
);
alter table public.collections enable row level security;
alter table public.items enable row level security;
create policy "Own collections" on public.collections for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "Own items" on public.items for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create index items_owner_collection on public.items(user_id,collection_id);
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;
create trigger items_updated before update on public.items for each row execute function public.set_updated_at();

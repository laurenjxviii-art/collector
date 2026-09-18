-- Apply after schema.sql when connecting cloud sync.
alter table public.collections add column logo text not null default '';
create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', image text not null default ''
);
create table public.value_history (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, values jsonb not null default '{}' check(jsonb_typeof(values)='object'),
 primary key(user_id,day)
);
alter table public.profiles enable row level security;
alter table public.value_history enable row level security;
create policy "Own profile" on public.profiles for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "Own history" on public.value_history for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

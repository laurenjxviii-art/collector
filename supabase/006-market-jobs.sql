create table if not exists public.collector_market_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  external_run_id text not null,
  state text not null default 'running' check (state in ('running','completed','failed')),
  item_ids jsonb not null default '[]'::jsonb,
  queries jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text
);
create index if not exists collector_market_jobs_user_provider_idx on public.collector_market_jobs(user_id,provider,started_at desc);
create unique index if not exists collector_market_jobs_one_running_idx on public.collector_market_jobs(user_id,provider) where state='running';
alter table public.collector_market_jobs enable row level security;

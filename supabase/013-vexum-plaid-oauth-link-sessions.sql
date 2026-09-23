-- VEXUM Plaid OAuth Link-session persistence (additive only).
-- Keeps Link tokens server-side and tied to the authenticated VEXUM user.

create table if not exists public.collector_plaid_link_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text references public.collector_plaid_items(item_id) on delete set null,
  mode text not null check (mode in ('connect','update')),
  status text not null default 'pending' check (status in ('pending','completed','expired','superseded','cancelled')),
  link_token text not null,
  expires_at timestamptz not null,
  oauth_state_id text not null default '',
  received_redirect_uri text not null default '',
  plaid_link_session_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists collector_plaid_link_sessions_user_status_idx
  on public.collector_plaid_link_sessions(user_id,status,created_at desc);

create index if not exists collector_plaid_link_sessions_expiry_idx
  on public.collector_plaid_link_sessions(expires_at)
  where status='pending';

alter table public.collector_plaid_link_sessions enable row level security;

-- Link tokens never belong in browser-readable Supabase tables.
revoke all on public.collector_plaid_link_sessions from anon,authenticated;
grant select,insert,update,delete on public.collector_plaid_link_sessions to service_role;

-- VEXUM Plaid production integration (additive only).
-- Existing manual Financial workspace JSON and existing Plaid rows are preserved.

alter table public.collector_plaid_items
  add column if not exists status text not null default 'active',
  add column if not exists error_type text not null default '',
  add column if not exists error_code text not null default '',
  add column if not exists error_message text not null default '',
  add column if not exists products jsonb not null default '[]'::jsonb,
  add column if not exists available_products jsonb not null default '[]'::jsonb,
  add column if not exists billed_products jsonb not null default '[]'::jsonb,
  add column if not exists product_status jsonb not null default '{}'::jsonb,
  add column if not exists last_webhook_at timestamptz,
  add column if not exists last_webhook_code text not null default '',
  add column if not exists last_link_session_id text not null default '';

alter table public.collector_plaid_accounts
  add column if not exists limit_balance numeric,
  add column if not exists unofficial_currency_code text not null default '',
  add column if not exists persistent_account_id text not null default '',
  add column if not exists last_synced_at timestamptz,
  add column if not exists raw jsonb not null default '{}'::jsonb;

alter table public.collector_plaid_transactions
  add column if not exists authorized_datetime timestamptz,
  add column if not exists transaction_code text not null default '',
  add column if not exists counterparties jsonb not null default '[]'::jsonb,
  add column if not exists location jsonb not null default '{}'::jsonb,
  add column if not exists raw jsonb not null default '{}'::jsonb;

create table if not exists public.collector_plaid_recurring_streams (
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id text not null,
  plaid_item_id text not null references public.collector_plaid_items(item_id) on delete cascade,
  account_id text not null,
  direction text not null check (direction in ('inflow','outflow')),
  description text not null default '',
  merchant_name text not null default '',
  frequency text not null default '',
  status text not null default '',
  average_amount numeric,
  last_amount numeric,
  first_date date,
  last_date date,
  personal_finance_category jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,stream_id)
);
create table if not exists public.collector_plaid_liabilities (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  plaid_item_id text not null references public.collector_plaid_items(item_id) on delete cascade,
  liability_type text not null,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,account_id)
);
create table if not exists public.collector_plaid_securities (
  user_id uuid not null references auth.users(id) on delete cascade,
  security_id text not null,
  name text not null default '',
  ticker_symbol text not null default '',
  type text not null default '',
  close_price numeric,
  close_price_as_of date,
  iso_currency_code text not null default '',
  unofficial_currency_code text not null default '',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,security_id)
);
create table if not exists public.collector_plaid_investment_holdings (
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null references public.collector_plaid_items(item_id) on delete cascade,
  account_id text not null,
  security_id text not null,
  quantity numeric,
  institution_price numeric,
  institution_value numeric,
  cost_basis numeric,
  iso_currency_code text not null default '',
  unofficial_currency_code text not null default '',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,account_id,security_id)
);
create table if not exists public.collector_plaid_investment_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_transaction_id text not null,
  plaid_item_id text not null references public.collector_plaid_items(item_id) on delete cascade,
  account_id text not null,
  security_id text not null default '',
  date date,
  name text not null default '',
  type text not null default '',
  subtype text not null default '',
  amount numeric,
  quantity numeric,
  price numeric,
  fees numeric,
  iso_currency_code text not null default '',
  unofficial_currency_code text not null default '',
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id,investment_transaction_id)
);
create table if not exists public.collector_plaid_webhook_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null,
  webhook_type text not null default '',
  webhook_code text not null default '',
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text not null default ''
);

create index if not exists collector_plaid_items_user_idx on public.collector_plaid_items(user_id);
create index if not exists collector_plaid_accounts_user_idx on public.collector_plaid_accounts(user_id);
create index if not exists collector_plaid_accounts_item_idx on public.collector_plaid_accounts(plaid_item_id);
create index if not exists collector_plaid_transactions_user_date_idx on public.collector_plaid_transactions(user_id,date desc);
create index if not exists collector_plaid_transactions_item_idx on public.collector_plaid_transactions(plaid_item_id);
create index if not exists collector_plaid_holdings_item_only_idx on public.collector_plaid_investment_holdings(plaid_item_id);
create index if not exists collector_plaid_investment_tx_item_only_idx on public.collector_plaid_investment_transactions(plaid_item_id);
create index if not exists collector_plaid_liabilities_item_only_idx on public.collector_plaid_liabilities(plaid_item_id);
create index if not exists collector_plaid_recurring_item_only_idx on public.collector_plaid_recurring_streams(plaid_item_id);
create index if not exists collector_plaid_webhook_item_idx on public.collector_plaid_webhook_events(plaid_item_id,received_at desc);
create index if not exists collector_plaid_webhook_user_idx on public.collector_plaid_webhook_events(user_id);

alter table public.collector_plaid_recurring_streams enable row level security;
alter table public.collector_plaid_liabilities enable row level security;
alter table public.collector_plaid_securities enable row level security;
alter table public.collector_plaid_investment_holdings enable row level security;
alter table public.collector_plaid_investment_transactions enable row level security;
alter table public.collector_plaid_webhook_events enable row level security;

-- Plaid access tokens and raw banking records are deliberately server-only.
revoke all on public.collector_plaid_items from anon,authenticated;
revoke all on public.collector_plaid_accounts from anon,authenticated;
revoke all on public.collector_plaid_transactions from anon,authenticated;
revoke all on public.collector_plaid_recurring_streams from anon,authenticated;
revoke all on public.collector_plaid_liabilities from anon,authenticated;
revoke all on public.collector_plaid_securities from anon,authenticated;
revoke all on public.collector_plaid_investment_holdings from anon,authenticated;
revoke all on public.collector_plaid_investment_transactions from anon,authenticated;
revoke all on public.collector_plaid_webhook_events from anon,authenticated;

grant select,insert,update,delete on public.collector_plaid_items to service_role;
grant select,insert,update,delete on public.collector_plaid_accounts to service_role;
grant select,insert,update,delete on public.collector_plaid_transactions to service_role;
grant select,insert,update,delete on public.collector_plaid_recurring_streams to service_role;
grant select,insert,update,delete on public.collector_plaid_liabilities to service_role;
grant select,insert,update,delete on public.collector_plaid_securities to service_role;
grant select,insert,update,delete on public.collector_plaid_investment_holdings to service_role;
grant select,insert,update,delete on public.collector_plaid_investment_transactions to service_role;
grant select,insert,update,delete on public.collector_plaid_webhook_events to service_role;

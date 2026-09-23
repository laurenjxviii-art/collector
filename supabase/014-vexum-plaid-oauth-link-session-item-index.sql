-- Cover the optional Plaid Item foreign key used by Update Mode sessions.

create index if not exists collector_plaid_link_sessions_item_idx
  on public.collector_plaid_link_sessions(plaid_item_id)
  where plaid_item_id is not null;

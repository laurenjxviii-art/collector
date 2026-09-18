-- Standalone cloud sync schema for Collector.
create table if not exists public.collector_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'version'='1' and jsonb_typeof(payload->'collections')='array' and jsonb_typeof(payload->'items')='array'),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.collector_workspaces enable row level security;

drop policy if exists "Read own workspace" on public.collector_workspaces;
drop policy if exists "Insert own workspace" on public.collector_workspaces;
drop policy if exists "Update own workspace" on public.collector_workspaces;
create policy "Read own workspace" on public.collector_workspaces for select to authenticated using((select auth.uid())=user_id);
create policy "Insert own workspace" on public.collector_workspaces for insert to authenticated with check((select auth.uid())=user_id);
create policy "Update own workspace" on public.collector_workspaces for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.collector_workspaces from anon, authenticated;
grant select,insert,update on public.collector_workspaces to authenticated;

create or replace function public.collector_save_workspace(new_payload jsonb,expected_revision bigint)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare caller uuid=auth.uid(); resulting_revision bigint; resulting_time timestamptz;
begin
 if caller is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if expected_revision<0 or new_payload is null or jsonb_typeof(new_payload)!='object' or new_payload->>'version' is distinct from '1' or jsonb_typeof(new_payload->'collections') is distinct from 'array' or jsonb_typeof(new_payload->'items') is distinct from 'array' then raise exception 'Invalid workspace'; end if;
 if octet_length(new_payload::text)>10485760 then raise exception 'Workspace exceeds 10 MB limit'; end if;
 if expected_revision=0 then
  insert into public.collector_workspaces(user_id,payload,revision,updated_at) values(caller,new_payload,1,now())
  on conflict(user_id) do nothing returning revision,updated_at into resulting_revision,resulting_time;
 else
  update public.collector_workspaces set payload=new_payload,revision=revision+1,updated_at=now()
  where user_id=caller and revision=expected_revision
  returning revision,updated_at into resulting_revision,resulting_time;
 end if;
 return jsonb_build_object('saved',resulting_revision is not null,'revision',resulting_revision,'updated_at',resulting_time);
end;
$$;
revoke all on function public.collector_save_workspace(jsonb,bigint) from public,anon;
grant execute on function public.collector_save_workspace(jsonb,bigint) to authenticated;

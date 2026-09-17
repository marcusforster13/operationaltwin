create table if not exists public.twin_planning (
 owner_id uuid not null references auth.users(id) on delete cascade,
 map_id text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=1048576),
 primary key(owner_id,map_id),
 foreign key(owner_id,map_id) references public.twin_map_access(user_id,map_id) on delete cascade,
 check(payload->>'mapId' is not null and payload->>'mapId'=map_id and payload->>'schema' is not null and payload->>'schema'='operational-twin-planning-v1')
);
alter table public.twin_planning enable row level security;
revoke all on public.twin_planning from public,anon,authenticated;
grant select,insert,update on public.twin_planning to authenticated;
create policy twin_planning_own on public.twin_planning for all to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from public.twin_map_access a where a.user_id=(select auth.uid()) and a.map_id=twin_planning.map_id))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.twin_map_access a where a.user_id=(select auth.uid()) and a.map_id=twin_planning.map_id));

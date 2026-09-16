-- Apply once in the Supabase SQL editor. No privileged key is used by the app.
create table if not exists public.twin_map_access (
 user_id uuid not null references auth.users(id) on delete cascade,
 map_id text not null check (map_id ~ '^[a-z0-9-]{1,80}$'),
 primary key(user_id,map_id)
);
create table if not exists public.twin_sessions (
 owner_id uuid not null references auth.users(id) on delete cascade,
 map_id text not null,
 session_id text not null check (length(session_id) between 1 and 200),
 started_at double precision not null,
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=16777216),
 primary key(owner_id,map_id,session_id),
 foreign key(owner_id,map_id) references public.twin_map_access(user_id,map_id) on delete cascade,
 check(payload->>'mapId'=map_id and payload->>'id'=session_id and payload->>'mode'='simulation')
);
alter table public.twin_map_access enable row level security;
alter table public.twin_sessions enable row level security;
revoke all on public.twin_map_access, public.twin_sessions from anon;
revoke all on public.twin_map_access from authenticated;
grant select on public.twin_map_access to authenticated;
revoke all on public.twin_sessions from authenticated;
grant select on public.twin_sessions to authenticated;
create policy twin_access_own on public.twin_map_access for select to authenticated using(user_id=(select auth.uid()));
create policy twin_sessions_own on public.twin_sessions for all to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from public.twin_map_access a where a.user_id=(select auth.uid()) and a.map_id=twin_sessions.map_id))
 with check(owner_id=(select auth.uid()) and exists(select 1 from public.twin_map_access a where a.user_id=(select auth.uid()) and a.map_id=twin_sessions.map_id));
create or replace function public.twin_save_session(p_map_id text,p_session jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.twin_map_access a where a.user_id=auth.uid() and a.map_id=p_map_id) or p_session->>'mapId' is distinct from p_map_id or p_session->>'mode' is distinct from 'simulation'
 then raise exception 'Invalid session'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_map_id,0));
 insert into public.twin_sessions(owner_id,map_id,session_id,started_at,payload)
 values(auth.uid(),p_map_id,p_session->>'id',(p_session->>'startedAt')::double precision,p_session)
 on conflict(owner_id,map_id,session_id) do update set started_at=excluded.started_at,payload=excluded.payload;
 delete from public.twin_sessions where owner_id=auth.uid() and map_id=p_map_id and session_id in
 (select session_id from public.twin_sessions where owner_id=auth.uid() and map_id=p_map_id order by started_at desc,session_id desc offset 10);
end $$;
revoke all on function public.twin_save_session(text,jsonb) from public,anon;
grant execute on function public.twin_save_session(text,jsonb) to authenticated;
-- Provision users through Supabase Auth with public signup disabled, then grant each map:
-- insert into public.twin_map_access(user_id,map_id) values ('ACTUAL_AUTH_USER_UUID','tabajaras'),('ACTUAL_AUTH_USER_UUID','cantagalo');

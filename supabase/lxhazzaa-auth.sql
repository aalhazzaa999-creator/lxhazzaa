-- LXHAZZAA shared identity: run once in the project's Supabase SQL editor.
create type public.lx_role as enum ('researcher','verified_researcher','scientific_moderator','admin','owner');
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 role public.lx_role not null default 'researcher',
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Read own profile" on public.profiles for select to authenticated using (auth.uid()=id);
-- No user-facing INSERT/UPDATE/DELETE policy: clients cannot assign or promote roles.
create or replace function public.lx_create_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,role) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80),'researcher');
 return new;
end $$;
create trigger lx_new_user after insert on auth.users for each row execute function public.lx_create_profile();
-- Owner role must be assigned manually AFTER verifying ownership of the email account.
-- Example (execute only after verification): UPDATE public.profiles SET role='owner'
-- WHERE id=(SELECT id FROM auth.users WHERE email='lxhazzaa@gmail.com' AND email_confirmed_at IS NOT NULL);
-- Later admin operations should use authenticated server-side functions with owner-only checks.

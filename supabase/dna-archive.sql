-- Private custody is not verified sample ownership. No publication or training grants.
create table public.lx_dna_archive (
 id uuid primary key default gen_random_uuid(), custodian_id uuid not null default auth.uid() references auth.users(id),
 kit_id text not null check(length(kit_id) between 1 and 100), provider text not null default 'FTDNA' check(length(provider) between 1 and 80),
 kind text not null check(kind in ('str','autosomal','evidence')), country text not null check(length(country) between 1 and 100),
 location_note text not null default '' check(length(location_note)<=300), personal_name text not null default '' check(length(personal_name)<=150),
 contact_email text not null check(length(contact_email)<=254), show_email boolean not null default false,
 file_path text not null unique, file_name text not null check(length(file_name)<=250), file_sha256 text not null check(file_sha256 ~ '^[0-9a-f]{64}$'),
 report jsonb not null default '{}'::jsonb check(pg_column_size(report)<=500000),
 status text not null default 'uploading' check(status in ('uploading','saved','upload_failed','awaiting_review')),
 consent_version text not null check(consent_version='dna-private-v1'), consented_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(custodian_id,provider,kit_id,kind), check(file_path = custodian_id::text || '/' || id::text || '/original')
);
alter table public.lx_dna_archive enable row level security;
create policy dna_archive_read on public.lx_dna_archive for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and not p.permissions_suspended and (custodian_id=auth.uid() or p.role='owner')));
create policy dna_archive_add on public.lx_dna_archive for insert to authenticated with check (
 custodian_id=auth.uid() and status='uploading' and report='{}'::jsonb and exists(select 1 from public.profiles p where p.id=auth.uid() and not p.permissions_suspended));
create policy dna_archive_edit on public.lx_dna_archive for update to authenticated using (
 custodian_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and not p.permissions_suspended)) with check (custodian_id=auth.uid());
revoke all on public.lx_dna_archive from anon, authenticated;
grant select,insert on public.lx_dna_archive to authenticated;
grant update(personal_name,show_email,report,status) on public.lx_dna_archive to authenticated;
create index dna_archive_custodian on public.lx_dna_archive(custodian_id,created_at desc);
create table public.lx_dna_geo_requests (
 id uuid primary key default gen_random_uuid(), sample_id uuid not null references public.lx_dna_archive(id), requester_id uuid not null default auth.uid() references auth.users(id),
 proposed_country text not null check(length(proposed_country) between 1 and 100), proposed_location text not null default '' check(length(proposed_location)<=300),
 reason text not null check(length(trim(reason)) between 10 and 2000), status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decision_note text not null default '' check(length(decision_note)<=2000), decided_by uuid references auth.users(id), decided_at timestamptz, created_at timestamptz not null default now()
);
alter table public.lx_dna_geo_requests enable row level security;
create policy dna_requests_read on public.lx_dna_geo_requests for select to authenticated using (
 exists(select 1 from public.lx_dna_archive a where a.id=sample_id));
create policy dna_requests_add on public.lx_dna_geo_requests for insert to authenticated with check (
 requester_id=auth.uid() and status='pending' and decided_by is null and decided_at is null and exists(select 1 from public.lx_dna_archive a where a.id=sample_id and a.custodian_id=auth.uid()));
create policy dna_requests_owner_decide on public.lx_dna_geo_requests for update to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner' and not p.permissions_suspended)) with check (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='owner' and not p.permissions_suspended));
revoke all on public.lx_dna_geo_requests from anon,authenticated;
grant select,insert on public.lx_dna_geo_requests to authenticated;
grant update(status,decision_note) on public.lx_dna_geo_requests to authenticated;
create index dna_requests_sample on public.lx_dna_geo_requests(sample_id,created_at desc);
create unique index dna_requests_pending on public.lx_dna_geo_requests(sample_id) where status='pending';
create schema if not exists lx_dna_internal;
revoke all on schema lx_dna_internal from public,anon,authenticated;
create function lx_dna_internal.decide_geo() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status<>'pending' or new.status not in ('approved','rejected') then raise exception 'Request already decided or invalid decision'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and role='owner' and not permissions_suspended) then raise exception 'Owner approval required'; end if;
 new.decided_by:=auth.uid(); new.decided_at:=now();
 if new.status='approved' then update public.lx_dna_archive set country=new.proposed_country,location_note=new.proposed_location where id=new.sample_id; end if;
 return new;
end $$;
revoke all on function lx_dna_internal.decide_geo() from public,anon,authenticated;
create trigger dna_geo_decision before update on public.lx_dna_geo_requests for each row execute function lx_dna_internal.decide_geo();
create table public.lx_dna_audit (
 id bigint generated always as identity primary key, sample_id uuid not null references public.lx_dna_archive(id), actor_id uuid references auth.users(id), action text not null, changes jsonb not null, created_at timestamptz not null default now()
);
alter table public.lx_dna_audit enable row level security;
create policy dna_audit_read on public.lx_dna_audit for select to authenticated using(exists(select 1 from public.lx_dna_archive a where a.id=sample_id));
revoke all on public.lx_dna_audit from anon,authenticated;grant select on public.lx_dna_audit to authenticated;
create index dna_audit_sample on public.lx_dna_audit(sample_id,created_at desc);
create function lx_dna_internal.audit_sample() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.lx_dna_audit(sample_id,actor_id,action,changes) values(new.id,auth.uid(),lower(tg_op),case when tg_op='INSERT' then jsonb_build_object('status',new.status,'country',new.country) else jsonb_build_object('before',jsonb_build_object('country',old.country,'location',old.location_note,'name',old.personal_name,'showEmail',old.show_email,'status',old.status,'report',old.report),'after',jsonb_build_object('country',new.country,'location',new.location_note,'name',new.personal_name,'showEmail',new.show_email,'status',new.status,'report',new.report)) end);
 return new;
end $$;
revoke all on function lx_dna_internal.audit_sample() from public,anon,authenticated;
create trigger dna_archive_audit after insert or update on public.lx_dna_archive for each row execute function lx_dna_internal.audit_sample();
insert into storage.buckets(id,name,public,file_size_limit) values('lx-dna-private','lx-dna-private',false,20971520);
create policy dna_private_upload on storage.objects for insert to authenticated with check(bucket_id='lx-dna-private' and exists(select 1 from public.lx_dna_archive a where a.file_path=name and a.custodian_id=auth.uid() and a.status='uploading'));
create policy dna_private_read on storage.objects for select to authenticated using(bucket_id='lx-dna-private' and exists(select 1 from public.lx_dna_archive a where a.file_path=name));
-- No overwrite/delete grant. Originals are immutable through the app.

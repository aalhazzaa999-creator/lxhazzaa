-- Names and marker values stay private, separate from the allowlisted public tree snapshot.
create table public.lx_dna_project_reference (
 provider text not null default 'FTDNA' check(provider='FTDNA'),
 kit_id text not null,
 snapshot text not null,
 snp_confirmed boolean not null,
 marker_loci integer not null check(marker_loci between 0 and 111),
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(provider,kit_id)
);
alter table public.lx_dna_project_reference enable row level security;
revoke all on public.lx_dna_project_reference from public,anon,authenticated;
grant select on public.lx_dna_project_reference to authenticated;
create policy dna_project_owner_read on public.lx_dna_project_reference for select to authenticated using(
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and not p.permissions_suspended)
);
create index dna_project_reference_eligible on public.lx_dna_project_reference(snp_confirmed,marker_loci);

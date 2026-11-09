-- Documentary contributions. Originals stay in private Storage; only reviewed metadata is public.
create table if not exists public.lx_documents (
 id uuid primary key default gen_random_uuid(),
 contributor_id uuid not null references auth.users(id),
 kind text not null check (kind in ('document','manuscript','inscription')),
 title text not null check (length(trim(title)) between 3 and 300),
 original_language text not null,
 script text,
 holding_institution text,
 shelfmark text,
 source_url text,
 source_citation text,
 original_owner text,
 provider_credit text,
 researcher_credit text,
 rights_basis text not null check (rights_basis in ('own','permission','open_license','metadata_only')),
 rights_evidence text,
 permitted_display text not null default 'metadata_only' check (permitted_display in ('metadata_only','view_only','download_allowed')),
 original_transcription text,
 transcription_status text not null default 'unread' check (transcription_status in ('unread','partial','draft','reviewed')),
 translation_text text,
 translation_language text,
 translation_status text not null default 'not_started' check (translation_status in ('not_started','draft','reviewed')),
 original_file_path text,
 status text not null default 'draft' check (status in ('draft','submitted','published','rejected','restricted')),
 rights_attested_at timestamptz,
 reviewer_id uuid references auth.users(id),
 reviewed_at timestamptz,
 review_note text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (translation_text is null or original_transcription is not null),
 check (original_file_path is null or rights_basis <> 'metadata_only')
);
create index if not exists lx_documents_contributor_idx on public.lx_documents(contributor_id,created_at desc);
create index if not exists lx_documents_status_idx on public.lx_documents(status,created_at desc);
alter table public.lx_documents enable row level security;
revoke all on public.lx_documents from anon,authenticated;
grant select,insert on public.lx_documents to authenticated;
grant update (kind,title,original_language,script,holding_institution,shelfmark,source_url,source_citation,original_owner,provider_credit,researcher_credit,rights_basis,rights_evidence,permitted_display,original_transcription,transcription_status,translation_text,translation_language,translation_status,original_file_path) on public.lx_documents to authenticated;
create policy "Contributor or reviewer reads submissions" on public.lx_documents for select to authenticated
 using ((select auth.uid())=contributor_id or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('scientific_moderator','admin','owner')));
create policy "Verified researcher creates draft" on public.lx_documents for insert to authenticated
 with check ((select auth.uid())=contributor_id and status='draft' and original_file_path is null and rights_attested_at is null
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('verified_researcher','scientific_moderator','admin','owner')));
create policy "Contributor edits only draft" on public.lx_documents for update to authenticated
 using ((select auth.uid())=contributor_id and status='draft') with check ((select auth.uid())=contributor_id and status='draft');

create or replace function public.lx_submit_document(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('verified_researcher','scientific_moderator','admin','owner')) then raise exception 'Not an approved contributor'; end if;
 if not exists(select 1 from public.lx_legal_acceptances a join public.lx_legal_documents d on d.document_type=a.document_type and d.version=a.version where a.user_id=(select auth.uid()) and d.is_current and d.document_type='terms') then raise exception 'Current terms acceptance required'; end if;
 update public.lx_documents set status='submitted',rights_attested_at=now(),updated_at=now() where id=p_id and contributor_id=(select auth.uid()) and status='draft'
   and (rights_basis='metadata_only' or (rights_evidence is not null and length(trim(rights_evidence))>10))
   and (original_file_path is null or exists(select 1 from storage.objects o where o.bucket_id='lx-source-originals' and o.name=public.lx_documents.original_file_path));
 if not found then raise exception 'Draft, rights evidence, or uploaded file is incomplete'; end if;
end $$;
create or replace function public.lx_review_document(p_id uuid,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('scientific_moderator','admin','owner')) then raise exception 'Review access denied'; end if;
 if p_decision not in ('published','rejected','restricted') then raise exception 'Invalid decision'; end if;
 update public.lx_documents set status=p_decision,reviewer_id=(select auth.uid()),reviewed_at=now(),review_note=left(p_note,2000),updated_at=now()
 where id=p_id and status in ('submitted','published','restricted');
 if not found then raise exception 'Record unavailable for review'; end if;
end $$;
create or replace function public.lx_public_documents()
returns table(id uuid,kind text,title text,original_language text,script text,holding_institution text,shelfmark text,source_url text,source_citation text,original_owner text,provider_credit text,researcher_credit text,rights_basis text,permitted_display text,original_transcription text,transcription_status text,translation_text text,translation_language text,translation_status text,reviewed_at timestamptz)
language sql stable security definer set search_path='' as $$
 select d.id,d.kind,d.title,d.original_language,d.script,d.holding_institution,d.shelfmark,d.source_url,d.source_citation,d.original_owner,d.provider_credit,d.researcher_credit,d.rights_basis,d.permitted_display,d.original_transcription,d.transcription_status,d.translation_text,d.translation_language,d.translation_status,d.reviewed_at from public.lx_documents d where d.status='published' order by d.reviewed_at desc limit 100
$$;
revoke all on function public.lx_submit_document(uuid),public.lx_review_document(uuid,text,text),public.lx_public_documents() from public;
grant execute on function public.lx_submit_document(uuid),public.lx_review_document(uuid,text,text) to authenticated;
grant execute on function public.lx_public_documents() to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('lx-source-originals','lx-source-originals',false,15728640,array['application/pdf','image/jpeg','image/png']) on conflict(id) do nothing;
create policy "Contributor uploads original once" on storage.objects for insert to authenticated with check (
 bucket_id='lx-source-originals' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.lx_documents d where d.id::text=(storage.foldername(name))[2] and d.contributor_id=(select auth.uid()) and d.status='draft' and d.rights_basis<>'metadata_only')
);
create policy "Contributor reads own original" on storage.objects for select to authenticated using (
 bucket_id='lx-source-originals' and ((storage.foldername(name))[1]=(select auth.uid())::text
 or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('scientific_moderator','admin','owner')))
);

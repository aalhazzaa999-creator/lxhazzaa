-- The published catalogue is temporarily restricted to approved documentary roles.
create or replace function public.lx_public_documents()
returns table(id uuid,kind text,title text,original_language text,script text,holding_institution text,shelfmark text,source_url text,source_citation text,original_owner text,provider_credit text,researcher_credit text,rights_basis text,permitted_display text,original_transcription text,transcription_status text,translation_text text,translation_language text,translation_status text,reviewed_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('verified_researcher','scientific_moderator','admin','owner')) then raise exception 'Documentary access denied'; end if;
 return query select d.id,d.kind,d.title,d.original_language,d.script,d.holding_institution,d.shelfmark,d.source_url,d.source_citation,d.original_owner,d.provider_credit,d.researcher_credit,d.rights_basis,d.permitted_display,d.original_transcription,d.transcription_status,d.translation_text,d.translation_language,d.translation_status,d.reviewed_at from public.lx_documents d where d.status='published' order by d.reviewed_at desc limit 100;
end $$;
revoke all on function public.lx_public_documents() from public,anon;
grant execute on function public.lx_public_documents() to authenticated;

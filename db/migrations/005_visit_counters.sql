-- Anonymous daily visits to the three LXHAZZAA platforms. Counts start at zero
-- when this migration is applied; no historic traffic is inferred.
create table if not exists public.lx_visit_counters (
  platform text primary key check (platform in ('home', 'remains', 'documents')),
  visits bigint not null default 0 check (visits >= 0)
);
alter table public.lx_visit_counters enable row level security;
revoke all on public.lx_visit_counters from public, anon, authenticated;
insert into public.lx_visit_counters (platform) values ('home'), ('remains'), ('documents')
on conflict (platform) do nothing;

create or replace function public.lx_record_visit(p_platform text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare n bigint;
begin
  if p_platform not in ('home', 'remains', 'documents') or p_platform is null then
    raise exception 'Invalid platform';
  end if;
  update public.lx_visit_counters set visits = visits + 1
  where platform = p_platform returning visits into n;
  return n;
end;
$$;

create or replace function public.lx_visit_totals()
returns table(platform text, visits bigint)
language sql security definer set search_path = '' as $$
  select v.platform, v.visits from public.lx_visit_counters v
  order by case v.platform when 'home' then 1 when 'remains' then 2 else 3 end;
$$;
revoke execute on function public.lx_record_visit(text) from public, anon, authenticated;
revoke execute on function public.lx_visit_totals() from public, anon, authenticated;
grant execute on function public.lx_record_visit(text) to anon, authenticated;
grant execute on function public.lx_visit_totals() to anon, authenticated;

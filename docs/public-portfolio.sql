-- Public portfolio is read-only. Raw tables, admin functions and keys retain RLS.
BEGIN;
create or replace function public.portfolio_public_view() returns jsonb
language sql stable security definer set search_path=public,extensions,pg_temp as $$
select jsonb_build_object(
 'settings',jsonb_build_object(
 'teacher',(select jsonb_object_agg(key,value) from jsonb_each(s.data->'teacher') where key in ('name','subject','school','administration','director','audience','timezone','bio','qualification','rank','experience','license')),
 'periods',s.data->'periods','current_period',s.data->'current_period',
 'criteria',s.data->'criteria','standard',s.data->'standard',
 'vision',s.data->'vision','mission',s.data->'mission','values',s.data->'values',
 'goals',s.data->'goals','career',s.data->'career',
 'schedules',coalesce((select jsonb_agg(sc-'original_path') from jsonb_array_elements(s.data->'schedules') sc),'[]')
 ),'evidence','[]'::jsonb,'attachments','[]'::jsonb
) from portfolio_settings s;
$$;
revoke all on function public.portfolio_public_view() from public,anon,authenticated;
grant execute on function public.portfolio_public_view() to anon,authenticated;
COMMIT;

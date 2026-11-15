-- NOT APPLIED. Production DDL was rejected by automatic approval review.
-- Requires explicit owner authorization before deployment.
-- Public numeric projection only; no target text, private evidence, images or keys.
create or replace function public.portfolio_public_completion()
returns jsonb language sql stable security definer
set search_path=public,extensions,pg_temp as $$
 with progress as (select public.portfolio_progress() as data)
 select jsonb_build_object(
   'period_id',data->>'period_id',
   'items',coalesce((select jsonb_agg(jsonb_build_object(
     'criterion',row->'criterion','total',row->'total',
     'done',row->'done','percent',row->'percent'
   )) from jsonb_array_elements(data->'rows') row),'[]'::jsonb)
 ) from progress;
$$;
revoke all on function public.portfolio_public_completion() from public,anon,authenticated;
grant execute on function public.portfolio_public_completion() to anon,authenticated;

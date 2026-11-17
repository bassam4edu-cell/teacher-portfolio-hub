begin;
create or replace function public.portfolio_public_documents() returns jsonb
language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'id',e.id,'title',e.title,'criterion',e.criterion,'period_id',e.period_id,
 'asset_id',a.id,'name',a.name,'mime',a.mime,'sha256',a.sha256,'size',a.size,
 'pages',case when jsonb_typeof(e.data->'document_pages')='number' and e.data->>'document_pages' ~ '^[0-9]{1,5}$' then (e.data->>'document_pages')::int else null end
 ) order by e.criterion,e.created_at,e.id),'[]'::jsonb)
 from public.portfolio_evidence e
 join public.portfolio_attachments a on a.evidence_id=e.id and a.id::text=e.data->>'public_document_asset_id'
 join public.portfolio_originals o on o.attachment_id=a.id
 where e.status='complete' and e.data->'document_only'='true'::jsonb and a.mime='application/pdf';
$$;
revoke all on function public.portfolio_public_documents() from public,anon,authenticated;
grant execute on function public.portfolio_public_documents() to anon,authenticated;
create or replace function public.portfolio_public_document(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$
declare result jsonb;
begin
 select jsonb_build_object('name',a.name,'mime',a.mime,'sha256',a.sha256,'base64',o.content_base64) into result
 from public.portfolio_evidence e
 join public.portfolio_attachments a on a.evidence_id=e.id and a.id::text=e.data->>'public_document_asset_id'
 join public.portfolio_originals o on o.attachment_id=a.id
 where e.id=p_id and e.status='complete' and e.data->'document_only'='true'::jsonb and a.mime='application/pdf';
 if result is null then raise exception 'الوثيقة غير متاحة' using errcode='P0002'; end if;
 return result;
end$$;
revoke all on function public.portfolio_public_document(uuid) from public,anon,authenticated;
grant execute on function public.portfolio_public_document(uuid) to anon,authenticated;
commit;

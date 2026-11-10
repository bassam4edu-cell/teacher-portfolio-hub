-- Explicit public report projections, read-only public feed, and authenticated agent API.
BEGIN;
create table if not exists public.portfolio_publications (
 id uuid primary key references public.portfolio_evidence(id),
 criterion integer not null check(criterion between 1 and 11),period_id text not null,
 title text not null,report jsonb not null,asset_ids uuid[] not null default '{}',
 is_public boolean not null default true,updated_at timestamptz not null default now()
);
alter table public.portfolio_publications enable row level security;
create policy publication_read on portfolio_publications for select to anon,authenticated
 using(is_public and exists(select 1 from portfolio_evidence e where e.id=id and e.status<>'archived'));
-- The RPC below projects public fields; anonymous table reads are deliberately revoked.
revoke all on public.portfolio_publications from anon,authenticated;
create table if not exists public.portfolio_public_updates(id boolean primary key default true check(id),revision bigint not null default 1,changed_at timestamptz not null default now());
insert into public.portfolio_public_updates(id) values(true) on conflict do nothing;
alter table public.portfolio_public_updates enable row level security;
create policy updates_read on portfolio_public_updates for select to anon,authenticated using(true);
grant select on portfolio_public_updates to anon,authenticated;
revoke insert,update,delete on portfolio_public_updates from anon,authenticated;
create or replace function public.portfolio_signal_update() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
 update portfolio_public_updates set revision=revision+1,changed_at=now() where id=true;return null;end$$;
create trigger public_settings_changed after insert or update on portfolio_settings for each statement execute function portfolio_signal_update();
create trigger public_report_changed after insert or update or delete on portfolio_publications for each statement execute function portfolio_signal_update();
create trigger public_evidence_changed after update on portfolio_evidence for each statement execute function portfolio_signal_update();
DO $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='portfolio_public_updates') then alter publication supabase_realtime add table public.portfolio_public_updates;end if;end$$;
create or replace function public.portfolio_agent_allowed(p_key text) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$
 select coalesce(portfolio_is_owner(),false) or exists(select 1 from portfolio_keys where token_hash=encode(digest(coalesce(p_key,''),'sha256'),'hex') and revoked_at is null and expires_at>now())$$;
revoke all on function portfolio_agent_allowed(text) from public,anon,authenticated;
create or replace function public.portfolio_agent_context(p_key text) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$begin
 if not portfolio_agent_allowed(p_key) then raise exception 'غير مصرح';end if;
 return jsonb_build_object('settings',(select jsonb_build_object('version',version,'data',data) from portfolio_settings),'evidence',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from portfolio_evidence e),'attachments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from portfolio_attachments a),'publications',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from portfolio_publications p));end$$;
revoke all on function portfolio_agent_context(text) from public,anon,authenticated;
grant execute on function portfolio_agent_context(text) to anon,authenticated;
create or replace function public.portfolio_agent_publish(p_package jsonb,p_key text default null) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare eid uuid;e portfolio_evidence;v integer;doc jsonb;images uuid[];rid text;ph text;cached portfolio_imports;begin
 if not portfolio_agent_allowed(p_key) then raise exception 'غير مصرح';end if;
 eid=(p_package->>'id')::uuid;v=(p_package->>'version')::int;rid=p_package->>'request_id';
 if coalesce(length(rid),0)<8 then raise exception 'معرف الطلب مطلوب';end if;
 ph=encode(digest(p_package::text,'sha256'),'hex');perform pg_advisory_xact_lock(hashtext(rid));select * into cached from portfolio_imports where request_id=rid;
 if cached.request_id is not null then if cached.payload_hash<>ph then raise exception 'معرف طلب مكرر بمحتوى مختلف';end if;return cached.result||'{"duplicate":true}'::jsonb;end if;
 select * into e from portfolio_evidence where id=eid for update;
 if e.id is null or e.version is distinct from v then raise exception 'تغيرت نسخة التقرير';end if;
 if e.status='archived' then raise exception 'التقرير مؤرشف';end if;
 doc=p_package->'report';
 if jsonb_typeof(doc) is distinct from 'object' or coalesce(doc->>'description','')='' or length(doc->>'description')>1800 or jsonb_typeof(doc->'objectives') is distinct from 'array' or jsonb_array_length(doc->'objectives') not between 1 and 5 then raise exception 'التقرير يحتاج وصفًا مختصرًا وهدفًا إلى خمسة أهداف';end if;
 if exists(select 1 from jsonb_object_keys(doc) k where k not in ('description','objectives','participants','place','duration','execution_on','date_estimated','audience','beneficiaries','field')) then raise exception 'يقبل التقرير حقول القالب المختصر فقط';end if;
 if exists(select 1 from jsonb_array_elements_text(doc->'objectives') o where length(o)>200) then raise exception 'الهدف أطول من مساحة القالب';end if;
 select coalesce(array_agg(value::uuid),'{}') into images from jsonb_array_elements_text(coalesce(p_package->'asset_ids','[]'));
 if cardinality(images)>12 or cardinality(images)<>(select count(distinct i) from unnest(images) i) then raise exception 'قائمة صور غير صالحة';end if;
 if exists(select 1 from unnest(images) i where not exists(select 1 from portfolio_attachments a join portfolio_originals o on o.attachment_id=a.id where a.id=i and a.evidence_id=eid and a.mime in ('image/jpeg','image/png','image/webp'))) then raise exception 'الصورة لا تتبع التقرير';end if;
 insert into portfolio_publications(id,criterion,period_id,title,report,asset_ids,is_public) values(e.id,e.criterion,e.period_id,e.title,doc,images,true)
 on conflict(id) do update set criterion=excluded.criterion,period_id=excluded.period_id,title=excluded.title,report=excluded.report,asset_ids=excluded.asset_ids,is_public=true,updated_at=now();
 insert into portfolio_imports(request_id,payload_hash,result) values(rid,ph,jsonb_build_object('id',eid,'published',true));return jsonb_build_object('id',eid,'published',true);end$$;
revoke all on function portfolio_agent_publish(jsonb,text) from public,anon,authenticated;
grant execute on function portfolio_agent_publish(jsonb,text) to anon,authenticated;
create or replace function public.portfolio_report_asset(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$declare output jsonb;begin
 select jsonb_build_object('name',a.name,'mime',a.mime,'sha256',a.sha256,'base64',o.content_base64) into output from portfolio_attachments a join portfolio_originals o on o.attachment_id=a.id
 where a.id=p_id and exists(select 1 from portfolio_publications p join portfolio_evidence e on e.id=p.id where p.is_public and e.status<>'archived' and a.id=any(p.asset_ids));
 if output is null then raise exception 'الصورة غير منشورة ضمن تقرير';end if;return output;end$$;
revoke all on function portfolio_report_asset(uuid) from public,anon,authenticated;
grant execute on function portfolio_report_asset(uuid) to anon,authenticated;
create or replace function public.portfolio_public_view() returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
select jsonb_build_object('revision',(select revision from portfolio_public_updates where id),
 'settings',jsonb_build_object(
 'teacher',(select jsonb_object_agg(key,value) from jsonb_each(s.data->'teacher') where key in ('name','subject','school','administration','director','audience','timezone','bio','qualification','rank','experience','license')),
 'periods',s.data->'periods','current_period',s.data->'current_period','criteria',s.data->'criteria','standard',s.data->'standard','vision',s.data->'vision','mission',s.data->'mission','values',s.data->'values','goals',s.data->'goals','career',s.data->'career',
 'schedules',coalesce((select jsonb_agg(sc-'original_path') from jsonb_array_elements(s.data->'schedules') sc),'[]')),
 'publications',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'criterion',p.criterion,'period_id',p.period_id,'title',p.title,'report',p.report,'updated_at',p.updated_at,'assets',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'mime',a.mime,'sha256',a.sha256,'size',a.size) order by array_position(p.asset_ids,a.id)),'[]') from portfolio_attachments a where a.id=any(p.asset_ids))) order by p.updated_at desc) from portfolio_publications p join portfolio_evidence e on e.id=p.id where p.is_public and e.status<>'archived'),'[]'),
 'evidence','[]'::jsonb,'attachments','[]'::jsonb
) from portfolio_settings s;$$;
revoke all on function portfolio_public_view() from public,anon,authenticated;
grant execute on function portfolio_public_view() to anon,authenticated;
COMMIT;

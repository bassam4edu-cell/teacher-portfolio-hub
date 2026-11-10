BEGIN;
create extension if not exists pgcrypto;
create table public.portfolio_owners(email text primary key);
insert into public.portfolio_owners values ('bassam4edu@gmail.com');
alter table public.portfolio_owners enable row level security;
create function public.portfolio_is_owner() returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$ select exists(select 1 from auth.users u join portfolio_owners o on lower(u.email)=o.email where u.id=auth.uid() and u.email_confirmed_at is not null) $$;
revoke all on function public.portfolio_is_owner() from public,anon,authenticated; grant execute on function public.portfolio_is_owner() to authenticated;
create table public.portfolio_settings(id boolean primary key default true check(id), data jsonb not null default '{}', version integer not null default 1, updated_at timestamptz not null default now());
create table public.portfolio_settings_history(id uuid primary key default gen_random_uuid(), data jsonb not null, version integer not null, changed_at timestamptz not null default now());
create table public.portfolio_evidence(id uuid primary key default gen_random_uuid(), period_id text not null, title text not null check(length(title)>0), kind text not null, criterion integer not null check(criterion between 1 and 11), target_id text, status text not null default 'draft' check(status in ('draft','incomplete','complete','archived')), data jsonb not null default '{}', version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.portfolio_versions(id uuid primary key default gen_random_uuid(), evidence_id uuid not null references portfolio_evidence(id), version integer not null, snapshot jsonb not null, actor uuid, changed_at timestamptz not null default now(), unique(evidence_id,version));
create table public.portfolio_attachments(id uuid primary key default gen_random_uuid(), evidence_id uuid references portfolio_evidence(id), purpose text not null default 'evidence' check(purpose in ('evidence','schedule')), path text unique not null, name text not null, mime text not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), size bigint not null check(size between 1 and 20971520), created_at timestamptz not null default now(), unique(evidence_id,sha256));
create table public.portfolio_originals(attachment_id uuid primary key references portfolio_attachments(id), content_base64 text not null);
create table public.portfolio_shares(id uuid primary key default gen_random_uuid(), token_hash text unique not null, email text not null, user_id uuid, role text not null default 'reviewer' check(role in ('reviewer','visitor')), evidence_ids uuid[] not null default '{}', sections text[] not null default '{}', expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now());
create table public.portfolio_reviews(id uuid primary key default gen_random_uuid(), evidence_id uuid not null references portfolio_evidence(id), version integer not null, reviewer_id uuid not null default auth.uid(), reviewer_email text not null, status text not null check(status in ('pending','reviewed','changes_requested')), note text not null default '', created_at timestamptz not null default now());
create table public.portfolio_imports(request_id text primary key, payload_hash text not null, result jsonb not null, created_at timestamptz not null default now());
create table public.portfolio_keys(id uuid primary key default gen_random_uuid(), token_hash text unique not null, label text not null, expires_at timestamptz not null, revoked_at timestamptz, created_at timestamptz not null default now());
create function public.portfolio_can_view(eid uuid) returns boolean language sql stable security definer set search_path=public,extensions,pg_temp as $$select portfolio_is_owner() or exists(select 1 from portfolio_shares where user_id=auth.uid() and revoked_at is null and expires_at>now() and eid=any(evidence_ids))$$;
revoke all on function public.portfolio_can_view(uuid) from public,anon,authenticated; grant execute on function public.portfolio_can_view(uuid) to authenticated;
create function public.portfolio_before_evidence() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
 if TG_OP='UPDATE' then insert into portfolio_versions(evidence_id,version,snapshot,actor) values(old.id,old.version,to_jsonb(old)||jsonb_build_object('attachments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from portfolio_attachments a where a.evidence_id=old.id)),auth.uid()); new.version=old.version+1; new.created_at=old.created_at; new.updated_at=now(); end if;
 if not exists(select 1 from portfolio_settings where exists(select 1 from jsonb_array_elements(data->'periods') p where p->>'id'=new.period_id)) then raise exception 'فترة الملف غير موجودة';end if;
 if new.kind not in ('strategy','individual','assessment','technology','analysis','remedial','development','visit','parents','duty') or jsonb_typeof(new.data)<>'object' then raise exception 'نوع أو بيانات الشاهد غير صالح';end if;
 if new.data?'additional_criteria' and jsonb_typeof(new.data->'additional_criteria')<>'array' then raise exception 'قائمة العناصر الإضافية غير صالحة';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(new.data->'additional_criteria','[]')) a where (a->>'criterion')::int not between 1 and 11 or coalesce(a->>'reason','')='') then raise exception 'العنصر الإضافي يحتاج تصنيفًا وتبريرًا';end if;
 if new.data?'beneficiaries' and new.data->'beneficiaries'<>'null'::jsonb and (jsonb_typeof(new.data->'beneficiaries')<>'number' or (new.data->>'beneficiaries')::numeric<0) then raise exception 'عدد المستفيدين غير صالح';end if;
 if coalesce(new.data->>'execution_on','')<>'' then perform (new.data->>'execution_on')::date;end if;
 if TG_OP='INSERT' and coalesce(new.data->>'report_on','')='' then new.data=jsonb_set(new.data,'{report_on}',to_jsonb((now() at time zone 'Asia/Riyadh')::date::text));end if;
 if new.target_id is not null and not exists(select 1 from portfolio_settings where exists(select 1 from jsonb_array_elements(data->'targets') t where t->>'id'=new.target_id and (t->>'criterion')::int=new.criterion and t->>'period_id'=new.period_id)) then raise exception 'المستهدف لا يطابق العنصر والفترة';end if;
 if new.status='complete' and (coalesce(new.data->>'objective','')='' or coalesce(new.data->>'practice','')='' or coalesce(new.data->>'classification_reason','')='' or coalesce(new.data->>'source','')='' or (new.kind in ('analysis','remedial') and coalesce(new.data->>'assessment','')='')) then raise exception 'بيانات الشاهد غير مكتملة حسب نوعه'; end if;
 return new; end$$;
create trigger evidence_version before insert or update on portfolio_evidence for each row execute function portfolio_before_evidence();
create function public.portfolio_validate_settings(d jsonb) returns void language plpgsql set search_path=public,extensions,pg_temp as $$declare x jsonb;begin
 if jsonb_typeof(d)<>'object' or jsonb_typeof(d->'teacher')<>'object' or coalesce(d->'teacher'->>'name','')='' then raise exception 'بيانات المعلم الأساسية مطلوبة';end if;
 foreach x in array array[d->'periods',d->'criteria',d->'targets',d->'goals',d->'career',d->'schedules',d->'values'] loop
 if jsonb_typeof(x) is distinct from 'array' then raise exception 'قوائم الإعدادات غير صحيحة';end if;end loop;
 foreach x in array array[d->'periods',d->'targets',d->'goals',d->'career',d->'schedules'] loop
 if jsonb_array_length(x)<>(select count(distinct i->>'id') from jsonb_array_elements(x) i) or exists(select 1 from jsonb_array_elements(x) i where coalesce(i->>'id','')='') then raise exception 'يلزم استخدام معرفات فريدة ومستقرة';end if;end loop;
 if exists(select 1 from jsonb_array_elements(d->'targets') t where (t->>'criterion')::int not between 1 and 11 or not exists(select 1 from jsonb_array_elements(d->'periods') p where p->>'id'=t->>'period_id')) then raise exception 'مستهدف غير مرتبط بفترة وعنصر صحيحين';end if;
 if jsonb_array_length(d->'criteria')<>11 or (select count(distinct c->>'id') from jsonb_array_elements(d->'criteria') c)<>11 then raise exception 'يلزم تعريف 11 عنصرًا بمعرفات فريدة';end if;
 if exists(select 1 from jsonb_array_elements(d->'criteria') c where (c->>'id')::int not between 1 and 11 or (c->>'weight')::numeric not between 0 and 100) then raise exception 'معرف أو وزن عنصر غير صالح';end if;
 if exists(select 1 from jsonb_array_elements(d->'goals') g where g?'progress' and (coalesce(g->>'indicator','')='' or (g->>'progress')::numeric not between 0 and 100)) then raise exception 'نسبة الهدف تحتاج مؤشرًا فعليًا';end if;
 for x in select * from jsonb_array_elements(d->'schedules') loop
 if jsonb_typeof(x->'lessons') is distinct from 'array' then raise exception 'حصص الجدول غير صالحة';end if;
 if (select count(*) from jsonb_array_elements(x->'lessons'))<>(select count(distinct (l->>'day',l->>'period')) from jsonb_array_elements(x->'lessons') l) then raise exception 'الجدول يحتوي حصة مكررة في اليوم نفسه';end if;
 if exists(select 1 from jsonb_array_elements(x->'lessons') l where (l->>'day')::int not between 0 and 4 or (l->>'period')::int not between 1 and 15) then raise exception 'اليوم أو رقم الحصة غير صالح';end if;end loop;
 if coalesce(d->>'current_period','')<>'' and not exists(select 1 from jsonb_array_elements(d->'periods') p where p->>'id'=d->>'current_period') then raise exception 'الفترة الحالية غير موجودة';end if;
 if exists(select 1 from portfolio_evidence e where not exists(select 1 from jsonb_array_elements(d->'periods') p where p->>'id'=e.period_id)) then raise exception 'لا يمكن إزالة فترة لها شواهد؛ أرشفها بدلًا من ذلك';end if;
 if exists(select 1 from portfolio_evidence e where e.target_id is not null and not exists(select 1 from jsonb_array_elements(d->'targets') t where t->>'id'=e.target_id and t->>'period_id'=e.period_id and (t->>'criterion')::int=e.criterion)) then raise exception 'لا يمكن تغيير مستهدف مرتبط بشاهد؛ احتفظ بمعرفه وتصنيفه';end if;
 end$$;
revoke all on function public.portfolio_validate_settings(jsonb) from public,anon,authenticated;
create function public.portfolio_initial_settings() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin perform portfolio_validate_settings(new.data);return new;end$$;
create trigger settings_validate before insert or update on portfolio_settings for each row execute function portfolio_initial_settings();
create function public.portfolio_before_settings() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin insert into portfolio_settings_history(data,version) values(old.data,old.version); new.version=old.version+1; new.updated_at=now(); return new; end$$;
create trigger settings_version before update on portfolio_settings for each row execute function portfolio_before_settings();
DO $$declare t text;begin foreach t in array array['portfolio_settings','portfolio_settings_history','portfolio_evidence','portfolio_versions','portfolio_attachments','portfolio_originals','portfolio_shares','portfolio_reviews','portfolio_imports','portfolio_keys'] loop execute format('alter table public.%I enable row level security',t); execute format('create policy owner_access on public.%I for all to authenticated using (public.portfolio_is_owner()) with check (public.portfolio_is_owner())',t); end loop;end$$;
-- Originals, reviews, and audit records are immutable from the browser.
drop policy owner_access on portfolio_reviews;
create policy owner_read on portfolio_reviews for select to authenticated using(portfolio_is_owner());
drop policy owner_access on portfolio_attachments;
create policy owner_read on portfolio_attachments for select to authenticated using(portfolio_is_owner());
drop policy owner_access on portfolio_originals;
create policy owner_read on portfolio_originals for select to authenticated using(portfolio_is_owner());
-- Immutable audit records are written only by trusted trigger/import functions.
drop policy owner_access on portfolio_versions;
create policy owner_read on portfolio_versions for select to authenticated using(portfolio_is_owner());
drop policy owner_access on portfolio_settings_history;
create policy owner_read on portfolio_settings_history for select to authenticated using(portfolio_is_owner());
drop policy owner_access on portfolio_imports;
create policy owner_read on portfolio_imports for select to authenticated using(portfolio_is_owner());
create policy shared_evidence on portfolio_evidence for select to authenticated using(portfolio_can_view(id));
create policy shared_attachments on portfolio_attachments for select to authenticated using((evidence_id is not null and portfolio_can_view(evidence_id)) or (purpose='schedule' and exists(select 1 from portfolio_shares s where s.user_id=auth.uid() and s.revoked_at is null and s.expires_at>now() and 'schedules'=any(s.sections))));
create policy own_share on portfolio_shares for select to authenticated using(user_id=auth.uid() and revoked_at is null and expires_at>now());
create policy shared_originals on portfolio_originals for select to authenticated using(exists(select 1 from portfolio_attachments a where a.id=attachment_id and (portfolio_can_view(a.evidence_id) or (a.purpose='schedule' and exists(select 1 from portfolio_shares s where s.user_id=auth.uid() and s.revoked_at is null and s.expires_at>now() and 'schedules'=any(s.sections))))));
create policy shared_reviews on portfolio_reviews for select to authenticated using(portfolio_can_view(evidence_id));
create function public.portfolio_review(p_evidence uuid,p_version integer,p_status text,p_note text) returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare rid uuid;begin
 if not exists(select 1 from portfolio_shares where user_id=auth.uid() and role='reviewer' and revoked_at is null and expires_at>now() and p_evidence=any(evidence_ids)) then raise exception 'غير مصرح بالمراجعة';end if;
 if not exists(select 1 from portfolio_evidence where id=p_evidence and version=p_version) then raise exception 'تغيرت نسخة الشاهد، حدّث الصفحة';end if;
 insert into portfolio_reviews(evidence_id,version,reviewer_email,status,note) values(p_evidence,p_version,(select email from auth.users where id=auth.uid()),p_status,p_note) returning id into rid;return rid;end$$;
create function public.portfolio_create_share(p_email text,p_role text,p_evidence uuid[],p_sections text[],p_days integer default 14) returns text language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare token text;begin if not portfolio_is_owner() then raise exception 'غير مصرح';end if;token=encode(gen_random_bytes(32),'hex');insert into portfolio_shares(token_hash,email,role,evidence_ids,sections,expires_at) values(encode(digest(token,'sha256'),'hex'),lower(trim(p_email)),p_role,p_evidence,p_sections,now()+make_interval(days=>least(greatest(p_days,1),90)));return token;end$$;
create function public.portfolio_accept_share(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare s portfolio_shares; d jsonb;begin
 select * into s from portfolio_shares where token_hash=encode(digest(p_token,'sha256'),'hex') and revoked_at is null and expires_at>now() for update;
 if s.id is null or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=s.email and email_confirmed_at is not null) then raise exception 'الرابط غير صالح أو البريد لا يطابق الدعوة';end if;
 update portfolio_shares set user_id=auth.uid() where id=s.id;
 select coalesce(jsonb_object_agg(key,value),'{}') into d from portfolio_settings, jsonb_each(data) where key=any(s.sections) or key in ('teacher','periods','current_period','criteria','standard');
 d=jsonb_set(d,'{teacher}',(d->'teacher')-array['contact','qualification','rank','experience','license']);
 if 'career'=any(s.sections) then d=jsonb_set(d,'{teacher}',d->'teacher'||(select jsonb_strip_nulls(jsonb_build_object('qualification',data->'teacher'->'qualification','rank',data->'teacher'->'rank','experience',data->'teacher'->'experience','license',data->'teacher'->'license')) from portfolio_settings));end if;
 return jsonb_build_object('settings',d,'share_id',s.id,'role',s.role,'evidence_ids',s.evidence_ids);end$$;
create function public.portfolio_shared_context(p_evidence uuid) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare s portfolio_shares;d jsonb;begin
 select * into s from portfolio_shares where user_id=auth.uid() and revoked_at is null and expires_at>now() and p_evidence=any(evidence_ids) order by created_at desc limit 1;
 if s.id is null then raise exception 'لا توجد دعوة فعالة لهذا الشاهد';end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into d from portfolio_settings, jsonb_each(data) where key=any(s.sections) or key in ('teacher','periods','current_period','criteria','standard');
 d=jsonb_set(d,'{teacher}',(d->'teacher')-array['contact','qualification','rank','experience','license']);
 if 'career'=any(s.sections) then d=jsonb_set(d,'{teacher}',d->'teacher'||(select jsonb_strip_nulls(jsonb_build_object('qualification',data->'teacher'->'qualification','rank',data->'teacher'->'rank','experience',data->'teacher'->'experience','license',data->'teacher'->'license')) from portfolio_settings));end if;
 return jsonb_build_object('settings',d,'share_id',s.id,'role',s.role,'evidence_ids',s.evidence_ids);end$$;
create function public.portfolio_create_key(p_label text,p_days integer default 30) returns text language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare token text;begin if not portfolio_is_owner() then raise exception 'غير مصرح';end if;token=encode(gen_random_bytes(32),'hex');insert into portfolio_keys(token_hash,label,expires_at) values(encode(digest(token,'sha256'),'hex'),p_label,now()+make_interval(days=>least(greatest(p_days,1),90)));return token;end$$;
create function public.portfolio_progress() returns jsonb language sql stable security definer set search_path=public,extensions,pg_temp as $$
 with configuration as (select data from portfolio_settings), rows as (
 select (c->>'id')::int as criterion,c->>'name' as name,counts.total,counts.done,counts.missing,
 case when counts.total>0 then round(counts.done*100.0/counts.total)::int else null end as percent
 from configuration s cross join jsonb_array_elements(s.data->'criteria') c
 cross join lateral (
 select count(*)::int as total,count(*) filter(where exists(select 1 from portfolio_evidence e where e.period_id=s.data->>'current_period' and e.criterion=(c->>'id')::int and e.target_id=t->>'id' and e.status='complete'))::int as done,
 coalesce(jsonb_agg(t) filter(where not exists(select 1 from portfolio_evidence e where e.period_id=s.data->>'current_period' and e.criterion=(c->>'id')::int and e.target_id=t->>'id' and e.status='complete')),'[]') as missing
 from jsonb_array_elements(s.data->'targets') t where (t->>'criterion')::int=(c->>'id')::int and t->>'period_id'=s.data->>'current_period') counts
 ) select jsonb_build_object('period_id',(select data->>'current_period' from configuration),'rows',(select jsonb_agg(to_jsonb(rows) order by criterion) from rows),'overall_percent',(select round(avg(percent)) from rows),'included_elements',(select count(percent) from rows))
 $$;
revoke all on function public.portfolio_progress() from public,anon,authenticated;
create function public.portfolio_import(p_package jsonb,p_key text default null) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$declare rid text; old_request portfolio_imports; ph text; e jsonb; eid uuid; op text; output jsonb; s jsonb; affected integer; item jsonb; bytes bytea; aid uuid; digest_text text;begin
 if not coalesce(portfolio_is_owner(),false) and not exists(select 1 from portfolio_keys where token_hash=encode(digest(coalesce(p_key,''),'sha256'),'hex') and revoked_at is null and expires_at>now()) then raise exception 'غير مصرح';end if;
 if p_package->>'schema_version' is distinct from '1' then raise exception 'إصدار حزمة غير مدعوم';end if;
 if octet_length(p_package::text)>104857600 then raise exception 'الحزمة أكبر من 100 ميجابايت، قسم المرفقات إلى طلبات';end if;
 rid=p_package->>'request_id';if rid is null or length(rid)<8 then raise exception 'request_id مطلوب بطول 8 أحرف على الأقل';end if;
 ph=encode(digest(p_package::text,'sha256'),'hex');perform pg_advisory_xact_lock(hashtext(rid));select * into old_request from portfolio_imports where request_id=rid;
 if old_request.request_id is not null then if old_request.payload_hash<>ph then raise exception 'معرف الطلب مستخدم لحزمة مختلفة';end if;return old_request.result||'{"duplicate":true}'::jsonb;end if;
 op=p_package->>'operation';e=p_package->'evidence';
 if op in ('create','update','archive','restore','attach') then
 eid=coalesce(nullif(e->>'id','')::uuid,gen_random_uuid());
 if op='create' then insert into portfolio_evidence(id,period_id,title,kind,criterion,target_id,status,data) values(eid,e->>'period_id',e->>'title',e->>'kind',(e->>'criterion')::integer,e->>'target_id',coalesce(e->>'status','draft'),coalesce(e->'data','{}'));
 else
 if e->>'version' is null then raise exception 'رقم النسخة مطلوب للتحديث';end if;
 update portfolio_evidence set period_id=coalesce(e->>'period_id',period_id),title=coalesce(e->>'title',title),kind=coalesce(e->>'kind',kind),criterion=coalesce((e->>'criterion')::integer,criterion),target_id=case when e?'target_id' then e->>'target_id' else target_id end,status=case when op='archive' then 'archived' when op='restore' then 'draft' else coalesce(e->>'status',status) end,data=data||coalesce(e->'data','{}') where id=eid and version=(e->>'version')::integer;
 get diagnostics affected=ROW_COUNT;if affected=0 then raise exception 'الشاهد غير موجود أو تغيرت نسخته';end if;
 end if;
 output=jsonb_build_object('id',eid,'version',(select version from portfolio_evidence where id=eid));
 elsif op='settings' then
 select data into s from portfolio_settings for update;
 if (p_package->>'version')::integer is distinct from (select version from portfolio_settings) then raise exception 'تغيرت الإعدادات، حدّث الصفحة';end if;
 if jsonb_typeof(p_package->'data')<>'object' then raise exception 'بيانات غير صالحة';end if;
 if p_package->'data'?'teacher' then if jsonb_typeof(p_package->'data'->'teacher')<>'object' then raise exception 'بيانات المعلم غير صالحة';end if; s=jsonb_set(s,'{teacher}',s->'teacher'||(p_package->'data'->'teacher'));end if;
 update portfolio_settings set data=s||((p_package->'data')-'teacher') where id=true; output=jsonb_build_object('saved',true);
 elsif op='progress' then output=portfolio_progress();
 else raise exception 'عملية غير مدعومة';end if;
 if jsonb_array_length(coalesce(p_package->'attachments','[]'))>30 then raise exception 'الحد الأقصى 30 مرفقًا';end if;
 if p_package?'attachments' then
 if eid is null and op<>'settings' then raise exception 'المرفقات تحتاج شاهدًا أو جدولًا';end if;
 for item in select * from jsonb_array_elements(p_package->'attachments') loop
 bytes=decode(item->>'base64','base64');digest_text=encode(digest(bytes,'sha256'),'hex');
 if octet_length(bytes)<1 or octet_length(bytes)>20971520 or digest_text<>item->>'sha256' then raise exception 'حجم المرفق أو بصمته غير صالح';end if;
 if not ((item->>'mime'='image/jpeg' and substring(bytes from 1 for 3)=decode('ffd8ff','hex')) or (item->>'mime'='image/png' and substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')) or (item->>'mime'='application/pdf' and substring(bytes from 1 for 5)=decode('255044462d','hex')) or (item->>'mime'='image/webp' and substring(bytes from 1 for 4)=decode('52494646','hex') and substring(bytes from 9 for 4)=decode('57454250','hex'))) then raise exception 'نوع الملف أو محتواه غير مدعوم';end if;
 aid=null;insert into portfolio_attachments(evidence_id,purpose,path,name,mime,sha256,size) values(eid,case when eid is null then 'schedule' else 'evidence' end,'integration/'||coalesce(eid::text,'schedule')||'/'||digest_text,item->>'name',item->>'mime',digest_text,octet_length(bytes)) on conflict do nothing returning id into aid;
 if aid is not null then insert into portfolio_originals values(aid,item->>'base64');end if;
 end loop;end if;
 insert into portfolio_imports(request_id,payload_hash,result) values(rid,ph,output);return output;end$$;
revoke all on function public.portfolio_import(jsonb,text) from public,anon,authenticated;
grant execute on function public.portfolio_import(jsonb,text) to anon,authenticated;
-- Administrative connector entry point. Never granted to browser roles.
create function public.portfolio_admin_import(p_package jsonb) returns jsonb language plpgsql security invoker set search_path=public,extensions,pg_temp as $$declare token text; key_id uuid; output jsonb;begin
 token=encode(gen_random_bytes(32),'hex');
 insert into portfolio_keys(token_hash,label,expires_at) values(encode(digest(token,'sha256'),'hex'),'Ephemeral administrative import',now()+interval '1 minute') returning id into key_id;
 output=portfolio_import(p_package,token);delete from portfolio_keys where id=key_id;return output;end$$;
revoke all on function public.portfolio_admin_import(jsonb) from public,anon,authenticated;
DO $$declare f text;begin foreach f in array array['portfolio_shared_context(uuid)','portfolio_review(uuid,integer,text,text)','portfolio_create_share(text,text,uuid[],text[],integer)','portfolio_accept_share(text)','portfolio_create_key(text,integer)'] loop execute 'revoke all on function public.'||f||' from public,anon,authenticated';execute 'grant execute on function public.'||f||' to authenticated';end loop;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio-private','portfolio-private',false,20971520,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy portfolio_storage_owner on storage.objects for all to authenticated using(bucket_id='portfolio-private' and portfolio_is_owner()) with check(bucket_id='portfolio-private' and portfolio_is_owner());
create policy portfolio_storage_shared on storage.objects for select to authenticated using(bucket_id='portfolio-private' and exists(select 1 from portfolio_attachments a where a.path=name and a.evidence_id is not null and (portfolio_can_view(a.evidence_id) or (a.purpose='schedule' and exists(select 1 from portfolio_shares s where s.user_id=auth.uid() and s.revoked_at is null and s.expires_at>now() and 'schedules'=any(s.sections))))));
drop policy "public read" on achievements;
create policy private_read on achievements for select to authenticated using(portfolio_is_owner());
COMMIT;

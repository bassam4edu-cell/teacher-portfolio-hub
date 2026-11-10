-- Additive course module. Apply through Lovable's database tool after isolated validation.
BEGIN;
create table public.portfolio_courses (
 id uuid primary key default gen_random_uuid(),title text not null check(length(btrim(title)) between 1 and 300),
 provider text check(length(provider)<=300),execution_on date,date_label text check(length(date_label)<=100),duration_value numeric check(duration_value>0 and duration_value<=100000),
 duration_unit text check(duration_unit in ('hours','days')),is_public boolean not null default true,archived boolean not null default false,
 original_document uuid,public_document uuid,source text not null default 'محادثة المعلم',
 version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check((duration_value is null)=(duration_unit is null))
);
create table public.portfolio_course_documents (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references portfolio_courses(id),
 name text not null,mime text not null check(mime in ('image/jpeg','image/png','image/webp','application/pdf')),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),size integer not null check(size between 1 and 20971520),
 content_base64 text not null,was_original boolean not null default false,created_at timestamptz not null default now(),unique(course_id,sha256)
);
create unique index course_original_sha_unique on public.portfolio_course_documents(sha256) where was_original;
alter table public.portfolio_courses add foreign key(original_document) references portfolio_course_documents(id),add foreign key(public_document) references portfolio_course_documents(id);
create unique index course_original_unique on public.portfolio_courses(original_document) where original_document is not null;
create table public.portfolio_course_versions(id uuid primary key default gen_random_uuid(),course_id uuid not null references portfolio_courses(id),version integer not null,snapshot jsonb not null,changed_at timestamptz not null default now(),unique(course_id,version));
alter table public.portfolio_courses enable row level security;
alter table public.portfolio_course_documents enable row level security;
alter table public.portfolio_course_versions enable row level security;
create policy courses_owner_read on portfolio_courses for select to authenticated using(portfolio_is_owner());
create policy course_docs_owner_read on portfolio_course_documents for select to authenticated using(portfolio_is_owner());
create policy course_versions_owner_read on portfolio_course_versions for select to authenticated using(portfolio_is_owner());
revoke all on public.portfolio_courses,public.portfolio_course_documents,public.portfolio_course_versions from anon,authenticated;
grant select on public.portfolio_courses,public.portfolio_course_versions to authenticated;
create function public.portfolio_course_before_update() returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$begin
 insert into portfolio_course_versions(course_id,version,snapshot) values(old.id,old.version,to_jsonb(old));
 new.version=old.version+1;new.updated_at=now();return new;end$$;
revoke all on function portfolio_course_before_update() from public,anon,authenticated;
create trigger course_versions before update on portfolio_courses for each row execute function portfolio_course_before_update();
create trigger course_changed after insert or update or delete on portfolio_courses for each statement execute function portfolio_signal_update();
create function public.portfolio_courses_view(p_owner boolean default false,p_key text default null) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$begin
 if p_owner and not portfolio_agent_allowed(p_key) then raise exception 'غير مصرح';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'provider',c.provider,'execution_on',c.execution_on,'date_label',c.date_label,'duration_value',c.duration_value,'duration_unit',c.duration_unit,'version',c.version,'archived',c.archived,'is_public',c.is_public,'updated_at',c.updated_at,
 'document',case when c.public_document is null then null else jsonb_build_object('id',d.id,'mime',d.mime,'sha256',d.sha256,'size',d.size) end)||case when p_owner then jsonb_build_object('original_document',c.original_document,'source',c.source) else '{}'::jsonb end order by c.execution_on desc nulls last,c.created_at desc)
 from portfolio_courses c left join portfolio_course_documents d on d.id=c.public_document where p_owner or (c.is_public and not c.archived)),'[]');end$$;
revoke all on function portfolio_courses_view(boolean,text) from public,anon,authenticated;
grant execute on function portfolio_courses_view(boolean,text) to anon,authenticated;
create function public.portfolio_course_document(p_id uuid,p_key text default null) returns jsonb language plpgsql stable security definer set search_path=public,extensions,pg_temp as $$declare d portfolio_course_documents;begin
 select * into d from portfolio_course_documents where id=p_id;
 if d.id is null or not (portfolio_agent_allowed(p_key) or exists(select 1 from portfolio_courses c where c.public_document=p_id and c.is_public and not c.archived)) then raise exception 'الوثيقة غير متاحة';end if;
 return jsonb_build_object('mime',d.mime,'sha256',d.sha256,'base64',d.content_base64,'name',case when d.mime='application/pdf' then 'شهادة الدورة.pdf' else 'شهادة الدورة' end);end$$;
revoke all on function portfolio_course_document(uuid,text) from public,anon,authenticated;
grant execute on function portfolio_course_document(uuid,text) to anon,authenticated;
create function public.portfolio_course_import(p_package jsonb,p_key text default null) returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare rid text;ph text;cached portfolio_imports;c portfolio_courses;cid uuid;op text;doc jsonb;bytes bytea;sha text;did uuid;oid uuid;pid uuid;output jsonb;begin
 if not portfolio_agent_allowed(p_key) then raise exception 'غير مصرح';end if;
 if p_package->>'schema_version' is distinct from '1' then raise exception 'إصدار غير مدعوم';end if;
 if octet_length(p_package::text)>60000000 then raise exception 'حزمة الدورات أكبر من الحد المتاح';end if;
 rid=p_package->>'request_id';if coalesce(length(rid),0)<8 then raise exception 'معرف الطلب مطلوب';end if;
 ph=encode(digest(p_package::text,'sha256'),'hex');perform pg_advisory_xact_lock(hashtext(rid));select * into cached from portfolio_imports where request_id=rid;
 if cached.request_id is not null then if cached.payload_hash<>ph then raise exception 'معرف الطلب مكرر بمحتوى مختلف';end if;return cached.result||'{"duplicate":true}'::jsonb;end if;
 op=p_package->>'operation';cid=coalesce((p_package->'course'->>'id')::uuid,gen_random_uuid());
 select * into c from portfolio_courses where id=cid for update;
 if c.id is not null and (p_package->'course'->>'version')::integer is distinct from c.version then raise exception 'تغيرت نسخة الدورة؛ حدّث البيانات';end if;
 if op in ('archive','restore') then
 if c.id is null then raise exception 'الدورة غير موجودة';end if;
 update portfolio_courses set archived=(op='archive') where id=cid;
 elsif op='upsert' then
 if c.id is null then insert into portfolio_courses(id,title) values(cid,p_package->'course'->>'title');select * into c from portfolio_courses where id=cid;end if;
 oid=c.original_document;pid=c.public_document;
 if p_package->>'publish_original'='true' and p_package?'public_copy' then raise exception 'اختر نسخة نشر واحدة: الأصل أو النسخة المنقحة';end if;
 if p_package?'original' then
 doc=p_package->'original';
 bytes=decode(doc->>'base64','base64');sha=encode(digest(bytes,'sha256'),'hex');
 if exists(select 1 from portfolio_course_documents f where f.sha256=sha and f.was_original and f.course_id<>cid) then raise exception 'هذه الشهادة مسجلة لدورة أخرى';end if;
 end if;
 for doc in select value from jsonb_array_elements(jsonb_build_array(p_package->'original',p_package->'public_copy')) where value<>'null'::jsonb loop
 bytes=decode(doc->>'base64','base64');sha=encode(digest(bytes,'sha256'),'hex');
 if bytes is null or octet_length(bytes) not between 1 and 20971520 or sha is distinct from doc->>'sha256' then raise exception 'حجم الوثيقة أو بصمتها غير صالح';end if;
 if not ((doc->>'mime'='image/jpeg' and substring(bytes from 1 for 3)=decode('ffd8ff','hex')) or (doc->>'mime'='image/png' and substring(bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')) or (doc->>'mime'='image/webp' and substring(bytes from 1 for 4)=decode('52494646','hex') and substring(bytes from 9 for 4)=decode('57454250','hex')) or (doc->>'mime'='application/pdf' and substring(bytes from 1 for 5)=decode('255044462d','hex'))) then raise exception 'نوع الوثيقة غير مدعوم';end if;
 insert into portfolio_course_documents(course_id,name,mime,sha256,size,content_base64) values(cid,coalesce(doc->>'name','وثيقة'),doc->>'mime',sha,octet_length(bytes),doc->>'base64') on conflict(course_id,sha256) do nothing;
 select id into did from portfolio_course_documents where course_id=cid and sha256=sha;
 if doc=p_package->'original' then oid=did;update portfolio_course_documents set was_original=true where id=did;end if;
 if doc=p_package->'public_copy' then
 if p_package->>'privacy_reviewed' is distinct from 'true' then raise exception 'راجع خصوصية نسخة النشر أولًا';end if;
 pid=did;end if;
 end loop;
 if p_package->>'publish_original'='true' then
 if p_package->>'privacy_reviewed' is distinct from 'true' or oid is null then raise exception 'نشر الأصل يحتاج مراجعة الخصوصية ووثيقة محفوظة';end if;pid=oid;end if;
 if p_package->>'withdraw_document'='true' then pid=null;end if;
 update portfolio_courses set title=coalesce(p_package->'course'->>'title',title),
 provider=case when (p_package->'course')?'provider' then nullif(p_package->'course'->>'provider','') else provider end,
 execution_on=case when (p_package->'course')?'execution_on' then nullif(p_package->'course'->>'execution_on','')::date else execution_on end,
 date_label=case when (p_package->'course')?'date_label' then nullif(p_package->'course'->>'date_label','') else date_label end,
 duration_value=case when (p_package->'course')?'duration_value' then (p_package->'course'->>'duration_value')::numeric else duration_value end,
 duration_unit=case when (p_package->'course')?'duration_unit' then p_package->'course'->>'duration_unit' else duration_unit end,
 is_public=coalesce((p_package->'course'->>'is_public')::boolean,is_public),source=coalesce(p_package->'course'->>'source',source),
 original_document=oid,public_document=pid where id=cid;
 else raise exception 'عملية غير مدعومة';end if;
 select jsonb_build_object('id',id,'version',version,'saved',true) into output from portfolio_courses where id=cid;
 insert into portfolio_imports(request_id,payload_hash,result) values(rid,ph,output);return output;end$$;
revoke all on function portfolio_course_import(jsonb,text) from public,anon,authenticated;
grant execute on function portfolio_course_import(jsonb,text) to anon,authenticated;
COMMIT;

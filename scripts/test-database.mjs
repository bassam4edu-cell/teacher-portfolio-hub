// Isolated PostgreSQL WASM tests. Never connects to the production database.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const pg = new PGlite();
await pg.exec(`
 create role anon;create role authenticated;
 create schema auth;create schema storage;create schema extensions;
 alter default privileges in schema public grant execute on functions to anon,authenticated;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create table public.achievements(id uuid default gen_random_uuid(),user_id uuid,title text);
 alter table public.achievements enable row level security;
 create policy "public read" on achievements for select to anon,authenticated using(true);
 -- PGlite doesn't ship pgcrypto. These test-only shims use PG's native SHA256;
 -- production uses pgcrypto's secure bytes and SHA256 unchanged.
 create function public.digest(t text,a text) returns bytea language sql immutable as $$select sha256(convert_to(t,'UTF8'))$$;
 create function public.digest(t bytea,a text) returns bytea language sql immutable as $$select sha256(t)$$;
 create function public.gen_random_bytes(n integer) returns bytea language sql as $$select substring(decode(string_agg(replace(gen_random_uuid()::text,'-',''),''),'hex') from 1 for n) from generate_series(1,ceil(n::numeric/16)::int)$$;
`);
const sql = readFileSync(new URL("../docs/database-proposal.sql", import.meta.url), "utf8").replace(
  "create extension if not exists pgcrypto;",
  "",
);
try {
  await pg.exec(sql);
} catch (e) {
  console.error("SCHEMA FAILED", e.message, e.query);
  process.exit(1);
}
await pg.exec(`grant usage on schema public,auth,storage to anon,authenticated;grant select,insert,update,delete on all tables in schema public,storage to anon,authenticated;
 insert into auth.users values ('00000000-0000-4000-8000-000000000001','bassam4edu@gmail.com',now()),('00000000-0000-4000-8000-000000000002','reviewer@example.test',now()),('00000000-0000-4000-8000-000000000003','stranger@example.test',now());
`);
const owner = "00000000-0000-4000-8000-000000000001",
  reviewer = "00000000-0000-4000-8000-000000000002",
  stranger = "00000000-0000-4000-8000-000000000003";
async function asUser(id, fn) {
  await pg.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
  try {
    return await fn();
  } finally {
    await pg.exec("reset role;select set_config('request.jwt.claim.sub','',false)");
  }
}
const scalar = async (sql, params = []) => (await pg.query(sql, params)).rows[0];
let checks = 0;
function ok(value, message) {
  assert.ok(value, message);
  checks++;
  console.log("PASS", message);
}
const settings = {
  periods: [{ id: "period-1", name: "اختبار معزول", archived: false }],
  current_period: "period-1",
  targets: [{ id: "target-1", period_id: "period-1", criterion: 4, title: "مستهدف الاختبار" }],
  teacher: { name: "بسام العنزي" },
  criteria: Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    weight: i === 7 || i === 8 ? 5 : 10,
  })),
  goals: [],
  values: [],
  standard: {},
  career: [],
  schedules: [],
};
await asUser(owner, async () => {
  ok(
    (await scalar("select portfolio_is_owner() as yes")).yes,
    "Verified allowlisted owner accepted",
  );
  await pg.query("insert into portfolio_settings(data) values($1)", [settings]);
});
await asUser(stranger, async () => {
  ok(
    !(await scalar("select portfolio_is_owner() as yes")).yes,
    "Unrelated signed-in account is not owner",
  );
  ok(
    (await pg.query("select * from portfolio_settings")).rows.length === 0,
    "Private settings hidden by RLS",
  );
});
const eid = "10000000-0000-4000-8000-000000000001";
const pack = {
  schema_version: 1,
  request_id: "isolated-test-001",
  operation: "create",
  evidence: {
    id: eid,
    period_id: "period-1",
    title: "شاهد اختبار معزول",
    kind: "strategy",
    criterion: 4,
    target_id: "target-1",
    status: "complete",
    data: {
      objective: "هدف موثق",
      practice: "ممارسة موثقة",
      classification_reason: "سبب التصنيف",
      source: "بيانات اختبار",
    },
  },
};
const run = (p) => scalar("select portfolio_import($1::jsonb) as result", [p]);
await asUser(owner, async () => {
  const a = await run(pack),
    b = await run(pack);
  ok(
    a.result.id === b.result.id && b.result.duplicate,
    "Request idempotency: retry does not duplicate witness",
  );
  ok(
    (await pg.query("select * from portfolio_evidence")).rows.length === 1,
    "One evidence record after retry",
  );
  await assert.rejects(
    () => run({ ...pack, evidence: { ...pack.evidence, title: "عنوان مختلف" } }),
    /معرف الطلب/,
  );
  ok(true, "Reusing a request ID for a different package rejected");
  await assert.rejects(
    () =>
      run({
        ...pack,
        request_id: "invalid-complete",
        evidence: { ...pack.evidence, id: undefined, data: {} },
      }),
    /غير مكتملة/,
  );
  ok(true, "Incomplete evidence cannot claim complete");
});
await asUser(stranger, async () => {
  ok(
    (await pg.query("select * from portfolio_evidence")).rows.length === 0,
    "Stranger cannot read evidence",
  );
  await assert.rejects(() => run({ ...pack, request_id: "stranger-create-001" }), /غير مصرح/);
  ok(true, "Stranger cannot import");
});
let token;
await asUser(owner, async () => {
  token = (
    await scalar(
      "select portfolio_create_share('reviewer@example.test','reviewer',array[$1::uuid],array[]::text[],14) as token",
      [eid],
    )
  ).token;
});
await asUser(stranger, async () => {
  await assert.rejects(() => scalar("select portfolio_accept_share($1)", [token]), /البريد/);
  ok(true, "Share cannot be accepted by a different email");
});
await asUser(reviewer, async () => {
  const result = await scalar("select portfolio_accept_share($1) as result", [token]);
  ok(!result.result.settings.career, "Unselected profile sections excluded");
  const existingGrant = await pg.query("select portfolio_shared_context($1) as result", [eid]);
  ok(
    existingGrant.rows[0].result.share_id === result.result.share_id,
    "Permanent report link resolves an already accepted share without embedding its token",
  );
  ok(
    (await pg.query("select * from portfolio_evidence")).rows.length === 1,
    "Invited reviewer sees only shared witness",
  );
  await pg.query("select portfolio_review($1,1,'reviewed','تمت مراجعة نسخة الاختبار')", [eid]);
  ok(
    (await pg.query("select * from portfolio_reviews")).rows.length === 1,
    "Review records reviewer and version",
  );
  const changed = await pg.query(
    "update portfolio_evidence set title='attempt' where id=$1 returning id",
    [eid],
  );
  ok(changed.rows.length === 0, "Reviewer cannot edit teacher content");
});
await asUser(owner, async () => {
  await run({
    schema_version: 1,
    request_id: "isolated-update-001",
    operation: "update",
    evidence: { id: eid, version: 1, data: { practice: "ممارسة محدثة" } },
  });
  ok(
    (await scalar("select version from portfolio_evidence where id=$1", [eid])).version === 2,
    "Updates increment version",
  );
  ok(
    (await scalar("select count(*)::int as n from portfolio_versions")).n === 1,
    "Previous evidence version is retained",
  );
  await assert.rejects(
    () =>
      run({
        schema_version: 1,
        request_id: "stale-update-001",
        operation: "update",
        evidence: { id: eid, version: 1, title: "stale" },
      }),
    /تغيرت نسخته/,
  );
  ok(true, "Stale concurrent write rejected");
});
await asUser(reviewer, async () => {
  await assert.rejects(
    () => scalar("select portfolio_review($1,1,'reviewed','stale')", [eid]),
    /تغيرت نسخة/,
  );
  ok(true, "Reviewer cannot approve a stale version");
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
  "base64",
);
const { createHash } = await import("node:crypto");
const hash = createHash("sha256").update(png).digest("hex");
await asUser(owner, async () => {
  const attach = {
    schema_version: 1,
    request_id: "attach-original-001",
    operation: "attach",
    evidence: { id: eid, version: 2 },
    attachments: [
      { name: "original.png", mime: "image/png", base64: png.toString("base64"), sha256: hash },
    ],
  };
  await run(attach);
  await run({ ...attach, request_id: "attach-original-002", evidence: { id: eid, version: 3 } });
  ok(
    (await scalar("select count(*)::int as n from portfolio_attachments")).n === 1,
    "Repeated original file does not duplicate attachments",
  );
  ok(
    (await scalar("select count(*)::int as n from portfolio_originals")).n === 1,
    "Original bytes retained once",
  );
  await assert.rejects(
    () =>
      run({
        ...attach,
        request_id: "invalid-sha-001",
        evidence: { id: eid, version: 4 },
        attachments: [{ ...attach.attachments[0], sha256: "0".repeat(64) }],
      }),
    /بصمته/,
  );
  ok(true, "Corrupt original rejected atomically");
});
await asUser(stranger, async () => {
  ok(
    (await pg.query("select * from portfolio_originals")).rows.length === 0,
    "Original binary content hidden from stranger",
  );
});
await asUser(reviewer, async () => {
  ok(
    (await scalar("select content_base64 from portfolio_originals")).content_base64 ===
      png.toString("base64"),
    "Reviewer receives byte-identical authorized original",
  );
});
let key;
await asUser(owner, async () => {
  key = (await scalar("select portfolio_create_key('test connector',1) as token")).token;
});
await pg.exec("set role anon");
try {
  const result = await scalar("select portfolio_import($1,$2) as result", [
    { schema_version: 1, request_id: "key-progress-001", operation: "progress" },
    key,
  ]);
  ok(
    result.result.rows.length === 11,
    "Scoped external integration reads real progress with valid key",
  );
  await assert.rejects(
    () =>
      scalar("select portfolio_import($1,'invalid')", [
        { schema_version: 1, request_id: "bad-key-001", operation: "progress" },
      ]),
    /غير مصرح/,
  );
  ok(true, "Invalid integration key denied");
} finally {
  await pg.exec("reset role");
}
await asUser(owner, async () => {
  await pg.exec(
    "update portfolio_shares set revoked_at=now();update portfolio_keys set revoked_at=now()",
  );
});
await asUser(reviewer, async () => {
  ok(
    (await pg.query("select * from portfolio_evidence")).rows.length === 0,
    "Revoking a link removes evidence access immediately",
  );
  ok(
    (await pg.query("select * from portfolio_originals")).rows.length === 0,
    "Revocation also removes original attachment access",
  );
  await assert.rejects(() => pg.query("select portfolio_shared_context($1)", [eid]), /دعوة فعالة/);
  ok(true, "Permanent report link denied after share revocation");
});
await asUser(owner, async () => {
  const result = await pg.query(
    "update portfolio_reviews set reviewer_email='forged@example.test' returning id",
  );
  ok(result.rows.length === 0, "Teacher cannot forge a manager review");
  const deleted = await pg.query("delete from portfolio_versions returning id");
  ok(deleted.rows.length === 0, "Browser owner cannot erase version history");
  await assert.rejects(
    () =>
      pg.query("select portfolio_admin_import($1)", [
        { schema_version: 1, request_id: "browser-admin-001", operation: "progress" },
      ]),
    /permission denied/,
  );
  ok(true, "Administrative connector entry point denied to browser owner");
  const snapshot = (await pg.query("select snapshot from portfolio_versions where version=3"))
    .rows[0].snapshot;
  ok(snapshot.attachments.length === 1, "Previous versions retain original attachment references");
});
const administrative = await pg.query("select portfolio_admin_import($1) as result", [
  { schema_version: 1, request_id: "connector-admin-001", operation: "progress" },
]);
ok(
  administrative.rows[0].result.rows.length === 11,
  "Administrative connector can use the same import contract without exposing a key",
);
const keysAfter = await pg.query(
  "select count(*)::int as n from portfolio_keys where label='Ephemeral administrative import'",
);
ok(keysAfter.rows[0].n === 0, "Administrative import removes its ephemeral key");
await pg.exec("set role anon");
try {
  await assert.rejects(() => pg.query("select portfolio_progress()"), /permission denied/);
  ok(true, "Internal progress reader not exposed even under Supabase-like default function grants");
} finally {
  await pg.exec("reset role");
}
await asUser(owner, async () => {
  await run({
    schema_version: 1,
    request_id: "settings-merge-001",
    operation: "settings",
    version: 1,
    data: { teacher: { name: "اختبار تعديل مركزي" } },
  });
  const saved = (await pg.query("select data,version from portfolio_settings")).rows[0];
  ok(
    saved.version === 2 && saved.data.teacher.name === "اختبار تعديل مركزي",
    "Structured settings update persists and increments version",
  );
  ok(saved.data.periods.length === 1, "Partial profile update preserves existing periods");
  ok(
    (await pg.query("select * from portfolio_settings_history")).rows.length === 1,
    "Previous profile and timetable configuration retained",
  );
  await assert.rejects(
    () =>
      run({
        schema_version: 1,
        request_id: "settings-stale-001",
        operation: "settings",
        version: 1,
        data: { vision: "stale" },
      }),
    /تغيرت الإعدادات/,
  );
  ok(true, "Concurrent stale settings change rejected");
  const invalidTargets = [...saved.data.targets, ...saved.data.targets];
  await assert.rejects(
    () =>
      run({
        schema_version: 1,
        request_id: "settings-dup-target-001",
        operation: "settings",
        version: 2,
        data: { targets: invalidTargets },
      }),
    /معرفات فريدة/,
  );
  ok(true, "Duplicated target IDs cannot inflate completion");
});
await pg.exec("set role anon");
try {
  await assert.rejects(
    () =>
      pg.query("select portfolio_import($1,$2)", [
        { schema_version: 1, request_id: "revoked-key-001", operation: "progress" },
        key,
      ]),
    /غير مصرح/,
  );
  ok(true, "Revoked integration key denied");
} finally {
  await pg.exec("reset role");
}
await pg.close();
console.log(`\n${checks} isolated database/security checks passed. Production database untouched.`);

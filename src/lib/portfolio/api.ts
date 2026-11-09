import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultSettings,
  evidenceInputSchema,
  missingFields,
  packageSchema,
  settingsSchema,
  mergeSettings,
  todayRiyadh,
  type Attachment,
  type Evidence,
  type ImportPackage,
  type Review,
  type Settings,
} from "./model";
// Keep Lovable-generated types untouched; the new contract is maintained here.
export const db = supabase as unknown as SupabaseClient;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const missingBackendMessage =
  "تجهيز قاعدة الملف الجديدة لم يُطبّق بعد. لا توجد بيانات تجريبية؛ راجع حزمة التهيئة في docs/database-proposal.sql.";
export function errorText(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : "تعذر إكمال العملية، حاول مجددًا.";
}
export async function rpc<T>(name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export async function loadPortfolio() {
  const owner = await rpc<boolean>("portfolio_is_owner");
  if (!owner)
    return {
      owner: false,
      settings: null,
      evidence: [],
      attachments: [],
      reviews: [],
      settingsVersion: 0,
    };
  const [s, e, a, r] = await Promise.all([
    db.from("portfolio_settings").select("*").maybeSingle(),
    db.from("portfolio_evidence").select("*").order("updated_at", { ascending: false }),
    db.from("portfolio_attachments").select("*"),
    db.from("portfolio_reviews").select("*").order("created_at", { ascending: false }),
  ]);
  for (const x of [s, e, a, r]) if (x.error) throw new Error(x.error.message);
  return {
    owner: true,
    settings: s.data?.data as Settings | null,
    evidence: (e.data ?? []) as Evidence[],
    attachments: (a.data ?? []) as Attachment[],
    reviews: (r.data ?? []) as Review[],
    settingsVersion: Number(s.data?.version ?? 0),
  };
}
export async function initializePortfolio() {
  const { error } = await db.from("portfolio_settings").insert({ id: true, data: defaultSettings });
  if (error) throw new Error(error.message);
}
export async function saveSettings(settings: Settings, version: number) {
  settingsSchema.parse(settings);
  return rpc("portfolio_import", {
    p_package: {
      schema_version: 1,
      request_id: crypto.randomUUID(),
      operation: "settings",
      data: settings,
      version,
    },
  });
}
export async function sha256(bytes: ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function filePackage(file: File) {
  if (!allowedMimes.includes(file.type)) throw new Error("الملفات المدعومة: JPG، PNG، WebP، PDF.");
  if (file.size > MAX_FILE_BYTES || file.size === 0)
    throw new Error("الحد الأقصى للملف 20 ميجابايت، ولا يمكن رفع ملف فارغ.");
  const bytes = await file.arrayBuffer();
  const sha = await sha256(bytes);
  const data = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < data.length; i += 8192)
    binary += String.fromCharCode(...data.subarray(i, i + 8192));
  return {
    name: file.name,
    mime: file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf",
    base64: btoa(binary),
    sha256: sha,
  };
}
export async function importPackage(raw: unknown) {
  const pack = packageSchema.parse(raw);
  if (pack.operation === "settings") {
    const { data, error } = await db.from("portfolio_settings").select("data").single();
    if (error) throw error;
    mergeSettings(data.data, pack.data ?? {});
  }
  if (pack.operation === "create") {
    const e = evidenceInputSchema.parse(pack.evidence);
    if (e.status === "complete" && missingFields(e).length)
      throw new Error("بيانات الشاهد غير مكتملة.");
    pack.evidence = e;
  }
  if (pack.operation === "update" && pack.evidence && typeof pack.evidence === "object") {
    const e = pack.evidence as Record<string, unknown>;
    if (!e["id"] || !e["version"]) throw new Error("معرف الشاهد ورقم النسخة مطلوبان للتعديل.");
  }
  for (const a of pack.attachments ?? []) {
    const bin = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
    if (bin.byteLength > MAX_FILE_BYTES || (await sha256(bin.buffer)) !== a.sha256)
      throw new Error(`بصمة الملف لا تطابق الأصل: ${a.name}`);
  }
  return rpc<{ id?: string; version?: number; duplicate?: boolean }>("portfolio_import", {
    p_package: pack,
  });
}
export async function saveEvidence(e: unknown, files: File[] = []) {
  const input = evidenceInputSchema.parse(e);
  return importPackage({
    schema_version: 1,
    request_id: crypto.randomUUID(),
    operation: input.id ? "update" : "create",
    evidence: {
      ...input,
      data: { ...input.data, report_on: input.data.report_on || todayRiyadh() },
    },
    attachments: await Promise.all(files.map(filePackage)),
  });
}
export async function changeStatus(e: Evidence, operation: "archive" | "restore") {
  return importPackage({
    schema_version: 1,
    request_id: crypto.randomUUID(),
    operation,
    evidence: { id: e.id, version: e.version },
  });
}
export async function attachmentUrl(a: Attachment) {
  if (a.path.startsWith("integration/")) {
    const { data, error } = await db
      .from("portfolio_originals")
      .select("content_base64")
      .eq("attachment_id", a.id)
      .single();
    if (error) throw new Error(error.message);
    const bytes = Uint8Array.from(atob(String(data.content_base64)), (c) => c.charCodeAt(0));
    if ((await sha256(bytes.buffer)) !== a.sha256)
      throw new Error("فشل التحقق من سلامة الملف الأصلي.");
    return URL.createObjectURL(new Blob([bytes], { type: a.mime }));
  }
  const { data, error } = await db.storage.from("portfolio-private").createSignedUrl(a.path, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
export async function loadShared(token: string, evidenceId?: string) {
  const scope = await rpc<{
    settings: Partial<Settings>;
    share_id: string;
    role: "reviewer" | "visitor";
    evidence_ids: string[];
  }>(
    evidenceId ? "portfolio_shared_context" : "portfolio_accept_share",
    evidenceId ? { p_evidence: evidenceId } : { p_token: token },
  );
  const [e, a, r] = await Promise.all([
    db
      .from("portfolio_evidence")
      .select("*")
      .in("id", scope.evidence_ids)
      .order("updated_at", { ascending: false }),
    db
      .from("portfolio_attachments")
      .select("*")
      .or(
        `evidence_id.in.(${scope.evidence_ids.join(",")})${scope.settings.schedules ? ",purpose.eq.schedule" : ""}`,
      ),
    db
      .from("portfolio_reviews")
      .select("*")
      .in("evidence_id", scope.evidence_ids)
      .order("created_at", { ascending: false }),
  ]);
  for (const x of [e, a, r]) if (x.error) throw new Error(x.error.message);
  const settings = { ...defaultSettings, ...scope.settings };
  // Do not carry private goals/targets/reflections from defaults or another session.
  return {
    settings,
    evidence: (e.data ?? []) as Evidence[],
    attachments: (a.data ?? []) as Attachment[],
    reviews: (r.data ?? []) as Review[],
    role: scope.role,
    shareId: scope.share_id,
  };
}
export function downloadJson(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const examplePackage: ImportPackage = {
  schema_version: 1,
  request_id: "replace-with-unique-request-id",
  operation: "create",
  evidence: {
    period_id: "replace-with-period-id",
    title: "عنوان يحدده المعلم",
    kind: "strategy",
    criterion: 4,
    status: "draft",
    data: {
      classification_reason: "",
      objective: "",
      practice: "",
      source: "محادثة المعلم — يلزم إرفاق المصدر الفعلي",
    },
  },
};

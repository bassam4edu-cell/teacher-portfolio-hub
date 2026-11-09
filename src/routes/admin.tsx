import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { achievementsQuery } from "@/lib/achievements";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "إدارة الإنجازات | ملف إنجاز المعلم" },
      { name: "description", content: "إضافة وحذف إنجازات ملف المعلم." },
      { property: "og:title", content: "إدارة الإنجازات" },
      { property: "og:description", content: "إضافة وحذف إنجازات ملف المعلم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const input = "w-full rounded-md border bg-background px-3 py-2";
const btn = "rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50";

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <Link to="/" className="text-sm text-muted-foreground underline">← الصفحة الرئيسية</Link>
      <h1 className="mt-4 mb-8 text-3xl font-bold">إدارة الإنجازات</h1>
      {session ? <Manager userId={session.user.id} /> : <Login />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  async function go(mode: "in" | "up") {
    setMsg("");
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("تم إنشاء الحساب، أكّد بريدك ثم سجّل الدخول.");
  }
  return (
    <div className="space-y-3">
      <input className={input} placeholder="البريد" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="flex gap-2">
        <button className={btn} onClick={() => go("in")}>دخول</button>
        <button className="rounded-md border px-4 py-2" onClick={() => go("up")}>حساب جديد</button>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}

function Manager({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery(achievementsQuery);
  const [form, setForm] = useState({ title: "", category: "", description: "", achieved_on: "" });
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    await supabase.from("achievements").insert({
      title: form.title,
      category: form.category || "عام",
      description: form.description || null,
      ...(form.achieved_on ? { achieved_on: form.achieved_on } : {}),
    });
    setForm({ title: "", category: "", description: "", achieved_on: "" });
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["achievements"] });
  }
  async function remove(id: string) {
    await supabase.from("achievements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["achievements"] });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={add} className="space-y-3 rounded-lg border bg-card p-5">
        <input className={input} placeholder="عنوان الإنجاز" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className={input} placeholder="التصنيف (دورة، شهادة، نشاط...)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className={input} type="date" value={form.achieved_on} onChange={(e) => setForm({ ...form, achieved_on: e.target.value })} />
        <textarea className={input} rows={3} placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className={btn} disabled={busy}>إضافة</button>
      </form>
      <ul className="space-y-2">
        {data.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-md border p-3">
            <span>{a.title}</span>
            {a.user_id === userId && (
              <button className="text-sm text-destructive" onClick={() => remove(a.id)}>حذف</button>
            )}
          </li>
        ))}
      </ul>
      <button className="text-sm text-muted-foreground underline" onClick={() => supabase.auth.signOut()}>تسجيل خروج</button>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { achievementsQuery } from "@/lib/achievements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ملف إنجاز المعلم" },
      { name: "description", content: "ملف إنجاز المعلم: الإنجازات والشهادات والأنشطة." },
      { property: "og:title", content: "ملف إنجاز المعلم" },
      { property: "og:description", content: "الإنجازات والشهادات والأنشطة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(achievementsQuery),
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(achievementsQuery);
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="mb-10 border-b pb-8">
        <p className="text-sm text-primary">ملف إنجاز</p>
        <h1 className="mt-2 text-4xl font-bold">بسام العنزي</h1>
        <p className="mt-3 text-muted-foreground">معلم — هنا أوثّق إنجازاتي وأنشطتي ودوراتي.</p>
      </header>
      {data.length === 0 ? (
        <p className="text-muted-foreground">لا توجد إنجازات بعد.</p>
      ) : (
        <ul className="space-y-4">
          {data.map((a) => (
            <li key={a.id} className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span className="rounded bg-accent px-2 py-0.5 text-accent-foreground">{a.category}</span>
                <span>{a.achieved_on}</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">{a.title}</h2>
              {a.description && <p className="mt-2 text-muted-foreground">{a.description}</p>}
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-12 text-sm">
        <Link to="/admin" className="text-muted-foreground underline">إدارة الإنجازات</Link>
      </footer>
    </main>
  );
}

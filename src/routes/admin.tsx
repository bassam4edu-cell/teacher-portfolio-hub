import { createFileRoute } from "@tanstack/react-router";
import { Portfolio } from "@/components/portfolio/Portfolio";
export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "إدارة ملف الإنجاز — بسام العنزي" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <Portfolio initialView="settings" />,
});

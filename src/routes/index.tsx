import { createFileRoute } from "@tanstack/react-router";
import { Portfolio } from "@/components/portfolio/Portfolio";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ملف الإنجاز المهني — بسام العنزي" },
      {
        name: "description",
        content:
          "ملف شخصي لتوثيق الممارسات التعليمية والتطور المهني لمعلم اللغة الإنجليزية بسام العنزي.",
      },
    ],
  }),
  component: Portfolio,
});

import { z } from "zod";
import { rpc, sha256 } from "./api";
export const courseInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    version: z.number().int().positive().optional(),
    title: z.string().trim().min(1, "عنوان الدورة مطلوب").max(300),
    provider: z.string().max(300).nullable().optional(),
    execution_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    date_label: z.string().max(100).nullable().optional(),
    duration_value: z.number().positive().max(100000).nullable(),
    duration_unit: z.enum(["hours", "days"]).nullable(),
    is_public: z.boolean().default(true),
  })
  .refine(
    (c) => (c.duration_value === null) === (c.duration_unit === null),
    "حدد المدة ووحدتها معًا، أو اتركهما غير محددين",
  );
export type Course = z.infer<typeof courseInputSchema> & {
  id: string;
  version: number;
  archived: boolean;
  updated_at: string;
  document: { id: string; mime: string; sha256: string; size: number } | null;
  original_document?: string | null;
};
export type CourseFile = { mime: string; name: string; base64: string; sha256: string };
export function courseDuration(c: Pick<Course, "duration_value" | "duration_unit">) {
  return c.duration_value === null || c.duration_unit === null
    ? "المدة غير محددة"
    : `${c.duration_value} ${c.duration_unit === "hours" ? "ساعة تدريبية" : "يوم تدريبي"}`;
}
export function courseDate(c: Pick<Course, "execution_on" | "date_label">) {
  return c.date_label || c.execution_on || "التاريخ غير محدد";
}
export function courseTotals(courses: Course[]) {
  return {
    count: courses.length,
    hours: courses
      .filter((c) => c.duration_unit === "hours")
      .reduce((sum, c) => sum + (c.duration_value ?? 0), 0),
    days: courses
      .filter((c) => c.duration_unit === "days")
      .reduce((sum, c) => sum + (c.duration_value ?? 0), 0),
    unknown: courses.filter((c) => c.duration_value === null).length,
  };
}
export const loadCourses = (owner = false) =>
  rpc<Course[]>("portfolio_courses_view", { p_owner: owner });
export async function courseDocument(id: string): Promise<Blob> {
  const file = await rpc<CourseFile>("portfolio_course_document", { p_id: id });
  if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.mime))
    throw Error("نوع الوثيقة غير مدعوم");
  const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
  if ((await sha256(bytes.buffer)) !== file.sha256) throw Error("تعذر التحقق من سلامة الوثيقة");
  return new Blob([bytes], { type: file.mime });
}
export async function saveCoursePackage(pack: Record<string, unknown>) {
  return rpc<{ id: string; version: number }>("portfolio_course_import", {
    p_package: { schema_version: 1, request_id: crypto.randomUUID(), ...pack },
  });
}

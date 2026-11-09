import { z } from "zod";
export const criterionNames = [
  "أداء الواجبات الوظيفية",
  "التفاعل مع المجتمع المهني",
  "التفاعل مع أولياء الأمور",
  "التنويع في إستراتيجيات التدريس",
  "تحسين نتائج المتعلمين",
  "إعداد وتنفيذ خطة التعلم",
  "توظيف تقنيات ووسائل التعلم المناسبة",
  "تهيئة بيئة تعليمية",
  "الإدارة الصفية",
  "تحليل نتائج المتعلمين وتشخيص مستوياتهم",
  "تنوع أساليب التقويم",
];
export const kinds = {
  strategy: "استراتيجية تدريس",
  individual: "تعلم فردي أو دعم متمايز",
  assessment: "تقويم وتغذية راجعة",
  technology: "توظيف تقنية تعليمية",
  analysis: "تحليل نتائج",
  remedial: "خطة علاجية ومتابعتها",
  development: "تطوير مهني",
  visit: "تبادل زيارة أو درس تطبيقي",
  parents: "تواصل مع أولياء الأمور",
  duty: "مشاركة أو تكليف وظيفي",
};
export const statusNames = {
  draft: "مسودة",
  incomplete: "يحتاج استكمالًا",
  complete: "مكتمل",
  archived: "مؤرشف",
};
export type Kind = keyof typeof kinds;
export type Status = keyof typeof statusNames;
export type Criterion = {
  id: number;
  name: string;
  weight: number;
  description: string;
  suggestions: string[];
};
export type Period = { id: string; name: string; start?: string; end?: string; archived: boolean };
export type Target = { id: string; period_id: string; criterion: number; title: string };
export type Goal = {
  id: string;
  title: string;
  description?: string;
  start?: string;
  end?: string;
  indicator?: string;
  progress?: number;
  status: string;
  evidence_ids: string[];
  notes?: string;
};
export type Lesson = {
  id: string;
  day: number;
  period: number;
  start?: string;
  end?: string;
  subject: string;
  grade?: string;
  room?: string;
  duty: string;
};
export type Schedule = {
  id: string;
  effective_on?: string;
  original_path?: string;
  lessons: Lesson[];
};
export type Settings = {
  teacher: {
    name: string;
    subject: string;
    school: string;
    administration: string;
    director: string;
    audience: string;
    timezone: string;
    bio: string;
    qualification?: string;
    rank?: string;
    experience?: string;
    contact?: string;
    license?: string;
  };
  periods: Period[];
  current_period: string;
  criteria: Criterion[];
  targets: Target[];
  standard: {
    name: string;
    authority: string;
    edition: string;
    url: string;
    document_url: string;
    verified_on: string;
    note: string;
  };
  vision: string;
  mission: string;
  values: string[];
  goals: Goal[];
  career: {
    id: string;
    type: string;
    title: string;
    institution?: string;
    date?: string;
    description?: string;
  }[];
  schedules: Schedule[];
  reflection: string;
  improvement: string;
};
const descriptions = [
  "توثيق الالتزام بالمهام والتكليفات المهنية.",
  "توثيق تبادل الخبرات والتعاون المهني.",
  "توثيق التواصل المهني مع أولياء الأمور مع حفظ الخصوصية.",
  "توثيق استراتيجيات مناسبة لأهداف التعلم واحتياجات الطلاب.",
  "توثيق أثر تدعم إثباته بيانات فعلية عن تعلم الطلاب.",
  "توثيق تخطيط التعلم وتنفيذه ومتابعته.",
  "توثيق استخدام التقنيات والوسائل الملائمة للتعلم.",
  "توثيق بيئة تعلم آمنة وداعمة ومشجعة للمشاركة.",
  "توثيق تنظيم الصف وإدارة الوقت والتفاعل.",
  "توثيق تحليل بيانات فعلية وتشخيص احتياجات التعلم.",
  "توثيق تنوع أدوات التقويم والتغذية الراجعة.",
];
const suggestions = [
  ["تكليف وظيفي موثق", "سجل تنفيذ مهمة"],
  ["تبادل زيارة", "مشاركة خبرة"],
  ["سجل تواصل منزوع البيانات الشخصية"],
  ["تعلم تعاوني", "تعليم الأقران", "تعلم فردي موجه"],
  ["مقارنة نتائج قبلية وبعدية"],
  ["خطة درس مع توثيق التنفيذ"],
  ["نشاط بتقنية تعليمية"],
  ["تنظيم بيئة التعلم"],
  ["إجراء لإدارة التفاعل الصفي"],
  ["تحليل اختبار فعلي"],
  ["تغذية راجعة", "أداة تقويم متنوعة"],
];
export const defaultSettings: Settings = {
  teacher: {
    name: "بسام العنزي",
    subject: "اللغة الإنجليزية",
    school: "ثانوية أم القرى بالخرج",
    administration: "الإدارة العامة للتعليم بمنطقة الرياض",
    director: "علي مرضي المطرفي",
    audience: "طلاب الصف الثالث الثانوي",
    timezone: "Asia/Riyadh",
    bio: "أعمل على تقديم تعلم واضح وعملي للغة الإنجليزية، يراعي مستويات الطلاب ويربط المهارات بمواقف من حياتهم. يوثّق هذا الملف ممارساتي التعليمية وتطوري المهني، والشواهد التي توضح ما أنفذه لدعم تعلم طلابي.",
  },
  periods: [],
  current_period: "",
  criteria: criterionNames.map((name, i) => ({
    id: i + 1,
    name,
    weight: i === 7 || i === 8 ? 5 : 10,
    description: descriptions[i]!,
    suggestions: suggestions[i]!,
  })),
  targets: [],
  standard: {
    name: "الدليل الإرشادي لإدارة الأداء الوظيفي لشاغلي الوظائف التعليمية — نموذج تقييم أداء المعلم",
    authority: "وزارة التعليم",
    edition: "الإصدار الثاني",
    url: "https://www.moe.gov.sa/ar/reference-and-support/employee-portal/performance",
    document_url:
      "https://www.moe.gov.sa/media/uploads/19/193f6dcdea50d6dcfb28aef8a14434f64df8b2c4f628c7f8c0303345bdcc4b49.pdf",
    verified_on: "2026-11-09",
    note: "الأوزان مطابقة لنموذج المعلم في الدليل المتاح عند التحقق. تسمية العنصر ٨: تهيئة بيئة تعليمية، والعنصر ١١: تنوع أساليب التقويم. لا تمثل نسب التوثيق تقييمًا رسميًا.",
  },
  vision: "",
  mission: "",
  values: [],
  goals: [],
  career: [],
  schedules: [],
  reflection: "",
  improvement: "",
};
export const evidenceDataSchema = z.object({
  classification_reason: z.string().default(""),
  additional_criteria: z
    .array(z.object({ criterion: z.number().int().min(1).max(11), reason: z.string().min(1) }))
    .default([]),
  subject: z.string().default("اللغة الإنجليزية"),
  grade: z.string().optional(),
  classroom: z.string().optional(),
  audience: z.string().default("طلاب الصف الثالث الثانوي"),
  beneficiaries: z.number().int().nonnegative().optional(),
  execution_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  report_on: z.string().optional(),
  place: z.string().optional(),
  objective: z.string().default(""),
  practice: z.string().default(""),
  procedures: z.string().default(""),
  assessment: z.string().default(""),
  impact: z.string().default(""),
  reflection: z.string().default(""),
  source: z.string().default(""),
  report_text: z.string().optional(),
  featured: z.boolean().default(false),
  submitted_for_review: z.boolean().default(false),
});
export type EvidenceData = z.infer<typeof evidenceDataSchema>;
export const evidenceInputSchema = z.object({
  id: z.string().uuid().optional(),
  version: z.number().int().positive().optional(),
  period_id: z.string().min(1),
  title: z.string().trim().min(1),
  kind: z.enum(Object.keys(kinds) as [Kind, ...Kind[]]),
  criterion: z.number().int().min(1).max(11),
  target_id: z.string().nullable().optional(),
  status: z.enum(["draft", "incomplete", "complete", "archived"]).default("draft"),
  data: evidenceDataSchema,
});
export type Evidence = Omit<z.infer<typeof evidenceInputSchema>, "id" | "version"> & {
  id: string;
  version: number;
  created_at: string;
  updated_at: string;
};
export type Attachment = {
  id: string;
  evidence_id: string | null;
  purpose: "evidence" | "schedule";
  path: string;
  name: string;
  mime: string;
  sha256: string;
  size: number;
};
export type Review = {
  id: string;
  evidence_id: string;
  version: number;
  reviewer_email: string;
  reviewer_id: string;
  status: "pending" | "reviewed" | "changes_requested";
  note: string;
  created_at: string;
};
export const requiredFields = (kind: Kind) =>
  [
    "objective",
    "practice",
    "classification_reason",
    "source",
    ...(kind === "analysis" || kind === "remedial" ? ["assessment"] : []),
  ] as (keyof EvidenceData)[];
export const fieldNames: Partial<Record<keyof EvidenceData, string>> = {
  classification_reason: "سبب التصنيف",
  subject: "المادة",
  grade: "الصف",
  classroom: "الفصل",
  audience: "الفئة المستفيدة",
  beneficiaries: "عدد المستفيدين",
  execution_on: "تاريخ التنفيذ",
  report_on: "تاريخ إعداد التقرير",
  place: "مكان التنفيذ",
  objective: "الهدف",
  practice: "وصف الممارسة",
  procedures: "الإجراءات المنفذة",
  assessment: "أداة التقويم أو المتابعة",
  impact: "نتيجة فعلية أو أثر موثق",
  reflection: "تأمل مهني أو خطوة تحسين",
  source: "مصدر المعلومات",
  report_text: "نص التقرير الإضافي",
};
export function missingFields(e: Pick<Evidence, "kind" | "data">) {
  return requiredFields(e.kind).filter((k) => !String(e.data[k] ?? "").trim());
}
export function completion(
  settings: Settings,
  evidence: Evidence[],
  periodId = settings.current_period,
) {
  const rows = settings.criteria.map((c) => {
    const targets = settings.targets.filter(
      (t) => t.criterion === c.id && t.period_id === periodId,
    );
    const completed = targets.filter((t) =>
      evidence.some(
        (e) =>
          e.period_id === periodId &&
          e.criterion === c.id &&
          e.target_id === t.id &&
          e.status === "complete" &&
          missingFields(e).length === 0,
      ),
    );
    return {
      criterion: c,
      targets,
      completed,
      missing: targets.filter((t) => !completed.includes(t)),
      percent: targets.length ? Math.round((completed.length / targets.length) * 100) : null,
    };
  });
  const included = rows.filter((r) => r.percent !== null);
  return {
    rows,
    included: included.length,
    percent: included.length
      ? Math.round(included.reduce((sum, r) => sum + r.percent!, 0) / included.length)
      : null,
  };
}
export function todayRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function currentDayRiyadh() {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Riyadh", weekday: "short" }).format(
    new Date(),
  );
}
export const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
export function latestSchedule(s: Settings, on = todayRiyadh()) {
  return s.schedules
    .filter((x) => x.effective_on && x.effective_on <= on)
    .sort((a, b) => b.effective_on!.localeCompare(a.effective_on!))[0];
}
export const packageSchema = z.object({
  schema_version: z.literal(1),
  request_id: z.string().min(8).max(160),
  operation: z.enum(["create", "update", "archive", "restore", "attach", "settings", "progress"]),
  evidence: z.unknown().optional(),
  data: z.record(z.unknown()).optional(),
  version: z.number().int().positive().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1),
        mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
        base64: z.string().max(28_000_000),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .max(30)
    .optional(),
});
export type ImportPackage = z.infer<typeof packageSchema>;
const lessonSchema = z.object({
  id: z.string().min(1),
  day: z.number().int().min(0).max(4),
  period: z.number().int().min(1).max(15),
  start: z.string().optional(),
  end: z.string().optional(),
  subject: z.string().min(1),
  grade: z.string().optional(),
  room: z.string().optional(),
  duty: z.string().min(1),
});
export const settingsSchema = z
  .object({
    teacher: z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      school: z.string().min(1),
      administration: z.string(),
      director: z.string(),
      audience: z.string(),
      timezone: z.literal("Asia/Riyadh"),
      bio: z.string(),
      qualification: z.string().optional(),
      rank: z.string().optional(),
      experience: z.string().optional(),
      contact: z.string().optional(),
      license: z.string().optional(),
    }),
    periods: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        start: z.string().optional(),
        end: z.string().optional(),
        archived: z.boolean(),
      }),
    ),
    current_period: z.string(),
    criteria: z
      .array(
        z.object({
          id: z.number().int().min(1).max(11),
          name: z.string().min(1),
          weight: z.number().min(0).max(100),
          description: z.string(),
          suggestions: z.array(z.string()),
        }),
      )
      .length(11),
    targets: z.array(
      z.object({
        id: z.string().min(1),
        period_id: z.string(),
        criterion: z.number().int().min(1).max(11),
        title: z.string().min(1),
      }),
    ),
    standard: z.object({
      name: z.string(),
      authority: z.string(),
      edition: z.string(),
      url: z.string().url(),
      document_url: z.string().url(),
      verified_on: z.string(),
      note: z.string(),
    }),
    vision: z.string(),
    mission: z.string(),
    values: z.array(z.string()),
    goals: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        indicator: z.string().optional(),
        progress: z.number().min(0).max(100).optional(),
        status: z.string(),
        evidence_ids: z.array(z.string()),
        notes: z.string().optional(),
      }),
    ),
    career: z.array(
      z.object({
        id: z.string().min(1),
        type: z.string(),
        title: z.string().min(1),
        institution: z.string().optional(),
        date: z.string().optional(),
        description: z.string().optional(),
      }),
    ),
    schedules: z.array(
      z.object({
        id: z.string().min(1),
        effective_on: z.string().optional(),
        original_path: z.string().optional(),
        lessons: z.array(lessonSchema),
      }),
    ),
    reflection: z.string(),
    improvement: z.string(),
  })
  .superRefine((s, ctx) => {
    const ids = (items: { id: string }[]) => new Set(items.map((x) => x.id)).size === items.length;
    if (
      !ids(s.periods) ||
      !ids(s.targets) ||
      !ids(s.goals) ||
      !ids(s.schedules) ||
      !ids(s.criteria.map((c) => ({ id: String(c.id) })))
    )
      ctx.addIssue({ code: "custom", message: "المعرفات يجب أن تكون فريدة." });
    if (s.current_period && !s.periods.some((p) => p.id === s.current_period))
      ctx.addIssue({ code: "custom", message: "فترة الملف الحالية غير موجودة." });
    if (s.targets.some((t) => !s.periods.some((p) => p.id === t.period_id)))
      ctx.addIssue({ code: "custom", message: "أحد المستهدفات مرتبط بفترة غير موجودة." });
    if (s.goals.some((g) => g.progress !== undefined && !g.indicator))
      ctx.addIssue({ code: "custom", message: "نسبة تقدم الهدف تحتاج مؤشر متابعة فعليًا." });
    for (const schedule of s.schedules)
      if (
        new Set(schedule.lessons.map((l) => `${l.day}/${l.period}`)).size !==
        schedule.lessons.length
      )
        ctx.addIssue({ code: "custom", message: "لا يمكن تسجيل حصتين في الوقت واليوم نفسيهما." });
  });

export function mergeSettings(current: Settings, patch: Record<string, unknown>) {
  const teacherPatch = patch["teacher"];
  return settingsSchema.parse({
    ...current,
    ...patch,
    teacher:
      teacherPatch === undefined
        ? current.teacher
        : teacherPatch && typeof teacherPatch === "object" && !Array.isArray(teacherPatch)
          ? { ...current.teacher, ...teacherPatch }
          : teacherPatch,
  });
}

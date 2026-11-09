import { fieldNames, type EvidenceData, type Kind } from "./model";
type Template = {
  sections: (keyof EvidenceData)[];
  labels: Partial<Record<keyof EvidenceData, string>>;
};
const identity: (keyof EvidenceData)[] = [
  "subject",
  "grade",
  "classroom",
  "audience",
  "beneficiaries",
  "execution_on",
  "report_on",
  "place",
  "classification_reason",
];
const close: (keyof EvidenceData)[] = ["impact", "reflection", "source", "report_text"];
export const reportTemplates: Record<Kind, Template> = {
  strategy: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: { practice: "وصف الاستراتيجية المنفذة", procedures: "إجراءات تطبيق الاستراتيجية" },
  },
  individual: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: {
      practice: "احتياج التعلم والدعم المقدم",
      procedures: "خطوات الدعم الفردي أو المتمايز",
    },
  },
  assessment: {
    sections: [...identity, "objective", "assessment", "practice", "procedures", ...close],
    labels: { assessment: "أداة التقويم والتغذية الراجعة", practice: "وصف ممارسة التقويم" },
  },
  technology: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: {
      practice: "التقنية التعليمية وكيفية توظيفها",
      procedures: "خطوات التنفيذ باستخدام التقنية",
    },
  },
  analysis: {
    sections: [...identity, "objective", "assessment", "practice", "procedures", ...close],
    labels: {
      assessment: "مصدر البيانات وأداة التحليل",
      practice: "التحليل والتشخيص المستند إلى البيانات",
      impact: "النتائج الفعلية للتحليل",
    },
  },
  remedial: {
    sections: [...identity, "objective", "assessment", "practice", "procedures", ...close],
    labels: {
      assessment: "أداة تشخيص الاحتياج والمتابعة",
      practice: "الخطة العلاجية المنفذة",
      procedures: "الإجراءات ومتابعة التنفيذ",
    },
  },
  development: {
    sections: [...identity, "objective", "practice", "procedures", ...close],
    labels: { practice: "وصف التطوير المهني", impact: "تطبيق أو أثر موثق عند توفره" },
  },
  visit: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: { practice: "وصف الزيارة أو الدرس التطبيقي", reflection: "التأمل المهني ونقل الخبرة" },
  },
  parents: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: { practice: "وصف التواصل المهني", procedures: "الإجراءات مع حفظ خصوصية الأطراف" },
  },
  duty: {
    sections: [...identity, "objective", "practice", "procedures", "assessment", ...close],
    labels: { practice: "وصف المشاركة أو التكليف", procedures: "الإجراءات والمهام المنفذة" },
  },
};
export function reportFields(kind: Kind) {
  const template = reportTemplates[kind];
  return template.sections.map(
    (key) => [key, template.labels[key] ?? fieldNames[key] ?? key] as const,
  );
}

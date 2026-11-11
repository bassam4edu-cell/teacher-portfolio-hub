import type { Evidence, Settings } from "./model";
export type SimpleReportData = {
  description: string;
  objectives: string[];
  participants?: string;
  place?: string;
  duration?: string;
  execution_on?: string;
  date_estimated?: boolean;
  audience?: string;
  beneficiaries?: number;
  field?: string;
};
export type PublicAsset = { id: string; name: string; mime: string; sha256: string; size: number };
export type Publication = {
  id: string;
  criterion: number;
  period_id: string;
  title: string;
  report: SimpleReportData;
  assets: PublicAsset[];
  updated_at: string;
};
export const reportDefaults = {
  duration: "حصة دراسية",
  audience: "طلاب الصف الثالث الثانوي",
} as const;

export function reportFromEvidence(e: Evidence, s: Settings): SimpleReportData {
  return {
    description: e.data.practice,
    objectives: e.data.objective.split(/\n/).filter(Boolean).slice(0, 5),
    place: e.data.place ?? s.teacher.school,
    audience: reportDefaults.audience,
    duration: reportDefaults.duration,
    field: "تعليم",
    ...(e.data.execution_on ? { execution_on: e.data.execution_on } : {}),
  };
}
export function reportDate(r: SimpleReportData) {
  if (!r.execution_on) return "غير محدد";
  return r.execution_on;
}

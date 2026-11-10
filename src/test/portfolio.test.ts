import { describe, it, expect } from "vitest";
import {
  completion,
  defaultSettings,
  evidenceDataSchema,
  evidenceInputSchema,
  latestSchedule,
  missingFields,
  settingsSchema,
  type Evidence,
  type Settings,
} from "@/lib/portfolio/model";
import { reportFields, reportTemplates } from "@/lib/portfolio/templates";
function setup() {
  const s: Settings = structuredClone(defaultSettings);
  s.current_period = "p";
  s.periods = [{ id: "p", name: "فترة اختبار", archived: false }];
  s.targets = [1, 2, 3].map((i) => ({
    id: `t${i}`,
    period_id: "p",
    criterion: 4,
    title: `شاهد مستهدف ${i}`,
  }));
  return s;
}
function witness(id: string, target: string, status: Evidence["status"] = "complete"): Evidence {
  return {
    id,
    version: 1,
    period_id: "p",
    title: "بيانات اختبار",
    kind: "strategy",
    criterion: 4,
    target_id: target,
    status,
    data: evidenceDataSchema.parse({
      objective: "هدف",
      practice: "ممارسة",
      classification_reason: "تصنيف",
      source: "اختبار",
    }),
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}
describe("Real documentation completion", () => {
  it("rounds 2 of 3 targets to 67%, counts distinct targets only", () => {
    const s = setup();
    const e = [witness("a", "t1"), witness("b", "t1"), witness("c", "t2")];
    const c = completion(s, e);
    expect(c.percent).toBe(67);
    expect(c.included).toBe(1);
    expect(c.rows[3]!.completed).toHaveLength(2);
  });
  it("ignores archives, drafts, wrong periods and additional untargeted records", () => {
    const s = setup();
    const e = [
      witness("a", "t1", "archived"),
      witness("b", "t2", "draft"),
      { ...witness("c", "t3"), period_id: "previous" },
      witness("d", "other"),
    ];
    expect(completion(s, e).percent).toBe(0);
  });
  it("does not turn unspecified targets into a misleading zero", () => {
    expect(completion(defaultSettings, []).percent).toBeNull();
    expect(completion(defaultSettings, []).included).toBe(0);
  });
  it("does not count an incomplete record that claims complete", () => {
    const e = witness("a", "t1");
    e.data.source = "";
    expect(completion(setup(), [e]).percent).toBe(0);
  });
  it("never applies official evaluation weights to completion", () => {
    const s = setup();
    s.targets.push({ id: "t4", period_id: "p", criterion: 8, title: "بيئة التعلم" });
    const e = witness("a", "t4");
    e.criterion = 8;
    expect(completion(s, [e]).percent).toBe(50);
  });
});
describe("Evidence and schedule data integrity", () => {
  it("allows unknown implementation dates and counts", () => {
    expect(
      evidenceInputSchema.parse({
        ...witness("a", "t1"),
        id: "00000000-0000-4000-8000-000000000001",
      }).data.execution_on,
    ).toBeUndefined();
    expect(
      evidenceInputSchema.parse({
        ...witness("a", "t1"),
        id: "00000000-0000-4000-8000-000000000001",
      }).data.beneficiaries,
    ).toBeUndefined();
  });
  it("requires a documented assessment source for an analysis report", () => {
    const e = witness("a", "t1");
    e.kind = "analysis";
    expect(missingFields(e)).toContain("assessment");
  });
  it("rejects duplicate timetable slots", () => {
    const s = setup();
    const l = { id: "a", day: 0, period: 1, subject: "الإنجليزية", duty: "تدريس" };
    s.schedules = [{ id: "s", lessons: [l, { ...l, id: "b" }] }];
    expect(settingsSchema.safeParse(s).success).toBe(false);
  });
  it("does not display a future timetable as currently effective", () => {
    const s = setup();
    s.schedules = [
      { id: "old", effective_on: "2026-01-01", lessons: [] },
      { id: "future", effective_on: "2027-01-01", lessons: [] },
    ];
    expect(latestSchedule(s, "2026-11-09")?.id).toBe("old");
  });
  it("requires a real indicator for any goal percentage", () => {
    const s = setup();
    s.goals = [{ id: "g", title: "هدف اختبار", progress: 50, status: "جارٍ", evidence_ids: [] }];
    expect(settingsSchema.safeParse(s).success).toBe(false);
  });
  it("has reusable type-specific templates for all ten report types", () => {
    expect(Object.keys(reportTemplates)).toHaveLength(10);
    expect(reportFields("analysis").find(([k]) => k === "assessment")?.[1]).toBe(
      "مصدر البيانات وأداة التحليل",
    );
  });
});

describe("About content settings", () => {
  it("preserves editable about text without requiring invented career fields", () => {
    const settings = structuredClone(defaultSettings);
    settings.about = {
      introduction: "مقدمة",
      ethics: "ميثاق",
      policy: "سياسة",
      objectives: "أهداف",
    };
    const parsed = settingsSchema.parse(settings);
    expect(parsed.about).toEqual(settings.about);
    expect(parsed.teacher.qualification).toBeUndefined();
  });
});

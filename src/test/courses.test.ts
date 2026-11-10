import { describe, expect, it } from "vitest";
import {
  courseInputSchema,
  courseTotals,
  courseDuration,
  type Course,
} from "@/lib/portfolio/courses";
describe("Course durations", () => {
  it("counts hours separately from days and unknown durations", () => {
    const rows = [
      { duration_value: 6, duration_unit: "hours" },
      { duration_value: 2, duration_unit: "days" },
      { duration_value: null, duration_unit: null },
    ] as Course[];
    expect(courseTotals(rows)).toEqual({ count: 3, hours: 6, days: 2, unknown: 1 });
    expect(courseDuration(rows[2]!)).toBe("المدة غير محددة");
  });
  it("rejects negative or unpaired durations without requiring guessed dates", () => {
    const input = { title: "دورة", duration_value: null, duration_unit: null };
    expect(courseInputSchema.parse(input).execution_on).toBeUndefined();
    expect(() => courseInputSchema.parse({ ...input, duration_value: 3 })).toThrow();
    expect(() =>
      courseInputSchema.parse({ ...input, duration_value: -1, duration_unit: "hours" }),
    ).toThrow();
  });
});

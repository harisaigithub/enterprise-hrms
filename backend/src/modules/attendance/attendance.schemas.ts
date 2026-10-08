import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm time");
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

export const SHIFT_TYPES = ["FIXED", "FLEXIBLE", "ROTATING", "OVERNIGHT"] as const;

export const createShiftSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    startTime: time,
    endTime: time,
    shiftType: z.enum(SHIFT_TYPES).default("FIXED"),
    /** 0 = Sunday … 6 = Saturday. Evaluated on the day the shift starts. */
    weeklyOffDays: z
      .array(z.number().int().min(0).max(6))
      .max(6)
      .default([0, 6])
      .refine((d) => new Set(d).size === d.length, "Duplicate weekly-off days"),
    /** FIXED/ROTATING/OVERNIGHT: grace after start. FLEXIBLE: length of the arrival window from startTime. */
    gracePeriodMinutes: z.number().int().min(0).max(1439).default(15),
    breakDurationMinutes: z.number().int().min(0).max(1439).default(60),
    /** FLEXIBLE only: working minutes required per day. */
    requiredMinutes: z.number().int().min(60).max(1439).optional(),
    overtimeThresholdHours: z.number().min(1).max(24).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const duration = (minutes(input.endTime) - minutes(input.startTime) + 1440) % 1440;
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (duration === 0) return issue("endTime", "Start and end times must differ");
    if (input.breakDurationMinutes >= duration) issue("breakDurationMinutes", "Break duration must be shorter than the shift");
    if (input.gracePeriodMinutes >= duration) issue("gracePeriodMinutes", "Grace period must be shorter than the shift");

    const crossesMidnight = minutes(input.endTime) < minutes(input.startTime);
    if (crossesMidnight && input.shiftType !== "OVERNIGHT") issue("shiftType", "A shift that ends after midnight must be OVERNIGHT");
    if (!crossesMidnight && input.shiftType === "OVERNIGHT") issue("shiftType", "OVERNIGHT shifts must end before they start (next day)");

    if (input.shiftType === "FLEXIBLE") {
      if (!input.requiredMinutes) issue("requiredMinutes", "FLEXIBLE shifts need requiredMinutes");
      else if (input.requiredMinutes > duration) issue("requiredMinutes", "Required minutes cannot exceed the shift window");
    } else if (input.requiredMinutes) {
      issue("requiredMinutes", "requiredMinutes applies only to FLEXIBLE shifts");
    }
  });

/** GET /attendance/summary and /attendance/summary/rows */
export const summaryQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must use YYYY-MM-DD").optional(),
});

export const summaryRowsQuerySchema = summaryQuerySchema.extend({
  bucket: z.enum(["present", "late", "wfh", "absent", "onLeave", "notYetIn", "holiday", "weeklyOff"]),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

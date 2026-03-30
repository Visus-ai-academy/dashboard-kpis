import { z } from "zod";

export const entryScheduleCreateSchema = z.object({
  kpiId: z.string().uuid("ID do KPI inválido"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"], {
    message: "Frequência é obrigatória",
  }),
  deadlineTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário deve estar no formato HH:MM")
    .optional()
    .nullable(),
  reminderEnabled: z.boolean().optional(),
});

export const entryScheduleUpdateSchema = entryScheduleCreateSchema.partial();

export type EntryScheduleCreateInput = z.infer<typeof entryScheduleCreateSchema>;
export type EntryScheduleUpdateInput = z.infer<typeof entryScheduleUpdateSchema>;

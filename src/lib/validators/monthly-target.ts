import { z } from "zod";

export const monthlyTargetUpsertSchema = z.object({
  kpiId: z.string().min(1, "ID do KPI é obrigatório"),
  sellerId: z.string().min(1, "ID do vendedor é obrigatório").optional().nullable(),
  year: z.number().int().min(2020).max(2100),
  targets: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      targetValue: z.number().min(0, "Valor alvo deve ser maior ou igual a 0"),
    })
  ),
});

export const monthlyTargetBatchSchema = z.array(monthlyTargetUpsertSchema);

export type MonthlyTargetUpsertInput = z.infer<typeof monthlyTargetUpsertSchema>;
export type MonthlyTargetBatchInput = z.infer<typeof monthlyTargetBatchSchema>;

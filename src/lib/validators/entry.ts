import { z } from "zod";

export const entryCreateSchema = z.object({
  kpiId: z.string().min(1, "ID do KPI é obrigatório"),
  sellerId: z.string().min(1, "ID do vendedor é obrigatório"),
  value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  entryDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Data deve estar no formato ISO (YYYY-MM-DD)"
  ),
  notes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
  clientId: z.string().min(1).optional().nullable(),
  maturityLevel: z.enum(["INITIAL", "DEVELOPING", "MATURE", "CLOSING"]).optional().nullable(),
  temperature: z.enum(["COLD", "WARM", "HOT"]).optional().nullable(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional().nullable(),
});

export const entryBatchCreateSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
  entries: z.array(
    z.object({
      kpiId: z.string().min(1, "ID do KPI é obrigatório"),
      value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
      notes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
      clientId: z.string().optional(),
    })
  ).min(1, "Pelo menos um lançamento é obrigatório"),
});

// Legacy schema kept for backward compatibility with /api/entries
export const entryMultiCreateSchema = z.array(
  z.object({
    kpiId: z.string().min(1, "ID do KPI é obrigatório"),
    entries: z.array(
      z.object({
        clientId: z.string().min(1, "ID do cliente é obrigatório"),
        value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
        notes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional(),
        maturityLevel: z.enum(["INITIAL", "DEVELOPING", "MATURE", "CLOSING"]).optional().nullable(),
        temperature: z.enum(["COLD", "WARM", "HOT"]).optional().nullable(),
        scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional().nullable(),
      })
    ).min(1, "Pelo menos uma entrada é obrigatória"),
  })
);

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryBatchCreateInput = z.infer<typeof entryBatchCreateSchema>;
export type EntryMultiCreateInput = z.infer<typeof entryMultiCreateSchema>;

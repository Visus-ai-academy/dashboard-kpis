import { z } from "zod";

export const entryCreateSchema = z.object({
  kpiId: z.string().uuid("ID do KPI invalido"),
  sellerId: z.string().uuid("ID do vendedor invalido"),
  value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  entryDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Data deve estar no formato ISO (YYYY-MM-DD)"
  ),
  notes: z.string().max(500, "Observacoes devem ter no maximo 500 caracteres").optional(),
});

export const entryBatchCreateSchema = z.array(
  z.object({
    kpiId: z.string().uuid("ID do KPI invalido"),
    value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
    notes: z.string().max(500, "Observacoes devem ter no maximo 500 caracteres").optional(),
  })
);

export type EntryCreateInput = z.infer<typeof entryCreateSchema>;
export type EntryBatchCreateInput = z.infer<typeof entryBatchCreateSchema>;

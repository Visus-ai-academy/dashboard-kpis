import { z } from "zod";

export const leadEntryCreateSchema = z.object({
  sellerId: z.string().min(1, "ID do vendedor é obrigatório"),
  clientId: z.string().min(1).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  status: z.enum(["QUALIFIED", "DISQUALIFIED"], "Status deve ser QUALIFIED ou DISQUALIFIED"),
  entryDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Data deve estar no formato YYYY-MM-DD"
  ),
  notes: z.string().max(500, "Observações devem ter no máximo 500 caracteres").optional().nullable(),
});

export type LeadEntryCreateInput = z.infer<typeof leadEntryCreateSchema>;

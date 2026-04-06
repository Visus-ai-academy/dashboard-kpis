import { z } from "zod";

export const kpiCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  type: z.enum(["NUMERIC", "MONETARY", "PERCENTAGE"], {
    message: "Tipo é obrigatório",
  }),
  periodicity: z.enum(["DAILY", "WEEKLY", "MONTHLY"], {
    message: "Periodicidade é obrigatória",
  }),
  targetValue: z.number().min(0, "Valor alvo deve ser maior ou igual a 0"),
  isIndividual: z.boolean(),
  isRequired: z.boolean(),
  isPrimary: z.boolean(),
  scope: z.enum(["COMPANY", "SPECIFIC_SELLERS"], {
    message: "Escopo é obrigatório",
  }),
  chartType: z.enum(["LINE", "BAR", "AREA", "PIE", "RADIAL", "STACKED_BAR"], {
    message: "Tipo de gráfico é obrigatório",
  }),
  unitId: z.string().optional().nullable(),
  sectorIds: z.array(z.string().uuid()).optional(),
  sellerIds: z.array(z.string().uuid()).optional(),
});

export const kpiUpdateSchema = kpiCreateSchema.partial();

export type KpiCreateInput = z.infer<typeof kpiCreateSchema>;
export type KpiUpdateInput = z.infer<typeof kpiUpdateSchema>;

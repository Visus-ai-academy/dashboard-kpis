import { z } from "zod";

export const scoringRuleCreateSchema = z.object({
  campaignId: z.string().min(1, "Campanha é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  ruleType: z.enum(["POINTS_PER_UNIT", "BONUS_THRESHOLD", "MULTIPLIER"], {
    message: "Tipo de regra é obrigatório",
  }),
  kpiId: z.string().optional().nullable(),
  pointsPerUnit: z.number().min(0, "Pontos por unidade deve ser >= 0").default(0),
  maxPointsPerDay: z.number().min(0, "Máximo de pontos/dia deve ser >= 0").default(0),
  maxPointsPerWeek: z.number().min(0, "Máximo de pontos/semana deve ser >= 0").default(0),
  isActive: z.boolean().default(true),
});

export const scoringRuleUpdateSchema = scoringRuleCreateSchema.partial().omit({ campaignId: true });

export type ScoringRuleCreateInput = z.infer<typeof scoringRuleCreateSchema>;
export type ScoringRuleUpdateInput = z.infer<typeof scoringRuleUpdateSchema>;

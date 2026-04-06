import { z } from "zod";

export const gamificationLevelCreateSchema = z.object({
  campaignId: z.string().min(1, "Campanha é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  minPoints: z.number().min(0, "Pontuação mínima deve ser >= 0"),
  badgeEmoji: z.string().max(10, "Emoji deve ter no máximo 10 caracteres").optional().nullable(),
  displayOrder: z.number().int().min(0, "Ordem deve ser >= 0").default(0),
});

export const gamificationLevelUpdateSchema = gamificationLevelCreateSchema.partial().omit({ campaignId: true });

export type GamificationLevelCreateInput = z.infer<typeof gamificationLevelCreateSchema>;
export type GamificationLevelUpdateInput = z.infer<typeof gamificationLevelUpdateSchema>;

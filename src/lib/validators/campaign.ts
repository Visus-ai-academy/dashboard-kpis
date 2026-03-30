import { z } from "zod";

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  gamificationEnabled: z.boolean(),
  seasonType: z.enum(["WEEKLY", "MONTHLY", "CUSTOM"], {
    message: "Tipo de temporada é obrigatório",
  }),
  resetPointsOnEnd: z.boolean(),
  teamMode: z.boolean(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

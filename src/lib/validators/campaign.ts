import { z } from "zod";

export const campaignCreateSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio").max(100, "Nome deve ter no maximo 100 caracteres"),
  description: z.string().max(500, "Descricao deve ter no maximo 500 caracteres").optional(),
  gamificationEnabled: z.boolean(),
  seasonType: z.enum(["WEEKLY", "MONTHLY", "CUSTOM"], {
    message: "Tipo de temporada e obrigatorio",
  }),
  resetPointsOnEnd: z.boolean(),
  teamMode: z.boolean(),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;

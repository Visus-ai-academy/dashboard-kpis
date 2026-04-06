import { z } from "zod";

export const seasonCreateSchema = z.object({
  campaignId: z.string().min(1, "Campanha é obrigatória"),
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de término é obrigatória"),
  isActive: z.boolean().default(false),
});

export const seasonUpdateSchema = seasonCreateSchema.partial().omit({ campaignId: true });

export type SeasonCreateInput = z.infer<typeof seasonCreateSchema>;
export type SeasonUpdateInput = z.infer<typeof seasonUpdateSchema>;

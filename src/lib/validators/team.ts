import { z } from "zod";

export const teamCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  sectorId: z.string().uuid("ID do setor inválido"),
  isActive: z.boolean().optional(),
});

export const teamUpdateSchema = teamCreateSchema.partial();

export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;

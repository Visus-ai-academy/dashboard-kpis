import { z } from "zod";

export const unitCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  isActive: z.boolean().optional(),
});

export const unitUpdateSchema = unitCreateSchema.partial();

export type UnitCreateInput = z.infer<typeof unitCreateSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;

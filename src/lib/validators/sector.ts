import { z } from "zod";

export const sectorCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
  unitId: z.string().uuid("ID da unidade inválido"),
  isActive: z.boolean().optional(),
});

export const sectorUpdateSchema = sectorCreateSchema.partial();

export type SectorCreateInput = z.infer<typeof sectorCreateSchema>;
export type SectorUpdateInput = z.infer<typeof sectorUpdateSchema>;

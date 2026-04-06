import { z } from "zod";

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome deve ter no máximo 200 caracteres"),
  email: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().email("Email inválido").optional())
    .optional(),
  phone: z
    .string()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  status: z.enum(["CLIENT", "INACTIVE"]).optional(),
  unitId: z.string().min(1, "ID da unidade inválido").optional().nullable(),
  entryDate: z.string().optional().nullable(),
  exitDate: z.string().optional().nullable(),
  exitReason: z.string().max(500, "Motivo deve ter no máximo 500 caracteres").optional().nullable(),
  notes: z.string().max(1000, "Observações devem ter no máximo 1000 caracteres").optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

import { z } from "zod";

export const sellerCreateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome deve ter no máximo 100 caracteres"),
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
  teamId: z.string().uuid("ID do time inválido").optional(),
});

export const sellerUpdateSchema = sellerCreateSchema.partial();

export type SellerCreateInput = z.infer<typeof sellerCreateSchema>;
export type SellerUpdateInput = z.infer<typeof sellerUpdateSchema>;

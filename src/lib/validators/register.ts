import { z } from "zod";

export const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(2, "Nome da empresa deve ter no mínimo 2 caracteres")
      .max(100, "Nome da empresa deve ter no máximo 100 caracteres"),
    name: z
      .string()
      .min(2, "Nome deve ter no mínimo 2 caracteres")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(6, "Senha deve ter no mínimo 6 caracteres")
      .max(100, "Senha deve ter no máximo 100 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

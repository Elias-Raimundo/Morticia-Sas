import { z } from "zod";

export const accountIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "id debe ser numérico"),
});

export const setPasswordSchema = z.object({
  password: z
    .string({ error: "Ingresá la nueva contraseña" })
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

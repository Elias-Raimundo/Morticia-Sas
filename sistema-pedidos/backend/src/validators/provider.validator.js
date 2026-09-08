import { z } from "zod";

export const providerIdParamSchema = z.object({
  providerId: z.string().regex(/^\d+$/, "providerId debe ser numérico"),
});

export const createProviderSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  cuit: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
});

export const updateProviderSchema = createProviderSchema.partial();

export const manualMovementSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  amount: z.number().refine((n) => n !== 0, "El monto no puede ser 0"),
});

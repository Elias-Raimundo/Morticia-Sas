import { z } from "zod";

export const assetIdParamSchema = z.object({
  assetId: z.string().regex(/^\d+$/, "assetId debe ser numérico"),
});

const assetPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.string().min(1, "Indicá la forma de pago"),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const createAssetSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  location: z.string().optional(),
  totalCost: z.number().nonnegative().optional(),
  acquiredAt: z.string().optional(),
  payments: z.array(assetPaymentSchema).optional(),
});

export const updateAssetSchema = createAssetSchema.partial().omit({ payments: true });

export const addAssetPaymentSchema = assetPaymentSchema;

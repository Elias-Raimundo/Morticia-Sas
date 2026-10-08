import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = z.string().max(200, "Texto demasiado largo").nullable().optional();

const customerSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: optionalText,
    legalName: optionalText,
    cuit: z.string().max(30, "CUIT/CUIL demasiado largo").nullable().optional(),
    address: optionalText,
    email: z
      .string()
      .max(200)
      .nullable()
      .optional()
      .refine((v) => !v || !v.trim() || EMAIL_RE.test(v.trim()), "El email no es válido"),
  })
  .refine((c) => c.id || (c.name && c.name.trim().length > 0), {
    message: "Elegí un cliente o ingresá el nombre del local",
    path: ["name"],
  });

export const createQuoteSchema = z.object({
  customer: customerSchema,
  items: z
    .array(
      z.object({
        productId: z.number({ message: "Producto inválido" }).int().positive(),
        quantity: z
          .number({ message: "La cantidad debe ser un número" })
          .int({ message: "La cantidad debe ser un número entero" })
          .positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "Agregá al menos un producto")
    .max(200, "Demasiados productos en un solo presupuesto"),
  // null/sin valor = usa el descuento habitual del cliente (0 si es nuevo)
  discountPercent: z
    .number({ message: "El descuento debe ser un número" })
    .min(0, "El descuento no puede ser negativo")
    .max(100, "El descuento no puede superar el 100%")
    .nullable()
    .optional(),
  comments: z.string().max(500, "Las observaciones son demasiado largas").nullable().optional(),
});

export const quoteIdParamSchema = z.object({
  quoteId: z.string().regex(/^\d+$/, "quoteId debe ser numérico"),
});

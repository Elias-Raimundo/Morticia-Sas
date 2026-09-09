import { z } from "zod";

export const invoiceIdParamSchema = z.object({
  invoiceId: z.string().regex(/^\d+$/, "invoiceId debe ser numérico"),
});

export const installmentIdParamSchema = z.object({
  installmentId: z.string().regex(/^\d+$/, "installmentId debe ser numérico"),
});

const invoiceItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive("El costo debe ser mayor a 0"),
  salePrice: z.number().positive().optional(),
});

const installmentSchema = z.object({
  amount: z.number().positive("El monto de la cuota debe ser mayor a 0"),
  dueDate: z.string().min(1, "La cuota necesita una fecha de vencimiento"),
});

export const createInvoiceSchema = z
  .object({
    number: z.string().optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
    paymentType: z.enum(["fiado", "cuotas", "completo"]),
    items: z.array(invoiceItemSchema).min(1, "Agregá al menos un producto"),
    installments: z.array(installmentSchema).optional(),
  })
  .refine(
    (data) => data.paymentType !== "cuotas" || (data.installments && data.installments.length > 0),
    { message: "Definí al menos una cuota", path: ["installments"] }
  );

export const registerPaymentSchema = z.object({
  amount: z.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional(),
  method: z.string().optional(),
});

export const payInstallmentSchema = z.object({
  method: z.string().optional(),
});

import { z } from "zod";

export const expenseIdParamSchema = z.object({
  expenseId: z.string().regex(/^\d+$/, "expenseId debe ser numérico"),
});

export const installmentIdParamSchema = z.object({
  installmentId: z.string().regex(/^\d+$/, "installmentId debe ser numérico"),
});

const expenseInstallmentSchema = z.object({
  amount: z.number().positive("El monto de la cuota debe ser mayor a 0"),
  dueDate: z.string().min(1, "La cuota necesita una fecha de vencimiento"),
});

export const createExpenseSchema = z
  .object({
    description: z.string().min(1, "La descripción es obligatoria"),
    category: z.string().min(1, "La categoría es obligatoria"), // ej: "iva", "honorarios", "servicios", "otro"
    amount: z.number().positive("El monto debe ser mayor a 0"),
    expenseDate: z.string().optional(),
    dueDate: z.string().optional(),
    reminderEnabled: z.boolean().optional(),
    isInstallment: z.boolean().optional(),
    installments: z.array(expenseInstallmentSchema).optional(),
  })
  .refine(
    (data) => !data.isInstallment || (data.installments && data.installments.length > 0),
    { message: "Definí al menos una cuota para pagar en cuotas", path: ["installments"] }
  );

export const updateExpenseSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria").optional(),
  category: z.string().min(1, "La categoría es obligatoria").optional(),
  amount: z.number().positive("El monto debe ser mayor a 0").optional(),
  expenseDate: z.string().optional(),
  dueDate: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
});

export const registerExpensePaymentSchema = z.object({
  paidAt: z.string().optional(),
});

export const payExpenseInstallmentSchema = z.object({
  paidAt: z.string().optional(),
});

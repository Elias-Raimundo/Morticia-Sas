import { z } from "zod";

export const expenseIdParamSchema = z.object({
  expenseId: z.string().regex(/^\d+$/, "expenseId debe ser numérico"),
});

export const createExpenseSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria"),
  category: z.string().min(1, "La categoría es obligatoria"), // ej: "iva", "honorarios", "servicios", "otro"
  amount: z.number().positive("El monto debe ser mayor a 0"),
  expenseDate: z.string().optional(),
  dueDate: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const registerExpensePaymentSchema = z.object({
  paidAt: z.string().optional(),
});

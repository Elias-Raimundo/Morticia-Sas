import { z } from "zod";

export const orderIdParamSchema = z.object({
  orderId: z.string().regex(/^\d+$/, "orderId debe ser numérico"),
});

export const sendOrderSchema = z.object({
  orderId: z.string().regex(/^\d+$/, "orderId debe ser numérico"),
});

export const createOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
});
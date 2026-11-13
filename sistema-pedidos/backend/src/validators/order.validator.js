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

// Edición de un pedido ya confirmado (dentro de la ventana de tiempo)
export const editOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "El pedido necesita al menos un producto"),
  comments: z.string().max(1000).nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  clientPaymentMethod: z.enum(["transferencia", "efectivo", "qr"]).nullable().optional(),
});

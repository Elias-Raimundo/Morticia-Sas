import { z } from "zod";

export const adminIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "id debe ser numérico"),
});

export const setOrderEmailsSchema = z.object({
  receive: z.boolean({ message: "receive debe ser true o false" }),
});

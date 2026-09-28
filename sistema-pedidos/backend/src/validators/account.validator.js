import { z } from "zod";

export const accountIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "id debe ser numérico"),
});

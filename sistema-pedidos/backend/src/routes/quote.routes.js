import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as quoteController from "../controllers/quote.controller.js";
import { createQuoteSchema, quoteIdParamSchema } from "../validators/quote.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

// Últimos presupuestos
router.get("/", quoteController.listQuotes);

// Generar un presupuesto (no toca stock ni saldo)
router.post("/", validate(createQuoteSchema), quoteController.createQuote);

// Presupuesto en PDF
router.get("/:quoteId/pdf", validate(quoteIdParamSchema, "params"), quoteController.getQuotePdf);

export default router;

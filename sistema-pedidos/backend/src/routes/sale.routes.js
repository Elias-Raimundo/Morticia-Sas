import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as saleController from "../controllers/sale.controller.js";
import { createSaleSchema, saleIdParamSchema } from "../validators/sale.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

// Últimas ventas al público
router.get("/", saleController.listSales);

// Registrar una venta al público
router.post("/", validate(createSaleSchema), saleController.createSale);

// Remito en PDF de una venta
router.get("/:saleId/remito", validate(saleIdParamSchema, "params"), saleController.getRemito);

export default router;

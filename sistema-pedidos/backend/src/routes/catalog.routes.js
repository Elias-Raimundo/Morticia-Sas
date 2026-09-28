import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import * as catalogController from "../controllers/catalog.controller.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

// Catálogo de productos en PDF para clientes (?includeOutOfStock=true incluye los sin stock)
router.get("/pdf", catalogController.getCatalogPdf);

export default router;

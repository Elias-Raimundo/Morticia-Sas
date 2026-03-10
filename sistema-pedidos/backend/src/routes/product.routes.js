import express from "express";
import * as productController from "../controllers/product.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// CLIENT: catálogo (solo activos)
router.get("/", authMiddleware, productController.getActiveProducts);

// ADMIN: ver todos (activos e inactivos)
router.get("/admin", authMiddleware, requireRole("admin"), productController.getAllProductsAdmin);

// ADMIN: crear
router.post("/admin", authMiddleware, requireRole("admin"), productController.createProduct);

// ADMIN: editar (name/unit/price/active)
router.patch("/admin/:id", authMiddleware, requireRole("admin"), productController.updateProduct);

export default router;
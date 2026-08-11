import express from "express";
import * as productController from "../controllers/product.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";

const router = express.Router();

// CLIENT: catálogo (solo activos)
router.get("/", authMiddleware, productController.getActiveProducts);

// ADMIN: ver todos (activos e inactivos)
router.get("/admin", authMiddleware, requireRole("admin"), productController.getAllProductsAdmin);

// ADMIN: crear
router.post("/admin", authMiddleware, requireRole("admin"), productController.createProduct);

// ADMIN: editar (name/unit/price/active)
router.patch("/admin/:id", authMiddleware, requireRole("admin"), productController.updateProduct);

// ADMIN: eliminar (solo si no tiene pedidos asociados)
router.delete("/admin/:id", authMiddleware, requireRole("admin"), productController.deleteProduct);

// ADMIN: capital total invertido en stock (costo interno)
router.get("/admin/capital", authMiddleware, requireRole("admin"), productController.getCapitalTotal);

// ADMIN: subir/reemplazar foto del producto
router.post(
  "/admin/:id/image",
  authMiddleware,
  requireRole("admin"),
  uploadImage,
  productController.uploadProductImage
);

export default router;
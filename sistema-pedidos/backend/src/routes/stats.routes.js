import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { getProductsStats, getPurchasesStats, getAdminHome } from "../controllers/stats.controller.js";

const router = express.Router();

router.get(
  "/admin/products",
  authMiddleware,
  requireRole("admin"),
  getProductsStats
);

router.get(
  "/admin/purchases",
  authMiddleware,
  requireRole("admin"),
  getPurchasesStats
);

// Pantalla de inicio del admin
router.get(
  "/admin/home",
  authMiddleware,
  requireRole("admin"),
  getAdminHome
);

export default router;
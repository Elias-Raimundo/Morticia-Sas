import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { getProductsStats } from "../controllers/stats.controller.js";

const router = express.Router();

router.get(
  "/admin/products",
  authMiddleware,
  requireRole("admin"),
  getProductsStats
);

export default router;
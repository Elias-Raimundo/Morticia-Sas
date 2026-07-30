import { Router } from "express";
import { getCategories, createCategoryController, updateCategoryController, deleteCategoryController } from "../controllers/category.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getCategories); // cualquier user logueado puede ver
router.post("/", authMiddleware, requireRole("admin"), createCategoryController);
router.patch("/:id", authMiddleware, requireRole("admin"), updateCategoryController);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteCategoryController);

export default router;
import { Router } from "express";
import { getCategories, createCategoryController, updateCategoryController, deleteCategoryController } from "../controllers/category.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getCategories);
router.post("/", authMiddleware, createCategoryController);
router.patch("/:id", authMiddleware, updateCategoryController);
router.delete("/:id", authMiddleware, deleteCategoryController);

export default router;
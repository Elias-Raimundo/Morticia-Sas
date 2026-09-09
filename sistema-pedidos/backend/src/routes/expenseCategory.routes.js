import { Router } from "express";
import {
  getExpenseCategories,
  createExpenseCategoryController,
  updateExpenseCategoryController,
  deleteExpenseCategoryController,
} from "../controllers/expenseCategory.controller.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, requireRole("admin"), getExpenseCategories);
router.post("/", authMiddleware, requireRole("admin"), createExpenseCategoryController);
router.patch("/:id", authMiddleware, requireRole("admin"), updateExpenseCategoryController);
router.delete("/:id", authMiddleware, requireRole("admin"), deleteExpenseCategoryController);

export default router;

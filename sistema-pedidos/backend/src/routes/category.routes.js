import { Router } from "express";
import { getCategories } from "../controllers/category.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", authMiddleware, getCategories);

export default router;
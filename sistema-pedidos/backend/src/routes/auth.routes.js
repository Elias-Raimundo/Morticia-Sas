import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// El usuario logueado cambia su propia contraseña: { currentPassword, newPassword }
router.patch("/change-password", authMiddleware, authController.changeOwnPassword);

export default router;

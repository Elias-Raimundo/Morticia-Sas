import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as accountController from "../controllers/account.controller.js";
import { accountIdParamSchema } from "../validators/account.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

// Eliminar (o archivar, si tiene historial) una cuenta de cliente o de administrador
router.delete("/:id", validate(accountIdParamSchema, "params"), accountController.deleteAccount);

export default router;

import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as adminUserController from "../controllers/adminUser.controller.js";
import { adminIdParamSchema, setOrderEmailsSchema } from "../validators/adminUser.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", adminUserController.listAdmins);

// Activar/desactivar el mail de pedidos de un admin: { "receive": true | false }
router.patch(
  "/:id/order-emails",
  validate(adminIdParamSchema, "params"),
  validate(setOrderEmailsSchema),
  adminUserController.setOrderEmails
);

export default router;

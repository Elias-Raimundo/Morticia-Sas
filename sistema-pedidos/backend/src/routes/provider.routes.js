import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as providerController from "../controllers/provider.controller.js";
import {
  providerIdParamSchema,
  createProviderSchema,
  updateProviderSchema,
  manualMovementSchema,
} from "../validators/provider.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", providerController.listProviders);

router.post("/", validate(createProviderSchema), providerController.createProvider);

router.get(
  "/:providerId",
  validate(providerIdParamSchema, "params"),
  providerController.getProviderById
);

router.patch(
  "/:providerId",
  validate(providerIdParamSchema, "params"),
  validate(updateProviderSchema),
  providerController.updateProvider
);

router.delete(
  "/:providerId",
  validate(providerIdParamSchema, "params"),
  providerController.deactivateProvider
);

// Ajuste manual de deuda (nota de crédito, descuento, recargo)
router.post(
  "/:providerId/movements",
  validate(providerIdParamSchema, "params"),
  validate(manualMovementSchema),
  providerController.addManualMovement
);

export default router;

import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as assetController from "../controllers/asset.controller.js";
import {
  assetIdParamSchema,
  createAssetSchema,
  updateAssetSchema,
  addAssetPaymentSchema,
} from "../validators/asset.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", assetController.listAssets);

router.post("/", validate(createAssetSchema), assetController.createAsset);

router.get(
  "/:assetId",
  validate(assetIdParamSchema, "params"),
  assetController.getAssetById
);

router.patch(
  "/:assetId",
  validate(assetIdParamSchema, "params"),
  validate(updateAssetSchema),
  assetController.updateAsset
);

router.delete(
  "/:assetId",
  validate(assetIdParamSchema, "params"),
  assetController.deactivateAsset
);

router.post(
  "/:assetId/payments",
  validate(assetIdParamSchema, "params"),
  validate(addAssetPaymentSchema),
  assetController.addPayment
);

export default router;

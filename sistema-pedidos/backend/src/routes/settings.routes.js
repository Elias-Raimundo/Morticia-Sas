import express from "express";
import { z } from "zod";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { uploadImage } from "../middleware/upload.middleware.js";
import * as settingsController from "../controllers/settings.controller.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

const paymentSchema = z.object({
  alias: z.string().max(100).optional(),
  holder: z.string().max(100).optional(),
});

router.get("/payment", settingsController.getPayment);
router.put("/payment", validate(paymentSchema), settingsController.updatePayment);
router.post("/payment/qr", uploadImage, settingsController.uploadQr);
router.delete("/payment/qr", settingsController.deleteQr);

export default router;

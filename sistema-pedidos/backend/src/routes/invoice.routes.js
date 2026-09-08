import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as invoiceController from "../controllers/invoice.controller.js";
import { providerIdParamSchema } from "../validators/provider.validator.js";
import {
  invoiceIdParamSchema,
  installmentIdParamSchema,
  createInvoiceSchema,
  registerPaymentSchema,
} from "../validators/invoice.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

// Facturas de un proveedor puntual
router.get(
  "/providers/:providerId/invoices",
  validate(providerIdParamSchema, "params"),
  invoiceController.listInvoicesByProvider
);

router.post(
  "/providers/:providerId/invoices",
  validate(providerIdParamSchema, "params"),
  validate(createInvoiceSchema),
  invoiceController.createInvoice
);

// Detalle / pagos de una factura puntual
router.get(
  "/invoices/:invoiceId",
  validate(invoiceIdParamSchema, "params"),
  invoiceController.getInvoiceById
);

router.post(
  "/invoices/:invoiceId/payments",
  validate(invoiceIdParamSchema, "params"),
  validate(registerPaymentSchema),
  invoiceController.registerInvoicePayment
);

// Pagar una cuota puntual del plan de cuotas
router.patch(
  "/installments/:installmentId/pay",
  validate(installmentIdParamSchema, "params"),
  invoiceController.payInstallment
);

export default router;

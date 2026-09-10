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
  payInstallmentSchema,
} from "../validators/invoice.validator.js";

const router = express.Router();

// IMPORTANTE: este router se monta en "/api" (raíz), no en un prefijo propio,
// porque sus rutas ya incluyen el camino completo (/providers/:id/invoices, etc).
// Por eso NO puede usarse un router.use(authMiddleware, requireRole("admin")) acá:
// interceptaría CUALQUIER pedido a /api/* que no matchee antes (ej: /api/user/me
// de un cliente), bloqueándolo con 403. Se aplica el middleware en cada ruta.

// Facturas de un proveedor puntual
router.get(
  "/providers/:providerId/invoices",
  authMiddleware,
  requireRole("admin"),
  validate(providerIdParamSchema, "params"),
  invoiceController.listInvoicesByProvider
);

router.post(
  "/providers/:providerId/invoices",
  authMiddleware,
  requireRole("admin"),
  validate(providerIdParamSchema, "params"),
  validate(createInvoiceSchema),
  invoiceController.createInvoice
);

// Detalle / pagos de una factura puntual
router.get(
  "/invoices/:invoiceId",
  authMiddleware,
  requireRole("admin"),
  validate(invoiceIdParamSchema, "params"),
  invoiceController.getInvoiceById
);

router.post(
  "/invoices/:invoiceId/payments",
  authMiddleware,
  requireRole("admin"),
  validate(invoiceIdParamSchema, "params"),
  validate(registerPaymentSchema),
  invoiceController.registerInvoicePayment
);

// Pagar una cuota puntual del plan de cuotas
router.patch(
  "/installments/:installmentId/pay",
  authMiddleware,
  requireRole("admin"),
  validate(installmentIdParamSchema, "params"),
  validate(payInstallmentSchema),
  invoiceController.payInstallment
);

export default router;

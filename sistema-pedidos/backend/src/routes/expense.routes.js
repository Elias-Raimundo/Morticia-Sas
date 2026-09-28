import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as expenseController from "../controllers/expense.controller.js";
import {
  expenseIdParamSchema,
  installmentIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  registerExpensePaymentSchema,
  payExpenseInstallmentSchema,
} from "../validators/expense.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", expenseController.listExpenses);

// Métricas por mes y por categoría (?year=2026)
router.get("/metrics", expenseController.getMetrics);

router.post("/", validate(createExpenseSchema), expenseController.createExpense);

router.patch(
  "/:expenseId",
  validate(expenseIdParamSchema, "params"),
  validate(updateExpenseSchema),
  expenseController.updateExpense
);

router.patch(
  "/:expenseId/pay",
  validate(expenseIdParamSchema, "params"),
  validate(registerExpensePaymentSchema),
  expenseController.registerPayment
);

router.delete(
  "/:expenseId",
  validate(expenseIdParamSchema, "params"),
  expenseController.deleteExpense
);

// Pagar una cuota puntual del plan de cuotas de un gasto
router.patch(
  "/installments/:installmentId/pay",
  validate(installmentIdParamSchema, "params"),
  validate(payExpenseInstallmentSchema),
  expenseController.payInstallment
);

export default router;

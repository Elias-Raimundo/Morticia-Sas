import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import * as expenseController from "../controllers/expense.controller.js";
import {
  expenseIdParamSchema,
  createExpenseSchema,
  updateExpenseSchema,
  registerExpensePaymentSchema,
} from "../validators/expense.validator.js";

const router = express.Router();

router.use(authMiddleware, requireRole("admin"));

router.get("/", expenseController.listExpenses);

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

export default router;

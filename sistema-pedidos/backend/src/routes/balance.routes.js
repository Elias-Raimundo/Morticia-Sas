import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import * as balanceController from "../controllers/balance.controller.js";

const router = express.Router();

// cliente: ver su saldo
router.get(
  "/my",
  authMiddleware,
  requireRole("client"),
  balanceController.getMyBalance
);

router.get(
  "/admin/clients",
  authMiddleware,
  requireRole("admin"),
  balanceController.getAllClientsBalances
);

// admin: ver saldo de un cliente
router.get(
  "/admin/:userId",
  authMiddleware,
  requireRole("admin"),
  balanceController.getUserBalanceAdmin
);

router.post(
    "/admin/:userId/payment",
    authMiddleware,
    requireRole("admin"),
    balanceController.registerPayment
);



export default router;
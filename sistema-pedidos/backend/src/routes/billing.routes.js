import crypto from "node:crypto";
import express from "express";
import prisma from "../prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getBillingState, resetBillingCache } from "../services/billing.service.js";
import { READONLY_FROM_DAY } from "../utils/billing.js";

const router = express.Router();

// Estado de la mensualidad para mostrar avisos. El detalle del cobro (aviso de
// vencimiento) es solo para el administrador; el resto solo se entera del modo solo lectura.
router.get("/status", authMiddleware, async (req, res, next) => {
  try {
    const { state, monthName } = await getBillingState();
    const isAdmin = req.user.role === "admin";

    if (state === "readonly") {
      return res.json({ state: "readonly", monthName: isAdmin ? monthName : undefined, contact: isAdmin ? process.env.BILLING_CONTACT || null : undefined });
    }
    if (state === "warning" && isAdmin) {
      return res.json({ state: "warning", monthName, readOnlyFromDay: READONLY_FROM_DAY, contact: process.env.BILLING_CONTACT || null });
    }
    return res.json({ state: "ok" });
  } catch (error) {
    next(error);
  }
});

// ---- Panel del dueño del sistema (no del cliente) ----
// Protegido con una clave que solo existe en las variables de entorno del servidor
// (BILLING_ADMIN_KEY). Sin esa variable, el panel queda deshabilitado.
const ownerKey = (req, res, next) => {
  const expected = process.env.BILLING_ADMIN_KEY;
  if (!expected) return res.status(404).json({ error: "No disponible" });
  const a = crypto.createHash("sha256").update(String(req.headers["x-owner-key"] || "")).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: "Clave incorrecta" });
  next();
};

router.get("/owner/months", ownerKey, async (req, res, next) => {
  try {
    const [current, months] = await Promise.all([
      getBillingState(),
      prisma.billingMonth.findMany({ orderBy: { period: "desc" }, take: 12 }),
    ]);
    res.json({ current, months });
  } catch (error) {
    next(error);
  }
});

router.post("/owner/months", ownerKey, async (req, res, next) => {
  try {
    const { period, paid } = req.body ?? {};
    if (typeof period !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || typeof paid !== "boolean") {
      return res.status(400).json({ error: "Datos inválidos" });
    }
    const row = await prisma.billingMonth.upsert({
      where: { period },
      update: { paid, paidAt: new Date() },
      create: { period, paid },
    });
    resetBillingCache();
    res.json(row);
  } catch (error) {
    next(error);
  }
});

export default router;

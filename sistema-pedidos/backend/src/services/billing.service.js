import prisma from "../prisma.js";
import { computeBillingState, periodOf, argentinaParts } from "../utils/billing.js";

const CACHE_MS = 60_000; // el pago se refleja en hasta 1 minuto
let cache = { period: null, paid: false, expires: 0 };

// Si no se puede consultar la base, NO se bloquea: un error técnico nunca debe
// suspender el sistema por falta de pago.
const isPeriodPaid = async (period) => {
  if (cache.period === period && cache.expires > Date.now()) return cache.paid;
  try {
    const row = await prisma.billingMonth.findUnique({ where: { period } });
    const paid = !!row && row.paid;
    cache = { period, paid, expires: Date.now() + CACHE_MS };
    return paid;
  } catch (error) {
    console.error("Billing: no se pudo consultar la mensualidad, se deja pasar", error.message);
    return true;
  }
};

export const getBillingState = async (date = new Date()) => {
  const period = periodOf(argentinaParts(date));
  return computeBillingState(date, await isPeriodPaid(period));
};

export const resetBillingCache = () => {
  cache = { period: null, paid: false, expires: 0 };
};

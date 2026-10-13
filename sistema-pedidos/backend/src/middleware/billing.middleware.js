import { getBillingState } from "../services/billing.service.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Siempre permitido, aun en solo lectura: iniciar sesión / recuperar clave y las
// notificaciones (marcar como leídas no modifica datos del negocio).
const ALLOWED_PREFIXES = ["/api/auth", "/api/notifications", "/api/billing/owner"];

// Modo solo lectura: bloquea todo lo que modifique datos cuando la mensualidad del mes
// en curso no está paga pasado el día 15.
export const readOnlyGuard = async (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (ALLOWED_PREFIXES.some((p) => req.originalUrl.startsWith(p))) return next();

  const { state } = await getBillingState();
  if (state !== "readonly") return next();

  return res.status(403).json({
    error: "El sistema está en modo solo lectura en este momento: podés consultar la información, pero no cargar ni modificar datos. Contactá al administrador.",
    code: "READ_ONLY",
  });
};

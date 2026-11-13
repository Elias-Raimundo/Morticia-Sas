// Formas de pago que puede elegir el cliente al hacer un pedido.
// El alias y el QR se configuran por variables de entorno (no hay que tocar código):
//   PAYMENT_ALIAS   alias para transferencias
//   PAYMENT_HOLDER  titular de la cuenta (opcional)
//   PAYMENT_QR_URL  URL pública de la imagen del QR (opcional)
import prisma from "../prisma.js";

export const PAYMENT_METHOD_IDS = ["transferencia", "efectivo", "qr"];

// (por defecto 2 horas = 120 minutos)
// Minutos que tiene el cliente para modificar un pedido ya confirmado.
export const getEditWindowMinutes = () => {
  const n = Number(process.env.ORDER_EDIT_WINDOW_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 120;
};

// Claves guardadas en la tabla Setting (se editan desde Configuración en el admin)
export const PAYMENT_SETTING_KEYS = ["paymentAlias", "paymentHolder", "paymentQrUrl"];

export const getPaymentSettings = async () => {
  const rows = await prisma.setting.findMany({ where: { key: { in: PAYMENT_SETTING_KEYS } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    alias: map.paymentAlias || process.env.PAYMENT_ALIAS || null,
    holder: map.paymentHolder || process.env.PAYMENT_HOLDER || null,
    qrUrl: map.paymentQrUrl || process.env.PAYMENT_QR_URL || null,
  };
};

export const getPaymentInfo = async () => {
  const { alias, holder, qrUrl } = await getPaymentSettings();
  return {
    editWindowMinutes: getEditWindowMinutes(),
    methods: [
      { id: "transferencia", label: "Transferencia", alias, holder },
      { id: "efectivo", label: "Efectivo" },
      { id: "qr", label: "QR", qrUrl },
    ],
  };
};

// "2 horas", "90 minutos", "1 hora y 30 minutos"
export const formatWindow = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [];
  if (h) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  return parts.join(" y ");
};

// Hasta cuándo puede el cliente editar un pedido, o null si ya no se puede.
export const getEditableUntil = (order) => {
  if (!order || order.status !== "confirmed" || order.isCounterSale || !order.confirmedAt) return null;
  const until = new Date(new Date(order.confirmedAt).getTime() + getEditWindowMinutes() * 60 * 1000);
  return until > new Date() ? until.toISOString() : null;
};

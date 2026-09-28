// Formatos compartidos por los PDF (hora y moneda argentinas).
export const TZ_AR = "America/Argentina/Buenos_Aires";

// Sin decimales si el importe es entero; con 2 decimales si no ($ 1.250,50).
export const money = (value) => {
  const n = Number(value) || 0;
  const hasDecimals = Math.abs(n - Math.round(n)) > 0.0001;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(n);
};

const toDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// 28/09/2026
export const formatDateAR = (value) => {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("es-AR", {
    timeZone: TZ_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// 28/09/2026 12:01
export const formatDateTimeAR = (value) => {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString("es-AR", {
    timeZone: TZ_AR,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

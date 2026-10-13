// Mensualidad del sistema: del día 10 al 14 el admin ve un aviso; desde el día 15, si el
// mes en curso no figura como pagado, el sistema pasa a modo solo lectura.
export const WARN_FROM_DAY = 10;
export const READONLY_FROM_DAY = 15;

const TZ = "America/Argentina/Buenos_Aires";
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Año, mes y día según Argentina (el servidor corre en UTC).
export const argentinaParts = (date = new Date()) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day) };
};

export const periodOf = ({ year, month }) => `${year}-${String(month).padStart(2, "0")}`;

// state: "ok" | "warning" | "readonly"
export const computeBillingState = (date, isPaid) => {
  const parts = argentinaParts(date);
  const period = periodOf(parts);
  const monthName = MONTHS[parts.month - 1];
  if (isPaid || parts.day < WARN_FROM_DAY) return { state: "ok", period, monthName };
  if (parts.day < READONLY_FROM_DAY) return { state: "warning", period, monthName };
  return { state: "readonly", period, monthName };
};

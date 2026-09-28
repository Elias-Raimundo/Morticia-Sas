// Convierte lo que manda un <input type="date"> ("2026-09-28") a un Date que Prisma
// acepte. Prisma rechaza el string crudo ("Expected ISO-8601 DateTime"), y a medianoche
// UTC la fecha se vería un día corrida en Argentina (UTC-3), así que las fechas
// "solo día" se guardan al MEDIODÍA UTC.
export const toDateOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00.000Z`);
  return new Date(value);
};

// Fecha de hoy según Argentina (el servidor corre en UTC), al mediodía UTC.
export const todayArgentina = () => {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  return new Date(`${ymd}T12:00:00.000Z`);
};

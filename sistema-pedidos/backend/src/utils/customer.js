// Los clientes de venta al público ("sin acceso") no tienen email ni CUIT reales
// obligatorios, pero la tabla de usuarios los exige únicos. Se les genera un valor de
// relleno que nunca debe mostrarse ni usarse para mandar mails.
export const PLACEHOLDER_EMAIL_DOMAIN = "@morticia.invalid"; // .invalid: dominio reservado, no existe
export const PLACEHOLDER_ID_PREFIX = "sin-cuit-";

export const isPlaceholderEmail = (v) =>
  typeof v === "string" && v.endsWith(PLACEHOLDER_EMAIL_DOMAIN);

export const isPlaceholderId = (v) => typeof v === "string" && v.startsWith(PLACEHOLDER_ID_PREFIX);

// Mail para mostrar: el de contacto si lo hay; si no, el real; nunca el de relleno.
export const customerEmail = (user) =>
  user?.contactEmail || (isPlaceholderEmail(user?.email) ? null : user?.email || null);

// CUIT/CUIL para mostrar: null si es el de relleno.
export const customerTaxId = (value) => (value && !isPlaceholderId(value) ? value : null);

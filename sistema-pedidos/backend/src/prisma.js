import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Conexión a la base.
// - Local (docker): sin SSL, como siempre.
// - Remota (Supabase): conexión cifrada. Antes se apagaba la verificación TLS de TODO el
//   servidor (NODE_TLS_REJECT_UNAUTHORIZED=0), lo que también afectaba a Resend y a la API de
//   Supabase. Ahora el ajuste aplica solo a la base: va cifrada, y si se carga el certificado
//   de Supabase en DATABASE_CA_CERT, además se verifica.
//   Ojo: si la URL trae sslmode=..., el driver pg la trata como verificación completa y pisa lo
//   que se configure acá; por eso se quitan esos parámetros de la URL.
const SSL_PARAMS = ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"];

const buildPoolConfig = (raw) => {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { connectionString: raw };
  }

  if (["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    return { connectionString: raw };
  }

  const hasSslParams = SSL_PARAMS.some((k) => url.searchParams.has(k));
  if (hasSslParams) SSL_PARAMS.forEach((k) => url.searchParams.delete(k));

  const ca = process.env.DATABASE_CA_CERT;
  return {
    // solo se reescribe la URL si hacía falta quitar parámetros de SSL
    connectionString: hasSslParams ? url.toString() : raw,
    ssl: ca
      ? { ca: ca.replace(/\\n/g, "\n"), rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  };
};

const pool = new Pool(buildPoolConfig(process.env.DATABASE_URL));

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export default prisma;

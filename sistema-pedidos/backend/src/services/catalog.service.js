import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { buildCatalogPdf } from "../utils/catalogPdf.js";

const MAX_DOWNLOAD_BYTES = 6 * 1024 * 1024; // el bucket admite fotos de hasta 5 MB
const MAX_RAW_BYTES_WITHOUT_SHARP = 400 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const CONCURRENCY = 6;

// 'sharp' achica y convierte las fotos (las fotos originales pueden pesar 5 MB y estar en
// WEBP, que el generador de PDF no soporta). Se carga bajo demanda: si no está instalada,
// el catálogo igual se genera, pero solo con fotos JPG/PNG livianas.
let sharpPromise = null;
export const loadSharp = () => {
  sharpPromise ??= import("sharp")
    .then((m) => m.default)
    .catch(() => {
      console.warn("Catálogo: la librería 'sharp' no está instalada; solo se incluirán fotos JPG/PNG livianas");
      return null;
    });
  return sharpPromise;
};

const isJpeg = (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPng = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

export const fetchImage = async (url) => {
  if (!/^https?:\/\//i.test(url || "")) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") || 0) > MAX_DOWNLOAD_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > MAX_DOWNLOAD_BYTES ? null : buf;
  } catch {
    return null; // sin conexión, tiempo agotado, etc.: el producto sale sin foto
  } finally {
    clearTimeout(timer);
  }
};

// Devuelve un JPEG chico (420x280, fondo blanco) o null si no se puede usar la imagen.
export const prepareImage = async (buf, sharp) => {
  if (!buf) return null;
  try {
    if (sharp) {
      return await sharp(buf)
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({ width: 420, height: 280, fit: "contain", background: "#ffffff" })
        .jpeg({ quality: 78 })
        .toBuffer();
    }
    if ((isJpeg(buf) || isPng(buf)) && buf.length <= MAX_RAW_BYTES_WITHOUT_SHARP) return buf;
    return null;
  } catch {
    return null;
  }
};

// Procesa la lista con un máximo de tareas en paralelo.
const mapWithLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
};

export const getCatalogPdf = async ({ includeOutOfStock = false, productIds = null } = {}) => {
  // Si se pasa una lista puntual de productos (catálogo "a medida"), se incluyen esos
  // tal cual fueron elegidos, sin aplicar el filtro de stock: elegirlos a mano ya es una
  // decisión explícita de incluirlos.
  const hasSelection = Array.isArray(productIds) && productIds.length > 0;
  const products = await prisma.product.findMany({
    where: hasSelection
      ? { active: true, id: { in: productIds } }
      : { active: true, ...(includeOutOfStock ? {} : { stock: { gt: 0 } }) },
    // el costo interno (internalPrice) NO se selecciona a propósito: el catálogo es para clientes
    select: {
      id: true,
      name: true,
      unit: true,
      price: true,
      stock: true,
      imageUrl: true,
      category: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (products.length === 0) {
    throw new AppError("No hay productos para incluir en el catálogo", 400);
  }

  const sharp = await loadSharp();
  const withImages = await mapWithLimit(products, CONCURRENCY, async (p) => {
    const raw = p.imageUrl ? await fetchImage(p.imageUrl) : null;
    return { ...p, imageBuffer: await prepareImage(raw, sharp) };
  });

  return buildCatalogPdf({ products: withImages, generatedAt: new Date() });
};

import prisma from "../prisma.js";

// Aviso de stock bajo: cada producto puede tener su propio mínimo (Product.minStock);
// si no lo tiene, se usa el mínimo general, configurable desde Configuración.
export const DEFAULT_LOW_STOCK = 5;
const SETTING_KEY = "lowStockThreshold";

export const getLowStockThreshold = async (client = prisma) => {
  const row = await client.setting.findUnique({ where: { key: SETTING_KEY } });
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_LOW_STOCK;
};

export const setLowStockThreshold = async (value) => {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: String(value) },
    create: { key: SETTING_KEY, value: String(value) },
  });
  return getLowStockThreshold();
};

// Mínimo que aplica a un producto
export const effectiveMinStock = (product, threshold) =>
  product.minStock ?? threshold;

// "out" = sin stock · "low" = en o por debajo del mínimo · null = ok
export const stockLevel = (product, threshold) => {
  if (product.stock <= 0) return "out";
  if (product.stock <= effectiveMinStock(product, threshold)) return "low";
  return null;
};

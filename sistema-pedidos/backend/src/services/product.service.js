import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const listActiveProducts = async () => {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
};

export const listAllProductsAdmin = async () => {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const createProduct = async ({ name, unit, price, stock }) => {
  if (!name || !unit) throw new AppError("Datos inválidos", 400);
  if (price == null || Number(price) <= 0) throw new AppError("Precio inválido", 400);
  if (stock == null || Number(stock) < 0) throw new AppError("Stock inválido", 400);

  return prisma.product.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      price: Number(price),
      stock: Number(stock),
      active: true,
    },
  });
};

export const updateProduct = async (id, data) => {
  const productId = Number(id);
  if (Number.isNaN(productId)) throw new AppError("ID inválido", 400);

  const exists = await prisma.product.findUnique({ where: { id: productId } });
  if (!exists) throw new AppError("Producto no encontrado", 404);

  const payload = {};
  if (data.name != null) payload.name = String(data.name).trim();
  if (data.unit != null) payload.unit = String(data.unit).trim();
  if (data.stock != null) {
    const s = Number(data.stock);
    if (Number.isNaN(s) || s < 0) throw new AppError("Stock inválido", 400);
    payload.stock = s;
  }
  if (data.price != null) {
    const p = Number(data.price);
    if (Number.isNaN(p) || p <= 0) throw new AppError("Precio inválido", 400);
    payload.price = p;
  }
  if (data.active != null) payload.active = Boolean(data.active);

  return prisma.product.update({
    where: { id: productId },
    data: payload,
  });
};
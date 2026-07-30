import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const listActiveProducts = async () => {
  return prisma.product.findMany({
    where: { active: true },
    include: {
      category: true,
    },
    orderBy: { name: "asc" },
  });
};

export const listAllProductsAdmin = async () => {
  return prisma.product.findMany({
    include: {
      category: true,
    },
    orderBy: { 
      name: "asc" },
  });
};

export const createProduct = async ({ name, unit, price, stock, categoryId }) => {
  if (!name || !unit) throw new AppError("Datos inválidos", 400);
  if (price == null || Number(price) <= 0) throw new AppError("Precio inválido", 400);
  if (stock == null || Number(stock) < 0) throw new AppError("Stock inválido", 400);

  let finalCategoryId = null;
  if (categoryId != null) {
    const catId = Number(categoryId);
    if (Number.isNaN(catId)) throw new AppError("categoryId inválido", 400);

    const categoryExists = await prisma.category.findUnique({ where: { id: catId } });
    if (!categoryExists) throw new AppError("Categoría no encontrada", 400);

    finalCategoryId = catId;
  }

  return prisma.product.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      price: Number(price),
      stock: Number(stock),
      categoryId: finalCategoryId,
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

  if (data.categoryId !== undefined) {
    if (data.categoryId === null) {
      payload.categoryId = null;
    } else {
      const catId = Number(data.categoryId);
      if (Number.isNaN(catId)) throw new AppError("categoryId inválido", 400);

      const categoryExists = await prisma.category.findUnique({ where: { id: catId } });
      if (!categoryExists) throw new AppError("Categoría no encontrada", 400);

      payload.categoryId = catId;
    }
  }

  return prisma.product.update({
    where: { id: productId },
    data: payload,
    include: {
      category: true,
    }
  });
};

export const deleteProduct = async (id) => {
  const productId = Number(id);
  if (Number.isNaN(productId)) throw new AppError("ID inválido", 400);

  const exists = await prisma.product.findUnique({ where: { id: productId } });
  if (!exists) throw new AppError("Producto no encontrado", 404);

  const hasOrders = await prisma.orderItem.findFirst({
    where: { productId },
  });

  if (hasOrders) {
    throw new AppError(
      "No se puede eliminar: el producto tiene pedidos asociados. Podés desactivarlo en su lugar.",
      409 // Conflict, más semántico que 400 acá
    );
  }

  await prisma.product.delete({ where: { id: productId } });
  return { message: "Producto eliminado correctamente" };
};
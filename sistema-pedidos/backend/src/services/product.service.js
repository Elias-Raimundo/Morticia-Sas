import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { supabase } from "../utils/supabaseClient.js";

export const listActiveProducts = async () => {
  return prisma.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      unit: true,
      price: true,
      active: true,
      createdAt: true,
      stock: true,
      categoryId: true,
      category: true,
      imageUrl: true,
      // internalPrice queda afuera a propósito
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

export const createProduct = async ({ name, unit, price, internalPrice, stock, categoryId }) => {
  if (!name || !unit) throw new AppError("Datos inválidos", 400);
  if (price == null || Number(price) <= 0) throw new AppError("Precio inválido", 400);
  if (stock == null || Number(stock) < 0) throw new AppError("Stock inválido", 400);

  if (internalPrice != null && Number(internalPrice) < 0) {
    throw new AppError("Precio interno inválido", 400);
  }

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
      internalPrice: internalPrice != null ? Number(internalPrice) : null,
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
  if (data.internalPrice !== undefined) {
    if (data.internalPrice === null) {
      payload.internalPrice = null;
    } else {
      const ip = Number(data.internalPrice);
      if (Number.isNaN(ip) || ip < 0) throw new AppError("Precio interno inválido", 400);
      payload.internalPrice = ip;
    }
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
    include: { category: true },
  });
};


export const getCapitalTotal = async () => {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { internalPrice: true, stock: true, price: true, name: true },
  });

  let capitalTotal = 0;
  let saleTotal = 0;

  const detail = products.map((p) => {
    const costSubtotal = (p.internalPrice ?? 0) * p.stock;
    const saleSubtotal = p.price * p.stock;
    capitalTotal += costSubtotal;
    saleTotal += saleSubtotal;

    return {
      name: p.name,
      stock: p.stock,
      internalPrice: p.internalPrice,
      price: p.price,
      costSubtotal,
      saleSubtotal,
    };
  });

  return {
    capitalTotal,
    saleTotal,
    margin: saleTotal - capitalTotal,
    activeProductsCount: products.length,
    detail,
  };
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

export const uploadProductImage = async (id, file) => {
  const productId = Number(id);
  if (Number.isNaN(productId)) throw new AppError("ID inválido", 400);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError("Producto no encontrado", 404);

  const ext = file.originalname.split(".").pop();
  const fileName = `product-${productId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new AppError("Error subiendo la imagen", 500);
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  // Si el producto ya tenía una foto anterior, la borramos para no acumular basura en el storage
  if (product.imageUrl) {
    const oldFileName = product.imageUrl.split("/").pop();
    await supabase.storage.from("product-images").remove([oldFileName]).catch(() => {});
  }

  return prisma.product.update({
    where: { id: productId },
    data: { imageUrl: publicUrlData.publicUrl },
    include: { category: true },
  });
};
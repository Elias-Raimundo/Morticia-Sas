import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";


export const getAllCategories = async() =>{
    return prisma.category.findMany({
        orderBy: {name: "asc"},
    });
};

export const createCategory = async(name) => {
    const cleanName = String(name || "").trim();

    if (!cleanName) {
        throw new AppError("El nombre de la categoria es obligatorio", 400);
    }

    const existing = await prisma.category.findUnique({
        where: {    name: cleanName },
    });

    if (existing)   {
        throw new AppError("La categoria ya existe", 400);
    }

    return prisma.category.create({
        data:   {
            name: cleanName,
        },
    });
};

export const updateCategory = async (id, name) => {
    const categoryId = Number(id);
    if (Number.isNaN(categoryId)){
        throw new AppError("ID invalido", 400);
    }

    const cleanName = String(name || "").trim();

    if (!cleanName){
        throw new AppError("El nombre de la categoria es obligatoria", 400);
    }

    const exists = await prisma.category.findUnique({
        where: { id: categoryId},
    });

    if (!exists){
        throw new AppError("Categoria no encontrada", 404);
    }

    const duplicated = await prisma.category.findFirst({
        where: {
            name: cleanName,
            NOT: { id: categoryId },
        },
    });

    if (duplicated) {
    throw new AppError("Ya existe una categoría con ese nombre", 400);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { name: cleanName },
  });
};

export const deleteCategory = async (id) => {
  const categoryId = Number(id);
  if (Number.isNaN(categoryId)) {
    throw new AppError("ID inválido", 400);
  }

  const exists = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!exists) {
    throw new AppError("Categoría no encontrada", 404);
  }

  const productsCount = await prisma.product.count({
    where: { categoryId },
  });

  if (productsCount > 0) {
    throw new AppError(
      "No se puede eliminar una categoría que tiene productos asociados",
      400
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });

  return { message: "Categoría eliminada" };
};

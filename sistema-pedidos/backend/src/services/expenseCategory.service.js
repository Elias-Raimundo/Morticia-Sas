import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const getAllExpenseCategories = async () => {
  return prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
};

export const createExpenseCategory = async (name) => {
  const cleanName = String(name || "").trim();
  if (!cleanName) throw new AppError("El nombre de la categoría es obligatorio", 400);

  const existing = await prisma.expenseCategory.findUnique({ where: { name: cleanName } });
  if (existing) throw new AppError("La categoría ya existe", 400);

  return prisma.expenseCategory.create({ data: { name: cleanName } });
};

export const updateExpenseCategory = async (id, name) => {
  const categoryId = Number(id);
  if (Number.isNaN(categoryId)) throw new AppError("ID inválido", 400);

  const cleanName = String(name || "").trim();
  if (!cleanName) throw new AppError("El nombre de la categoría es obligatorio", 400);

  const exists = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!exists) throw new AppError("Categoría no encontrada", 404);

  const duplicated = await prisma.expenseCategory.findFirst({
    where: { name: cleanName, NOT: { id: categoryId } },
  });
  if (duplicated) throw new AppError("Ya existe una categoría con ese nombre", 400);

  return prisma.expenseCategory.update({ where: { id: categoryId }, data: { name: cleanName } });
};

export const deleteExpenseCategory = async (id) => {
  const categoryId = Number(id);
  if (Number.isNaN(categoryId)) throw new AppError("ID inválido", 400);

  const exists = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!exists) throw new AppError("Categoría no encontrada", 404);

  await prisma.expenseCategory.delete({ where: { id: categoryId } });
  return { message: "Categoría eliminada" };
};

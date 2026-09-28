import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

// Lista de administradores activos con su preferencia de mail de pedidos.
export const listAdmins = async () => {
  return prisma.user.findMany({
    where: { role: "admin", active: true },
    select: { id: true, name: true, lastName: true, email: true, receiveOrderEmails: true },
    orderBy: { name: "asc" },
  });
};

// Activa o desactiva el mail con el PDF de cada pedido nuevo para un admin.
export const setOrderEmails = async (id, receive) => {
  const userId = Number(id);
  if (Number.isNaN(userId)) throw new AppError("ID inválido", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") throw new AppError("Administrador no encontrado", 404);

  return prisma.user.update({
    where: { id: userId },
    data: { receiveOrderEmails: receive },
    select: { id: true, name: true, lastName: true, email: true, receiveOrderEmails: true },
  });
};

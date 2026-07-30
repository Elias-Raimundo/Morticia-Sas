import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const getMyNotifications = async (userId, read) => {
  const whereClause = { userId };

  if (read !== undefined) {
    whereClause.read = read === "true";
  }

  return prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
};

export const getUnreadNotificationsCount = async (userId) => {
  return prisma.notification.count({
    where: { userId, read: false },
  });
};

export const markAsRead = async (id, userId) => {
  const notificationId = Number(id);
  if (Number.isNaN(notificationId)) throw new AppError("ID inválido", 400);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new AppError("Notificación no encontrada", 404);
  if (notification.userId !== userId) throw new AppError("No autorizado", 403);

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return { message: "Notificación marcada como leída" };
};

export const markAllAsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { message: "Todas las notificaciones fueron marcadas como leídas" };
};

export const deleteNotification = async (id, userId) => {
  const notificationId = Number(id);
  if (Number.isNaN(notificationId)) throw new AppError("ID inválido", 400);

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw new AppError("Notificación no encontrada", 404);
  if (notification.userId !== userId) throw new AppError("No autorizado", 403);

  await prisma.notification.delete({ where: { id: notificationId } });

  return { message: "Notificación eliminada" };
};
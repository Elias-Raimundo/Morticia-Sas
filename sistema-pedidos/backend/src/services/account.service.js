import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { invalidateUserStatus } from "../middleware/auth.middleware.js";

// Elimina una cuenta:
//  - Si no tiene pedidos ni movimientos de saldo, se borra de verdad.
//  - Si ya tiene historial, se ARCHIVA: deja de aparecer y de poder entrar, pero
//    se conservan sus pedidos y saldos (borrarla los rompería). Además se le
//    "libera" el email y el DNI/CUIL para que esa persona pueda volver a registrarse.
export const deleteAccount = async (id, actorId) => {
  const userId = Number(id);
  if (Number.isNaN(userId)) throw new AppError("ID inválido", 400);
  if (userId === Number(actorId)) throw new AppError("No podés eliminar tu propia cuenta", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new AppError("Cuenta no encontrada", 404);

  if (user.role === "admin") {
    const otherAdmins = await prisma.user.count({
      where: { role: "admin", active: true, NOT: { id: userId } },
    });
    if (otherAdmins === 0) {
      throw new AppError("No se puede eliminar la última cuenta de administrador", 400);
    }
  }

  const [orders, movements] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.balanceMovement.count({ where: { userId } }),
  ]);

  if (orders === 0 && movements === 0) {
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } }); // sus bienes quedan sin cliente (SetNull)
    });
    invalidateUserStatus(userId);
    return { result: "deleted", message: "Cuenta eliminada" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      active: false,
      receiveOrderEmails: false,
      email: `archivada-${userId}-${user.email}`,
      dniCuil: `archivada-${userId}-${user.dniCuil}`,
    },
  });
  invalidateUserStatus(userId);
  return {
    result: "archived",
    message: "La cuenta tenía historial: se archivó (ya no puede entrar) y se conservaron sus pedidos y saldos",
  };
};

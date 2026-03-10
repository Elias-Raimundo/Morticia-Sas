import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const getMyBalance = async (userId, dateFrom, dateTo) => {
  const where = { userId };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
  }

  const movements = await prisma.balanceMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const balance = movements.reduce((acc, m) => acc + Number(m.amount), 0);

  return {
    balance,
    movements,
  };
};

export const getUserBalanceAdmin = async (userId, dateFrom, dateTo) => {
  const uid = Number(userId);
  if (Number.isNaN(uid)) throw new AppError("ID inválido", 400);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, name: true, email: true },
  });

  if (!user) throw new AppError("Usuario no encontrado", 404);

  const where = { userId: uid };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
  }

  const movements = await prisma.balanceMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const balance = movements.reduce((acc, m) => acc + Number(m.amount), 0);

  return {
    user,
    balance,
    movements,
  };
};

export const getAllClientsBalances = async () => {
  const users = await prisma.user.findMany({
    where: {
      role: "client",
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      balanceMovements: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return users.map((user) => {
    const balance = user.balanceMovements.reduce(
      (acc, m) => acc + Number(m.amount),
      0
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      balance,
    };
  });
};

export const registerPayment = async (userId, amount, description) => {
    const uid = Number(userId);
    const paymentAmount = Number(amount);

    if (Number.isNaN(uid)) throw new AppError("ID inválido", 400);
    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) throw new AppError("Monto inválido", 400);

    const user = await prisma.user.findUnique({
        where: { id: uid },
    });

    console.log ("USER EN PAYMENT", user);
    console.log ("Role", user?.role);
    
    if (!user) throw new AppError("Usuario no encontrado", 404);    
    if (user.role !== "client") throw new AppError("Solo se pueden registrar pagos para clientes", 400);

    return await prisma.balanceMovement.create({
        data: {
            userId: uid,
            type: "payment",
            description: description || "Pago registrado",
            amount: -paymentAmount,
        },
    });
};

export const getUsertBalanceAdmin = async (userId, dateFrom, dateTo) => {
  const uid = Number(userId);
  if (Number.isNaN(uid)) throw new AppError("ID inválido", 400);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, name: true, email: true },
  });

  if (!user) throw new AppError("Usuario no encontrado", 404);

  const where = { userId: uid };

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(`${dateFrom}T00:00:00`);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59`);
  }

  const movements = await prisma.balanceMovement.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const balance = movements.reduce((acc, m) => acc + Number(m.amount), 0);

  return {
    user,
    balance,
    movements,
  };
}
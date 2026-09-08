import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const isSameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Se ejecuta cada vez que un admin lista los gastos: revisa cuáles vencen
// mañana o vencen hoy sin estar pagados, y les crea una notificación (campana)
// a todos los admins. No depende de ningún proceso en segundo plano.
export const checkReminders = async () => {
  const today = new Date();

  const pending = await prisma.expense.findMany({
    where: { reminderEnabled: true, paid: false, dueDate: { not: null } },
  });
  if (!pending.length) return;

  const admins = await prisma.user.findMany({
    where: { role: "admin", active: true },
  });
  if (!admins.length) return;

  for (const expense of pending) {
    const due = new Date(expense.dueDate);
    const dayBefore = new Date(due);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const isDayBefore = isSameCalendarDay(today, dayBefore);
    const isDueDay = isSameCalendarDay(today, due);
    if (!isDayBefore && !isDueDay) continue;

    // evita duplicar el aviso si ya se generó hoy para este gasto
    const alreadyNotifiedToday = await prisma.notification.findFirst({
      where: {
        expenseId: expense.id,
        createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });
    if (alreadyNotifiedToday) continue;

    const message = isDueDay
      ? `Vence hoy y no está pagado: ${expense.description} ($${expense.amount})`
      : `Vence mañana: ${expense.description} ($${expense.amount})`;

    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, expenseId: expense.id, message })),
    });
  }
};

export const listExpenses = async (filters = {}) => {
  await checkReminders();

  const where = {};
  if (filters.category) where.category = filters.category;
  if (filters.paid !== undefined) where.paid = filters.paid === "true";
  if (filters.from || filters.to) {
    where.expenseDate = {};
    if (filters.from) where.expenseDate.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) where.expenseDate.lte = new Date(`${filters.to}T23:59:59`);
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { dueDate: "asc" },
  });

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  return { expenses, total };
};

export const createExpense = async (data) => {
  return prisma.expense.create({ data });
};

export const updateExpense = async (id, data) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new AppError("Gasto no encontrado", 404);
  return prisma.expense.update({ where: { id: expenseId }, data });
};

export const registerPayment = async (id, paidAt) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new AppError("Gasto no encontrado", 404);
  return prisma.expense.update({
    where: { id: expenseId },
    data: { paid: true, paidAt: paidAt ? new Date(paidAt) : new Date() },
  });
};

export const deleteExpense = async (id) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new AppError("Gasto no encontrado", 404);
  await prisma.expense.delete({ where: { id: expenseId } });
  return { message: "Gasto eliminado" };
};

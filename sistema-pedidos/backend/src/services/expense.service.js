import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { money } from "../utils/format.js";

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
// mañana o vencen hoy sin estar pagados (gastos simples y cuotas de gastos
// en plan de pagos), y les crea una notificación (campana) a todos los
// admins. No depende de ningún proceso en segundo plano.
export const checkReminders = async () => {
  const today = new Date();

  const admins = await prisma.user.findMany({
    where: { role: "admin", active: true },
  });
  if (!admins.length) return;

  const notifyIfDue = async ({ dueDate, alreadyNotifiedWhere, message, notificationData }) => {
    const due = new Date(dueDate);
    const dayBefore = new Date(due);
    dayBefore.setDate(dayBefore.getDate() - 1);

    const isDayBefore = isSameCalendarDay(today, dayBefore);
    const isDueDay = isSameCalendarDay(today, due);
    if (!isDayBefore && !isDueDay) return;

    const alreadyNotifiedToday = await prisma.notification.findFirst({
      where: {
        ...alreadyNotifiedWhere,
        createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });
    if (alreadyNotifiedToday) return;

    await prisma.notification.createMany({
      data: admins.map((a) => ({ userId: a.id, message: message(isDueDay), ...notificationData })),
    });
  };

  // Gastos simples (sin plan de cuotas) con recordatorio activado
  const pending = await prisma.expense.findMany({
    where: { reminderEnabled: true, paid: false, dueDate: { not: null }, isInstallment: false },
  });
  for (const expense of pending) {
    await notifyIfDue({
      dueDate: expense.dueDate,
      alreadyNotifiedWhere: { expenseId: expense.id, installmentId: null },
      message: (isDueDay) =>
        isDueDay
          ? `Vence hoy y no está pagado: ${expense.description} ($${expense.amount})`
          : `Vence mañana: ${expense.description} ($${expense.amount})`,
      notificationData: { expenseId: expense.id },
    });
  }

  // Cuotas de gastos en plan de pagos (préstamos, etc.): cada cuota avisa
  // por su propio vencimiento, siempre que el gasto tenga el recordatorio activado
  const pendingInstallments = await prisma.expenseInstallment.findMany({
    where: { paid: false, expense: { reminderEnabled: true } },
    include: { expense: true },
  });
  for (const installment of pendingInstallments) {
    await notifyIfDue({
      dueDate: installment.dueDate,
      alreadyNotifiedWhere: { installmentId: installment.id },
      message: (isDueDay) =>
        isDueDay
          ? `Vence hoy la cuota ${installment.number} de "${installment.expense.description}" ($${installment.amount})`
          : `Vence mañana la cuota ${installment.number} de "${installment.expense.description}" ($${installment.amount})`,
      notificationData: { expenseId: installment.expenseId, installmentId: installment.id },
    });
  }
};

export const listExpenses = async (filters = {}) => {
  await checkReminders();

  const where = {};
  if (filters.category) where.category = filters.category;
  if (filters.paid !== undefined) where.paid = filters.paid === "true";
  const search = String(filters.search || "").trim();
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }
  if (filters.from || filters.to) {
    where.expenseDate = {};
    if (filters.from) where.expenseDate.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) where.expenseDate.lte = new Date(`${filters.to}T23:59:59`);
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: { installments: { orderBy: { number: "asc" } } },
    orderBy: { dueDate: "asc" },
  });

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  return { expenses, total };
};

// El frontend manda fechas "solo fecha" (ej: "2027-01-28") desde inputs <input type="date">.
// Prisma exige un DateTime ISO-8601 completo (con hora), así que esos strings crudos
// hacen fallar el create/update con "premature end of input. Expected ISO-8601 DateTime.".
// Convertirlos a un objeto Date real antes de mandarlos a Prisma evita ese error.
//
// Además, una fecha "solo día" se guarda al MEDIODÍA UTC (no a medianoche): a medianoche
// UTC, en Argentina (UTC-3) el día se vería corrido al anterior (28/1 se mostraría 27/1).
const toDateOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00.000Z`);
  return new Date(value);
};

// Fecha de hoy según Argentina (no la del servidor, que corre en UTC), al mediodía UTC.
const todayArgentina = () => {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  return new Date(`${ymd}T12:00:00.000Z`);
};

const normalizeExpenseDates = (data) => {
  const normalized = { ...data };
  if ("expenseDate" in normalized) normalized.expenseDate = toDateOrUndefined(normalized.expenseDate);
  if ("dueDate" in normalized) normalized.dueDate = toDateOrUndefined(normalized.dueDate);
  return normalized;
};

export const createExpense = async (data) => {
  const { isInstallment, installments, ...rest } = data;

  if (isInstallment) {
    const installmentsTotal = installments.reduce((acc, i) => acc + i.amount, 0);
    if (Math.abs(installmentsTotal - rest.amount) > 1) {
      throw new AppError("La suma de las cuotas no coincide con el monto total del gasto", 400);
    }

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          ...normalizeExpenseDates(rest),
          expenseDate: toDateOrUndefined(rest.expenseDate) ?? todayArgentina(),
          isInstallment: true,
          dueDate: undefined,
        },
      });

      await tx.expenseInstallment.createMany({
        data: installments.map((i, idx) => ({
          expenseId: expense.id,
          number: idx + 1,
          amount: i.amount,
          dueDate: toDateOrUndefined(i.dueDate),
        })),
      });

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: { installments: { orderBy: { number: "asc" } } },
      });
    });
  }

  return prisma.expense.create({
    data: {
      ...normalizeExpenseDates(rest),
      expenseDate: toDateOrUndefined(rest.expenseDate) ?? todayArgentina(),
    },
  });
};

const round2 = (n) => Math.round(n * 100) / 100;

// Al cambiar el monto total de un gasto en cuotas: las cuotas ya pagadas NO se tocan, y lo
// que falta pagar (monto nuevo - lo ya pagado) se reparte entre las cuotas pendientes en
// proporción a lo que valía cada una (si eran iguales, quedan iguales). La última pendiente
// absorbe los centavos de redondeo, así la suma da exactamente el monto nuevo.
export const redistributeInstallments = (newTotal, installments) => {
  const paid = installments.filter((i) => i.paid);
  const unpaid = installments.filter((i) => !i.paid);

  if (unpaid.length === 0) {
    throw new AppError("Todas las cuotas ya están pagas: no se puede cambiar el monto", 400);
  }

  const paidTotal = round2(paid.reduce((acc, i) => acc + i.amount, 0));
  const remaining = round2(newTotal - paidTotal);
  if (remaining <= 0) {
    throw new AppError(
      `El monto total tiene que ser mayor a lo que ya pagaste (${money(paidTotal)})`,
      400
    );
  }

  const unpaidSum = unpaid.reduce((acc, i) => acc + i.amount, 0);
  let assigned = 0;
  const updates = unpaid.map((i, idx) => {
    const isLast = idx === unpaid.length - 1;
    const amount = isLast ? round2(remaining - assigned) : round2(remaining * (i.amount / unpaidSum));
    assigned = round2(assigned + amount);
    return { id: i.id, amount };
  });

  if (updates.some((u) => u.amount < 0.01)) {
    throw new AppError("El monto es demasiado bajo para repartirlo entre las cuotas pendientes", 400);
  }

  return { updates, paidTotal, remaining };
};

export const updateExpense = async (id, data) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { installments: { orderBy: { number: "asc" } } },
  });
  if (!existing) throw new AppError("Gasto no encontrado", 404);

  if (!existing.isInstallment) {
    return prisma.expense.update({ where: { id: expenseId }, data: normalizeExpenseDates(data) });
  }

  // Gasto en cuotas: el vencimiento vive en cada cuota, no en el gasto, así que se ignora
  // el que venga en el pedido. Si cambia el monto, se recalculan las cuotas pendientes.
  const { dueDate: _ignored, ...rest } = data;
  const amountChanged =
    rest.amount !== undefined && Math.abs(rest.amount - existing.amount) > 0.004;
  if (!amountChanged) delete rest.amount;

  const plan = amountChanged ? redistributeInstallments(rest.amount, existing.installments) : null;

  return prisma.$transaction(
    async (tx) => {
      if (plan) {
        for (const u of plan.updates) {
          await tx.expenseInstallment.update({ where: { id: u.id }, data: { amount: u.amount } });
        }
      }
      return tx.expense.update({
        where: { id: expenseId },
        data: normalizeExpenseDates(rest),
        include: { installments: { orderBy: { number: "asc" } } },
      });
    },
    { timeout: 15000 }
  );
};

export const registerPayment = async (id, paidAt) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new AppError("Gasto no encontrado", 404);
  if (existing.isInstallment) {
    throw new AppError("Este gasto se paga en cuotas: marcá cada cuota por separado", 400);
  }
  return prisma.expense.update({
    where: { id: expenseId },
    data: { paid: true, paidAt: toDateOrUndefined(paidAt) ?? new Date() },
  });
};

// Marca una cuota puntual como pagada. Si era la última cuota pendiente,
// el gasto general también queda marcado como pagado.
export const payInstallment = async (installmentId, paidAt) => {
  const id = Number(installmentId);
  const installment = await prisma.expenseInstallment.findUnique({
    where: { id },
    include: { expense: { include: { installments: true } } },
  });
  if (!installment) throw new AppError("Cuota no encontrada", 404);
  if (installment.paid) throw new AppError("Esa cuota ya está paga", 400);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.expenseInstallment.update({
      where: { id },
      data: { paid: true, paidAt: toDateOrUndefined(paidAt) ?? new Date() },
    });

    const otherInstallmentsUnpaid = installment.expense.installments.some(
      (i) => i.id !== id && !i.paid
    );
    if (!otherInstallmentsUnpaid) {
      await tx.expense.update({
        where: { id: installment.expenseId },
        data: { paid: true, paidAt: updated.paidAt },
      });
    }

    return updated;
  });
};

export const deleteExpense = async (id) => {
  const expenseId = Number(id);
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing) throw new AppError("Gasto no encontrado", 404);
  await prisma.expense.delete({ where: { id: expenseId } }); // las cuotas se borran en cascada
  return { message: "Gasto eliminado" };
};

// Métricas de un año: total por mes y total por categoría.
// Criterio: un gasto simple cuenta en el mes de su fecha; un gasto en cuotas cuenta
// cada cuota en el mes de SU vencimiento (lo que efectivamente hay que pagar ese mes),
// no todo el préstamo junto en el mes en que se cargó. Los meses se toman en UTC,
// igual que las fechas guardadas.
export const getMetrics = async (yearParam) => {
  const year = Number(yearParam) || new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const [simple, installments] = await Promise.all([
    prisma.expense.findMany({
      where: { isInstallment: false, expenseDate: { gte: start, lt: end } },
    }),
    prisma.expenseInstallment.findMany({
      where: { dueDate: { gte: start, lt: end } },
      include: { expense: true },
    }),
  ]);

  const byMonth = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    total: 0,
    paid: 0,
    pending: 0,
  }));
  const categories = new Map();

  const add = (date, category, amount, isPaid) => {
    const m = byMonth[new Date(date).getUTCMonth()];
    m.total += amount;
    if (isPaid) m.paid += amount;
    else m.pending += amount;

    const c = categories.get(category) || { category, total: 0, count: 0 };
    c.total += amount;
    c.count += 1;
    categories.set(category, c);
  };

  for (const e of simple) add(e.expenseDate, e.category, e.amount, e.paid);
  for (const i of installments) add(i.dueDate, i.expense.category, i.amount, i.paid);

  const round = (n) => Math.round(n * 100) / 100;
  byMonth.forEach((m) => {
    m.total = round(m.total);
    m.paid = round(m.paid);
    m.pending = round(m.pending);
  });

  const byCategory = [...categories.values()]
    .map((c) => ({ ...c, total: round(c.total) }))
    .sort((a, b) => b.total - a.total);

  return {
    year,
    totalYear: round(byMonth.reduce((acc, m) => acc + m.total, 0)),
    byMonth,
    byCategory,
  };
};

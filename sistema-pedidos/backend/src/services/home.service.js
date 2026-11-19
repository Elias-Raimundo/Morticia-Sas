import prisma from "../prisma.js";
import { getLowStockThreshold, effectiveMinStock, stockLevel } from "../utils/stock.js";

// Pantalla de inicio del admin: lo importante del día en una sola consulta.
// Usa los mismos criterios que el Resumen: una venta es un pedido confirmado o entregado
// (incluye ventas al público), fechado por confirmedAt (o createdAt en pedidos viejos).

const TZ = "America/Argentina/Buenos_Aires";
const AR_OFFSET = "-03:00"; // Argentina no tiene horario de verano

const todayYmd = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

// Fechas "solo día" (entrega, vencimientos) se guardan a medianoche o mediodía UTC del día
// elegido, así que se comparan contra el día UTC completo.
const utcDayRange = (ymd) => ({
  gte: new Date(`${ymd}T00:00:00.000Z`),
  lte: new Date(`${ymd}T23:59:59.999Z`),
});

const addDaysYmd = (ymd, days) => {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const salesWhere = (from, to) => ({
  status: { in: ["confirmed", "delivered"] },
  OR: [
    { confirmedAt: { gte: from, lt: to } },
    { confirmedAt: null, createdAt: { gte: from, lt: to } },
  ],
});

const sumTotals = (orders) => orders.reduce((acc, o) => acc + Number(o.total || 0), 0);

export const getAdminHome = async () => {
  const ymd = todayYmd();
  const [year, month] = ymd.split("-").map(Number);

  // Límites en hora argentina (instantes reales)
  const todayStart = new Date(`${ymd}T00:00:00${AR_OFFSET}`);
  const tomorrowStart = new Date(`${addDaysYmd(ymd, 1)}T00:00:00${AR_OFFSET}`);
  const monthStart = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00${AR_OFFSET}`);
  const prevMonthStart = new Date(monthStart);
  prevMonthStart.setUTCMonth(prevMonthStart.getUTCMonth() - 1);
  // mismo tramo del mes anterior (del 1 a hoy), para comparar parejo
  const prevMonthSameDay = new Date(tomorrowStart);
  prevMonthSameDay.setUTCMonth(prevMonthSameDay.getUTCMonth() - 1);
  // (ej. 31 de marzo → "31 de febrero" se pasaría a marzo: se corta en el fin de febrero)
  if (prevMonthSameDay > monthStart) prevMonthSameDay.setTime(monthStart.getTime());

  const upcomingLimit = utcDayRange(addDaysYmd(ymd, 7)).lte; // próximos 7 días

  const userName = { select: { id: true, name: true, lastName: true, legalName: true } };

  const [
    pendingCount,
    pendingOrders,
    deliveriesToday,
    monthOrders,
    prevMonthOrders,
    todayOrders,
    products,
    threshold,
    balances,
    expenses,
    expenseInstallments,
    invoiceInstallments,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "confirmed", isCounterSale: false } }),
    prisma.order.findMany({
      where: { status: "confirmed", isCounterSale: false },
      select: { id: true, total: true, deliveryDate: true, confirmedAt: true, createdAt: true, user: userName },
      orderBy: [{ confirmedAt: "asc" }, { createdAt: "asc" }],
      take: 6,
    }),
    prisma.order.findMany({
      where: { status: "confirmed", isCounterSale: false, deliveryDate: utcDayRange(ymd) },
      select: { id: true, total: true, deliveryDate: true, user: userName },
      orderBy: { id: "asc" },
    }),
    prisma.order.findMany({ where: salesWhere(monthStart, tomorrowStart), select: { total: true } }),
    prisma.order.findMany({ where: salesWhere(prevMonthStart, prevMonthSameDay), select: { total: true } }),
    prisma.order.findMany({ where: salesWhere(todayStart, tomorrowStart), select: { total: true } }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, unit: true, stock: true, minStock: true },
    }),
    getLowStockThreshold(),
    prisma.balanceMovement.groupBy({ by: ["userId"], _sum: { amount: true } }),
    prisma.expense.findMany({
      where: { paid: false, isInstallment: false, dueDate: { not: null, lte: upcomingLimit } },
      select: { id: true, description: true, amount: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expenseInstallment.findMany({
      where: { paid: false, dueDate: { lte: upcomingLimit } },
      select: { id: true, number: true, amount: true, dueDate: true, expense: { select: { id: true, description: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoiceInstallment.findMany({
      where: { paid: false, dueDate: { lte: upcomingLimit } },
      select: {
        id: true,
        number: true,
        amount: true,
        dueDate: true,
        invoice: { select: { number: true, provider: { select: { id: true, name: true } } } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const clientName = (u) => (u ? u.legalName || [u.name, u.lastName].filter(Boolean).join(" ") : "—");

  // ---- Stock ----
  const stockAlerts = products
    .map((p) => ({ ...p, level: stockLevel(p, threshold), min: effectiveMinStock(p, threshold) }))
    .filter((p) => p.level)
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));

  // ---- Deudas de clientes (saldo positivo = nos debe) ----
  const owing = balances
    .map((b) => ({ userId: b.userId, balance: Number(b._sum.amount || 0) }))
    .filter((b) => b.balance > 0.5);
  const debtorUsers = owing.length
    ? await prisma.user.findMany({
        where: { id: { in: owing.map((b) => b.userId) }, role: "client", active: true },
        select: { id: true, name: true, lastName: true, legalName: true },
      })
    : [];
  const usersById = new Map(debtorUsers.map((u) => [u.id, u]));
  const debtors = owing
    .filter((b) => usersById.has(b.userId))
    .map((b) => ({ id: b.userId, name: clientName(usersById.get(b.userId)), balance: b.balance }))
    .sort((a, b) => b.balance - a.balance);

  // ---- Vencimientos (vencidos y próximos 7 días) ----
  const todayFloor = utcDayRange(ymd).gte;
  const dues = [
    ...expenses.map((e) => ({
      kind: "gasto",
      id: `e${e.id}`,
      label: e.description,
      amount: e.amount,
      dueDate: e.dueDate,
      href: "/dashboard/admin/gastos",
    })),
    ...expenseInstallments.map((i) => ({
      kind: "gasto",
      id: `ei${i.id}`,
      label: `${i.expense.description} · cuota ${i.number}`,
      amount: i.amount,
      dueDate: i.dueDate,
      href: "/dashboard/admin/gastos",
    })),
    ...invoiceInstallments.map((i) => ({
      kind: "proveedor",
      id: `ii${i.id}`,
      label: `${i.invoice.provider.name}${i.invoice.number ? ` · factura ${i.invoice.number}` : ""} · cuota ${i.number}`,
      amount: i.amount,
      dueDate: i.dueDate,
      href: `/dashboard/admin/proveedores/${i.invoice.provider.id}`,
    })),
  ]
    .map((d) => ({ ...d, overdue: new Date(d.dueDate) < todayFloor }))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return {
    today: ymd,
    sales: {
      monthTotal: sumTotals(monthOrders),
      monthCount: monthOrders.length,
      prevMonthTotal: sumTotals(prevMonthOrders),
      todayTotal: sumTotals(todayOrders),
      todayCount: todayOrders.length,
    },
    pending: {
      count: pendingCount,
      orders: pendingOrders.map((o) => ({
        id: o.id,
        client: clientName(o.user),
        total: Number(o.total),
        deliveryDate: o.deliveryDate,
        confirmedAt: o.confirmedAt ?? o.createdAt,
      })),
    },
    deliveriesToday: deliveriesToday.map((o) => ({ id: o.id, client: clientName(o.user), total: Number(o.total) })),
    stock: {
      threshold,
      outCount: stockAlerts.filter((p) => p.level === "out").length,
      lowCount: stockAlerts.filter((p) => p.level === "low").length,
      items: stockAlerts.slice(0, 8).map(({ id, name, unit, stock, min, level }) => ({ id, name, unit, stock, min, level })),
    },
    debts: {
      total: debtors.reduce((acc, d) => acc + d.balance, 0),
      count: debtors.length,
      top: debtors.slice(0, 5),
    },
    dues: {
      overdueCount: dues.filter((d) => d.overdue).length,
      total: dues.reduce((acc, d) => acc + Number(d.amount || 0), 0),
      items: dues.slice(0, 8),
    },
  };
};

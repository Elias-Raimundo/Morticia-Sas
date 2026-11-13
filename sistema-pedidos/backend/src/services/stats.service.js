import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const getProductsStatsService = async ({ range, from, to }) => {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (range === "week") {
    startDate = new Date();
    startDate.setDate(now.getDate() - 7);
    endDate = now;
  }

  if (range === "month") {
    startDate = new Date();
    startDate.setMonth(now.getMonth() - 1);
    endDate = now;
  }

  if (from && to) {
    startDate = new Date(`${from}T00:00:00`);
    endDate = new Date(`${to}T23:59:59`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError("Rango de fechas inválido", 400);
    }
  }

  if (range && range !== "week" && range !== "month" && !(from && to)) {
    throw new AppError("Parámetro range inválido", 400);
  }

  const orderWhere = {
    status: {
      in: ["confirmed", "delivered"],
    },
    ...(startDate && endDate && {
      confirmedAt: {
        gte: startDate,
        lte: endDate,
      },
    }),
  };

  const orders = await prisma.order.findMany({
    where: orderWhere,
    include: {
      items: { include: { product: true } },
    },
    orderBy: {
      confirmedAt: "asc",
    },
  });

  const items = orders.flatMap((o) => o.items);

  const productsMap = new Map();

  for (const item of items) {
    const current = productsMap.get(item.productId) || {
      productId: item.productId,
      productName: item.product?.name,
      unitsSold: 0,
      totalSold: 0,
    };

    current.unitsSold += item.quantity;
    current.totalSold += Number(item.subtotal);

    productsMap.set(item.productId, current);
  }

  const salesByDayMap = new Map();

  for (const order of orders) {
    // Fallback: órdenes viejas (previas a este cambio) no tienen confirmedAt
    const referenceDate = order.confirmedAt ?? order.createdAt;
    const key = new Date(referenceDate).toISOString().slice(0, 10);

    const current = salesByDayMap.get(key) || {
      date: key,
      total: 0,
      orders: 0,
    };

    current.total += Number(order.total || 0);
    current.orders += 1;

    salesByDayMap.set(key, current);
  }

  const totalAmount = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
  const ordersCount = orders.length;
  const activeClients = new Set(orders.map((o) => o.userId)).size;
  const averageTicket = ordersCount > 0 ? totalAmount / ordersCount : 0;

  // Total por forma de pago. En ventas al público es la forma en que se cobró en el momento;
  // en pedidos de clientes es la que eligió el cliente al hacer el pedido. Lo que no tiene
  // forma de pago (venta a cuenta o pedidos viejos) va en "sinEspecificar".
  const byPaymentMethod = { efectivo: 0, transferencia: 0, qr: 0, otros: 0, sinEspecificar: 0 };
  for (const order of orders) {
    const method = order.isCounterSale ? order.paymentMethod : order.clientPaymentMethod;
    const amount = Number(order.total || 0);
    if (!method) byPaymentMethod.sinEspecificar += amount;
    else if (["efectivo", "transferencia", "qr"].includes(method)) byPaymentMethod[method] += amount;
    else byPaymentMethod.otros += amount;
  }

  return {
    byPaymentMethod,
    products: Array.from(productsMap.values()).sort((a, b) => b.unitsSold - a.unitsSold),
    salesByDay: Array.from(salesByDayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    ordersCount,
    activeClients,
    averageTicket,
  };
};

// ============ Resumen de compras (facturas de proveedores) ============
// Mismo esquema de períodos que el resumen de ventas (week / month / from-to),
// pero sobre las facturas de compra cargadas en Proveedores.
export const getPurchasesStatsService = async ({ range, from, to }) => {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (range === "week") {
    startDate = new Date();
    startDate.setDate(now.getDate() - 7);
    endDate = now;
  }

  if (range === "month") {
    startDate = new Date();
    startDate.setMonth(now.getMonth() - 1);
    endDate = now;
  }

  if (from && to) {
    startDate = new Date(`${from}T00:00:00`);
    endDate = new Date(`${to}T23:59:59`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError("Rango de fechas inválido", 400);
    }
  }

  if (range && range !== "week" && range !== "month" && !(from && to)) {
    throw new AppError("Parámetro range inválido", 400);
  }

  const invoices = await prisma.invoice.findMany({
    where: startDate && endDate ? { date: { gte: startDate, lte: endDate } } : undefined,
    include: {
      provider: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
    orderBy: { date: "asc" },
  });

  const productsMap = new Map();
  for (const inv of invoices) {
    for (const it of inv.items) {
      const current = productsMap.get(it.productId) || {
        productId: it.productId,
        productName: it.product?.name,
        unitsBought: 0,
        totalSpent: 0,
      };
      current.unitsBought += it.quantity;
      current.totalSpent += Number(it.subtotal);
      productsMap.set(it.productId, current);
    }
  }

  const providersMap = new Map();
  for (const inv of invoices) {
    const current = providersMap.get(inv.providerId) || {
      providerId: inv.providerId,
      providerName: inv.provider?.name,
      invoicesCount: 0,
      total: 0,
    };
    current.invoicesCount += 1;
    current.total += Number(inv.total);
    providersMap.set(inv.providerId, current);
  }

  const byDayMap = new Map();
  for (const inv of invoices) {
    const key = new Date(inv.date).toISOString().slice(0, 10);
    const current = byDayMap.get(key) || { date: key, total: 0, invoices: 0 };
    current.total += Number(inv.total);
    current.invoices += 1;
    byDayMap.set(key, current);
  }

  const byPaymentType = { completo: 0, cuotas: 0, fiado: 0 };
  for (const inv of invoices) {
    byPaymentType[inv.paymentType] = (byPaymentType[inv.paymentType] || 0) + Number(inv.total);
  }

  const totalAmount = invoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  const invoicesCount = invoices.length;

  return {
    products: Array.from(productsMap.values())
      .map((p) => ({ ...p, avgUnitCost: p.unitsBought > 0 ? p.totalSpent / p.unitsBought : 0 }))
      .sort((a, b) => b.totalSpent - a.totalSpent),
    providers: Array.from(providersMap.values()).sort((a, b) => b.total - a.total),
    purchasesByDay: Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    byPaymentType,
    totalAmount,
    invoicesCount,
    providersCount: providersMap.size,
    averageInvoice: invoicesCount > 0 ? totalAmount / invoicesCount : 0,
  };
};

import prisma from "../prisma.js";

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
  }

  const orderWhere = {
    status: {
      in: ["confirmed", "delivered"],
    },
    ...(startDate && endDate && {
      createdAt:{
        gte: startDate,
        lte:endDate,
      },
    }),
  };

  const [items, orders] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        order: orderWhere,
      },
      include: {
        product: true,
        order: true,
      },
    }),
    prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        userId: true,
        total: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

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
    const key = new Date(order.createdAt).toISOString().slice(0, 10);

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

  return {
    products: Array.from(productsMap.values()).sort((a, b) => b.unitsSold - a.unitsSold),
    salesByDay: Array.from(salesByDayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    ),
    ordersCount,
    activeClients,
    averageTicket,
  };
};
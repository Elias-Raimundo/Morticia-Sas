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

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        status: {
          in: ["confirmed", "delivered"],
        },
        ...(startDate && endDate && {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
    },
    include: {
      product: true,
    },
  });

  const map = new Map();

  for (const item of items) {
    const current = map.get(item.productId) || {
      productId: item.productId,
      productName: item.product?.name,
      unitsSold: 0,
      totalSold: 0,
    };

    current.unitsSold += item.quantity;
    current.totalSold += Number(item.subtotal);

    map.set(item.productId, current);
  }

  return {
    products: Array.from(map.values()).sort(
      (a, b) => b.unitsSold - a.unitsSold
    ),
  };
};
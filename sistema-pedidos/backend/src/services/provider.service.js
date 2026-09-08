import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

const withDebt = async (provider) => {
  const agg = await prisma.providerMovement.aggregate({
    where: { providerId: provider.id },
    _sum: { amount: true },
  });
  return { ...provider, debt: agg._sum.amount ?? 0 };
};

export const listProviders = async () => {
  const providers = await prisma.provider.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return Promise.all(providers.map(withDebt));
};

// Detalle de un proveedor: facturas (con cuánto queda pendiente cada una),
// movimientos (ledger completo) y deuda total.
export const getProviderById = async (id) => {
  const providerId = Number(id);
  if (Number.isNaN(providerId)) throw new AppError("ID inválido", 400);

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        include: {
          items: { include: { product: true } },
          installments: { orderBy: { number: "asc" } },
        },
      },
      movements: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  const debt = provider.movements.reduce((acc, m) => acc + m.amount, 0);

  const invoices = provider.invoices.map((inv) => {
    const pending = provider.movements
      .filter((m) => m.invoiceId === inv.id)
      .reduce((acc, m) => acc + m.amount, 0);
    return { ...inv, pending };
  });

  return { ...provider, invoices, debt };
};

export const createProvider = async (data) => {
  return prisma.provider.create({ data });
};

export const updateProvider = async (id, data) => {
  const providerId = Number(id);
  const existing = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!existing) throw new AppError("Proveedor no encontrado", 404);
  return prisma.provider.update({ where: { id: providerId }, data });
};

export const deactivateProvider = async (id) => {
  const providerId = Number(id);
  const existing = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!existing) throw new AppError("Proveedor no encontrado", 404);
  return prisma.provider.update({ where: { id: providerId }, data: { active: false } });
};

// Ajuste manual: nota de crédito, descuento, recargo, etc. (no ligado a una factura)
export const addManualMovement = async (id, { description, amount }) => {
  const providerId = Number(id);
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  return prisma.providerMovement.create({
    data: { providerId, type: "adjustment", description, amount },
  });
};

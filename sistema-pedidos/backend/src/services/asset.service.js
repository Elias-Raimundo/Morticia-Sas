import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { toDateOrUndefined, todayArgentina } from "../utils/dates.js";

export const listAssets = async () => {
  const assets = await prisma.asset.findMany({
    where: { active: true },
    orderBy: { acquiredAt: "desc" },
    include: { payments: true, client: { select: { id: true, name: true } } },
  });

  return assets.map((a) => ({
    ...a,
    paidTotal: a.payments.reduce((acc, p) => acc + p.amount, 0),
  }));
};

export const getAssetById = async (id) => {
  const assetId = Number(id);
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { payments: { orderBy: { date: "desc" } } },
  });
  if (!asset) throw new AppError("Bien no encontrado", 404);
  return asset;
};

export const createAsset = async (data) => {
  const { payments, clientId, ...assetData } = data;

  return prisma.asset.create({
    data: {
      ...assetData,
      acquiredAt: toDateOrUndefined(assetData.acquiredAt) ?? todayArgentina(),
      clientId: clientId ?? null,
      payments: payments?.length
        ? {
            create: payments.map((p) => ({
              amount: p.amount,
              method: p.method,
              date: toDateOrUndefined(p.date),
              notes: p.notes,
            })),
          }
        : undefined,
    },
    include: { payments: true, client: { select: { id: true, name: true } } },
  });
};

export const updateAsset = async (id, data) => {
  const assetId = Number(id);
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) throw new AppError("Bien no encontrado", 404);
  const updateData = { ...data };
  if ("acquiredAt" in updateData) updateData.acquiredAt = toDateOrUndefined(updateData.acquiredAt);
  return prisma.asset.update({ where: { id: assetId }, data: updateData });
};

export const deactivateAsset = async (id) => {
  const assetId = Number(id);
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) throw new AppError("Bien no encontrado", 404);
  return prisma.asset.update({ where: { id: assetId }, data: { active: false } });
};

export const addPayment = async (id, { amount, method, date, notes }) => {
  const assetId = Number(id);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError("Bien no encontrado", 404);

  return prisma.assetPayment.create({
    data: { assetId, amount, method, date: toDateOrUndefined(date), notes },
  });
};

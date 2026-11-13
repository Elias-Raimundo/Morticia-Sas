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

// Campos del bien que se registran en el historial al editar
const TRACKED_FIELDS = [
  "name",
  "description",
  "location",
  "category",
  "clientId",
  "totalCost",
  "installmentsCount",
  "acquiredAt",
];

// Normaliza un valor para compararlo y mostrarlo: las fechas se comparan por día
const normalize = (field, value) => {
  if (value === undefined || value === null || value === "") return null;
  if (field === "acquiredAt") return new Date(value).toISOString().slice(0, 10);
  return value;
};

export const updateAsset = async (id, data) => {
  const assetId = Number(id);
  const existing = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!existing) throw new AppError("Bien no encontrado", 404);
  const updateData = { ...data };
  if ("acquiredAt" in updateData) updateData.acquiredAt = toDateOrUndefined(updateData.acquiredAt);

  // Qué campos cambiaron realmente (antes -> después)
  const changes = {};
  for (const field of TRACKED_FIELDS) {
    if (!(field in updateData)) continue;
    const from = normalize(field, existing[field]);
    const to = normalize(field, updateData[field]);
    if (from !== to) changes[field] = { from, to };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({ where: { id: assetId }, data: updateData });

    if (Object.keys(changes).length > 0) {
      await tx.assetHistory.create({
        data: { assetId, assetName: updated.name, action: "edit", changes },
      });
    }

    return updated;
  });
};

// "Eliminar" es una baja lógica (active = false): el bien deja de verse en el listado,
// pero queda registrado en el historial con una foto de cómo estaba.
export const deactivateAsset = async (id) => {
  const assetId = Number(id);
  const existing = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { payments: true },
  });
  if (!existing) throw new AppError("Bien no encontrado", 404);
  if (!existing.active) throw new AppError("El bien ya está eliminado", 400);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({ where: { id: assetId }, data: { active: false } });

    await tx.assetHistory.create({
      data: {
        assetId,
        assetName: existing.name,
        action: "delete",
        changes: {
          name: existing.name,
          description: existing.description,
          location: existing.location,
          category: existing.category,
          clientId: existing.clientId,
          totalCost: existing.totalCost,
          installmentsCount: existing.installmentsCount,
          acquiredAt: normalize("acquiredAt", existing.acquiredAt),
          paidTotal: existing.payments.reduce((acc, p) => acc + p.amount, 0),
        },
      },
    });

    return updated;
  });
};

// Historial de cambios de bienes (más nuevo primero). Con assetId filtra por un bien.
export const listAssetHistory = async ({ assetId, limit } = {}) => {
  const take = Math.min(Math.max(Number(limit) || 200, 1), 500);
  return prisma.assetHistory.findMany({
    where: assetId ? { assetId: Number(assetId) } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
};

export const addPayment = async (id, { amount, method, date, notes }) => {
  const assetId = Number(id);
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AppError("Bien no encontrado", 404);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.assetPayment.create({
      data: { assetId, amount, method, date: toDateOrUndefined(date), notes },
    });

    await tx.assetHistory.create({
      data: {
        assetId,
        assetName: asset.name,
        action: "payment",
        changes: {
          amount: payment.amount,
          method: payment.method,
          date: payment.date.toISOString(),
          notes: payment.notes,
        },
      },
    });

    return payment;
  });
};

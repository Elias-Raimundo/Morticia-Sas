import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

export const listInvoicesByProvider = async (providerId) => {
  return prisma.invoice.findMany({
    where: { providerId: Number(providerId) },
    orderBy: { date: "desc" },
    include: { items: { include: { product: true } }, installments: true },
  });
};

export const getInvoiceById = async (id) => {
  const invoiceId = Number(id);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      provider: true,
      items: { include: { product: true } },
      installments: { orderBy: { number: "asc" } },
      movements: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) throw new AppError("Factura no encontrada", 404);
  return invoice;
};

// Crea la factura, actualiza stock + precio costo de cada producto, y arma
// el movimiento de deuda correspondiente según la forma de pago.
export const createInvoice = async (data) => {
  const { providerId, number, date, notes, paymentType, items, installments } = data;

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) throw new AppError("Proveedor no encontrado", 404);

  if (!items?.length) throw new AppError("La factura necesita al menos un producto", 400);

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  if (products.length !== new Set(items.map((i) => i.productId)).size) {
    throw new AppError("Algún producto de la factura no existe", 400);
  }

  const total = items.reduce((acc, it) => acc + it.quantity * it.unitCost, 0);

  if (paymentType === "cuotas") {
    if (!installments?.length) {
      throw new AppError("Definí al menos una cuota para pagar en cuotas", 400);
    }
    const installmentsTotal = installments.reduce((acc, i) => acc + i.amount, 0);
    if (Math.abs(installmentsTotal - total) > 1) {
      throw new AppError(
        "La suma de las cuotas no coincide con el total de la factura",
        400
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        providerId,
        number,
        date: date ? new Date(date) : undefined,
        notes,
        paymentType,
        total,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitCost: it.unitCost,
            subtotal: it.quantity * it.unitCost,
          })),
        },
      },
    });

    // sube stock, actualiza precio costo, y precio de venta si se definió uno
    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: {
          stock: { increment: it.quantity },
          internalPrice: it.unitCost,
          ...(it.salePrice ? { price: it.salePrice } : {}),
        },
      });
    }

    // la factura siempre suma deuda al proveedor
    await tx.providerMovement.create({
      data: {
        providerId,
        invoiceId: invoice.id,
        type: "invoice",
        description: `Factura ${number ? "N° " + number : "#" + invoice.id}`,
        amount: total,
      },
    });

    if (paymentType === "completo") {
      await tx.providerMovement.create({
        data: {
          providerId,
          invoiceId: invoice.id,
          type: "payment",
          description: "Pago completo al recibir la factura",
          amount: -total,
        },
      });
    }

    if (paymentType === "cuotas") {
      await tx.invoiceInstallment.createMany({
        data: installments.map((i, idx) => ({
          invoiceId: invoice.id,
          number: idx + 1,
          amount: i.amount,
          dueDate: new Date(i.dueDate),
        })),
      });
    }
    // si es "fiado" no se crea ningún pago: queda debiendo el total hasta que
    // se registren pagos sueltos con registerInvoicePayment.

    return tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: { include: { product: true } }, installments: true },
    });
  });
};

export const payInstallment = async (installmentId, { method } = {}) => {
  const id = Number(installmentId);
  const installment = await prisma.invoiceInstallment.findUnique({
    where: { id },
    include: { invoice: true },
  });
  if (!installment) throw new AppError("Cuota no encontrada", 404);
  if (installment.paid) throw new AppError("Esa cuota ya está paga", 400);

  return prisma.$transaction(async (tx) => {
    await tx.invoiceInstallment.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    });

    return tx.providerMovement.create({
      data: {
        providerId: installment.invoice.providerId,
        invoiceId: installment.invoiceId,
        type: "payment",
        description: `Pago cuota ${installment.number} de factura ${
          installment.invoice.number ? "N° " + installment.invoice.number : "#" + installment.invoiceId
        }`,
        amount: -installment.amount,
        method: method || undefined,
      },
    });
  });
};

// Pago libre contra una factura (fiado, o pago parcial/adicional de cualquiera)
export const registerInvoicePayment = async (invoiceId, { amount, description, method }) => {
  const id = Number(invoiceId);
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new AppError("Factura no encontrada", 404);
  if (!amount || amount <= 0) throw new AppError("El monto debe ser mayor a 0", 400);

  return prisma.providerMovement.create({
    data: {
      providerId: invoice.providerId,
      invoiceId: id,
      type: "payment",
      description: description || "Pago registrado",
      amount: -amount,
      method: method || undefined,
    },
  });
};

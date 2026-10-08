import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { buildPresupuestoPdf, quoteNumber } from "../utils/presupuestoPdf.js";
import { customerTaxId } from "../utils/customer.js";

const clean = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
};

// Presupuesto: a diferencia de la venta al público, NUNCA toca stock ni genera un
// movimiento de saldo, y si el cliente es nuevo NO se crea ningún User (para no
// ensuciar el listado de clientes con gente que solo pidió un presupuesto). Si se
// elige un cliente existente, solo se lee (para copiar sus datos y descuento), nunca
// se modifica.
export const createQuote = async ({ customer, items, discountPercent, comments }) => {
  // si el mismo producto viene en dos líneas, se suman
  const qtyByProduct = new Map();
  for (const it of items) {
    qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);
  }

  let customerSnapshot;
  if (customer.id) {
    const user = await prisma.user.findUnique({ where: { id: customer.id } });
    if (!user || user.role !== "client" || !user.active) {
      throw new AppError("Cliente no encontrado", 404);
    }
    customerSnapshot = {
      customerId: user.id,
      customerName: user.name,
      legalName: user.legalName,
      address: user.address,
      contactEmail: user.contactEmail,
      standingDiscount: user.discount || 0,
      // El CUIT real (si no es de relleno) sí se copia; el de relleno nunca se muestra
      taxId: customerTaxId(user.dniCuil),
    };
  } else {
    const name = clean(customer.name);
    if (!name) throw new AppError("El nombre del local es obligatorio", 400);
    customerSnapshot = {
      customerId: null,
      customerName: name,
      legalName: clean(customer.legalName),
      taxId: clean(customer.cuit),
      address: clean(customer.address),
      contactEmail: clean(customer.email),
      standingDiscount: 0,
    };
  }

  // Productos: se copian nombre/unidad/precio actuales como "foto" del presupuesto,
  // sin tocar Product.stock en ningún momento.
  const productIds = [...qtyByProduct.keys()];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw new AppError("Algún producto del presupuesto no existe", 400);
  }

  const lines = [];
  for (const productId of productIds) {
    const p = products.find((x) => x.id === productId);
    const qty = qtyByProduct.get(productId);
    lines.push({
      productId: p.id,
      name: p.name,
      unit: p.unit,
      quantity: qty,
      unitPrice: p.price,
      subtotal: p.price * qty,
    });
  }

  const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
  const effectiveDiscount =
    discountPercent === null || discountPercent === undefined
      ? customerSnapshot.standingDiscount
      : discountPercent;
  const total = Math.round((subtotal - subtotal * (effectiveDiscount / 100)) * 100) / 100;

  const quote = await prisma.quote.create({
    data: {
      customerId: customerSnapshot.customerId,
      customerName: customerSnapshot.customerName,
      legalName: customerSnapshot.legalName,
      taxId: customerSnapshot.taxId,
      address: customerSnapshot.address,
      contactEmail: customerSnapshot.contactEmail,
      discountPercent: effectiveDiscount,
      comments: clean(comments),
      total,
      items: { create: lines },
    },
  });

  return {
    quote: {
      id: quote.id,
      number: quoteNumber(quote.id),
      total,
      customer: { name: quote.customerName },
    },
  };
};

export const listQuotes = async (limit = 50) => {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: { select: { id: true } } },
  });

  return quotes.map((q) => ({
    id: q.id,
    number: quoteNumber(q.id),
    createdAt: q.createdAt,
    total: Number(q.total),
    discountPercent: q.discountPercent,
    customer: { name: q.customerName, legalName: q.legalName },
    itemsCount: q.items.length,
  }));
};

export const getQuotePdf = async (quoteId) => {
  const id = Number(quoteId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!quote) throw new AppError("Presupuesto no encontrado", 404);

  return buildPresupuestoPdf(quote);
};

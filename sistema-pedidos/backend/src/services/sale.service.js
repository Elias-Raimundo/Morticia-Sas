import crypto from "node:crypto";
import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword } from "../utils/hash.js";
import { buildRemitoPdf, remitoNumber } from "../utils/remitoPdf.js";
import { PLACEHOLDER_EMAIL_DOMAIN, PLACEHOLDER_ID_PREFIX } from "../utils/customer.js";

const clean = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
};

// Venta al público (mostrador): se registra como un pedido ya entregado, con el mismo
// circuito que los pedidos comunes (precio congelado por línea, descuento del cliente,
// baja de stock atómica y movimiento de saldo). Si se cobró en el momento, se registra
// además el pago; si no, queda a cuenta del cliente.
export const createSale = async ({ customer, items, paymentMethod, comments, discountPercent }) => {
  // si el mismo producto viene en dos líneas, se suman
  const qtyByProduct = new Map();
  for (const it of items) {
    qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);
  }

  // Cliente nuevo: "sin acceso" (no puede iniciar sesión). El email y el CUIT son únicos
  // en la tabla de usuarios, así que si no se cargan se genera un valor de relleno, y la
  // contraseña es aleatoria y desconocida. El hash se calcula antes de abrir la
  // transacción porque bcrypt es lento.
  let newCustomer = null;
  if (!customer.id) {
    const name = clean(customer.name);
    if (!name) throw new AppError("El nombre del local es obligatorio", 400);
    const secret = crypto.randomUUID();
    newCustomer = {
      name,
      legalName: clean(customer.legalName),
      contactEmail: clean(customer.email),
      address: clean(customer.address) ?? "",
      taxId: clean(customer.cuit),
      secret,
      passwordHash: await hashPassword(`${secret}${crypto.randomUUID()}`),
    };
  }

  return prisma.$transaction(
    async (tx) => {
      // 1) Cliente
      let user = null;
      let customerReused = false;

      if (customer.id) {
        user = await tx.user.findUnique({ where: { id: customer.id } });
        if (!user || user.role !== "client" || !user.active) {
          throw new AppError("Cliente no encontrado", 404);
        }
      } else {
        if (newCustomer.taxId) {
          const existing = await tx.user.findFirst({ where: { dniCuil: newCustomer.taxId } });
          if (existing) {
            if (existing.role !== "client" || !existing.active) {
              throw new AppError("Ese CUIT/CUIL pertenece a una cuenta que no es de un cliente", 400);
            }
            user = existing; // ya existe un cliente con ese CUIT/CUIL: se le carga la venta a él
            customerReused = true;
          }
        }
        if (!user) {
          user = await tx.user.create({
            data: {
              name: newCustomer.name,
              lastName: "",
              email: `sin-acceso-${newCustomer.secret}${PLACEHOLDER_EMAIL_DOMAIN}`,
              password: newCustomer.passwordHash,
              role: "client",
              dniCuil: newCustomer.taxId ?? `${PLACEHOLDER_ID_PREFIX}${newCustomer.secret}`,
              address: newCustomer.address,
              phone: "",
              hasAccess: false,
              receiveOrderEmails: false,
              legalName: newCustomer.legalName,
              contactEmail: newCustomer.contactEmail,
            },
          });
        }
      }

      // 2) Productos
      const productIds = [...qtyByProduct.keys()];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        throw new AppError("Algún producto de la venta no existe", 400);
      }
      for (const p of products) {
        if (!p.active) throw new AppError(`El producto "${p.name}" no está disponible`, 400);
      }

      // 3) Stock (condición atómica: nunca queda negativo) y líneas con el precio actual
      const lines = [];
      for (const productId of productIds) {
        const p = products.find((x) => x.id === productId);
        const qty = qtyByProduct.get(productId);
        const updated = await tx.product.updateMany({
          where: { id: productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (updated.count === 0) {
          throw new AppError(`Stock insuficiente para ${p.name}. Disponible: ${p.stock}`, 400);
        }
        lines.push({ productId, quantity: qty, unitPrice: p.price, subtotal: p.price * qty });
      }

      // 4) Total, con el descuento del cliente (si tiene) salvo que se mande un
      // descuento manual puntual para esta venta (ej: "te doy X% por comprarme tanto"),
      // que lo reemplaza sin tocar el descuento habitual guardado en la cuenta.
      const subtotal = lines.reduce((acc, l) => acc + l.subtotal, 0);
      const effectiveDiscount =
        discountPercent === null || discountPercent === undefined ? user.discount || 0 : discountPercent;
      const total = Math.round((subtotal - subtotal * (effectiveDiscount / 100)) * 100) / 100;

      // 5) Venta
      const method = clean(paymentMethod);
      const order = await tx.order.create({
        data: {
          userId: user.id,
          status: "delivered",
          isCounterSale: true,
          paymentMethod: method,
          comments: clean(comments),
          total,
          confirmedAt: new Date(),
          items: { create: lines },
        },
      });

      // 6) Saldo: la venta suma deuda; si se cobró en el momento, se registra el pago
      await tx.balanceMovement.create({
        data: {
          userId: user.id,
          type: "order",
          description: `Venta al público #${order.id} (remito ${remitoNumber(order.id)})`,
          amount: total,
        },
      });
      if (method && total > 0) {
        await tx.balanceMovement.create({
          data: {
            userId: user.id,
            type: "payment",
            description: `Cobro en el momento (${method}) - venta #${order.id}`,
            amount: -total,
          },
        });
      }

      return {
        order: {
          id: order.id,
          remito: remitoNumber(order.id),
          total,
          paymentMethod: method,
          customer: { id: user.id, name: user.name },
        },
        customerReused,
      };
    },
    { timeout: 15000 }
  );
};

export const listSales = async (limit = 50) => {
  const orders = await prisma.order.findMany({
    where: { isCounterSale: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, legalName: true } },
      items: { select: { id: true } },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    remito: remitoNumber(o.id),
    createdAt: o.createdAt,
    status: o.status,
    total: Number(o.total),
    paymentMethod: o.paymentMethod,
    customer: { id: o.user.id, name: o.user.name, legalName: o.user.legalName },
    itemsCount: o.items.length,
  }));
};

export const getRemitoPdf = async (saleId) => {
  const id = Number(saleId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findFirst({
    where: { id, isCounterSale: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          legalName: true,
          dniCuil: true,
          address: true,
          phone: true,
          email: true,
          contactEmail: true,
        },
      },
      items: { include: { product: true } },
    },
  });
  if (!order) throw new AppError("Venta no encontrada", 404);

  return buildRemitoPdf(order);
};

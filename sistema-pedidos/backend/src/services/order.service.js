import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { buildOrderPdf } from "../utils/orderPdf.js";
import { sendOrderEmail } from "../utils/mailer.js";
import { isPlaceholderEmail, customerTaxId } from "../utils/customer.js";
import { logStockMovement } from "../utils/history.js";
import { PAYMENT_METHOD_IDS, getEditWindowMinutes, getEditableUntil, formatWindow } from "../utils/payment.js";

// Los clientes de venta al público tienen email y CUIT de relleno: no se exponen.
const maskCustomer = (user) =>
  user && {
    ...user,
    email: isPlaceholderEmail(user.email) ? null : user.email,
    ...("dniCuil" in user ? { dniCuil: customerTaxId(user.dniCuil) } : {}),
  };

export const createDraftOrder = async (userId) => {
  return await prisma.order.create({
    data: {
      userId,
      status: "draft",
    },
  });
};


export const getMyOrders = async (userId) => {
  const orders = await prisma.order.findMany({
    where: { 
      userId,
      status: { not: "draft" },   
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id:true,
              name:true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc"
    },
  });

  return orders.map((o) => ({ ...o, editableUntil: getEditableUntil(o) }));
};

export const updateDraftOrder = async (orderId, userId, body) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);


  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("Solo se puede modificar orden draft", 400);

    const data = {};

    if ("comments" in body) data.comments = String(body.comments ?? "");
    if ("deliveryDate" in body) {
      if (!body.deliveryDate){
        data.deliveryDate = null;
      }else{
        const d = new Date(body.deliveryDate);
        if (Number.isNaN(d.getTime())) throw new AppError("Fecha de entrega inválida", 400);
        data.deliveryDate = d;
      }
    }


    if ("clientPaymentMethod" in body) {
      const m = body.clientPaymentMethod;
      if (m === null || m === "") {
        data.clientPaymentMethod = null;
      } else if (PAYMENT_METHOD_IDS.includes(m)) {
        data.clientPaymentMethod = m;
      } else {
        throw new AppError("Forma de pago inválida", 400);
      }
    }

    const updated = await tx.order.update({
      where: { id},
      data,
      include: { items: { include: { product: true } } },
    });

    return updated;
  });
};


export const addItemToOrder = async (orderId, userId, productId, quantity) => {
  const qty = Number(quantity);
  if (!qty || qty <= 0) throw new AppError("Cantidad inválida", 400);

  return await prisma.$transaction(async (tx) => {

    const order = await tx.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("La orden no está en draft", 400);

    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active)
        throw new AppError("Producto no disponible", 400);

    const existingItem = await tx.orderItem.findFirst({
      where: {
        orderId: Number(orderId),
        productId,
      },
    });

    const requestedQuantity = existingItem ? existingItem.quantity + qty : qty;

    // 🔑 Chequeo atómico de stock
    const stockCheck = await tx.product.findUnique({
      where: { id: productId, stock: { gte: requestedQuantity } },
    });

    if (!stockCheck) {
      throw new AppError(`Stock insuficiente. Disponible: ${product.stock}`, 400);
    }

    if (existingItem) {
      const newSubtotal = requestedQuantity * product.price;

      await tx.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: requestedQuantity,
          unitPrice: product.price,
          subtotal: newSubtotal,
        },
      });
    } else {
      await tx.orderItem.create({
        data: {
          orderId: Number(orderId),
          productId,
          quantity: qty,
          unitPrice: product.price,
          subtotal: product.price * qty,
        },
      });
    }

    const items = await tx.orderItem.findMany({
      where: { orderId: Number(orderId) },
    });

    const newTotal = items.reduce((acc, item) => acc + item.subtotal, 0);

    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    const discountAmount = newTotal * (user.discount / 100);
    const finalTotal = newTotal - discountAmount;

    await tx.order.update({
      where: { id: Number(orderId) },
      data: { total: finalTotal },
    });
  });
};

export const getAllOrders = async (status) => {
  const whereClause = {
    status: {
      not: "draft",
    },
  };

  if (status) {
    whereClause.status = status;
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((o) => ({ ...o, user: maskCustomer(o.user) }));
};

export const getOrCreateMyDraft = async (userId) => {
  return await prisma.$transaction(async (tx) => {

    // 1️⃣ Buscar draft existente
    let draft = await tx.order.findFirst({
      where: {
        userId,
        status: "draft",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2️⃣ Si no existe, crear uno
    if (!draft) {
      draft = await tx.order.create({
        data: {
          userId,
          status: "draft",
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return draft;
  });
};

export const sendOrder = async (orderId, userId) => {
  // 1) Transacción: cambiar estado + notificaciones
  const result = await prisma.$transaction(async (tx) => {
    const id = Number(orderId);
    if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

    const order = await tx.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("La orden no está en draft", 400);
    if (!order.items || order.items.length === 0) throw new AppError("La orden esta vacia", 400);
    if (!order.deliveryDate) throw new AppError("La orden debe tener fecha de entrega", 400);

    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const delivery = order.deliveryDate instanceof Date
    ? order.deliveryDate
    : new Date(order.deliveryDate);

    delivery.setHours(0, 0, 0, 0);

    if (delivery <= startToday) throw new AppError("La fecha de entrega debe ser posterior a hoy", 400);

    for (const item of order.items) {
      if (!item.product || !item.product.active) {
        throw new AppError(`El producto ${item.productId} no está disponible`, 400);
      }
      if (item.quantity > item.product.stock) {
        throw new AppError(`Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`, 400);
      }
    }
    
    for (const item of order.items) {
      const stockUpdate = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } }, // 🔑 condición atómica
        data: { stock: { decrement: item.quantity } },
      });

      if (stockUpdate.count === 0) {
        throw new AppError(`Stock insuficiente para ${item.product.name}`, 400);
      }

      await logStockMovement(tx, {
        productId: item.productId,
        delta: -item.quantity,
        reason: `Pedido #${id}`,
        userId,
      });
    }


    // ✅ Guardamos updated con include (así el PDF tiene todo bien)
    const updated = await tx.order.update({
      where: { id },
      data: { status: "confirmed",
              confirmedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true , phone: true, dniCuil: true, address: true} },
        items: { include: { product: true } },
      },
    });

     

    const admins = await tx.user.findMany({
      where: { role: "admin", active: true },
      select: { id: true, email: true, name: true, receiveOrderEmails: true },
    });

    for (const admin of admins) {
      await tx.notification.create({
        data: {
          userId: admin.id,
          message: `Nueva orden enviada #${updated.id}`,
          orderId: updated.id,
        },
      });
    }

    await tx.balanceMovement.create({
      data: {
        userId: order.userId,
        type:"order",
        description: `Pedido #${order.id} confirmado`,
        amount: Number(order.total),
      },
    });

    return { order: updated, admins };
  }, { timeout: 15000 });

  const orderToEmail = result.order;
  const adminsToEmail = result.admins;

  // 2) PDF + Email (afuera de la TX)
  void(async () => {
    try {
      const pdfBuffer = await buildOrderPdf(orderToEmail);

      // las notificaciones (campanita) le llegan a todos los admins; el mail con el
      // PDF solo a los que no lo desactivaron
      const adminEmails = adminsToEmail
        .filter((a) => a.receiveOrderEmails)
        .map((a) => a.email)
        .filter(Boolean);

      if (adminEmails.length > 0) {
        await sendOrderEmail({
          to: adminEmails.join(","),
          subject: `📦 Pedido #${orderToEmail.id} - ${orderToEmail.user?.name ?? "Cliente"}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
            <h2>Nuevo pedido recibido</h2>
            <p><b>Pedido:</b> #${orderToEmail.id}</p>
            <p><b>Cliente:</b> ${orderToEmail.user?.name ?? "-"}</p>
            <p><b>Email:</b> ${orderToEmail.user?.email ?? "-"}</p>
            <p>Adjunto va el PDF con el detalle del pedido.</p>
          </div>
        `,
        replyTo: orderToEmail.user?.email,
        pdfBuffer,
        filename: `pedido-${orderToEmail.id}.pdf`,
      });
    }
  } catch (e) {
    // producción: NO rompas el flujo si falla el mail, solo logueá
    
    console.error("No se pudo enviar email/PDF:", e);
    console.error("Drbug result.order:", orderToEmail);
    console.error("Drbug admins:", adminsToEmail);
  }
})();
  return result.order;
}



export const cancelOrder = async (orderId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const id = Number(orderId);
    const order = await tx.order.findUnique({
      where: { id },
      include:{
        items:{
          include:{
            product: true
          },
        },
        user: { select: { hasAccess: true } },
      },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);

    // Un pedido común se cancela mientras está confirmado. Una venta al público ya nace
    // entregada, así que también se puede anular estando entregada.
    const canCancel =
      order.status === "confirmed" || (order.status === "delivered" && order.isCounterSale);
    if (!canCancel) {
        throw new AppError("Estado inválido para cancelar", 400);
    }

    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      await logStockMovement(tx, {
        productId: item.productId,
        delta: item.quantity,
        reason: `Cancelación pedido #${order.id}`,
        userId,
      });
    }

    // Cambiar estado
    await tx.order.update({
      where: { id },
      data: { status: "cancelled" },
    });

    await tx.balanceMovement.create({
      data: {
        userId: order.userId,
        type:"cancellation",
        description: `Cancelacion pedido #${order.id} - reembolso`,
        amount: -Number(order.total),
      },
    });

    // Una venta al público cobrada en el momento: se devuelve también ese cobro, para que
    // el saldo del cliente quede en cero (venta -total, cobro +total, anulación -total).
    if (order.isCounterSale && order.paymentMethod && Number(order.total) > 0) {
      await tx.balanceMovement.create({
        data: {
          userId: order.userId,
          type: "cancellation",
          description: `Devolución del cobro - venta #${order.id} anulada`,
          amount: Number(order.total),
        },
      });
    }

    // Notificar al cliente (los clientes sin acceso no tienen a dónde recibirla)
    if (order.user?.hasAccess !== false) {
      await tx.notification.create({
        data: {
          userId: order.userId,
          message: `Tu orden #${order.id} fue cancelada`,
          orderId: order.id,
        },
      });
    }

    return order;
  }, { timeout: 15000 });
};

export const deliverOrder = async (orderId) => {
  return await prisma.$transaction(async (tx) => {

    const order = await tx.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);


    if (order.status !== "confirmed") {
        throw new AppError("Solo se pueden entregar órdenes confirmadas", 400);
    }

    // Cambiar estado
    await tx.order.update({
      where: { id: Number(orderId) },
      data: { status: "delivered" },
    });

    // Notificar al cliente
    await tx.notification.create({
      data: {
        userId: order.userId,
        message: `Tu orden #${order.id} fue entregada`,
        orderId: order.id,
      },
    });

    return order;
  });
};


export const getOrderByIdForAdmin = async (orderId) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { 
        id: true, 
        name: true, 
        lastName: true,
        email: true, 
        phone: true,
        dniCuil: true,
        address:true,
      }, 
    },
      items: { 
        include: { 
          product: {
            select:{
              id: true,
              name: true,
              unit: true,
            }, 
          }, 
        },
      },
    },
  });

  if (!order) throw new AppError("Orden no encontrada", 404);
  return { ...order, user: maskCustomer(order.user) };
};

// (opcional) para cliente: solo si es suya
export const getOrderByIdForClient = async (orderId, userId) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { 
        include: { 
          product: {
            select:{
              id: true,
              name: true,
              unit: true,
            }, 
          }, 
        },
      },
    },
  });

  if (!order) throw new AppError("Orden no encontrada", 404);
  if (order.userId !== userId) throw new AppError("No es tu orden", 403);
  return { ...order, editableUntil: getEditableUntil(order) };
};


export const getOrderPdfForAdmin = async (orderId) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, contactEmail: true, phone: true, address: true, dniCuil: true, active: true } },
      items: { include: { product: true } },
    },
  });

  if (!order) throw new AppError("Orden no encontrada", 404);

  return buildOrderPdf(order);
};

export const getOrderPdfForClient = async (orderId, userId) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, contactEmail: true, phone: true, address: true, dniCuil: true, active: true } },
      items: { include: { product: true } },
    },
  });

  if (!order) throw new AppError("Orden no encontrada", 404);
  if (order.userId !== userId) throw new AppError("No es tu orden", 403);

  return buildOrderPdf(order);
};

const recalcTotalForOrder = async (tx, orderId, userId) => {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const subtotal = items.reduce((acc, it) => acc + it.subtotal, 0);

  const user = await tx.user.findUnique({ where: { id: userId } });
  const discount = user?.discount ? user.discount : 0;

  const total = subtotal - subtotal * (discount / 100);

  await tx.order.update({
    where: { id: orderId },
    data: { total },
  });
};

export const removeItemFromDraft = async (orderId, itemId, userId) => {
  const oid = Number(orderId);
  const iid = Number(itemId);
  if (Number.isNaN(oid) || Number.isNaN(iid)) throw new AppError("ID inválido", 400);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: oid } });
    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("Solo se puede modificar orden draft", 400);

    const item = await tx.orderItem.findUnique({ where: { id: iid } });
    if (!item || item.orderId !== oid) throw new AppError("Item no encontrado", 404);

    await tx.orderItem.delete({ where: { id: iid } });

    await recalcTotalForOrder(tx, oid, userId);
  });
};

export const updateItemQtyFromDraft = async (orderId, itemId, userId, quantity) => {
  const oid = Number(orderId);
  const iid = Number(itemId);
  const q = Number(quantity);

  if (Number.isNaN(oid) || Number.isNaN(iid)) throw new AppError("ID inválido", 400);
  if (!q || q <= 0) throw new AppError("Cantidad inválida", 400);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: oid } });
    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("Solo se puede modificar orden draft", 400);

    const item = await tx.orderItem.findUnique({ where: { id: iid } });
    if (!item || item.orderId !== oid) throw new AppError("Item no encontrado", 404);

    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product || !product.active) throw new AppError("Producto no disponible", 400);
    if (q > product.stock) throw new AppError(`Stock insuficiente. Disponible: ${product.stock}`, 400);

    const newSubtotal = q * item.unitPrice;

    await tx.orderItem.update({
      where: { id: iid },
      data: { quantity: q, subtotal: newSubtotal },
    });

    await recalcTotalForOrder(tx, oid, userId);
  });
};

export const deleteDraftOrder = async (orderId, userId) => {
  const oid = Number(orderId);
  if (Number.isNaN(oid)) throw new AppError("ID inválido", 400);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: oid },
      include: { items: true },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);
    if (order.userId !== userId) throw new AppError("No es tu orden", 403);
    if (order.status !== "draft") throw new AppError("Solo se puede borrar orden draft", 400);

    // borrar items primero
    await tx.orderItem.deleteMany({ where: { orderId: oid } });
    await tx.order.delete({ where: { id: oid } });
  });
};

// ============ Edición del pedido por el cliente (ventana de tiempo) ============
// Mientras el pedido siga "confirmado" y no haya pasado la ventana (ver
// ORDER_EDIT_WINDOW_MINUTES en utils/payment.js), el cliente puede cambiar productos,
// cantidades, fecha de entrega, comentarios y forma de pago. Todo en una transacción:
// se reajusta el stock, el total y el saldo del cliente (por la diferencia), y se avisa
// al admin. Los productos que ya estaban conservan el precio con el que se pidieron;
// los que se agregan toman el precio actual.
const roundMoney = (n) => Math.round(n * 100) / 100;

export const editConfirmedOrder = async (orderId, userId, body) => {
  const oid = Number(orderId);
  if (Number.isNaN(oid)) throw new AppError("ID inválido", 400);

  const { items, comments, deliveryDate, clientPaymentMethod } = body;

  // si el mismo producto viene en dos líneas, se suman
  const wanted = new Map();
  for (const it of items ?? []) {
    wanted.set(it.productId, (wanted.get(it.productId) || 0) + it.quantity);
  }
  if (wanted.size === 0) {
    throw new AppError(
      "El pedido necesita al menos un producto. Si querés anularlo, comunicate con el local.",
      400
    );
  }

  let newDelivery;
  if (deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== "") {
    newDelivery = new Date(deliveryDate);
    if (Number.isNaN(newDelivery.getTime())) throw new AppError("Fecha de entrega inválida", 400);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const d = new Date(newDelivery);
    d.setHours(0, 0, 0, 0);
    if (d <= startToday) throw new AppError("La fecha de entrega debe ser posterior a hoy", 400);
  }

  if (
    clientPaymentMethod !== undefined &&
    clientPaymentMethod !== null &&
    !PAYMENT_METHOD_IDS.includes(clientPaymentMethod)
  ) {
    throw new AppError("Forma de pago inválida", 400);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: oid },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true, email: true, discount: true } },
        },
      });

      if (!order) throw new AppError("Orden no encontrada", 404);
      if (order.userId !== userId) throw new AppError("No es tu orden", 403);
      if (order.isCounterSale) throw new AppError("Este pedido no se puede modificar", 400);
      if (order.status === "delivered") throw new AppError("El pedido ya fue entregado y no se puede modificar", 400);
      if (order.status === "cancelled") throw new AppError("El pedido fue cancelado y no se puede modificar", 400);
      if (order.status !== "confirmed") throw new AppError("Solo se puede modificar un pedido confirmado", 400);

      if (!getEditableUntil(order)) {
        throw new AppError(
          `Ya pasaron las ${formatWindow(getEditWindowMinutes())} para modificar el pedido. Comunicate con el local.`,
          400
        );
      }

      const productIds = [...wanted.keys()];
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) throw new AppError("Algún producto no existe", 400);
      const productById = new Map(products.map((p) => [p.id, p]));

      const currentByProduct = new Map(order.items.map((i) => [i.productId, i]));
      const changes = []; // resumen legible de lo que cambió

      // 1) Stock: se aplica solo la diferencia por producto (con condición atómica)
      const applyStock = async (productId, delta, name) => {
        if (delta === 0) return;
        if (delta > 0) {
          const upd = await tx.product.updateMany({
            where: { id: productId, stock: { gte: delta } },
            data: { stock: { decrement: delta } },
          });
          if (upd.count === 0) {
            const fresh = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
            throw new AppError(`Stock insuficiente para ${name}. Disponible: ${fresh?.stock ?? 0}`, 400);
          }
        } else {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: -delta } },
          });
        }
        await logStockMovement(tx, { productId, delta: -delta, reason: `Edición pedido #${oid}`, userId });
      };

      // 2) Líneas nuevas y modificadas
      for (const [productId, qty] of wanted) {
        const product = productById.get(productId);
        const cur = currentByProduct.get(productId);
        const oldQty = cur?.quantity ?? 0;
        const delta = qty - oldQty;

        if (delta > 0 && !product.active) {
          throw new AppError(`El producto "${product.name}" no está disponible`, 400);
        }

        await applyStock(productId, delta, product.name);

        if (cur) {
          if (delta !== 0) {
            await tx.orderItem.update({
              where: { id: cur.id },
              data: { quantity: qty, subtotal: qty * cur.unitPrice },
            });
            changes.push(`${product.name}: ${oldQty} → ${qty}`);
          }
        } else {
          await tx.orderItem.create({
            data: {
              orderId: oid,
              productId,
              quantity: qty,
              unitPrice: product.price,
              subtotal: product.price * qty,
            },
          });
          changes.push(`Agregó ${product.name} x${qty}`);
        }
      }

      // 3) Líneas que se quitaron
      for (const [productId, cur] of currentByProduct) {
        if (wanted.has(productId)) continue;
        await applyStock(productId, -cur.quantity, cur.product?.name ?? `#${productId}`);
        await tx.orderItem.delete({ where: { id: cur.id } });
        changes.push(`Quitó ${cur.product?.name ?? `producto #${productId}`}`);
      }

      // 4) Total nuevo (con el descuento del cliente) y diferencia contra el anterior
      const finalItems = await tx.orderItem.findMany({ where: { orderId: oid } });
      const subtotal = finalItems.reduce((acc, it) => acc + it.subtotal, 0);
      const discount = order.user?.discount || 0;
      const newTotal = roundMoney(subtotal - subtotal * (discount / 100));
      const diff = roundMoney(newTotal - Number(order.total));

      if (Math.abs(diff) >= 0.01) {
        await tx.balanceMovement.create({
          data: {
            userId: order.userId,
            type: "order_edit",
            description: `Pedido #${oid} modificado por el cliente`,
            amount: diff,
          },
        });
      }

      // 5) Datos del pedido
      const data = { total: newTotal, editedAt: new Date(), editCount: { increment: 1 } };
      if (comments !== undefined) {
        const c = String(comments ?? "");
        if (c !== (order.comments ?? "")) changes.push("Cambió los comentarios");
        data.comments = c;
      }
      if (newDelivery) {
        const prev = order.deliveryDate ? new Date(order.deliveryDate).toISOString().slice(0, 10) : null;
        if (newDelivery.toISOString().slice(0, 10) !== prev) changes.push("Cambió la fecha de entrega");
        data.deliveryDate = newDelivery;
      }
      if (clientPaymentMethod !== undefined && clientPaymentMethod !== null) {
        if (clientPaymentMethod !== order.clientPaymentMethod) changes.push(`Forma de pago: ${clientPaymentMethod}`);
        data.clientPaymentMethod = clientPaymentMethod;
      }

      const updated = await tx.order.update({
        where: { id: oid },
        data,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, dniCuil: true, address: true } },
          items: { include: { product: true } },
        },
      });

      // 6) Aviso a los admins
      const admins = await tx.user.findMany({
        where: { role: "admin", active: true },
        select: { id: true, email: true, receiveOrderEmails: true },
      });
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            message: `El cliente modificó el pedido #${oid}`,
            orderId: oid,
          },
        });
      }

      return { order: updated, admins, changes };
    },
    { timeout: 15000 }
  );

  // PDF + mail a los admins con el pedido actualizado (fuera de la transacción;
  // si falla el mail no se rompe nada)
  void (async () => {
    try {
      const adminEmails = result.admins
        .filter((a) => a.receiveOrderEmails)
        .map((a) => a.email)
        .filter(Boolean);
      if (adminEmails.length === 0) return;

      const pdfBuffer = await buildOrderPdf(result.order);
      const list = result.changes.length
        ? `<ul>${result.changes.map((c) => `<li>${c}</li>`).join("")}</ul>`
        : "";
      await sendOrderEmail({
        to: adminEmails.join(","),
        subject: `✏️ Pedido #${oid} MODIFICADO - ${result.order.user?.name ?? "Cliente"}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>El cliente modificó un pedido</h2>
            <p><b>Pedido:</b> #${oid}</p>
            <p><b>Cliente:</b> ${result.order.user?.name ?? "-"}</p>
            ${list}
            <p>Adjunto va el PDF con el pedido actualizado.</p>
          </div>
        `,
        replyTo: result.order.user?.email,
        pdfBuffer,
        filename: `pedido-${oid}.pdf`,
      });
    } catch (e) {
      console.error("No se pudo enviar el mail del pedido modificado:", e);
    }
  })();

  return { ...result.order, editableUntil: getEditableUntil(result.order) };
};

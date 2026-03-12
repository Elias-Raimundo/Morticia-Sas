import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";
import { buildOrderPdf } from "../utils/orderPdf.js";
import { sendOrderEmail } from "../utils/mailer.js";

export const createDraftOrder = async (userId) => {
  return await prisma.order.create({
    data: {
      userId,
      status: "draft",
    },
  });
};


export const getMyOrders = async (userId) => {
  return await prisma.order.findMany({
    where: { 
      userId,
      status: { not: "draft" },   
    },
    include: {
      items: true},
    orderBy: {
      createdAt: "desc"
    },
  });
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


    const updated = await tx.order.update({
      where: { id},
      data,
      include: { items: { include: { product: true } } },
    });

    return updated;
  });
};


export const addItemToOrder = async (orderId, userId, productId, quantity) => {
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

    const requestedQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    if (requestedQuantity > product.stock) {
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
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
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

  return prisma.order.findMany({
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
    
    for(const item of order.items){
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }


    // ✅ Guardamos updated con include (así el PDF tiene todo bien)
    const updated = await tx.order.update({
      where: { id },
      data: { status: "confirmed" },
      include: {
        user: { select: { id: true, name: true, email: true , phone: true, dniCuil: true, address: true} },
        items: { include: { product: true } },
      },
    });

     

    const admins = await tx.user.findMany({
      where: { role: "admin", active: true },
      select: { id: true, email: true, name: true },
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
  });

  const orderToEmail = result.order;
  const adminsToEmail = result.admins;

  // 2) PDF + Email (afuera de la TX)
  (async () => {
    try {
      const pdfBuffer = await buildOrderPdf(orderToEmail);

      const adminEmails = adminsToEmail.map((a) => a.email).filter(Boolean);

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



export const cancelOrder = async (orderId) => {
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
      },
    });

    if (!order) throw new AppError("Orden no encontrada", 404);


    if (order.status !== "confirmed") {
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

    // Notificar al cliente
    await tx.notification.create({
      data: {
        userId: order.userId,
        message: `Tu orden #${order.id} fue cancelada`,
        orderId: order.id,
      },
    });

    return order;
  });
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
  return order;
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
  return order;
};


export const getOrderPdfForAdmin = async (orderId) => {
  const id = Number(orderId);
  if (Number.isNaN(id)) throw new AppError("ID inválido", 400);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, address: true, dniCuil: true, active: true } },
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
      user: { select: { id: true, name: true, email: true, phone: true, address: true, dniCuil: true, active: true } },
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
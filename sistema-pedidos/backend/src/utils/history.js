// Helpers para dejar registro de los cambios de precio y de stock de un producto.
// Siempre se llaman con el cliente de transacción (`tx`) para que el historial se
// guarde junto con el cambio y nunca queden desfasados.

// Origen del cambio, deducido del motivo (sirve para filtrar en la auditoría)
const sourceFromReason = (reason = "") => {
  if (
    reason.startsWith("Edición manual") ||
    reason.startsWith("Cambio de estado manual")
  ) return "manual";

  if (reason.startsWith("Compra")) return "compra";
  if (reason.startsWith("Cancelación")) return "cancelacion";
  if (reason.startsWith("Edición pedido")) return "edicion_pedido";
  if (reason.startsWith("Pedido")) return "pedido";
  if (reason.startsWith("Venta")) return "venta";
  if (reason.startsWith("Alta de producto")) return "alta";
  if (reason.startsWith("Eliminación")) return "baja";

  return "otro";
};

// Nombre del usuario que hizo el cambio, con una cache corta para no consultar
// la base por cada línea de un pedido grande.
const nameCache = new Map();
const userNameOf = async (tx, userId) => {
  if (!userId) return null;
  const hit = nameCache.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.name;
  const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
  const name = user?.name ?? null;
  nameCache.set(userId, { name, at: Date.now() });
  return name;
};

// Cambio de un campo puntual (price / internalPrice / stock). Si no cambió, no guarda nada.
export const logProductChange = async (tx, { productId, productName, field, oldValue, newValue, reason, userId }) => {
  const before = oldValue ?? null;
  const after = newValue ?? null;
  if (before === after) return;

  await tx.productHistory.create({
    data: {
      productId,
      productName,
      field,
      oldValue: before,
      newValue: after,
      reason,
      source: sourceFromReason(reason),
      userName: await userNameOf(tx, userId),
    },
  });
};

// Movimiento de stock ya aplicado (increment/decrement). Lee el stock actual del
// producto y deduce el valor anterior, así el registro es exacto aunque haya habido
// otros movimientos en paralelo.
export const logStockMovement = async (tx, { productId, delta, reason, userId }) => {
  if (!delta) return;
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { name: true, stock: true },
  });
  if (!product) return;

  await tx.productHistory.create({
    data: {
      productId,
      productName: product.name,
      field: "stock",
      oldValue: product.stock - delta,
      newValue: product.stock,
      reason,
      source: sourceFromReason(reason),
      userName: await userNameOf(tx, userId),
    },
  });
};

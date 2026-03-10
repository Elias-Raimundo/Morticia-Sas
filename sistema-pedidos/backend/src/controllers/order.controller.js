import * as orderService from "../services/order.service.js";

export const createDraftOrder = async (req, res, next) => {
  try {
    const order = await orderService.createDraftOrder(req.user.id);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

// 🔹 Ver mis órdenes
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getMyOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const updateDraftOrder = async (req, res, next) => {
  try {
    const order = await orderService.updateDraftOrder(
      req.params.orderId,
      req.user.id,
      req.body
    );
    res.json(order);
  } catch (e) {
    next(e);
  }
};

// 🔹 Agregar producto a orden draft
export const addItemToOrder = async (req, res, next) => {
  try {
    await orderService.addItemToOrder(
      req.params.orderId,
      req.user.id,
      req.body.productId,
      req.body.quantity
    );

    res.json({ message: "Producto agregado correctamente" });
  } catch (error) {
    next(error);
  }
};

// 🔹 Ver todas las órdenes (admin)
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getAllOrders(req.query.status);
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getMyDraft = async (req, res, next) => {
  try {
    const draft = await orderService.getOrCreateMyDraft(req.user.id);
    res.json(draft);
  } catch (error) {
    next(error);
  }
};

export const sendOrder = async (req, res, next) => {
  try {
    await orderService.sendOrder(
      req.params.orderId,
      req.user.id
    );

    res.json({ message: "Orden enviada correctamente" });
  } catch (error) {
    next(error);
  }
};


export const cancelOrder = async (req, res, next) => {
  try {
    await orderService.cancelOrder(req.params.orderId);

    res.json({ message: "Orden cancelada correctamente" });
  } catch (error) {
    next(error);
  }
};

export const deliverOrder = async (req, res, next) => {
  try {
    await orderService.deliverOrder(req.params.orderId);

    res.json({ message: "Orden marcada como entregada" });
  } catch (error) {
    next(error);
  }
};

export const getOrderByIdAdmin = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByIdForAdmin(req.params.orderId);
    res.json(order);
  } catch (e) {
    next(e);
  }
};

export const getOrderByIdClient = async (req, res, next) => {
  try {
    const order = await orderService.getOrderByIdForClient(
      req.params.orderId,
      req.user.id
    );
    res.json(order);
  } catch (e) {
    next(e);
  }
};


export const getOrderPdfAdmin = async (req, res, next) => {
  try {
    const pdf = await orderService.getOrderPdfForAdmin(req.params.orderId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="pedido-${req.params.orderId}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    next(e);
  }
};

export const getOrderPdfClient = async (req, res, next) => {
  try {
    const pdf = await orderService.getOrderPdfForClient(req.params.orderId, req.user.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="pedido-${req.params.orderId}.pdf"`);
    return res.send(pdf);
  } catch (e) {
    next(e);
  }
};

export const removeItemFromDraft = async (req, res, next) => {
  try {
    await orderService.removeItemFromDraft(
      req.params.orderId,
      req.params.itemId,
      req.user.id
    );
    res.json({ message: "Item eliminado" });
  } catch (e) {
    next(e);
  }
};

export const updateItemQtyFromDraft = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    await orderService.updateItemQtyFromDraft(
      req.params.orderId,
      req.params.itemId,
      req.user.id,
      quantity
    );
    res.json({ message: "Cantidad actualizada" });
  } catch (e) {
    next(e);
  }
};

export const deleteDraftOrder = async (req, res, next) => {
  try {
    await orderService.deleteDraftOrder(req.params.orderId, req.user.id);
    res.json({ message: "Pedido eliminado" });
  } catch (e) {
    next(e);
  }
};
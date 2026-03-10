import express from "express";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import * as orderController from "../controllers/order.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { orderIdParamSchema, createOrderItemSchema } from "../validators/order.validator.js";

const router = express.Router();


// 🔹 Crear orden draft
router.post(
  "/",
  authMiddleware,
  requireRole("client"),
  orderController.createDraftOrder
);

// 🔹 Obtener o crear mi draft
router.get(
  "/my/draft",
  authMiddleware,
  requireRole("client"),
  orderController.getMyDraft
);

// 🔹 Ver mis órdenes
router.get(
  "/my",
  authMiddleware,
  requireRole("client"),
  orderController.getMyOrders
);




// 🔹 Agregar producto a orden draft
router.post(
  "/:orderId/items",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  validate(createOrderItemSchema),
  orderController.addItemToOrder
);

router.patch(
  "/:orderId",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.updateDraftOrder
)


// 🔹 Enviar orden
router.patch(
  "/:orderId/send",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.sendOrder
);


// 🔹 Cancelar orden
router.patch(
  "/:orderId/cancel",
  authMiddleware,
  requireRole("admin"),
  validate(orderIdParamSchema, "params"),
  orderController.cancelOrder
);


// 🔹 Entregar orden
router.patch(
  "/:orderId/deliver",
  authMiddleware,
  requireRole("admin"),
  validate(orderIdParamSchema, "params"),
  orderController.deliverOrder
);


// 🔹 Ver todas las órdenes
router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  orderController.getAllOrders
);

// ADMIN: detalle de una orden
router.get(
  "/:orderId",
  authMiddleware,
  requireRole("admin"),
  validate(orderIdParamSchema, "params"),
  orderController.getOrderByIdAdmin
);

// CLIENT: detalle de su orden (opcional)
router.get(
  "/my/:orderId",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.getOrderByIdClient
);

// ADMIN: PDF de cualquier orden
router.get(
  "/:orderId/pdf",
  authMiddleware,
  requireRole("admin"),
  validate(orderIdParamSchema, "params"),
  orderController.getOrderPdfAdmin
);

// CLIENT: PDF solo de su orden
router.get(
  "/my/:orderId/pdf",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.getOrderPdfClient
);

// ✅ Quitar un item del draft
router.delete(
  "/:orderId/items/:itemId",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.removeItemFromDraft
);

// ✅ Cambiar cantidad de un item del draft
router.patch(
  "/:orderId/items/:itemId",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.updateItemQtyFromDraft
);

// ✅ Borrar pedido draft completo
router.delete(
  "/:orderId",
  authMiddleware,
  requireRole("client"),
  validate(orderIdParamSchema, "params"),
  orderController.deleteDraftOrder
);

export default router;
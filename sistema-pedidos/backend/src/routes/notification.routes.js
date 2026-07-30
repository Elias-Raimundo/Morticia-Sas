import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as notificationController from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", authMiddleware, notificationController.getMyNotifications);
router.get("/unread-count", authMiddleware, notificationController.getUnreadCount);
router.patch("/read-all", authMiddleware, notificationController.markAllAsRead);
router.patch("/:id/read", authMiddleware, notificationController.markAsRead);
router.delete("/:id", authMiddleware, notificationController.deleteNotification);

export default router;
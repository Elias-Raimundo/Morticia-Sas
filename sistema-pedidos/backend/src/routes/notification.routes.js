import express from "express";
import prisma from "../prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// 🔔 Ver mis notificaciones
router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    const { read } = req.query;

    try {
      const whereClause = {
        userId: req.user.id,
      };

      if (read !== undefined) {
        whereClause.read = read === "true";
      }

      const notifications = await prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(notifications);

    } catch (error) {
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

// 🔔 Marcar notificación como leída
router.patch(
  "/:id/read",
  authMiddleware,
  async (req, res) => {
    const { id } = req.params;

    try {

      const notification = await prisma.notification.findUnique({
        where: { id: Number(id) },
      });

      if (!notification) {
        return res.status(404).json({ error: "Notificación no encontrada" });
      }

      if (notification.userId !== req.user.id) {
        return res.status(403).json({ error: "No autorizado" });
      }

      await prisma.notification.update({
        where: { id: Number(id) },
        data: { read: true },
      });

      res.json({ message: "Notificación marcada como leída" });

    } catch (error) {
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

// 🔔 Marcar todas como leídas
router.patch(
  "/read-all",
  authMiddleware,
  async (req, res) => {
    try {

      await prisma.notification.updateMany({
        where: {
          userId: req.user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });

      res.json({ message: "Todas las notificaciones fueron marcadas como leídas" });

    } catch (error) {
      res.status(500).json({ error: "Error del servidor" });
    }
  }
);

export default router;
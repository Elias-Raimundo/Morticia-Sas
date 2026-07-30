import * as notificationService from "../services/notification.service.js";

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getMyNotifications(
      req.user.id,
      req.query.read
    );
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadNotificationsCount(req.user.id);
    res.json({ count });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
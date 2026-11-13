import * as settingsService from "../services/settings.service.js";

export const getPayment = async (req, res, next) => {
  try {
    res.json(await settingsService.getPaymentConfig());
  } catch (e) {
    next(e);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    res.json(await settingsService.updatePaymentConfig(req.body));
  } catch (e) {
    next(e);
  }
};

export const uploadQr = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se envió ninguna imagen" });
    res.json(await settingsService.uploadPaymentQr(req.file));
  } catch (e) {
    next(e);
  }
};

export const deleteQr = async (req, res, next) => {
  try {
    res.json(await settingsService.deletePaymentQr());
  } catch (e) {
    next(e);
  }
};

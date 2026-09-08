import * as assetService from "../services/asset.service.js";

export const listAssets = async (req, res, next) => {
  try {
    const assets = await assetService.listAssets();
    res.json(assets);
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const asset = await assetService.getAssetById(req.params.assetId);
    res.json(asset);
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const asset = await assetService.createAsset(req.body);
    res.status(201).json(asset);
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const asset = await assetService.updateAsset(req.params.assetId, req.body);
    res.json(asset);
  } catch (error) {
    next(error);
  }
};

export const deactivateAsset = async (req, res, next) => {
  try {
    await assetService.deactivateAsset(req.params.assetId);
    res.json({ message: "Bien desactivado" });
  } catch (error) {
    next(error);
  }
};

export const addPayment = async (req, res, next) => {
  try {
    const payment = await assetService.addPayment(req.params.assetId, req.body);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

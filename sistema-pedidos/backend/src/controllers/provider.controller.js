import * as providerService from "../services/provider.service.js";

export const listProviders = async (req, res, next) => {
  try {
    const providers = await providerService.listProviders();
    res.json(providers);
  } catch (error) {
    next(error);
  }
};

export const getProviderById = async (req, res, next) => {
  try {
    const provider = await providerService.getProviderById(req.params.providerId);
    res.json(provider);
  } catch (error) {
    next(error);
  }
};

export const createProvider = async (req, res, next) => {
  try {
    const provider = await providerService.createProvider(req.body);
    res.status(201).json(provider);
  } catch (error) {
    next(error);
  }
};

export const updateProvider = async (req, res, next) => {
  try {
    const provider = await providerService.updateProvider(req.params.providerId, req.body);
    res.json(provider);
  } catch (error) {
    next(error);
  }
};

export const deactivateProvider = async (req, res, next) => {
  try {
    await providerService.deactivateProvider(req.params.providerId);
    res.json({ message: "Proveedor desactivado" });
  } catch (error) {
    next(error);
  }
};

export const addManualMovement = async (req, res, next) => {
  try {
    const movement = await providerService.addManualMovement(req.params.providerId, req.body);
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
};

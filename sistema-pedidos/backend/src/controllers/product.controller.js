import * as productService from "../services/product.service.js";

export const getActiveProducts = async (req, res, next) => {
  try {
    const products = await productService.listActiveProducts();
    res.json(products);
  } catch (e) {
    next(e);
  }
};

export const getAllProductsAdmin = async (req, res, next) => {
  try {
    const products = await productService.listAllProductsAdmin();
    res.json(products);
  } catch (e) {
    next(e);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (e) {
    next(e);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

export const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    const product = await productService.uploadProductImage(req.params.id, req.file);
    res.json(product);
  } catch (e) {
    next(e);
  }
};

export const getCapitalTotal = async (req, res, next) => {
  try {
    const result = await productService.getCapitalTotal();
    res.json(result);
  } catch (e) {
    next(e);
  }
};
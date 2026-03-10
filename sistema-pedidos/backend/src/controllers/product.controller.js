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
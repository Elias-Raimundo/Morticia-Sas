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
    const product = await productService.createProduct(req.body, req.user.id);
    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.user.id);
    res.json(product);
  } catch (e) {
    next(e);
  }
};


export const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(
      req.params.id,
      req.user.id
    );

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

export const getProductHistory = async (req, res, next) => {
  try {
    const history = await productService.getProductHistory(req.params.id, {
      field: req.query.field,
      limit: req.query.limit,
    });
    res.json(history);
  } catch (e) {
    next(e);
  }
};


export const getAllProductHistory = async (req, res, next) => {
  try {
    const { search, field, source, from, to, limit } = req.query;
    res.json(await productService.getAllProductHistory({ search, field, source, from, to, limit }));
  } catch (e) {
    next(e);
  }
};

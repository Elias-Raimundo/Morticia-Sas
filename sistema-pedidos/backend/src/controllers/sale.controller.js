import * as saleService from "../services/sale.service.js";

export const createSale = async (req, res, next) => {
  try {
    const result = await saleService.createSale(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listSales = async (req, res, next) => {
  try {
    res.json(await saleService.listSales());
  } catch (error) {
    next(error);
  }
};

export const getRemito = async (req, res, next) => {
  try {
    const pdf = await saleService.getRemitoPdf(req.params.saleId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="remito-${req.params.saleId}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

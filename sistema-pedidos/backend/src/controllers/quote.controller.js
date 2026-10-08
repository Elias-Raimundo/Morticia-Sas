import * as quoteService from "../services/quote.service.js";

export const createQuote = async (req, res, next) => {
  try {
    const result = await quoteService.createQuote(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listQuotes = async (req, res, next) => {
  try {
    res.json(await quoteService.listQuotes());
  } catch (error) {
    next(error);
  }
};

export const getQuotePdf = async (req, res, next) => {
  try {
    const pdf = await quoteService.getQuotePdf(req.params.quoteId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="presupuesto-${req.params.quoteId}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

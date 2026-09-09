import * as invoiceService from "../services/invoice.service.js";

export const listInvoicesByProvider = async (req, res, next) => {
  try {
    const invoices = await invoiceService.listInvoicesByProvider(req.params.providerId);
    res.json(invoices);
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.invoiceId);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req, res, next) => {
  try {
    const invoice = await invoiceService.createInvoice({
      ...req.body,
      providerId: Number(req.params.providerId),
    });
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};

export const payInstallment = async (req, res, next) => {
  try {
    const movement = await invoiceService.payInstallment(req.params.installmentId, req.body);
    res.json(movement);
  } catch (error) {
    next(error);
  }
};

export const registerInvoicePayment = async (req, res, next) => {
  try {
    const movement = await invoiceService.registerInvoicePayment(
      req.params.invoiceId,
      req.body
    );
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
};

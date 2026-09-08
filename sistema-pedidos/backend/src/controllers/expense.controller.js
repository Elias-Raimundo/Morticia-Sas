import * as expenseService from "../services/expense.service.js";

export const listExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.listExpenses(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(req.body);
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.updateExpense(req.params.expenseId, req.body);
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

export const registerPayment = async (req, res, next) => {
  try {
    const expense = await expenseService.registerPayment(
      req.params.expenseId,
      req.body?.paidAt
    );
    res.json(expense);
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const result = await expenseService.deleteExpense(req.params.expenseId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

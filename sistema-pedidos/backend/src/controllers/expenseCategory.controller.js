import * as expenseCategoryService from "../services/expenseCategory.service.js";

export const getExpenseCategories = async (req, res, next) => {
  try {
    const data = await expenseCategoryService.getAllExpenseCategories();
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const createExpenseCategoryController = async (req, res, next) => {
  try {
    const data = await expenseCategoryService.createExpenseCategory(req.body.name);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const updateExpenseCategoryController = async (req, res, next) => {
  try {
    const data = await expenseCategoryService.updateExpenseCategory(req.params.id, req.body.name);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseCategoryController = async (req, res, next) => {
  try {
    const data = await expenseCategoryService.deleteExpenseCategory(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

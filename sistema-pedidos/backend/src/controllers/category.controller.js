import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../services/category.service.js";

export const getCategories = async(req, res, next) => {
    try {
        const data = await getAllCategories();
        res.json(data);
    }catch(error){
        next(error);
    }
};

export const createCategoryController = async (req, res, next) => {
    try {
        const data = await createCategory(req.body.name);
        res.status(201).json(data);
    }catch(error){
        next(error);
    }
};

export const updateCategoryController = async (req, res, next) => {
  try {
    const data = await updateCategory(req.params.id, req.body.name);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const deleteCategoryController = async (req, res, next) => {
  try {
    const data = await deleteCategory(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
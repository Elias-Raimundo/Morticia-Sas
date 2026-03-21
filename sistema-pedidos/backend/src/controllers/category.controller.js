import { getAllCategories } from "../services/category.service.js";

export const getCategories = async(req, res, next) => {
    try {
        const data = await getAllCategories();
        res.json(data);
    }catch(error){
        next(error);
    }
};
import prisma from "../prisma.js";

export const getAllCategories = async() =>{
    return prisma.category.findMany({
        orderBy: {name: "asc"},
    });
};
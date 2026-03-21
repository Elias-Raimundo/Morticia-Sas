import prisma from "../prisma.js";

export const getUnreadNotificationsCount = async (userId) => {
    return prisma.notification.count({
        where: {
            userId,
            read: false,
        },
    });
};
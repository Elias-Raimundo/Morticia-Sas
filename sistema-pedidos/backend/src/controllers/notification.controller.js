import { getUnreadNotificationsCount } from "../services/notification.service";

export const getUnreadCount = async(req, res, next) => {
    try {
        const count = await getUnreadNotificationsCount(req.user.id);
        res.json({count});
    }catch(error){
        next(error);
    }
};
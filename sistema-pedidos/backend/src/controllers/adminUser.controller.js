import * as adminUserService from "../services/adminUser.service.js";

export const listAdmins = async (req, res, next) => {
  try {
    res.json(await adminUserService.listAdmins());
  } catch (error) {
    next(error);
  }
};

export const setOrderEmails = async (req, res, next) => {
  try {
    const admin = await adminUserService.setOrderEmails(req.params.id, req.body.receive);
    res.json(admin);
  } catch (error) {
    next(error);
  }
};

import * as accountService from "../services/account.service.js";

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await accountService.deleteAccount(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const result = await accountService.setPassword(req.params.id, req.body.password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

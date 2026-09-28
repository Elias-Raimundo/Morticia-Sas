import * as accountService from "../services/account.service.js";

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await accountService.deleteAccount(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

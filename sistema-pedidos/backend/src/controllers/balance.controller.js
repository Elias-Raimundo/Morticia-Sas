import * as balanceService from "../services/balance.service.js";

export const getMyBalance = async (req, res, next) => {
  try {
    const data = await balanceService.getMyBalance(
      req.user.id,
      req.query.dateFrom,
      req.query.dateTo
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getUserBalanceAdmin = async (req, res, next) => {
  try {
    const data = await balanceService.getUserBalanceAdmin(
      req.params.userId,
      req.query.dateFrom,
      req.query.dateTo
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getAllClientsBalances = async (req, res, next) => {
  try {
    const data = await balanceService.getAllClientsBalances();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const registerPayment = async (req, res, next) => {
    try{
        const movement = await balanceService.registerPayment(
            req.params.userId,
            req.body.amount,
            req.body.description
        );
        res.status(201).json(movement);
    }catch(e){
        next(e);
    }
};
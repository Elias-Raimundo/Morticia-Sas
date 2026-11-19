import { getAdminHome as getAdminHomeService } from "../services/home.service.js";
import {
  getProductsStatsService,
  getPurchasesStatsService,
} from "../services/stats.service.js";

export const getProductsStats = async (req, res, next) => {
  try {
    const { range, from, to } = req.query;

    const data = await getProductsStatsService({ range, from, to });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getPurchasesStats = async (req, res, next) => {
  try {
    const { range, from, to } = req.query;

    const data = await getPurchasesStatsService({ range, from, to });

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getAdminHome = async (req, res, next) => {
  try {
    res.json(await getAdminHomeService());
  } catch (error) {
    next(error);
  }
};

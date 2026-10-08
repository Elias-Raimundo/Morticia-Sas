import * as catalogService from "../services/catalog.service.js";

// "1,2,3" -> [1,2,3]; descarta cualquier valor que no sea un entero positivo
const parseProductIds = (raw) => {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ids = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : null;
};

export const getCatalogPdf = async (req, res, next) => {
  try {
    const pdf = await catalogService.getCatalogPdf({
      includeOutOfStock: req.query.includeOutOfStock === "true",
      productIds: parseProductIds(req.query.productIds),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="catalogo-morticia.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

import * as catalogService from "../services/catalog.service.js";

export const getCatalogPdf = async (req, res, next) => {
  try {
    const pdf = await catalogService.getCatalogPdf({
      includeOutOfStock: req.query.includeOutOfStock === "true",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="catalogo-morticia.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

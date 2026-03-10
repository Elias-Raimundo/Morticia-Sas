export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    try {
      schema.parse(req[property]);
      next();
    } catch (error) {
      return res.status(400).json({
        error: error.errors?.[0]?.message || "Datos inválidos",
      });
    }
  };
};
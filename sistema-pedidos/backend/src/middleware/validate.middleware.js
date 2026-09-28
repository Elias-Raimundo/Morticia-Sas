export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    try {
      schema.parse(req[property]);
      next();
    } catch (error) {
      return res.status(400).json({
        // zod 4 expone los errores en .issues (en zod 3 era .errors)
        error: error.issues?.[0]?.message || error.errors?.[0]?.message || "Datos inválidos",
      });
    }
  };
};
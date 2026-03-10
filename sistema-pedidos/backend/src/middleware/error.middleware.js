export const errorHandler = (err, req, res, next) => {

  console.error("🔥 ERROR:", {
    message: err.message,
    status: err.statusCode,
    path: req.originalUrl,
    method: req.method,
  });

  // Si es error controlado
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Error inesperado
  return res.status(500).json({
    error: "Error interno del servidor",
  });
};
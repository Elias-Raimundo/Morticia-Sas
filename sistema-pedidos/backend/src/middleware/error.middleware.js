export const errorHandler = (err, req, res, next) => {
  console.error("🔥 ERROR:", {
    message: err.message,
    status: err.statusCode,
    path: req.originalUrl,
    method: req.method,
  });

  // Errores específicos de Multer (subida de archivos)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "La imagen no puede superar los 5MB" });
    }
    return res.status(400).json({ error: "Error subiendo el archivo" });
  }

  // Error lanzado a mano desde el fileFilter (formato no permitido)
  if (err.message?.includes("Formato de imagen no permitido")) {
    return res.status(400).json({ error: err.message });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  return res.status(500).json({ error: "Error interno del servidor" });
};
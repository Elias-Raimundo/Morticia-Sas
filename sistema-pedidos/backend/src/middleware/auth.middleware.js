import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

// El token dura 7 días, así que una cuenta eliminada/archivada seguiría entrando con
// su token viejo. Por eso se verifica en la base que la cuenta siga activa. El
// resultado se guarda 30 segundos en memoria para no consultar la base en cada pedido
// (la campanita, por ejemplo, consulta seguido).
const STATUS_CACHE_MS = 30_000;
const statusCache = new Map(); // userId -> { active, expires }

export const invalidateUserStatus = (userId) => {
  statusCache.delete(Number(userId));
};

const isUserActive = async (userId) => {
  const key = Number(userId);
  const hit = statusCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.active;

  const user = await prisma.user.findUnique({ where: { id: key }, select: { active: true } });
  const active = !!user && user.active;
  statusCache.set(key, { active, expires: Date.now() + STATUS_CACHE_MS });
  return active;
};

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError("No autorizado", 401));
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError("Token inválido", 401));
  }

  try {
    if (!(await isUserActive(decoded.id))) {
      return next(new AppError("Esta cuenta ya no está disponible", 401));
    }
  } catch (error) {
    return next(error);
  }

  req.user = decoded;
  next();
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Acceso prohibido" });
    }
    next();
  };
};

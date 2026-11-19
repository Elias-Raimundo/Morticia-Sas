import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { AppError } from "../utils/AppError.js";

// El token dura 7 días, así que una cuenta eliminada/archivada seguiría entrando con
// su token viejo. Por eso se verifica en la base que la cuenta siga activa y que el
// token sea posterior al último cambio de contraseña. El resultado se guarda 30 segundos
// en memoria para no consultar la base en cada pedido (la campanita consulta seguido).
const STATUS_CACHE_MS = 30_000;
const statusCache = new Map(); // userId -> { active, passwordChangedAt, expires }

export const invalidateUserStatus = (userId) => {
  statusCache.delete(Number(userId));
};

const getUserStatus = async (userId) => {
  const key = Number(userId);
  const hit = statusCache.get(key);
  if (hit && hit.expires > Date.now()) return hit;

  const user = await prisma.user.findUnique({
    where: { id: key },
    select: { active: true, passwordChangedAt: true },
  });
  const status = {
    active: !!user && user.active,
    // en segundos, igual que el "iat" del token
    passwordChangedAt: user?.passwordChangedAt ? Math.floor(user.passwordChangedAt.getTime() / 1000) : null,
    expires: Date.now() + STATUS_CACHE_MS,
  };
  statusCache.set(key, status);
  return status;
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
    const status = await getUserStatus(decoded.id);
    if (!status.active) {
      return next(new AppError("Esta cuenta ya no está disponible", 401));
    }
    // Token emitido antes del último cambio de contraseña: la sesión se cerró
    if (status.passwordChangedAt && (decoded.iat ?? 0) < status.passwordChangedAt) {
      return next(new AppError("Tu sesión expiró. Volvé a iniciar sesión.", 401));
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

import prisma  from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateToken } from "../utils/generateToken.js";
import { AppError } from "../utils/AppError.js";
import { invalidateUserStatus } from "../middleware/auth.middleware.js";

export const register = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("BODY_INVALIDO");
  }

 const { name, lastName, email, password, dniCuil, address, phone } = data;


  if (!name || !lastName || !email || !password || !dniCuil || !address || !phone) {
    throw new Error("FALTAN_DATOS");
  }

  if (!email || typeof email !== "string") {
      throw new Error("EMAIL_INVALIDO");
  }

  // El email se guarda en minúsculas: "Juan@Gmail.com" y "juan@gmail.com" son la misma cuenta
  const safeEmail = String(email).trim().toLowerCase();
  const safeDniCuil = String(dniCuil).trim();

  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: safeEmail, mode: "insensitive" } },
  });

  if (existingUser) {
    throw new Error("El email ya está registrado");
  }

  const existingDniCuil = await prisma.user.findFirst({
    where: { dniCuil: safeDniCuil },
  });

  if (existingDniCuil) {
    throw new Error("El DNI/CUIL ya está registrado");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      lastName,
      email: safeEmail,
      password: hashedPassword,
      dniCuil: safeDniCuil,
      address,
      phone,
      role: "client",
    },
  });

  const { password: _, ...safeUser } = user;
  return safeUser;
};

export const login = async (data) => {
  // Sin distinguir mayúsculas (hay cuentas viejas guardadas con mayúsculas)
  const email = String(data?.email ?? "").trim();
  if (!email || !data?.password) throw new Error("Credenciales inválidas");
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) throw new Error("Credenciales inválidas");

  const validPassword = await comparePassword(data.password, user.password);
  if (!validPassword) throw new Error("Credenciales inválidas");

  if (!user.active) {
    throw new Error("Esta cuenta fue eliminada. Contactá a la administración.");
  }

  if (user.hasAccess === false) {
    throw new Error("Esta cuenta no tiene acceso al sistema.");
  }

  const token = generateToken(user);
  const { password: _, ...safeUser } = user;

  return { user: safeUser, token };
};

// El usuario logueado cambia su propia contraseña (pide la actual para confirmar).
export const changeOwnPassword = async (userId, data) => {
  const currentPassword = String(data?.currentPassword ?? "");
  const newPassword = String(data?.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    throw new AppError("Completá la contraseña actual y la nueva", 400);
  }
  if (newPassword.length < 6) {
    throw new AppError("La nueva contraseña debe tener al menos 6 caracteres", 400);
  }
  if (newPassword.length > 100) {
    throw new AppError("La contraseña es demasiado larga", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, password: true },
  });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) throw new AppError("La contraseña actual no es correcta", 400);

  if (await comparePassword(newPassword, user.password)) {
    throw new AppError("La nueva contraseña tiene que ser distinta de la actual", 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword), passwordChangedAt: new Date() },
  });
  invalidateUserStatus(user.id);

  // Se cierran las demás sesiones (otros dispositivos). Esta sigue con un token nuevo.
  return { message: "Contraseña actualizada", token: generateToken(updated) };
};

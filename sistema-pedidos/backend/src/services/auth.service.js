import prisma  from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateToken } from "../utils/generateToken.js";

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

  const safeEmail = String(email).trim();
  const safeDniCuil = String(dniCuil).trim();

  const existingUser = await prisma.user.findFirst({
    where: { email: safeEmail },
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
  const user = await prisma.user.findFirst({ where: { email: data.email } });
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

export const resetPasswordSimple = async (data) => {
  const email = String(data.email || "").trim();
  const newPassword = String(data.newPassword || "").trim();

  if (!email || !newPassword) {
    throw new Error("Faltan email o nueva contraseña");
  }

  if (newPassword.length < 6) {
    throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
  }
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("El email no está registrado");
  }

  if (user.hasAccess === false) {
    throw new Error("Esta cuenta no tiene acceso al sistema.");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return { message: "Contraseña actualizada correctamente" };
};
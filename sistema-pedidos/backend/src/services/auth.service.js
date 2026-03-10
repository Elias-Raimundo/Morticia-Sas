import prisma  from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateToken } from "../utils/generateToken.js";

export const register = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("BODY_INVALIDO");
  }

  const { name, lastName, email, password, dniCuil, address, phone } = data;

  if (!name || !email || !password || !lastName || !dniCuil || !address || !phone) {
    throw new Error("FALTAN_DATOS");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("El email ya está registrado");
  }

  const existingDniCuil = await prisma.user.findUnique({
    where: { dniCuil },
  });

  if (existingDniCuil) {
    throw new Error("El DNI/CUIL ya está registrado");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      lastName,
      email,
      password: hashedPassword,
      dniCuil,
      address,
      phone,
      role: "client",
    },
  });

  return user;
};

export const login = async (data) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  const validPassword = await comparePassword(
    data.password,
    user.password
  );

  if (!validPassword) {
    throw new Error("Credenciales inválidas");
  }

  const token = generateToken(user);

  return { user, token };
};
import prisma  from "../prisma.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateToken } from "../utils/generateToken.js";

export const register = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("BODY_INVALIDO");
  }

 const { name, lastName, email, password, dniCuil, address, phone } = data;

  console.log("REGISTER BODY:", data);
  console.log("EMAIL:", email);
  console.log("DNI:", dniCuil);

  if (!name || !lastName || !email || !password || !dniCuil || !address || !phone) {
    throw new Error("FALTAN_DATOS");
  }

  if (!email || typeof email !== "string") {
      throw new Error("EMAIL_INVALIDO");
  }

  const safeEmail = String(email).trim();
  const safeDniCuil = String(dniCuil).trim();

  const existingUser = await prisma.user.findUnique({
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

  return user;
};

export const login = async (data) => {
  const user = await prisma.user.findFirst({
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
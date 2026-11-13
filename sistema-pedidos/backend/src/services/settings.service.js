import prisma from "../prisma.js";
import { supabase } from "../utils/supabaseClient.js";
import { AppError } from "../utils/AppError.js";
import { getPaymentSettings } from "../utils/payment.js";

const BUCKET = "product-images"; // se reutiliza el bucket público que ya existe para las fotos de productos

const setValue = async (key, value) => {
  const v = (value ?? "").toString().trim();
  if (!v) {
    await prisma.setting.deleteMany({ where: { key } });
    return;
  }
  await prisma.setting.upsert({
    where: { key },
    update: { value: v },
    create: { key, value: v },
  });
};

export const getPaymentConfig = () => getPaymentSettings();

export const updatePaymentConfig = async ({ alias, holder }) => {
  if (alias !== undefined) await setValue("paymentAlias", alias);
  if (holder !== undefined) await setValue("paymentHolder", holder);
  return getPaymentSettings();
};

const removeOldQr = async (url) => {
  if (!url) return;
  const old = url.split("/").pop();
  if (old?.startsWith("payment-qr-")) {
    await supabase.storage.from(BUCKET).remove([old]).catch(() => {});
  }
};

export const uploadPaymentQr = async (file) => {
  const ext = file.originalname.split(".").pop();
  const fileName = `payment-qr-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) throw new AppError("Error subiendo la imagen del QR", 500);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

  const previous = await prisma.setting.findUnique({ where: { key: "paymentQrUrl" } });
  await setValue("paymentQrUrl", data.publicUrl);
  await removeOldQr(previous?.value);

  return getPaymentSettings();
};

export const deletePaymentQr = async () => {
  const previous = await prisma.setting.findUnique({ where: { key: "paymentQrUrl" } });
  await setValue("paymentQrUrl", "");
  await removeOldQr(previous?.value);
  return getPaymentSettings();
};

-- Fecha del último cambio de contraseña: los tokens emitidos antes dejan de valer.
ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

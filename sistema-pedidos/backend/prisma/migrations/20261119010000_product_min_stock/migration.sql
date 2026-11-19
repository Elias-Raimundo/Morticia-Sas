-- Stock mínimo propio de cada producto (null = usa el mínimo general de Configuración)
ALTER TABLE "Product" ADD COLUMN "minStock" INTEGER;

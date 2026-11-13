// Carga datos de PRUEBA en una base de datos LOCAL: usuarios, categorías, productos,
// proveedores, facturas de compra, cambios de precio (para la auditoría), bienes y
// datos de pago.
//
// Uso (desde la carpeta backend, con el .env apuntando a localhost):
//   node scripts/seed-test.js
//
// Seguridad: se niega a correr si DATABASE_URL no apunta a localhost / 127.0.0.1,
// para que nunca se cargue basura de prueba en la base real.

import "dotenv/config";

// ---------- Guardia de seguridad (antes de importar nada que toque la base) ----------
const dbUrl = process.env.DATABASE_URL || "";
let host = "";
try {
  host = new URL(dbUrl).hostname;
} catch {
  /* URL inválida: se corta abajo */
}

if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error("\n⛔ ABORTADO: DATABASE_URL no apunta a una base local.");
  console.error(`   Host detectado: "${host || "desconocido"}"`);
  console.error("   Este script solo corre contra localhost. Revisá backend/.env.\n");
  process.exit(1);
}

const { default: prisma } = await import("../src/prisma.js");
const { hashPassword } = await import("../src/utils/hash.js");
const { createInvoice } = await import("../src/services/invoice.service.js");
const { updateProduct } = await import("../src/services/product.service.js");

const PASSWORD = "Test1234";

const ADMIN = {
  name: "Admin",
  lastName: "Prueba",
  email: "admin@test.com",
  dniCuil: "20000000001",
};

const CLIENTS = [
  { name: "Cliente", lastName: "Uno", email: "cliente1@test.com", dniCuil: "20000000002", discount: 0, phone: "3584000001", address: "Calle Falsa 123, Elena" },
  { name: "Cliente", lastName: "Dos", email: "cliente2@test.com", dniCuil: "20000000003", discount: 10, phone: "3584000002", address: "Av. Siempreviva 742, Río Cuarto" },
  { name: "Kiosco", lastName: "La Esquina", email: "cliente3@test.com", dniCuil: "20000000004", discount: 5, phone: "3584000003", address: "San Martín 50, Berrotarán" },
];

const CATEGORIES = ["Almacén", "Bebidas", "Limpieza", "Golosinas"];

// [nombre, unidad, categoría, precio venta, costo, stock inicial]
const PRODUCTS = [
  ["Aceite girasol 900 ml", "unidad", "Almacén", 2800, 2000, 40],
  ["Arroz largo fino 1 kg", "unidad", "Almacén", 1500, 1000, 60],
  ["Fideos tirabuzón 500 g", "unidad", "Almacén", 1100, 750, 80],
  ["Azúcar 1 kg", "unidad", "Almacén", 1300, 900, 50],
  ["Harina 000 1 kg", "unidad", "Almacén", 900, 600, 70],
  ["Gaseosa cola 2,25 L", "unidad", "Bebidas", 3200, 2400, 36],
  ["Agua saborizada pomelo 1,5 L", "unidad", "Bebidas", 2400, 1700, 48],
  ["Cerveza lata 473 ml", "unidad", "Bebidas", 1800, 1300, 96],
  ["Lavandina 1 L", "unidad", "Limpieza", 1200, 800, 40],
  ["Detergente 750 ml", "unidad", "Limpieza", 2100, 1500, 30],
  ["Papel higiénico x4", "pack", "Limpieza", 2600, 1900, 25],
  ["Alfajor triple", "unidad", "Golosinas", 1200, 800, 100],
  ["Chupetín pico dulce", "unidad", "Golosinas", 400, 250, 200],
  ["Caja de bombones", "caja", "Golosinas", 7500, 5500, 12],
];

const PROVIDERS = [
  { name: "Distribuidora Del Centro", cuit: "30-11111111-1", phone: "3584111111", email: "ventas@delcentro.test", address: "Ruta 8 km 600" },
  { name: "Mayorista La Económica", cuit: "30-22222222-2", phone: "3584222222", email: "pedidos@laeconomica.test", address: "Bv. Roca 1200" },
];

const ASSETS = [
  { name: "Heladera exhibidora", description: "Heladera vertical de 2 puertas", location: "Local", category: "Equipamiento", totalCost: 850000, installmentsCount: 6 },
  { name: "Camioneta Partner", description: "Reparto", location: "Depósito", category: "Vehículos", totalCost: 12000000, installmentsCount: null },
];

const log = (msg) => console.log(msg);

try {
  const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } });
  if (existing) {
    log("ℹ️  Los datos de prueba ya estaban cargados (existe admin@test.com). No hago nada.");
    log("   Para empezar de cero: docker rm -f pedidos_test_db, recrearlo y correr migrate deploy.");
    process.exit(0);
  }

  const password = await hashPassword(PASSWORD);

  // ---------- Usuarios ----------
  const admin = await prisma.user.create({
    data: {
      ...ADMIN,
      password,
      role: "admin",
      phone: "3584000000",
      address: "Local central",
      receiveOrderEmails: false, // por las dudas: la prueba no manda mails a nadie
    },
  });

  const clients = [];
  for (const c of CLIENTS) {
    clients.push(await prisma.user.create({ data: { ...c, password, role: "client" } }));
  }
  log(`✅ Usuarios: 1 admin y ${clients.length} clientes`);

  // ---------- Categorías y productos ----------
  const catByName = {};
  for (const name of CATEGORIES) {
    catByName[name] = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  const products = [];
  for (const [name, unit, cat, price, cost, stock] of PRODUCTS) {
    products.push(
      await prisma.product.create({
        data: { name, unit, price, internalPrice: cost, stock, categoryId: catByName[cat].id },
      })
    );
  }
  log(`✅ ${CATEGORIES.length} categorías y ${products.length} productos`);

  // ---------- Proveedores y facturas de compra (generan historial y resumen de compras) ----------
  const providers = [];
  for (const p of PROVIDERS) providers.push(await prisma.provider.create({ data: p }));

  const byName = (n) => products.find((p) => p.name === n);

  await createInvoice({
    providerId: providers[0].id,
    number: "0001-00001234",
    paymentType: "completo",
    notes: "Factura de prueba",
    userId: admin.id,
    items: [
      { productId: byName("Aceite girasol 900 ml").id, quantity: 24, unitCost: 2100 },
      { productId: byName("Arroz largo fino 1 kg").id, quantity: 30, unitCost: 1050, salePrice: 1600 },
      { productId: byName("Azúcar 1 kg").id, quantity: 20, unitCost: 950 },
    ],
  });

  await createInvoice({
    providerId: providers[1].id,
    number: "0002-00005678",
    paymentType: "fiado",
    notes: "Compra a cuenta de prueba",
    userId: admin.id,
    items: [
      { productId: byName("Gaseosa cola 2,25 L").id, quantity: 24, unitCost: 2500 },
      { productId: byName("Cerveza lata 473 ml").id, quantity: 48, unitCost: 1350 },
    ],
  });
  log(`✅ ${providers.length} proveedores y 2 facturas de compra`);

  // ---------- Cambios manuales de precio y stock (para la auditoría) ----------
  await updateProduct(byName("Aceite girasol 900 ml").id, { price: 3000 }, admin.id);
  await updateProduct(byName("Alfajor triple").id, { price: 1300, internalPrice: 900 }, admin.id);
  await updateProduct(byName("Chupetín pico dulce").id, { stock: 180 }, admin.id);
  log("✅ 3 cambios manuales de precio/stock (se ven en Auditoría)");

  // ---------- Bienes ----------
  for (const a of ASSETS) await prisma.asset.create({ data: a });
  log(`✅ ${ASSETS.length} bienes`);

  // ---------- Datos de pago (Configuración) ----------
  await prisma.setting.upsert({
    where: { key: "paymentAlias" },
    update: { value: "morticia.prueba" },
    create: { key: "paymentAlias", value: "morticia.prueba" },
  });
  await prisma.setting.upsert({
    where: { key: "paymentHolder" },
    update: { value: "Titular de Prueba" },
    create: { key: "paymentHolder", value: "Titular de Prueba" },
  });
  log("✅ Alias de pago de prueba");

  log("\n──────────────── LISTO ────────────────");
  log("Contraseña de todos: " + PASSWORD);
  log("  Admin:    admin@test.com");
  log("  Clientes: cliente1@test.com (sin descuento)");
  log("            cliente2@test.com (10% de descuento)");
  log("            cliente3@test.com (5% de descuento)");
  log("───────────────────────────────────────\n");
} catch (error) {
  console.error("\n❌ Falló el seed:", error?.message || error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  process.exit(process.exitCode ?? 0);
}

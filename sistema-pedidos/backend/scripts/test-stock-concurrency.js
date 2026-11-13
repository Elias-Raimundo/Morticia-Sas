import "dotenv/config";
import { randomUUID } from "node:crypto";

// Requiere una base de pruebas separada. Nunca usa DATABASE_URL directamente.
if (!process.env.TEST_DATABASE_URL) {
  console.error("Falta TEST_DATABASE_URL. Configurá una base PostgreSQL exclusiva para pruebas.");
  process.exit(1);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { default: prisma } = await import("../src/prisma.js");
const { logStockMovement } = await import("../src/utils/history.js");

const run = async () => {
  const suffix = randomUUID().slice(0, 8);
  let productId;

  try {
    const product = await prisma.product.create({
      data: {
        name: `TEST STOCK CONCURRENCY ${suffix}`,
        unit: "unidad",
        price: 1,
        stock: 1000,
        active: true,
      },
    });
    productId = product.id;

    // 20 ingresos de 2 unidades y 20 egresos de 1 unidad,
    // ejecutados en paralelo sobre el mismo producto.
    const operations = [
      ...Array.from({ length: 20 }, () => 2),
      ...Array.from({ length: 20 }, () => -1),
    ];

    const results = await Promise.allSettled(
      operations.map((delta) =>
        prisma.$transaction(
          async (tx) => {
            const update = await tx.product.updateMany({
              where: {
                id: productId,
                ...(delta < 0 ? { stock: { gte: Math.abs(delta) } } : {}),
              },
              data: {
                stock: delta > 0
                  ? { increment: delta }
                  : { decrement: Math.abs(delta) },
              },
            });

            if (update.count !== 1) {
              throw new Error("No se pudo aplicar el movimiento de stock");
            }

            await logStockMovement(tx, {
              productId,
              delta,
              reason: `TEST CONCURRENCIA ${suffix}`,
            });
          },
          { timeout: 15000 },
        ),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      throw new Error(
        `Fallaron ${failed.length} transacciones: ${failed.map((r) => r.reason?.message).join("; ")}`,
      );
    }

    const [finalProduct, history] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId }, select: { stock: true } }),
      prisma.productHistory.findMany({
        where: { productId, reason: `TEST CONCURRENCIA ${suffix}` },
      }),
    ]);

    const expectedStock = 1020;
    if (finalProduct.stock !== expectedStock) {
      throw new Error(`Stock final incorrecto: esperado ${expectedStock}, obtenido ${finalProduct.stock}`);
    }

    if (history.length !== operations.length) {
      throw new Error(`Historial incompleto: esperados ${operations.length}, obtenidos ${history.length}`);
    }

    const invalidEntries = history.filter((entry) => {
      const difference = Number(entry.newValue) - Number(entry.oldValue);
      return (
        !Number.isFinite(Number(entry.oldValue)) ||
        !Number.isFinite(Number(entry.newValue)) ||
        Number(entry.oldValue) < 0 ||
        Number(entry.newValue) < 0 ||
        ![2, -1].includes(difference)
      );
    });

    if (invalidEntries.length) {
      throw new Error(`Hay ${invalidEntries.length} registros con valores anteriores/posteriores incorrectos`);
    }

    // Los registros deben poder ordenarse como una secuencia continua desde
    // el stock inicial hasta el final, aunque varias transacciones tengan la
    // misma marca de tiempo.
    const graph = new Map();
    for (const entry of history) {
      const from = Number(entry.oldValue);
      const to = Number(entry.newValue);
      if (!graph.has(from)) graph.set(from, []);
      graph.get(from).push(to);
    }

    const stack = [1000];
    const path = [];
    while (stack.length) {
      const current = stack[stack.length - 1];
      const edges = graph.get(current);
      if (edges?.length) {
        stack.push(edges.pop());
      } else {
        path.push(stack.pop());
      }
    }

    if (path.length !== history.length + 1 || path[0] !== 1020 || path[path.length - 1] !== 1000) {
      throw new Error("Los valores anteriores/posteriores del historial no forman una secuencia continua");
    }

    const netHistoryChange = history.reduce(
      (sum, entry) => sum + Number(entry.newValue) - Number(entry.oldValue),
      0,
    );
    if (netHistoryChange !== expectedStock - 1000) {
      throw new Error(`El historial suma ${netHistoryChange}, pero el cambio real fue ${expectedStock - 1000}`);
    }

    console.log("OK: 40 movimientos concurrentes aplicados.");
    console.log(`Stock esperado/obtenido: 1020 / ${finalProduct.stock}`);
    console.log(`Registros de historial: ${history.length}, todos con delta correcto.`);
  } finally {
    if (productId) {
      await prisma.productHistory.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
    }
    await prisma.$disconnect();
  }
};

run().catch((error) => {
  console.error("FALLÓ la prueba de concurrencia:", error);
  process.exitCode = 1;
});

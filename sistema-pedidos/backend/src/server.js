if (process.env.NODE_ENV !== "production"){
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
import dns from "node:dns"
dns.setDefaultResultOrder("ipv4first");
import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma  from "./prisma.js";
import authRoutes from "./routes/auth.routes.js";
import { authMiddleware, requireRole } from "./middleware/auth.middleware.js";
import orderRoutes from "./routes/order.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import productRoutes from "./routes/product.routes.js";
import balanceRoutes from "./routes/balance.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import categoryRoutes from "./routes/category.routes.js";

const app = express();
app.set("trust proxy", 1); 



app.use(cors({
  origin: "*",
}));
app.use(helmet());

// ✅ SIEMPRE ANTES DE RUTAS
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // 🔼 subido de 100 a 300, como colchón para varios usuarios/pestañas en la misma IP
  message: { error: "Demasiadas solicitudes, intentá más tarde." },
});

const notificationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // el polling automático (5s admin / 30s cliente) puede generar bastantes requests legítimos
  message: { error: "Demasiadas solicitudes, intentá más tarde." },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intentá más tarde." },
});

app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// ✅ UNA SOLA VEZ
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/notifications", notificationsLimiter, notificationRoutes); // su propio límite, va primero

app.use(limiter); // 👈 a partir de acá, todo lo de abajo queda protegido por el límite general

app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/categories", categoryRoutes);


app.get("/api/user/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Error del servidor" });
  }
});

app.get(
  "/api/admin",
  authMiddleware,
  requireRole("admin"),
  (req, res) => {
    res.json({ message: "Bienvenido admin 👑" });
  }
);

app.use(errorHandler);

// 🔥 Test conexión DB
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Conectado a la base de datos");

    const PORT = process.env.PORT || 3001;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor corriendo en puerto ${PORT} `);
    });

  } catch (error) {
    console.error("❌ Error conectando a la base:", error);
    process.exit(1);
  }
}


startServer();
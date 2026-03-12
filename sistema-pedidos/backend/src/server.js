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
  max: 100,
  message: { error: "Demasiadas solicitudes, intentá más tarde." },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login. Intentá más tarde." },
});

app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// ✅ UNA SOLA VEZ
app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/products", productRoutes);
app.use("/api/balance", balanceRoutes);
app.use("/api/stats", statsRoutes);


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
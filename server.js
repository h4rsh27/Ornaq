import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import { setupSockets } from "./sockets/index.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const app = express();
const server = http.createServer(app);
const origins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : ["http://localhost:5173"];
const isProduction = process.env.NODE_ENV === "production";

const io = new Server(server, {
  cors: { origin: origins, credentials: true }
});

setupSockets(io);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ornaq-frontend.vercel.app"
  ],
  credentials: true
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 300 : 5000,
    skip: () => !isProduction
  })
);
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(notFound);
app.use(errorHandler);
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

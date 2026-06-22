import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { configureCloudinary } from "./config/cloudinary.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import toolRoutes from "./routes/toolRoutes.js";
import borrowRoutes from "./routes/borrowRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import trustRoutes from "./routes/trustRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import disputeRoutes from "./routes/disputeRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import miscRoutes from "./routes/miscRoutes.js";

configureCloudinary();

const app = express();
const allowedOrigins = [process.env.CLIENT_WEB_URL, process.env.CLIENT_MOBILE_URL].filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads-temp", express.static(path.resolve("uploads-temp")));
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/health", (req, res) => res.json({ status: "ok", name: "NeighborhoodShare API" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/borrow-requests", borrowRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/trust-points", trustRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api", miscRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";

// ---------------- Load Routes ----------------
import customerRoutes from "./routes/customerRoutes.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";

// ---------------- Config ----------------
dotenv.config();
const app = express();

// ---------------- Middlewares ----------------
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------------- MongoDB Connection ----------------
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/zaminwale_crm";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ---------------- API Routes ----------------
app.use("/api/customers", customerRoutes);
app.use("/api/activity-log", activityLogRoutes);

// ---------------- Serve React Frontend ----------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../frontend/zaminwale-crm/build");

app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ---------------- Error Handling Middleware ----------------
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

// ---------------- Start Server ----------------
const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  const networkInterfaces = os.networkInterfaces();
  let localIP = "localhost";

  for (const ifaceList of Object.values(networkInterfaces)) {
    for (const alias of ifaceList) {
      if (alias.family === "IPv4" && !alias.internal) {
        localIP = alias.address;
        break;
      }
    }
    if (localIP !== "localhost") break;
  }

  console.log(`🚀 Server running at:`);
  console.log(`➡️ Local:   http://localhost:${PORT}`);
  console.log(`➡️ Network: http://${localIP}:${PORT}`);
});

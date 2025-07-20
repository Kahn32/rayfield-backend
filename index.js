import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import chatRouter from "./routes/chat.js";
import cors from "cors";
dotenv.config();
const app = express();




// ✅ Allow requests from frontend
app.use(cors({
  origin: "https://rayfield-frontend.vercel.app", // 👈 Your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
app.use((req, _res, next) => {
  req.supabase = supabase;
  next();
});

// Middleware
app.use(express.json());

// API Routes
app.get("/api/debug", (req, res) => {
  res.json({
    status: "✅ Debug endpoint hit",
    supabase: req.supabase ? "✅ initialized" : "❌ not initialized",
    timestamp: new Date().toISOString(),
  });
});
app.use("/api/chat", chatRouter);

export default app;
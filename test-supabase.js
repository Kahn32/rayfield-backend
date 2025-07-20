import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
console.log("Environment variables:", {
  SUPABASE_URL: process.env.SUPABASE_URL ? "Exists" : "Missing",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Exists" : "Missing",
});

try {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log("✅ Supabase client initialized:", !!supabase);
} catch (err) {
  console.error("❌ Supabase client error:", err.message);
}
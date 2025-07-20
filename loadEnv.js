import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get absolute path to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Only load .env in development; use Vercel env vars in production
if (process.env.NODE_ENV !== "production") {
  const envPath = path.resolve(__dirname, "../../.env"); // force 2 levels up
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.error("❌ Could not load .env from:", envPath, result.error);
  } else {
    console.log("✅ .env loaded from:", envPath);
    console.log("🔑 SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Exists" : "Missing");
    console.log("🌐 SUPABASE_URL:", process.env.SUPABASE_URL ? "Exists" : "Missing");
  }
} else {
  console.log("⚡ Production mode: using Vercel environment variables.");
}
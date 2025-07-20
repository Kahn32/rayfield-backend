import express from "express";
import multer from "multer";
import { analyzeWithGemini } from "../services/gemini.js";
import { saveToDatabase } from "../services/database.js";

const router = express.Router();

// ✅ Multer for file uploads (uses memory storage)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      console.error("⚠️ No file received in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(`📄 Received file: ${file.originalname}`);

    // Read permitType and analysisModes from form data
    const permitType = req.body.permitType || "unknown";
    const analysisModes = req.body.analysisModes
      ? JSON.parse(req.body.analysisModes)
      : [];

    console.log("📑 Selected permitType:", permitType);
    console.log("🛠️ Selected analysisModes:", analysisModes);

    // ✅ Upload file directly to Supabase Storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const { data: storageData, error: storageError } = await req.supabase.storage
      .from("permit-files") // your bucket name
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    console.log("🔗 Supabase upload response:", storageData);
    if (storageError) {
      console.error("❌ Supabase upload error:", storageError);
      return res.status(500).json({
        error: "Failed to upload file",
        details: storageError.message,
      });
    }

    // ✅ Generate public URL for uploaded file
    const { data: publicUrlData } = req.supabase.storage
      .from("permit-files")
      .getPublicUrl(fileName);

    const publicURL = publicUrlData.publicUrl;

    if (!publicURL) {
      console.error("❌ Failed to get public URL: URL is undefined");
      return res.status(500).json({
        error: "Failed to generate public URL",
        details: "The Supabase storage bucket might not be public.",
      });
    }

    console.log("🌐 Public URL of file:", publicURL);

    // Send file to Gemini for analysis
    console.log("🧠 Sending file to Gemini for analysis...");
    const metadata = await analyzeWithGemini(publicURL, permitType, analysisModes);

    // Save extracted metadata + permitType + analysisModes + mode results
    console.log("📝 Saving metadata and analysis modes to Supabase database...");
    const permitId = await saveToDatabase({
      ...metadata, // includes core fields + mode-specific data
      permit_type_selected: permitType,
      analysis_modes_selected: analysisModes,
      analysis_modes_data: metadata.analysis_modes, // 🆕 save mode-specific data
    });

    res.status(200).json({
      message: "✅ File uploaded and processed successfully",
      permitId,
      metadata,
    });
  } catch (err) {
    console.error("❌ Backend error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

export default router;
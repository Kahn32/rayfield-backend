import express from "express";
import { analyzeQuestion } from "../services/gemini.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { metadata, messages, question, permitType, analysisModes } = req.body;

    console.log("📩 Chat question received:", question);
    console.log("📁 Received metadata:", metadata);
    console.log("📑 permitType:", permitType);
    console.log("📑 analysisModes:", analysisModes);

    const answer = await analyzeQuestion(metadata, messages, question, permitType, analysisModes);

    console.log("✅ AI Answer:", answer);

    res.json({ answer });
  } catch (err) {
    console.error("❌ Chat API detailed error:", err.message, err.stack);
    res.status(500).json({ error: "AI failed to respond", details: err.message });
  }
});

export default router;
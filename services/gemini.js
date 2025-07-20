import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ✅ Main function for file analysis
export async function analyzeWithGemini(fileUrl, permitType, analysisModes) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    console.log(`📥 Downloading ${fileUrl} for Gemini analysis...`);

    const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const fileData = Buffer.from(fileResponse.data, "binary");

    let retries = 5;
    let delayTime = 2000; // Start with 2 seconds for backoff

    while (retries > 0) {
      try {
        console.log("📤 Sending PDF file content directly to Gemini...");

        // STEP 1: Extract base metadata
        const basePrompt = `
You are analyzing a **${permitType}** permit.

✅ Return ONLY a valid JSON object with these fields:
issuing_agency, jurisdiction_level, permit_type, status, permittee_legal_name, operator_name, contact_person_name, contact_title, contact_email, contact_phone, other_parties, issue_date, effective_date, expiration_date, term_years, project_name, site_description, municipality, country, acreage_or_area, map_reference, resource_type, fuel_type, emission_limits, version_history.

⚠️ If a field is missing, set its value to null.
⚠️ Do NOT add explanations, markdown, or extra text. Return ONLY valid JSON.
        `.trim();

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: "application/pdf",
              data: fileData.toString("base64"),
            },
          },
          { text: basePrompt },
        ]);

        const response = await result.response;
        const text = await response.text();
        const cleanedText = text.replace(/```json|```/g, "").trim();

        console.log("📄 Gemini base response:", cleanedText);

        const metadata = JSON.parse(cleanedText);
        console.log("✅ Core metadata extracted");

        // STEP 2: Extract mode-specific details
        const analysisModesResults = {};

        if (analysisModes.length > 0) {
          for (const mode of analysisModes) {
            console.log(`🔍 Extracting details for mode: ${mode}...`);

            const modePrompt = `
You are analyzing a **${permitType}** permit for the purpose of **${mode}**.

✅ Return ONLY a JSON object with detailed findings for this analysis mode under a key "${mode}".
✅ Include structured content relevant to this mode. For example:

{
  "${mode}": {
    "summary": "High-level summary for ${mode}.",
    "table": [
      { "field1": "value1", "field2": "value2" },
      { "field1": "value3", "field2": "value4" }
    ],
    "notes": [
      "Key observation 1",
      "Key observation 2"
    ]
  }
}

⚠️ If no findings are available for this mode, return:
{
  "${mode}": {
    "summary": "No data found for ${mode}.",
    "table": [],
    "notes": []
  }
}

⚠️ Do NOT add explanations, markdown, or extra text.
            `.trim();

            try {
              const modeResult = await model.generateContent([
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: fileData.toString("base64"),
                  },
                },
                { text: modePrompt },
              ]);

              const modeResponse = await modeResult.response;
              const modeText = await modeResponse.text();
              const cleanedModeText = modeText.replace(/```json|```/g, "").trim();

              console.log(`📄 Gemini response for mode "${mode}":`, cleanedModeText);

              const parsedMode = JSON.parse(cleanedModeText);
              analysisModesResults[mode] = parsedMode[mode];
            } catch (modeErr) {
              console.error(`❌ Error extracting mode ${mode}:`, modeErr.message);

              // Even on error, store a placeholder
              analysisModesResults[mode] = {
                summary: `Could not retrieve data for ${mode}.`,
                table: [],
                notes: [],
              };
            }
          }
        } else {
          console.warn("⚠️ No analysisModes selected; skipping mode-specific extraction.");
        }

        // STEP 3: Return full metadata + analysis_modes
        const finalResult = {
          ...metadata,
          analysis_modes: analysisModesResults, // ✅ Add modes data
        };

        console.log("📤 Returning metadata to frontend:", finalResult);
        return finalResult;
      } catch (err) {
        console.error("❌ Error from Gemini generateContent:", JSON.stringify(err, null, 2));

        if ((err.status === 429 || err.status === 503) && retries > 0) {
          console.warn(`⚠️ Gemini rate-limited. Retrying in ${delayTime / 1000}s... (${retries} retries left)`);
          await delay(delayTime);
          delayTime *= 2; // exponential backoff
          retries--;
        } else {
          console.error("❌ No retries left or fatal error. Failing...");
          throw new Error(`Gemini failed: ${err.message || JSON.stringify(err)}`);
        }
      }
    }

    throw new Error("Gemini failed after multiple retries.");
  } catch (err) {
    console.error("❌ Gemini analysis failed (outer catch):", JSON.stringify(err, null, 2));
    throw new Error("Gemini failed to analyze document.");
  }
}

// ✅ Add this for chat.js
export async function analyzeQuestion(metadata, messages, question, permitType, analysisModes) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    console.log("🤖 analyzeQuestion called with:", {
      metadata,
      messages,
      question,
      permitType,
      analysisModes,
    });

    const chatPrompt = `
You are an AI assistant that helps users analyze energy permit documents.

This is a **${permitType}** permit.
Focus on these analysis modes: ${analysisModes.join(", ")}.

Here is the permit metadata:
${JSON.stringify(metadata, null, 2)}

Conversation so far:
${messages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")}

User just asked:
"${question}"

✅ Answer clearly and concisely using metadata and modes. 
✅ If info is missing, say "I couldn't find that in the permit." 
✅ Do NOT fabricate data.
    `.trim();

    const result = await model.generateContent(chatPrompt);
    const responseText = await result.response.text();

    console.log("💬 Gemini chatbot response:", responseText);
    return responseText.trim();
  } catch (err) {
    console.error("❌ analyzeQuestion error:", JSON.stringify(err, null, 2));
    throw new Error("Gemini failed to answer question.");
  }
}
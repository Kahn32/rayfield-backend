import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function saveToDatabase(metadata) {
  try {
    console.log("📝 Saving metadata to Supabase DB...");

    const { data, error } = await supabase
      .from("permits")
      .insert([
        {
          // Core metadata fields
          issuing_agency: metadata.issuing_agency || null,
          jurisdiction_level: metadata.jurisdiction_level || null,
          permit_type: metadata.permit_type || null,
          status: metadata.status || null,
          permittee_legal_name: metadata.permittee_legal_name || null,
          operator_name: metadata.operator_name || null,
          contact_person_name: metadata.contact_person_name || null,
          contact_title: metadata.contact_title || null,
          contact_email: metadata.contact_email || null,
          contact_phone: metadata.contact_phone || null,
          other_parties: metadata.other_parties || null,
          issue_date: metadata.issue_date || null,
          effective_date: metadata.effective_date || null,
          expiration_date: metadata.expiration_date || null,
          term_years: metadata.term_years || null,
          project_name: metadata.project_name || null,
          site_description: metadata.site_description || null,
          municipality: metadata.municipality || null,
          country: metadata.country || null,
          acreage_or_area: metadata.acreage_or_area || null,
          resource_type: metadata.resource_type || null,
          fuel_type: metadata.fuel_type || null,
          emission_limits: metadata.emission_limits || null,
          version_history: metadata.version_history || null,

          // 🆕 Custom fields for selected permit type & analysis modes
          permit_type_selected: metadata.permit_type_selected || null,
          analysis_modes_selected: metadata.analysis_modes_selected || [],

          last_updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("❌ DB insert error:", error);
      throw error;
    }

    console.log("✅ Metadata saved to DB:", data);
    return data[0].id; // Return permit_id
  } catch (err) {
    console.error("❌ DB insert error:", err);
    throw new Error("Failed to save metadata to DB.");
  }
}
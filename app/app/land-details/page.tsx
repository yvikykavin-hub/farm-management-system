"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

type Farm = {
  id: string;
  name: string | null;
  owner_name: string | null;
  area: number | null;
  survey_numbers: string | null;
  patta_number: string | null;
  well: boolean | null;
  well_depth: string | null;
  motor: boolean | null;
  motor_details: string | null;
  soil_type: string | null;
  water_source: string | null;
};

const SOIL_LABELS: Record<string, { en: string; ta: string }> = {
  red: { en: "Red Soil", ta: "செம்மண்" },
  black: { en: "Black Soil", ta: "கரிசல் மண்" },
  sandy: { en: "Sandy Soil", ta: "மணல் மண்" },
  clay: { en: "Clay Soil", ta: "களி மண்" },
  loamy: { en: "Loamy Soil", ta: "வண்டல் மண்" },
  mixed: { en: "Mixed", ta: "கலவை" },
};

const WATER_SOURCE_LABELS: Record<string, { en: string; ta: string }> = {
  borewell: { en: "Borewell", ta: "துளை கிணறு" },
  open_well: { en: "Open Well", ta: "திறந்த கிணறு" },
  canal: { en: "Canal", ta: "கால்வாய்" },
  rain_fed: { en: "Rain Fed", ta: "மழை நீர்" },
  tank: { en: "Tank", ta: "ஏரி" },
  other: { en: "Other", ta: "மற்றவை" },
};

export default function LandDetailsPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    const { data, error } = await supabase
      .from("farms")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setFarms(data);
    if (error) console.error("Error fetching farms:", error);
    setLoading(false);
    setIsRefreshing(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back to Dashboard", "முகப்புக்கு திரும்பு")}
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-primary">🗺️ {L("Land Details", "நில விவரம்")}</h1>
              <button
                onClick={() => fetchFarms(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm transition-all duration-200 border border-green-200"
              >
                <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
                {isRefreshing ? L("Refreshing...", "புதுப்பிக்கிறது...") : L("Refresh", "புதுப்பி")}
              </button>
            </div>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : farms.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
              <div className="text-4xl mb-2">🌾</div>
              {L("No farms found.", "நிலங்கள் இல்லை.")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {farms.map((f) => {
                const soil = f.soil_type ? SOIL_LABELS[f.soil_type] : null;
                const water = f.water_source ? WATER_SOURCE_LABELS[f.water_source] : null;
                return (
                  <Link key={f.id} href={`/land-details/${f.id}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-green-300 transition-all cursor-pointer flex flex-col gap-1.5 h-full">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">🌾 {f.name || "—"}</p>
                        <span className="text-xs font-semibold text-gray-700">{f.area ?? "—"} {L("Acres", "ஏக்கர்")}</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {L("Survey", "சர்வே")}: {f.survey_numbers || "—"} • {L("Patta", "பட்டா")}: {f.patta_number || "—"}
                      </p>
                      {f.owner_name && (
                        <p className="text-xs text-gray-600">{L("Owner", "உரிமையாளர்")}: {f.owner_name}</p>
                      )}
                      {soil && (
                        <p className="text-xs text-gray-600">{L("Soil", "மண்")}: {L(soil.en, soil.ta)}</p>
                      )}
                      {water && (
                        <p className="text-xs text-gray-600">{L("Water Source", "நீர் ஆதாரம்")}: {L(water.en, water.ta)}</p>
                      )}
                      <p className="text-xs text-gray-700">
                        {f.well
                          ? `🟢 ${L("Well", "கிணறு")}: ${L("Yes", "உண்டு")}${f.well_depth ? ` (${f.well_depth})` : ""}`
                          : `⭕ ${L("Well", "கிணறு")}: ${L("No", "இல்லை")}`}
                      </p>
                      <p className="text-xs text-gray-700">
                        {f.motor
                          ? `🟢 ${L("Motor", "மோட்டார்")}: ${L("Yes", "உண்டு")}${f.motor_details ? ` • ${f.motor_details}` : ""}`
                          : `⭕ ${L("Motor", "மோட்டார்")}: ${L("No", "இல்லை")}`}
                      </p>
                      <div className="flex justify-end mt-1">
                        <span className="text-xs font-semibold text-primary">{L("View Details", "விவரம் காண")} →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

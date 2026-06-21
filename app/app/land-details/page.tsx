"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

type Farm = {
  id: string;
  name: string;
  owner_name: string | null;
  area: number | null;
  survey_numbers: string | null;
  patta_number: string | null;
  well: boolean | null;
  motor: boolean | null;
};

export default function LandDetailsPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("farms")
      .select("id, name, owner_name, area, survey_numbers, patta_number, well, motor")
      .order("name", { ascending: true });
    if (!error && data) setFarms(data);
    setLoading(false);
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
            <h1 className="text-xl font-bold text-primary">🗺️ {L("Land Details", "நில விவரம்")}</h1>
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
              {farms.map((f) => (
                <Link key={f.id} href={`/land-details/${f.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-green-300 transition-all cursor-pointer flex flex-col gap-1.5 h-full">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">🌾 {f.name}</p>
                      <span className="text-xs font-semibold text-gray-700">{f.area ?? "—"} {L("Acres", "ஏக்கர்")}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {L("Survey", "சர்வே")}: {f.survey_numbers || "—"} • {L("Patta", "பட்டா")}: {f.patta_number || "—"}
                    </p>
                    {f.owner_name && (
                      <p className="text-xs text-gray-500">{L("Owner", "உரிமையாளர்")}: {f.owner_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.well ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {L("Well", "கிணறு")} {f.well ? "✅" : "❌"}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.motor ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {L("Motor", "மோட்டார்")} {f.motor ? "✅" : "❌"}
                      </span>
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-xs font-semibold text-primary">{L("View Details", "விவரம் காண")} →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

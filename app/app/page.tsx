"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import PageWrapper from "../components/PageWrapper";
import AnimatedCard from "../components/AnimatedCard";
import { SkeletonRow } from "../components/Skeleton";
import { supabase } from "../lib/supabase";

type Farm = {
  id: string;
  name: string;
  total_area: number;
  has_well: boolean;
  has_motor: boolean;
};

export default function Dashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"ta" | "en">("en");
  const [activeCropsCount, setActiveCropsCount] = useState<number>(0);

  // Add farm form
  const [farmName, setFarmName] = useState("");
  const [area, setArea] = useState("");
  const [hasWell, setHasWell] = useState(true);
  const [hasMotor, setHasMotor] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFarms();
    fetchActiveCropsCount();
  }, []);

  const fetchFarms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("farms")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setFarms(data);
    setLoading(false);
  };

  const fetchActiveCropsCount = async () => {
    const { count: cropCount } = await supabase
      .from("cultivations")
      .select("*", { count: "exact", head: true })
      .is("end_date", null);
    setActiveCropsCount(cropCount || 0);
  };

  const addFarm = async () => {
    if (!farmName.trim() || !area) {
      toast.error(lang === "ta" ? "நிலம் பெயர் மற்றும் பரப்பளவு தேவை" : "Farm name and area are required");
      return;
    }

    const payload = {
      name: farmName.trim(),
      total_area: parseFloat(area),
      has_well: hasWell,
      has_motor: hasMotor,
    };

    setSaving(true);
    try {
      const { error } = await supabase.from("farms").insert(payload);
      if (error) {
        toast.error("Error saving farm: " + error.message);
      } else {
        toast.success(lang === "ta" ? "சேமிக்கப்பட்டது!" : "Saved successfully!");
        setFarmName("");
        setArea("");
        setHasWell(true);
        setHasMotor(true);
        fetchFarms();
      }
    } catch (err) {
      console.error("Unexpected error saving farm:", err);
      toast.error("Unexpected error saving farm: " + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  };

  const totalArea = farms.reduce((sum, f) => sum + Number(f.total_area), 0);

  const t = {
    title: lang === "ta" ? "தாய் நிலம் AGRO" : "Thaai Nilam AGRO",
    tagline: lang === "ta" ? "நிலமே தாய், விளைவே வாழ்வு" : "Rooted in family, grown with love",
    totalFarms: lang === "ta" ? "மொத்த நிலங்கள்" : "Total Farms",
    totalArea: lang === "ta" ? "மொத்த பரப்பு" : "Total Area",
    activeCrops: lang === "ta" ? "செயலில் உள்ள பயிர்கள்" : "Active Crops",
    addFarm: lang === "ta" ? "நிலம் சேர்க்க" : "Add Farm",
    farmName: lang === "ta" ? "நிலத்தின் பெயர்" : "Farm Name",
    areaAcres: lang === "ta" ? "பரப்பளவு (ஏக்கர்)" : "Area (Acres)",
    well: lang === "ta" ? "கிணறு" : "Well",
    motor: lang === "ta" ? "மோட்டார்" : "Motor",
    save: lang === "ta" ? "சேமி" : "Save Farm",
    myFarms: lang === "ta" ? "என் நிலங்கள்" : "My Farms",
    yes: lang === "ta" ? "உண்டு" : "Yes",
    no: lang === "ta" ? "இல்லை" : "No",
    loading: lang === "ta" ? "ஏற்றுகிறது..." : "Loading...",
    noFarms: lang === "ta" ? "நிலங்கள் எதுவும் இல்லை. மேலே சேர்க்கவும்." : "No farms yet. Add one above.",
    acres: lang === "ta" ? "ஏக்கர்" : "Acres",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 p-3 overflow-hidden flex flex-col">
        <PageWrapper>
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-3 h-full">

          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3 flex justify-between items-center shrink-0">
            <div>
              <h1 className="text-xl font-bold text-primary">{t.title}</h1>
              <p className="text-primary text-sm font-medium mt-0.5">{t.tagline}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === "ta" ? "en" : "ta")}
                className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
              >
                {lang === "ta" ? "English" : "தமிழ்"}
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-2xl border-2 border-green-200">
                🧑‍🌾
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
            {[
              { label: t.totalFarms, value: farms.length, color: "text-primary", bg: "bg-green-50", icon: "🌳" },
              { label: t.totalArea, value: `${totalArea.toFixed(2)} ${t.acres}`, color: "text-blue-700", bg: "bg-blue-50", icon: "📐" },
              { label: t.activeCrops, value: activeCropsCount, color: "text-amber-700", bg: "bg-amber-50", icon: "🌾" },
            ].map((card, i) => (
              <AnimatedCard key={card.label} delay={i * 0.1}>
                <div className={`${card.bg} rounded-2xl p-5 border border-white shadow-sm relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/40 rounded-full -mr-8 -mt-8" />
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-medium text-gray-700">{card.label}</p>
                    <span className="text-base">{card.icon}</span>
                  </div>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </AnimatedCard>
            ))}
          </div>

          {/* Add Farm */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3 shrink-0">
            <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-xs">➕</span>
              {t.addFarm}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <input
                type="text"
                placeholder={t.farmName}
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
              />
              <input
                type="number"
                step="0.01"
                placeholder={t.areaAcres}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200"
              />
              <select
                value={hasWell ? "yes" : "no"}
                onChange={(e) => setHasWell(e.target.value === "yes")}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 cursor-pointer"
              >
                <option className="text-gray-900" value="yes">{t.well}: {t.yes}</option>
                <option className="text-gray-900" value="no">{t.well}: {t.no}</option>
              </select>
              <select
                value={hasMotor ? "yes" : "no"}
                onChange={(e) => setHasMotor(e.target.value === "yes")}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-200 cursor-pointer"
              >
                <option className="text-gray-900" value="yes">{t.motor}: {t.yes}</option>
                <option className="text-gray-900" value="no">{t.motor}: {t.no}</option>
              </select>
              <button
                onClick={addFarm}
                disabled={saving}
                className="bg-[#2D6A4F] hover:bg-[#245A42] disabled:bg-primary/40 text-white font-medium text-sm px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-95"
              >
                {saving ? "..." : t.save}
              </button>
            </div>
          </div>

          {/* Farms List */}
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3 flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-xs">🌳</span>
              {t.myFarms}
            </h2>

            {loading ? (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : farms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-5xl mb-4 opacity-60">🌳</div>
                <h3 className="text-base font-semibold text-gray-700 mb-1">
                  {lang === "ta" ? "நிலங்கள் இல்லை" : "No farms added yet"}
                </h3>
                <p className="text-sm text-gray-400 max-w-xs">{t.noFarms}</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-48">
                {farms.map((farm) => (
                  <Link key={farm.id} href={`/farms/${farm.id}`}>
                    <div className="flex justify-between items-center p-3 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-green-50/30 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer active:scale-[0.99] group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center text-lg group-hover:bg-green-200 transition">
                          🌳
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-primary">{farm.name}</h3>
                          <p className="text-xs text-gray-600 font-medium mt-0.5">
                            {t.well}: {farm.has_well ? t.yes : t.no} &nbsp;|&nbsp;
                            {t.motor}: {farm.has_motor ? t.yes : t.no}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-primary font-bold text-sm">{farm.total_area}</span>
                        <span className="text-primary text-xs font-medium ml-1">{t.acres}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
        </PageWrapper>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Sidebar from "../../../components/Sidebar";
import PageWrapper from "../../../components/PageWrapper";
import { supabase } from "../../../lib/supabase";

type Farm = {
  id: string;
  name: string | null;
  owner_name: string | null;
  area: number | null;
  total_area: number | null;
  survey_numbers: string | null;
  patta_number: string | null;
  well: boolean | null;
  has_well: boolean | null;
  well_depth: string | null;
  motor: boolean | null;
  has_motor: boolean | null;
  motor_details: string | null;
  water_source: string | null;
  irrigation_type: string | null;
  soil_type: string | null;
  google_maps_link: string | null;
};

type FarmDrawing = {
  id: string;
  farm_id: string;
  title: string;
  drawing_data: string;
  notes: string | null;
  file_type: string | null;
};

const MAX_RECOMMENDED_PDF_BYTES = 5 * 1024 * 1024;

const WATER_SOURCES = [
  { value: "borewell", en: "Borewell", ta: "துளை கிணறு" },
  { value: "open_well", en: "Open Well", ta: "திறந்த கிணறு" },
  { value: "canal", en: "Canal", ta: "கால்வாய்" },
  { value: "rain_fed", en: "Rain Fed", ta: "மழை நீர்" },
  { value: "tank", en: "Tank", ta: "ஏரி" },
  { value: "other", en: "Other", ta: "மற்றவை" },
];

const IRRIGATION_TYPES = [
  { value: "drip", en: "Drip", ta: "சொட்டு நீர்" },
  { value: "flood", en: "Flood", ta: "வெள்ள பாசனம்" },
  { value: "sprinkler", en: "Sprinkler", ta: "தெளிப்பு பாசனம்" },
  { value: "manual", en: "Manual", ta: "கை பாசனம்" },
  { value: "mixed", en: "Mixed", ta: "கலவை" },
];

const SOIL_TYPES = [
  { value: "red", en: "Red Soil", ta: "செம்மண்" },
  { value: "black", en: "Black Soil", ta: "கரிசல் மண்" },
  { value: "sandy", en: "Sandy Soil", ta: "மணல் மண்" },
  { value: "clay", en: "Clay Soil", ta: "களி மண்" },
  { value: "loamy", en: "Loamy Soil", ta: "வண்டல் மண்" },
  { value: "mixed", en: "Mixed", ta: "கலவை" },
];

const MAX_RECOMMENDED_PHOTO_BYTES = 2 * 1024 * 1024;

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

function TogglePill({
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          value ? "bg-success text-white" : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          !value ? "bg-danger text-white" : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {noLabel}
      </button>
    </div>
  );
}

export default function LandDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [activeTab, setActiveTab] = useState<"overview" | "location" | "drawing">("overview");
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string) => toast.success(msg);

  // Section 1 - Basic Info
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [area, setArea] = useState("");
  const [surveyNumbers, setSurveyNumbers] = useState("");
  const [pattaNumber, setPattaNumber] = useState("");
  const [savingBasic, setSavingBasic] = useState(false);

  // Section 2 - Water & Irrigation
  const [well, setWell] = useState(false);
  const [wellDepth, setWellDepth] = useState("");
  const [motor, setMotor] = useState(false);
  const [motorDetails, setMotorDetails] = useState("");
  const [waterSource, setWaterSource] = useState("borewell");
  const [irrigationType, setIrrigationType] = useState("drip");
  const [savingWater, setSavingWater] = useState(false);

  // Section 3 - Soil Info
  const [soilType, setSoilType] = useState("red");
  const [savingSoil, setSavingSoil] = useState(false);

  // Location tab
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [copied, setCopied] = useState(false);

  // Land Drawing tab
  const [drawings, setDrawings] = useState<FarmDrawing[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(true);
  const [drawingModalOpen, setDrawingModalOpen] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState("");
  const [drawingNotes, setDrawingNotes] = useState("");
  const [drawingFile, setDrawingFile] = useState<File | null>(null);
  const [savingDrawing, setSavingDrawing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchFarm();
      fetchDrawings();
    }
  }, [id]);

  const fetchFarm = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("farms").select("*").eq("id", id).single();
    if (!error && data) {
      const f = data as Farm;
      setFarm(f);
      setName(f.name ?? "");
      setOwnerName(f.owner_name ?? "");
      const effectiveArea = f.area ?? f.total_area;
      setArea(effectiveArea != null ? String(effectiveArea) : "");
      setSurveyNumbers(f.survey_numbers ?? "");
      setPattaNumber(f.patta_number ?? "");
      setWell(f.well ?? f.has_well ?? false);
      setWellDepth(f.well_depth ?? "");
      setMotor(f.motor ?? f.has_motor ?? false);
      setMotorDetails(f.motor_details ?? "");
      setWaterSource(f.water_source ?? "borewell");
      setIrrigationType(f.irrigation_type ?? "drip");
      setSoilType(f.soil_type ?? "red");
      setGoogleMapsLink(f.google_maps_link ?? "");
    }
    setLoading(false);
  };

  const fetchDrawings = async () => {
    setLoadingDrawings(true);
    const { data, error } = await supabase.from("farm_drawings").select("*").eq("farm_id", id).order("id", { ascending: false });
    if (!error && data) setDrawings(data);
    setLoadingDrawings(false);
  };

  const saveBasicInfo = async () => {
    setSavingBasic(true);
    try {
      const { error } = await supabase
        .from("farms")
        .update({
          name: name.trim() || null,
          owner_name: ownerName.trim() || null,
          total_area: parseFloat(area) || 0,
          survey_numbers: surveyNumbers.trim() || null,
          patta_number: pattaNumber.trim() || null,
        })
        .eq("id", id);
      if (error) {
        console.error("Error saving basic info:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        showToast(L("Saved!", "சேமிக்கப்பட்டது!"));
        fetchFarm();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingBasic(false);
  };

  const saveWaterInfo = async () => {
    setSavingWater(true);
    try {
      const { error } = await supabase
        .from("farms")
        .update({
          has_well: well,
          well_depth: well ? wellDepth.trim() || null : null,
          has_motor: motor,
          motor_details: motor ? motorDetails.trim() || null : null,
          water_source: waterSource || null,
          irrigation_type: irrigationType || null,
        })
        .eq("id", id);
      if (error) {
        console.error("Error saving water info:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        showToast(L("Saved!", "சேமிக்கப்பட்டது!"));
        fetchFarm();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingWater(false);
  };

  const saveSoilInfo = async () => {
    setSavingSoil(true);
    try {
      const { error } = await supabase.from("farms").update({ soil_type: soilType || null }).eq("id", id);
      if (error) {
        console.error("Error saving soil info:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        showToast(L("Saved!", "சேமிக்கப்பட்டது!"));
        fetchFarm();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingSoil(false);
  };

  const saveGoogleMapsLink = async () => {
    setSavingLocation(true);
    try {
      const { error } = await supabase
        .from("farms")
        .update({ google_maps_link: googleMapsLink.trim() || null })
        .eq("id", id);
      if (error) {
        console.error("Error saving Google Maps link:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        showToast(L("Saved!", "சேமிக்கப்பட்டது!"));
        fetchFarm();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingLocation(false);
  };

  const openAddDrawing = () => {
    setDrawingTitle("");
    setDrawingNotes("");
    setDrawingFile(null);
    setDrawingModalOpen(true);
  };

  const saveDrawing = async () => {
    if (!drawingTitle.trim() || !drawingFile) {
      toast.error(L("Title and photo or PDF are required.", "தலைப்பு மற்றும் படம்/PDF தேவை."));
      return;
    }
    setSavingDrawing(true);
    try {
      const base64 = await convertToBase64(drawingFile);
      const fileType = drawingFile.type === "application/pdf" ? "pdf" : "image";
      const { error } = await supabase.from("farm_drawings").insert({
        farm_id: id,
        title: drawingTitle.trim(),
        drawing_data: base64,
        notes: drawingNotes.trim() || null,
        file_type: fileType,
      });
      if (error) {
        console.error("Error saving drawing:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setDrawingModalOpen(false);
        fetchDrawings();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingDrawing(false);
  };

  const deleteDrawing = async (drawingId: string) => {
    if (!confirm(L("Delete this drawing?", "இந்த வரைபடத்தை நீக்கவா?"))) return;
    const { error } = await supabase.from("farm_drawings").delete().eq("id", drawingId);
    if (!error) fetchDrawings();
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar lang={lang} setLang={setLang} />
        <main className="flex-1 p-4 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PageWrapper>
        <div className="max-w-3xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/land-details" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back", "திரும்பு")}
            </Link>
            <h1 className="text-lg font-bold text-primary text-center">{farm?.name}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["overview", L("Overview", "நில கண்ணோட்டம்")],
              ["location", L("Location", "இடம்")],
              ["drawing", L("Land Drawing", "நில வரைபடம்")],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeTab === key ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">{L("Basic Info", "அடிப்படை தகவல்")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className={labelCls}>{L("Farm Name", "பண்ணை பெயர்")}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Owner Name", "உரிமையாளர் பெயர்")}</label>
                    <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Total Area in Acres", "மொத்த பரப்பளவு")}</label>
                    <input type="number" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Survey Number", "சர்வே எண்")}</label>
                    <input type="text" value={surveyNumbers} onChange={(e) => setSurveyNumbers(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Patta Number", "பட்டா எண்")}</label>
                    <input type="text" value={pattaNumber} onChange={(e) => setPattaNumber(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <button
                  onClick={saveBasicInfo}
                  disabled={savingBasic}
                  className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                >
                  {savingBasic ? "..." : L("Save", "சேமி")}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">{L("Water & Irrigation", "நீர் பாசனம்")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">{L("Well", "கிணறு")}</label>
                    <TogglePill value={well} onChange={setWell} yesLabel={L("Yes", "உண்டு")} noLabel={L("No", "இல்லை")} />
                  </div>
                  {well && (
                    <div>
                      <label className={labelCls}>{L("Well Depth", "கிணற்று ஆழம்")}</label>
                      <input
                        type="text"
                        placeholder={L("e.g. 23 feet", "எ.கா. 23 அடி")}
                        value={wellDepth}
                        onChange={(e) => setWellDepth(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">{L("Motor", "மோட்டார்")}</label>
                    <TogglePill value={motor} onChange={setMotor} yesLabel={L("Yes", "உண்டு")} noLabel={L("No", "இல்லை")} />
                  </div>
                  {motor && (
                    <div>
                      <label className={labelCls}>{L("Motor Service Number", "மோட்டார் சேவை எண்")}</label>
                      <input type="text" value={motorDetails} onChange={(e) => setMotorDetails(e.target.value)} className={inputCls} />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>{L("Water Source", "நீர் ஆதாரம்")}</label>
                    <select value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className={inputCls}>
                      {WATER_SOURCES.map((o) => (
                        <option className="text-gray-900" key={o.value} value={o.value}>{L(o.en, o.ta)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{L("Irrigation Type", "பாசன முறை")}</label>
                    <select value={irrigationType} onChange={(e) => setIrrigationType(e.target.value)} className={inputCls}>
                      {IRRIGATION_TYPES.map((o) => (
                        <option className="text-gray-900" key={o.value} value={o.value}>{L(o.en, o.ta)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={saveWaterInfo}
                  disabled={savingWater}
                  className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                >
                  {savingWater ? "..." : L("Save", "சேமி")}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">{L("Soil Info", "மண் தகவல்")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className={labelCls}>{L("Soil Type", "மண் வகை")}</label>
                    <select value={soilType} onChange={(e) => setSoilType(e.target.value)} className={inputCls}>
                      {SOIL_TYPES.map((o) => (
                        <option className="text-gray-900" key={o.value} value={o.value}>{L(o.en, o.ta)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={saveSoilInfo}
                  disabled={savingSoil}
                  className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                >
                  {savingSoil ? "..." : L("Save", "சேமி")}
                </button>
              </div>
            </div>
          )}

          {/* LOCATION TAB */}
          {activeTab === "location" && (
            <div className="bg-white rounded-xl shadow-sm p-6">

              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  {L("Google Maps Link", "கூகுள் வரைபட இணைப்பு")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleMapsLink}
                    onChange={(e) => setGoogleMapsLink(e.target.value)}
                    placeholder={L("Paste your Google Maps link here...", "உங்கள் கூகுள் வரைபட இணைப்பை இங்கே ஒட்டவும்...")}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={saveGoogleMapsLink}
                    disabled={savingLocation}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                  >
                    {savingLocation ? "..." : L("Save", "சேமி")}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {L(
                    "How to get link: Google Maps → Your farm location → Share → Copy link",
                    "இணைப்பு பெற: கூகுள் வரைபடம் → உங்கள் நிலத்தின் இடம் → பகிர் → இணைப்பை நகலெடு"
                  )}
                </p>
              </div>

              {googleMapsLink ? (
                <div className="border-2 border-green-200 rounded-xl overflow-hidden bg-green-50">
                  <div className="h-64 bg-gradient-to-br from-green-100 to-emerald-200 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="text-6xl mb-3 animate-bounce">📍</div>
                    <p className="text-green-800 font-semibold text-lg">
                      {L("Farm Location Saved", "நில இடம் சேமிக்கப்பட்டது")}
                    </p>
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "linear-gradient(#16a34a 1px, transparent 1px), linear-gradient(90deg, #16a34a 1px, transparent 1px)",
                        backgroundSize: "30px 30px",
                      }}
                    />
                  </div>

                  <div className="p-4 bg-white border-t border-green-200">
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={googleMapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        🗺️ {L("Open in Google Maps", "கூகுள் வரைபடத்தில் திற")}
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(googleMapsLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {copied ? `✅ ${L("Copied!", "நகலெடுக்கப்பட்டது!")}` : `📋 ${L("Copy Link", "இணைப்பை நகலெடு")}`}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 truncate">🔗 {googleMapsLink}</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl h-48 flex flex-col items-center justify-center text-center p-6">
                  <div className="text-4xl mb-3">🗺️</div>
                  <p className="text-gray-500 font-medium">{L("No location saved yet", "இடம் எதுவும் சேமிக்கப்படவில்லை")}</p>
                  <p className="text-gray-400 text-xs mt-3">
                    {L("Paste your Google Maps link above to save your farm location", "உங்கள் நிலத்தின் இடத்தை சேமிக்க மேலே கூகுள் வரைபட இணைப்பை ஒட்டவும்")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* LAND DRAWING TAB */}
          {activeTab === "drawing" && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-end">
                <button onClick={openAddDrawing} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                  + {L("Upload Drawing", "வரைபடம் பதிவேற்ற")}
                </button>
              </div>

              {loadingDrawings ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
                </div>
              ) : drawings.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
                  <div className="text-4xl mb-2">📐</div>
                  <p className="text-sm">
                    {L("No land drawings uploaded yet.", "நில வரைபடங்கள் இல்லை.")}
                    <br />
                    {L("Upload your farm boundary drawing or map photo.", "உங்கள் நிலத்தின் எல்லை வரைபடம் அல்லது புகைப்படத்தை பதிவேற்றவும்.")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {drawings.map((d) => {
                    const isPdf = d.file_type === "pdf";
                    return (
                      <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {isPdf ? (
                          <iframe src={d.drawing_data} className="w-full h-32 border-b border-gray-100" title={d.title} />
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={d.drawing_data}
                            alt={d.title}
                            className="w-full h-32 object-cover cursor-pointer"
                            onClick={() => setViewerUrl(d.drawing_data)}
                          />
                        )}
                        <div className="p-2">
                          <p className="text-xs font-bold text-gray-900">{d.title}</p>
                          {d.notes && <p className="text-[11px] text-gray-500 mt-0.5">{d.notes}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {isPdf ? (
                              <button
                                onClick={() => {
                                  const newTab = window.open();
                                  newTab?.document.write(
                                    `<iframe src="${d.drawing_data}" width="100%" height="100%" style="border:0"></iframe>`
                                  );
                                }}
                                className="text-[11px] text-primary hover:underline"
                              >
                                📄 {L("View Full PDF", "முழு PDF காண")}
                              </button>
                            ) : (
                              <button onClick={() => setViewerUrl(d.drawing_data)} className="text-[11px] text-primary hover:underline">
                                {L("View Full", "முழுவதும் காண")}
                              </button>
                            )}
                            <button onClick={() => deleteDrawing(d.id)} className="text-[11px] text-danger hover:underline">
                              {L("Delete", "நீக்கு")}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
        </PageWrapper>
      </main>

      {viewerUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewerUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerUrl} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      <AnimatePresence>
      {drawingModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{L("Upload Drawing", "வரைபடம் பதிவேற்ற")}</h2>
              <button onClick={() => setDrawingModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Title", "தலைப்பு")} *</label>
                <input
                  type="text"
                  placeholder={L("e.g. Overall boundary", "எ.கா. மொத்த எல்லை")}
                  value={drawingTitle}
                  onChange={(e) => setDrawingTitle(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{L("Photo or PDF", "படம் அல்லது PDF")} *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setDrawingFile(e.target.files?.[0] ?? null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors duration-200">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-gray-700 font-medium text-sm">
                      {L("Click to upload photo or PDF", "படம் அல்லது PDF பதிவேற்ற கிளிக் செய்யவும்")}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {drawingFile ? `✅ ${drawingFile.name}` : L("JPG, PNG, PDF supported", "JPG, PNG, PDF ஆதரிக்கப்படும்")}
                    </p>
                  </div>
                </div>
                {drawingFile && drawingFile.type !== "application/pdf" && drawingFile.size > MAX_RECOMMENDED_PHOTO_BYTES && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    ⚠️ {L("Photo is large and may slow the app. Please use a compressed image under 2MB.", "புகைப்படம் பெரியது, செயலியை மெதுவாக்கலாம். 2MB க்கும் குறைவான சுருக்கப்பட்ட படத்தை பயன்படுத்தவும்.")}
                  </p>
                )}
                {drawingFile && drawingFile.size > MAX_RECOMMENDED_PDF_BYTES && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    ⚠️ {L(
                      `File is large (${(drawingFile.size / (1024 * 1024)).toFixed(1)}MB). Large files may slow the app. Consider compressing before uploading.`,
                      `கோப்பு பெரியது (${(drawingFile.size / (1024 * 1024)).toFixed(1)}MB). பெரிய கோப்புகள் செயலியை மெதுவாக்கலாம். பதிவேற்றும் முன் சுருக்கவும்.`
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>{L("Notes", "குறிப்புகள்")}</label>
                <textarea
                  placeholder={L("e.g. North side is road, East side is canal", "எ.கா. வடக்கு பக்கம் சாலை, கிழக்கு பக்கம் கால்வாய்")}
                  value={drawingNotes}
                  onChange={(e) => setDrawingNotes(e.target.value)}
                  className={inputCls}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveDrawing} disabled={savingDrawing} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingDrawing ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setDrawingModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

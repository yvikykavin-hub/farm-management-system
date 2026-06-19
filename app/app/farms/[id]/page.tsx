"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabase";

type Farm = {
  id: string;
  name: string;
  total_area: number;
  survey_numbers: string | null;
  patta_number: string | null;
  has_well: boolean;
  well_depth: string | null;
  has_motor: boolean;
  motor_details: string | null;
};

type Cultivation = {
  id: string;
  farm_id: string;
  crop_type: string;
  area: number;
  status: string;
};

const CROP_TYPES = [
  { value: "coconut", icon: "🥥", labelTa: "தேங்காய்", labelEn: "Coconut" },
  { value: "sugarcane", icon: "🎋", labelTa: "கரும்பு", labelEn: "Sugarcane" },
  { value: "turmeric", icon: "🟡", labelTa: "மஞ்சள்", labelEn: "Turmeric" },
  { value: "ellu", icon: "🌾", labelTa: "எள்ளு", labelEn: "Ellu" },
  { value: "kuchi_kilangu", icon: "🥔", labelTa: "குச்சிக்கிழங்கு", labelEn: "Kuchi Kilangu" },
  { value: "onion", icon: "🧅", labelTa: "வெங்காயம்", labelEn: "Onion" },
  { value: "fodder_corn", icon: "🌽", labelTa: "மக்காச்சோளம்", labelEn: "Fodder Corn" },
];

const cropInfo = (value: string) =>
  CROP_TYPES.find((c) => c.value === value) ?? { value, icon: "🌱", labelTa: value, labelEn: value };

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
          value ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-3 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
          !value ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 border border-gray-200"
        }`}
      >
        {noLabel}
      </button>
    </div>
  );
}

export default function FarmDetail() {
  const params = useParams();
  const id = params.id as string;

  const [lang, setLang] = useState<"ta" | "en">("en");
  const [farm, setFarm] = useState<Farm | null>(null);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable farm fields
  const [name, setName] = useState("");
  const [totalArea, setTotalArea] = useState("");
  const [surveyNumbers, setSurveyNumbers] = useState("");
  const [pattaNumber, setPattaNumber] = useState("");
  const [hasWell, setHasWell] = useState(true);
  const [wellDepth, setWellDepth] = useState("");
  const [hasMotor, setHasMotor] = useState(true);
  const [motorDetails, setMotorDetails] = useState("");

  // Add cultivation form
  const [cropType, setCropType] = useState("");
  const [cropArea, setCropArea] = useState("");
  const [addingCultivation, setAddingCultivation] = useState(false);

  // Inline edit cultivation
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCropType, setEditCropType] = useState("");
  const [editArea, setEditArea] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFarm();
      fetchCultivations();
    }
  }, [id]);

  const fetchFarm = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("farms")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) {
      setFarm(data);
      setName(data.name ?? "");
      setTotalArea(String(data.total_area ?? ""));
      setSurveyNumbers(data.survey_numbers ?? "");
      setPattaNumber(data.patta_number ?? "");
      setHasWell(!!data.has_well);
      setWellDepth(data.well_depth ?? "");
      setHasMotor(!!data.has_motor);
      setMotorDetails(data.motor_details ?? "");
    }
    setLoading(false);
  };

  const fetchCultivations = async () => {
    const { data, error } = await supabase
      .from("cultivations")
      .select("*")
      .eq("farm_id", id);
    if (!error && data) setCultivations(data);
  };

  const saveFarm = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("farms")
        .update({
          name: name.trim(),
          total_area: parseFloat(totalArea) || 0,
          survey_numbers: surveyNumbers.trim(),
          patta_number: pattaNumber.trim(),
          has_well: hasWell,
          well_depth: wellDepth.trim(),
          has_motor: hasMotor,
          motor_details: motorDetails.trim(),
        })
        .eq("id", id);
      if (error) {
        alert("Error saving farm: " + error.message);
      } else {
        fetchFarm();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  };

  const usedArea = cultivations.reduce((sum, c) => sum + Number(c.area), 0);
  const farmTotalArea = Number(farm?.total_area ?? 0);
  const remainingArea = farmTotalArea - usedArea;

  const notEnoughAreaMessage = (remaining: number) =>
    lang === "ta"
      ? `போதுமான இடமில்லை! இந்த நிலத்தில் ${remaining.toFixed(2)} ஏக்கர் மட்டுமே உள்ளது.`
      : `Not enough area! Only ${remaining.toFixed(2)} acres remaining in this farm.`;

  const addCultivation = async () => {
    if (!cropType || !cropArea) {
      alert(lang === "ta" ? "பயிர் மற்றும் பரப்பளவு தேவை" : "Crop and area are required");
      return;
    }
    const newArea = parseFloat(cropArea);
    if (newArea > remainingArea) {
      alert(notEnoughAreaMessage(remainingArea));
      return;
    }
    setAddingCultivation(true);
    try {
      const { error } = await supabase.from("cultivations").insert({
        farm_id: id,
        crop_type: cropType,
        area: newArea,
        status: "active",
      });
      if (error) {
        alert("Error adding cultivation: " + error.message);
      } else {
        setCropType("");
        setCropArea("");
        fetchCultivations();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setAddingCultivation(false);
  };

  const startEdit = (item: Cultivation) => {
    setEditingId(item.id);
    setEditCropType(item.crop_type);
    setEditArea(String(item.area));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCropType("");
    setEditArea("");
  };

  const saveEdit = async (item: Cultivation) => {
    if (!editCropType || !editArea) {
      alert(lang === "ta" ? "பயிர் மற்றும் பரப்பளவு தேவை" : "Crop and area are required");
      return;
    }
    const newArea = parseFloat(editArea);
    const otherCultivationsArea = cultivations
      .filter((c) => c.id !== item.id)
      .reduce((sum, c) => sum + Number(c.area), 0);
    const remaining = farmTotalArea - otherCultivationsArea;
    if (newArea > remaining) {
      alert(notEnoughAreaMessage(remaining));
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from("cultivations")
        .update({ crop_type: editCropType, area: newArea })
        .eq("id", item.id);
      if (error) {
        alert("Error updating cultivation: " + error.message);
      } else {
        cancelEdit();
        fetchCultivations();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSavingEdit(false);
  };

  const deleteCultivation = async (item: Cultivation) => {
    const confirmMsg =
      lang === "ta" ? "இந்த பயிரை நீக்க விரும்புகிறீர்களா?" : "Are you sure you want to delete this crop?";
    if (!confirm(confirmMsg)) return;
    try {
      const { error } = await supabase.from("cultivations").delete().eq("id", item.id);
      if (error) {
        alert("Error deleting cultivation: " + error.message);
      } else {
        fetchCultivations();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const usedPercent = farmTotalArea > 0 ? Math.min((usedArea / farmTotalArea) * 100, 100) : 0;
  const isFull = farmTotalArea > 0 && usedArea >= farmTotalArea;
  const isWarning = usedPercent >= 90 && !isFull;
  const barColor = isFull ? "bg-red-500" : isWarning ? "bg-yellow-500" : "bg-green-500";

  const t = {
    back: lang === "ta" ? "முகப்புக்கு திரும்பு" : "Back to Dashboard",
    farmInfo: lang === "ta" ? "நிலம் விவரங்கள்" : "Farm Information",
    farmName: lang === "ta" ? "நிலத்தின் பெயர்" : "Farm Name",
    farmNamePlaceholder: lang === "ta" ? "பெயர்" : "Name",
    totalArea: lang === "ta" ? "பரப்பளவு (ஏக்கர்)" : "Area in Acres",
    surveyNumbers: lang === "ta" ? "சர்வே எண்கள்" : "Survey Numbers",
    surveyNumbersPlaceholder: lang === "ta" ? "சர்வே எண்." : "Survey No.",
    pattaNumber: lang === "ta" ? "பட்டா எண்" : "Patta Number",
    pattaNumberPlaceholder: lang === "ta" ? "பட்டா எண்." : "Patta No.",
    well: lang === "ta" ? "கிணறு" : "Well",
    wellDepth: lang === "ta" ? "கிணற்று ஆழம்" : "Well Depth",
    wellDepthPlaceholder: lang === "ta" ? "ஆழம் (அடி)" : "Depth (ft)",
    motor: lang === "ta" ? "மோட்டார்" : "Motor",
    motorDetails: lang === "ta" ? "மோட்டார் விவரம்" : "Motor Details",
    motorDetailsPlaceholder: lang === "ta" ? "மோட்டார் தகவல்" : "Motor info",
    saveChanges: lang === "ta" ? "மாற்றங்களை சேமி" : "Save Changes",
    cultivations: lang === "ta" ? "தற்போதைய பயிர்கள்" : "Current Cultivations",
    addCultivation: lang === "ta" ? "பயிர் சேர்க்க" : "Add",
    selectCrop: lang === "ta" ? "பயிர் தேர்வு செய்க" : "Select Crop",
    areaAcres: lang === "ta" ? "பரப்பளவு (ஏக்கர்)" : "Area (Acres)",
    acresPlaceholder: lang === "ta" ? "ஏக்கர்" : "Acres",
    yes: lang === "ta" ? "உண்டு" : "Yes",
    no: lang === "ta" ? "இல்லை" : "No",
    active: lang === "ta" ? "செயலில்" : "Active",
    loading: lang === "ta" ? "ஏற்றுகிறது..." : "Loading...",
    noCultivations: lang === "ta" ? "பயிர்கள் எதுவும் இல்லை." : "No cultivations yet.",
    acres: lang === "ta" ? "ஏக்கர்" : "Acres",
    totalCultivated: lang === "ta" ? "மொத்த பயிர் பரப்பு" : "Total Cultivated Area",
    available: lang === "ta" ? "கிடைக்கும்" : "Available",
    save: lang === "ta" ? "சேமி" : "Save",
    cancel: lang === "ta" ? "ரத்து" : "Cancel",
    used: lang === "ta" ? "பயன்படுத்தியது" : "used",
    remaining: lang === "ta" ? "மீதம்" : "remaining",
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-green-50">
        <Sidebar lang={lang} setLang={setLang} />
        <main className="flex-1 flex items-center justify-center text-green-700 text-sm font-medium">
          {t.loading}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-green-50">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-hidden p-3 flex flex-col gap-3">

        {/* Header bar */}
        <div className="bg-white rounded-xl shadow-sm py-2 px-4 flex items-center justify-between shrink-0">
          <Link href="/" className="text-green-700 hover:text-green-800 text-sm font-semibold">
            ← {t.back}
          </Link>
          <h1 className="text-base font-bold text-green-800">{farm?.name}</h1>
          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="px-3 py-1.5 rounded-lg border border-green-300 text-green-700 text-sm font-medium hover:bg-green-50 transition"
          >
            {lang === "ta" ? "English" : "தமிழ்"}
          </button>
        </div>

        {/* Two columns */}
        <div className="flex flex-row gap-3 flex-1 overflow-hidden">

          {/* Farm Info Card (40%) */}
          <div className="w-[40%] bg-white rounded-2xl shadow-sm border border-green-100 border-l-4 border-l-green-500 p-3 h-full overflow-hidden flex flex-col">
            <h2 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2 shrink-0">
              <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-xs">🌳</span>
              {t.farmInfo}
            </h2>

            <div className="overflow-hidden flex-1">
              <div className="mb-1">
                <label className="text-xs font-medium text-gray-600">{t.farmName}</label>
                <input
                  type="text"
                  placeholder={t.farmNamePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>
              <div className="mb-1">
                <label className="text-xs font-medium text-gray-600">{t.totalArea}</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={t.acresPlaceholder}
                  value={totalArea}
                  onChange={(e) => setTotalArea(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>
              <div className="mb-1">
                <label className="text-xs font-medium text-gray-600">{t.surveyNumbers}</label>
                <input
                  type="text"
                  placeholder={t.surveyNumbersPlaceholder}
                  value={surveyNumbers}
                  onChange={(e) => setSurveyNumbers(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>
              <div className="mb-1">
                <label className="text-xs font-medium text-gray-600">{t.pattaNumber}</label>
                <input
                  type="text"
                  placeholder={t.pattaNumberPlaceholder}
                  value={pattaNumber}
                  onChange={(e) => setPattaNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-medium text-gray-700">{t.well}</label>
                <TogglePill value={hasWell} onChange={setHasWell} yesLabel={t.yes} noLabel={t.no} />
              </div>
              <div className="mt-1">
                <label className="text-xs font-normal text-gray-500 mt-1">{t.wellDepth}</label>
                <input
                  type="text"
                  placeholder={t.wellDepthPlaceholder}
                  value={wellDepth}
                  onChange={(e) => setWellDepth(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-sm font-medium text-gray-700">{t.motor}</label>
                <TogglePill value={hasMotor} onChange={setHasMotor} yesLabel={t.yes} noLabel={t.no} />
              </div>
              <div className="mt-1">
                <label className="text-xs font-normal text-gray-500 mt-1">{t.motorDetails}</label>
                <input
                  type="text"
                  placeholder={t.motorDetailsPlaceholder}
                  value={motorDetails}
                  onChange={(e) => setMotorDetails(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-900 placeholder:text-xs"
                />
              </div>
            </div>

            <button
              onClick={saveFarm}
              disabled={saving}
              className="shrink-0 w-full bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg py-1.5 text-xs font-semibold transition shadow-sm"
            >
              {saving ? "..." : t.saveChanges}
            </button>
          </div>

          {/* Current Cultivations Card (60%) */}
          <div className="w-[60%] bg-white rounded-2xl shadow-sm border border-green-100 p-3 h-full overflow-hidden flex flex-col">

            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center text-xs">🌾</span>
                {t.cultivations}
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {cultivations.length}
                </span>
              </h2>

              <div className="flex flex-col items-end gap-0.5">
                <div className="flex gap-2">
                  <select
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs min-w-[150px] focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option className="text-gray-900" value="">{t.selectCrop}</option>
                    {CROP_TYPES.map((c) => (
                      <option className="text-gray-900" key={c.value} value={c.value}>
                        {c.icon} {lang === "ta" ? c.labelTa : c.labelEn}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t.acresPlaceholder}
                    value={cropArea}
                    onChange={(e) => setCropArea(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs w-24 truncate placeholder:text-xs placeholder:text-gray-500 placeholder:truncate focus:outline-none focus:ring-2 focus:ring-green-400"
                  />

                  <button
                    onClick={addCultivation}
                    disabled={addingCultivation || isFull}
                    className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-3 py-1.5 text-sm font-semibold transition shadow-sm shrink-0"
                  >
                    {addingCultivation ? "..." : t.addCultivation}
                  </button>
                </div>
                <span className="text-xs text-green-700 font-medium">
                  {t.available}: {Math.max(remainingArea, 0).toFixed(2)} {t.acres}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="shrink-0 mt-2">
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all`}
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 font-medium mt-1">
                {usedArea.toFixed(2)} / {farmTotalArea.toFixed(2)} {t.acres} {t.used}
                {" "}({Math.max(remainingArea, 0).toFixed(2)} {t.remaining})
              </p>
            </div>

            {cultivations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-sm font-medium gap-2">
                <span className="text-3xl">🌱</span>
                {t.noCultivations}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mt-2 grid grid-cols-2 lg:grid-cols-3 gap-2 content-start">
                {cultivations.map((item) => {
                  const crop = cropInfo(item.crop_type);
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    return (
                      <div
                        key={item.id}
                        className="col-span-1 sm:col-span-2 bg-green-50 rounded-xl border border-green-300 p-2 flex flex-col gap-2"
                      >
                        <select
                          value={editCropType}
                          onChange={(e) => setEditCropType(e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-green-400"
                        >
                          {CROP_TYPES.map((c) => (
                            <option className="text-gray-900" key={c.value} value={c.value}>
                              {c.icon} {lang === "ta" ? c.labelTa : c.labelEn}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t.acresPlaceholder}
                          value={editArea}
                          onChange={(e) => setEditArea(e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 rounded-lg px-2 py-1.5 text-xs w-full placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(item)}
                            disabled={savingEdit}
                            className="flex-1 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg py-1.5 text-xs font-semibold transition"
                          >
                            {t.save}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg py-1.5 text-xs font-semibold transition"
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Link key={item.id} href={`/crops/${item.id}`}>
                      <div className="group relative bg-white rounded-xl border border-gray-100 hover:border-green-400 hover:bg-green-50 hover:shadow-md transition cursor-pointer p-2 flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-lg shrink-0">
                          {crop.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-green-900 truncate">
                            {lang === "ta" ? crop.labelTa : crop.labelEn}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.area} {t.acres}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0">
                          {t.active}
                        </span>
                        <span className="text-gray-400 group-hover:text-green-600 text-sm shrink-0">→</span>

                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1 bg-white/90 rounded-lg p-0.5">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEdit(item);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteCultivation(item);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="shrink-0 mt-2 pt-2 border-t border-gray-100 text-sm font-medium text-gray-700">
              {t.totalCultivated}: <span className="font-bold text-green-700">{usedArea.toFixed(2)} {t.acres}</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

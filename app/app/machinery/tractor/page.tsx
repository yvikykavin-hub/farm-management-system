"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import MachineryRecordSection from "../../../components/MachineryRecordSection";
import { supabase } from "../../../lib/supabase";

type TractorUsage = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  notes: string | null;
};

type TractorEngineOil = {
  id: string;
  service_date: string;
  oil_brand: string | null;
  quantity_litres: number | null;
  cost: number;
  hours_at_service: number;
  notes: string | null;
};

type TractorDiesel = {
  id: string;
  date: string;
  quantity_litres: number;
  amount: number;
  notes: string | null;
};

type TractorPhoto = {
  id: string;
  title: string;
  photo_url: string;
  notes: string | null;
};

type TractorSettings = {
  id: string;
  oil_change_interval_hours: number;
};

const DEFAULT_OIL_CHANGE_INTERVAL = 300;

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

const computeDurationHours = (startTime: string, endTime: string) => {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const MAX_RECOMMENDED_PHOTO_BYTES = 2 * 1024 * 1024;

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function TractorPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [activeTab, setActiveTab] = useState<"overview" | "diesel" | "usage" | "maintenance" | "photos">("overview");

  // Shared state needed across tabs for the oil counter logic
  const [usage, setUsage] = useState<TractorUsage[]>([]);
  const [engineOil, setEngineOil] = useState<TractorEngineOil[]>([]);
  const [loadingShared, setLoadingShared] = useState(true);

  // Engine oil service interval (editable, persisted in tractor_settings)
  const [oilChangeInterval, setOilChangeInterval] = useState(DEFAULT_OIL_CHANGE_INTERVAL);
  const [intervalInput, setIntervalInput] = useState(String(DEFAULT_OIL_CHANGE_INTERVAL));
  const [savingInterval, setSavingInterval] = useState(false);

  useEffect(() => {
    fetchUsage();
    fetchEngineOil();
    fetchSettings();
  }, []);

  const fetchUsage = async () => {
    setLoadingShared(true);
    const { data } = await supabase.from("tractor_usage").select("*").order("date", { ascending: true });
    if (data) setUsage(data);
    setLoadingShared(false);
  };
  const fetchEngineOil = async () => {
    const { data } = await supabase.from("tractor_engine_oil").select("*").order("service_date", { ascending: false });
    if (data) setEngineOil(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("tractor_settings").select("*").limit(1).maybeSingle();
    if (data) {
      const s = data as TractorSettings;
      setOilChangeInterval(Number(s.oil_change_interval_hours));
      setIntervalInput(String(s.oil_change_interval_hours));
    } else {
      const { data: created, error } = await supabase
        .from("tractor_settings")
        .insert({ oil_change_interval_hours: DEFAULT_OIL_CHANGE_INTERVAL })
        .select()
        .single();
      if (!error && created) {
        setOilChangeInterval(Number(created.oil_change_interval_hours));
        setIntervalInput(String(created.oil_change_interval_hours));
      }
    }
  };

  const saveInterval = async () => {
    const value = parseFloat(intervalInput);
    if (!value || value <= 0) {
      alert(L("Please enter a valid number of hours.", "சரியான மணி நேரத்தை உள்ளிடவும்."));
      return;
    }
    setSavingInterval(true);
    try {
      const { data: existing } = await supabase.from("tractor_settings").select("id").maybeSingle();
      const { error } = existing
        ? await supabase.from("tractor_settings").update({ oil_change_interval_hours: value }).eq("id", existing.id)
        : await supabase.from("tractor_settings").insert({ oil_change_interval_hours: value });
      if (error) {
        console.error("Error saving interval:", error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setOilChangeInterval(value);
        fetchSettings();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSavingInterval(false);
  };

  const totalHours = usage.reduce((s, u) => s + Number(u.duration_hours), 0);
  const hoursAtLastOilChange = engineOil[0] ? Number(engineOil[0].hours_at_service) : 0;
  const hoursSinceOilChange = totalHours - hoursAtLastOilChange;
  const hoursRemaining = oilChangeInterval - hoursSinceOilChange;

  const oilStatus: "safe" | "warning" | "danger" = hoursRemaining < 20 ? "danger" : hoursRemaining <= 50 ? "warning" : "safe";
  const oilBannerColor =
    oilStatus === "danger" ? "bg-red-50 border-red-200 text-red-700" : oilStatus === "warning" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-green-50 border-green-200 text-green-700";

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">

          <Link href="/machinery" className="text-primary hover:text-primary text-sm font-semibold">
            ← {L("Back to Machinery", "இயந்திரங்களுக்கு திரும்பு")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-primary">🚜 {L("Tractor", "டிராக்டர்")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["overview", L("Overview", "மேலோட்டம்")],
              ["diesel", L("Diesel", "டீசல்")],
              ["usage", L("Usage Hours", "பயன்பாட்டு நேரம்")],
              ["maintenance", L("Maintenance", "பராமரிப்பு")],
              ["photos", L("Photos", "புகைப்படங்கள்")],
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

          {activeTab === "overview" && (
            <OverviewTab
              L={L}
              totalHours={totalHours}
              hoursSinceOilChange={hoursSinceOilChange}
              hoursRemaining={hoursRemaining}
              oilStatus={oilStatus}
              oilBannerColor={oilBannerColor}
              lastEngineOilDate={engineOil[0]?.service_date ?? null}
              loadingShared={loadingShared}
              intervalInput={intervalInput}
              setIntervalInput={setIntervalInput}
              savingInterval={savingInterval}
              saveInterval={saveInterval}
            />
          )}

          {activeTab === "diesel" && <DieselTab L={L} />}

          {activeTab === "usage" && (
            <UsageTab
              L={L}
              usage={usage}
              totalHours={totalHours}
              hoursRemaining={hoursRemaining}
              oilBannerColor={oilBannerColor}
              refetch={fetchUsage}
            />
          )}

          {activeTab === "maintenance" && (
            <MaintenanceTab lang={lang} L={L} totalHours={totalHours} engineOil={engineOil} refetchEngineOil={fetchEngineOil} />
          )}

          {activeTab === "photos" && <PhotosTab L={L} />}

        </div>
      </main>
    </div>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({
  L,
  totalHours,
  hoursSinceOilChange,
  hoursRemaining,
  oilStatus,
  oilBannerColor,
  lastEngineOilDate,
  loadingShared,
  intervalInput,
  setIntervalInput,
  savingInterval,
  saveInterval,
}: {
  L: (en: string, ta: string) => string;
  totalHours: number;
  hoursSinceOilChange: number;
  hoursRemaining: number;
  oilStatus: "safe" | "warning" | "danger";
  oilBannerColor: string;
  lastEngineOilDate: string | null;
  loadingShared: boolean;
  intervalInput: string;
  setIntervalInput: (v: string) => void;
  savingInterval: boolean;
  saveInterval: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [lastBatteryDate, setLastBatteryDate] = useState<string | null>(null);
  const [lastGearOilDate, setLastGearOilDate] = useState<string | null>(null);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ label: string; date: string; amount: number }[]>([]);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [
      { data: battery },
      { data: gearOil },
      { data: diesel },
      { data: engineOilRows },
      { data: hydraulicOil },
      { data: tyre },
      { data: repairs },
    ] = await Promise.all([
      supabase.from("tractor_battery").select("replacement_date, cost").order("replacement_date", { ascending: false }),
      supabase.from("tractor_gear_oil").select("service_date, cost").order("service_date", { ascending: false }),
      supabase.from("tractor_diesel").select("date, amount"),
      supabase.from("tractor_engine_oil").select("service_date, cost"),
      supabase.from("tractor_hydraulic_oil").select("service_date, cost"),
      supabase.from("tractor_tyre").select("replacement_date, cost"),
      supabase.from("tractor_repairs").select("date, cost"),
    ]);

    setLastBatteryDate(battery?.[0]?.replacement_date ?? null);
    setLastGearOilDate(gearOil?.[0]?.service_date ?? null);

    const monthSum = (src: Record<string, unknown>[] | null, dateField: string) => {
      if (!src) return 0;
      return src.filter((r) => String(r[dateField] ?? "").startsWith(monthPrefix)).reduce((s, r) => s + Number((r.cost ?? r.amount ?? 0) as number), 0);
    };
    setMonthExpenses(
      monthSum(diesel, "date") + monthSum(engineOilRows, "service_date") + monthSum(hydraulicOil, "service_date") +
      monthSum(gearOil, "service_date") + monthSum(battery, "replacement_date") + monthSum(tyre, "replacement_date") + monthSum(repairs, "date")
    );

    const activity: { label: string; date: string; amount: number }[] = [];
    (diesel ?? []).forEach((r) => activity.push({ label: L("Diesel", "டீசல்"), date: String(r.date), amount: Number(r.amount) }));
    (engineOilRows ?? []).forEach((r) => activity.push({ label: L("Engine Oil", "எஞ்சின் ஆயில்"), date: String(r.service_date), amount: Number(r.cost) }));
    (gearOil ?? []).forEach((r) => activity.push({ label: L("Gear Oil", "கியர் ஆயில்"), date: String(r.service_date), amount: Number(r.cost) }));
    (hydraulicOil ?? []).forEach((r) => activity.push({ label: L("Hydraulic Oil", "ஹைட்ராலிக் ஆயில்"), date: String(r.service_date), amount: Number(r.cost) }));
    (battery ?? []).forEach((r) => activity.push({ label: L("Battery", "பேட்டரி"), date: String(r.replacement_date), amount: Number(r.cost) }));
    (tyre ?? []).forEach((r) => activity.push({ label: L("Tyre", "டயர்"), date: String(r.replacement_date), amount: Number(r.cost) }));
    (repairs ?? []).forEach((r) => activity.push({ label: L("Repair", "பழுது"), date: String(r.date), amount: Number(r.cost) }));
    activity.sort((a, b) => b.date.localeCompare(a.date));
    setRecentActivity(activity.slice(0, 5));

    setLoading(false);
  };

  if (loading || loadingShared) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
        <p className="text-xs text-gray-500">{L("Total Operating Hours", "மொத்த இயக்க நேரம்")}</p>
        <p className="text-4xl font-bold text-primary">{totalHours.toFixed(1)} {L("hrs", "மணி")}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">⚙️ {L("Engine Oil Service Interval", "எஞ்சின் ஆயில் சேவை இடைவெளி")}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-700">{L("Change oil every", "ஆயிலை மாற்றவும்")}</span>
          <input
            type="number"
            value={intervalInput}
            onChange={(e) => setIntervalInput(e.target.value)}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-sm text-gray-700">{L("hours", "மணி நேரம்")}</span>
          <button
            onClick={saveInterval}
            disabled={savingInterval}
            className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          >
            {savingInterval ? "..." : L("Save", "சேமி")}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border-2 p-4 ${oilBannerColor}`}>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <p className="text-xs font-medium">{L("Hours Since Last Oil Change", "கடைசி ஆயில் மாற்றத்திலிருந்து")}: <span className="font-bold">{Math.max(hoursSinceOilChange, 0).toFixed(1)}</span></p>
            <p className="text-xs font-medium">
              {L("Hours Remaining Until Next Oil Change", "அடுத்த ஆயில் மாற்றத்திற்கு மீதமுள்ள நேரம்")}:{" "}
              <span className={`font-bold ${oilStatus === "danger" ? "text-red-600 font-bold" : oilStatus === "warning" ? "text-amber-500" : "text-green-600"}`}>
                {Math.max(hoursRemaining, 0).toFixed(1)}
              </span>
            </p>
          </div>
        </div>
        {oilStatus === "danger" && (
          <div className="mt-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-2">
            <p className="text-sm font-bold">
              ⚠️ {L(
                `Only ${Math.max(hoursRemaining, 0).toFixed(1)} hours remaining! Engine oil change needed soon.`,
                `${Math.max(hoursRemaining, 0).toFixed(1)} மணி நேரம் மட்டுமே உள்ளது! எஞ்சின் ஆயில் மாற்றம் தேவை.`
              )}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          className={`rounded-xl shadow-sm p-3 ${
            oilStatus === "danger" ? "bg-red-50 animate-pulse" : oilStatus === "warning" ? "bg-amber-50" : "bg-green-50"
          }`}
        >
          <p className="text-xs text-gray-500">{L("Hours Until Next Oil Change", "அடுத்த ஆயில் மாற்றத்திற்கு மீதமுள்ள நேரம்")}</p>
          <p className={`text-sm font-bold ${oilStatus === "danger" ? "text-red-600" : oilStatus === "warning" ? "text-amber-500" : "text-green-600"}`}>
            {Math.max(hoursRemaining, 0).toFixed(1)} {L("hrs", "மணி")}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{L("Last Engine Oil Change", "கடைசி எஞ்சின் ஆயில் மாற்றம்")}</p>
          <p className="text-sm font-bold text-gray-900">{formatDMY(lastEngineOilDate)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{L("Last Battery Replacement", "கடைசி பேட்டரி மாற்றம்")}</p>
          <p className="text-sm font-bold text-gray-900">{formatDMY(lastBatteryDate)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{L("Last Gear Oil Change", "கடைசி கியர் ஆயில் மாற்றம்")}</p>
          <p className="text-sm font-bold text-gray-900">{formatDMY(lastGearOilDate)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 col-span-2 sm:col-span-3">
          <p className="text-xs text-gray-500">{L("This Month Total Expenses", "இந்த மாத மொத்த செலவு")}</p>
          <p className="text-lg font-bold text-danger">{inr(monthExpenses)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">{L("Recent Activity", "சமீபத்திய செயல்பாடு")}</h2>
        {recentActivity.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">🚜 {L("No activity yet", "செயல்பாடு இல்லை")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex justify-between text-xs border-b border-gray-50 py-1">
                <span className="text-gray-900">{a.label} · {formatDMY(a.date)}</span>
                <span className="text-danger font-medium">{inr(a.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== DIESEL TAB ====================
function DieselTab({ L }: { L: (en: string, ta: string) => string }) {
  const [records, setRecords] = useState<TractorDiesel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [litres, setLitres] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from("tractor_diesel").select("*").order("date", { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  };

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix));
  const monthLitres = monthRecords.reduce((s, r) => s + Number(r.quantity_litres), 0);
  const monthAmount = monthRecords.reduce((s, r) => s + Number(r.amount), 0);

  const openAdd = () => {
    setEditingId(null);
    setDate("");
    setLitres("");
    setAmount("");
    setNotes("");
    setModalOpen(true);
  };
  const openEdit = (r: TractorDiesel) => {
    setEditingId(r.id);
    setDate(r.date);
    setLitres(String(r.quantity_litres));
    setAmount(String(r.amount));
    setNotes(r.notes ?? "");
    setModalOpen(true);
  };

  const save = async () => {
    if (!date || !litres || !amount) {
      alert(L("Date, quantity, and amount are required.", "தேதி, அளவு மற்றும் தொகை தேவை."));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: date || null,
        quantity_litres: parseFloat(litres) || null,
        amount: parseFloat(amount) || null,
        notes: notes.trim() || null,
      };
      const { error } = editingId
        ? await supabase.from("tractor_diesel").update(payload).eq("id", editingId)
        : await supabase.from("tractor_diesel").insert(payload);
      if (error) {
        console.error("Error saving diesel:", error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setModalOpen(false);
        fetchRecords();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm(L("Delete this record?", "இந்த பதிவை நீக்கவா?"))) return;
    const { error } = await supabase.from("tractor_diesel").delete().eq("id", id);
    if (!error) fetchRecords();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl shadow-sm p-3 flex gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-500">{L("Total Diesel This Month", "இந்த மாத மொத்த டீசல்")}</p>
          <p className="text-lg font-bold text-gray-900">{monthLitres.toFixed(1)} L</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">&nbsp;</p>
          <p className="text-lg font-bold text-danger">{inr(monthAmount)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">⛽ {L("Diesel Records", "டீசல் பதிவுகள்")}</h2>
          <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
            + {L("Add Diesel", "டீசல் சேர்க்க")}
          </button>
        </div>
        {loading ? (
          <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                  <th className="py-1 px-1">{L("Date", "தேதி")}</th>
                  <th className="py-1 px-1">{L("Litres", "லிட்டர்")}</th>
                  <th className="py-1 px-1">{L("Amount", "தொகை")}</th>
                  <th className="py-1 px-1">{L("Notes", "குறிப்பு")}</th>
                  <th className="py-1 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-500">⛽ {L("No diesel records yet", "டீசல் பதிவுகள் இல்லை")}</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50">
                      <td className="py-1 px-1 text-gray-900">{formatDMY(r.date)}</td>
                      <td className="py-1 px-1 text-gray-900">{Number(r.quantity_litres).toFixed(1)} L</td>
                      <td className="py-1 px-1 text-danger font-medium">{inr(Number(r.amount))}</td>
                      <td className="py-1 px-1 text-gray-600">{r.notes || "—"}</td>
                      <td className="py-1 px-1 whitespace-nowrap">
                        <button onClick={() => openEdit(r)} className="mr-2 hover:text-primary">✏️</button>
                        <button onClick={() => remove(r.id)} className="hover:text-danger">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{editingId ? L("Edit Diesel", "டீசலைத் திருத்து") : L("Add Diesel", "டீசல் சேர்க்க")}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Date", "தேதி")} *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Quantity (litres)", "அளவு (லிட்டர்)")} *</label>
                <input type="number" value={litres} onChange={(e) => setLitres(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Amount (₹)", "தொகை (₹)")} *</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== USAGE HOURS TAB ====================
function UsageTab({
  L,
  usage,
  totalHours,
  hoursRemaining,
  oilBannerColor,
  refetch,
}: {
  L: (en: string, ta: string) => string;
  usage: TractorUsage[];
  totalHours: number;
  hoursRemaining: number;
  oilBannerColor: string;
  refetch: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const durationHoursRaw = startTime && endTime ? computeDurationHours(startTime, endTime) : 0;
  const durationValid = durationHoursRaw > 0;
  const durationHrs = Math.floor(durationHoursRaw);
  const durationMins = Math.round((durationHoursRaw - durationHrs) * 60);

  const openAdd = () => {
    setEditingId(null);
    setDate("");
    setStartTime("");
    setEndTime("");
    setNotes("");
    setModalOpen(true);
  };
  const openEdit = (u: TractorUsage) => {
    setEditingId(u.id);
    setDate(u.date);
    setStartTime(u.start_time);
    setEndTime(u.end_time);
    setNotes(u.notes ?? "");
    setModalOpen(true);
  };

  const save = async () => {
    if (!date || !startTime || !endTime) {
      alert(L("Date, start time, and end time are required.", "தேதி, தொடக்க நேரம் மற்றும் முடிவு நேரம் தேவை."));
      return;
    }
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end <= start) {
      alert(L("End time must be after start time.", "முடிவு நேரம் தொடக்க நேரத்திற்குப் பிறகு இருக்க வேண்டும்."));
      return;
    }
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    setSaving(true);
    try {
      const payload = {
        date: date || null,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHours,
        notes: notes || null,
      };
      const { error } = editingId
        ? await supabase.from("tractor_usage").update(payload).eq("id", editingId)
        : await supabase.from("tractor_usage").insert(payload);
      if (error) {
        console.error("Error saving usage:", error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setModalOpen(false);
        refetch();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm(L("Delete this record?", "இந்த பதிவை நீக்கவா?"))) return;
    const { error } = await supabase.from("tractor_usage").delete().eq("id", id);
    if (!error) refetch();
  };

  // usage is sorted ascending by date from parent; compute cumulative hours
  const withCumulative = usage.reduce<{ row: TractorUsage; cumulative: number }[]>((acc, row) => {
    const prevCum = acc.length ? acc[acc.length - 1].cumulative : 0;
    acc.push({ row, cumulative: prevCum + Number(row.duration_hours) });
    return acc;
  }, []);
  const displayRows = [...withCumulative].reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
        <p className="text-xs text-gray-500">{L("Total Operating Hours", "மொத்த இயக்க நேரம்")}</p>
        <p className="text-3xl font-bold text-primary">{totalHours.toFixed(2)} {L("hrs", "மணி")}</p>
      </div>

      <div className={`rounded-xl border-2 p-3 text-sm font-semibold ${oilBannerColor}`}>
        {hoursRemaining < 20
          ? `⚠️ ${L(`Only ${Math.max(hoursRemaining, 0).toFixed(1)} hours remaining for engine oil change!`, `எஞ்சின் ஆயில் மாற்ற ${Math.max(hoursRemaining, 0).toFixed(1)} மணி நேரம் மட்டுமே உள்ளது!`)}`
          : `${L("Hours remaining until next oil change", "அடுத்த ஆயில் மாற்றத்திற்கு மீதமுள்ள நேரம்")}: ${Math.max(hoursRemaining, 0).toFixed(1)}`}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">{L("Usage History", "பயன்பாட்டு வரலாறு")}</h2>
          <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
            + {L("Add Usage Entry", "பயன்பாடு சேர்க்க")}
          </button>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                <th className="py-1 px-1">{L("Date", "தேதி")}</th>
                <th className="py-1 px-1">{L("Start", "தொடக்கம்")}</th>
                <th className="py-1 px-1">{L("End", "முடிவு")}</th>
                <th className="py-1 px-1">{L("Duration", "கால அளவு")}</th>
                <th className="py-1 px-1">{L("Cumulative Hours", "மொத்த நேரம்")}</th>
                <th className="py-1 px-1">{L("Notes", "குறிப்பு")}</th>
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-gray-500">🚜 {L("No usage entries yet", "பயன்பாட்டு பதிவுகள் இல்லை")}</td></tr>
              ) : (
                displayRows.map(({ row, cumulative }) => (
                  <tr key={row.id} className="border-b border-gray-50">
                    <td className="py-1 px-1 text-gray-900">{formatDMY(row.date)}</td>
                    <td className="py-1 px-1 text-gray-900">{row.start_time}</td>
                    <td className="py-1 px-1 text-gray-900">{row.end_time}</td>
                    <td className="py-1 px-1 text-gray-900">{Number(row.duration_hours).toFixed(2)} {L("hrs", "மணி")}</td>
                    <td className="py-1 px-1 font-medium text-primary">{cumulative.toFixed(2)}</td>
                    <td className="py-1 px-1 text-gray-600">{row.notes || "—"}</td>
                    <td className="py-1 px-1 whitespace-nowrap">
                      <button onClick={() => openEdit(row)} className="mr-2 hover:text-primary">✏️</button>
                      <button onClick={() => remove(row.id)} className="hover:text-danger">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{editingId ? L("Edit Usage Entry", "பயன்பாட்டைத் திருத்து") : L("Add Usage Entry", "பயன்பாடு சேர்க்க")}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Date", "தேதி")} *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{L("Start Time", "தொடக்க நேரம்")} *</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{L("End Time", "முடிவு நேரம்")} *</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                </div>
              </div>
              {startTime && endTime && (
                <p className={`text-xs font-semibold ${durationValid ? "text-success" : "text-danger"}`}>
                  {durationValid
                    ? `${L("Duration", "கால அளவு")}: ${durationHrs} ${L("hrs", "மணி")} ${durationMins} ${L("mins", "நிமிடம்")}`
                    : L("End time must be after start time.", "முடிவு நேரம் தொடக்க நேரத்திற்குப் பிறகு இருக்க வேண்டும்.")}
                </p>
              )}
              <div>
                <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MAINTENANCE TAB ====================
function MaintenanceTab({
  lang,
  L,
  totalHours,
  engineOil,
  refetchEngineOil,
}: {
  lang: "ta" | "en";
  L: (en: string, ta: string) => string;
  totalHours: number;
  engineOil: TractorEngineOil[];
  refetchEngineOil: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <EngineOilSection L={L} totalHours={totalHours} engineOil={engineOil} refetch={refetchEngineOil} />
      <MachineryRecordSection
        lang={lang}
        table="tractor_gear_oil"
        titleEn="Gear Oil Change"
        titleTa="கியர் ஆயில் மாற்றம்"
        icon="🛢️"
        dateField="service_date"
        fields={[
          { key: "service_date", en: "Service Date", ta: "சேவை தேதி", type: "date", required: true },
          { key: "quantity_litres", en: "Quantity (litres)", ta: "அளவு (லிட்டர்)", type: "number" },
          { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
        ]}
      />
      <MachineryRecordSection
        lang={lang}
        table="tractor_hydraulic_oil"
        titleEn="Hydraulic Oil Change"
        titleTa="ஹைட்ராலிக் ஆயில் மாற்றம்"
        icon="🛢️"
        dateField="service_date"
        fields={[
          { key: "service_date", en: "Service Date", ta: "சேவை தேதி", type: "date", required: true },
          { key: "quantity_litres", en: "Quantity (litres)", ta: "அளவு (லிட்டர்)", type: "number" },
          { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
        ]}
      />
      <MachineryRecordSection
        lang={lang}
        table="tractor_battery"
        titleEn="Battery Replacement"
        titleTa="பேட்டரி மாற்றம்"
        icon="🔋"
        dateField="replacement_date"
        showLastDate
        fields={[
          { key: "replacement_date", en: "Date", ta: "தேதி", type: "date", required: true },
          { key: "battery_brand", en: "Battery Brand/Model", ta: "பேட்டரி பிராண்ட்/மாடல்", type: "text" },
          { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
        ]}
      />
      <MachineryRecordSection
        lang={lang}
        table="tractor_tyre"
        titleEn="Tyre Replacement"
        titleTa="டயர் மாற்றம்"
        icon="🛞"
        dateField="replacement_date"
        fields={[
          { key: "replacement_date", en: "Date", ta: "தேதி", type: "date", required: true },
          { key: "tyre_brand", en: "Tyre Brand", ta: "டயர் பிராண்ட்", type: "text" },
          { key: "quantity", en: "Quantity", ta: "எண்ணிக்கை", type: "number" },
          { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
        ]}
      />
      <MachineryRecordSection
        lang={lang}
        table="tractor_repairs"
        titleEn="Miscellaneous Repairs"
        titleTa="இதர பழுதுபார்ப்பு"
        icon="🔧"
        dateField="date"
        fields={[
          { key: "date", en: "Date", ta: "தேதி", type: "date", required: true },
          {
            key: "description",
            en: "Description",
            ta: "விவரம்",
            type: "text",
            required: true,
            placeholderEn: "e.g. Electrical repair, Switch replacement, Bearing replacement",
            placeholderTa: "எ.கா. மின் பழுது, சுவிட்ச் மாற்றம், பேரிங் மாற்றம்",
          },
          { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
        ]}
      />
    </div>
  );
}

// ==================== ENGINE OIL (custom — counter reset logic) ====================
function EngineOilSection({
  L,
  totalHours,
  engineOil,
  refetch,
}: {
  L: (en: string, ta: string) => string;
  totalHours: number;
  engineOil: TractorEngineOil[];
  refetch: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [serviceDate, setServiceDate] = useState("");
  const [oilBrand, setOilBrand] = useState("");
  const [quantity, setQuantity] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingHours, setExistingHours] = useState<number | null>(null);

  const totalSpent = engineOil.reduce((s, r) => s + Number(r.cost), 0);

  const openAdd = () => {
    setEditingId(null);
    setServiceDate("");
    setOilBrand("");
    setQuantity("");
    setCost("");
    setNotes("");
    setExistingHours(null);
    setModalOpen(true);
  };
  const openEdit = (r: TractorEngineOil) => {
    setEditingId(r.id);
    setServiceDate(r.service_date);
    setOilBrand(r.oil_brand ?? "");
    setQuantity(r.quantity_litres != null ? String(r.quantity_litres) : "");
    setCost(String(r.cost));
    setNotes(r.notes ?? "");
    setExistingHours(Number(r.hours_at_service));
    setModalOpen(true);
  };

  const save = async () => {
    if (!serviceDate || !cost) {
      alert(L("Service date and cost are required.", "சேவை தேதி மற்றும் செலவு தேவை."));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        service_date: serviceDate || null,
        oil_brand: oilBrand.trim() || null,
        quantity_litres: quantity ? parseFloat(quantity) : null,
        cost: parseFloat(cost) || null,
        hours_at_service: editingId && existingHours != null ? existingHours : totalHours,
        notes: notes.trim() || null,
      };
      const { error } = editingId
        ? await supabase.from("tractor_engine_oil").update(payload).eq("id", editingId)
        : await supabase.from("tractor_engine_oil").insert(payload);
      if (error) {
        console.error("Error saving engine oil:", error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setModalOpen(false);
        refetch();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm(L("Delete this record? This will affect the oil change counter.", "இந்த பதிவை நீக்கவா? இது ஆயில் கவுண்டரை பாதிக்கும்."))) return;
    const { error } = await supabase.from("tractor_engine_oil").delete().eq("id", id);
    if (!error) refetch();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-800">🛢️ {L("Engine Oil Change", "எஞ்சின் ஆயில் மாற்றம்")}</h2>
        <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
          + {L("Add", "சேர்க்க")}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">{L("Total Spent", "மொத்த செலவு")}: <span className="font-semibold text-danger">{inr(totalSpent)}</span></p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
              <th className="py-1 px-1">{L("Date", "தேதி")}</th>
              <th className="py-1 px-1">{L("Brand", "பிராண்ட்")}</th>
              <th className="py-1 px-1">{L("Qty", "அளவு")}</th>
              <th className="py-1 px-1">{L("Cost", "செலவு")}</th>
              <th className="py-1 px-1">{L("Hours at Service", "சேவை நேரம்")}</th>
              <th className="py-1 px-1"></th>
            </tr>
          </thead>
          <tbody>
            {engineOil.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-500">🛢️ {L("No records yet", "பதிவுகள் இல்லை")}</td></tr>
            ) : (
              engineOil.map((r) => (
                <tr key={r.id} className="border-b border-gray-50">
                  <td className="py-1 px-1 text-gray-900">{formatDMY(r.service_date)}</td>
                  <td className="py-1 px-1 text-gray-900">{r.oil_brand || "—"}</td>
                  <td className="py-1 px-1 text-gray-900">{r.quantity_litres ?? "—"}</td>
                  <td className="py-1 px-1 text-danger font-medium">{inr(Number(r.cost))}</td>
                  <td className="py-1 px-1 text-gray-900">{Number(r.hours_at_service).toFixed(1)}</td>
                  <td className="py-1 px-1 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="mr-2 hover:text-primary">✏️</button>
                    <button onClick={() => remove(r.id)} className="hover:text-danger">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{editingId ? L("Edit Engine Oil Change", "திருத்து") : L("Add Engine Oil Change", "எஞ்சின் ஆயில் சேர்க்க")}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Service Date", "சேவை தேதி")} *</label>
                <input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Oil Brand", "ஆயில் பிராண்ட்")}</label>
                <input type="text" value={oilBrand} onChange={(e) => setOilBrand(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Quantity (litres)", "அளவு (லிட்டர்)")}</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Cost (₹)", "செலவு (₹)")} *</label>
                <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              {!editingId && (
                <p className="text-[11px] text-gray-500">
                  {L(`This will record ${totalHours.toFixed(1)} hrs as the service point and reset the oil change counter.`, `இது ${totalHours.toFixed(1)} மணி நேரத்தை சேவை புள்ளியாக பதிவு செய்து கவுண்டரை மீட்டமைக்கும்.`)}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PHOTOS TAB ====================
function PhotosTab({ L }: { L: (en: string, ta: string) => string }) {
  const [photos, setPhotos] = useState<TractorPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    const { data } = await supabase.from("tractor_photos").select("*").order("id", { ascending: false });
    if (data) setPhotos(data);
    setLoading(false);
  };

  const openAdd = () => {
    setTitle("");
    setNotes("");
    setFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const save = async () => {
    if (!title.trim() || !file) {
      alert(L("Title and photo are required.", "தலைப்பு மற்றும் புகைப்படம் தேவை."));
      return;
    }
    setSaving(true);
    try {
      const base64 = await convertToBase64(file);
      const { error } = await supabase.from("tractor_photos").insert({
        title: title.trim(),
        photo_url: base64,
        notes: notes.trim() || null,
      });
      if (error) {
        console.error("Error saving photo record:", error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setModalOpen(false);
        fetchPhotos();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm(L("Delete this photo?", "இந்த புகைப்படத்தை நீக்கவா?"))) return;
    const { error } = await supabase.from("tractor_photos").delete().eq("id", id);
    if (!error) fetchPhotos();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
          + {L("Upload Reference Photo", "புகைப்படம் பதிவேற்ற")}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
          <div className="text-4xl mb-2">📷</div>
          {L("No photos yet. Upload one above.", "புகைப்படங்கள் இல்லை. மேலே பதிவேற்றவும்.")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={p.title} className="w-full h-32 object-cover cursor-pointer" onClick={() => setViewerUrl(p.photo_url)} />
              <div className="p-2">
                <p className="text-xs font-bold text-gray-900">{p.title}</p>
                {p.notes && <p className="text-[11px] text-gray-500 mt-0.5">{p.notes}</p>}
                <button onClick={() => remove(p.id)} className="text-[11px] text-danger hover:underline mt-1">{L("Delete", "நீக்கு")}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewerUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewerUrl(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewerUrl} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{L("Upload Reference Photo", "புகைப்படம் பதிவேற்ற")}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Title", "தலைப்பு")} *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Notes / Instructions", "குறிப்பு / வழிமுறை")}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>{L("Photo", "புகைப்படம்")} *</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors duration-200">
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-gray-700 font-medium text-sm">
                      {L("Click to upload photo", "புகைப்படம் பதிவேற்ற கிளிக் செய்யவும்")}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      {file ? `✅ ${file.name}` : L("JPG, PNG supported (max 2MB recommended)", "JPG, PNG ஆதரிக்கப்படும் (அதிகபட்சம் 2MB பரிந்துரைக்கப்படுகிறது)")}
                    </p>
                  </div>
                </div>
                {file && file.size > MAX_RECOMMENDED_PHOTO_BYTES && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    ⚠️ {L("Photo is large and may slow the app. Please use a compressed image under 2MB.", "புகைப்படம் பெரியது, செயலியை மெதுவாக்கலாம். 2MB க்கும் குறைவான சுருக்கப்பட்ட படத்தை பயன்படுத்தவும்.")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

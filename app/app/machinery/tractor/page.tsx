"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import AnimatedCard from "../../../components/AnimatedCard";
import EmptyState from "../../../components/EmptyState";
import { SuccessCheckmark } from "../../../components/SuccessAnimation";
import { SkeletonCard } from "../../../components/Skeleton";
import { supabase } from "../../../lib/supabase";
import { useLang } from "../../../lib/useLang";
import { getTractorOilStatus, type TractorOilStatus } from "../../../lib/tractorOilStatus";

type Tractor = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  registration_number: string | null;
  photo: string | null;
};

const BRANDS = ["Mahindra", "John Deere", "Sonalika", "TAFE", "Eicher", "New Holland", "Indo Farm", "Other"];

const inputCls =
  "w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500";
const labelCls = "text-xs text-gray-600 dark:text-gray-400 mb-1 block";

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  year: "",
  price: "",
  regNumber: "",
  engineNumber: "",
  chassisNumber: "",
  insuranceNumber: "",
  insuranceExpiry: "",
  oilInterval: "300",
  notes: "",
};

export default function TractorListPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [tractors, setTractors] = useState<Tractor[]>([]);
  const [oilStatuses, setOilStatuses] = useState<Record<string, TractorOilStatus>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchTractors();
  }, []);

  const fetchTractors = async () => {
    setLoading(true);
    const { data } = await supabase.from("tractors").select("*").eq("is_active", true).order("created_at", { ascending: false });
    if (data) {
      setTractors(data);
      const entries = await Promise.all(data.map(async (t) => [t.id, await getTractorOilStatus(t.id)] as const));
      setOilStatuses(Object.fromEntries(entries));
    }
    setLoading(false);
  };

  const resetForm = () => setForm(emptyForm);

  const handleAddTractor = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tractors").insert({
        name: form.name.trim(),
        brand: form.brand || null,
        model: form.model.trim() || null,
        year_of_purchase: form.year ? parseInt(form.year, 10) : null,
        purchase_price: form.price ? parseFloat(form.price) : null,
        registration_number: form.regNumber.trim() || null,
        engine_number: form.engineNumber.trim() || null,
        chassis_number: form.chassisNumber.trim() || null,
        insurance_number: form.insuranceNumber.trim() || null,
        insurance_expiry: form.insuranceExpiry || null,
        oil_change_interval_hours: form.oilInterval ? parseFloat(form.oilInterval) : 300,
        notes: form.notes.trim() || null,
        is_active: true,
      });
      if (error) {
        console.error("Error saving tractor:", error);
        toast.error(L("Could not save", "சேமிக்க முடியவில்லை"));
      } else {
        toast.success(L("Tractor added!", "டிராக்டர் சேர்க்கப்பட்டது!"));
        setShowAddForm(false);
        resetForm();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchTractors();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save", "சேமிக்க முடியவில்லை"));
    }
    setSaving(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/machinery" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back to Machinery", "இயந்திரங்களுக்கு திரும்பு")}
            </Link>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h1 className="text-xl font-bold text-primary dark:text-gray-100">🚜 {L("Tractors", "டிராக்டர்கள்")}</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition"
            >
              + {L("Add Tractor", "டிராக்டர் சேர்")}
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <>
              {tractors.map((tractor, i) => {
                const oilStatus = oilStatuses[tractor.id];
                return (
                  <AnimatedCard key={tractor.id} delay={Math.min(i, 8) * 0.05}>
                    <div
                      onClick={() => router.push(`/machinery/tractor/${tractor.id}`)}
                      className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-green-400 transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {tractor.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={tractor.photo} alt={tractor.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl">🚜</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{tractor.name}</h3>
                          <p className="text-sm text-gray-500">{[tractor.brand, tractor.model].filter(Boolean).join(" ") || "—"}</p>
                          {tractor.registration_number && (
                            <p className="text-xs text-gray-400 mt-1">🔢 {tractor.registration_number}</p>
                          )}
                        </div>

                        <span className="text-gray-400">→</span>
                      </div>

                      {oilStatus && (
                        <div
                          className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 ${
                            oilStatus.isUrgent
                              ? "bg-red-50 text-red-600 dark:bg-red-900/20"
                              : oilStatus.isWarning
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                              : "bg-green-50 text-green-600 dark:bg-green-900/20"
                          }`}
                        >
                          <span>{oilStatus.isUrgent ? "🚨" : oilStatus.isWarning ? "⚠️" : "✅"}</span>
                          <span>
                            {oilStatus.isUrgent
                              ? L(`Oil change urgent! Only ${oilStatus.hoursRemaining.toFixed(1)} hrs left!`, `எண்ணெய் உடனே மாற்றவும்! ${oilStatus.hoursRemaining.toFixed(1)} மணி மட்டுமே!`)
                              : oilStatus.isWarning
                              ? L(`Oil change soon - ${oilStatus.hoursRemaining.toFixed(1)} hrs left`, `எண்ணெய் விரைவில் மாற்றவும் - ${oilStatus.hoursRemaining.toFixed(1)} மணி மட்டுமே`)
                              : L(`Oil OK - ${oilStatus.hoursRemaining.toFixed(1)} hrs remaining`, `எண்ணெய் நிலை சரி - ${oilStatus.hoursRemaining.toFixed(1)} மணி உள்ளது`)}
                          </span>
                        </div>
                      )}
                    </div>
                  </AnimatedCard>
                );
              })}

              {tractors.length === 0 && !showAddForm && (
                <EmptyState
                  type="machinery"
                  title={L("No tractors added yet", "டிராக்டர் எதுவும் சேர்க்கப்படவில்லை")}
                  subtitle={L("Add your first tractor", "உங்கள் முதல் டிராக்டரை சேர்க்கவும்")}
                  action={{ label: `+ ${L("Add Tractor", "டிராக்டர் சேர்")}`, onClick: () => setShowAddForm(true) }}
                />
              )}
            </>
          )}
        </div>
      </main>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">🚜 {L("Add New Tractor", "புதிய டிராக்டர் சேர்")}</h3>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Tractor Name *", "டிராக்டர் பெயர் *")}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mahindra 575 DI"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>{L("Brand", "பிராண்ட்")}</label>
                <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={inputCls}>
                  <option value="">{L("Select Brand", "பிராண்ட் தேர்வு")}</option>
                  {BRANDS.map((b) => (
                    <option key={b} value={b}>
                      {b === "Other" ? L("Other", "மற்றவை") : b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>{L("Model", "மாடல்")}</label>
                <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. 575 DI" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Year of Purchase", "வாங்கிய ஆண்டு")}</label>
                <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 2020" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Purchase Price (₹)", "வாங்கிய விலை (₹)")}</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Registration Number", "பதிவு எண்")}</label>
                <input
                  type="text"
                  value={form.regNumber}
                  onChange={(e) => setForm({ ...form, regNumber: e.target.value })}
                  placeholder="e.g. TN 28 BX 1234"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>{L("Engine Number", "இயந்திர எண்")}</label>
                <input type="text" value={form.engineNumber} onChange={(e) => setForm({ ...form, engineNumber: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Chassis Number", "சேஸி எண்")}</label>
                <input type="text" value={form.chassisNumber} onChange={(e) => setForm({ ...form, chassisNumber: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Insurance Number", "காப்பீடு எண்")}</label>
                <input type="text" value={form.insuranceNumber} onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Insurance Expiry", "காப்பீடு முடிவு தேதி")}</label>
                <input type="date" value={form.insuranceExpiry} onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Engine Oil Change Interval (Hours)", "எண்ணெய் மாற்று இடைவெளி (மணி நேரம்)")}</label>
                <input type="number" value={form.oilInterval} onChange={(e) => setForm({ ...form, oilInterval: e.target.value })} placeholder="300" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>{L("Notes", "குறிப்புகள்")}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-sm font-medium"
              >
                {L("Cancel", "ரத்து")}
              </button>
              <button
                onClick={handleAddTractor}
                disabled={!form.name.trim() || saving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? "..." : L("Save", "சேமி")}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessCheckmark show={showSuccess} message={L("Tractor added!", "டிராக்டர் சேர்க்கப்பட்டது!")} />
    </div>
  );
}

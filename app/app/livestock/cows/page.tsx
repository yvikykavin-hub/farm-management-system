"use client";

import toast from "react-hot-toast";
import PageWrapper from "../../../components/PageWrapper";
import AnimatedCard from "../../../components/AnimatedCard";
import { SkeletonCard } from "../../../components/Skeleton";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabase";
import { t } from "../../../lib/labels";

type Cow = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  date_of_birth: string | null;
  gender: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
};

type MilkCollection = { cow_id: string; collection_date: string; morning_litres: number; evening_litres: number };
type MilkRate = { cow_id: string; rate_per_litre: number; effective_from: string };
type CowExpense = { cow_id: string; expense_date: string; amount: number };

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  deceased: "bg-gray-200 text-gray-600",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

const emptyForm = {
  name: "",
  tag_number: "",
  breed: "",
  date_of_birth: "",
  gender: "",
  purchase_date: "",
  purchase_price: "",
  current_status: "active",
  notes: "",
};

const rateForDate = (rates: MilkRate[], date: string) => {
  const applicable = rates.filter((r) => r.effective_from <= date).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return applicable.length ? Number(applicable[0].rate_per_litre) : 0;
};

export default function CowsListPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const [cows, setCows] = useState<Cow[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [rates, setRates] = useState<MilkRate[]>([]);
  const [expenses, setExpenses] = useState<CowExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: cowData, error } = await supabase.from("cows").select("*").order("created_at", { ascending: false });
    if (!error && cowData) {
      setCows(cowData);
      const ids = cowData.map((c: Cow) => c.id);
      if (ids.length > 0) {
        const [{ data: coll }, { data: rt }, { data: exp }] = await Promise.all([
          supabase.from("milk_collections").select("cow_id, collection_date, morning_litres, evening_litres").in("cow_id", ids),
          supabase.from("milk_rates").select("cow_id, rate_per_litre, effective_from").in("cow_id", ids),
          supabase.from("cow_expenses").select("cow_id, expense_date, amount").in("cow_id", ids),
        ]);
        if (coll) setCollections(coll);
        if (rt) setRates(rt);
        if (exp) setExpenses(exp);
      }
    }
    setLoading(false);
  };

  const totalCows = cows.length;
  const activeCows = cows.filter((c) => c.current_status === "active").length;
  const soldCows = cows.filter((c) => c.current_status === "sold").length;
  const deceasedCows = cows.filter((c) => c.current_status === "deceased").length;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthIncome = collections
    .filter((c) => c.collection_date.startsWith(monthPrefix))
    .reduce((sum, c) => {
      const cowRates = rates.filter((r) => r.cow_id === c.cow_id);
      const rate = rateForDate(cowRates, c.collection_date);
      return sum + (Number(c.morning_litres) + Number(c.evening_litres)) * rate;
    }, 0);

  const thisMonthExpenses = expenses
    .filter((e) => e.expense_date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const netPL = thisMonthIncome - thisMonthExpenses;

  const avgLitresPerDay = (cowId: string) => {
    const cowCollections = collections.filter((c) => c.cow_id === cowId);
    if (cowCollections.length === 0) return 0;
    const total = cowCollections.reduce((sum, c) => sum + Number(c.morning_litres) + Number(c.evening_litres), 0);
    return total / cowCollections.length;
  };

  const openAddModal = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const saveCow = async () => {
    const errors: Record<string, boolean> = {
      name: !form.name.trim(),
      gender: !form.gender,
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      toast.error(t(lang, "nameGenderRequired"));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("cows").insert({
        farm_location: "Home",
        name: form.name.trim(),
        tag_number: form.tag_number.trim() || null,
        breed: form.breed.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        current_status: form.current_status,
        notes: form.notes.trim() || null,
      });
      if (error) {
        console.error("Error saving cow: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setModalOpen(false);
        fetchAll();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSaving(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PageWrapper>
        <div className="max-w-6xl mx-auto flex flex-col gap-4">

          {/* Back */}
          <Link href="/livestock" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToLivestock")}
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-primary">🐄 {t(lang, "cows")}</h1>
              <p className="text-sm text-gray-500">{t(lang, "livestock")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "ta" ? "en" : "ta")}
                className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
              >
                {lang === "ta" ? "English" : "தமிழ்"}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/profile-photo.png" alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-green-200 cursor-pointer" />
              <button
                onClick={openAddModal}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition"
              >
                + {t(lang, "addCow")}
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "totalCows")}</p>
              <p className="text-xl font-bold text-gray-800">{totalCows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "active")}</p>
              <p className="text-xl font-bold text-success">{activeCows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "sold")}</p>
              <p className="text-xl font-bold text-blue-600">{soldCows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "deceased")}</p>
              <p className="text-xl font-bold text-gray-500">{deceasedCows}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "monthMilkIncome")}</p>
              <p className="text-xl font-bold text-success">{inr(thisMonthIncome)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "monthExpenses")}</p>
              <p className="text-xl font-bold text-danger">{inr(thisMonthExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "netPL")}</p>
              <p className={`text-xl font-bold ${netPL >= 0 ? "text-success" : "text-danger"}`}>{inr(netPL)}</p>
            </div>
          </div>

          {/* Cow cards */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : cows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4 opacity-60">🐄</div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">{t(lang, "noCowsYet")}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cows.map((cow, i) => (
                <AnimatedCard key={cow.id} delay={Math.min(i, 8) * 0.05}>
                <Link href={`/livestock/cows/${cow.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] p-3 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">🐄 {cow.name}</h3>
                        <p className="text-xs text-gray-500">{cow.tag_number || "—"}</p>
                      </div>
                      <span className={`${STATUS_BADGE[cow.current_status] ?? STATUS_BADGE.active} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                        {cow.current_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{cow.breed || "—"}</p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      {t(lang, "avgPerDay")}: {avgLitresPerDay(cow.id).toFixed(1)} L
                    </p>
                  </div>
                </Link>
                </AnimatedCard>
              ))}
            </div>
          )}
        </div>
        </PageWrapper>
      </main>

      {/* Add Cow Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "addCow")}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t(lang, "name")} *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`${inputCls} ${formErrors.name ? "border-danger" : ""}`}
                />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "gender")} *</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={`${inputCls} ${formErrors.gender ? "border-danger" : ""}`}
                >
                  <option value="">{t(lang, "select")}</option>
                  <option value="Female">{t(lang, "female")}</option>
                  <option value="Male">{t(lang, "male")}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "tagNumber")}</label>
                <input type="text" value={form.tag_number} onChange={(e) => setForm({ ...form, tag_number: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "breed")}</label>
                <input type="text" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "dateOfBirth")}</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "purchaseDate")}</label>
                <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "purchasePrice")}</label>
                <input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "status")}</label>
                <select value={form.current_status} onChange={(e) => setForm({ ...form, current_status: e.target.value })} className={inputCls}>
                  <option value="active">{t(lang, "active")}</option>
                  <option value="sold">{t(lang, "sold")}</option>
                  <option value="deceased">{t(lang, "deceased")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t(lang, "notes")}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={saveCow}
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-xl py-2.5 text-sm font-semibold transition"
              >
                {saving ? "..." : t(lang, "save")}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition"
              >
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

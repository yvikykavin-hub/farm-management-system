"use client";

import toast from "react-hot-toast";
import AnimatedCard from "../../../components/AnimatedCard";
import { SkeletonCard } from "../../../components/Skeleton";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import PullToRefresh from "../../../components/PullToRefresh";
import MilkCollectionSection from "../../../components/MilkCollectionSection";
import MilkIncomeSection from "../../../components/MilkIncomeSection";
import CattleExpensesSection from "../../../components/CattleExpensesSection";
import { supabase } from "../../../lib/supabase";
import { t } from "../../../lib/labels";
import { useLang } from "../../../lib/useLang";

type AnimalType = "cow" | "buffalo";

type Cow = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  gender: string | null;
  date_of_birth: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
  animal_type: AnimalType | null;
};

type MilkCollectionRow = { collection_date: string; daily_income: number | null };
type CowExpenseRow = { expense_date: string; amount: number };

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

export default function CowsListPage() {
  const [lang, setLang] = useLang();
  const [cows, setCows] = useState<Cow[]>([]);
  const [milkRows, setMilkRows] = useState<MilkCollectionRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<CowExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"animals" | "milk" | "income" | "expenses">("animals");
  const [milkType, setMilkType] = useState<AnimalType>("cow");
  const [incomeType, setIncomeType] = useState<AnimalType>("cow");

  const [modalOpen, setModalOpen] = useState(false);
  const [addAnimalType, setAddAnimalType] = useState<AnimalType>("cow");
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data: cowData, error } = await supabase.from("cows").select("*").order("created_at", { ascending: false });
    if (!error && cowData) setCows(cowData);
    const [{ data: milk }, { data: exp }] = await Promise.all([
      supabase.from("milk_collections").select("collection_date, daily_income"),
      supabase.from("cow_expenses").select("expense_date, amount"),
    ]);
    if (milk) setMilkRows(milk);
    if (exp) setExpenseRows(exp);
    setLoading(false);
  };

  const cowsList = cows.filter((c) => c.animal_type === "buffalo" ? false : true);
  const buffaloesList = cows.filter((c) => c.animal_type === "buffalo");
  const hasBuffaloes = buffaloesList.some((c) => c.current_status === "active");

  const totalCows = cows.length;
  const activeCows = cows.filter((c) => c.current_status === "active").length;
  const soldCows = cows.filter((c) => c.current_status === "sold").length;
  const deceasedCows = cows.filter((c) => c.current_status === "deceased").length;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthIncome = milkRows
    .filter((m) => m.collection_date.startsWith(monthPrefix))
    .reduce((sum, m) => sum + Number(m.daily_income ?? 0), 0);

  const thisMonthExpenses = expenseRows
    .filter((e) => e.expense_date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const netPL = thisMonthIncome - thisMonthExpenses;

  const openAddModal = (type: AnimalType) => {
    setAddAnimalType(type);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t(lang, "deleteConfirmAnimal"))) return;

    const { error } = await supabase.from("cows").delete().eq("id", id);

    if (error) {
      toast.error(t(lang, "couldNotDelete"));
    } else {
      toast.success(t(lang, "deletedSuccessfully"));
      fetchAll();
    }
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
        animal_type: addAnimalType,
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

  const renderAnimalCard = (cow: Cow, i: number, emoji: string) => (
    <AnimatedCard key={cow.id} delay={Math.min(i, 8) * 0.05}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-3">
        <div className="flex items-start justify-between">
          <Link href={`/livestock/cows/${cow.id}`} className="flex-1 cursor-pointer">
            <h3 className="text-sm font-bold text-gray-900">{emoji} {cow.name}</h3>
            <p className="text-xs text-gray-500">{cow.tag_number || "—"}</p>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`${STATUS_BADGE[cow.current_status] ?? STATUS_BADGE.active} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
              {cow.current_status}
            </span>
            <button onClick={() => handleDelete(cow.id)} className="text-red-400 hover:text-red-600 transition-colors duration-200 p-1">
              🗑️
            </button>
          </div>
        </div>
        <Link href={`/livestock/cows/${cow.id}`} className="cursor-pointer">
          <p className="text-xs text-gray-600 mt-1">{cow.breed || "—"}</p>
        </Link>
      </div>
    </AnimatedCard>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PullToRefresh onRefresh={fetchAll} language={lang}>
        <div className="max-w-6xl mx-auto flex flex-col gap-4">

          <Link href="/livestock" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToLivestock")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-primary">🐄 {t(lang, "cows")}</h1>
              <p className="text-sm text-gray-500">{t(lang, "livestock")}</p>
            </div>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
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

          {/* Main tabs */}
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["animals", `🐄 ${t(lang, "animalsTab")}`],
              ["milk", `🥛 ${t(lang, "milkCollection")}`],
              ["income", `💰 ${t(lang, "income")}`],
              ["expenses", `💸 ${t(lang, "expenses")}`],
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

          {/* ANIMALS TAB */}
          {activeTab === "animals" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-gray-700">🐄 {t(lang, "cows")}</h2>
                  <button onClick={() => openAddModal("cow")} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition">
                    + {t(lang, "addCow")}
                  </button>
                </div>
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : cowsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-5xl mb-3 opacity-60">🐄</div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">{t(lang, "noCowsYet")}</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cowsList.map((cow, i) => renderAnimalCard(cow, i, "🐄"))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-bold text-gray-700">🐃 {t(lang, "buffalo")}</h2>
                  <button onClick={() => openAddModal("buffalo")} className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition">
                    + {t(lang, "addBuffalo")}
                  </button>
                </div>
                {!loading && buffaloesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="text-5xl mb-3 opacity-60">🐃</div>
                    <h3 className="text-base font-semibold text-gray-700 mb-1">{t(lang, "noBuffaloAddedYet")}</h3>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {buffaloesList.map((cow, i) => renderAnimalCard(cow, i, "🐃"))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MILK COLLECTION TAB */}
          {activeTab === "milk" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
                <button
                  onClick={() => setMilkType("cow")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${milkType === "cow" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  🐄 {t(lang, "cowMilk")}
                </button>
                <button
                  onClick={() => setMilkType("buffalo")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${milkType === "buffalo" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  🐃 {t(lang, "buffaloMilk")}
                </button>
              </div>

              {milkType === "buffalo" && !hasBuffaloes ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
                  <div className="text-4xl opacity-60">🐃</div>
                  <p className="text-sm text-gray-600">{t(lang, "noBuffaloAddedYet")}</p>
                  <button
                    onClick={() => { setActiveTab("animals"); }}
                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-2 text-xs font-semibold transition"
                  >
                    + {t(lang, "addBuffalo")}
                  </button>
                </div>
              ) : (
                <MilkCollectionSection animalType={milkType} lang={lang} />
              )}
            </div>
          )}

          {/* INCOME TAB */}
          {activeTab === "income" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
                <button
                  onClick={() => setIncomeType("cow")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${incomeType === "cow" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  🐄 {t(lang, "cowIncome")}
                </button>
                <button
                  onClick={() => setIncomeType("buffalo")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${incomeType === "buffalo" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  🐃 {t(lang, "buffaloIncome")}
                </button>
              </div>

              {incomeType === "buffalo" && !hasBuffaloes ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center gap-3">
                  <div className="text-4xl opacity-60">🐃</div>
                  <p className="text-sm text-gray-600">{t(lang, "noBuffaloAddedYet")}</p>
                </div>
              ) : (
                <MilkIncomeSection animalType={incomeType} lang={lang} />
              )}
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && <CattleExpensesSection lang={lang} />}
        </div>
        </PullToRefresh>
      </main>

      {/* Add Cow/Buffalo Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">
                {addAnimalType === "buffalo" ? `🐃 ${t(lang, "addBuffalo")}` : `🐄 ${t(lang, "addCow")}`}
              </h2>
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

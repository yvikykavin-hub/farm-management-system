"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabase";
import { t } from "../../../lib/labels";

type Hen = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  gender: string | null;
  date_of_birth: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  weight: number | null;
  current_status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
};

type HenSale = { hen_id: string; total_amount: number };
type HenExpense = { hen_id: string; amount: number };

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
  gender: "",
  date_of_birth: "",
  purchase_date: "",
  purchase_price: "",
  weight: "",
  current_status: "active",
  notes: "",
};

export default function HensListPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const [hens, setHens] = useState<Hen[]>([]);
  const [sales, setSales] = useState<HenSale[]>([]);
  const [expenses, setExpenses] = useState<HenExpense[]>([]);
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
    const { data: henData, error } = await supabase.from("hens").select("*").order("created_at", { ascending: false });
    if (!error && henData) {
      setHens(henData);
      const ids = henData.map((h: Hen) => h.id);
      if (ids.length > 0) {
        const [{ data: saleData }, { data: expData }] = await Promise.all([
          supabase.from("hen_sales").select("hen_id, total_amount").in("hen_id", ids),
          supabase.from("hen_expenses").select("hen_id, amount").in("hen_id", ids),
        ]);
        if (saleData) setSales(saleData);
        if (expData) setExpenses(expData);
      }
    }
    setLoading(false);
  };

  const totalHens = hens.length;
  const activeHens = hens.filter((h) => h.current_status === "active").length;
  const soldHens = hens.filter((h) => h.current_status === "sold").length;

  const totalIncome = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netPL = totalIncome - totalExpense;

  const openAddModal = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const saveHen = async () => {
    const errors: Record<string, boolean> = {
      name: !form.name.trim(),
      gender: !form.gender,
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      alert(t(lang, "nameGenderRequired"));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("hens").insert({
        farm_location: "Home",
        name: form.name.trim(),
        tag_number: form.tag_number.trim() || null,
        breed: form.breed.trim() || null,
        gender: form.gender,
        date_of_birth: form.date_of_birth || null,
        purchase_date: form.purchase_date || null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        current_status: form.current_status,
        notes: form.notes.trim() || null,
      });
      if (error) alert("Error saving hen: " + error.message);
      else {
        setModalOpen(false);
        fetchAll();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSaving(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">

          <Link href="/livestock" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToLivestock")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-primary">🐔 {t(lang, "hens")}</h1>
              <p className="text-sm text-gray-500">{t(lang, "livestock")}</p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              + {t(lang, "addHen")}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "total")}</p>
              <p className="text-xl font-bold text-gray-800">{totalHens}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "active")}</p>
              <p className="text-xl font-bold text-success">{activeHens}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "sold")}</p>
              <p className="text-xl font-bold text-blue-600">{soldHens}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "income")}</p>
              <p className="text-xl font-bold text-success">{inr(totalIncome)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "expense")}</p>
              <p className="text-xl font-bold text-danger">{inr(totalExpense)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "netPL")}</p>
              <p className={`text-xl font-bold ${netPL >= 0 ? "text-success" : "text-danger"}`}>{inr(netPL)}</p>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : hens.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
              <div className="text-4xl mb-2">🐔</div>
              {t(lang, "noHensYet")}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hens.map((hen) => (
                <Link key={hen.id} href={`/livestock/hens/${hen.id}`}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md transition p-3 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">🐔 {hen.name}</h3>
                        <p className="text-xs text-gray-500">{hen.tag_number || "—"}</p>
                      </div>
                      <span className={`${STATUS_BADGE[hen.current_status] ?? STATUS_BADGE.active} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                        {hen.current_status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{hen.breed || "—"}</p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      {t(lang, "weight")}: {hen.weight != null ? `${hen.weight} kg` : "—"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "addHen")}</h2>
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
                <label className={labelCls}>{t(lang, "weight")}</label>
                <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputCls} />
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
              <button onClick={saveHen} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-xl py-2.5 text-sm font-semibold transition">
                {saving ? "..." : t(lang, "save")}
              </button>
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition">
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

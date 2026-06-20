"use client";

import { useState, useEffect } from "react";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabase";
import { t } from "../../../lib/labels";

type GeneralExpense = {
  id: string;
  farm_location: string;
  expense_date: string;
  expense_type: string;
  vendor_name: string | null;
  item_description: string | null;
  quoted_amount: number;
  final_amount: number | null;
  status: string;
  notes: string | null;
};

const FARM_LOCATIONS = ["V. Karukkampalaiyam", "Thevalikadu"];
const EXPENSE_TYPE_KEYS = ["electricity", "water", "labour", "equipment", "repairs", "transport", "miscellaneous"] as const;
const STATUS_OPTIONS = ["Accepted", "Pending", "Rejected"] as const;
const STATUS_BADGE: Record<string, string> = {
  Accepted: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-gray-200 text-gray-600",
};
const STATUS_LABEL_KEY: Record<string, "accepted" | "pending" | "rejected"> = {
  Accepted: "accepted",
  Pending: "pending",
  Rejected: "rejected",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

const emptyForm = {
  farm_location: "",
  expense_date: "",
  expense_type: "electricity" as typeof EXPENSE_TYPE_KEYS[number],
  vendor_name: "",
  item_description: "",
  quoted_amount: "",
  final_amount: "",
  status: "Pending",
  notes: "",
};

export default function GeneralExpensesPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const [expenses, setExpenses] = useState<GeneralExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [farmFilter, setFarmFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Accepted" | "Pending" | "Rejected">("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("livestock_general_expenses").select("*").order("expense_date", { ascending: false });
    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  const farmFiltered = farmFilter ? expenses.filter((e) => e.farm_location === farmFilter) : expenses;
  const filteredExpenses = statusFilter === "All" ? farmFiltered : farmFiltered.filter((e) => e.status === statusFilter);

  const amountFor = (e: GeneralExpense) => Number(e.final_amount ?? e.quoted_amount);

  const totalAccepted = farmFiltered.filter((e) => e.status === "Accepted").reduce((s, e) => s + amountFor(e), 0);
  const totalPending = farmFiltered.filter((e) => e.status === "Pending").reduce((s, e) => s + amountFor(e), 0);
  const totalRejected = farmFiltered.filter((e) => e.status === "Rejected").reduce((s, e) => s + amountFor(e), 0);

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (e: GeneralExpense) => {
    setEditingId(e.id);
    setForm({
      farm_location: e.farm_location,
      expense_date: e.expense_date,
      expense_type: (EXPENSE_TYPE_KEYS.find((k) => t("en", k) === e.expense_type) ?? "electricity") as typeof EXPENSE_TYPE_KEYS[number],
      vendor_name: e.vendor_name ?? "",
      item_description: e.item_description ?? "",
      quoted_amount: String(e.quoted_amount),
      final_amount: e.final_amount != null ? String(e.final_amount) : "",
      status: e.status,
      notes: e.notes ?? "",
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const needsFinalAmountPrompt = form.status === "Accepted" && !form.final_amount;

  const saveExpense = async () => {
    const errors: Record<string, boolean> = {
      farm_location: !form.farm_location,
      expense_date: !form.expense_date,
      quoted_amount: !form.quoted_amount,
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    try {
      const payload = {
        farm_location: form.farm_location,
        expense_date: form.expense_date,
        expense_type: t("en", form.expense_type),
        vendor_name: form.vendor_name.trim() || null,
        item_description: form.item_description.trim() || null,
        quoted_amount: parseFloat(form.quoted_amount) || 0,
        final_amount: form.final_amount ? parseFloat(form.final_amount) : null,
        status: form.status,
        notes: form.notes.trim() || null,
      };
      const { error } = editingId
        ? await supabase.from("livestock_general_expenses").update(payload).eq("id", editingId)
        : await supabase.from("livestock_general_expenses").insert(payload);
      if (error) {
        console.error("Error saving expense: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setModalOpen(false);
        fetchAll();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSaving(false);
  };

  const deleteExpense = async (id: string) => {
    if (!confirm(t(lang, "deleteConfirmExpense"))) return;
    const { error } = await supabase.from("livestock_general_expenses").delete().eq("id", id);
    if (error) {
      console.error("Error: ", error);
      alert(t(lang, "saveFailedMessage"));
    }
    else fetchAll();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-primary">🏦 {t(lang, "generalExpensesFull")}</h1>
              <p className="text-sm text-gray-500">{t(lang, "livestock")}</p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition"
            >
              + {t(lang, "addExpense")}
            </button>
          </div>

          {/* Farm filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFarmFilter("")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                farmFilter === "" ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t(lang, "allFarmsShort")}
            </button>
            {FARM_LOCATIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFarmFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  farmFilter === f ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {(["All", "Accepted", "Pending", "Rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  statusFilter === s ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {s === "All" ? t(lang, "all") : t(lang, STATUS_LABEL_KEY[s])}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "totalAccepted")}</p>
              <p className="text-xl font-bold text-success">{inr(totalAccepted)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "totalPending")}</p>
              <p className="text-xl font-bold text-amber-600">{inr(totalPending)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-3">
              <p className="text-xs font-medium text-gray-500">{t(lang, "totalRejected")}</p>
              <p className="text-xl font-bold text-gray-500">{inr(totalRejected)}</p>
            </div>
          </div>

          {/* Expenses table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                      <th className="py-1 px-1">{t(lang, "farm")}</th>
                      <th className="py-1 px-1">{t(lang, "date")}</th>
                      <th className="py-1 px-1">{t(lang, "type")}</th>
                      <th className="py-1 px-1">{t(lang, "vendor")}</th>
                      <th className="py-1 px-1">{t(lang, "description")}</th>
                      <th className="py-1 px-1">{t(lang, "quoted")}</th>
                      <th className="py-1 px-1">{t(lang, "final")}</th>
                      <th className="py-1 px-1">{t(lang, "status")}</th>
                      <th className="py-1 px-1">{t(lang, "notes")}</th>
                      <th className="py-1 px-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-8 text-gray-500">🐄 {t(lang, "noExpensesYet")}</td></tr>
                    ) : (
                      filteredExpenses.map((e) => (
                        <tr key={e.id} className="border-b border-gray-50">
                          <td className="py-1 px-1">{e.farm_location}</td>
                          <td className="py-1 px-1">{formatDMY(e.expense_date)}</td>
                          <td className="py-1 px-1">{e.expense_type}</td>
                          <td className="py-1 px-1">{e.vendor_name || "—"}</td>
                          <td className="py-1 px-1">{e.item_description || "—"}</td>
                          <td className="py-1 px-1">{inr(Number(e.quoted_amount))}</td>
                          <td className="py-1 px-1">{e.final_amount != null ? inr(Number(e.final_amount)) : "—"}</td>
                          <td className="py-1 px-1">
                            <span className={`${STATUS_BADGE[e.status] ?? STATUS_BADGE.Pending} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                              {e.status}
                            </span>
                          </td>
                          <td className="py-1 px-1">{e.notes || "—"}</td>
                          <td className="py-1 px-1 whitespace-nowrap">
                            <button onClick={() => openEditModal(e)} className="mr-2 hover:text-primary">✏️</button>
                            <button onClick={() => deleteExpense(e.id)} className="hover:text-danger">🗑️</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">
                {editingId ? t(lang, "editExpense") : t(lang, "addExpense")}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t(lang, "farmLocation")} *</label>
                <select
                  value={form.farm_location}
                  onChange={(e) => setForm({ ...form, farm_location: e.target.value })}
                  className={`${inputCls} ${formErrors.farm_location ? "border-danger" : ""}`}
                >
                  <option value="">{t(lang, "select")}</option>
                  {FARM_LOCATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "date")} *</label>
                <input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                  className={`${inputCls} ${formErrors.expense_date ? "border-danger" : ""}`}
                />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "expenseType")}</label>
                <select value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value as typeof EXPENSE_TYPE_KEYS[number] })} className={inputCls}>
                  {EXPENSE_TYPE_KEYS.map((k) => <option key={k} value={k}>{t(lang, k)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "vendorName")}</label>
                <input type="text" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t(lang, "itemDescription")}</label>
                <input type="text" value={form.item_description} onChange={(e) => setForm({ ...form, item_description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "quotedAmount")} *</label>
                <input
                  type="number"
                  value={form.quoted_amount}
                  onChange={(e) => setForm({ ...form, quoted_amount: e.target.value })}
                  className={`${inputCls} ${formErrors.quoted_amount ? "border-danger" : ""}`}
                />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "finalAmount")}</label>
                <input type="number" value={form.final_amount} onChange={(e) => setForm({ ...form, final_amount: e.target.value })} className={inputCls} />
                {needsFinalAmountPrompt && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    ⚠️ {t(lang, "finalAmountPrompt")}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>{t(lang, "status")}</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(lang, STATUS_LABEL_KEY[s])}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{t(lang, "notes")}</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={saveExpense} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-xl py-2.5 text-sm font-semibold transition">
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

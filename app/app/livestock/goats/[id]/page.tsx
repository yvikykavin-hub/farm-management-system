"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import { supabase } from "../../../../lib/supabase";
import { t } from "../../../../lib/labels";

type Goat = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  gender: string | null;
  date_of_birth: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  weight: number | null;
  status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
};

type GoatSale = {
  id: string;
  goat_id: string;
  sale_date: string;
  weight: number | null;
  rate_per_kg: number | null;
  total_amount: number;
  buyer_name: string | null;
  remarks: string | null;
};

type GoatExpense = {
  id: string;
  goat_id: string;
  expense_type: string;
  expense_date: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
  description: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  deceased: "bg-gray-200 text-gray-600",
};
const EXPENSE_TYPE_KEYS = ["feed", "brownLeafRolls", "medicine", "vaccination", "veterinary", "other"] as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function GoatDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lang, setLang] = useState<"ta" | "en">("en");
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "income" | "expenses">("overview");

  const [sales, setSales] = useState<GoatSale[]>([]);
  const [goatExpenses, setGoatExpenses] = useState<GoatExpense[]>([]);

  useEffect(() => {
    if (id) {
      fetchGoat();
      fetchSales();
      fetchExpenses();
    }
  }, [id]);

  const fetchGoat = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("goats").select("*").eq("id", id).single();
    if (!error && data) setGoat(data);
    setLoading(false);
  };
  const fetchSales = async () => {
    const { data } = await supabase.from("goat_sales").select("*").eq("goat_id", id).order("sale_date", { ascending: false });
    if (data) setSales(data);
  };
  const fetchExpenses = async () => {
    const { data } = await supabase.from("goat_expenses").select("*").eq("goat_id", id).order("expense_date", { ascending: false });
    if (data) setGoatExpenses(data);
  };

  const totalIncome = sales.reduce((s, sale) => s + Number(sale.total_amount), 0);
  const totalExpenses = goatExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const purchasePrice = goat?.purchase_price != null ? Number(goat.purchase_price) : 0;
  const netPL = totalIncome - purchasePrice - totalExpenses;

  // ---------------- Overview ----------------
  const [editingOverview, setEditingOverview] = useState(false);
  const [ovForm, setOvForm] = useState<Record<string, string>>({});
  const [savingOverview, setSavingOverview] = useState(false);

  const startEditOverview = () => {
    if (!goat) return;
    setOvForm({
      name: goat.name,
      tag_number: goat.tag_number ?? "",
      breed: goat.breed ?? "",
      gender: goat.gender ?? "",
      date_of_birth: goat.date_of_birth ?? "",
      purchase_date: goat.purchase_date ?? "",
      purchase_price: goat.purchase_price != null ? String(goat.purchase_price) : "",
      weight: goat.weight != null ? String(goat.weight) : "",
      status: goat.status,
      sold_date: goat.sold_date ?? "",
      sold_price: goat.sold_price != null ? String(goat.sold_price) : "",
      notes: goat.notes ?? "",
    });
    setEditingOverview(true);
  };

  const saveOverview = async () => {
    if (!ovForm.name.trim() || !ovForm.gender) {
      alert(t(lang, "nameGenderRequired"));
      return;
    }
    setSavingOverview(true);
    try {
      const { error } = await supabase
        .from("goats")
        .update({
          name: ovForm.name.trim(),
          tag_number: ovForm.tag_number.trim() || null,
          breed: ovForm.breed.trim() || null,
          gender: ovForm.gender,
          date_of_birth: ovForm.date_of_birth || null,
          purchase_date: ovForm.purchase_date || null,
          purchase_price: ovForm.purchase_price ? parseFloat(ovForm.purchase_price) : null,
          weight: ovForm.weight ? parseFloat(ovForm.weight) : null,
          status: ovForm.status,
          sold_date: ovForm.status === "sold" ? ovForm.sold_date || null : null,
          sold_price: ovForm.status === "sold" && ovForm.sold_price ? parseFloat(ovForm.sold_price) : null,
          notes: ovForm.notes.trim() || null,
        })
        .eq("id", id);
      if (error) alert("Error saving: " + error.message);
      else {
        setEditingOverview(false);
        fetchGoat();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSavingOverview(false);
  };

  // ---------------- Income (Sales) ----------------
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleDate, setSaleDate] = useState("");
  const [saleWeight, setSaleWeight] = useState("");
  const [saleRate, setSaleRate] = useState("");
  const [saleTotal, setSaleTotal] = useState("");
  const [saleBuyer, setSaleBuyer] = useState("");
  const [saleRemarks, setSaleRemarks] = useState("");
  const [savingSale, setSavingSale] = useState(false);
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(false);

  const computedTotal = (parseFloat(saleWeight) || 0) * (parseFloat(saleRate) || 0);

  const openAddSale = () => {
    setSaleDate("");
    setSaleWeight("");
    setSaleRate("");
    setSaleTotal("");
    setSaleBuyer("");
    setSaleRemarks("");
    setTotalManuallyEdited(false);
    setSaleModalOpen(true);
  };

  const saveSale = async () => {
    if (!saleDate) {
      alert(t(lang, "dateRequired"));
      return;
    }
    setSavingSale(true);
    try {
      const total = totalManuallyEdited ? parseFloat(saleTotal) || 0 : computedTotal;
      const { error } = await supabase.from("goat_sales").insert({
        goat_id: id,
        sale_date: saleDate,
        weight: saleWeight ? parseFloat(saleWeight) : null,
        rate_per_kg: saleRate ? parseFloat(saleRate) : null,
        total_amount: total,
        buyer_name: saleBuyer.trim() || null,
        remarks: saleRemarks.trim() || null,
      });
      if (error) alert("Error saving sale: " + error.message);
      else {
        setSaleModalOpen(false);
        fetchSales();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSavingSale(false);
  };

  const deleteSale = async (sid: string) => {
    if (!confirm(t(lang, "deleteConfirmSale"))) return;
    const { error } = await supabase.from("goat_sales").delete().eq("id", sid);
    if (error) alert("Error: " + error.message);
    else fetchSales();
  };

  // ---------------- Expenses ----------------
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expType, setExpType] = useState<typeof EXPENSE_TYPE_KEYS[number]>("feed");
  const [expDate, setExpDate] = useState("");
  const [expQty, setExpQty] = useState("");
  const [expUnit, setExpUnit] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const openAddExpense = () => {
    setExpType("feed");
    setExpDate("");
    setExpQty("");
    setExpUnit("");
    setExpAmount("");
    setExpDescription("");
    setExpenseModalOpen(true);
  };

  const saveExpense = async () => {
    if (!expDate || !expAmount) {
      alert(t(lang, "dateAmountRequired"));
      return;
    }
    setSavingExpense(true);
    try {
      const { error } = await supabase.from("goat_expenses").insert({
        goat_id: id,
        expense_type: t("en", expType),
        expense_date: expDate,
        quantity: expQty ? parseFloat(expQty) : null,
        unit: expUnit.trim() || null,
        amount: parseFloat(expAmount) || 0,
        description: expDescription.trim() || null,
      });
      if (error) alert("Error saving expense: " + error.message);
      else {
        setExpenseModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      alert("Unexpected error: " + (err instanceof Error ? err.message : String(err)));
    }
    setSavingExpense(false);
  };

  const deleteExpense = async (eid: string) => {
    if (!confirm(t(lang, "deleteConfirmExpense"))) return;
    const { error } = await supabase.from("goat_expenses").delete().eq("id", eid);
    if (error) alert("Error: " + error.message);
    else fetchExpenses();
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar lang={lang} setLang={setLang} />
        <main className="flex-1 p-4 flex flex-col gap-3">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/livestock/goats" className="text-primary hover:text-primary/80 text-sm font-semibold">
              ← {t(lang, "backToGoats")}
            </Link>
            <h1 className="text-xl font-bold text-primary">🐐 {goat?.name}</h1>
            <span className={`${STATUS_BADGE[goat?.status ?? "active"]} text-xs font-semibold px-2 py-1 rounded-full`}>
              {goat?.status}
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3">
            <p className="text-xs text-gray-500">{t(lang, "netPL")}</p>
            <p className={`text-xl font-bold ${netPL >= 0 ? "text-success" : "text-danger"}`}>{inr(netPL)}</p>
          </div>

          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["overview", t(lang, "overview")],
              ["income", t(lang, "income")],
              ["expenses", t(lang, "expenses")],
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800">{t(lang, "details")}</h2>
                {!editingOverview && (
                  <button onClick={startEditOverview} className="text-xs font-semibold text-primary hover:text-primary/80">
                    ✏️ {t(lang, "edit")}
                  </button>
                )}
              </div>

              {!editingOverview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{t(lang, "tagNumber")}:</span> <span className="font-medium text-gray-800">{goat?.tag_number || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "breed")}:</span> <span className="font-medium text-gray-800">{goat?.breed || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "gender")}:</span> <span className="font-medium text-gray-800">{goat?.gender || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "dateOfBirth")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.date_of_birth)}</span></div>
                  <div><span className="text-gray-500">{t(lang, "weight")}:</span> <span className="font-medium text-gray-800">{goat?.weight != null ? `${goat.weight} kg` : "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "purchaseDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.purchase_date)}</span></div>
                  <div><span className="text-gray-500">{t(lang, "purchasePrice")}:</span> <span className="font-medium text-gray-800">{goat?.purchase_price != null ? inr(Number(goat.purchase_price)) : "—"}</span></div>
                  {goat?.status === "sold" && (
                    <>
                      <div><span className="text-gray-500">{t(lang, "soldDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.sold_date)}</span></div>
                      <div><span className="text-gray-500">{t(lang, "soldPrice")}:</span> <span className="font-medium text-gray-800">{goat?.sold_price != null ? inr(Number(goat.sold_price)) : "—"}</span></div>
                    </>
                  )}
                  <div className="sm:col-span-2"><span className="text-gray-500">{t(lang, "notes")}:</span> <span className="font-medium text-gray-800">{goat?.notes || "—"}</span></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t(lang, "name")} *</label>
                    <input type="text" value={ovForm.name} onChange={(e) => setOvForm({ ...ovForm, name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "gender")} *</label>
                    <select value={ovForm.gender} onChange={(e) => setOvForm({ ...ovForm, gender: e.target.value })} className={inputCls}>
                      <option value="">{t(lang, "select")}</option>
                      <option value="Female">{t(lang, "female")}</option>
                      <option value="Male">{t(lang, "male")}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "tagNumber")}</label>
                    <input type="text" value={ovForm.tag_number} onChange={(e) => setOvForm({ ...ovForm, tag_number: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "breed")}</label>
                    <input type="text" value={ovForm.breed} onChange={(e) => setOvForm({ ...ovForm, breed: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "dateOfBirth")}</label>
                    <input type="date" value={ovForm.date_of_birth} onChange={(e) => setOvForm({ ...ovForm, date_of_birth: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "purchaseDate")}</label>
                    <input type="date" value={ovForm.purchase_date} onChange={(e) => setOvForm({ ...ovForm, purchase_date: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "purchasePrice")}</label>
                    <input type="number" value={ovForm.purchase_price} onChange={(e) => setOvForm({ ...ovForm, purchase_price: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "weight")}</label>
                    <input type="number" value={ovForm.weight} onChange={(e) => setOvForm({ ...ovForm, weight: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "status")}</label>
                    <select value={ovForm.status} onChange={(e) => setOvForm({ ...ovForm, status: e.target.value })} className={inputCls}>
                      <option value="active">{t(lang, "active")}</option>
                      <option value="sold">{t(lang, "sold")}</option>
                      <option value="deceased">{t(lang, "deceased")}</option>
                    </select>
                  </div>
                  {ovForm.status === "sold" && (
                    <>
                      <div>
                        <label className={labelCls}>{t(lang, "soldDate")}</label>
                        <input type="date" value={ovForm.sold_date} onChange={(e) => setOvForm({ ...ovForm, sold_date: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{t(lang, "soldPrice")}</label>
                        <input type="number" value={ovForm.sold_price} onChange={(e) => setOvForm({ ...ovForm, sold_price: e.target.value })} className={inputCls} />
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{t(lang, "notes")}</label>
                    <textarea value={ovForm.notes} onChange={(e) => setOvForm({ ...ovForm, notes: e.target.value })} className={inputCls} rows={2} />
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <button onClick={saveOverview} disabled={savingOverview} className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-2 text-sm font-semibold transition">
                      {savingOverview ? "..." : t(lang, "save")}
                    </button>
                    <button onClick={() => setEditingOverview(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold transition">
                      {t(lang, "cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INCOME TAB */}
          {activeTab === "income" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-xs text-gray-500">{t(lang, "totalIncome")}</p>
                <p className="text-lg font-bold text-success">{inr(totalIncome)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-800">{t(lang, "salesHistory")}</h2>
                  <button onClick={openAddSale} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                    + {t(lang, "addSale")}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                        <th className="py-1 px-1">{t(lang, "date")}</th>
                        <th className="py-1 px-1">{t(lang, "weight")}</th>
                        <th className="py-1 px-1">{t(lang, "rateperKg")}</th>
                        <th className="py-1 px-1">{t(lang, "totalLitres")}</th>
                        <th className="py-1 px-1">{t(lang, "buyerName")}</th>
                        <th className="py-1 px-1">{t(lang, "remarks")}</th>
                        <th className="py-1 px-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-6 text-gray-500">🐐 {t(lang, "noSalesYet")}</td></tr>
                      ) : (
                        sales.map((s) => (
                          <tr key={s.id} className="border-b border-gray-50">
                            <td className="py-1 px-1">{formatDMY(s.sale_date)}</td>
                            <td className="py-1 px-1">{s.weight ?? "—"}</td>
                            <td className="py-1 px-1">{s.rate_per_kg != null ? inr(Number(s.rate_per_kg)) : "—"}</td>
                            <td className="py-1 px-1 font-medium text-success">{inr(Number(s.total_amount))}</td>
                            <td className="py-1 px-1">{s.buyer_name || "—"}</td>
                            <td className="py-1 px-1">{s.remarks || "—"}</td>
                            <td className="py-1 px-1">
                              <button onClick={() => deleteSale(s.id)} className="hover:text-danger">🗑️</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-xs text-gray-500">{t(lang, "totalExpense")}</p>
                <p className="text-lg font-bold text-danger">{inr(totalExpenses)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-800">{t(lang, "expenseRecords")}</h2>
                  <button onClick={openAddExpense} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                    + {t(lang, "addExpense")}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                        <th className="py-1 px-1">{t(lang, "date")}</th>
                        <th className="py-1 px-1">{t(lang, "type")}</th>
                        <th className="py-1 px-1">{t(lang, "quantity")}</th>
                        <th className="py-1 px-1">{t(lang, "unit")}</th>
                        <th className="py-1 px-1">{t(lang, "amount")}</th>
                        <th className="py-1 px-1">{t(lang, "description")}</th>
                        <th className="py-1 px-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {goatExpenses.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-6 text-gray-500">🐐 {t(lang, "noExpensesYet")}</td></tr>
                      ) : (
                        goatExpenses.map((e) => (
                          <tr key={e.id} className="border-b border-gray-50">
                            <td className="py-1 px-1">{formatDMY(e.expense_date)}</td>
                            <td className="py-1 px-1">{e.expense_type}</td>
                            <td className="py-1 px-1">{e.quantity ?? "—"}</td>
                            <td className="py-1 px-1">{e.unit || "—"}</td>
                            <td className="py-1 px-1 text-danger font-medium">{inr(Number(e.amount))}</td>
                            <td className="py-1 px-1">{e.description || "—"}</td>
                            <td className="py-1 px-1">
                              <button onClick={() => deleteExpense(e.id)} className="hover:text-danger">🗑️</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Add Sale Modal */}
      {saleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "addSale")}</h2>
              <button onClick={() => setSaleModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{t(lang, "date")}</label>
                <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t(lang, "weight")}</label>
                  <input type="number" value={saleWeight} onChange={(e) => setSaleWeight(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t(lang, "rateperKg")}</label>
                  <input type="number" value={saleRate} onChange={(e) => setSaleRate(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "totalAmount")}</label>
                <input
                  type="number"
                  value={totalManuallyEdited ? saleTotal : computedTotal.toFixed(2)}
                  onChange={(e) => {
                    setTotalManuallyEdited(true);
                    setSaleTotal(e.target.value);
                  }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "buyerName")}</label>
                <input type="text" value={saleBuyer} onChange={(e) => setSaleBuyer(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "remarks")}</label>
                <input type="text" value={saleRemarks} onChange={(e) => setSaleRemarks(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveSale} disabled={savingSale} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingSale ? "..." : t(lang, "save")}
                </button>
                <button onClick={() => setSaleModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {t(lang, "cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "addExpense")}</h2>
              <button onClick={() => setExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{t(lang, "expenseType")}</label>
                <select value={expType} onChange={(e) => setExpType(e.target.value as typeof EXPENSE_TYPE_KEYS[number])} className={inputCls}>
                  {EXPENSE_TYPE_KEYS.map((k) => <option key={k} value={k}>{t(lang, k)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "date")}</label>
                <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t(lang, "quantity")}</label>
                  <input type="number" value={expQty} onChange={(e) => setExpQty(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t(lang, "unit")}</label>
                  <input type="text" value={expUnit} onChange={(e) => setExpUnit(e.target.value)} className={inputCls} placeholder="kg / bag / etc" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "amount")}</label>
                <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "description")}</label>
                <input type="text" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveExpense} disabled={savingExpense} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingExpense ? "..." : t(lang, "save")}
                </button>
                <button onClick={() => setExpenseModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {t(lang, "cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

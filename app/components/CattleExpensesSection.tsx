"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { t } from "../lib/labels";

type CowExpense = {
  id: string;
  expense_date: string;
  expense_type: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
  vendor_name: string | null;
  description: string | null;
  notes: string | null;
};

const EXPENSE_TYPE_KEYS = ["riceFeed", "normalFeed", "veterinary", "medicine", "vaccination", "ai", "shedMaintenance", "other"] as const;
const EXPENSE_TYPE_VALUES: Record<typeof EXPENSE_TYPE_KEYS[number], string> = {
  riceFeed: "rice_feed",
  normalFeed: "normal_feed",
  veterinary: "veterinary",
  medicine: "medicine",
  vaccination: "vaccination",
  ai: "ai",
  shedMaintenance: "shed_maintenance",
  other: "other",
};
const FEED_TYPE_KEYS = ["riceFeed", "normalFeed"] as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function CattleExpensesSection({ lang }: { lang: "ta" | "en" }) {
  const [expenses, setExpenses] = useState<CowExpense[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase.from("cow_expenses").select("*").order("expense_date", { ascending: false });
    if (data) setExpenses(data);
  };

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(monthPrefix));
  const totalExpenseAll = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const expenseTotalsByType = EXPENSE_TYPE_KEYS.map((key) => ({
    key,
    total: monthExpenses.filter((e) => e.expense_type === EXPENSE_TYPE_VALUES[key]).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((e) => e.total > 0);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expType, setExpType] = useState<typeof EXPENSE_TYPE_KEYS[number]>("riceFeed");
  const [expDate, setExpDate] = useState("");
  const [expQty, setExpQty] = useState("");
  const [expUnit, setExpUnit] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expVendor, setExpVendor] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const isFeedType = (FEED_TYPE_KEYS as readonly string[]).includes(expType);

  const openAddExpense = () => {
    setExpType("riceFeed");
    setExpDate("");
    setExpQty("");
    setExpUnit("");
    setExpAmount("");
    setExpVendor("");
    setExpDescription("");
    setExpenseModalOpen(true);
  };

  const saveExpense = async () => {
    if (!expDate || !expAmount) {
      toast.error(t(lang, "dateAmountRequired"));
      return;
    }
    setSavingExpense(true);
    try {
      const payload = {
        farm_location: "Home",
        expense_date: expDate || null,
        expense_type: EXPENSE_TYPE_VALUES[expType] || null,
        quantity: isFeedType && expQty ? parseFloat(expQty) : null,
        unit: isFeedType ? expUnit.trim() || null : null,
        amount: parseFloat(expAmount) || null,
        vendor_name: expVendor.trim() || null,
        description: expDescription.trim() || null,
        notes: null,
      };
      const { error } = await supabase.from("cow_expenses").insert(payload);
      if (error) {
        console.error("Error saving expense: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setExpenseModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingExpense(false);
  };

  const deleteExpense = async (eid: string) => {
    if (!confirm(t(lang, "deleteConfirmExpense"))) return;
    const { error } = await supabase.from("cow_expenses").delete().eq("id", eid);
    if (error) {
      console.error("Error: ", error);
      toast.error(t(lang, "saveFailedMessage"));
    } else fetchExpenses();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-gray-500">{t(lang, "thisMonth")} {t(lang, "totalExpense")}</p>
          <p className="text-lg font-bold text-danger">{inr(totalExpenseAll)}</p>
        </div>
        <button onClick={openAddExpense} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
          + {t(lang, "addExpense")}
        </button>
      </div>

      {expenseTotalsByType.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {expenseTotalsByType.map(({ key, total }) => (
            <span key={key} className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-100">
              {t(lang, key)}: {inr(total)}
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">{t(lang, "expenseRecords")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                <th className="py-1 px-1">{t(lang, "date")}</th>
                <th className="py-1 px-1">{t(lang, "type")}</th>
                <th className="py-1 px-1">{t(lang, "qty")}</th>
                <th className="py-1 px-1">{t(lang, "unit")}</th>
                <th className="py-1 px-1">{t(lang, "amount")}</th>
                <th className="py-1 px-1">{t(lang, "vendor")}</th>
                <th className="py-1 px-1">{t(lang, "description")}</th>
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-500">🐄 {t(lang, "noExpensesYet")}</td></tr>
              ) : (
                expenses.map((e) => {
                  const typeKey = EXPENSE_TYPE_KEYS.find((k) => EXPENSE_TYPE_VALUES[k] === e.expense_type);
                  return (
                    <tr key={e.id} className="border-b border-gray-50 text-gray-900">
                      <td className="py-1 px-1 text-gray-700">{formatDMY(e.expense_date)}</td>
                      <td className="py-1 px-1 text-gray-700">{typeKey ? t(lang, typeKey) : e.expense_type}</td>
                      <td className="py-1 px-1 text-gray-900">{e.quantity ?? "—"}</td>
                      <td className="py-1 px-1 text-gray-700">{e.unit ?? "—"}</td>
                      <td className="py-1 px-1 text-red-600 font-medium">{inr(Number(e.amount))}</td>
                      <td className="py-1 px-1 text-gray-700">{e.vendor_name ?? "—"}</td>
                      <td className="py-1 px-1 text-gray-700">{e.description ?? "—"}</td>
                      <td className="py-1 px-1">
                        <button onClick={() => deleteExpense(e.id)} className="hover:text-danger">🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              {isFeedType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t(lang, "quantityOptional")}</label>
                    <input type="number" value={expQty} onChange={(e) => setExpQty(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "unit")}</label>
                    <input type="text" value={expUnit} onChange={(e) => setExpUnit(e.target.value)} className={inputCls} placeholder="kg" />
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>{t(lang, "amount")}</label>
                <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "vendorName")}</label>
                <input type="text" value={expVendor} onChange={(e) => setExpVendor(e.target.value)} className={inputCls} />
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

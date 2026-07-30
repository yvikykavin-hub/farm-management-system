"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import ExportButton from "./ExportButton";
import { t } from "../lib/labels";

type MilkPayment = {
  id: string;
  payment_date: string;
  period_from: string;
  period_to: string;
  milkman_name: string;
  total_litres: number;
  expected_amount: number;
  received_amount: number;
  payment_status: string;
  remarks: string | null;
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-700",
  pending: "bg-red-100 text-red-700",
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

export default function MilkIncomeSection({ animalType, lang }: { animalType: "cow" | "buffalo"; lang: "ta" | "en" }) {
  const paymentsTable = animalType === "buffalo" ? "buffalo_milk_payments" : "milk_payments";

  const [payments, setPayments] = useState<MilkPayment[]>([]);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalType]);

  const fetchPayments = async () => {
    const { data } = await supabase.from(paymentsTable).select("*").order("payment_date", { ascending: false });
    if (data) setPayments(data);
  };

  const totalExpected = payments.reduce((s, p) => s + Number(p.expected_amount), 0);
  const totalReceived = payments.reduce((s, p) => s + Number(p.received_amount), 0);
  const outstanding = totalExpected - totalReceived;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthLitres = payments.filter((p) => p.payment_date.startsWith(monthPrefix)).reduce((s, p) => s + Number(p.total_litres), 0);

  // ---------------- Add / Edit payment ----------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pmDate, setPmDate] = useState("");
  const [pmFrom, setPmFrom] = useState("");
  const [pmTo, setPmTo] = useState("");
  const [pmMilkman, setPmMilkman] = useState("");
  const [pmLitres, setPmLitres] = useState("");
  const [pmRate, setPmRate] = useState("");
  const [pmReceived, setPmReceived] = useState("");
  const [pmStatus, setPmStatus] = useState("pending");
  const [pmRemarks, setPmRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const pmExpected = (parseFloat(pmLitres) || 0) * (parseFloat(pmRate) || 0);
  const pmDifference = (parseFloat(pmReceived) || 0) - pmExpected;

  const openAddPayment = () => {
    setEditingPaymentId(null);
    setPmDate("");
    setPmFrom("");
    setPmTo("");
    setPmMilkman("");
    setPmLitres("");
    setPmRate("");
    setPmReceived("");
    setPmStatus("pending");
    setPmRemarks("");
    setPaymentModalOpen(true);
  };

  const openEditPayment = (p: MilkPayment) => {
    setEditingPaymentId(p.id);
    setPmDate(p.payment_date);
    setPmFrom(p.period_from);
    setPmTo(p.period_to);
    setPmMilkman(p.milkman_name);
    setPmLitres(String(p.total_litres));
    setPmRate(Number(p.total_litres) ? String(Number(p.expected_amount) / Number(p.total_litres)) : "");
    setPmReceived(String(p.received_amount));
    setPmStatus(p.payment_status);
    setPmRemarks(p.remarks ?? "");
    setPaymentModalOpen(true);
  };

  const savePayment = async () => {
    if (!pmDate || !pmReceived) {
      toast.error(t(lang, "paymentFieldsRequired"));
      return;
    }
    setSavingPayment(true);
    try {
      const payload: Record<string, unknown> = {
        payment_date: pmDate || null,
        period_from: pmFrom || null,
        period_to: pmTo || null,
        milkman_name: pmMilkman.trim() || null,
        total_litres: parseFloat(pmLitres) || null,
        expected_amount: pmExpected || null,
        received_amount: parseFloat(pmReceived) || null,
        payment_status: pmStatus || "pending",
        remarks: pmRemarks.trim() || null,
      };
      if (animalType === "cow") payload.farm_location = "Home";
      const { error } = editingPaymentId
        ? await supabase.from(paymentsTable).update(payload).eq("id", editingPaymentId)
        : await supabase.from(paymentsTable).insert(payload);
      if (error) {
        console.error("Error saving payment: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setPaymentModalOpen(false);
        fetchPayments();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingPayment(false);
  };

  const deletePayment = async (pid: string) => {
    if (!confirm(t(lang, "deleteConfirmPayment"))) return;
    const { error } = await supabase.from(paymentsTable).delete().eq("id", pid);
    if (error) {
      console.error("Error: ", error);
      toast.error(t(lang, "saveFailedMessage"));
    } else fetchPayments();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{t(lang, "totalExpected")}</p>
          <p className="text-lg font-bold text-gray-800">{inr(totalExpected)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{t(lang, "totalReceived")}</p>
          <p className="text-lg font-bold text-success">{inr(totalReceived)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{t(lang, "outstanding")}</p>
          <p className={`text-lg font-bold ${outstanding > 0 ? "text-danger" : "text-success"}`}>{inr(outstanding)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3">
          <p className="text-xs text-gray-500">{t(lang, "thisMonth")} {t(lang, "totalLitres")}</p>
          <p className="text-lg font-bold text-gray-800">{thisMonthLitres.toFixed(1)} L</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800">{t(lang, "income")}</h2>
          <div className="flex items-center gap-2">
            <ExportButton data={payments} filename={`${animalType === "cow" ? t(lang, "cowMilk") : t(lang, "buffaloMilk")}-Payments`} sheetName="Milk Payments" language={lang} />
            <button onClick={openAddPayment} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
              + {t(lang, "addPayment")}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                <th className="py-1 px-1">{t(lang, "date")}</th>
                <th className="py-1 px-1">{t(lang, "periodFrom")}</th>
                <th className="py-1 px-1">{t(lang, "milkmanName")}</th>
                <th className="py-1 px-1">{t(lang, "totalLitres")}</th>
                <th className="py-1 px-1">{t(lang, "rate")}</th>
                <th className="py-1 px-1">{t(lang, "expectedAmount")}</th>
                <th className="py-1 px-1">{t(lang, "receivedAmount")}</th>
                <th className="py-1 px-1">{t(lang, "difference")}</th>
                <th className="py-1 px-1">{t(lang, "status")}</th>
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-6 text-gray-500">🐄 {t(lang, "noPaymentsYet")}</td></tr>
              ) : (
                payments.map((p) => {
                  const diff = Number(p.received_amount) - Number(p.expected_amount);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 text-gray-900">
                      <td className="py-1 px-1 text-gray-700">{formatDMY(p.payment_date)}</td>
                      <td className="py-1 px-1 text-gray-700">{formatDMY(p.period_from)} → {formatDMY(p.period_to)}</td>
                      <td className="py-1 px-1 text-gray-700">{p.milkman_name}</td>
                      <td className="py-1 px-1 text-gray-900">{Number(p.total_litres).toFixed(1)} L</td>
                      <td className="py-1 px-1 text-gray-700">{Number(p.total_litres) ? inr(Number(p.expected_amount) / Number(p.total_litres)) : "—"}</td>
                      <td className="py-1 px-1 text-gray-700">{inr(Number(p.expected_amount))}</td>
                      <td className="py-1 px-1 font-medium text-green-600">{inr(Number(p.received_amount))}</td>
                      <td className={`py-1 px-1 font-medium ${diff < 0 ? "text-red-600" : "text-green-600"}`}>{inr(diff)}</td>
                      <td className="py-1 px-1">
                        <span className={`${PAYMENT_STATUS_BADGE[p.payment_status] ?? PAYMENT_STATUS_BADGE.pending} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                          {p.payment_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-1 px-1 whitespace-nowrap">
                        <button onClick={() => openEditPayment(p)} className="mr-2 hover:text-primary">✏️</button>
                        <button onClick={() => deletePayment(p.id)} className="hover:text-danger">🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{editingPaymentId ? t(lang, "editPayment") : t(lang, "addPayment")}</h2>
              <button onClick={() => setPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t(lang, "paymentDate")}</label>
                <input type="date" value={pmDate} onChange={(e) => setPmDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "milkmanName")}</label>
                <input type="text" value={pmMilkman} onChange={(e) => setPmMilkman(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "periodFrom")}</label>
                <input type="date" value={pmFrom} onChange={(e) => setPmFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "periodTo")}</label>
                <input type="date" value={pmTo} onChange={(e) => setPmTo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "totalLitres")}</label>
                <input type="number" value={pmLitres} onChange={(e) => setPmLitres(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "rate")} ({t(lang, "perLitre")}, ₹)</label>
                <input type="number" value={pmRate} onChange={(e) => setPmRate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "expectedAmount")}</label>
                <input type="number" value={pmExpected.toFixed(2)} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "receivedAmount")}</label>
                <input type="number" value={pmReceived} onChange={(e) => setPmReceived(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <p className={`text-xs font-semibold ${pmDifference < 0 ? "text-danger" : "text-success"}`}>
                  {t(lang, "difference")}: {inr(pmDifference)}
                </p>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "paymentStatus")}</label>
                <select value={pmStatus} onChange={(e) => setPmStatus(e.target.value)} className={inputCls}>
                  <option value="paid">{t(lang, "paid")}</option>
                  <option value="partially_paid">{t(lang, "partiallyPaid")}</option>
                  <option value="pending">{t(lang, "pending")}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t(lang, "remarks")}</label>
                <input type="text" value={pmRemarks} onChange={(e) => setPmRemarks(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePayment} disabled={savingPayment} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2.5 text-sm font-semibold transition">
                {savingPayment ? "..." : t(lang, "save")}
              </button>
              <button onClick={() => setPaymentModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-semibold transition">
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

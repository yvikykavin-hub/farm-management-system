"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import ExportButton from "./ExportButton";
import { t } from "../lib/labels";

type MilkPayment = {
  id: string;
  payment_date: string;
  period_from: string | null;
  period_to: string | null;
  expected_amount: number;
  received_amount: number;
  payment_status: string;
  remarks: string | null;
};

type MilkCollectionRow = {
  collection_date: string;
  daily_income: number | null;
  morning_litres: number | null;
  evening_litres: number | null;
  rate_per_litre: number | null;
};

// daily_income is a DB-generated column — this just guards against a stale/null
// value rather than trusting a genuine 0.
const rowIncome = (m: MilkCollectionRow) => {
  if (m.daily_income && m.daily_income > 0) return Number(m.daily_income);
  const litres = (Number(m.morning_litres) || 0) + (Number(m.evening_litres) || 0);
  return litres * (Number(m.rate_per_litre) || 0);
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-amber-100 text-amber-700",
  Excess: "bg-blue-100 text-blue-700",
  Pending: "bg-red-100 text-red-700",
};
const PAYMENT_STATUS_ICON: Record<string, string> = { Paid: "✅", Partial: "⚠️", Excess: "💰", Pending: "⏳" };

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function MilkIncomeSection({ animalType, lang }: { animalType: "cow" | "buffalo"; lang: "ta" | "en" }) {
  const paymentsTable = animalType === "buffalo" ? "buffalo_milk_payments" : "milk_payments";

  const [payments, setPayments] = useState<MilkPayment[]>([]);
  const [collections, setCollections] = useState<MilkCollectionRow[]>([]);

  useEffect(() => {
    fetchPayments();
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalType]);

  const fetchPayments = async () => {
    const { data } = await supabase.from(paymentsTable).select("*").order("payment_date", { ascending: false });
    if (data) setPayments(data);
  };

  const fetchCollections = async () => {
    const query = supabase.from("milk_collections").select("collection_date, daily_income, morning_litres, evening_litres, rate_per_litre");
    const { data } =
      animalType === "cow"
        ? await query.or("animal_type.eq.cow,animal_type.is.null")
        : await query.eq("animal_type", "buffalo");
    if (data) setCollections(data);
  };

  // ---------------- Month navigation ----------------
  const currentDate = new Date();
  const [incomeMonth, setIncomeMonth] = useState(currentDate.getMonth());
  const [incomeYear, setIncomeYear] = useState(currentDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(incomeYear);

  const isCurrentMonth = incomeMonth === currentDate.getMonth() && incomeYear === currentDate.getFullYear();

  const goToPrevMonth = () => {
    if (incomeMonth === 0) {
      setIncomeMonth(11);
      setIncomeYear((prev) => prev - 1);
    } else {
      setIncomeMonth((prev) => prev - 1);
    }
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (incomeMonth === 11) {
      setIncomeMonth(0);
      setIncomeYear((prev) => prev + 1);
    } else {
      setIncomeMonth((prev) => prev + 1);
    }
  };

  const getMonthName = () =>
    new Date(incomeYear, incomeMonth, 1).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" });

  const getMonthRange = () => {
    const start = toISODate(new Date(incomeYear, incomeMonth, 1));
    const end = toISODate(new Date(incomeYear, incomeMonth + 1, 0));
    return { start, end };
  };

  const openMonthPicker = () => {
    setPickerYear(incomeYear);
    setShowMonthPicker(true);
  };

  // ---------------- Monthly summary (auto-calculated) ----------------
  const monthName = getMonthName();
  const { start: monthStart, end: monthEnd } = getMonthRange();

  const monthCollections = collections.filter((c) => c.collection_date >= monthStart && c.collection_date <= monthEnd);
  const monthTotalLitres = monthCollections.reduce((s, c) => s + (Number(c.morning_litres) || 0) + (Number(c.evening_litres) || 0), 0);
  const monthTotalExpected = monthCollections.reduce((s, c) => s + rowIncome(c), 0);
  const monthPayments = payments.filter((p) => p.payment_date >= monthStart && p.payment_date <= monthEnd);
  const monthTotalReceived = monthPayments.reduce((s, p) => s + Number(p.received_amount || 0), 0);
  const monthOutstanding = monthTotalExpected - monthTotalReceived;

  // ---------------- Add / Edit payment ----------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pmDate, setPmDate] = useState("");
  const [pmFrom, setPmFrom] = useState("");
  const [pmTo, setPmTo] = useState("");
  const [pmExpected, setPmExpected] = useState("");
  const [pmReceived, setPmReceived] = useState("");
  const [pmRemarks, setPmRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const pmDifference = (parseFloat(pmReceived) || 0) - (parseFloat(pmExpected) || 0);

  // Period = the Thursday six days before the chosen Wednesday, through the Tuesday
  // right before it — the milkman's usual weekly settlement window.
  const calculatePeriod = (wednesdayDate: string) => {
    if (!wednesdayDate) return;
    const wed = new Date(wednesdayDate);
    const tuesday = new Date(wed);
    tuesday.setDate(wed.getDate() - 1);
    const thursday = new Date(tuesday);
    thursday.setDate(tuesday.getDate() - 6);
    const from = toISODate(thursday);
    const to = toISODate(tuesday);
    setPmFrom(from);
    setPmTo(to);
    calculateExpectedForPeriod(from, to);
  };

  const calculateExpectedForPeriod = (from: string, to: string) => {
    const rows = collections.filter((c) => c.collection_date >= from && c.collection_date <= to);
    const expected = rows.reduce((s, c) => s + rowIncome(c), 0);
    setPmExpected(expected.toFixed(2));
  };

  const openAddPayment = () => {
    setEditingPaymentId(null);
    setPmDate("");
    setPmFrom("");
    setPmTo("");
    setPmExpected("");
    setPmReceived("");
    setPmRemarks("");
    setPaymentModalOpen(true);
  };

  const openEditPayment = (p: MilkPayment) => {
    setEditingPaymentId(p.id);
    setPmDate(p.payment_date);
    setPmFrom(p.period_from ?? "");
    setPmTo(p.period_to ?? "");
    setPmExpected(String(p.expected_amount ?? ""));
    setPmReceived(String(p.received_amount ?? ""));
    setPmRemarks(p.remarks ?? "");
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setEditingPaymentId(null);
  };

  const savePayment = async () => {
    if (!pmDate || !pmReceived) {
      toast.error(t(lang, "paymentFieldsRequired"));
      return;
    }
    setSavingPayment(true);
    try {
      const expected = parseFloat(pmExpected) || 0;
      const received = parseFloat(pmReceived) || 0;
      const status = received === 0 ? "Pending" : received < expected ? "Partial" : received > expected ? "Excess" : "Paid";

      // `difference` is a DB-generated column (received_amount - expected_amount) on
      // milk_payments — never set it explicitly, same landmine as daily_income elsewhere.
      const payload = {
        payment_date: pmDate,
        period_from: pmFrom || null,
        period_to: pmTo || null,
        expected_amount: expected,
        received_amount: received,
        payment_status: status,
        remarks: pmRemarks.trim() || null,
      };
      const { error } = editingPaymentId
        ? await supabase.from(paymentsTable).update(payload).eq("id", editingPaymentId)
        : await supabase.from(paymentsTable).insert(payload);
      if (error) {
        console.error("Error saving payment: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        toast.success(lang === "ta" ? "✅ பணம் சேமிக்கப்பட்டது!" : "✅ Payment saved!");
        closePaymentModal();
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
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 shadow-sm border border-gray-100 w-full">
        <button
          onClick={goToPrevMonth}
          className="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors text-sm font-bold"
        >
          ←
        </button>

        <button onClick={openMonthPicker} className="flex flex-col items-center flex-1 mx-2">
          <span className="text-sm font-semibold text-gray-900">{getMonthName()}</span>
          <span className="text-xs text-gray-400 mt-0.5">
            {isCurrentMonth ? `(${t(lang, "currentMonth")})` : t(lang, "tapToChange")}
          </span>
        </button>

        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors text-sm font-bold ${
            isCurrentMonth ? "bg-gray-50 text-gray-300 cursor-not-allowed" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          →
        </button>
      </div>

      {/* Monthly summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-3 sm:p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          📅 {monthName} · {t(lang, "summary")}
          <span className="ml-2 text-xs font-normal text-gray-400">
            ({animalType === "buffalo" ? t(lang, "buffalo") : t(lang, "cow")})
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">🥛 {t(lang, "totalLitres")}</p>
            <p className="text-base font-bold text-blue-600">{monthTotalLitres.toFixed(1)}L</p>
            <p className="text-xs text-gray-400 mt-0.5">{t(lang, "autoFromMilkCollection")}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">💰 {t(lang, "expectedAmount")}</p>
            <p className="text-base font-bold text-success">{inr(monthTotalExpected)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t(lang, "autoCalculated")}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">✅ {t(lang, "receivedAmount")}</p>
            <p className="text-base font-bold text-amber-600">{inr(monthTotalReceived)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t(lang, "sumOfPayments")}</p>
          </div>
          <div className={`rounded-xl p-3 ${monthOutstanding > 0 ? "bg-red-50" : "bg-green-50"}`}>
            <p className="text-xs text-gray-500">{monthOutstanding > 0 ? "⚠️" : "✅"} {t(lang, "outstanding")}</p>
            <p className={`text-base font-bold ${monthOutstanding > 0 ? "text-danger" : "text-success"}`}>{inr(Math.abs(monthOutstanding))}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t(lang, "expectedMinusReceived")}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-800">💳 {t(lang, "paymentRecords")}</h2>
        <div className="flex items-center gap-2">
          <ExportButton data={payments} filename={`${animalType === "cow" ? t(lang, "cowMilk") : t(lang, "buffaloMilk")}-Payments`} sheetName="Milk Payments" language={lang} />
          <button onClick={openAddPayment} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition min-h-[44px] sm:min-h-0">
            + {t(lang, "addPayment")}
          </button>
        </div>
      </div>

      {/* Payment list */}
      {monthPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-3xl mb-2">💳</p>
          <p className="text-sm text-gray-500">{t(lang, "noPaymentsYet")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...monthPayments]
            .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
            .map((payment) => {
              const diff = Number(payment.expected_amount || 0) - Number(payment.received_amount || 0);
              const status = PAYMENT_STATUS_BADGE[payment.payment_status] ? payment.payment_status : "Pending";
              return (
                <div key={payment.id} className="bg-white rounded-xl shadow-sm border border-gray-100 w-full p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_BADGE[status]}`}>
                          {PAYMENT_STATUS_ICON[status]} {t(lang, status.toLowerCase() as "paid" | "partial" | "excess" | "pending")}
                        </span>
                        <span className="text-xs text-gray-400">{formatDMY(payment.payment_date)}</span>
                      </div>

                      <p className="text-xs text-gray-500">
                        📅 {t(lang, "period")}: {payment.period_from ? `${formatDMY(payment.period_from)} → ${formatDMY(payment.period_to)}` : "—"}
                      </p>

                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-600">{t(lang, "expectedAmount")}: {inr(Number(payment.expected_amount || 0))}</span>
                        <span className="text-xs text-success font-medium">{t(lang, "receivedAmount")}: {inr(Number(payment.received_amount || 0))}</span>
                      </div>

                      {diff !== 0 && (
                        <p className={`text-xs mt-0.5 ${diff > 0 ? "text-danger" : "text-blue-500"}`}>
                          {diff > 0
                            ? `⚠️ ${t(lang, "shortBy")}: ${inr(diff)}`
                            : `💰 ${t(lang, "extra")}: ${inr(Math.abs(diff))}`}
                        </p>
                      )}

                      {payment.remarks && <p className="text-xs text-gray-400 mt-0.5">💬 {payment.remarks}</p>}
                    </div>

                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => openEditPayment(payment)} className="text-amber-400 hover:text-amber-600 text-sm p-1">✏️</button>
                      <button onClick={() => deletePayment(payment.id)} className="text-red-400 hover:text-red-600 text-sm p-1">🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add/Edit Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">
                {editingPaymentId ? t(lang, "editPayment") : t(lang, "addPayment")}
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({animalType === "buffalo" ? t(lang, "buffalo") : t(lang, "cow")})
                </span>
              </h2>
              <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>📅 {t(lang, "paymentDateWednesday")} *</label>
                <input
                  type="date"
                  value={pmDate}
                  onChange={(e) => {
                    setPmDate(e.target.value);
                    calculatePeriod(e.target.value);
                  }}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  {t(lang, "periodFromAuto")} <span className="text-gray-400">({t(lang, "editableHint")})</span>
                </label>
                <input
                  type="date"
                  value={pmFrom}
                  onChange={(e) => {
                    setPmFrom(e.target.value);
                    if (pmTo) calculateExpectedForPeriod(e.target.value, pmTo);
                  }}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  {t(lang, "periodToAuto")} <span className="text-gray-400">({t(lang, "editableHint")})</span>
                </label>
                <input
                  type="date"
                  value={pmTo}
                  onChange={(e) => {
                    setPmTo(e.target.value);
                    if (pmFrom) calculateExpectedForPeriod(pmFrom, e.target.value);
                  }}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  💰 {t(lang, "expectedAmount")} <span className="text-success">{t(lang, "autoCalculated")}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={pmExpected}
                  onChange={(e) => setPmExpected(e.target.value)}
                  className={`${inputCls} bg-green-50`}
                />
              </div>

              <div>
                <label className={labelCls}>✅ {t(lang, "receivedAmount")} *</label>
                <input
                  type="number"
                  step="0.01"
                  value={pmReceived}
                  onChange={(e) => setPmReceived(e.target.value)}
                  placeholder="0.00"
                  className={inputCls}
                />
              </div>

              {pmExpected && pmReceived && (
                <div className={`rounded-lg p-3 text-sm ${pmDifference < 0 ? "bg-red-50 text-danger" : pmDifference > 0 ? "bg-blue-50 text-blue-700" : "bg-green-50 text-success"}`}>
                  {pmDifference === 0
                    ? `✅ ${t(lang, "fullyPaid")}`
                    : pmDifference < 0
                      ? `⚠️ ${t(lang, "shortBy")}: ${inr(Math.abs(pmDifference))}`
                      : `💰 ${t(lang, "extra")}: ${inr(pmDifference)}`}
                </div>
              )}

              <div>
                <label className={labelCls}>💬 {t(lang, "remarks")}</label>
                <input type="text" value={pmRemarks} onChange={(e) => setPmRemarks(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={closePaymentModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold transition min-h-[44px] sm:min-h-0"
              >
                {t(lang, "cancel")}
              </button>
              <button
                onClick={savePayment}
                disabled={savingPayment || !pmDate || !pmReceived}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-xl py-2.5 text-sm font-semibold transition min-h-[44px] sm:min-h-0"
              >
                {savingPayment ? "..." : t(lang, "save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month picker modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xs p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4 text-center">{t(lang, "selectMonth")}</h3>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setPickerYear((p) => p - 1)}
                className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 text-sm"
              >
                ←
              </button>
              <span className="text-sm font-semibold text-gray-900">{pickerYear}</span>
              <button
                onClick={() => {
                  if (pickerYear < currentDate.getFullYear()) setPickerYear((p) => p + 1);
                }}
                disabled={pickerYear >= currentDate.getFullYear()}
                className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: 12 }, (_, i) => {
                const monthLabel = new Date(2024, i, 1).toLocaleString(lang === "ta" ? "ta-IN" : "en-IN", { month: "short" });
                const isSelected = i === incomeMonth && pickerYear === incomeYear;
                const isFuture = new Date(pickerYear, i) > new Date(currentDate.getFullYear(), currentDate.getMonth());

                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (!isFuture) {
                        setIncomeMonth(i);
                        setIncomeYear(pickerYear);
                        setShowMonthPicker(false);
                      }
                    }}
                    disabled={isFuture}
                    className={`py-2 rounded-xl text-xs font-medium transition-all min-h-[44px] sm:min-h-0 ${
                      isSelected
                        ? "bg-primary text-white"
                        : isFuture
                          ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {monthLabel}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowMonthPicker(false)}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium min-h-[44px] sm:min-h-0"
            >
              {t(lang, "cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

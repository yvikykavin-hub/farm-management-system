"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { supabase } from "../lib/supabase";
import EmptyState from "./EmptyState";
import { SuccessCheckmark } from "./SuccessAnimation";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";
import { t } from "../lib/labels";
import { isFutureDate, isDateAfter, getValidationMessage } from "../lib/validation";
import { ActivityLog } from "../lib/activityLog";

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { isOpen: deleteOpen, confirmDelete, handleConfirm: handleDeleteConfirm, handleCancel: handleDeleteCancel } = useDeleteConfirm();

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

  const [showAllPayments, setShowAllPayments] = useState(false);

  // ---------------- Monthly summary (auto-calculated) ----------------
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
    if (isFutureDate(pmDate)) {
      toast.error(getValidationMessage("future_date", lang));
      return;
    }
    const pmReceivedVal = parseFloat(pmReceived) || 0;
    if (pmReceivedVal < 0) {
      toast.error(getValidationMessage("negative", lang));
      return;
    }
    if (pmFrom && pmTo && !isDateAfter(pmTo, pmFrom)) {
      toast.error(getValidationMessage("period_invalid", lang));
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
        if (editingPaymentId) {
          await ActivityLog.updated("Milk Payment", `Payment updated: ₹${received}`);
        } else {
          await ActivityLog.added("Milk Payment", `Payment received: ₹${received}`);
        }
        closePaymentModal();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        fetchPayments();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingPayment(false);
  };

  const deletePayment = (pid: string) => {
    confirmDelete(async () => {
      const { error } = await supabase.from(paymentsTable).delete().eq("id", pid);
      if (error) {
        console.error("Error: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        fetchPayments();
        toast.success(lang === "ta" ? "✅ நீக்கப்பட்டது!" : "✅ Deleted!");
        await ActivityLog.deleted("Milk Payment", "Payment record deleted");
      }
    });
  };

  // ---------------- Excel export (current month range) ----------------
  const handleExport = async () => {
    const hasPayments = monthPayments.length > 0;
    const hasCollections = monthCollections.length > 0;

    if (!hasPayments && !hasCollections) {
      toast.error(lang === "ta" ? "இந்த மாதத்தில் தரவு இல்லை" : "No data found for selected month");
      return;
    }

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      if (hasPayments) {
        const paymentSheet = monthPayments.map((p) => ({
          "Payment Date": p.payment_date,
          "Period From": p.period_from || "",
          "Period To": p.period_to || "",
          "Expected (₹)": Number(p.expected_amount || 0),
          "Received (₹)": Number(p.received_amount || 0),
          "Difference (₹)": Number(p.expected_amount || 0) - Number(p.received_amount || 0),
          "Status": p.payment_status || "",
          "Remarks": p.remarks || "",
        }));
        const ws1 = XLSX.utils.json_to_sheet(paymentSheet);
        XLSX.utils.book_append_sheet(wb, ws1, "Payments");
      }

      if (hasCollections) {
        const collectionSheet = monthCollections.map((c) => {
          const litres = (Number(c.morning_litres) || 0) + (Number(c.evening_litres) || 0);
          const income = rowIncome(c);
          return {
            "Date": c.collection_date,
            "Morning (L)": Number(c.morning_litres) || 0,
            "Evening (L)": Number(c.evening_litres) || 0,
            "Total (L)": litres,
            "Rate (₹/L)": Number(c.rate_per_litre) || 0,
            "Income (₹)": Number(income.toFixed(2)),
          };
        });
        const ws2 = XLSX.utils.json_to_sheet(collectionSheet);
        XLSX.utils.book_append_sheet(wb, ws2, "Daily Collection");
      }

      const summarySheet = [
        {
          "Month": getMonthName(),
          "Animal Type": animalType === "buffalo" ? "Buffalo" : "Cow",
          "Total Litres": Number(monthTotalLitres.toFixed(1)),
          "Expected Income (₹)": Number(monthTotalExpected.toFixed(2)),
          "Total Received (₹)": Number(monthTotalReceived.toFixed(2)),
          "Outstanding (₹)": Number(monthOutstanding.toFixed(2)),
          "Days Recorded": monthCollections.length,
          "Payments Made": monthPayments.length,
        },
      ];
      const ws3 = XLSX.utils.json_to_sheet(summarySheet);
      XLSX.utils.book_append_sheet(wb, ws3, "Summary");

      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const monthStr = new Date(incomeYear, incomeMonth)
        .toLocaleString("en-IN", { month: "short", year: "numeric" })
        .replace(" ", "-");

      saveAs(blob, `Milk-Income-${animalType}-${monthStr}.xlsx`);
      toast.success(lang === "ta" ? "✅ Excel பதிவிறக்கப்பட்டது!" : "✅ Excel downloaded!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setExporting(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-gray-100 dark:border-slate-700 w-full">
        <button
          onClick={goToPrevMonth}
          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 text-xs flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
        >
          ←
        </button>

        <button onClick={openMonthPicker} className="flex flex-col items-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{getMonthName()}</span>
          <span className="text-xs text-gray-400">
            {isCurrentMonth ? t(lang, "currentMonth") : t(lang, "tapToChange")}
          </span>
        </button>

        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center transition-colors ${
            isCurrentMonth ? "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 opacity-30" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          →
        </button>
      </div>

      {/* Monthly summary — compact, one row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-100 dark:border-blue-800/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">🥛 {t(lang, "litres")}</p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{monthTotalLitres.toFixed(1)}L</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2 border border-green-100 dark:border-green-800/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">💰 {t(lang, "expected")}</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">{inr(monthTotalExpected)}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-100 dark:border-amber-800/50 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">✅ {t(lang, "received")}</p>
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{inr(monthTotalReceived)}</p>
        </div>
        <div className={`rounded-xl p-2 border text-center ${monthOutstanding > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50" : "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50"}`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{monthOutstanding > 0 ? "⚠️" : "✅"} {t(lang, "due")}</p>
          <p className={`text-sm font-bold ${monthOutstanding > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>{inr(Math.abs(monthOutstanding))}</p>
        </div>
      </div>

      {/* Payment Records — dominant section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex-1 min-h-[400px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            💳 {t(lang, "paymentRecords")}
            {payments.length > 0 && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                {(showAllPayments ? payments : monthPayments).length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-xs font-medium hover:bg-green-50 transition min-h-[44px] sm:min-h-0"
            >
              {exporting ? "..." : `📤 ${t(lang, "export")}`}
            </button>
            <button onClick={openAddPayment} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors min-h-[44px] sm:min-h-0">
              + {t(lang, "addPayment")}
            </button>
          </div>
        </div>

        <div className="p-3">
          {payments.length === 0 ? (
            <EmptyState
              type="payments"
              title={t(lang, "noPaymentsYet")}
              action={{ label: `+ ${t(lang, "addFirstPayment")}`, onClick: openAddPayment }}
            />
          ) : (
            <div className="space-y-2">
              {!showAllPayments && monthPayments.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">{t(lang, "noPaymentsYet")}</p>
              )}
              {[...(showAllPayments ? payments : monthPayments)]
                .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
                .map((payment) => {
                  const diff = Number(payment.expected_amount || 0) - Number(payment.received_amount || 0);
                  const status = PAYMENT_STATUS_BADGE[payment.payment_status] ? payment.payment_status : "Pending";
                  return (
                    <div key={payment.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_STATUS_BADGE[status]}`}>
                              {PAYMENT_STATUS_ICON[status]} {t(lang, status.toLowerCase() as "paid" | "partial" | "excess" | "pending")}
                            </span>
                            <span className="text-xs text-gray-400">{formatDMY(payment.payment_date)}</span>
                          </div>

                          {payment.period_from && (
                            <p className="text-xs text-gray-500 mb-1">
                              📅 {formatDMY(payment.period_from)} → {formatDMY(payment.period_to)}
                            </p>
                          )}

                          <div className="flex items-center gap-3 flex-wrap">
                            <div>
                              <p className="text-xs text-gray-400">{t(lang, "expected")}</p>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{inr(Number(payment.expected_amount || 0))}</p>
                            </div>
                            <div className="text-gray-300 dark:text-gray-600">|</div>
                            <div>
                              <p className="text-xs text-gray-400">{t(lang, "received")}</p>
                              <p className="text-sm font-semibold text-success">{inr(Number(payment.received_amount || 0))}</p>
                            </div>
                            {diff !== 0 && (
                              <>
                                <div className="text-gray-300 dark:text-gray-600">|</div>
                                <div>
                                  <p className="text-xs text-gray-400">{diff > 0 ? t(lang, "short") : t(lang, "extra")}</p>
                                  <p className={`text-sm font-semibold ${diff > 0 ? "text-red-500" : "text-blue-500"}`}>{inr(Math.abs(diff))}</p>
                                </div>
                              </>
                            )}
                          </div>

                          {payment.remarks && <p className="text-xs text-gray-400 mt-1">💬 {payment.remarks}</p>}
                        </div>

                        <div className="flex gap-1 ml-2 shrink-0">
                          <button
                            onClick={() => openEditPayment(payment)}
                            className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:text-amber-600 flex items-center justify-center text-xs"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletePayment(payment.id)}
                            className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:text-red-600 flex items-center justify-center text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

              {!showAllPayments && payments.some((p) => p.payment_date < monthStart) && (
                <button onClick={() => setShowAllPayments(true)} className="w-full text-xs text-center text-blue-600 hover:underline py-2">
                  {t(lang, "showAllPaymentHistory")}
                </button>
              )}
              {showAllPayments && (
                <button onClick={() => setShowAllPayments(false)} className="w-full text-xs text-center text-blue-600 hover:underline py-2">
                  {t(lang, "showCurrentMonthOnly")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

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
                  max={new Date().toISOString().split("T")[0]}
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
                  min="0"
                  onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
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

      <SuccessCheckmark show={showSuccess} message={lang === "ta" ? "பணம் சேமிக்கப்பட்டது!" : "Payment saved!"} />
      <DeleteConfirmDialog isOpen={deleteOpen} onConfirm={handleDeleteConfirm} onCancel={handleDeleteCancel} language={lang} />
    </div>
  );
}

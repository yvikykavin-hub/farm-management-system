"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

type Alert = {
  type: "danger" | "warning" | "info";
  icon: string;
  title: string;
  message: string;
};

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function SmartAlerts({ language = "en" }: { language?: "ta" | "en" }) {
  const L = (en: string, ta: string) => (language === "ta" ? ta : en);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    detectAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const detectAlerts = async () => {
    const [
      { data: milkCollections },
      { data: expenseRecords },
      { data: usage },
      { data: settings },
      { data: oilRecords },
      { data: pendingPayments },
    ] = await Promise.all([
      supabase.from("milk_collections").select("collection_date, morning_litres, evening_litres"),
      supabase.from("expense_records").select("expense_date, amount"),
      supabase.from("tractor_usage").select("duration_hours"),
      supabase.from("tractor_settings").select("oil_change_interval_hours").limit(1).maybeSingle(),
      supabase.from("tractor_engine_oil").select("hours_at_service").order("service_date", { ascending: false }).limit(1),
      supabase.from("milk_payments").select("id").eq("payment_status", "pending"),
    ]);

    const detected: Alert[] = [];

    // Alert 1 — Milk income drop (rolling 7-day windows)
    const weekStart = isoDaysAgo(6);
    const lastWeekStart = isoDaysAgo(13);
    const lastWeekEnd = isoDaysAgo(7);
    const litres = (c: { morning_litres: number; evening_litres: number }) =>
      Number(c.morning_litres) + Number(c.evening_litres);

    const thisWeekMilk = (milkCollections ?? [])
      .filter((c) => c.collection_date >= weekStart)
      .reduce((s, c) => s + litres(c), 0);
    const lastWeekMilk = (milkCollections ?? [])
      .filter((c) => c.collection_date >= lastWeekStart && c.collection_date <= lastWeekEnd)
      .reduce((s, c) => s + litres(c), 0);

    if (lastWeekMilk > 0 && thisWeekMilk < lastWeekMilk * 0.9) {
      detected.push({
        type: "warning",
        icon: "🥛",
        title: L("Milk Income Dropped", "பால் வருமானம் குறைந்தது"),
        message: L(
          `${Math.round((1 - thisWeekMilk / lastWeekMilk) * 100)}% less than last week`,
          `கடந்த வாரத்தை விட ${Math.round((1 - thisWeekMilk / lastWeekMilk) * 100)}% குறைவு`
        ),
      });
    }

    // Alert 2 — Expense spike (calendar month)
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const thisMonth = (expenseRecords ?? [])
      .filter((e) => e.expense_date.startsWith(thisMonthPrefix))
      .reduce((s, e) => s + Number(e.amount), 0);
    const lastMonth = (expenseRecords ?? [])
      .filter((e) => e.expense_date.startsWith(lastMonthPrefix))
      .reduce((s, e) => s + Number(e.amount), 0);

    if (lastMonth > 0 && thisMonth > lastMonth * 1.2) {
      detected.push({
        type: "warning",
        icon: "📈",
        title: L("Expenses Increased", "செலவுகள் அதிகரித்துள்ளன"),
        message: L(
          `${Math.round((thisMonth / lastMonth - 1) * 100)}% higher than last month`,
          `கடந்த மாதத்தை விட ${Math.round((thisMonth / lastMonth - 1) * 100)}% அதிகம்`
        ),
      });
    }

    // Alert 3 — Tractor oil due
    const totalHours = (usage ?? []).reduce((s, u) => s + Number(u.duration_hours), 0);
    const interval = settings ? Number(settings.oil_change_interval_hours) : 300;
    const lastServiceHours = oilRecords?.[0] ? Number(oilRecords[0].hours_at_service) : 0;
    const hoursRemaining = interval - (totalHours - lastServiceHours);

    if (hoursRemaining < 20) {
      detected.push({
        type: "danger",
        icon: "🚜",
        title: L("Tractor Oil Change Due!", "டிராக்டர் ஆயில் மாற்றம் தேவை!"),
        message: L(
          `Only ${Math.max(hoursRemaining, 0).toFixed(1)} hours remaining`,
          `${Math.max(hoursRemaining, 0).toFixed(1)} மணி நேரம் மட்டுமே உள்ளது`
        ),
      });
    }

    // Alert 4 — Pending milk payment
    if (pendingPayments && pendingPayments.length > 0) {
      detected.push({
        type: "info",
        icon: "💰",
        title: L("Milk Payment Pending", "பால் பணம் நிலுவையில்"),
        message: L(
          `${pendingPayments.length} payment(s) pending`,
          `${pendingPayments.length} பணம் நிலுவையில் உள்ளது`
        ),
      });
    }

    setAlerts(detected);
  };

  const dismissAlert = (i: number) => {
    setAlerts((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.slice(0, 3).map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${
            alert.type === "danger"
              ? "bg-red-50 border-red-200 text-red-800"
              : alert.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <span className="text-lg">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{alert.title}</p>
            <p className="text-xs opacity-70 mt-0.5">{alert.message}</p>
          </div>
          <button
            onClick={() => dismissAlert(i)}
            className="min-h-[28px] min-w-[28px] flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

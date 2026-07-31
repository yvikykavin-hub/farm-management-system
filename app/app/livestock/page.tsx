"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import AnimatedCard from "../../components/AnimatedCard";
import { supabase } from "../../lib/supabase";
import { t } from "../../lib/labels";
import { useLang } from "../../lib/useLang";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type MilkRow = {
  collection_date: string;
  daily_income: number | null;
  animal_type: string | null;
  morning_litres: number | null;
  evening_litres: number | null;
  rate_per_litre: number | null;
};
type AmountDateRow = { expense_date?: string; sale_date?: string; amount?: number; total_amount?: number };

// daily_income is a DB-generated column — this just guards against a stale/null
// value rather than trusting a genuine 0.
const rowIncome = (m: MilkRow) => {
  if (m.daily_income && m.daily_income > 0) return Number(m.daily_income);
  const litres = (Number(m.morning_litres) || 0) + (Number(m.evening_litres) || 0);
  return litres * (Number(m.rate_per_litre) || 0);
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function LivestockLandingPage() {
  const [lang, setLang] = useLang();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [showFinancial, setShowFinancial] = useState(false);

  const [cowMilkIncome, setCowMilkIncome] = useState(0);
  const [buffaloMilkIncome, setBuffaloMilkIncome] = useState(0);
  const [cattleExpense, setCattleExpense] = useState(0);
  const [goatIncome, setGoatIncome] = useState(0);
  const [goatExpense, setGoatExpense] = useState(0);
  const [henIncome, setHenIncome] = useState(0);
  const [henExpense, setHenExpense] = useState(0);

  useEffect(() => {
    fetchYearlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fetchYearlyData = async () => {
    setLoading(true);
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const [{ data: milk }, { data: cowExp }, { data: gInc }, { data: gExp }, { data: hInc }, { data: hExp }] =
      await Promise.all([
        supabase
          .from("milk_collections")
          .select("collection_date, daily_income, animal_type, morning_litres, evening_litres, rate_per_litre")
          .gte("collection_date", from)
          .lte("collection_date", to),
        supabase.from("cow_expenses").select("expense_date, amount").gte("expense_date", from).lte("expense_date", to),
        supabase.from("goat_income").select("sale_date, total_amount").gte("sale_date", from).lte("sale_date", to),
        supabase.from("goat_expenses").select("expense_date, amount").gte("expense_date", from).lte("expense_date", to),
        supabase.from("hen_income").select("sale_date, total_amount").gte("sale_date", from).lte("sale_date", to),
        supabase.from("hen_expenses").select("expense_date, amount").gte("expense_date", from).lte("expense_date", to),
      ]);

    const milkRows = (milk ?? []) as MilkRow[];
    setCowMilkIncome(milkRows.filter((m) => m.animal_type !== "buffalo").reduce((s, m) => s + rowIncome(m), 0));
    setBuffaloMilkIncome(milkRows.filter((m) => m.animal_type === "buffalo").reduce((s, m) => s + rowIncome(m), 0));

    const sumAmount = (rows: AmountDateRow[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.amount ?? r.total_amount ?? 0), 0);

    setCattleExpense(sumAmount(cowExp));
    setGoatIncome(sumAmount(gInc));
    setGoatExpense(sumAmount(gExp));
    setHenIncome(sumAmount(hInc));
    setHenExpense(sumAmount(hExp));
    setLoading(false);
  };

  const cattleIncome = cowMilkIncome + buffaloMilkIncome;
  const cattleProfit = cattleIncome - cattleExpense;
  const goatProfit = goatIncome - goatExpense;
  const henProfit = henIncome - henExpense;
  const totalNetProfit = cattleProfit + goatProfit + henProfit;

  const chartData = [
    { name: `🐄🐃 ${t(lang, "cows")}`, income: cattleIncome, expense: cattleExpense, profit: Math.max(0, cattleProfit) },
    { name: `🐐 ${t(lang, "goats")}`, income: goatIncome, expense: goatExpense, profit: Math.max(0, goatProfit) },
    { name: `🐔 ${t(lang, "hens")}`, income: henIncome, expense: henExpense, profit: Math.max(0, henProfit) },
  ];

  const cards = [
    { href: "/livestock/cows", icon: "🐄🐃", label: t(lang, "cows") },
    { href: "/livestock/goats", icon: "🐐", label: t(lang, "goats") },
    { href: "/livestock/hens", icon: "🐔", label: t(lang, "hens") },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t(lang, "livestock")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          {/* Landing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <AnimatedCard key={card.href} delay={i * 0.1}>
                <Link href={card.href}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] p-6 sm:p-8 flex flex-col items-center gap-2 cursor-pointer">
                    <span className="text-4xl">{card.icon}</span>
                    <span className="text-base font-bold text-gray-800">{card.label}</span>
                  </div>
                </Link>
              </AnimatedCard>
            ))}
          </div>

          {/* Collapsible financial overview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowFinancial(!showFinancial)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">📊</span>
                <span className="text-sm font-semibold text-gray-800">{t(lang, "financialOverview")}</span>
                {!showFinancial && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${totalNetProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {totalNetProfit >= 0 ? "✅" : "❌"} {inr(Math.abs(totalNetProfit))}
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{showFinancial ? "▲" : "▼"}</span>
            </button>

            {showFinancial && (
              <div className="px-4 pb-4 border-t border-gray-100">
                {/* Year selector + Refresh */}
                <div className="flex items-center gap-2 py-3 flex-wrap">
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 min-h-[44px] sm:min-h-0"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <button
                    onClick={fetchYearlyData}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition min-h-[44px] sm:min-h-0"
                  >
                    <span className={loading ? "animate-spin" : ""}>🔄</span> {t(lang, "refresh")}
                  </button>
                </div>

                {/* Cow & Buffalo card */}
                <div className="bg-gray-50 rounded-xl p-3 mb-2 w-full">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-sm font-medium text-gray-800">🐄🐃 {t(lang, "cows")} & {t(lang, "buffalo")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cattleProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {cattleProfit >= 0 ? "✅" : "❌"} {inr(Math.abs(cattleProfit))}
                    </span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "income")}</p>
                      <p className="text-sm font-semibold text-success">{inr(cattleIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "expense")}</p>
                      <p className="text-sm font-semibold text-danger">{inr(cattleExpense)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[11px] text-gray-400">🐄 {inr(cowMilkIncome)}</span>
                    <span className="text-[11px] text-gray-400">🐃 {inr(buffaloMilkIncome)}</span>
                  </div>
                </div>

                {/* Goat card */}
                <div className="bg-gray-50 rounded-xl p-3 mb-2 w-full">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-sm font-medium text-gray-800">🐐 {t(lang, "goats")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${goatProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {goatProfit >= 0 ? "✅" : "❌"} {inr(Math.abs(goatProfit))}
                    </span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "income")}</p>
                      <p className="text-sm font-semibold text-success">{inr(goatIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "expense")}</p>
                      <p className="text-sm font-semibold text-danger">{inr(goatExpense)}</p>
                    </div>
                  </div>
                </div>

                {/* Hen card */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 w-full">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-sm font-medium text-gray-800">🐔 {t(lang, "hens")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${henProfit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {henProfit >= 0 ? "✅" : "❌"} {inr(Math.abs(henProfit))}
                    </span>
                  </div>
                  <div className="flex gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "income")}</p>
                      <p className="text-sm font-semibold text-success">{inr(henIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{t(lang, "expense")}</p>
                      <p className="text-sm font-semibold text-danger">{inr(henExpense)}</p>
                    </div>
                  </div>
                </div>

                {/* Total net profit/loss banner */}
                <div
                  className={`rounded-xl p-3 mb-4 border ${
                    totalNetProfit >= 0
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                  }`}
                >
                  <p className="text-xs text-gray-500 mb-1">{t(lang, "totalNetProfitLoss")} {year}</p>
                  <p className={`text-xl font-bold ${totalNetProfit >= 0 ? "text-green-700 dark:text-green-400" : "text-orange-700 dark:text-orange-400"}`}>
                    {totalNetProfit >= 0 ? "+" : "-"}{inr(Math.abs(totalNetProfit))}
                  </p>
                </div>

                {/* Chart */}
                <div className="overflow-x-auto">
                  <div style={{ minWidth: 300 }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`)} />
                        <Tooltip formatter={(value) => inr(Number(value))} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="income" name={t(lang, "income")} fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name={t(lang, "expense")} fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name={t(lang, "profit")} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

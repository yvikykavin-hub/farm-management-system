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
    { name: `🐄🐃 ${t(lang, "cows")}`, income: cattleIncome, expense: cattleExpense, profit: cattleProfit },
    { name: `🐐 ${t(lang, "goats")}`, income: goatIncome, expense: goatExpense, profit: goatProfit },
    { name: `🐔 ${t(lang, "hens")}`, income: henIncome, expense: henExpense, profit: henProfit },
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

          {/* Yearly financial overview */}
          <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
            <h2 className="text-lg font-bold text-gray-900">{t(lang, "yearlyOverview")}</h2>
            <div className="flex items-center gap-2">
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
                🔄 {t(lang, "refresh")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-3 sm:p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">🐄🐃 {t(lang, "cows")} & {t(lang, "buffalo")}</h3>
              <p className="text-xs text-gray-500">{t(lang, "income")}</p>
              <p className="text-lg font-bold text-success">{inr(cattleIncome)}</p>
              <div className="flex gap-3 mt-0.5 mb-2">
                <span className="text-[11px] text-gray-400">🐄 {inr(cowMilkIncome)}</span>
                <span className="text-[11px] text-gray-400">🐃 {inr(buffaloMilkIncome)}</span>
              </div>
              <p className="text-xs text-gray-500">{t(lang, "expense")}</p>
              <p className="text-lg font-bold text-danger mb-2">{inr(cattleExpense)}</p>
              <p className="text-xs text-gray-500">{t(lang, "netPL")}</p>
              <p className={`text-lg font-bold ${cattleProfit >= 0 ? "text-success" : "text-danger"}`}>{inr(cattleProfit)}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-3 sm:p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">🐐 {t(lang, "goats")}</h3>
              <p className="text-xs text-gray-500">{t(lang, "income")}</p>
              <p className="text-lg font-bold text-success mb-2">{inr(goatIncome)}</p>
              <p className="text-xs text-gray-500">{t(lang, "expense")}</p>
              <p className="text-lg font-bold text-danger mb-2">{inr(goatExpense)}</p>
              <p className="text-xs text-gray-500">{t(lang, "netPL")}</p>
              <p className={`text-lg font-bold ${goatProfit >= 0 ? "text-success" : "text-danger"}`}>{inr(goatProfit)}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full p-3 sm:p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">🐔 {t(lang, "hens")}</h3>
              <p className="text-xs text-gray-500">{t(lang, "income")}</p>
              <p className="text-lg font-bold text-success mb-2">{inr(henIncome)}</p>
              <p className="text-xs text-gray-500">{t(lang, "expense")}</p>
              <p className="text-lg font-bold text-danger mb-2">{inr(henExpense)}</p>
              <p className="text-xs text-gray-500">{t(lang, "netPL")}</p>
              <p className={`text-lg font-bold ${henProfit >= 0 ? "text-success" : "text-danger"}`}>{inr(henProfit)}</p>
            </div>
          </div>

          {/* Total net profit/loss banner */}
          <div className={`rounded-2xl shadow-sm border p-4 sm:p-5 flex items-center justify-between flex-wrap gap-2 ${totalNetProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <span className="text-sm sm:text-base font-bold text-gray-800">{t(lang, "totalNetProfitLoss")} ({year})</span>
            <span className={`text-xl sm:text-2xl font-extrabold ${totalNetProfit >= 0 ? "text-success" : "text-danger"}`}>
              {inr(totalNetProfit)}
            </span>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{t(lang, "incomeExpenseProfit")}</h3>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 360, height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => inr(Number(value))} />
                    <Legend />
                    <Bar dataKey="income" name={t(lang, "income")} fill="#22c55e" />
                    <Bar dataKey="expense" name={t(lang, "expense")} fill="#ef4444" />
                    <Bar dataKey="profit" name={t(lang, "profit")} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

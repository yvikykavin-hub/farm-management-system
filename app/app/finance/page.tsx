"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import Sidebar from "../../components/Sidebar";
import { supabase } from "../../lib/supabase";

type Cultivation = { id: string; farm_id: string; crop_type: string };
type Farm = { id: string; name: string };
type Row = { cultivation_id: string; year: string; amount: number };

const CROP_LABELS: Record<string, { en: string; ta: string; emoji: string }> = {
  coconut: { en: "Coconut", ta: "தேங்காய்", emoji: "🥥" },
  sugarcane: { en: "Sugarcane", ta: "கரும்பு", emoji: "🎋" },
  turmeric: { en: "Turmeric", ta: "மஞ்சள்", emoji: "🟡" },
  ellu: { en: "Ellu", ta: "எள்ளு", emoji: "🌿" },
  kuchi_kilangu: { en: "Kuchi Kilangu", ta: "குச்சிக்கிழங்கு", emoji: "🥔" },
  onion: { en: "Onion", ta: "வெங்காயம்", emoji: "🧅" },
  fodder_corn: { en: "Fodder Corn", ta: "மக்காச்சோளம்", emoji: "🌽" },
  nell: { en: "Nell (Rice)", ta: "நெல்", emoji: "🌾" },
};

const cropEmoji = (cropType: string) => CROP_LABELS[cropType]?.emoji ?? "🌱";
const cropLabel = (cropType: string, lang: "ta" | "en") => {
  const l = CROP_LABELS[cropType];
  return l ? (lang === "ta" ? l.ta : l.en) : cropType;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const inrAxis = (value: number) =>
  value >= 0 ? `₹${(value / 100000).toFixed(1)}L` : `-₹${(Math.abs(value) / 100000).toFixed(1)}L`;

type TooltipPayloadItem = { dataKey: string; value: number };

const CustomTooltip = ({
  active,
  payload,
  label,
  L,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  L: (en: string, ta: string) => string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.dataKey === "income")?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;
  const net = payload.find((p) => p.dataKey === "net")?.value ?? 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      <p className="text-blue-600">💰 {L("Income", "வருமானம்")}: {inr(income)}</p>
      <p className="text-amber-600">📤 {L("Expense", "செலவு")}: {inr(expense)}</p>
      <p className={net >= 0 ? "text-green-600" : "text-red-600"}>
        {net >= 0 ? `📈 ${L("Profit", "இலாபம்")}` : `📉 ${L("Loss", "நஷ்டம்")}`}: {inr(Math.abs(net))}
      </p>
    </div>
  );
};

const toggleIn = (arr: string[], val: string) => (arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

export default function FinancePage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [loading, setLoading] = useState(true);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [incomeRows, setIncomeRows] = useState<Row[]>([]);
  const [expenseRows, setExpenseRows] = useState<Row[]>([]);

  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [selectedFarms, setSelectedFarms] = useState<string[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: cultivationsData },
      { data: farmsData },
      { data: incomeData },
      { data: expenseData },
      { data: riceIncomeData },
    ] = await Promise.all([
      supabase.from("cultivations").select("id, farm_id, crop_type"),
      supabase.from("farms").select("id, name").order("name", { ascending: true }),
      supabase.from("income_records").select("cultivation_id, income_date, amount"),
      supabase.from("expense_records").select("cultivation_id, expense_date, amount"),
      supabase.from("rice_income").select("cultivation_id, date, total_amount"),
    ]);

    if (cultivationsData) setCultivations(cultivationsData);
    if (farmsData) setFarms(farmsData);

    const income: Row[] = [
      ...(incomeData ?? []).map((r) => ({ cultivation_id: r.cultivation_id, year: String(r.income_date).slice(0, 4), amount: Number(r.amount) })),
      ...(riceIncomeData ?? []).map((r) => ({ cultivation_id: r.cultivation_id, year: String(r.date).slice(0, 4), amount: Number(r.total_amount) })),
    ];
    const expense: Row[] = (expenseData ?? []).map((r) => ({
      cultivation_id: r.cultivation_id,
      year: String(r.expense_date).slice(0, 4),
      amount: Number(r.amount),
    }));

    setIncomeRows(income);
    setExpenseRows(expense);
    setLoading(false);
  };

  const cultivationMap = useMemo(() => {
    const map = new Map<string, Cultivation>();
    cultivations.forEach((c) => map.set(c.id, c));
    return map;
  }, [cultivations]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    [...incomeRows, ...expenseRows].forEach((r) => {
      if (/^\d{4}$/.test(r.year)) years.add(r.year);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [incomeRows, expenseRows]);

  const matchesFilters = (r: Row) => {
    const c = cultivationMap.get(r.cultivation_id);
    if (!c) return false;
    if (selectedYears.length > 0 && !selectedYears.includes(r.year)) return false;
    if (selectedCrops.length > 0 && !selectedCrops.includes(c.crop_type)) return false;
    if (selectedFarms.length > 0 && !selectedFarms.includes(c.farm_id)) return false;
    return true;
  };

  const filteredIncome = useMemo(() => incomeRows.filter(matchesFilters), [incomeRows, selectedYears, selectedCrops, selectedFarms, cultivationMap]);
  const filteredExpense = useMemo(() => expenseRows.filter(matchesFilters), [expenseRows, selectedYears, selectedCrops, selectedFarms, cultivationMap]);

  const chartData = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();
    filteredIncome.forEach((r) => {
      const c = cultivationMap.get(r.cultivation_id);
      if (!c) return;
      const entry = totals.get(c.crop_type) ?? { income: 0, expense: 0 };
      entry.income += r.amount;
      totals.set(c.crop_type, entry);
    });
    filteredExpense.forEach((r) => {
      const c = cultivationMap.get(r.cultivation_id);
      if (!c) return;
      const entry = totals.get(c.crop_type) ?? { income: 0, expense: 0 };
      entry.expense += r.amount;
      totals.set(c.crop_type, entry);
    });
    return Array.from(totals.entries())
      .filter(([, v]) => v.income > 0 || v.expense > 0)
      .map(([cropType, v]) => ({
        cropType,
        label: `${cropEmoji(cropType)} ${cropLabel(cropType, lang)}`,
        income: v.income,
        expense: v.expense,
        net: v.income - v.expense,
      }))
      .sort((a, b) => b.net - a.net);
  }, [filteredIncome, filteredExpense, cultivationMap, lang]);

  const totalIncome = chartData.reduce((s, c) => s + c.income, 0);
  const totalExpense = chartData.reduce((s, c) => s + c.expense, 0);
  const totalNet = totalIncome - totalExpense;
  const bestCrop = chartData.length > 0 ? chartData[0] : null;
  const worstCrop = chartData.length > 0 ? chartData[chartData.length - 1] : null;

  const pillCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
      active ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back to Dashboard", "முகப்புக்கு திரும்பு")}
            </Link>
            <h1 className="text-xl font-bold text-primary">💰 {L("Finance", "நிதி நிலை")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{L("Year", "ஆண்டு")}</p>
              <div className="flex flex-wrap gap-2">
                {availableYears.map((y) => (
                  <button key={y} onClick={() => setSelectedYears(toggleIn(selectedYears, y))} className={pillCls(selectedYears.includes(y))}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{L("Crop", "பயிர்")}</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(CROP_LABELS).map((ct) => (
                  <button key={ct} onClick={() => setSelectedCrops(toggleIn(selectedCrops, ct))} className={pillCls(selectedCrops.includes(ct))}>
                    {cropEmoji(ct)} {cropLabel(ct, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">{L("Farm", "நிலம்")}</p>
              <div className="flex flex-wrap gap-2">
                {farms.map((f) => (
                  <button key={f.id} onClick={() => setSelectedFarms(toggleIn(selectedFarms, f.id))} className={pillCls(selectedFarms.includes(f.id))}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
              </div>
              <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              {L("No data found for selected filters", "தேர்ந்தெடுக்கப்பட்ட வடிகட்டிகளுக்கு தரவு இல்லை")}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 transition-all">
                <div className="bg-white rounded-2xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("Total Income", "மொத்த வருமானம்")}</p>
                  <p className="text-lg font-bold text-green-600">{inr(totalIncome)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("Total Expense", "மொத்த செலவு")}</p>
                  <p className="text-lg font-bold text-red-500">{inr(totalExpense)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("Net Profit/Loss", "நிகர லாப/நஷ்டம்")}</p>
                  <p className={`text-lg font-bold ${totalNet >= 0 ? "text-emerald-600" : "text-orange-500"}`}>{inr(totalNet)}</p>
                </div>
                {bestCrop && (
                  <div className="bg-white rounded-2xl shadow-sm p-3">
                    <p className="text-xs text-gray-500">{L("Best Performing Crop", "சிறந்த செயல்திறன் பயிர்")}</p>
                    <p className="text-sm font-bold text-emerald-600">{bestCrop.label}</p>
                    <p className="text-xs text-gray-500">{inr(bestCrop.net)}</p>
                  </div>
                )}
                {worstCrop && worstCrop !== bestCrop && (
                  <div className="bg-white rounded-2xl shadow-sm p-3">
                    <p className="text-xs text-gray-500">{L("Worst Performing Crop", "குறைந்த செயல்திறன் பயிர்")}</p>
                    <p className="text-sm font-bold text-orange-500">{worstCrop.label}</p>
                    <p className="text-xs text-gray-500">{inr(worstCrop.net)}</p>
                  </div>
                )}
              </div>

              {/* Chart card */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-6">
                <h2 className="text-sm font-semibold text-gray-800 mb-3">
                  {L("Crop-wise Financial Overview", "பயிர் வாரியான நிதி கண்ணோட்டம்")}
                </h2>

                <div className="flex gap-3 flex-wrap mb-4">
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                    {L("Income", "வருமானம்")}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    {L("Expense", "செலவு")}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    {L("Profit", "இலாபம்")}
                  </span>
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    {L("Loss", "நஷ்டம்")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <div style={{ minWidth: Math.max(600, chartData.length * 140), height: 350 }}>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={inrAxis} tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip L={L} />} />
                        <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
                        <Bar dataKey="income" name="income" fill="#3B82F6" radius={[4, 4, 0, 0]} animationDuration={600} />
                        <Bar dataKey="expense" name="expense" fill="#F59E0B" radius={[4, 4, 0, 0]} animationDuration={600} />
                        <Bar dataKey="net" name="net" radius={[4, 4, 0, 0]} animationDuration={600}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.net >= 0 ? "#22C55E" : "#EF4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

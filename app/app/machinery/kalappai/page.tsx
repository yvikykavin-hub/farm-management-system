"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import MachineryRecordSection from "../../../components/MachineryRecordSection";
import { supabase } from "../../../lib/supabase";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export default function KalappaiPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [activeTab, setActiveTab] = useState<"overview" | "blades" | "expenses">("overview");
  const [loading, setLoading] = useState(true);
  const [lastBlade, setLastBlade] = useState<{ replacement_date: string; cost: number } | null>(null);
  const [bladeCount, setBladeCount] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [{ data: blades }, { data: expenses }] = await Promise.all([
      supabase.from("kalappai_blades").select("replacement_date, cost").order("replacement_date", { ascending: false }),
      supabase.from("kalappai_expenses").select("date, cost"),
    ]);

    setLastBlade(blades?.[0] ? { replacement_date: blades[0].replacement_date, cost: Number(blades[0].cost) } : null);
    setBladeCount(blades?.length ?? 0);

    const bladeMonth = (blades ?? []).filter((b) => b.replacement_date.startsWith(monthPrefix)).reduce((s, b) => s + Number(b.cost), 0);
    const expenseMonth = (expenses ?? []).filter((e) => e.date.startsWith(monthPrefix)).reduce((s, e) => s + Number(e.cost), 0);
    setMonthExpenses(bladeMonth + expenseMonth);
    setLoading(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">

          <Link href="/machinery" className="text-primary hover:text-primary text-sm font-semibold">
            ← {L("Back to Machinery", "இயந்திரங்களுக்கு திரும்பு")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-primary">🔧 {L("Kalappai (Plough)", "கலப்பை")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["overview", L("Overview", "மேலோட்டம்")],
              ["blades", L("Blade Replacement", "பிளேடு மாற்றம்")],
              ["expenses", L("Expenses", "செலவுகள்")],
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

          {activeTab === "overview" && (
            loading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("Last Blade Replacement", "கடைசி பிளேடு மாற்றம்")}</p>
                  <p className="text-sm font-bold text-gray-900">{formatDMY(lastBlade?.replacement_date)}</p>
                  {lastBlade && <p className="text-xs text-danger font-medium">{inr(lastBlade.cost)}</p>}
                </div>
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("Total Blade Replacements", "மொத்த பிளேடு மாற்றங்கள்")}</p>
                  <p className="text-2xl font-bold text-primary">{bladeCount}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{L("This Month Expenses", "இந்த மாத செலவு")}</p>
                  <p className="text-lg font-bold text-danger">{inr(monthExpenses)}</p>
                </div>
              </div>
            )
          )}

          {activeTab === "blades" && (
            <MachineryRecordSection
              lang={lang}
              table="kalappai_blades"
              titleEn="Blade Replacement"
              titleTa="பிளேடு மாற்றம்"
              icon="🔧"
              dateField="replacement_date"
              fields={[
                { key: "replacement_date", en: "Date", ta: "தேதி", type: "date", required: true },
                { key: "blade_size", en: "Blade Size", ta: "பிளேடு அளவு", type: "text" },
                { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
              ]}
              onChanged={fetchOverview}
            />
          )}

          {activeTab === "expenses" && (
            <MachineryRecordSection
              lang={lang}
              table="kalappai_expenses"
              titleEn="Expenses"
              titleTa="செலவுகள்"
              icon="💸"
              dateField="date"
              fields={[
                { key: "date", en: "Date", ta: "தேதி", type: "date", required: true },
                { key: "description", en: "Description", ta: "விவரம்", type: "text", required: true },
                { key: "cost", en: "Cost (₹)", ta: "செலவு (₹)", type: "number", required: true, isCost: true },
              ]}
              onChanged={fetchOverview}
            />
          )}

        </div>
      </main>
    </div>
  );
}

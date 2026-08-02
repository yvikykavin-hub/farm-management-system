"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import AnimatedCard from "../../components/AnimatedCard";
import { SkeletonCard } from "../../components/Skeleton";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export default function MachineryLandingPage() {
  const [lang, setLang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [loading, setLoading] = useState(true);
  const [tractorCount, setTractorCount] = useState(0);
  const [tractorMonthExpenses, setTractorMonthExpenses] = useState(0);
  const [lastRotavatorBlade, setLastRotavatorBlade] = useState<string | null>(null);
  const [lastKalappaiBlade, setLastKalappaiBlade] = useState<string | null>(null);
  const [monthExpenses, setMonthExpenses] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [
      { data: tractors },
      { data: rotavatorBlade },
      { data: kalappaiBlade },
      { data: diesel },
      { data: engineOil },
      { data: gearOil },
      { data: hydraulicOil },
      { data: battery },
      { data: tyre },
      { data: repairs },
      { data: rotavatorExp },
      { data: kalappaiExp },
    ] = await Promise.all([
      supabase.from("tractors").select("id").eq("is_active", true),
      supabase.from("rotavator_blades").select("replacement_date").order("replacement_date", { ascending: false }).limit(1),
      supabase.from("kalappai_blades").select("replacement_date").order("replacement_date", { ascending: false }).limit(1),
      supabase.from("tractor_diesel").select("date, amount"),
      supabase.from("tractor_engine_oil").select("date, amount"),
      supabase.from("tractor_gear_oil").select("date, amount"),
      supabase.from("tractor_hydraulic_oil").select("date, amount"),
      supabase.from("tractor_battery").select("date, amount"),
      supabase.from("tractor_tyre").select("date, amount"),
      supabase.from("tractor_repairs").select("date, amount"),
      supabase.from("rotavator_expenses").select("date, cost"),
      supabase.from("kalappai_expenses").select("date, cost"),
    ]);

    setTractorCount((tractors ?? []).length);
    setLastRotavatorBlade(rotavatorBlade?.[0]?.replacement_date ?? null);
    setLastKalappaiBlade(kalappaiBlade?.[0]?.replacement_date ?? null);

    const monthSum = (src: Record<string, unknown>[] | null, dateField: string) => {
      if (!src) return 0;
      return src
        .filter((r) => String(r[dateField] ?? "").startsWith(monthPrefix))
        .reduce((s, r) => s + Number((r.cost ?? r.amount ?? 0) as number), 0);
    };

    const tractorTotal =
      monthSum(diesel, "date") +
      monthSum(engineOil, "date") +
      monthSum(gearOil, "date") +
      monthSum(hydraulicOil, "date") +
      monthSum(battery, "date") +
      monthSum(tyre, "date") +
      monthSum(repairs, "date");
    setTractorMonthExpenses(tractorTotal);

    const total = tractorTotal + monthSum(rotavatorExp, "date") + monthSum(kalappaiExp, "date");

    setMonthExpenses(total);
    setLoading(false);
  };

  const cards = [
    {
      href: "/machinery/tractor",
      icon: "🚜",
      label: L("Tractor", "டிராக்டர்"),
      stats: (
        <>
          <p className="text-xs text-gray-600">{L("Tractors", "டிராக்டர்கள்")}: <span className="font-semibold text-gray-900">{tractorCount}</span></p>
          <p className="text-xs text-gray-600">{L("This Month", "இந்த மாதம்")}: <span className="font-semibold text-danger">{inr(tractorMonthExpenses)}</span></p>
        </>
      ),
    },
    {
      href: "/machinery/rotavator",
      icon: "⚙️",
      label: L("Rotavator", "ரோட்டவேட்டர்"),
      stats: <p className="text-xs text-gray-600">{L("Last Blade Change", "கடைசி பிளேடு மாற்றம்")}: <span className="font-semibold text-gray-900">{formatDMY(lastRotavatorBlade)}</span></p>,
    },
    {
      href: "/machinery/kalappai",
      icon: "🔧",
      label: L("Kalappai", "கலப்பை"),
      stats: <p className="text-xs text-gray-600">{L("Last Blade Change", "கடைசி பிளேடு மாற்றம்")}: <span className="font-semibold text-gray-900">{formatDMY(lastKalappaiBlade)}</span></p>,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">

          <Link href="/" className="text-primary hover:text-primary text-sm font-semibold">
            ← {L("Back to Dashboard", "முகப்புக்கு திரும்பு")}
          </Link>

          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">{L("Machinery Management", "இயந்திர மேலாண்மை")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{L("Total Machinery Expenses This Month", "இந்த மாத மொத்த இயந்திர செலவு")}</p>
            <p className="text-xl font-bold text-danger">{loading ? "..." : inr(monthExpenses)}</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {cards.map((card, i) => (
                <AnimatedCard key={card.href} delay={i * 0.1}>
                  <Link href={card.href}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] p-5 flex flex-col items-center gap-2 cursor-pointer text-center">
                      <span className="text-4xl">{card.icon}</span>
                      <span className="text-sm font-semibold text-gray-800">{card.label}</span>
                      <div className="mt-1">{card.stats}</div>
                    </div>
                  </Link>
                </AnimatedCard>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

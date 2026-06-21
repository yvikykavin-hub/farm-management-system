"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import PageWrapper from "../../components/PageWrapper";
import AnimatedCard from "../../components/AnimatedCard";
import { SkeletonCard } from "../../components/Skeleton";
import { supabase } from "../../lib/supabase";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const DEFAULT_OIL_CHANGE_INTERVAL = 300;

export default function MachineryLandingPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  const [hoursAtLastOilChange, setHoursAtLastOilChange] = useState(0);
  const [oilChangeInterval, setOilChangeInterval] = useState(DEFAULT_OIL_CHANGE_INTERVAL);
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
      { data: usage },
      { data: oilChange },
      { data: settings },
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
      supabase.from("tractor_usage").select("duration_hours"),
      supabase.from("tractor_engine_oil").select("hours_at_service, service_date").order("service_date", { ascending: false }).limit(1),
      supabase.from("tractor_settings").select("oil_change_interval_hours").maybeSingle(),
      supabase.from("rotavator_blades").select("replacement_date").order("replacement_date", { ascending: false }).limit(1),
      supabase.from("kalappai_blades").select("replacement_date").order("replacement_date", { ascending: false }).limit(1),
      supabase.from("tractor_diesel").select("date, amount"),
      supabase.from("tractor_engine_oil").select("service_date, cost"),
      supabase.from("tractor_gear_oil").select("service_date, cost"),
      supabase.from("tractor_hydraulic_oil").select("service_date, cost"),
      supabase.from("tractor_battery").select("replacement_date, cost"),
      supabase.from("tractor_tyre").select("replacement_date, cost"),
      supabase.from("tractor_repairs").select("date, cost"),
      supabase.from("rotavator_expenses").select("date, cost"),
      supabase.from("kalappai_expenses").select("date, cost"),
    ]);

    const sumHours = (usage ?? []).reduce((s, r) => s + Number(r.duration_hours), 0);
    setTotalHours(sumHours);
    setHoursAtLastOilChange(oilChange?.[0]?.hours_at_service ? Number(oilChange[0].hours_at_service) : 0);
    setOilChangeInterval(settings?.oil_change_interval_hours ? Number(settings.oil_change_interval_hours) : DEFAULT_OIL_CHANGE_INTERVAL);
    setLastRotavatorBlade(rotavatorBlade?.[0]?.replacement_date ?? null);
    setLastKalappaiBlade(kalappaiBlade?.[0]?.replacement_date ?? null);

    const monthSum = (src: Record<string, unknown>[] | null, dateField: string) => {
      if (!src) return 0;
      return src
        .filter((r) => String(r[dateField] ?? "").startsWith(monthPrefix))
        .reduce((s, r) => s + Number((r.cost ?? r.amount ?? 0) as number), 0);
    };

    const total =
      monthSum(diesel, "date") +
      monthSum(engineOil, "service_date") +
      monthSum(gearOil, "service_date") +
      monthSum(hydraulicOil, "service_date") +
      monthSum(battery, "replacement_date") +
      monthSum(tyre, "replacement_date") +
      monthSum(repairs, "date") +
      monthSum(rotavatorExp, "date") +
      monthSum(kalappaiExp, "date");

    setMonthExpenses(total);
    setLoading(false);
  };

  const hoursRemaining = oilChangeInterval - (totalHours - hoursAtLastOilChange);

  const cards = [
    {
      href: "/machinery/tractor",
      icon: "🚜",
      label: L("Tractor", "டிராக்டர்"),
      stats: (
        <>
          <p className="text-xs text-gray-600">{L("Total Hours", "மொத்த நேரம்")}: <span className="font-semibold text-gray-900">{totalHours.toFixed(1)}</span></p>
          <p className="text-xs text-gray-600">
            {L("Next Oil Change In", "எண்ணெய் மாற்ற")}:{" "}
            <span className={`font-semibold ${hoursRemaining < 20 ? "text-red-600 font-bold" : hoursRemaining <= 50 ? "text-amber-500" : "text-green-600"}`}>
              {Math.max(hoursRemaining, 0).toFixed(1)} {L("hrs", "மணி")}
            </span>
          </p>
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
        <PageWrapper>
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
            <p className="text-2xl font-bold text-danger">{loading ? "..." : inr(monthExpenses)}</p>
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
                      <span className="text-base font-bold text-gray-800">{card.label}</span>
                      <div className="mt-1">{card.stats}</div>
                    </div>
                  </Link>
                </AnimatedCard>
              ))}
            </div>
          )}
        </div>
        </PageWrapper>
      </main>
    </div>
  );
}

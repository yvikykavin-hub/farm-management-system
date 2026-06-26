"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import PageWrapper from "../../components/PageWrapper";
import AnimatedCard from "../../components/AnimatedCard";
import { t } from "../../lib/labels";

export default function LivestockLandingPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");

  const cards = [
    { href: "/livestock/cows", icon: "🐄", label: t(lang, "cows") },
    { href: "/livestock/goats", icon: "🐐", label: t(lang, "goats") },
    { href: "/livestock/hens", icon: "🐔", label: t(lang, "hens") },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PageWrapper>
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t(lang, "livestock")}</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLang(lang === "ta" ? "en" : "ta")}
                className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
              >
                {lang === "ta" ? "English" : "தமிழ்"}
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/profile-photo.png" alt="Profile" className="w-9 h-9 rounded-full object-cover border-2 border-green-200 cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card, i) => (
              <AnimatedCard key={card.href} delay={i * 0.1}>
                <Link href={card.href}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99] p-8 flex flex-col items-center gap-2 cursor-pointer">
                    <span className="text-4xl">{card.icon}</span>
                    <span className="text-base font-bold text-gray-800">{card.label}</span>
                  </div>
                </Link>
              </AnimatedCard>
            ))}
          </div>
        </div>
        </PageWrapper>
      </main>
    </div>
  );
}

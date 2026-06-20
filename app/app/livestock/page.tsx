"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
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
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t(lang, "livestock")}</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link key={card.href} href={card.href}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary hover:shadow-md transition p-8 flex flex-col items-center gap-2 cursor-pointer">
                  <span className="text-4xl">{card.icon}</span>
                  <span className="text-base font-bold text-gray-800">{card.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

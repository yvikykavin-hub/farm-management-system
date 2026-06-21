"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";

export default function SettingsPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back to Dashboard", "முகப்புக்கு திரும்பு")}
            </Link>
            <h1 className="text-xl font-bold text-primary">⚙️ {L("Settings", "அமைப்புகள்")}</h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-96 text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {L("Coming Soon", "விரைவில் வருகிறது")}
            </h2>
            <p className="text-gray-500 text-sm">
              {L("Settings page will be available soon", "அமைப்புகள் பக்கம் விரைவில் கிடைக்கும்")}
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

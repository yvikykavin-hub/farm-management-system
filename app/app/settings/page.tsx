"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Sidebar from "../../components/Sidebar";
import PageWrapper from "../../components/PageWrapper";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const confirmed = window.confirm(
      L("Logout from this device?", "இந்த சாதனத்தில் இருந்து வெளியேற விரும்புகிறீர்களா?")
    );
    if (!confirmed) return;
    setLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    router.push("/login");
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm(
      L(
        "This will logout from ALL devices. Continue?",
        "இது அனைத்து சாதனங்களிலும் இருந்து வெளியேற்றும். தொடரவா?"
      )
    );
    if (!confirmed) return;
    setLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    router.push("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PageWrapper>
        <div className="max-w-3xl mx-auto flex flex-col gap-4">

          <div className="flex items-center justify-between flex-wrap gap-2">
            <Link href="/" className="text-primary hover:text-primary text-sm font-semibold">
              ← {L("Back to Dashboard", "முகப்புக்கு திரும்பு")}
            </Link>
            <h1 className="text-xl font-bold text-primary">⚙️ {L("Settings", "அமைப்புகள்")}</h1>
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

          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-md border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🔐 {L("Session Management", "அமர்வு நிர்வாகம்")}
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              {L("Manage your login sessions across devices.", "உங்கள் சாதனங்களில் உள்நுழைவு அமர்வுகளை நிர்வகிக்கவும்.")}
            </p>

            {/* Logout this device */}
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full mb-3 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              🚪 {L("Logout This Device", "இந்த சாதனத்தில் வெளியேறு")}
              <span className="text-xs opacity-80">{L("(this device only)", "(இந்த சாதனம் மட்டும்)")}</span>
            </button>

            {/* Logout all devices */}
            <button
              onClick={handleLogoutAll}
              disabled={loading}
              className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              🔐 {L("Logout All Devices", "அனைத்து சாதனங்களிலும் வெளியேறு")}
              <span className="text-xs opacity-80">{L("(all devices)", "(அனைத்து சாதனங்கள்)")}</span>
            </button>

            <p className="text-xs text-gray-400 mt-4 text-center">
              ⚠️ {L(
                'Use "Logout All Devices" if you think someone else has access to your account',
                "உங்கள் கணக்கை வேறு யாரோ அணுகுகிறார்கள் என்று நினைத்தால் \"அனைத்து சாதனங்களிலும் வெளியேறு\" பயன்படுத்தவும்"
              )}
            </p>
          </div>

        </div>
        </PageWrapper>
      </main>
    </div>
  );
}

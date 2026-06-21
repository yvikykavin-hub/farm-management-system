"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const navItems = [
  { href: "/", icon: "🏠", label: "Dashboard", labelTa: "முகப்பு" },
  { href: "/land-details", icon: "🗺️", label: "Land Details", labelTa: "நில விவரம்", startsWith: true },
  { href: "/crops", icon: "🌾", label: "Crops", labelTa: "பயிர்கள்" },
  { href: "/livestock", icon: "🐄", label: "Livestock", labelTa: "கால்நடை", startsWith: true },
  { href: "/machinery", icon: "🚜", label: "Machinery", labelTa: "இயந்திரங்கள்", startsWith: true },
  { href: "/finance", icon: "💰", label: "Finance", labelTa: "நிதி நிலை" },
  { href: "/reports", icon: "📊", label: "Reports", labelTa: "அறிக்கைகள்" },
  { href: "/settings", icon: "⚙️", label: "Settings", labelTa: "அமைப்புகள்" },
];

type SidebarProps = {
  lang?: "ta" | "en";
  setLang?: (lang: "ta" | "en") => void;
};

export default function Sidebar({ lang = "en", setLang }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLang = () => setLang?.(lang === "ta" ? "en" : "ta");

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="sm:hidden fixed top-3 left-3 z-40 bg-primary text-white w-9 h-9 rounded-lg flex items-center justify-center shadow-lg text-lg"
        title="Menu"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`w-64 h-screen bg-gradient-to-b from-[#1B4332] to-[#2D6A4F] flex flex-col shadow-xl shrink-0 fixed sm:static z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Logo area */}
        <div className="p-6 border-b border-green-700/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F4A261]/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🌾
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                {lang === "ta" ? "தாய் நிலம் AGRO" : "Thaai Nilam AGRO"}
              </h1>
              <p className="text-[#F4A261] text-xs leading-tight mt-0.5">
                {lang === "ta" ? "நிலமே தாய், விளைவே வாழ்வு" : "Our Land, Our Legacy"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.startsWith ? pathname.startsWith(item.href) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border-l-2 ${
                  isActive
                    ? "bg-[#F4A261]/20 text-[#F4A261] border-[#F4A261] shadow-sm"
                    : "text-green-200 border-transparent hover:bg-[#F4A261]/10 hover:text-[#F4A261]"
                }`}
              >
                <span className={`text-lg transition-all duration-200 ${isActive ? "drop-shadow-[0_0_4px_rgba(244,162,97,0.6)]" : ""}`}>{item.icon}</span>
                <span className="text-sm font-medium">{lang === "ta" ? item.labelTa : item.label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#F4A261]" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: language + logout */}
        <div className="p-3 border-t border-green-700/30 space-y-1 shrink-0">
          <button
            onClick={toggleLang}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-green-200 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            <span>🌐</span>
            <span className="text-sm font-medium">{lang === "ta" ? "English" : "தமிழ்"}</span>
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-green-200 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200"
          >
            <span>🚪</span>
            <span className="text-sm font-medium">{lang === "ta" ? "வெளியேறு" : "Logout"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

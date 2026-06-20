"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const navItems = [
  { href: "/", icon: "🏠", label: "Dashboard", labelTa: "முகப்பு" },
  { href: "/farms", icon: "🌳", label: "Farms", labelTa: "நிலங்கள்" },
  { href: "/crops", icon: "🌾", label: "Crops", labelTa: "பயிர்கள்" },
  { href: "/machinery", icon: "🚜", label: "Machinery", labelTa: "இயந்திரம்" },
  { href: "/income", icon: "💰", label: "Income", labelTa: "வருமானம்" },
  { href: "/expenses", icon: "💸", label: "Expenses", labelTa: "செலவு" },
  { href: "/reports", icon: "📊", label: "Reports", labelTa: "அறிக்கை" },
  { href: "/settings", icon: "⚙️", label: "Settings", labelTa: "அமைப்புகள்" },
];

const livestockLink = { href: "/livestock", icon: "🐄", label: "Livestock", labelTa: "கால்நடை" };

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

      <div
        className={`w-52 h-screen bg-primary text-white flex flex-col shadow-xl shrink-0 fixed sm:static z-50 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        {/* Brand */}
        <div className="p-3 border-b border-white/20 shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-xl mb-2 mx-auto">
            🌾
          </div>
          <h1 className="text-sm font-bold text-center text-white leading-tight">
            {lang === "ta" ? "தாய் நிலம் AGRO" : "Thaai Nilam AGRO"}
          </h1>
          <p className="text-[11px] text-white/80 text-center mt-1 leading-tight font-medium">
            {lang === "ta" ? "நிலமே தாய், விளைவே வாழ்வு" : "Our Land, Our Legacy"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.slice(0, 3).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white font-semibold shadow"
                    : "text-white opacity-100 hover:bg-white/15"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{lang === "ta" ? item.labelTa : item.label}</span>
              </Link>
            );
          })}

          <Link
            href={livestockLink.href}
            title={livestockLink.label}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
              pathname.startsWith("/livestock")
                ? "bg-accent text-white font-semibold shadow"
                : "text-white opacity-100 hover:bg-white/15"
            }`}
          >
            <span className="text-base">{livestockLink.icon}</span>
            <span>{lang === "ta" ? livestockLink.labelTa : livestockLink.label}</span>
          </Link>

          {navItems.slice(3).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white font-semibold shadow"
                    : "text-white opacity-100 hover:bg-white/15"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{lang === "ta" ? item.labelTa : item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-white/20 space-y-0.5 shrink-0">
          <button
            onClick={toggleLang}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/15 w-full transition-all"
          >
            <span>🌐</span>
            <span>{lang === "ta" ? "English" : "தமிழ்"}</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-danger/80 w-full transition-all"
          >
            <span>🚪</span>
            <span>Logout / வெளியேறு</span>
          </button>
        </div>
      </div>
    </>
  );
}

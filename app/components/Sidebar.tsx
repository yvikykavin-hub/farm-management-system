"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { clearLockedCookie } from "../lib/lockCookie";
import DarkModeToggle from "./DarkModeToggle";

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
  const [isOpen, setIsOpen] = useState(false);

  const toggleLang = () => setLang?.(lang === "ta" ? "en" : "ta");

  const logout = async () => {
    // Per-user language is already kept in sync on every toggle (see useLang),
    // so logout just needs to stop applying it to whoever logs in next.
    localStorage.removeItem("marutham_current_user");
    await supabase.auth.signOut();
    clearLockedCookie();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsOpen(true)}
        className="no-press lg:hidden fixed top-3 left-3 z-40 bg-primary text-white w-9 h-9 rounded-lg flex items-center justify-center shadow-lg text-lg"
        title="Menu"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-64 h-dvh bg-gradient-to-b from-[#1B4332] to-[#2D6A4F] flex flex-col shadow-xl shrink-0 fixed lg:static z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Close button, mobile only */}
        <button
          onClick={() => setIsOpen(false)}
          className="no-press lg:hidden absolute top-4 right-4 text-green-200 hover:text-white text-xl"
        >
          ✕
        </button>

        {/* Logo - compact */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-green-700/30">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/farmer-icon.png" alt="" className="w-9 h-9 rounded-full border-2 border-green-400/30" />
            <div>
              <p className="text-white font-bold text-sm leading-tight">
                {lang === "ta" ? "மருதம் FMS" : "Marutham FMS"}
              </p>
              <p className="text-green-300 text-xs">{lang === "ta" ? "உழைப்பே உயர்வு" : "Rooted in Tradition, Driven by Data"}</p>
            </div>
          </div>
        </div>

        {/* Nav items — fill available space */}
        <nav className="flex-1 px-3 py-3 flex flex-col justify-between overflow-hidden">
          {/* Main nav items */}
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.startsWith ? pathname.startsWith(item.href) : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative border-l-2 ${
                    isActive
                      ? "bg-white/10 text-white font-medium border-green-300"
                      : "text-green-200 border-transparent hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{lang === "ta" ? item.labelTa : item.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-300 flex-shrink-0" />}
                </Link>
              );
            })}
          </div>

          {/* Small gap indicator */}
          <div className="my-2">
            <div className="h-px bg-green-700/40 mx-2 rounded-full" />
          </div>
        </nav>

        {/* Bottom section - Language + Dark mode + Logout */}
        <div className="flex-shrink-0 px-3 pb-3 space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="no-press flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-green-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-all duration-200 min-w-0"
            >
              <span className="text-lg">🌐</span>
              <span className="truncate">{lang === "ta" ? "English" : "தமிழ்"}</span>
            </button>
            <DarkModeToggle variant="sidebar" />
          </div>
          <button
            onClick={logout}
            className="no-press w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-300 hover:bg-red-500/20 text-sm font-medium transition-all duration-200"
          >
            <span className="text-lg">🚪</span>
            <span>{lang === "ta" ? "வெளியேறு" : "Logout"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}

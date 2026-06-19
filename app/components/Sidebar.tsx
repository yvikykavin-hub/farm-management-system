"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const navItems = [
  { href: "/", icon: "🏠", label: "Dashboard", labelTa: "முகப்பு" },
  { href: "/farms", icon: "🌳", label: "Farms", labelTa: "நிலங்கள்" },
  { href: "/crops", icon: "🌾", label: "Crops", labelTa: "பயிர்கள்" },
  { href: "/livestock", icon: "🐄", label: "Livestock", labelTa: "கால்நடை" },
  { href: "/machinery", icon: "🚜", label: "Machinery", labelTa: "இயந்திரம்" },
  { href: "/income", icon: "💰", label: "Income", labelTa: "வருமானம்" },
  { href: "/expenses", icon: "💸", label: "Expenses", labelTa: "செலவு" },
  { href: "/reports", icon: "📊", label: "Reports", labelTa: "அறிக்கை" },
  { href: "/settings", icon: "⚙️", label: "Settings", labelTa: "அமைப்புகள்" },
];

type SidebarProps = {
  lang?: "ta" | "en";
  setLang?: (lang: "ta" | "en") => void;
};

export default function Sidebar({ lang = "ta", setLang }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const toggleLang = () => setLang?.(lang === "ta" ? "en" : "ta");

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="w-52 h-screen bg-green-900 text-white flex flex-col shadow-xl shrink-0">

      {/* Brand */}
      <div className="p-3 border-b border-green-700 shrink-0">
        <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-xl mb-2 mx-auto">
          🌾
        </div>
        <h1 className="text-sm font-bold text-center text-white leading-tight">
          தாய் நிலம் AGRO
        </h1>
        <p className="text-[11px] text-green-200 text-center mt-1 leading-tight font-medium">
          நிலமே தாய், விளைவே வாழ்வு
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-green-600 text-white font-semibold shadow"
                  : "text-white opacity-100 hover:bg-green-700"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{lang === "ta" ? item.labelTa : item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-green-700 space-y-0.5 shrink-0">
        <button
          onClick={toggleLang}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-white hover:bg-green-700 w-full transition-all"
        >
          <span>🌐</span>
          <span>{lang === "ta" ? "மொழி மாற்று" : "Language"}</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-red-200 hover:bg-red-900 w-full transition-all"
        >
          <span>🚪</span>
          <span>{lang === "ta" ? "வெளியேறு" : "Logout"}</span>
        </button>
      </div>

    </div>
  );
}

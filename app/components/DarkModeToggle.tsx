"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const VARIANT_CLASSES = {
  // Default: for light page headers/cards.
  default: "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600",
  // For use directly on the sidebar's dark green background.
  sidebar: "bg-white/10 hover:bg-white/20",
};

export default function DarkModeToggle({ variant = "default" }: { variant?: keyof typeof VARIANT_CLASSES }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${VARIANT_CLASSES[variant]}`}
      title="Toggle dark mode"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

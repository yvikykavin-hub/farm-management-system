"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type EmptyStateType =
  | "crops"
  | "livestock"
  | "goats"
  | "hens"
  | "machinery"
  | "finance"
  | "milk"
  | "payments"
  | "history"
  | "land"
  | "generic";

function Illustration({ type }: { type: EmptyStateType }) {
  const stroke = "currentColor";
  const common = {
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (type) {
    case "crops":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-green-400 dark:text-green-500">
          <path d="M20 88 Q60 92 100 88" stroke={stroke} {...common} />
          <path d="M40 88 C40 60 30 50 22 42 C34 44 42 52 44 62 C46 48 40 34 30 24 C46 28 54 44 54 60" stroke={stroke} {...common} />
          <path d="M64 88 C64 55 76 42 92 34 C90 50 82 60 70 66 C82 64 92 54 96 40 C98 58 88 74 72 80" stroke={stroke} {...common} />
        </svg>
      );
    case "livestock":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-amber-400 dark:text-amber-500">
          <ellipse cx="55" cy="60" rx="30" ry="20" stroke={stroke} {...common} />
          <circle cx="90" cy="46" r="14" stroke={stroke} {...common} />
          <path d="M84 38 L80 30 M96 38 L100 30" stroke={stroke} {...common} />
          <path d="M30 66 L22 82 M42 72 L38 88 M62 72 L64 88 M78 68 L82 84" stroke={stroke} {...common} />
          <circle cx="85" cy="44" r="1.6" fill={stroke} stroke="none" />
        </svg>
      );
    case "goats":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-orange-400 dark:text-orange-500">
          <ellipse cx="55" cy="62" rx="26" ry="17" stroke={stroke} {...common} />
          <circle cx="88" cy="48" r="12" stroke={stroke} {...common} />
          <path d="M84 38 C80 28 84 22 90 20" stroke={stroke} {...common} />
          <path d="M94 38 C98 28 96 22 92 18" stroke={stroke} {...common} />
          <path d="M82 46 L74 44 M96 46 L104 44" stroke={stroke} {...common} />
          <path d="M32 68 L26 84 M46 74 L44 90 M64 74 L66 90 M76 70 L80 86" stroke={stroke} {...common} />
        </svg>
      );
    case "hens":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-red-400 dark:text-red-500">
          <ellipse cx="55" cy="60" rx="24" ry="20" stroke={stroke} {...common} />
          <circle cx="86" cy="42" r="11" stroke={stroke} {...common} />
          <path d="M86 30 C82 22 90 20 92 26" stroke={stroke} {...common} />
          <path d="M96 42 L106 40 L96 46 Z" stroke={stroke} {...common} />
          <path d="M46 78 L40 90 M62 80 L66 90" stroke={stroke} {...common} />
          <circle cx="90" cy="40" r="1.4" fill={stroke} stroke="none" />
        </svg>
      );
    case "machinery":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-slate-400 dark:text-slate-500">
          <circle cx="40" cy="76" r="14" stroke={stroke} {...common} />
          <circle cx="88" cy="76" r="9" stroke={stroke} {...common} />
          <path d="M40 76 L40 40 L70 40 L88 62 L88 76" stroke={stroke} {...common} />
          <path d="M40 40 L40 26 L54 26 L54 40" stroke={stroke} {...common} />
          <path d="M70 40 L70 56 L88 56" stroke={stroke} {...common} />
        </svg>
      );
    case "finance":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-emerald-400 dark:text-emerald-500">
          <path d="M18 82 L18 30 M18 82 L102 82" stroke={stroke} {...common} />
          <path d="M32 82 L32 60 M50 82 L50 46 M68 82 L68 64 M86 82 L86 36" stroke={stroke} {...common} />
          <path d="M30 44 L50 30 L68 40 L88 20" stroke={stroke} {...common} />
          <path d="M78 20 L88 20 L88 30" stroke={stroke} {...common} />
        </svg>
      );
    case "milk":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-blue-300 dark:text-blue-400">
          <path d="M48 18 L72 18 L78 36 L78 84 Q78 90 72 90 L48 90 Q42 90 42 84 L42 36 Z" stroke={stroke} {...common} />
          <path d="M42 50 L78 50" stroke={stroke} {...common} />
          <path d="M48 18 L48 10 L72 10 L72 18" stroke={stroke} {...common} />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-teal-400 dark:text-teal-500">
          <rect x="18" y="30" width="84" height="50" rx="6" stroke={stroke} {...common} />
          <path d="M18 46 L102 46" stroke={stroke} {...common} />
          <path d="M30 62 L50 62" stroke={stroke} {...common} />
          <circle cx="82" cy="63" r="7" stroke={stroke} {...common} />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-purple-300 dark:text-purple-400">
          <circle cx="58" cy="54" r="32" stroke={stroke} {...common} />
          <path d="M58 36 L58 54 L74 62" stroke={stroke} {...common} />
          <path d="M28 30 L22 20 M32 26 L26 14" stroke={stroke} {...common} />
        </svg>
      );
    case "land":
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-lime-400 dark:text-lime-500">
          <path d="M14 84 L106 84" stroke={stroke} {...common} />
          <path d="M14 84 L14 54 L60 30 L106 54 L106 84" stroke={stroke} {...common} />
          <path d="M46 84 L46 62 L74 62 L74 84" stroke={stroke} {...common} />
          <path d="M60 30 L60 84" stroke={stroke} strokeDasharray="3 4" {...common} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 100" className="w-28 h-24 text-gray-300 dark:text-gray-500">
          <rect x="24" y="24" width="72" height="56" rx="8" stroke={stroke} {...common} />
          <path d="M40 56 L54 68 L80 40" stroke={stroke} {...common} />
        </svg>
      );
  }
}

export default function EmptyState({
  type,
  title,
  subtitle,
  action,
  children,
  className,
}: {
  type: EmptyStateType;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className ?? ""}`}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      >
        <Illustration type={type} />
      </motion.div>
      <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-xs">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
      {children}
    </motion.div>
  );
}
